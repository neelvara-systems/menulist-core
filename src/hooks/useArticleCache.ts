import { fetchCanonicaPublicArticle } from '@lib/canonica/publicContentClient';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext } from 'react';

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

    /**
     * Add article to cache with LRU eviction
     * If cache is full, removes oldest article
     */
    const addArticleToCache = useCallback((article: KnowledgeBaseArticleType) => {
        setCachedArticles(prev => {
            const newArticles = [...prev.articles];

            // Remove if already exists (to re-add at end)
            const existingIndex = newArticles.findIndex(a => a.id === article.id);
            if (existingIndex > -1) {
                newArticles.splice(existingIndex, 1);
            }

            // Add to end (most recent)
            newArticles.push(article);

            // Keep only last MAX_CACHED_ARTICLES
            if (newArticles.length > MAX_CACHED_ARTICLES) {
                const evicted = newArticles.shift(); // Remove oldest (first item)
                console.log('🗑️ Evicted oldest article from cache:', evicted?.id);
            }

            return {
                cachedOn: Timestamp.now(),
                articles: newArticles
            };
        });
    }, [setCachedArticles]);

    /**
     * Move article to end of cache (mark as recently used)
     * Used for LRU - keeps frequently accessed articles in cache longer
     */
    const moveArticleToEnd = useCallback((articleId: string) => {
        setCachedArticles(prev => {
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
                articles: newArticles
            };
        });
    }, [setCachedArticles]);

    /**
     * Get article from cache by ID
     * Returns undefined if not found
     */
    const getCachedArticle = useCallback((articleId: string): KnowledgeBaseArticleType | undefined => {
        return cachedArticles.articles.find(a => a.id === articleId);
    }, [cachedArticles.articles]);

    /**
     * Check if article exists in cache
     */
    const isArticleCached = useCallback((articleId: string): boolean => {
        return cachedArticles.articles.some(a => a.id === articleId);
    }, [cachedArticles.articles]);

    /**
     * Clear entire article cache
     * Useful for manual refresh or logout
     */
    const clearCache = useCallback(() => {
        setCachedArticles({ cachedOn: null, articles: [] });
        console.log('🗑️ Article cache cleared');
    }, [setCachedArticles]);

    /**
     * Get cache statistics
     */
    const getCacheStats = useCallback(() => {
        const size = cachedArticles.articles.length;
        const memoryEstimate = JSON.stringify(cachedArticles).length;

        return {
            size,
            maxSize: MAX_CACHED_ARTICLES,
            memoryBytes: memoryEstimate,
            memoryKB: Math.round(memoryEstimate / 1024),
            articles: cachedArticles.articles.map(a => ({
                id: a.id,
                title: a.title
            }))
        };
    }, [cachedArticles]);

    /**
     * Check if article is active (not archived/deleted)
     * This is the filter for what should be cached
     */
    const isArticleActive = useCallback((article: KnowledgeBaseArticleType): boolean => {
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
    ): Promise<KnowledgeBaseArticleType | null> => {
        // ============================================
        // STEP 1: Force Refresh (Skip Cache)
        // ============================================
        if (options?.forceRefresh) {
            console.log('🔄 Force refresh article, skipping cache:', articleId);
            options.onCacheMiss?.();

            try {
                const article = await fetchCanonicaPublicArticle(articleId);

                // Filter: Only cache active articles
                if (article && isArticleActive(article)) {
                    addArticleToCache(article);
                    return article;
                }

                return null; // Not found or inactive
            } catch (error) {
                console.error('❌ Failed to fetch article:', error);
                return null;
            }
        }

        // ============================================
        // STEP 2: Check Cache
        // ============================================
        const cached = cachedArticles.articles.find(a => a.id === articleId);

        if (cached) {
            // ✅ Cache hit - instant return
            console.log('📦 Article cache hit:', articleId, `(${cachedArticles.articles.length}/${MAX_CACHED_ARTICLES} cached)`);
            options?.onCacheHit?.();

            // Move to end (mark as recently used for LRU)
            moveArticleToEnd(articleId);

            return cached;
        }

        // ============================================
        // STEP 3: Cache Miss - Fetch from Database
        // ============================================
        console.log('🌐 Article cache miss, fetching:', articleId);
        options?.onCacheMiss?.();

        try {
            const article = await fetchCanonicaPublicArticle(articleId);

            // Filter: Only cache and return active articles
            if (article && isArticleActive(article)) {
                addArticleToCache(article);
                console.log('✅ Article fetched and cached:', articleId);
                return article;
            }

            // Article not found or inactive
            console.log('⚠️ Article not found or inactive:', articleId);
            return null;
        } catch (error) {
            console.error('❌ Failed to fetch article:', error);
            return null;
        }
    }, [cachedArticles.articles, addArticleToCache, moveArticleToEnd, isArticleActive]);

    return {
        // Primary method - use this!
        getArticle,

        // Low-level cache operations (if needed)
        addArticleToCache,
        moveArticleToEnd,
        getCachedArticle,
        isArticleCached,
        clearCache,

        // Cache state
        cachedArticles: cachedArticles.articles,
        cacheStats: getCacheStats(),
    };
};
