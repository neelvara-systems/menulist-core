/**
 * Upstash Rate Limiting for Firebase Functions
 * 
 * MUST MATCH: /src/lib/rateLimit.ts (frontend implementation)
 * 
 * Uses the same Upstash Redis instance as the frontend
 * for consistent rate limiting across the entire application.
 * 
 * Environment Variables Required (Firebase Secrets):
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * Feature Flag: FUNCTION_FLAGS.ENABLE_RATE_LIMITING
 * - When disabled, all requests are allowed (no Upstash calls)
 */

import { Redis } from '@upstash/redis';
import { createHmac } from 'crypto';
import * as functions from 'firebase-functions';
import { isFunctionFeatureEnabled } from '../constants/features';

// Initialize Upstash client using Firebase Function config/secrets
// These must be set via: firebase functions:secrets:set UPSTASH_REDIS_REST_URL
let upstash: Redis | null = null;
const FUNCTIONS_RATE_LIMIT_HASH_SECRET =
    process.env.NEXTAUTH_SECRET
    || process.env.UPSTASH_REDIS_REST_TOKEN
    || 'menulist-functions-rate-limit-local';

function hashFunctionsRateLimitValue(value: unknown): string {
    const normalized = value === undefined || value === null ? 'unknown' : String(value);
    return createHmac('sha256', FUNCTIONS_RATE_LIMIT_HASH_SECRET)
        .update(normalized)
        .digest('hex')
        .slice(0, 40);
}

function getRateLimitErrorContext(error: unknown): {
    sourceErrorName?: string;
    sourceErrorCode?: string;
    sourceStatusCode?: number;
} {
    if (!error || typeof error !== 'object') return {};
    const record = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    const status = Number(record.status ?? record.statusCode);
    return {
        sourceErrorName: error instanceof Error ? error.name || 'Error' : typeof error,
        sourceErrorCode: record.code === undefined || record.code === null
            ? undefined
            : String(record.code).slice(0, 64),
        sourceStatusCode: Number.isFinite(status) ? status : undefined,
    };
}

function getBoundedRateLimitStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getUpstashClient(): Redis | null {
    if (upstash) return upstash;

    const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

    if (!url || !token) {
        functions.logger.warn('[RateLimit] Upstash credentials not found - rate limiting disabled');
        return null;
    }

    try {
        upstash = new Redis({ url, token });
        return upstash;
    } catch (error) {
        functions.logger.error('[RateLimit] Failed to initialize Upstash client - rate limiting disabled', {
            error: getRateLimitErrorContext(error),
        });
        return null;
    }
}

interface RateLimitConfig {
    key: string;           // Unique identifier (projectId, userId, etc.)
    limit: number;         // Max requests allowed
    window: number;        // Time window in seconds
}

interface RateLimitResult {
    allowed: boolean;      // Whether request is allowed
    remaining: number;     // Remaining requests in window
    resetAt: number;       // Timestamp when limit resets
    current: number;       // Current request count
}

/**
 * Check if request is within rate limit using Upstash
 * 
 * Algorithm: Sliding Window using sorted sets (matches frontend)
 * - Each request is a member in a sorted set
 * - Score is the timestamp
 * - Old requests (outside window) are removed
 * - Count remaining requests to check limit
 * 
 * Respects FUNCTION_FLAGS.ENABLE_RATE_LIMITING feature flag
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const { key, limit, window } = config;
    const now = Date.now();
    const logger = functions.logger;

    // Check feature flag - if disabled, allow all requests
    if (!isFunctionFeatureEnabled('ENABLE_RATE_LIMITING')) {
        logger.debug('[RateLimit] Disabled via feature flag - allowing request');
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }

    const client = getUpstashClient();

    // If Upstash not available, allow request (fail open)
    if (!client) {
        logger.warn('[RateLimit] Upstash not initialized - allowing request');
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }

    const windowStart = now - (window * 1000);

    try {
        // Use Upstash pipeline for atomic operations
        const pipeline = client.pipeline();

        // 1. Remove old entries (outside current window)
        pipeline.zremrangebyscore(key, 0, windowStart);

        // 2. Count current requests in window
        pipeline.zcard(key);

        // 3. Add current request
        pipeline.zadd(key, { score: now, member: now.toString() });

        // 4. Set expiration (cleanup old keys automatically)
        pipeline.expire(key, window * 2);

        // Execute all commands atomically
        const results = await pipeline.exec();

        // results[1] is the count BEFORE adding current request
        const currentCount = (results[1] as number) || 0;

        // Check if limit exceeded
        if (currentCount >= limit) {
            // Get oldest request to calculate reset time
            const oldest = await client.zrange(key, 0, 0, { withScores: true });

            let oldestTimestamp = now;
            if (Array.isArray(oldest) && oldest.length >= 2) {
                oldestTimestamp = Number(oldest[1]) || now;
            }

            const resetAt = oldestTimestamp + (window * 1000);

            logger.warn('[RateLimit] Rate limit exceeded', {
                ...getBoundedRateLimitStringContext('key', key),
                currentCount,
                limit,
                resetAt
            });

            return {
                allowed: false,
                remaining: 0,
                resetAt,
                current: currentCount
            };
        }

        // Request allowed
        return {
            allowed: true,
            remaining: limit - currentCount - 1,
            resetAt: now + (window * 1000),
            current: currentCount + 1
        };

    } catch (error) {
        logger.error('[RateLimit] Upstash error - allowing request', {
            ...getBoundedRateLimitStringContext('key', key),
            limit,
            window,
            error: getRateLimitErrorContext(error),
        });

        // FALLBACK: Allow request on Upstash error (fail open)
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }
}

// Rate limit configurations (matches frontend configs)
export const RATE_LIMIT_CONFIGS = {
    AI_EXPENSIVE: {
        limit: 5,      // 5 requests
        window: 60     // per minute (expensive operations)
    },
    AI_OPERATION: {
        limit: 30,     // 30 requests
        window: 60     // per minute
    }
} as const;

/**
 * Check rate limit for expensive AI operations (image processing)
 * This should match the frontend's checkExpensiveAILimit
 */
export async function checkExpensiveAIRateLimit(projectId: string): Promise<RateLimitResult> {
    const projectRateLimitHash = hashFunctionsRateLimitValue(projectId);
    return checkRateLimit({
        key: `ai-expensive:parallel:${projectRateLimitHash}`,
        ...RATE_LIMIT_CONFIGS.AI_EXPENSIVE
    });
}
