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
import { parseSummaryProjects, withAuthoritativeSummaryProjectId } from "@lib/firestore/parseSummaryProjects";
import { getMultiOutletProjectLogContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";
import { populateMasterCache, resolveProjectForRender } from "@lib/multiOutlet/resolveProject";
import { normalizePosSyncMenuVersion } from "@lib/posSync/deliveryState";
import { buildMenuSnapshot } from "@lib/posSync/payloadFormatter";
import { inheritLinkedPublicPullMetadata } from '@lib/publicApi/menuProjection';
import { isMenuListPublicApiCredentialInScope, resolveMenuListPublicApiTenantDocumentId } from '@lib/publicApi/menuListScope';
import { buildPullApiResponseHeaders, generatePullApiETag, hasPublicApiCredentialScope, hashApiKey, isMenuListPublicApiTargetAllowed, logApiRequest, normalizeMenuListPublicApiNumericId, normalizePublicApiDocumentId, normalizePublicApiKey, PULL_API_KEY_RATE_LIMIT, PULL_API_PREAUTH_RATE_LIMIT, PULL_API_RATE_LIMIT_WINDOW_SECONDS, PULL_API_SCHEMA_VERSION, pullApiError, pullApiRateLimitError, validatePublicApiKey } from "@lib/publicApi/auth";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedSecurityStringContext, logSecurityFailure } from "@lib/security/securityDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import type { Project } from "@template/main-app/projects/types";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";

async function resolvePublicPullProject(
    db: ReturnType<typeof admin.firestore>,
    tenantDocumentId: string,
    storeProject: Project,
): Promise<Project | null> {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET || !storeProject.masterProjectId) {
        return storeProject;
    }

    const masterProjectScope = normalizeMultiOutletProjectId(storeProject.masterProjectId);
    if (!masterProjectScope || masterProjectScope.tenantDocumentId !== tenantDocumentId) {
        logMultiOutletFailure('platform_pull_master_project_reference_invalid', undefined, {
            ...getMultiOutletProjectLogContext(storeProject.projectId, storeProject.masterProjectId),
        });
        return null;
    }

    const masterProjectSnapshot = await db
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(masterProjectScope.tenantDocumentId)
        .collection(masterProjectScope.storeDocumentId)
        .doc(masterProjectScope.projectId)
        .get();
    const masterProjectData = masterProjectSnapshot.data() as Project | undefined;
    if (
        !masterProjectSnapshot.exists
        || !masterProjectData
        || masterProjectData.active === false
        || masterProjectData.deleted === true
        || masterProjectData.masterProjectId
        || !masterProjectData.files?.length
    ) {
        logMultiOutletFailure('platform_pull_master_project_unavailable', undefined, {
            ...getMultiOutletProjectLogContext(storeProject.projectId, storeProject.masterProjectId),
        });
        return null;
    }

    populateMasterCache(masterProjectScope.projectId, {
        ...masterProjectData,
        projectId: masterProjectSnapshot.id,
    });
    const resolvedProject = await resolveProjectForRender({ storeProject });
    if (resolvedProject._resolved?.isMasterLinked !== true) {
        logMultiOutletFailure('platform_pull_master_project_unresolved', undefined, {
            ...getMultiOutletProjectLogContext(storeProject.projectId, storeProject.masterProjectId),
        });
        return null;
    }

    return {
        ...inheritLinkedPublicPullMetadata(resolvedProject, masterProjectData),
        projectId: storeProject.projectId,
    };
}

