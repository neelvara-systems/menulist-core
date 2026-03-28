import { useEffect } from 'react';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { addRecentlyViewedEntry } from '@lib/recentlyViewed';

type ContentType = 'article' | 'changelog' | 'faq' | 'workflow';

interface BaseViewTrackingData {
    id: string;
    type: ContentType;
    title: string;
    href?: string;
    meta?: Record<string, any>;
}

/**
 * Generic hook for tracking content views across all content types
 * Supports articles, changelogs, FAQs, workflows, and future content types
 * 
 * @param data - Content data to track (null to skip tracking)
 * 
 * @example
 * ```tsx
 * // Article tracking
 * useContentViewTracking(article ? {
 *     id: article.id,
 *     type: 'article',
 *     title: article.title,
 *     meta: {
 *         categoryTitle: article.categoryTitle,
 *         sectionTitle: article.sectionTitle,
 *     }
 * } : null);
 * 
 * // Changelog tracking
 * useContentViewTracking(changelog ? {
 *     id: changelog.id,
 *     type: 'changelog',
 *     title: changelog.title,
 *     href: `/changelog/${changelog.id}`,
 *     meta: {
 *         version: changelog.version,
 *         tags: changelog.tags,
 *     }
 * } : null);
 * ```
 */
export const useContentViewTracking = (data: BaseViewTrackingData | null) => {
    const { user } = useClientAuthSession() || {};

    useEffect(() => {
        // Don't track if no user or data
        if (!user?.id || !data) return;
        
        // Don't track on server-side
        if (typeof window === 'undefined') return;

        try {
            addRecentlyViewedEntry(user.id, {
                id: data.id,
                type: data.type,
                title: data.title,
                href: data.href || window.location.pathname,
                viewedAt: new Date().toISOString(),
                meta: data.meta || {},
            });
        } catch (error) {
            // Fail silently - don't break the UI if tracking fails
            console.warn(`Unable to persist recently viewed ${data.type}`, error);
        }
    }, [data?.id, user?.id, data?.type, data?.href, data?.meta]);
};
