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
