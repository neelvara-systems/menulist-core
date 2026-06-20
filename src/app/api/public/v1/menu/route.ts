export const dynamic = 'force-dynamic';
/**
 * GET /api/public/v1/menu — Public Menu Data API
 *
 * Returns full menu data in the same format as POS Webhook Sync payload.
 * Authenticated via X-API-Key header.
 *
 * @see __docs__/platform-pull-api/platform-pull-api_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { buildMenuSnapshot } from "@lib/posSync/payloadFormatter";
import { apiError, generateETag, hashApiKey, logApiRequest, PULL_API_SCHEMA_VERSION, validatePublicApiKey } from "@lib/publicApi/auth";
import { checkRateLimit } from "@lib/rateLimit";
import { secureError } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";

async function getDefaultPublicMenuProject(
    db: ReturnType<typeof admin.firestore>,
    tenantId: string | number,
    storeId: string,
): Promise<Record<string, any> | null> {
    const summarySnap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${storeId}`)
        .get();

    if (!summarySnap.exists) return null;

    const projects = Object.entries(parseSummaryProjects(summarySnap.data()))
        .map(([projectId, data]: [string, any]) => ({
            projectId,
            ...data,
        }))
        .filter((project) => (
            project.active !== false
            && project.deleted !== true
            && project.isSpecialMenu !== true
        ));

    const selectedProject = projects.find((project) => project.isDefault === true) || projects[0];
    if (!selectedProject?.projectId) return null;

    const projectDoc = await db
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(String(tenantId))
        .collection(String(storeId))
        .doc(selectedProject.projectId)
        .get();

    if (!projectDoc.exists) return null;

    const projectData = projectDoc.data() as Record<string, any> | undefined;
    if (!projectData) return null;
    if (projectData?.active === false || projectData?.deleted === true) return null;

    return {
        ...projectData,
        projectId: projectData?.projectId || selectedProject.projectId,
    };
}

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return apiError('FEATURE_DISABLED', 'API not available', 403);
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
        return apiError('MISSING_API_KEY', 'Missing X-API-Key header', 401);
    }
    if (!apiKey.trim().startsWith('ml_')) {
        return apiError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    // Rate limit per API key
    const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
    const rlResult = await checkRateLimit({ key: `public-api:${apiKeyRateLimitId}`, limit: 60, window: 60 });
    if (!rlResult.allowed) {
        const retryAfter = Math.ceil((rlResult.resetAt - Date.now()) / 1000);
        return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
            'Retry-After': String(Math.max(retryAfter, 1)),
        });
    }

    try {
        const result = await validatePublicApiKey(apiKey, { cacheTtlMs: 30_000 });
        if (!result) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const { storeData, storeId } = result;
        const tenantId = storeData.tenantId;

        // Abuse logging
        logApiRequest(request, storeId, 'GET /menu');

        // Find the default public project through the same summary source used
        // by the customer renderer. `isDefault` is summary truth, not a
        // guaranteed field on the full project document.
        const db = admin.firestore();
        const projectData = await getDefaultPublicMenuProject(db, tenantId, String(storeId));
        if (!projectData) {
            return apiError('NO_MENU', 'No published menu found', 404);
        }

        // Build menu payload using same formatter as POS Webhook Sync
        const menuVersion = Number(projectData.menuVersion || storeData.posSync?.menuVersion || 1);
        const currency = storeData.currencyCode || storeData.currency || 'INR';

        const payload = buildMenuSnapshot(
            projectData as any,
            Number(storeId),
            tenantId,
            menuVersion,
            currency,
        );

        // Override event type for pull API (not webhook) and add schema version
        const response = {
            schemaVersion: PULL_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            ...payload,
            event: 'menu.pull' as const,
        };

        // ETag: conditional request support
        const etag = `"${generateETag(response)}"`;
        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: { 'ETag': etag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
            });
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                'ETag': etag,
            },
        });
    } catch (error) {
        secureError('[Public API] Menu endpoint error', error as Error);
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
