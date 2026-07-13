import { useEffect } from 'react';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { addRecentlyViewedEntry, type RecentlyViewedEntry } from '@lib/recentlyViewed';

type BaseViewTrackingData = RecentlyViewedEntry extends infer TEntry
    ? TEntry extends RecentlyViewedEntry
        ? Omit<TEntry, 'href' | 'viewedAt'> & { href?: string }
        : never
    : never;

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
    const session = useClientAuthSession();
    const { user } = session || {};
    const scope = resolveAnswerlatticeSessionScope(session);
    const metaFingerprint = data?.type === 'article'
        ? [data.meta?.categoryTitle || '', data.meta?.sectionTitle || ''].join('\u001e')
        : data?.type === 'changelog'
            ? [
                  data.meta?.version || '',
                  (data.meta?.tags || []).join('\u001f'),
                  data.meta?.pageId || '',
              ].join('\u001e')
            : '';

    useEffect(() => {
        // Don't track if no user or data
        if (!user?.id || !scope || !data) return;
        
        // Don't track on server-side
        if (typeof window === 'undefined') return;

        try {
            const storageScope = { tId: scope.tenantId, sId: scope.storeId };
            const href = data.href || window.location.pathname;
            const viewedAt = new Date().toISOString();
            if (data.type === 'article') {
                addRecentlyViewedEntry(storageScope, user.id, { ...data, type: 'article', href, viewedAt });
            } else if (data.type === 'changelog') {
                addRecentlyViewedEntry(storageScope, user.id, { ...data, type: 'changelog', href, viewedAt });
            } else {
                addRecentlyViewedEntry(storageScope, user.id, { ...data, type: data.type, href, viewedAt });
            }
        } catch (error) {
            // Fail silently - don't break the UI if tracking fails
            logHookFailure('content_view_tracking_persist_failed', error, {
                contentType: data.type,
                hasMeta: Boolean(data.meta && Object.keys(data.meta).length > 0),
                metaKeyCount: data.meta ? Object.keys(data.meta).length : 0,
                ...getBoundedHookStringContext('userId', user.id),
                ...getBoundedHookStringContext('contentId', data.id),
                ...getBoundedHookStringContext('title', data.title),
                ...getBoundedHookStringContext('href', data.href || window.location.pathname),
            });
        }
    }, [data?.href, data?.id, data?.title, data?.type, metaFingerprint, scope?.storeId, scope?.tenantId, user?.id]);
};
