/**
 * Public API Utilities
 * 
 * Utilities for unauthenticated public endpoints.
 * Uses existing Upstash rate limiting from @lib/rateLimit.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature, RateLimitFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_FORM_TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

/**
 * Extract client IP from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, nginx)
 */
export const getClientIp = (req: NextRequest): string => {
    // Try various headers in order of preference
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }

    // Vercel-specific header
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    if (vercelIp) {
        return vercelIp.split(',')[0].trim();
    }

    // Cloudflare-specific header
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp) {
        return cfIp.trim();
    }

    return 'unknown';
};

/**
 * Check public endpoint rate limit using existing Upstash
 * 
 * @param req - Next.js request (for IP extraction)
 * @param feature - Rate limit feature config (default: FEEDBACK_SUBMISSION)
 * @returns null if allowed, NextResponse with 429 if exceeded
 */
export async function checkPublicRateLimit(
    req: NextRequest,
    feature: RateLimitFeature = 'FEEDBACK_SUBMISSION'
): Promise<NextResponse | null> {
    const ip = getClientIp(req);
    const config = getRateLimitForFeature(feature);
    let result;

    try {
        result = await checkRateLimit({
            key: `public:${feature}:${ip}`,
            limit: config.limit,
            window: config.window,
        });
    } catch (error) {
        console.error('[Public API] Rate limit check failed, allowing request:', error);
        return null;
    }

    if (!result.allowed) {
        const waitSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

        return NextResponse.json(
            {
                success: false,
                error: 'Too many requests. Please try again later.',
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(waitSeconds),
                    'X-RateLimit-Limit': String(config.limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(result.resetAt),
                },
            }
        );
    }

    return null;
}

/**
 * Validate honeypot field
 * Returns true if honeypot is empty (legitimate request)
 * Returns false if honeypot is filled (likely bot)
 */
export const validateHoneypot = (honeypotValue?: string): boolean => {
    // Honeypot should be empty or undefined
    return !honeypotValue || honeypotValue.length === 0;
};

/**
 * Sanitize string input (basic XSS prevention)
 * Strips HTML tags and trims whitespace
 */
export const sanitizeString = (input?: string): string | undefined => {
    if (!input) return undefined;

    // Remove HTML tags
    const stripped = input.replace(/<[^>]*>/g, '');

    // Trim whitespace
    return stripped.trim() || undefined;
};

/**
 * Verify optional Cloudflare Turnstile token for public anonymous forms.
 *
 * Behavior:
 * - If TURNSTILE_SECRET_KEY is not set, validation is skipped (backward compatible).
 * - If secret is set, token must be present and valid.
 */
export const verifyTurnstileToken = async (
    token: string | null | undefined,
    request: NextRequest,
): Promise<{ ok: boolean; reason?: string }> => {
    if (!PUBLIC_FORM_TURNSTILE_SECRET) {
        return { ok: true };
    }

    if (!token) {
        return { ok: false, reason: 'missing_token' };
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body: new URLSearchParams({
                secret: PUBLIC_FORM_TURNSTILE_SECRET,
                response: token,
                remoteip: getClientIp(request),
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
        });

        if (!response.ok) {
            return { ok: false, reason: 'verification_http_error' };
        }

        const payload = await response.json().catch(() => ({} as any));
        return payload?.success ? { ok: true } : { ok: false, reason: 'verification_failed' };
    } catch {
        return { ok: false, reason: 'verification_exception' };
    }
};
