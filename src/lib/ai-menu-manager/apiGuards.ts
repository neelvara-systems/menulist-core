import { getRateLimitForFeature, type RateLimitFeature } from '@lib/rateLimit/configs';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { checkRateLimit } from '@lib/rateLimit';
import { logger } from '@lib/monitoring/logger';
import { canUserAccessStore } from '@lib/multiOutlet/storeSwitchAccess';
import { getBoundedSecurityRouteContext, getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';
import { verifyTenantAccess } from '@/middleware/auth';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { normalizeAiMenuManagerScopeDocumentId } from './routeIds';

export const getAiMenuManagerSessionScope = (session: any) => {
    const sessionScope = resolveStorePermissionSessionScope(session);
    const tenantScope = normalizeAiMenuManagerScopeDocumentId(sessionScope?.tenantScope.documentId);
    const storeScope = normalizeAiMenuManagerScopeDocumentId(sessionScope?.storeScope.documentId);
    const userId = resolveCurrentSessionUserDocumentId(session);
    return {
        tId: tenantScope?.documentId || null,
        sId: storeScope?.documentId || null,
        userId,
    };
};

const buildSessionUserForStoreAccess = (session: any, fallbackStoreId: string | number) => ({
    ...(session?.user || {}),
    platformRole: resolveExactSessionPlatformRole(session) || undefined,
    storeId: session?.user?.storeId || session?.sId || fallbackStoreId,
    storeIds: session?.user?.storeIds || session?.storeIds,
    stores: session?.user?.stores || session?.stores,
});

export const resolveAiMenuManagerSelectedStoreScope = (
    request: NextRequest,
    session: any,
    requestedStoreId?: string | number | null,
) => {
    const { tId, sId, userId } = getAiMenuManagerSessionScope(session);
    if (!tId || !sId || !userId) {
        return {
            error: NextResponse.json({ error: 'User not onboarded' }, { status: 400 }),
        };
    }

    const hasRequestedStoreId = requestedStoreId !== undefined && requestedStoreId !== null && String(requestedStoreId) !== '';
    const selectedStoreScope = hasRequestedStoreId
        ? normalizeAiMenuManagerScopeDocumentId(requestedStoreId)
        : null;
    if (hasRequestedStoreId && !selectedStoreScope) {
        return {
            error: buildAiMenuManagerInvalidRequestResponse(request, session, 'selected-store'),
        };
    }

    if (!selectedStoreScope || selectedStoreScope.documentId === sId) {
        return { tId, sId, userId };
    }
    const selectedStoreId = selectedStoreScope.documentId;

    const sessionUser = buildSessionUserForStoreAccess(session, sId);
    if (!canUserAccessStore({ sessionUser, storeId: selectedStoreScope.numericId })) {
        logger.security('Tenant Access Violation - AI Menu Manager Store Scope', {
            ...getBoundedSecurityRouteContext(session, request),
            endpoint: request.nextUrl.pathname,
            ...getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId),
            ...getBoundedSecurityStringContext('sessionStoreId', sId),
            ...getBoundedSecurityStringContext('tenantId', tId),
        }, 'critical');
        return {
            error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        };
    }

    return { tId, sId: selectedStoreId, userId };
};

export const ensureAiMenuManagerTenantAccess = (
    request: NextRequest,
    session: any,
    tId: string | number,
    sId: string | number,
) => {
    const tenantScope = normalizeAiMenuManagerScopeDocumentId(tId);
    const storeScope = normalizeAiMenuManagerScopeDocumentId(sId);
    if (!tenantScope || !storeScope) {
        return NextResponse.json({ error: 'User not onboarded' }, { status: 400 });
    }

    const sessionScope = resolveStorePermissionSessionScope(session);
    if (
        !sessionScope
        || sessionScope.tenantScope.numericId !== tenantScope.numericId
        || sessionScope.storeScope.numericId !== storeScope.numericId
        || !verifyTenantAccess(session, tenantScope.documentId, storeScope.documentId, request)
    ) {
        logger.security('Tenant Access Violation - AI Menu Manager', {
            ...getBoundedSecurityRouteContext(session, request),
            endpoint: request.nextUrl.pathname,
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
};

export async function applyAiMenuManagerRateLimit(params: {
    request: NextRequest;
    session: any;
    feature: RateLimitFeature;
    keyPrefix: string;
}) {
    const { tId, sId, userId } = getAiMenuManagerSessionScope(params.session);
    const rateLimitConfig = getRateLimitForFeature(params.feature);
    const userRateLimitHash = hashPublicRateLimitValue(userId || 'unknown');
    const tenantRateLimitHash = hashPublicRateLimitValue(tId || '_');
    const storeRateLimitHash = hashPublicRateLimitValue(sId || '_');
    const failClosedOnProviderError = params.feature === 'AI_OPERATION';
    const rateLimit = await checkRateLimit({
        failClosedOnProviderError,
        key: `${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    const providerUnavailable = rateLimit.reason === 'provider_unavailable';
    logger.security(providerUnavailable ? 'Rate Limit Provider Unavailable' : 'Rate Limit Exceeded', {
        ...getBoundedSecurityRouteContext(params.session, params.request),
        endpoint: params.request.nextUrl.pathname,
        feature: params.feature,
        limit: rateLimitConfig.limit,
        ...getBoundedSecurityStringContext('storeId', sId),
        ...getBoundedSecurityStringContext('tenantId', tId),
        ...getBoundedSecurityStringContext('userId', userId),
        waitSeconds,
        window: rateLimitConfig.window,
    }, 'medium');

    return NextResponse.json(
        {
            error: providerUnavailable
                ? 'This operation is temporarily unavailable. Please try again shortly.'
                : `Too many requests. Please wait ${waitSeconds} seconds.`,
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            status: providerUnavailable ? 503 : 429,
            headers: {
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
        },
    );
}

export function buildAiMenuManagerInvalidRequestResponse(
    request: NextRequest,
    session: any,
    endpointLabel: string,
) {
    logger.security('Invalid AI Menu Manager Request', {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
        endpointLabel,
    }, 'low');

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
