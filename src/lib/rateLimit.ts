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
 * - Set ENABLE_RATE_LIMITING = false in features.ts
 * - All requests allowed (no Upstash needed)
 * - Faster testing workflow
 */

import { Redis } from '@upstash/redis';
import { FEATURE_FLAGS } from '@config/features';

// Initialize Upstash client (only if rate limiting is enabled)
const upstash = FEATURE_FLAGS.ENABLE_RATE_LIMITING
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

const RATE_LIMIT_PROVIDER_TIMEOUT_MS = 1500;
const RATE_LIMIT_PROVIDER_BYPASS_MS = 60_000;
let rateLimitProviderBypassUntil = 0;

const withRateLimitTimeout = async <T>(promise: Promise<T>): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(
                    () => reject(new Error('Rate limit provider timeout')),
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
 * const result = await checkRateLimit({
 *     key: `chat:${userId}:${tenantId}`,
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
    const { key, limit, window } = config;
    const now = Date.now();
    
    // 🎛️ Feature Flag: Skip rate limiting in development
    if (!FEATURE_FLAGS.ENABLE_RATE_LIMITING) {
        console.log('[Rate Limit] Disabled via feature flag - allowing request');
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }
    
    // Safety check: Upstash should be initialized if rate limiting is enabled
    if (!upstash) {
        console.error('[Rate Limit] Upstash not initialized but rate limiting is enabled!');
        return {
            allowed: true,
            remaining: limit,
            resetAt: now + (window * 1000),
            current: 0
        };
    }

    if (rateLimitProviderBypassUntil > now) {
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
        const pipeline = upstash.pipeline();

        // 1. Remove old entries (outside current window)
        pipeline.zremrangebyscore(key, 0, windowStart);

        // 2. Count current requests in window
        pipeline.zcard(key);

        // 3. Add current request
        pipeline.zadd(key, { score: now, member: now });

        // 4. Set expiration (cleanup old keys automatically)
        pipeline.expire(key, window * 2); // 2x window for safety

        // Execute all commands atomically
        const results = await withRateLimitTimeout(pipeline.exec());

        // results[1] is the count BEFORE adding current request
        const currentCount = (results[1] as number) || 0;

        // Check if limit exceeded
        if (currentCount >= limit) {
            // Get oldest request to calculate reset time
            const oldest = await withRateLimitTimeout(upstash.zrange(key, 0, 0, { withScores: true }));
            
            // Parse the oldest timestamp from Upstash response
            // Upstash returns: [member1, score1, member2, score2, ...]
            let oldestTimestamp = now;
            if (Array.isArray(oldest) && oldest.length >= 2) {
                // Format is [member, score]
                oldestTimestamp = Number(oldest[1]) || now;
            } else if (oldest && typeof oldest === 'object' && 'score' in oldest) {
                // Alternative format: { score: number, member: string }
                oldestTimestamp = Number((oldest as any).score) || now;
            }
            
            const resetAt = oldestTimestamp + (window * 1000);

            return {
                allowed: false,
                remaining: 0,
                resetAt,
                current: currentCount
            };
        }

        // Request allowed
        const resetAt = now + (window * 1000);
        return {
            allowed: true,
            remaining: limit - currentCount - 1, // -1 for current request
            resetAt,
            current: currentCount + 1
        };

    } catch (error) {
        rateLimitProviderBypassUntil = Date.now() + RATE_LIMIT_PROVIDER_BYPASS_MS;
        console.error('[Rate Limit] Upstash error:', error);
        
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
        await upstash.del(key);
        console.log(`[Rate Limit] Reset limit for key: ${key}`);
    } catch (error) {
        console.error('[Rate Limit] Failed to reset:', error);
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
        console.error('[Rate Limit] Failed to get stats:', error);
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
        await upstash.ping();
        return true;
    } catch (error) {
        console.error('[Rate Limit] Upstash health check failed:', error);
        return false;
    }
}
