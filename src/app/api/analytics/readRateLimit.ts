import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getSessionProviderScopeKey } from '@lib/multiOutlet/sessionProviderScopeBoundary';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

export async function applyAnalyticsReadRateLimit(session: unknown, routeKey: string) {
    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const sessionScopeKey = getSessionProviderScopeKey(session);
    if (!sessionScopeKey) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sessionScopeHash = hashPublicRateLimitValue(sessionScopeKey);

    const rateLimit = await checkRateLimit({
        key: `analytics-read:${routeKey}:${sessionScopeHash}`,
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
