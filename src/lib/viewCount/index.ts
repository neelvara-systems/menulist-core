/**
 * View count utilities
 * Gets view counts from localStorage tracking data (client-side)
 * 
 * Note: For production accuracy, consider moving to server-side analytics
 */

import { getRecentlyViewedEntries, RecentlyViewedType } from '@lib/recentlyViewed';

/**
 * Gets view count for a specific item from current user's history
 * 
 * Note: This only counts views from the current user.
 * For global view counts, you'd need server-side analytics.
 */
export const getUserViewCount = (userId: string, itemId: string, type: RecentlyViewedType): number => {
    const entries = getRecentlyViewedEntries(userId);
    const count = entries.filter(entry => entry.id === itemId && entry.type === type).length;
    return count;
};

/**
 * Formats view count for display
 */
export const formatViewCount = (count: number): string => {
    if (count === 0) return '0 views';
    if (count === 1) return '1 view';
    if (count < 1000) return `${count} views`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k views`;
    return `${(count / 1000000).toFixed(1)}M views`;
};

/**
 * Formats view count in short form (for compact displays)
 */
export const formatViewCountShort = (count: number): string => {
    if (count === 0) return '0';
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}M`;
};
