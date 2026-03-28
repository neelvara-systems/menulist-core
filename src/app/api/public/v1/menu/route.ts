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
import { buildMenuSnapshot } from "@lib/posSync/payloadFormatter";
import { apiError, generateETag, logApiRequest, PULL_API_SCHEMA_VERSION, validatePublicApiKey } from "@lib/publicApi/auth";
import { checkRateLimit } from "@lib/rateLimit";
import { secureError } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return apiError('FEATURE_DISABLED', 'API not available', 403);
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
        return apiError('MISSING_API_KEY', 'Missing X-API-Key header', 401);
    }

    // Rate limit per API key
    const rlResult = await checkRateLimit({ key: `public-api:${apiKey}`, limit: 60, window: 60 });
    if (!rlResult.allowed) {
        const retryAfter = Math.ceil((rlResult.resetAt - Date.now()) / 1000);
        return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
            'Retry-After': String(Math.max(retryAfter, 1)),
        });
    }

    try {
        const result = await validatePublicApiKey(apiKey);
        if (!result) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const { storeData, storeId } = result;
        const tenantId = storeData.tenantId;

        // Abuse logging
        logApiRequest(request, storeId, 'GET /menu');

        // Find the default (published) project for this store
        // Path: projects/{tenantId}/{storeId}/{projectId}
        const db = admin.firestore();
        const projectsSnapshot = await db
            .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`)
            .where('isDefault', '==', true)
            .limit(1)
            .get();

        if (projectsSnapshot.empty) {
            return apiError('NO_MENU', 'No published menu found', 404);
        }

        const projectDoc = projectsSnapshot.docs[0];
        const projectData = projectDoc.data();

        // Build menu payload using same formatter as POS Webhook Sync
        const menuVersion = storeData.posSync?.menuVersion || 1;
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
