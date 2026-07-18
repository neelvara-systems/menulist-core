/**
 * SHARED ITEM EXTRACTOR
 * ═══════════════════════════════════════════════════════════════
 * 
 * Extracted from decisionBlocksScoring.ts for reuse by:
 * - Decision Blocks scoring
 * - Continuous Menu Intelligence
 * 
 * Extracts active items from project files.
 */

import { AggregatedAnalytics } from './analyticsAggregator';

export interface ExtractedItem {
    itemId: string;
    itemName: string;
    category: string;
    views: number;
    clicks: number;
    orders: number;
    price: number;
    duration?: number;
    ownerBoost?: number;
    isBestSeller?: boolean;
    decisionBlockClicks: number;
    hourlyClicks?: Record<string, number>;
}

function normalizeItemId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized || null;
}

function normalizeCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function getItemAnalyticsIds(item: FirebaseFirestore.DocumentData): string[] {
    const currentId = normalizeItemId(item?.id);
    if (!currentId) return [];

    const ids = new Set<string>([currentId]);
    if (Array.isArray(item?.extractionIdAliases)) {
        item.extractionIdAliases.forEach((value: unknown) => {
            const alias = normalizeItemId(value);
            if (alias) ids.add(alias);
        });
    }
    return Array.from(ids);
}

function sumAnalyticsValues(values: Record<string, number>, itemIds: string[]): number {
    return itemIds.reduce((sum, itemId) => sum + normalizeCount(values[itemId]), 0);
}

function mergeHourlyClicks(
    hourlyClicksByItem: Record<string, Record<string, number>>,
    itemIds: string[],
): Record<string, number> | undefined {
    const merged: Record<string, number> = {};
    itemIds.forEach((itemId) => {
        const hourly = hourlyClicksByItem[itemId];
        if (!hourly || typeof hourly !== 'object' || Array.isArray(hourly)) return;
        Object.entries(hourly).forEach(([hour, count]) => {
            const normalized = normalizeCount(count);
            if (normalized > 0) merged[hour] = (merged[hour] || 0) + normalized;
        });
    });
    return Object.keys(merged).length > 0 ? merged : undefined;
}

function getItemName(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    const localizedName = Object.values(value as Record<string, unknown>)
        .find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    return localizedName?.trim() || fallback;
}

function getItemPrice(value: unknown): number {
    const normalized = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value || '').replace(/,/g, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function getItemDuration(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getOwnerBoost(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.max(-20, Math.min(20, value));
}

/**
 * Extract active items from project files and merge with analytics data
 * 
 * IMPORTANT: Only checks permanent state (active), NOT temporary state (available)
 * Availability is volatile - item available at 2 AM may be sold out at lunch
 * Runtime gate owns availability filtering, not the scheduler
 * 
 * @param projectData Project document data containing files
 * @param analytics Aggregated 7-day analytics
 * @returns Array of extracted items with merged analytics
 */
export function extractActiveItems(
    projectData: FirebaseFirestore.DocumentData,
    analytics: AggregatedAnalytics
): ExtractedItem[] {
    const itemStatsMap = new Map<string, ExtractedItem>();

    // The current project catalog is authoritative. Analytics can enrich a
    // current active item, including through retained extraction aliases, but
    // an old/deleted item ID can never create a scoreable item by itself.
    const files = projectData.files || [];
    for (const file of files) {
        const items = file.extractedData?.data?.items || [];
        for (const item of items) {
            // Only skip permanently disabled items (active=false)
            // DO NOT check 'available' - that's temporary state for runtime
            if (item.active === false) continue;

            const analyticsIds = getItemAnalyticsIds(item);
            const itemId = analyticsIds[0];
            if (!itemId) continue;

            const hasAnalytics = analyticsIds.some((analyticsId) => (
                Object.prototype.hasOwnProperty.call(analytics.viewsByItem, analyticsId)
                || Object.prototype.hasOwnProperty.call(analytics.clicksByItem, analyticsId)
                || Object.prototype.hasOwnProperty.call(analytics.recommendationClicksByItem, analyticsId)
                || Object.prototype.hasOwnProperty.call(analytics.hourlyClicksByItem, analyticsId)
            ));

            itemStatsMap.set(itemId, {
                itemId,
                itemName: getItemName(item.name, itemId),
                category: normalizeItemId(item.category) || '',
                views: hasAnalytics ? sumAnalyticsValues(analytics.viewsByItem, analyticsIds) : 1,
                clicks: sumAnalyticsValues(analytics.clicksByItem, analyticsIds),
                orders: 0,
                price: getItemPrice(item.price),
                duration: getItemDuration(item.duration),
                ownerBoost: getOwnerBoost(item.ownerBoost),
                isBestSeller: item.isBestSeller === true,
                decisionBlockClicks: sumAnalyticsValues(analytics.recommendationClicksByItem, analyticsIds),
                hourlyClicks: mergeHourlyClicks(analytics.hourlyClicksByItem, analyticsIds),
            });
        }
    }

    return Array.from(itemStatsMap.values());
}
