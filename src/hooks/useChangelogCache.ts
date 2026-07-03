import { fetchLatestChangelogPage } from '@database/changelog';
import { logHookFailure } from '@hook/hookDiagnostics';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ChangelogPage } from '@type/changelog';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext } from 'react';

let changelogFetchInFlight: Promise<ChangelogPage | null> | null = null;

const fetchLatestChangelogPageOnce = () => {
    if (!changelogFetchInFlight) {
        changelogFetchInFlight = fetchLatestChangelogPage().finally(() => {
            changelogFetchInFlight = null;
        });
    }

    return changelogFetchInFlight;
};

/**
 * Changelog caching hook
 * Uses session-level cache from PlatformGlobalDataContext
 * 
 * Note: Unlike articles/tickets, changelog is a single object, not an array
 * 
 * Pattern: Check cache → Fetch if needed → Update cache
 * 
 * TEMPLATE: Use generic method names (getItem)
 * When creating new cache, just change the type imports!
 * 
 * @example
 * ```typescript
 * const { getItem } = useChangelogCache();
 * const changelog = await getItem();
 * ```
 */
export const useChangelogCache = () => {
    const { cachedChangelog, setCachedChangelog } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    /**
     * Clear cache
     * Useful for manual refresh or logout
     */
    const clearCache = useCallback(() => {
        setCachedChangelog({ cachedOn: null, changelog: null });
    }, [setCachedChangelog]);

    /**
     * Get cache statistics
     */
    const getCacheStats = useCallback(() => {
        const memoryEstimate = JSON.stringify(cachedChangelog).length;
        
        return {
            isCached: !!cachedChangelog.changelog,
            cachedOn: cachedChangelog.cachedOn,
            memoryBytes: memoryEstimate,
            memoryKB: Math.round(memoryEstimate / 1024),
            entriesCount: cachedChangelog.changelog?.entries?.length || 0
        };
    }, [cachedChangelog]);

    /**
     * Get item - checks cache first, fetches if not found
     * This is the main method you should use!
     * 
     * Pattern:
     * 1. Force refresh? → Fetch fresh → Cache → Return
     * 2. In cache? → Return instantly
     * 3. Not in cache? → Fetch → Cache → Return
     * 
     * @param options - Optional configuration
     * @returns Item or null if not found
     * 
     * @example
     * ```typescript
     * // Simple usage
     * const changelog = await getItem();
     * 
     * // With loading states
     * const changelog = await getItem({
     *     onCacheHit: () => setLoading(false),
     *     onCacheMiss: () => setLoading(true)
     * });
     * 
     * // Force refresh
     * const changelog = await getItem({ forceRefresh: true });
     * ```
     */
    const getItem = useCallback(async (
        options?: {
            forceRefresh?: boolean;  // Skip cache and fetch fresh
            onCacheHit?: () => void;  // Callback when cache is used
            onCacheMiss?: () => void; // Callback when fetching
        }
    ): Promise<ChangelogPage | null> => {
        // ============================================
        // STEP 1: Force Refresh (Skip Cache)
        // ============================================
        if (options?.forceRefresh) {
            options.onCacheMiss?.();
            
            try {
                const changelog = await fetchLatestChangelogPage();
                
                if (changelog) {
                    setCachedChangelog({
                        cachedOn: Timestamp.now(),
                        changelog
                    });
                    return changelog;
                }
                
                return null; // Not found
            } catch (error) {
                logHookFailure('answerlattice_changelog_cache_fetch_failed', error, {
                    forceRefresh: true,
                    hadCachedChangelog: Boolean(cachedChangelog.changelog),
                    cachedEntryCount: cachedChangelog.changelog?.entries?.length || 0,
                });
                return null;
            }
        }

        // ============================================
        // STEP 2: Check Cache
        // ============================================
        if (cachedChangelog.changelog) {
            // ✅ Cache hit - instant return
            options?.onCacheHit?.();
            
            return cachedChangelog.changelog;
        }

        // ============================================
        // STEP 3: Cache Miss - Fetch from Database
        // ============================================
        options?.onCacheMiss?.();

        try {
            const changelog = await fetchLatestChangelogPageOnce();
            
            if (changelog) {
                setCachedChangelog({
                    cachedOn: Timestamp.now(),
                    changelog
                });
                return changelog;
            }
            
            // Item not found
            return null;
        } catch (error) {
            logHookFailure('answerlattice_changelog_cache_fetch_failed', error, {
                forceRefresh: false,
                hadCachedChangelog: Boolean(cachedChangelog.changelog),
                cachedEntryCount: cachedChangelog.changelog?.entries?.length || 0,
            });
            return null;
        }
    }, [cachedChangelog, setCachedChangelog]);

    /**
     * Check if item is cached
     */
    const isItemCached = useCallback((): boolean => {
        return !!cachedChangelog.changelog;
    }, [cachedChangelog.changelog]);

    return {
        // Primary method - use this!
        getItem,
        
        // Helper methods
        isItemCached,
        clearCache,
        
        // Cache state
        cachedItem: cachedChangelog.changelog,
        cacheStats: getCacheStats(),
    };
};
