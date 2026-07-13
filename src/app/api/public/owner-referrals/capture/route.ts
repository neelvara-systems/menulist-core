export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import {
    readOwnerReferralCookie,
    setOwnerReferralCookie,
} from '@lib/ownerReferral/ownerReferralAttributionServer';
import { validateOwnerReferralToken } from '@lib/ownerReferral/ownerReferralTokenServer';
import {
    isOwnerReferralAcquisitionEnabled,
    isOwnerReferralPilotStoreAllowed,
} from '@lib/ownerReferral/ownerReferralFeature';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { logSecurityFailure } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';

const OWNER_REFERRAL_CAPTURE_MAX_BODY_BYTES = 2 * 1024;
const OwnerReferralCaptureSchema = z.object({
    token: z.string().min(32).max(1024),
}).strict();

const unavailable = (status = 400) => NextResponse.json(
    { success: false, error: 'This invitation is unavailable.' },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
);

const normalizeHttpProtocol = (value: string | null): 'http' | 'https' | null => {
    if (value === 'http' || value === 'https') return value;
    return null;
};

const getRequestHostOrigin = (request: NextRequest): string | null => {
    const requestAuthority = normalizeRequestAuthority(request.headers.get('host'));
    if (!requestAuthority) return null;

    const forwardedProtocol = normalizeHttpProtocol(request.headers.get('x-forwarded-proto'));
    const requestProtocol = normalizeHttpProtocol(request.nextUrl.protocol.replace(/:$/, ''));
    const protocol = forwardedProtocol || requestProtocol;
    if (!protocol) return null;

    return `${protocol}://${requestAuthority.authority}`;
};

const isSameOriginBrowserRequest = (request: NextRequest): boolean => {
    const origin = request.headers.get('origin');
    if (!origin) return true;
    try {
        const originUrl = new URL(origin);
        const requestHostOrigin = getRequestHostOrigin(request);
        return Boolean(requestHostOrigin && originUrl.origin === requestHostOrigin);
    } catch {
        return false;
    }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!isOwnerReferralAcquisitionEnabled()) return unavailable(404);
    if (!isSameOriginBrowserRequest(request)) return unavailable(403);

    const config = getRateLimitForFeature('OWNER_REFERRAL_CAPTURE');
    const rateLimit = await checkRateLimit({
        key: `owner-referral-capture:${hashPublicRateLimitValue(getClientIp(request))}`,
        ...config,
        failClosedOnProviderError: process.env.NODE_ENV === 'production',
    });
    if (!rateLimit.allowed) return unavailable(429);

    const bodyResult = await readBoundedJsonBody(request, OWNER_REFERRAL_CAPTURE_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid invitation.',
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const parsed = OwnerReferralCaptureSchema.safeParse(bodyResult.data);
    if (!parsed.success) return unavailable();

    try {
        const existing = readOwnerReferralCookie(request);
        const existingPayload = existing ? validateOwnerReferralToken(existing) : null;
        if (existingPayload && isOwnerReferralPilotStoreAllowed(existingPayload.referrerStoreId)) {
            return NextResponse.json(
                { success: true, continueTo: '/create-menu' },
                { headers: { 'Cache-Control': 'private, no-store' } },
            );
        }
        const payload = validateOwnerReferralToken(parsed.data.token);
        if (!payload || !isOwnerReferralPilotStoreAllowed(payload.referrerStoreId)) return unavailable();

        const response = NextResponse.json(
            { success: true, continueTo: '/create-menu' },
            { headers: { 'Cache-Control': 'private, no-store' } },
        );
        setOwnerReferralCookie(response, parsed.data.token);
        return response;
    } catch (error) {
        logSecurityFailure('owner_referral_capture_failed', error, {
            path: request.nextUrl.pathname,
            tokenPresent: true,
        });
        return unavailable();
    }
}
