import { fetchLatestChangelogPage } from '@database/changelog';
import {
    useAnswerlatticeCacheScope,
    useAnswerlatticePublicContentRequestScope,
} from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { logHookFailure } from '@hook/hookDiagnostics';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ChangelogPage } from '@type/changelog';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext, useRef } from 'react';

const changelogFetchInFlight = new Map<string, Promise<ChangelogPage | null>>();

const fetchLatestChangelogPageOnce = (
    scopeKey: string,
    requestScope: { tId: number; sId: number },
) => {
    if (!changelogFetchInFlight.has(scopeKey)) {
        const request = fetchLatestChangelogPage(requestScope).finally(() => {
            changelogFetchInFlight.delete(scopeKey);
        });
        changelogFetchInFlight.set(scopeKey, request);
    }

    return changelogFetchInFlight.get(scopeKey)!;
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
    const scopeKey = useAnswerlatticeCacheScope();
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const currentScopeKeyRef = useRef(scopeKey);
    currentScopeKeyRef.current = scopeKey;
    const scopedChangelog = cachedChangelog.scopeKey === scopeKey ? cachedChangelog.changelog : null;

    /**
     * Clear cache
     * Useful for manual refresh or logout
     */
    const clearCache = useCallback(() => {
        setCachedChangelog({ cachedOn: null, changelog: null, scopeKey: null });
    }, [setCachedChangelog]);

    /**
     * Get cache statistics
     */
    const getCacheStats = useCallback(() => {
        const memoryEstimate = JSON.stringify(cachedChangelog).length;
        
        return {
            isCached: Boolean(scopedChangelog),
            cachedOn: cachedChangelog.scopeKey === scopeKey ? cachedChangelog.cachedOn : null,
            memoryBytes: memoryEstimate,
            memoryKB: Math.round(memoryEstimate / 1024),
            entriesCount: scopedChangelog?.entries?.length || 0
        };
    }, [cachedChangelog.cachedOn, cachedChangelog.scopeKey, scopeKey, scopedChangelog]);

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
        if (!scopeKey || !requestScope) return null;
        // ============================================
        // STEP 1: Force Refresh (Skip Cache)
        // ============================================
        if (options?.forceRefresh) {
            options.onCacheMiss?.();
            
            try {
                const changelog = await fetchLatestChangelogPage(requestScope);
                if (currentScopeKeyRef.current !== scopeKey) return null;
                
                if (changelog) {
                    setCachedChangelog({
                        cachedOn: Timestamp.now(),
                        changelog,
                        scopeKey,
                    });
                    return changelog;
                }
                
                return null; // Not found
            } catch (error) {
                logHookFailure('answerlattice_changelog_cache_fetch_failed', error, {
                    forceRefresh: true,
                    hadCachedChangelog: Boolean(scopedChangelog),
                    cachedEntryCount: scopedChangelog?.entries?.length || 0,
                });
                return null;
            }
        }

        // ============================================
        // STEP 2: Check Cache
        // ============================================
        if (scopedChangelog) {
            // ✅ Cache hit - instant return
            options?.onCacheHit?.();
            
            return scopedChangelog;
        }

        // ============================================
        // STEP 3: Cache Miss - Fetch from Database
        // ============================================
        options?.onCacheMiss?.();

        try {
            const changelog = await fetchLatestChangelogPageOnce(scopeKey, requestScope);
            if (currentScopeKeyRef.current !== scopeKey) return null;
            
            if (changelog) {
                setCachedChangelog({
                    cachedOn: Timestamp.now(),
                    changelog,
                    scopeKey,
                });
                return changelog;
            }
            
            // Item not found
            return null;
        } catch (error) {
            logHookFailure('answerlattice_changelog_cache_fetch_failed', error, {
                forceRefresh: false,
                hadCachedChangelog: Boolean(scopedChangelog),
                cachedEntryCount: 0,
            });
            return null;
        }
    }, [requestScope, scopeKey, scopedChangelog, setCachedChangelog]);

    /**
     * Check if item is cached
     */
    const isItemCached = useCallback((): boolean => {
        return Boolean(scopedChangelog);
    }, [scopedChangelog]);

    return {
        // Primary method - use this!
        getItem,
        
        // Helper methods
        isItemCached,
        clearCache,
        
        // Cache state
        cachedItem: scopedChangelog,
        cacheStats: getCacheStats(),
    };
};
