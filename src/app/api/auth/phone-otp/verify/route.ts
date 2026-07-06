export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { FEATURE_FLAGS } from '@config/features';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import {
    hashRequestValueForPhoneOtp,
    normalizePhoneOtpChallengeId,
    PhoneOtpError,
    verifyPhoneOtpChallenge,
} from '@lib/auth/phoneOtp';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PhoneOtpChallengeIdSchema = z.string()
    .trim()
    .refine((value) => normalizePhoneOtpChallengeId(value) !== null, 'Invalid challenge');

const bodySchema = z.object({
    challengeId: PhoneOtpChallengeIdSchema,
    code: z.string().trim().regex(/^\d{4,8}$/),
});
const PHONE_OTP_VERIFY_MAX_BODY_BYTES = 1024;

const getRequestIp = (request: NextRequest) => (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
);

const getPhoneOtpVerifyFailureLogContext = (request: NextRequest) => ({
    endpoint: '/api/auth/phone-otp/verify',
    ...getBoundedAuthStringContext('requestIp', getRequestIp(request)),
    ...getBoundedAuthStringContext('userAgent', request.headers.get('user-agent')),
});

const rateLimitResponse = (resetAt: number) => (
    NextResponse.json(
        { error: 'Too many attempts. Please wait before trying again.' },
        {
            headers: {
                'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
            },
            status: 429,
        },
    )
);

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const verifyRateConfig = getRateLimitForFeature('AUTH_PHONE_OTP_VERIFY');
        const ipHash = hashRequestValueForPhoneOtp(getRequestIp(request));

        const ipRate = await checkRateLimit({
            key: `auth-phone-otp-verify:ip:${ipHash}`,
            ...verifyRateConfig,
        });
        if (!ipRate.allowed) return rateLimitResponse(ipRate.resetAt);

        const bodyResult = await readBoundedJsonBody(request, PHONE_OTP_VERIFY_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Enter the verification code.',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const rawBody = bodyResult.data;
        const parsed = bodySchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Enter the verification code.' }, { status: 400 });
        }

        const challengeHash = hashRequestValueForPhoneOtp(parsed.data.challengeId);
        const challengeRate = await checkRateLimit({
            key: `auth-phone-otp-verify:challenge:${challengeHash}`,
            ...verifyRateConfig,
        });
        if (!challengeRate.allowed) return rateLimitResponse(challengeRate.resetAt);

        const verified = await verifyPhoneOtpChallenge({
            challengeId: parsed.data.challengeId,
            code: parsed.data.code,
        });

        return NextResponse.json({
            success: true,
            action: 'verify',
            challengeId: parsed.data.challengeId,
            loginToken: verified.loginToken,
            expiresInSeconds: verified.expiresInSeconds,
            phoneMasked: verified.phoneMasked,
        });
    } catch (error) {
        if (error instanceof PhoneOtpError) {
            secureLog('[Phone OTP] Verify failed', { code: error.code });
            const expired = error.code === 'expired';
            const tooManyAttempts = error.code === 'too_many_attempts';
            return NextResponse.json(
                {
                    error: expired
                        ? 'Code expired. Please request a new code.'
                        : tooManyAttempts
                            ? 'Too many attempts. Please request a new code.'
                            : 'Invalid verification code.',
                },
                { status: expired || tooManyAttempts ? 400 : 401 },
            );
        }

        logAuthFailure(
            'phone_otp_verify_route_failed',
            error,
            getPhoneOtpVerifyFailureLogContext(request),
        );
        return NextResponse.json({ error: 'Could not verify code. Please try again.' }, { status: 500 });
    }
}