async function getDefaultPublicMenuProject(
    db: ReturnType<typeof admin.firestore>,
    tenantDocumentId: string,
    storeId: string,
): Promise<Project | null> {
    const storeDocumentId = normalizePublicApiDocumentId(storeId);
    if (!storeDocumentId) return null;

    const summarySnap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${storeDocumentId}`)
        .get();

    if (!summarySnap.exists) return null;

    const projects = Object.entries(parseSummaryProjects(summarySnap.data()))
        .map(([projectId, data]) => {
            const projectDocumentId = normalizePublicApiDocumentId(projectId);
            const projectScope = projectDocumentId
                ? normalizeMultiOutletProjectId(projectDocumentId)
                : null;
            return projectScope?.tenantDocumentId === tenantDocumentId
                && projectScope.storeDocumentId === storeDocumentId
                ? withAuthoritativeSummaryProjectId(projectScope.projectId, data)
                : null;
        })
        .filter((project): project is NonNullable<typeof project> => Boolean(project))
        .filter((project) => (
            project.active !== false
            && project.deleted !== true
            && project.isSpecialMenu !== true
        ));

    const selectedProject = projects.find((project) => project.isDefault === true) || projects[0];
    if (!selectedProject?.projectId) return null;

    const projectDoc = await db
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(tenantDocumentId)
        .collection(storeDocumentId)
        .doc(selectedProject.projectId)
        .get();

    if (!projectDoc.exists) return null;

    const projectData = projectDoc.data() as Project | undefined;
    if (!projectData) return null;
    if (projectData?.active === false || projectData?.deleted === true) return null;

    const storeProject = {
        ...projectData,
        projectId: projectDoc.id,
    };
    return resolvePublicPullProject(db, tenantDocumentId, storeProject);
}

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return pullApiError('FEATURE_DISABLED', 'API not available', 403);
    }

    const rawApiKey = request.headers.get('x-api-key');
    if (!rawApiKey) {
        return pullApiError('MISSING_API_KEY', 'Missing X-API-Key header', 401);
    }
    const apiKey = normalizePublicApiKey(rawApiKey);
    if (!apiKey || !apiKey.startsWith('ml_')) {
        return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    // Bound rotating invalid credentials before per-key lookup/limit work.
    const preAuthRateLimitResult = await checkRateLimit({
        key: `public-api-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
        limit: PULL_API_PREAUTH_RATE_LIMIT,
        window: PULL_API_RATE_LIMIT_WINDOW_SECONDS,
        failClosedOnProviderError: true,
    });
    if (!preAuthRateLimitResult.allowed) {
        return pullApiRateLimitError(preAuthRateLimitResult);
    }

    // Rate limit each admitted API-key shape independently.
    const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
    let failureContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/public/v1/menu',
        ...getBoundedSecurityStringContext('apiKey', apiKey),
        ...getBoundedSecurityStringContext('apiKeyRateLimitId', apiKeyRateLimitId),
    };

    const rlResult = await checkRateLimit({
        key: `public-api:${apiKeyRateLimitId}`,
        limit: PULL_API_KEY_RATE_LIMIT,
        window: PULL_API_RATE_LIMIT_WINDOW_SECONDS,
        failClosedOnProviderError: true,
    });
    if (!rlResult.allowed) {
        return pullApiRateLimitError(rlResult);
    }

    try {
        const result = await validatePublicApiKey(apiKey);
        if (!result) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const { credential, storeData, storeId } = result;
        if (
            !isMenuListPublicApiCredentialInScope(credential)
            || !hasPublicApiCredentialScope(credential, 'public:read')
        ) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);
        const storeDocumentId = normalizePublicApiDocumentId(storeId);
        const tenantNumericId = normalizeMenuListPublicApiNumericId(tenantDocumentId);
        const storeNumericId = normalizeMenuListPublicApiNumericId(storeDocumentId);
        if (!tenantDocumentId || !storeDocumentId || tenantNumericId == null || storeNumericId == null) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        if (!(await isMenuListPublicApiTargetAllowed(storeData, storeDocumentId))) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        failureContext = {
            ...failureContext,
            ...getBoundedSecurityStringContext('tenantId', tenantDocumentId),
            ...getBoundedSecurityStringContext('storeId', storeDocumentId),
        };

        // Abuse logging
        logApiRequest(request, storeDocumentId, 'GET /menu');

        // Find the default public project through the same summary source used
        // by the customer renderer. `isDefault` is summary truth, not a
        // guaranteed field on the full project document.
        const db = admin.firestore();
        const projectData = await getDefaultPublicMenuProject(db, tenantDocumentId, storeDocumentId);
        if (!projectData) {
            return pullApiError('NO_MENU', 'No published menu found', 404);
        }
        failureContext = {
            ...failureContext,
            ...getBoundedSecurityStringContext('projectId', projectData.projectId),
        };

        // Build menu payload using same formatter as POS Webhook Sync
        const menuVersion = normalizePosSyncMenuVersion(projectData.menuVersion)
            ?? normalizePosSyncMenuVersion(storeData.posSync?.menuVersion)
            ?? 1;
        const currency = storeData.currencyCode || storeData.currency || 'INR';

        const payload = buildMenuSnapshot(
            projectData,
            storeNumericId,
            tenantNumericId,
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
        const etag = `"${generatePullApiETag(response)}"`;
        const responseHeaders = buildPullApiResponseHeaders(etag);
        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: responseHeaders,
            });
        }

        return NextResponse.json(response, {
            headers: responseHeaders,
        });
    } catch (error) {
        logSecurityFailure('public_api_menu_route_failed', error, failureContext);
        return pullApiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
