export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { FEATURE_FLAGS } from '@config/features';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import {
    createPhoneOtpChallenge,
    hashPhoneForOtpRateLimit,
    hashRequestValueForPhoneOtp,
    PhoneOtpError,
    type PhoneOtpPurpose,
} from '@lib/auth/phoneOtp';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
    countryCode: z.string().trim().max(8).optional(),
    dialCode: z.string().trim().max(12).optional(),
    phone: z.string().trim().min(6).max(32),
    purpose: z.enum(['dashboard_login', 'create_menu', 'login']).default('login'),
});
const PHONE_OTP_START_MAX_BODY_BYTES = 1024;

const getRequestIp = (request: NextRequest) => (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
);

const getPhoneOtpStartFailureLogContext = (request: NextRequest) => ({
    endpoint: '/api/auth/phone-otp/start',
    ...getBoundedAuthStringContext('requestIp', getRequestIp(request)),
    ...getBoundedAuthStringContext('userAgent', request.headers.get('user-agent')),
});

const rateLimitResponse = (resetAt: number) => (
    NextResponse.json(
        { error: 'Too many attempts. Please wait before requesting another code.' },
        {
            headers: {
                'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
            },
            status: 429,
        },
    )
);

const getPhoneOtpStartClientError = (error: PhoneOtpError) => {
    if (error.code === 'invalid_phone') {
        return { message: 'Enter a valid phone number.', status: 400 };
    }

    return { message: 'Could not send code. Please try again.', status: error.code === 'send_failed' ? 503 : 400 };
};

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const ip = getRequestIp(request);
        const ipHash = hashRequestValueForPhoneOtp(ip);
        const sendRateConfig = getRateLimitForFeature('AUTH_PHONE_OTP_SEND');

        const ipRate = await checkRateLimit({
            key: `auth-phone-otp-send:ip:${ipHash}`,
            ...sendRateConfig,
        });
        if (!ipRate.allowed) return rateLimitResponse(ipRate.resetAt);

        const bodyResult = await readBoundedJsonBody(request, PHONE_OTP_START_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Enter a valid phone number.',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const rawBody = bodyResult.data;
        const parsed = bodySchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
        }

        const phoneHash = hashPhoneForOtpRateLimit({
            countryCode: parsed.data.countryCode,
            dialCode: parsed.data.dialCode,
            phone: parsed.data.phone,
        });
        const phoneRate = await checkRateLimit({
            key: `auth-phone-otp-send:phone:${phoneHash}`,
            ...sendRateConfig,
        });
        if (!phoneRate.allowed) return rateLimitResponse(phoneRate.resetAt);

        const userAgent = request.headers.get('user-agent') || '';
        const challenge = await createPhoneOtpChallenge({
            countryCode: parsed.data.countryCode,
            dialCode: parsed.data.dialCode,
            phone: parsed.data.phone,
            purpose: parsed.data.purpose as PhoneOtpPurpose,
            requestIpHash: ipHash,
            userAgentHash: userAgent ? hashRequestValueForPhoneOtp(userAgent) : undefined,
        });

        return NextResponse.json({
            success: true,
            action: 'start',
            challengeId: challenge.challengeId,
            expiresInSeconds: challenge.expiresInSeconds,
            phoneMasked: challenge.phoneMasked,
            purpose: parsed.data.purpose,
            resendAfterSeconds: challenge.resendAfterSeconds,
            ...(challenge.debugCode ? { debugCode: challenge.debugCode } : {}),
        });
    } catch (error) {
        if (error instanceof PhoneOtpError) {
            secureLog('[Phone OTP] Start failed', { code: error.code });
            const clientError = getPhoneOtpStartClientError(error);
            return NextResponse.json(
                { error: clientError.message },
                { status: clientError.status },
            );
        }

        logAuthFailure(
            'phone_otp_start_route_failed',
            error,
            getPhoneOtpStartFailureLogContext(request),
        );
        return NextResponse.json({ error: 'Could not send code. Please try again.' }, { status: 500 });
    }
}
