export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import {
    MYCODEX_ROBOTS_TAG,
    MYCODEX_SESSION_COOKIE,
    createMyCodexSessionToken,
    getMyCodexExpectedCredentials,
    getMyCodexSessionCookieOptions,
    sanitizeMyCodexReturnTo,
    validateMyCodexCredentials,
} from '@lib/mycodex/auth';
import { validateAPIInput } from '@lib/security/inputValidation';

const MyCodexLoginSchema = z.object({
    username: z.string().min(1).max(128).transform((value) => value.trim()),
    password: z.string().min(1).max(256),
    returnTo: z.string().max(2048).optional(),
});

const getRequestIp = (request: NextRequest) => (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
);

const getLoginPath = (request: NextRequest) => {
    const referer = request.headers.get('referer');
    if (referer) {
        try {
            const refererPath = new URL(referer).pathname;
            if (refererPath.startsWith('/__mycodex/')) return '/__mycodex/login';
        } catch {
            // Fall back to product-domain login path.
        }
    }

    return request.nextUrl.pathname.startsWith('/__mycodex/') ? '/__mycodex/login' : '/login';
};

const redirectToLogin = (request: NextRequest, error: string, returnTo: string | null | undefined) => {
    const url = new URL(getLoginPath(request), request.url);
    url.searchParams.set('error', error);
    url.searchParams.set('returnTo', sanitizeMyCodexReturnTo(returnTo));

    const response = NextResponse.redirect(url, 303);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', MYCODEX_ROBOTS_TAG);
    return response;
};

export async function POST(request: NextRequest) {
    let rawBody: Record<string, FormDataEntryValue | null> = {};

    try {
        const formData = await request.formData();
        rawBody = {
            username: formData.get('username'),
            password: formData.get('password'),
            returnTo: formData.get('returnTo'),
        };
    } catch {
        return redirectToLogin(request, 'input', '/');
    }

    const rateLimit = await checkRateLimit({
        key: `mycodex-login:${getRequestIp(request)}`,
        ...getRateLimitForFeature('AUTH_LOGIN'),
    });

    if (!rateLimit.allowed) {
        logger.security('MyCodex Login Rate Limit Exceeded', {
            endpoint: request.nextUrl.pathname,
            ip: getRequestIp(request),
        }, 'medium');

        return redirectToLogin(request, 'rate-limit', String(rawBody.returnTo || '/'));
    }

    if (!getMyCodexExpectedCredentials()) {
        logger.security('MyCodex Login Attempt While Unconfigured', {
            endpoint: request.nextUrl.pathname,
            ip: getRequestIp(request),
        }, 'high');

        return redirectToLogin(request, 'config', String(rawBody.returnTo || '/'));
    }

    const validation = validateAPIInput(MyCodexLoginSchema, {
        username: String(rawBody.username || ''),
        password: String(rawBody.password || ''),
        returnTo: String(rawBody.returnTo || '/'),
    });

    if (validation.success === false) {
        logger.security('MyCodex Login Input Validation Failed', {
            endpoint: request.nextUrl.pathname,
            ip: getRequestIp(request),
            error: validation.error,
        }, 'medium');

        return redirectToLogin(request, 'input', String(rawBody.returnTo || '/'));
    }

    const { username, password, returnTo } = validation.data;
    if (!validateMyCodexCredentials(username, password)) {
        logger.security('MyCodex Login Failed', {
            endpoint: request.nextUrl.pathname,
            ip: getRequestIp(request),
            username,
        }, 'medium');

        return redirectToLogin(request, 'invalid', returnTo);
    }

    const sessionToken = await createMyCodexSessionToken(username);
    if (!sessionToken) {
        logger.security('MyCodex Session Token Creation Failed', {
            endpoint: request.nextUrl.pathname,
            ip: getRequestIp(request),
        }, 'high');

        return redirectToLogin(request, 'config', returnTo);
    }

    const redirectUrl = new URL(sanitizeMyCodexReturnTo(returnTo), request.url);
    const response = NextResponse.redirect(redirectUrl, 303);
    response.cookies.set(MYCODEX_SESSION_COOKIE, sessionToken, getMyCodexSessionCookieOptions());
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', MYCODEX_ROBOTS_TAG);
    return response;
}
