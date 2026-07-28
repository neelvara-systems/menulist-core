/**
 * Reusable Rate Limiting Helpers
 * 
 * These helpers reduce code duplication by providing common rate limiting patterns.
 */

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@lib/rateLimit';
import { logger } from '@lib/monitoring/logger';
import { secureError } from '@lib/security/secureLogger';
import { getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';
import { getRateLimitForFeature, RateLimitFeature } from './configs';
import getActiveSession from '@lib/auth/getActiveSession';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

const normalizeRateLimitHelperError = (error: unknown): Error => {
    const normalized = new Error('Rate limit helper failure');
    const errorName = getBoundedErrorName(error);
    if (errorName) {
        normalized.name = errorName;
    }
    return normalized;
};

type AIRateLimitOptions = {
    failClosedOnProviderError?: boolean;
};

/**
 * Check rate limit and return 429 response if exceeded
 * 
 * @param feature - Feature config to use (AI_OPERATION, DATA_WRITE, etc.)
 * @param keyPrefix - Prefix for rate limit key (e.g., 'ai', 'upload', 'translate')
 * @returns null if allowed, NextResponse with 429 if exceeded
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *     // Check rate limit (returns response if blocked, null if allowed)
 *     const rateLimitResponse = await checkAIRateLimit();
 *     if (rateLimitResponse) return rateLimitResponse;
 *     
 *     // Continue with your logic...
 * }
 * ```
 */
export async function checkAIRateLimit(
    feature: RateLimitFeature = 'AI_OPERATION',
    keyPrefix: string = 'ai',
    options: AIRateLimitOptions = {},
): Promise<NextResponse | null> {
    try {
        const session = await getActiveSession();
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const userRateLimitHash = hashPublicRateLimitValue(session.user.id);
        const tenantRateLimitHash = hashPublicRateLimitValue(session.user.tenantId || 'unknown');
        const rateLimitKey = `${keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}`;
        const rateLimitConfig = getRateLimitForFeature(feature);
        const rateLimit = await checkRateLimit({
            failClosedOnProviderError: options.failClosedOnProviderError,
            key: rateLimitKey,
            ...rateLimitConfig
        });
        
        if (!rateLimit.allowed) {
            const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
            
            // Log rate limit violation to Sentry
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            logger.security(providerUnavailable ? 'Rate Limit Provider Unavailable' : 'Rate Limit Exceeded', {
                feature,
                ...getBoundedSecurityStringContext('userId', session.user.id),
                ...getBoundedSecurityStringContext('tenantId', session.user.tenantId),
                ...getBoundedSecurityStringContext('email', session.user.email),
                limit: rateLimitConfig.limit,
                window: rateLimitConfig.window,
                waitSeconds,
                endpoint: keyPrefix,
            }, 'medium');
            
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'This operation is temporarily unavailable. Please try again shortly.'
                        : `Too many requests. Please wait ${waitSeconds} seconds before trying again.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                        'Retry-After': String(waitSeconds)
                    }
                }
            );
        }
        
        // Rate limit passed
        return null;
        
    } catch (error) {
        if (options.failClosedOnProviderError) {
            secureError(
                '[Rate Limit Helper] Failed, blocking request',
                normalizeRateLimitHelperError(error),
                { feature, keyPrefix },
            );
            return NextResponse.json(
                { error: 'This operation is temporarily unavailable. Please try again shortly.' },
                { status: 503, headers: { 'Retry-After': '60' } },
            );
        }
        secureError(
            '[Rate Limit Helper] Failed, allowing request',
            normalizeRateLimitHelperError(error),
            { feature, keyPrefix },
        );
        // On error, allow request (fail open to prevent breaking app)
        return null;
    }
}

/**
 * Convenience wrapper specifically for AI operations
 */
export async function checkAIOperationLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('AI_OPERATION', 'ai', { failClosedOnProviderError: true });
}

/**
 * Convenience wrapper for data write operations
 */
export async function checkDataWriteLimit(options: AIRateLimitOptions = {}): Promise<NextResponse | null> {
    return checkAIRateLimit('DATA_WRITE', 'write', {
        failClosedOnProviderError: true,
        ...options,
    });
}

/**
 * Convenience wrapper for file upload operations
 */
export async function checkFileUploadLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('FILE_UPLOAD', 'upload', { failClosedOnProviderError: true });
}

/**
 * Convenience wrapper for expensive AI operations (image gen, processing)
 * These operations take 20-40 seconds each
 */
export async function checkExpensiveAILimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('AI_EXPENSIVE', 'ai-expensive', { failClosedOnProviderError: true });
}

/**
 * Convenience wrapper for batch operations
 * Very strict limit to prevent Cloud Task queue abuse
 */
export async function checkBatchOperationLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('BATCH_OPERATION', 'batch', { failClosedOnProviderError: true });
}
