/**
 * Reusable Rate Limiting Helpers
 * 
 * These helpers reduce code duplication by providing common rate limiting patterns.
 */

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@lib/rateLimit';
import { logger } from '@lib/monitoring/logger';
import { getRateLimitForFeature, RateLimitFeature } from './configs';
import getActiveSession from '@lib/auth/getActiveSession';

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
    keyPrefix: string = 'ai'
): Promise<NextResponse | null> {
    try {
        const session = await getActiveSession();
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const rateLimitKey = `${keyPrefix}:${session.user.id}:${session.user.tenantId}`;
        const rateLimitConfig = getRateLimitForFeature(feature);
        const rateLimit = await checkRateLimit({
            key: rateLimitKey,
            ...rateLimitConfig
        });
        
        if (!rateLimit.allowed) {
            const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
            
            // Log rate limit violation to Sentry
            logger.security('Rate Limit Exceeded', {
                feature,
                userId: session.user.id,
                tenantId: session.user.tenantId,
                email: session.user.email,
                limit: rateLimitConfig.limit,
                window: rateLimitConfig.window,
                waitSeconds,
                endpoint: keyPrefix,
            }, 'medium');
            
            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${waitSeconds} seconds before trying again.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt
                },
                {
                    status: 429,
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
        console.error('[Rate Limit Helper] Error:', error);
        // On error, allow request (fail open to prevent breaking app)
        return null;
    }
}

/**
 * Convenience wrapper specifically for AI operations
 */
export async function checkAIOperationLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('AI_OPERATION', 'ai');
}

/**
 * Convenience wrapper for data write operations
 */
export async function checkDataWriteLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('DATA_WRITE', 'write');
}

/**
 * Convenience wrapper for file upload operations
 */
export async function checkFileUploadLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('FILE_UPLOAD', 'upload');
}

/**
 * Convenience wrapper for expensive AI operations (image gen, processing)
 * These operations take 20-40 seconds each
 */
export async function checkExpensiveAILimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('AI_EXPENSIVE', 'ai-expensive');
}

/**
 * Convenience wrapper for batch operations
 * Very strict limit to prevent Cloud Task queue abuse
 */
export async function checkBatchOperationLimit(): Promise<NextResponse | null> {
    return checkAIRateLimit('BATCH_OPERATION', 'batch');
}
