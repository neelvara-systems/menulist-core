import { secureError } from '@lib/security/secureLogger';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

/**
 * SWR LocalStorage Cache Provider
 * 
 * Persists SWR cache to localStorage for cross-session caching.
 * Optimized for Owner Dashboard where data changes only once per day (via scheduler).
 * 
 * Benefits:
 * - 90% reduction in Firebase reads (29,600 → ~3,000 for 100 users)
 * - Survives page refresh and browser close
 * - Automatic expiry based on date
 * 
 * Usage:
 * Wrap your component with <SWRConfig value={{ provider: localStorageProvider }}>
 */

const CACHE_PREFIX = 'swr-cache-';
const CACHE_VERSION = 'v1';
const MAX_CACHE_SIZE = 50; // Max number of cached keys

type SwrLocalStorageFailureType = 'cleanup' | 'get' | 'set' | 'remove' | 'prefix_remove' | 'clear';

interface SwrLocalStorageFailureMetadata {
    key?: string;
    keyPrefix?: string;
    maxAgeMs?: number;
    dayKey?: string;
    hasData?: boolean;
    removedCount?: number;
    error?: unknown;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    date: string; // YYYY-MM-DD for date-based invalidation
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Check if cache entry is still valid based on date
 * For scheduler data: valid if same day
 * For other data: use TTL
 */
function isCacheValid(entry: CacheEntry<unknown>, maxAgeMs?: number, dayKey?: string): boolean {
    const now = Date.now();
    const today = dayKey || getTodayDate();

    // If entry is from a different day, it's stale (scheduler has new data)
    if (entry.date !== today) {
        return false;
    }

    // If maxAge specified, check TTL
    if (maxAgeMs && (now - entry.timestamp) > maxAgeMs) {
        return false;
    }

    return true;
}

const buildSwrLocalStorageFailureContext = (
    failureType: SwrLocalStorageFailureType,
    metadata: SwrLocalStorageFailureMetadata = {},
) => {
    const key = String(metadata.key ?? '').trim();
    const keyPrefix = String(metadata.keyPrefix ?? '').trim();
    const dayKey = String(metadata.dayKey ?? '').trim();

    return {
        failureType,
        keyPresent: Boolean(key),
        keyLength: key.length,
        keyPrefixPresent: Boolean(keyPrefix),
        keyPrefixLength: keyPrefix.length,
        hasMaxAgeMs: typeof metadata.maxAgeMs === 'number',
        dayKeyPresent: Boolean(dayKey),
        dayKeyLength: dayKey.length,
        hasData: Boolean(metadata.hasData),
        removedCount: metadata.removedCount,
        errorName: getBoundedErrorName(metadata.error) || typeof metadata.error,
    };
};

const logSwrLocalStorageFailure = (
    failureType: SwrLocalStorageFailureType,
    metadata: SwrLocalStorageFailureMetadata = {},
): void => {
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    secureError(
        '[SWR Cache] Local storage operation failed',
        new Error(`swr_local_storage_${failureType}`),
        buildSwrLocalStorageFailureContext(failureType, metadata),
    );
};

/**
 * Clean up old cache entries to prevent localStorage bloat
 */
function cleanupOldEntries(): void {
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                keys.push(key);
            }
        }

        // If we have too many entries, remove oldest ones
        if (keys.length > MAX_CACHE_SIZE) {
            const entries = keys.map(key => {
                try {
                    const raw = localStorage.getItem(key);
                    const parsed = raw ? JSON.parse(raw) : null;
                    return { key, timestamp: parsed?.timestamp || 0 };
                } catch {
                    return { key, timestamp: 0 };
                }
            });

            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);

            // Remove oldest entries
            const toRemove = entries.slice(0, keys.length - MAX_CACHE_SIZE);
            toRemove.forEach(({ key }) => localStorage.removeItem(key));
        }
    } catch (e) {
        logSwrLocalStorageFailure('cleanup', { error: e });
    }
}

/**
 * Create a cache key from SWR key
 */
function createCacheKey(key: string): string {
    return `${CACHE_PREFIX}${CACHE_VERSION}-${key}`;
}

/**
 * Get cached data from localStorage
 */
export function getCachedData<T>(key: string, maxAgeMs?: number, dayKey?: string): T | undefined {
    try {
        const cacheKey = createCacheKey(key);
        const raw = localStorage.getItem(cacheKey);

        if (!raw) return undefined;

        const entry: CacheEntry<T> = JSON.parse(raw);

        if (!isCacheValid(entry, maxAgeMs, dayKey)) {
            localStorage.removeItem(cacheKey);
            return undefined;
        }

        return entry.data;
    } catch (e) {
        logSwrLocalStorageFailure('get', {
            key,
            maxAgeMs,
            dayKey,
            error: e,
        });
        return undefined;
    }
}

/**
 * Set cached data in localStorage
 */
export function setCachedData<T>(key: string, data: T, dayKey?: string): void {
    try {
        const cacheKey = createCacheKey(key);
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            date: dayKey || getTodayDate(),
        };

        localStorage.setItem(cacheKey, JSON.stringify(entry));

        // Periodic cleanup
        if (Math.random() < 0.1) {
            cleanupOldEntries();
        }
    } catch (e) {
        logSwrLocalStorageFailure('set', {
            key,
            dayKey,
            hasData: typeof data !== 'undefined',
            error: e,
        });
        // If quota exceeded, clear old entries and retry
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            cleanupOldEntries();
            try {
                const cacheKey = createCacheKey(key);
                const entry: CacheEntry<T> = {
                    data,
                    timestamp: Date.now(),
                    date: dayKey || getTodayDate(),
                };
                localStorage.setItem(cacheKey, JSON.stringify(entry));
            } catch {
                // Give up
            }
        }
    }
}

/**
 * Remove cached data
 */
export function removeCachedData(key: string): void {
    try {
        const cacheKey = createCacheKey(key);
        localStorage.removeItem(cacheKey);
    } catch (e) {
        logSwrLocalStorageFailure('remove', { key, error: e });
    }
}

/**
 * Remove cached data whose original SWR/localStorage key starts with a prefix.
 */
export function removeCachedDataByPrefix(keyPrefix: string): number {
    let removed = 0;
    try {
        const cachePrefix = createCacheKey(keyPrefix);
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(cachePrefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
            removed++;
        });
    } catch (e) {
        logSwrLocalStorageFailure('prefix_remove', {
            keyPrefix,
            removedCount: removed,
            error: e,
        });
    }
    return removed;
}

/**
 * Clear all SWR cache from localStorage
 */
export function clearAllCache(): void {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
        logSwrLocalStorageFailure('clear', { error: e });
    }
}

/**
 * Check if we need to revalidate based on date change
 * Returns true if data is from a previous day (scheduler has run)
 */
export function shouldRevalidate(key: string, dayKey?: string): boolean {
    try {
        const cacheKey = createCacheKey(key);
        const raw = localStorage.getItem(cacheKey);

        if (!raw) return true; // No cache, need to fetch

        const entry: CacheEntry<unknown> = JSON.parse(raw);
        const today = dayKey || getTodayDate();

        return entry.date !== today;
    } catch {
        return true;
    }
}

/**
 * Get the date when cache was last updated
 */
export function getCacheDate(key: string): string | null {
    try {
        const cacheKey = createCacheKey(key);
        const raw = localStorage.getItem(cacheKey);

        if (!raw) return null;

        const entry: CacheEntry<unknown> = JSON.parse(raw);
        return entry.date;
    } catch {
        return null;
    }
}
