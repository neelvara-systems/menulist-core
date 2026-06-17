import { getRateLimitForFeature, type RateLimitFeature } from '@lib/rateLimit/configs';
import { checkRateLimit } from '@lib/rateLimit';
import { logger } from '@lib/monitoring/logger';
import { canUserAccessStore } from '@lib/multiOutlet/storeSwitchAccess';
import { buildSecurityContext } from '@lib/security/securityContext';
import { verifyTenantAccess } from '@/middleware/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const getAiMenuManagerSessionScope = (session: any) => {
    const tId = session?.tId || session?.user?.tenantId;
    const sId = session?.sId || session?.user?.storeId;
    const userId = session?.uId || session?.user?.id;
    return { tId, sId, userId };
};

const normalizeStoreId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildSessionUserForStoreAccess = (session: any, fallbackStoreId: string | number) => ({
    ...(session?.user || {}),
    platformRole: session?.platformRole || session?.user?.platformRole,
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
    if (!tId || !sId) {
        return {
            error: NextResponse.json({ error: 'User not onboarded' }, { status: 400 }),
        };
    }

    const selectedStoreId = normalizeStoreId(requestedStoreId);
    if (!selectedStoreId || String(selectedStoreId) === String(sId)) {
        return { tId, sId, userId };
    }

    const sessionUser = buildSessionUserForStoreAccess(session, sId);
    if (!canUserAccessStore({ sessionUser, storeId: selectedStoreId })) {
        logger.security('Tenant Access Violation - AI Menu Manager Store Scope', {
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            attemptedStoreId: selectedStoreId,
            sessionStoreId: sId,
            tenantId: tId,
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
    if (!tId || !sId) {
        return NextResponse.json({ error: 'User not onboarded' }, { status: 400 });
    }

    if (!verifyTenantAccess(session, tId, sId, request)) {
        logger.security('Tenant Access Violation - AI Menu Manager', {
            ...buildSecurityContext(session, request),
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
    const rateLimit = await checkRateLimit({
        key: `${params.keyPrefix}:${userId || 'unknown'}:${tId || '_'}:${sId || '_'}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Rate Limit Exceeded', {
        ...buildSecurityContext(params.session, params.request),
        endpoint: params.request.nextUrl.pathname,
        feature: params.feature,
        limit: rateLimitConfig.limit,
        storeId: sId,
        tenantId: tId,
        userId,
        waitSeconds,
        window: rateLimitConfig.window,
    }, 'medium');

    return NextResponse.json(
        {
            error: `Too many requests. Please wait ${waitSeconds} seconds.`,
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            status: 429,
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
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        endpointLabel,
    }, 'low');

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
