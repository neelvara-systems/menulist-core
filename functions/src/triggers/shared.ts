/**
 * Shared Callable Functions
 * ═══════════════════════════════════════════════════════════════
 * 
 * onCall and onTaskDispatched functions available in ALL environments.
 * These are invoked directly by the client or task queue.
 */

import * as functions from 'firebase-functions';
import { createHmac } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { FUNCTION_MAX_INSTANCES, FUNCTION_OPTIONS, SECRET_GROUPS } from '../config/secrets';
import { isFunctionFeatureEnabled } from '../constants/features';
import { MENULIST_PLATFORM_USER_ROLE } from '../constants/user';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../lib/rateLimit';
import { normalizeMapsPlaceCheckInput, runMapsPlaceCheck } from '../logic/mapsPlaceCheck';
import { isPublishVerificationScopeAuthorized } from '../monitoring/publishVerification';
import { isSafeModeActive } from '../monitoring/safeMode';
import { normalizeOwnerNotificationDocumentId } from '../sharedData/ownerNotificationDeliveryBoundary';
import {
    hasCallableTenantStoreAccess,
    parseCallableTenantStoreScope,
} from '../utils/callableScopeAccess';

const SHARED_KB_EMBED_TASK_OPTIONS = {
    ...FUNCTION_OPTIONS.aiCallable,
    retryConfig: {
        maxAttempts: 3,
        maxBackoffSeconds: 120,
        maxDoublings: 2,
        minBackoffSeconds: 10,
    },
    rateLimits: {
        maxConcurrentDispatches: 3,
        maxDispatchesPerSecond: 3,
    },
};
const ANSWERLATTICE_CALLABLE_MOVED = 'ANSWERLATTICE_CALLABLE_MOVED_TO_SEPARATE_RUNTIME';

function getRequesterRole(request: { auth?: { token?: Record<string, any> } }): string {
    return String(request.auth?.token?.platformRole || request.auth?.token?.role || '');
}

function assertAuthenticatedAccount(request: { auth?: { token?: Record<string, any> } }, action: string) {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', `Must be authenticated to ${action}.`);
    }

    const token = request.auth.token || {};
    if (token.active === false || token.isVerified === false || token.deleted === true) {
        throw new HttpsError('permission-denied', 'Account is not allowed to perform this action.');
    }
}

function assertStoreScopedAccount(request: { auth?: { token?: Record<string, any> } }, action: string) {
    assertAuthenticatedAccount(request, action);

    if (getRequesterRole(request) === MENULIST_PLATFORM_USER_ROLE) return;

    const token = request.auth?.token || {};
    const scope = parseCallableTenantStoreScope(token);
    if (!scope?.directStoreId) {
        throw new HttpsError('failed-precondition', 'Tenant ID and Store ID are required for this action.');
    }
}

function hasTenantStoreAccess(
    request: { auth?: { token?: Record<string, any> } },
    tenantId: string | number,
    storeId: string | number,
): boolean {
    if (!request.auth) return false;
    if (getRequesterRole(request) === MENULIST_PLATFORM_USER_ROLE) return true;

    return hasCallableTenantStoreAccess(request.auth.token || {}, tenantId, storeId);
}

function assertTenantStoreAccess(
    request: { auth?: { token?: Record<string, any> } },
    tenantId: string | number,
    storeId: string | number,
    action: string,
) {
    assertAuthenticatedAccount(request, action);

    if (!hasTenantStoreAccess(request, tenantId, storeId)) {
        throw new HttpsError('permission-denied', 'You do not have access to this store.');
    }
}

export async function assertCurrentMapsPlaceCheckScope(
    request: { auth?: { token?: Record<string, any> } },
    tenantId: string,
    storeId: string,
): Promise<void> {
    assertTenantStoreAccess(request, tenantId, storeId, 'check public place evidence');

    const userId = normalizeOwnerNotificationDocumentId(request.auth?.token?.uId);
    if (
        !userId
        || !await isPublishVerificationScopeAuthorized(storeId, tenantId, userId)
    ) {
        throw new HttpsError('permission-denied', 'You do not have access to this store.');
    }
}

