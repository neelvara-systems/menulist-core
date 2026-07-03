import { logger } from '@lib/monitoring/logger';
import {
    getAnswerlatticeSecurityLogContext,
    getBoundedAnswerlatticeStringContext,
} from '@lib/answerlattice/diagnostics';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
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
    const userId = session?.uId || session?.user?.id || 'unknown';
    const tenantId = scope?.tenantId || session?.tId || session?.user?.tenantId || 'unknown';
    const storeId = scope?.storeId || session?.sId || session?.user?.storeId || 'unknown';

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(`answerlattice-dashboard-read:${routeKey}`, userId, tenantId, storeId),
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Rate Limit Exceeded - Answerlattice Dashboard Read', {
        ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
            ...getBoundedAnswerlatticeStringContext('routeKey', routeKey),
            ...getBoundedAnswerlatticeStringContext('tenantId', tenantId),
            ...getBoundedAnswerlatticeStringContext('storeId', storeId),
            ...getBoundedAnswerlatticeStringContext('userId', userId),
        }),
        limit: rateLimitConfig.limit,
        waitSeconds,
        window: rateLimitConfig.window,
    }, 'medium');

    return NextResponse.json(
        {
            error: 'Too many requests. Please try again later.',
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            headers: {
                'Cache-Control': 'private, no-store',
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
            status: 429,
        },
    );
}
