/**
 * Upstash Rate Limiting (Production-Ready)
 * 
 * Uses Upstash serverless Redis for Vercel deployment.
 * 
 * Why Upstash?
 * - ✅ Shared across all Vercel function instances
 * - ✅ Persists across function restarts
 * - ✅ Works reliably in production
 * - ✅ Scales to millions of users
 * 
 * Cost:
 * - Free tier: 10,000 requests/day
 * - Paid: $0.20 per 100K requests
 * 
 * Development Mode:
 * - Start the local process with ENABLE_RATE_LIMITING=false
 * - All requests allowed (no Upstash needed)
 * - Faster testing workflow
 */

import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';
import { createRandomIdSegment } from '@lib/runtime/randomId';
import { secureError } from '@lib/security/secureLogger';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

function createUpstashClient(): Redis | null {
    if (!FEATURE_FLAGS.ENABLE_RATE_LIMITING) return null;

    const url = (menulistServerEnv.upstashRedisRestUrl || '').trim();
    const token = (menulistServerEnv.upstashRedisRestToken || '').trim();
    if (!url || !token) return null;

    try {
        return new Redis({ url, token });
    } catch {
        return null;
    }
}

const upstash = createUpstashClient();

const RATE_LIMIT_PROVIDER_TIMEOUT_MS = 1500;
const RATE_LIMIT_PROVIDER_BYPASS_MS = 60_000;
const RATE_LIMIT_PROVIDER_TIMEOUT_CODE = 'RATE_LIMIT_PROVIDER_TIMEOUT';
let rateLimitProviderBypassUntil = 0;

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
        super('Rate limit provider timeout');
        this.name = 'RateLimitProviderTimeoutError';
    }
}

const isRateLimitProviderTimeoutError = (error: unknown): error is RateLimitProviderTimeoutError => (
    error instanceof RateLimitProviderTimeoutError
    || (
        typeof error === 'object'
        && error !== null
        && (error as { code?: unknown }).code === RATE_LIMIT_PROVIDER_TIMEOUT_CODE
    )
);

const normalizeRateLimitLogError = (error: unknown, message: string): Error => {
    const normalized = new Error(message);
    const errorName = getBoundedErrorName(error);
    if (errorName) {
        normalized.name = errorName;
    }
    return normalized;
};

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

interface RateLimitConfig {
    key: string;           // Unique identifier (userId, IP, etc.)
    limit: number;         // Max requests allowed
    window: number;        // Time window in seconds
    failClosedOnProviderError?: boolean; // Block instead of bypassing when Upstash is unavailable
}

interface RateLimitResult {
    allowed: boolean;      // Whether request is allowed
    remaining: number;     // Remaining requests in window
    resetAt: number;       // Timestamp when limit resets
    current: number;       // Current request count
    reason?: 'limit_exceeded' | 'provider_unavailable';
}

