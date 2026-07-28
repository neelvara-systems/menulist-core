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
import { createHmac, randomBytes } from 'crypto';
import * as functions from 'firebase-functions';
import { isFunctionFeatureEnabled } from '../constants/features';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

// Initialize Upstash client using Firebase Function config/secrets
// These must be set via: firebase functions:secrets:set UPSTASH_REDIS_REST_URL
let upstash: Redis | null = null;
const RATE_LIMIT_PROVIDER_TIMEOUT_MS = 1500;
const RATE_LIMIT_PROVIDER_BYPASS_MS = 60_000;
const RATE_LIMIT_PROVIDER_TIMEOUT_CODE = 'RATE_LIMIT_PROVIDER_TIMEOUT';
let rateLimitProviderBypassUntil = 0;
const FUNCTIONS_RATE_LIMIT_HASH_SECRET =
    process.env.NEXTAUTH_SECRET
    || process.env.UPSTASH_REDIS_REST_TOKEN
    || 'menulist-functions-rate-limit-local';

const ATOMIC_SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local windowStart = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local ttlSeconds = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
local current = redis.call('ZCARD', key)
if current >= limit then
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local oldestTimestamp = now
    if oldest[2] then oldestTimestamp = tonumber(oldest[2]) end
    return {0, current, oldestTimestamp}
end

redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, ttlSeconds)
return {1, current + 1, now}
`;

class RateLimitProviderTimeoutError extends Error {
    readonly code = RATE_LIMIT_PROVIDER_TIMEOUT_CODE;

    constructor() {
        super(RATE_LIMIT_PROVIDER_TIMEOUT_CODE);
        this.name = 'RateLimitProviderTimeoutError';
    }
}

const withRateLimitTimeout = async <T>(promise: Promise<T>): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(
                    () => reject(new RateLimitProviderTimeoutError()),
                    RATE_LIMIT_PROVIDER_TIMEOUT_MS,
                );
            }),
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

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
    return getBoundedFunctionsErrorContext(error);
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
        functions.logger.warn('[RateLimit] Upstash credentials not found');
        return null;
    }

    try {
        upstash = new Redis({ url, token });
        return upstash;
    } catch (error) {
        functions.logger.error('[RateLimit] Failed to initialize Upstash client', {
            error: getRateLimitErrorContext(error),
        });
        return null;
    }
}

interface RateLimitConfig {
    key: string;           // Unique identifier (projectId, userId, etc.)
    limit: number;         // Max requests allowed
    window: number;        // Time window in seconds
    failClosedOnProviderError: boolean;
}

interface RateLimitResult {
    allowed: boolean;      // Whether request is allowed
    remaining: number;     // Remaining requests in window
    resetAt: number;       // Timestamp when limit resets
    current: number;       // Current request count
    reason?: 'limit_exceeded' | 'provider_unavailable';
}

const buildProviderUnavailableResult = (
    limit: number,
    now: number,
    resetAt: number = now + RATE_LIMIT_PROVIDER_BYPASS_MS,
): RateLimitResult => ({
    allowed: false,
    remaining: 0,
    resetAt,
    current: limit,
    reason: 'provider_unavailable',
});

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
    const { key, limit, window, failClosedOnProviderError } = config;
    const now = Date.now();
    const logger = functions.logger;

    if (!isFunctionFeatureEnabled('ENABLE_RATE_LIMITING')) {
        logger.debug('[RateLimit] Disabled via feature flag - allowing request');
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }

    if (rateLimitProviderBypassUntil > now) {
        return failClosedOnProviderError
            ? buildProviderUnavailableResult(limit, now, rateLimitProviderBypassUntil)
            : {
                allowed: true,
                remaining: limit,
                resetAt: rateLimitProviderBypassUntil,
                current: 0,
            };
    }

    const client = getUpstashClient();

    if (!client) {
        logger.warn('[RateLimit] Upstash not initialized', {
            failClosedOnProviderError,
        });
        if (failClosedOnProviderError) {
            return buildProviderUnavailableResult(limit, now);
        }
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }

    const windowStart = now - (window * 1000);

    try {
        const member = `${now}:${randomBytes(8).toString('hex')}`;
        const atomicResult = await withRateLimitTimeout(
            client.eval<
                [string, string, string, string, string],
                [number, number, number]
            >(
                ATOMIC_SLIDING_WINDOW_SCRIPT,
                [key],
                [
                    String(windowStart),
                    String(now),
                    String(limit),
                    member,
                    String(Math.max(1, window * 2)),
                ],
            ),
        );

        if (
            !Array.isArray(atomicResult)
            || atomicResult.length !== 3
            || !atomicResult.every((value) => Number.isSafeInteger(value) && value >= 0)
            || (atomicResult[0] !== 0 && atomicResult[0] !== 1)
        ) {
            throw new Error('Rate limit provider returned an invalid atomic result');
        }

        const [allowedFlag, currentCount, oldestTimestamp] = atomicResult;
        if (allowedFlag === 0) {
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
                current: currentCount,
                reason: 'limit_exceeded',
            };
        }

        return {
            allowed: true,
            remaining: Math.max(limit - currentCount, 0),
            resetAt: now + (window * 1000),
            current: currentCount,
        };

    } catch (error) {
        rateLimitProviderBypassUntil = Date.now() + RATE_LIMIT_PROVIDER_BYPASS_MS;
        logger.error('[RateLimit] Upstash provider unavailable', {
            ...getBoundedRateLimitStringContext('key', key),
            limit,
            window,
            failClosedOnProviderError,
            bypassMs: RATE_LIMIT_PROVIDER_BYPASS_MS,
            error: getRateLimitErrorContext(error),
        });

        if (failClosedOnProviderError) {
            return buildProviderUnavailableResult(
                limit,
                now,
                rateLimitProviderBypassUntil,
            );
        }

        return {
            allowed: true,
            remaining: limit,
            resetAt: rateLimitProviderBypassUntil,
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
        failClosedOnProviderError: true,
        ...RATE_LIMIT_CONFIGS.AI_EXPENSIVE
    });
}
