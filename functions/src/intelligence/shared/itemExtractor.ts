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

    // First, seed with analytics data
    for (const [itemId, views] of Object.entries(analytics.viewsByItem)) {
        itemStatsMap.set(itemId, {
            itemId,
            itemName: analytics.itemNames[itemId] || itemId,
            category: '',
            views,
            clicks: analytics.clicksByItem[itemId] || 0,
            orders: 0,
            price: 0,
            decisionBlockClicks: analytics.recommendationClicksByItem[itemId] || 0,
            hourlyClicks: analytics.hourlyClicksByItem[itemId]
        });
    }

    // Add items with clicks but no views
    for (const [itemId, clicks] of Object.entries(analytics.clicksByItem)) {
        if (!itemStatsMap.has(itemId)) {
            itemStatsMap.set(itemId, {
                itemId,
                itemName: analytics.itemNames[itemId] || itemId,
                category: '',
                views: 0,
                clicks,
                orders: 0,
                price: 0,
                decisionBlockClicks: analytics.recommendationClicksByItem[itemId] || 0,
                hourlyClicks: analytics.hourlyClicksByItem[itemId]
            });
        }
    }

    // Extract items from project files and merge metadata
    const files = projectData.files || [];
    for (const file of files) {
        const items = file.extractedData?.data?.items || [];
        for (const item of items) {
            // Only skip permanently disabled items (active=false)
            // DO NOT check 'available' - that's temporary state for runtime
            if (item.active === false) continue;

            const existing: ExtractedItem = itemStatsMap.get(item.id) || {
                itemId: item.id,
                itemName: '',
                category: item.category || '',
                views: 0,
                clicks: 0,
                orders: 0,
                price: 0,
                duration: undefined,
                ownerBoost: undefined,
                isBestSeller: undefined,
                decisionBlockClicks: analytics.recommendationClicksByItem[item.id] || 0,
                hourlyClicks: analytics.hourlyClicksByItem[item.id]
            };

            // Get item name (first language)
            const nameObj = item.name || {};
            existing.itemName = Object.values(nameObj)[0] as string || item.id;
            existing.category = item.category || '';
            existing.price = parseFloat(item.price?.replace(/[^0-9.]/g, '') || '0');
            existing.duration = item.duration;
            existing.ownerBoost = item.ownerBoost;
            existing.isBestSeller = item.isBestSeller;

            // Add base view count for active items with no analytics
            if (!itemStatsMap.has(item.id)) {
                existing.views = 1; // Minimum view count
            }

            itemStatsMap.set(item.id, existing);
        }
    }

    // Filter to items with names (valid items)
    return Array.from(itemStatsMap.values()).filter(i => i.itemName);
}
