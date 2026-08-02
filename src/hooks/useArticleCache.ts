import { fetchAnswerlatticePublicArticle } from '@lib/answerlattice/publicContentClient';
import {
    useAnswerlatticeCacheScope,
    useAnswerlatticePublicContentRequestScope,
} from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext, useRef } from 'react';

// Max articles to keep in cache (LRU)
const MAX_CACHED_ARTICLES = 20;

/**
 * Article caching hook with LRU eviction
 * Uses session-level cache from PlatformGlobalDataContext
 * 
 * Pattern: Check cache → Fetch if needed → Update cache with LRU
 * 
 * @example
 * ```typescript
 * const { getArticle } = useArticleCache();
 * const article = await getArticle(articleId);
 * ```
 */
export const useArticleCache = () => {
    const { cachedArticles, setCachedArticles } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const scopeKey = useAnswerlatticeCacheScope();
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const currentScopeKeyRef = useRef(scopeKey);
    currentScopeKeyRef.current = scopeKey;
    const scopedArticles = cachedArticles.scopeKey === scopeKey ? cachedArticles.articles : [];

    /**
     * Add article to cache with LRU eviction
     * If cache is full, removes oldest article
     */
    const addArticleToCache = useCallback((article: AnswerlatticeReadableArticle) => {
        if (!scopeKey) return;
        setCachedArticles(prev => {
            const newArticles = prev.scopeKey === scopeKey ? [...prev.articles] : [];

            // Remove if already exists (to re-add at end)
            const existingIndex = newArticles.findIndex(a => a.id === article.id);
            if (existingIndex > -1) {
                newArticles.splice(existingIndex, 1);
            }

            // Add to end (most recent)
            newArticles.push(article);

            // Keep only last MAX_CACHED_ARTICLES
            if (newArticles.length > MAX_CACHED_ARTICLES) {
                newArticles.shift(); // Remove oldest (first item)
            }

            return {
                cachedOn: Timestamp.now(),
                articles: newArticles,
                scopeKey,
            };
        });
    }, [scopeKey, setCachedArticles]);

    /**
     * Move article to end of cache (mark as recently used)
     * Used for LRU - keeps frequently accessed articles in cache longer
     */
    const moveArticleToEnd = useCallback((articleId: string) => {
        if (!scopeKey) return;
        setCachedArticles(prev => {
            if (prev.scopeKey !== scopeKey) return prev;
            const newArticles = [...prev.articles];
            const index = newArticles.findIndex(a => a.id === articleId);

            if (index > -1) {
                // Remove from current position
                const [article] = newArticles.splice(index, 1);
                // Add to end (most recent)
                newArticles.push(article);
            }

            return {
                cachedOn: prev.cachedOn,
                articles: newArticles,
                scopeKey,
            };
        });
    }, [scopeKey, setCachedArticles]);

    /**
     * Get article from cache by ID
     * Returns undefined if not found
     */
    const getCachedArticle = useCallback((articleId: string): AnswerlatticeReadableArticle | undefined => {
        return scopedArticles.find(a => a.id === articleId);
    }, [scopedArticles]);

    /**
     * Check if article exists in cache
     */
    const isArticleCached = useCallback((articleId: string): boolean => {
        return scopedArticles.some(a => a.id === articleId);
    }, [scopedArticles]);

    /**
     * Clear entire article cache
     * Useful for manual refresh or logout
     */
    const clearCache = useCallback(() => {
        setCachedArticles({ cachedOn: null, articles: [], scopeKey: null });
    }, [setCachedArticles]);

    /**
     * Get cache statistics
     */
    const getCacheStats = useCallback(() => {
        const size = scopedArticles.length;
        const memoryEstimate = JSON.stringify(scopedArticles).length;

        return {
            size,
            maxSize: MAX_CACHED_ARTICLES,
            memoryBytes: memoryEstimate,
            memoryKB: Math.round(memoryEstimate / 1024),
            articles: scopedArticles.map(a => ({
                id: a.id,
                title: a.title
            }))
        };
    }, [scopedArticles]);

    /**
     * Check if article is active (not archived/deleted)
     * This is the filter for what should be cached
     */
    const isArticleActive = useCallback((article: AnswerlatticeReadableArticle): boolean => {
        return article.active === true;
    }, []);

    /**
     * Get article - checks cache first, fetches if not found
     * This is the main method you should use!
     * 
     * Pattern:
     * 1. Force refresh? → Fetch fresh → Cache → Return
     * 2. In cache? → Move to end (LRU) → Return
     * 3. Not in cache? → Fetch → Filter by active → Cache → Return
     * 
     * @param articleId - ID of article to get
     * @param options - Optional configuration
     * @returns Article or null if not found/inactive
     * 
     * @example
     * ```typescript
     * // Simple usage
     * const article = await getArticle(articleId);
     * 
     * // With loading states
     * const article = await getArticle(articleId, {
     *     onCacheHit: () => setLoading(false),
     *     onCacheMiss: () => setLoading(true)
     * });
     * 
     * // Force refresh
     * const article = await getArticle(articleId, { forceRefresh: true });
     * ```
     */
    const getArticle = useCallback(async (
        articleId: string,
        options?: {
            forceRefresh?: boolean;  // Skip cache and fetch fresh
            onCacheHit?: () => void;  // Callback when cache is used
            onCacheMiss?: () => void; // Callback when fetching
        }
    ): Promise<AnswerlatticeReadableArticle | null> => {
        if (!scopeKey || !requestScope) return null;
        // ============================================
        // STEP 1: Force Refresh (Skip Cache)
        // ============================================
        if (options?.forceRefresh) {
            options.onCacheMiss?.();

            try {
                const article = await fetchAnswerlatticePublicArticle(articleId, requestScope);
                if (currentScopeKeyRef.current !== scopeKey) return null;

                // Filter: Only cache active articles
                if (article && isArticleActive(article)) {
                    addArticleToCache(article);
                    return article;
                }

                return null; // Not found or inactive
            } catch (error) {
                logHookFailure('answerlattice_article_cache_fetch_failed', error, {
                    forceRefresh: true,
                    cachedArticleCount: scopedArticles.length,
                    ...getBoundedHookStringContext('articleId', articleId),
                });
                return null;
            }
        }

        // ============================================
        // STEP 2: Check Cache
        // ============================================
        const cached = scopedArticles.find(a => a.id === articleId);

        if (cached) {
            // ✅ Cache hit - instant return
            options?.onCacheHit?.();

            // Move to end (mark as recently used for LRU)
            moveArticleToEnd(articleId);

            return cached;
        }

        // ============================================
        // STEP 3: Cache Miss - Fetch from Database
        // ============================================
        options?.onCacheMiss?.();

        try {
            const article = await fetchAnswerlatticePublicArticle(articleId, requestScope);
            if (currentScopeKeyRef.current !== scopeKey) return null;

            // Filter: Only cache and return active articles
            if (article && isArticleActive(article)) {
                addArticleToCache(article);
                return article;
            }

            // Article not found or inactive
            return null;
        } catch (error) {
            logHookFailure('answerlattice_article_cache_fetch_failed', error, {
                forceRefresh: false,
                cachedArticleCount: scopedArticles.length,
                ...getBoundedHookStringContext('articleId', articleId),
            });
            return null;
        }
    }, [scopeKey, requestScope, scopedArticles, addArticleToCache, moveArticleToEnd, isArticleActive]);

    return {
        // Primary method - use this!
        getArticle,

        // Expose the exact workspace cache scope so consumers that retain
        // resolved articles in component state can reject prior-scope data.
        cacheScopeKey: scopeKey,

        // Low-level cache operations (if needed)
        addArticleToCache,
        moveArticleToEnd,
        getCachedArticle,
        isArticleCached,
        clearCache,

        // Cache state
        cachedArticles: scopedArticles,
        cacheStats: getCacheStats(),
    };
};
