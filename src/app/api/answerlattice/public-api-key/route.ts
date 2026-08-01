export const dynamic = 'force-dynamic';

/**
 * Authenticated management for the rollout-gated Answerlattice Public API key.
 * One workspace has one active key; generation rotates the previous key.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import {
    requireAnswerlatticePermission,
    type AnswerlatticeAccessContext,
} from '@lib/answerlattice/accessControl';
import {
    AnswerlatticePublicApiKeyActionSchema,
    AnswerlatticePublicApiManagementScopeSchema,
    answerlatticePublicApiManagementScopesMatch,
    normalizeAnswerlatticePublicApiScopes,
} from '@lib/answerlattice/publicApiContracts';
import {
    AnswerlatticePublicApiKeyStoreError,
    readAnswerlatticePublicApiKeySummary,
    revokeAnswerlatticePublicApiKey,
    rotateAnswerlatticePublicApiKey,
} from '@lib/answerlattice/publicApiKeyStore';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { hashApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const ANSWERLATTICE_PUBLIC_API_KEY_BODY_MAX_BYTES = 2 * 1024;
const ANSWERLATTICE_PUBLIC_API_KEY_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

const keyResponse = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
    ...init,
    headers: {
        ...ANSWERLATTICE_PUBLIC_API_KEY_RESPONSE_HEADERS,
        ...(init.headers || {}),
    },
});

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_PUBLIC_API_KEY_RESPONSE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

const getRateLimitResponse = (result: {
    reason?: 'limit_exceeded' | 'provider_unavailable';
    resetAt: number;
}) => keyResponse({
    error: result.reason === 'provider_unavailable'
        ? 'Public API key management is temporarily unavailable'
        : 'Too many requests',
}, {
    status: result.reason === 'provider_unavailable' ? 503 : 429,
    headers: {
        'Retry-After': String(Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1)),
    },
});

type PublicApiKeyManagementAdmission =
    | {
        access: null;
        response: NextResponse;
        scope: null;
    }
    | {
        access: AnswerlatticeAccessContext;
        response: null;
        scope: {
            tenantId: number;
            storeId: number;
            role?: string;
        };
    };

async function authorizePublicApiKeyManagement(
    request: NextRequest,
    session: any,
): Promise<PublicApiKeyManagementAdmission> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API) {
        return { access: null, response: keyResponse({ error: 'Not found' }, { status: 404 }), scope: null };
    }

    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
        return { access: null, response: keyResponse({ error: 'Origin not allowed' }, { status: 403 }), scope: null };
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
        return { access: null, response: keyResponse({ error: 'Not onboarded' }, { status: 400 }), scope: null };
    }

    const isMutation = request.method !== 'GET';
    const actorRateLimitId = resolveCurrentSessionUserDocumentId(session);
    if (!actorRateLimitId) {
        return { access: null, response: keyResponse({ error: 'Forbidden' }, { status: 403 }), scope: null };
    }
    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(
            isMutation ? 'answerlattice-public-api-key-write' : 'answerlattice-public-api-key-read',
            scope.storeId,
            actorRateLimitId,
        ),
        limit: isMutation ? 5 : 30,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        return { access: null, response: getRateLimitResponse(rateLimit), scope: null };
    }

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
        scope,
    );
    if (permission.response) {
        return { access: null, response: withPrivateHeaders(permission.response), scope: null };
    }
    if (!permission.access) {
        return { access: null, response: keyResponse({ error: 'Forbidden' }, { status: 403 }), scope: null };
    }

    return { access: permission.access, response: null, scope };
}

export const GET = withAuth(async (request: NextRequest, session) => {
    const admission = await authorizePublicApiKeyManagement(request, session);
    if (admission.response) return admission.response;
    if (!admission.scope || !admission.access) {
        return keyResponse({ error: 'Access denied' }, { status: 403 });
    }
    const expectedScope = AnswerlatticePublicApiManagementScopeSchema.safeParse({
        tenantId: Number(request.nextUrl.searchParams.get('tenantId')),
        storeId: Number(request.nextUrl.searchParams.get('storeId')),
    });
    if (
        !expectedScope.success
        || !answerlatticePublicApiManagementScopesMatch(expectedScope.data, admission.scope)
    ) {
        return keyResponse({ error: 'Workspace changed. Refresh and try again.' }, { status: 409 });
    }

    try {
        const credential = await readAnswerlatticePublicApiKeySummary(admission.scope);
        return keyResponse({ credential, scope: admission.scope });
    } catch (error) {
        if (error instanceof AnswerlatticePublicApiKeyStoreError) {
            return keyResponse({ error: error.message }, { status: error.status });
        }
        logRuntimeFailure('answerlattice_public_api_key_status_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', admission.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', admission.scope.storeId),
        });
        return keyResponse({ error: 'Could not load Public API key status' }, { status: 500 });
    }
});

export const POST = withAuth(async (request: NextRequest, session) => {
    const admission = await authorizePublicApiKeyManagement(request, session);
    if (admission.response) return admission.response;
    if (!admission.scope || !admission.access) {
        return keyResponse({ error: 'Access denied' }, { status: 403 });
    }

    const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_PUBLIC_API_KEY_BODY_MAX_BYTES, {
        invalidJsonMessage: 'Invalid input',
        tooLargeMessage: 'Request body too large',
    });
    if (bodyResult.ok === false) {
        return keyResponse(
            { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid input' },
            { status: bodyResult.response.status },
        );
    }

    const validation = AnswerlatticePublicApiKeyActionSchema.safeParse(bodyResult.data);
    if (!validation.success) return keyResponse({ error: 'Invalid input' }, { status: 400 });
    if (!answerlatticePublicApiManagementScopesMatch(validation.data.expectedScope, admission.scope)) {
        return keyResponse({ error: 'Workspace changed. Refresh and try again.' }, { status: 409 });
    }

    try {
        if (validation.data.action === 'revoke') {
            await revokeAnswerlatticePublicApiKey(admission.scope, {
                id: admission.access.user.id || admission.access.user.email,
            });
            logRuntimeDiagnostic('answerlattice_public_api_key_revoked', {
                ...getBoundedRuntimeStringContext('tenantId', admission.scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', admission.scope.storeId),
            });
            return keyResponse({ success: true, credential: null, scope: admission.scope });
        }

        const apiKey = validation.data.apiKey;
        const createdAt = new Date().toISOString();
        const credential = await rotateAnswerlatticePublicApiKey(
            admission.scope,
            { id: admission.access.user.id || admission.access.user.email },
            {
                apiKeyHash: hashApiKey(apiKey),
                keyPrefix: apiKey.slice(0, 7),
                requestId: validation.data.requestId,
                scopes: normalizeAnswerlatticePublicApiScopes(validation.data.scopes),
                createdAt,
            },
        );
        logRuntimeDiagnostic('answerlattice_public_api_key_rotated', {
            ...getBoundedRuntimeStringContext('tenantId', admission.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', admission.scope.storeId),
            scopeCount: credential.scopes.length,
        });
        return keyResponse({ apiKey, credential, scope: admission.scope });
    } catch (error) {
        if (error instanceof AnswerlatticePublicApiKeyStoreError) {
            return keyResponse({ error: error.message }, { status: error.status });
        }
        logRuntimeFailure('answerlattice_public_api_key_management_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', admission.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', admission.scope.storeId),
            ...getBoundedRuntimeStringContext('action', validation.data.action),
        });
        return keyResponse({ error: 'Could not manage Public API key' }, { status: 500 });
    }
});
