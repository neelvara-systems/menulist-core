export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    isAnswerlatticeStoreInScope,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import {
    buildAnswerlatticeWorkspaceProfileFromStore,
    normalizeAnswerlatticeWorkspaceProfileRevision,
    parseAnswerlatticeWorkspaceProfileResponse,
    parseAnswerlatticeWorkspaceProfileSave,
    ANSWERLATTICE_WORKSPACE_PROFILE_REVISION_FIELD,
} from '@lib/answerlattice/workspaceProfileContracts';
import { saveAnswerlatticeWorkspaceProfileAdmin } from '@lib/answerlattice/workspaceProfileServer';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const ANSWERLATTICE_WORKSPACE_PROFILE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const workspaceProfileJson = (
    body: Record<string, unknown>,
    status = 200,
    headers: Record<string, string> = {},
): NextResponse => NextResponse.json(body, {
    status,
    headers: {
        ...ANSWERLATTICE_WORKSPACE_PROFILE_RESPONSE_HEADERS,
        ...headers,
    },
});

const withWorkspaceProfileHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_WORKSPACE_PROFILE_RESPONSE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return null;
    return { tenantId: scope.tenantId, storeId: scope.storeId };
};

const getAnswerlatticeDb = () => {
    return answerlatticeFirestoreAdmin;
};
const WORKSPACE_PROFILE_SAVE_MAX_BODY_BYTES = 32 * 1024;

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return workspaceProfileJson({ error: 'Answerlattice is not enabled.' }, 403);
    }
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'workspace-profile');
    if (rateLimitResponse) return withWorkspaceProfileHeaders(rateLimitResponse);

    const scope = resolveSessionScope(session);
    if (!scope) return workspaceProfileJson({ error: 'Not onboarded' }, 400);
    const db = getAnswerlatticeDb();
    if (!db) return workspaceProfileJson({ error: 'Answerlattice Firebase is not configured' }, 503);
    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE);
    if (permission.response) return withWorkspaceProfileHeaders(permission.response);

    try {
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) return workspaceProfileJson({ error: 'Store not found' }, 404);
        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return workspaceProfileJson({ error: 'Forbidden' }, 403);
        }
        const response = parseAnswerlatticeWorkspaceProfileResponse({
            profile: buildAnswerlatticeWorkspaceProfileFromStore(storeData),
            revision: normalizeAnswerlatticeWorkspaceProfileRevision(
                storeData[ANSWERLATTICE_WORKSPACE_PROFILE_REVISION_FIELD],
            ),
        });
        return workspaceProfileJson(response);
    } catch (error) {
        logRuntimeFailure('answerlattice_workspace_profile_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return workspaceProfileJson({ error: 'Failed to load workspace profile' }, 500);
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return workspaceProfileJson({ error: 'Answerlattice is not enabled.' }, 403);
    }
    const scope = resolveSessionScope(session);
    if (!scope) return workspaceProfileJson({ error: 'Not onboarded' }, 400);
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) return workspaceProfileJson({ error: 'Forbidden' }, 403);

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-workspace-profile',
                actorId,
                scope.tenantId,
                scope.storeId,
            ),
            limit: 20,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
            return workspaceProfileJson(
                {
                    error: providerUnavailable
                        ? 'Workspace settings are temporarily unavailable'
                        : 'Too many requests',
                    retryAfter,
                },
                providerUnavailable ? 503 : 429,
                { 'Retry-After': String(retryAfter) },
            );
        }
        const db = getAnswerlatticeDb();
        if (!db) return workspaceProfileJson({ error: 'Answerlattice Firebase is not configured' }, 503);
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE);
        if (permission.response) return withWorkspaceProfileHeaders(permission.response);

        const bodyResult = await readBoundedJsonBody(request, WORKSPACE_PROFILE_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid workspace profile',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return workspaceProfileJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid workspace profile' },
                bodyResult.response.status,
            );
        }

        const parsed = parseAnswerlatticeWorkspaceProfileSave(bodyResult.data);
        const result = await saveAnswerlatticeWorkspaceProfileAdmin({
            db,
            expectedRevision: parsed.expectedRevision,
            profile: {
                productName: parsed.productName,
                productUrl: parsed.productUrl,
                supportEmail: parsed.supportEmail,
                billingModel: parsed.billingModel,
                primarySurfaces: parsed.primarySurfaces,
                timeZone: parsed.timeZone,
                businessDayEndTime: parsed.businessDayEndTime,
            },
            tenantId: scope.tenantId,
            storeId: scope.storeId,
        });

        if (result.status === 'not_found') {
            return workspaceProfileJson({ error: 'Store not found' }, 404);
        }
        if (result.status === 'forbidden') {
            return workspaceProfileJson({ error: 'Forbidden' }, 403);
        }
        if (result.status === 'conflict') {
            return workspaceProfileJson({
                code: 'ANSWERLATTICE_WORKSPACE_PROFILE_CONFLICT',
                error: 'Workspace profile changed in another session. Reload and review the latest values.',
                revision: result.revision,
            }, 409);
        }

        if (result.status === 'saved') {
            logRuntimeDiagnostic('answerlattice_workspace_profile_saved', {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                primarySurfaceCount: result.profile.primarySurfaces.length,
                revision: result.revision,
            });
        }

        const response = parseAnswerlatticeWorkspaceProfileResponse({
            profile: result.profile,
            revision: result.revision,
        });
        return workspaceProfileJson(response);
    } catch (error) {
        if (error instanceof ZodError) {
            return workspaceProfileJson({ error: 'Invalid workspace profile' }, 400);
        }

        logRuntimeFailure('answerlattice_workspace_profile_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return workspaceProfileJson({ error: 'Failed to save workspace profile' }, 500);
    }
});
