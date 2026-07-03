import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

export async function applyAnalyticsReadRateLimit(session: any, routeKey: string) {
    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const userId = session?.uId || session?.user?.id || 'unknown';
    const tenantId = session?.tId || session?.user?.tenantId || 'unknown';
    const storeId = session?.sId || session?.user?.storeId || 'unknown';
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);

    const rateLimit = await checkRateLimit({
        key: `analytics-read:${routeKey}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            error: 'Too many requests. Please try again later.',
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            headers: {
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
            status: 429,
        },
    );
}