const buildRateLimitProviderUnavailableResult = (
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
 * Algorithm: Sliding Window using sorted sets
 * - Each request is a member in a sorted set
 * - Score is the timestamp
 * - Old requests (outside window) are removed
 * - Count remaining requests to check limit
 * 
 * Time complexity: O(log N) where N = requests in window
 * 
 * @example
 * ```typescript
 * const userRateLimitHash = hashPublicRateLimitValue(userId);
 * const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
 * const result = await checkRateLimit({
 *     key: `chat:${userRateLimitHash}:${tenantRateLimitHash}`,
 *     limit: 30,
 *     window: 60
 * });
 * 
 * if (!result.allowed) {
 *     return res.status(429).json({ error: 'Too many requests' });
 * }
 * ```
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const { key, limit, window, failClosedOnProviderError = false } = config;
    const now = Date.now();
    
    // 🎛️ Feature Flag: Skip rate limiting in development
    if (!FEATURE_FLAGS.ENABLE_RATE_LIMITING) {
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }
    
    // Safety check: Upstash should be initialized if rate limiting is enabled
    if (!upstash) {
        secureError(
            '[Rate Limit] Upstash not initialized but rate limiting is enabled',
            new Error('Rate limit provider missing'),
        );
        if (failClosedOnProviderError) {
            return buildRateLimitProviderUnavailableResult(limit, now);
        }
        return {
            allowed: true,
            remaining: limit,
            resetAt: rateLimitProviderBypassUntil,
            current: 0
        };
    }

    if (rateLimitProviderBypassUntil > now) {
        if (failClosedOnProviderError) {
            return buildRateLimitProviderUnavailableResult(limit, now, rateLimitProviderBypassUntil);
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
        const atomicResult = await withRateLimitTimeout(upstash.eval<
            [string, string, string, string, string],
            [number, number, number]
        >(
            ATOMIC_SLIDING_WINDOW_SCRIPT,
            [key],
            [
                String(windowStart),
                String(now),
                String(limit),
                `${now}:${createRandomIdSegment(24)}`,
                String(window * 2),
            ],
        ));
        if (
            !Array.isArray(atomicResult)
            || atomicResult.length !== 3
            || !atomicResult.every(value => Number.isSafeInteger(value) && value >= 0)
            || (atomicResult[0] !== 0 && atomicResult[0] !== 1)
        ) {
            throw new Error('Rate limit provider returned an invalid atomic result');
        }
        const [allowedFlag, currentCount, oldestTimestamp] = atomicResult;

        // Check if limit exceeded
        if (allowedFlag === 0) {
            const resetAt = oldestTimestamp + (window * 1000);

            return {
                allowed: false,
                remaining: 0,
                resetAt,
                current: currentCount,
                reason: 'limit_exceeded',
            };
        }

        // Request allowed
        const resetAt = now + (window * 1000);
        return {
            allowed: true,
            remaining: Math.max(limit - currentCount, 0),
            resetAt,
            current: currentCount,
        };

    } catch (error) {
        rateLimitProviderBypassUntil = Date.now() + RATE_LIMIT_PROVIDER_BYPASS_MS;
        if (isRateLimitProviderTimeoutError(error)) {
            secureError(
                '[Rate Limit] Upstash provider timed out; temporarily allowing requests with local bypass',
                normalizeRateLimitLogError(error, 'Rate limit provider timeout'),
                { bypassMs: RATE_LIMIT_PROVIDER_BYPASS_MS },
            );
        } else {
            secureError(
                '[Rate Limit] Upstash provider error; temporarily allowing requests with local bypass',
                normalizeRateLimitLogError(error, 'Rate limit provider error'),
                { bypassMs: RATE_LIMIT_PROVIDER_BYPASS_MS },
            );
        }

        if (failClosedOnProviderError) {
            return buildRateLimitProviderUnavailableResult(limit, now, rateLimitProviderBypassUntil);
        }
        
        // FALLBACK: Allow request on Upstash error
        // This prevents rate limiting from breaking your entire app
        // Trade-off: Slightly less strict during Upstash outages
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }
}

/**
 * Reset rate limit for a specific key (admin/testing use)
 */
export async function resetRateLimit(key: string): Promise<void> {
    try {
        if (!upstash) {
            secureError(
                '[Rate Limit] Reset skipped because provider is not initialized',
                new Error('Rate limit provider missing'),
            );
            return;
        }
        await upstash.del(key);
    } catch (error) {
        secureError(
            '[Rate Limit] Failed to reset',
            normalizeRateLimitLogError(error, 'Rate limit reset failed'),
        );
    }
}

/**
 * Get rate limit statistics for monitoring
 * Useful for admin dashboard or debugging
 */
export async function getRateLimitStats(key: string): Promise<{
    current: number;
    oldestRequest: number | null;
    newestRequest: number | null;
}> {
    try {
        if (!upstash) {
            secureError(
                '[Rate Limit] Stats unavailable because provider is not initialized',
                new Error('Rate limit provider missing'),
            );
            return {
                current: 0,
                oldestRequest: null,
                newestRequest: null
            };
        }

        // Get all requests in the sorted set
        const requests = await upstash.zrange(key, 0, -1, { withScores: true }) as Array<{ score: number; member: string }>;

        if (requests.length === 0) {
            return {
                current: 0,
                oldestRequest: null,
                newestRequest: null
            };
        }

        return {
            current: requests.length,
            oldestRequest: requests[0].score,
            newestRequest: requests[requests.length - 1].score
        };
    } catch (error) {
        secureError(
            '[Rate Limit] Failed to get stats',
            normalizeRateLimitLogError(error, 'Rate limit stats failed'),
        );
        return {
            current: 0,
            oldestRequest: null,
            newestRequest: null
        };
    }
}

/**
 * Check Upstash connection health
 * Use this in a health check endpoint
 */
export async function checkUpstashHealth(): Promise<boolean> {
    try {
        if (!upstash) {
            secureError(
                '[Rate Limit] Health check failed because provider is not initialized',
                new Error('Rate limit provider missing'),
            );
            return false;
        }
        await upstash.ping();
        return true;
    } catch (error) {
        secureError(
            '[Rate Limit] Upstash health check failed',
            normalizeRateLimitLogError(error, 'Rate limit health check failed'),
        );
        return false;
    }
}
