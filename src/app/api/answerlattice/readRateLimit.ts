import { logger } from '@lib/monitoring/logger';
import {
    getAnswerlatticeSecurityLogContext,
    getBoundedAnswerlatticeStringContext,
} from '@lib/answerlattice/diagnostics';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { getAnswerlatticeDashboardReadRateLimitDecision } from '@lib/answerlattice/dashboardReadRateLimitPolicy';
import { ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS } from '@lib/answerlattice/accessControl';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';

export async function applyAnswerlatticeDashboardReadRateLimit(
    request: NextRequest,
    session: any,
    routeKey: string,
) {
    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const scope = resolveAnswerlatticeSessionScope(session);
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!scope || !userId) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, status: 403 },
        );
    }
    const tenantId = scope.tenantId;
    const storeId = scope.storeId;

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(`answerlattice-dashboard-read:${routeKey}`, userId, tenantId, storeId),
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    const decision = getAnswerlatticeDashboardReadRateLimitDecision(rateLimit);
    if (decision.kind === 'allow') return null;
    if (decision.kind === 'provider_unavailable') {
        return NextResponse.json(
            { error: 'This workspace view is temporarily unavailable. Please try again later.' },
            { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, status: decision.status },
        );
    }

    logger.security('Rate Limit Exceeded - Answerlattice Dashboard Read', {
        ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
            ...getBoundedAnswerlatticeStringContext('routeKey', routeKey),
            ...getBoundedAnswerlatticeStringContext('tenantId', tenantId),
            ...getBoundedAnswerlatticeStringContext('storeId', storeId),
            ...getBoundedAnswerlatticeStringContext('userId', userId),
        }),
        limit: rateLimitConfig.limit,
        waitSeconds: decision.retryAfterSeconds,
        window: rateLimitConfig.window,
    }, 'medium');

    return NextResponse.json(
        {
            error: 'Too many requests. Please try again later.',
            retryAfter: decision.retryAfterSeconds,
            resetAt: decision.resetAt,
        },
        {
            headers: {
                ...ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
                'Cache-Control': 'private, no-store',
                'Retry-After': String(decision.retryAfterSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': String(decision.remaining),
                'X-RateLimit-Reset': String(decision.resetAt),
            },
            status: decision.status,
        },
    );
}
