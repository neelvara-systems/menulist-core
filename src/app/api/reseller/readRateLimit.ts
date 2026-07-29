import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import type { Session } from 'next-auth';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

export const RESELLER_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

export const withResellerPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(RESELLER_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

export const resellerPrivateJson = (
    body: unknown,
    init: ResponseInit = {},
) => {
    const headers = new Headers(init.headers);
    Object.entries(RESELLER_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });

    return NextResponse.json(body, {
        ...init,
        headers,
    });
};

export async function applyResellerReadRateLimit(session: Session, routeKey: string) {
    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return resellerPrivateJson({ error: 'Forbidden' }, { status: 403 });
    }
    const resellerProfileId = session?.user?.resellerProfileId || 'unknown';
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const resellerProfileRateLimitHash = hashPublicRateLimitValue(resellerProfileId);

    const rateLimit = await checkRateLimit({
        key: `reseller-read:${routeKey}:${userRateLimitHash}:${resellerProfileRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return resellerPrivateJson(
        {
            error: rateLimit.reason === 'provider_unavailable'
                ? 'Service temporarily unavailable. Please try again later.'
                : 'Too many requests. Please try again later.',
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
            status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        },
    );
}
