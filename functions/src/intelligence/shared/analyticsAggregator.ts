/**
 * SHARED ANALYTICS AGGREGATOR
 * ═══════════════════════════════════════════════════════════════
 * 
 * Extracted from decisionBlocksScoring.ts for reuse by:
 * - Decision Blocks scoring
 * - Continuous Menu Intelligence
 * 
 * Fetches 7-day rolling analytics data for a project.
 */

import { DB_COLLECTIONS } from '../../constants/database';

export interface AggregatedAnalytics {
    totalViews: number;
    totalClicks: number;
    totalSessions: number;
    clicksByItem: Record<string, number>;
    viewsByItem: Record<string, number>;
    recommendationClicksByItem: Record<string, number>;
    hourlyClicksByItem: Record<string, Record<string, number>>;
    itemNames: Record<string, string>;
    daysWithData: number;
}

/**
 * Fetch 7-day rolling analytics for a project
 * 
 * @param db Firestore instance
 * @param tId Tenant ID
 * @param sId Store ID  
 * @param projectId Project ID
 * @returns Aggregated analytics data
 */
export async function fetch7DayAnalytics(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string
): Promise<AggregatedAnalytics> {
    // Calculate date range (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    // Query daily analytics for this project
    // Document key: {tId}_{sId}_{projectId}_daily_{date}
    const analyticsQuery = await db.collection(DB_COLLECTIONS.ANALYTICS)
        .where('__name__', '>=', `${tId}_${sId}_${projectId}_daily_${dateStr}`)
        .where('__name__', '<=', `${tId}_${sId}_${projectId}_daily_9999`)
        .get();

    // Initialize aggregated data
    const result: AggregatedAnalytics = {
        totalViews: 0,
        totalClicks: 0,
        totalSessions: 0,
        clicksByItem: {},
        viewsByItem: {},
        recommendationClicksByItem: {},
        hourlyClicksByItem: {},
        itemNames: {},
        daysWithData: analyticsQuery.size
    };

    // Aggregate across all daily documents
    for (const doc of analyticsQuery.docs) {
        const data = doc.data();

        // Aggregate totals
        result.totalViews += data.totalViews || 0;
        result.totalClicks += data.totalClicks || 0;
        result.totalSessions += data.totalSessions || 0;

        // Aggregate viewsByItem (per-item impressions)
        if (data.viewsByItem) {
            for (const [itemId, views] of Object.entries(data.viewsByItem)) {
                result.viewsByItem[itemId] = (result.viewsByItem[itemId] || 0) + (views as number);
            }
        }

        // Aggregate clicksByItem
        if (data.clicksByItem) {
            for (const [itemId, clicks] of Object.entries(data.clicksByItem)) {
                result.clicksByItem[itemId] = (result.clicksByItem[itemId] || 0) + (clicks as number);
            }
        }

        // Aggregate recommendationClicksByItem
        if (data.recommendationClicksByItem) {
            for (const [itemId, clicks] of Object.entries(data.recommendationClicksByItem)) {
                result.recommendationClicksByItem[itemId] =
                    (result.recommendationClicksByItem[itemId] || 0) + (clicks as number);
            }
        }

        // Aggregate hourlyClicksByItem (for time eligibility)
        if (data.hourlyClicksByItem) {
            for (const [itemId, hourData] of Object.entries(data.hourlyClicksByItem)) {
                if (!result.hourlyClicksByItem[itemId]) {
                    result.hourlyClicksByItem[itemId] = {};
                }
                for (const [hour, clicks] of Object.entries(hourData as Record<string, number>)) {
                    result.hourlyClicksByItem[itemId][hour] =
                        (result.hourlyClicksByItem[itemId][hour] || 0) + clicks;
                }
            }
        }

        // Collect item names (last seen wins)
        if (data.itemNames) {
            Object.assign(result.itemNames, data.itemNames);
        }
    }

    return result;
}
