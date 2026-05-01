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
import { addDaysToAnalyticsDateKey, getAnalyticsDateKey } from '../../utils/analyticsDate';

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

function emptyAggregatedAnalytics(): AggregatedAnalytics {
    return {
        totalViews: 0,
        totalClicks: 0,
        totalSessions: 0,
        clicksByItem: {},
        viewsByItem: {},
        recommendationClicksByItem: {},
        hourlyClicksByItem: {},
        itemNames: {},
        daysWithData: 0,
    };
}

function getIntelligenceSnapshotDocId(tId: string, sId: string, projectId: string): string {
    return `${tId}_${sId}_${projectId}_intelligence_7d`;
}

function normalizeSnapshot(data: FirebaseFirestore.DocumentData | undefined): AggregatedAnalytics | null {
    if (!data) return null;
    return {
        totalViews: data.totalViews || 0,
        totalClicks: data.totalClicks || 0,
        totalSessions: data.totalSessions || 0,
        clicksByItem: data.clicksByItem || {},
        viewsByItem: data.viewsByItem || {},
        recommendationClicksByItem: data.recommendationClicksByItem || {},
        hourlyClicksByItem: data.hourlyClicksByItem || {},
        itemNames: data.itemNames || {},
        daysWithData: data.daysWithData || 0,
    };
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
    projectId: string,
    timeZone?: string,
): Promise<AggregatedAnalytics> {
    const todayKey = getAnalyticsDateKey(new Date(), timeZone);
    const lastSettledKey = addDaysToAnalyticsDateKey(todayKey, -1);
    const snapshotDoc = await db.collection(DB_COLLECTIONS.ANALYTICS)
        .doc(getIntelligenceSnapshotDocId(tId, sId, projectId))
        .get();
    if (snapshotDoc.exists) {
        const snapshotData = snapshotDoc.data();
        if (String(snapshotData?.lastSettledLocalDate || '') >= lastSettledKey) {
            return normalizeSnapshot(snapshotData) || emptyAggregatedAnalytics();
        }
    }

    // Cost rule: Decision Blocks and Menu Intelligence consume only the
    // scheduler-written compact input doc. Missing/stale snapshots settle as
    // empty for this run instead of opening a hidden daily-doc range query.
    return emptyAggregatedAnalytics();
}