function hashRateLimitValue(value: unknown): string {
    const hashSecret = process.env.NEXTAUTH_SECRET
        || process.env.UPSTASH_REDIS_REST_TOKEN
        || 'menulist-functions-rate-limit-local';

    return createHmac('sha256', hashSecret)
        .update(String(value ?? 'unknown'))
        .digest('hex')
        .slice(0, 40);
}

// ═══════════════════════════════════════════════════════════════
// KB INGESTION — Shared callable functions
// ═══════════════════════════════════════════════════════════════

// STEP 6 (PART 2) - The Worker - Triggered by the Task Queue
export const embedArticleWorker = onTaskDispatched(SHARED_KB_EMBED_TASK_OPTIONS, async () => {
    functions.logger.warn('[embedArticleWorker] Answerlattice task ignored in MenuList runtime', {
        failureCode: ANSWERLATTICE_CALLABLE_MOVED,
    });
});

// ON-SAVE HOOK - Triggered by the client UI
export const regenerateEmbedding = onCall(FUNCTION_OPTIONS.callableLight, async () => {
    throw new HttpsError(
        'failed-precondition',
        'This Answerlattice operation has moved to the isolated Answerlattice runtime.',
        { code: ANSWERLATTICE_CALLABLE_MOVED },
    );
});

// STEP 6 & 7 (PART 1) - The Orchestrator - Triggered by the client UI
export const publishApprovedJobFn = onCall(FUNCTION_OPTIONS.callableLight, async () => {
    throw new HttpsError(
        'failed-precondition',
        'This Answerlattice operation has moved to the isolated Answerlattice runtime.',
        { code: ANSWERLATTICE_CALLABLE_MOVED },
    );
});

// ═══════════════════════════════════════════════════════════════
// MENU IMAGE PROCESSING — Parallel callable
// ═══════════════════════════════════════════════════════════════

/**
 * Legacy direct menu-image callable.
 *
 * Production extraction now runs only through menuImageProcessingJobs so
 * tenant checks, upload URL allowlists, rate limits, identity checks, retry
 * metadata, cleanup, and cache invalidation stay on one path.
 */
export const processMenuImages = onCall(
    FUNCTION_OPTIONS.aiParallel,
    async (request) => {
        assertStoreScopedAccount(request, 'queue menu extraction');
        throw new HttpsError(
            'failed-precondition',
            'Direct menu extraction is disabled. Use the MenuList extraction job queue.',
        );
    },
);

// ═══════════════════════════════════════════════════════════════
// MAPS PLACE CHECK — Owner/admin Google Maps grounding check
// ═══════════════════════════════════════════════════════════════

export const mapsPlaceCheck = onCall(
    {
        region: 'us-central1',
        timeoutSeconds: 60,
        memory: '512MiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.aiCallable,
        secrets: SECRET_GROUPS.AI_WITH_RATE_LIMIT,
    },
    async (request) => {
        const input = normalizeMapsPlaceCheckInput(request.data);
        await assertCurrentMapsPlaceCheckScope(request, input.tenantId, input.storeId);

        if (!isFunctionFeatureEnabled('ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK')) {
            throw new HttpsError('failed-precondition', 'Maps place check is not enabled.');
        }

        if (await isSafeModeActive()) {
            throw new HttpsError('unavailable', 'Maps place check is temporarily unavailable.');
        }

        const rateLimit = await checkRateLimit({
            key: `maps-place-check:${hashRateLimitValue(request.auth?.uid)}:${hashRateLimitValue(input.storeId)}`,
            failClosedOnProviderError: true,
            ...RATE_LIMIT_CONFIGS.AI_EXPENSIVE,
        });

        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            if (rateLimit.reason === 'provider_unavailable') {
                throw new HttpsError('unavailable', 'Maps place check is temporarily unavailable.');
            }
            throw new HttpsError('resource-exhausted', `Too many requests. Please wait ${waitSeconds} seconds.`);
        }

        return runMapsPlaceCheck(input);
    },
);
