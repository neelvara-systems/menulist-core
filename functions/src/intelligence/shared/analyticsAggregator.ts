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
import { addDaysToAnalyticsDateKey, isValidAnalyticsDateKey } from '../../utils/analyticsDate';
import { getBusinessAnalyticsDateKey } from '../../utils/businessDay';
import { isSafeIntelligenceItemId } from './itemExtractor';

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
    source?: 'intelligence_7d' | 'missing_or_stale';
    lastSettledLocalDate?: string;
}

function emptyAggregatedAnalytics(source: AggregatedAnalytics['source'] = 'missing_or_stale'): AggregatedAnalytics {
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
        source,
    };
}

function getIntelligenceSnapshotDocId(tId: string, sId: string, projectId: string): string {
    return `${tId}_${sId}_${projectId}_intelligence_7d`;
}

const MAX_INTELLIGENCE_ITEMS = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
    const allowedKeys = new Set(allowed);
    return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonNegativeSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseCountMap(value: unknown): Record<string, number> | null {
    if (!isRecord(value) || Object.keys(value).length > MAX_INTELLIGENCE_ITEMS) return null;
    const output: Record<string, number> = {};
    for (const [itemId, count] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || !isNonNegativeSafeInteger(count)) return null;
        output[itemId] = count;
    }
    return output;
}

function parseHourlyClicksMap(value: unknown): Record<string, Record<string, number>> | null {
    if (!isRecord(value) || Object.keys(value).length > MAX_INTELLIGENCE_ITEMS) return null;
    const output: Record<string, Record<string, number>> = {};
    for (const [itemId, rawHours] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || !isRecord(rawHours) || Object.keys(rawHours).length > 24) return null;
        const hours: Record<string, number> = {};
        for (const [hour, count] of Object.entries(rawHours)) {
            if (!/^(?:[01]?\d|2[0-3])$/.test(hour) || !isNonNegativeSafeInteger(count)) return null;
            const normalizedHour = String(Number(hour));
            if (Object.prototype.hasOwnProperty.call(hours, normalizedHour)) return null;
            hours[normalizedHour] = count;
        }
        output[itemId] = hours;
    }
    return output;
}

function parseItemNames(value: unknown): Record<string, string> | null {
    if (!isRecord(value) || Object.keys(value).length > MAX_INTELLIGENCE_ITEMS) return null;
    const output: Record<string, string> = {};
    for (const [itemId, name] of Object.entries(value)) {
        if (!isSafeIntelligenceItemId(itemId) || typeof name !== 'string' || name.length > 500) return null;
        output[itemId] = name;
    }
    return output;
}

export function parseAggregatedAnalytics(value: unknown): AggregatedAnalytics | null {
    if (!isRecord(value)
        || !hasOnlyKeys(value, [
            'totalViews', 'totalClicks', 'totalSessions', 'clicksByItem',
            'viewsByItem', 'recommendationClicksByItem', 'hourlyClicksByItem',
            'itemNames', 'daysWithData', 'source', 'lastSettledLocalDate',
        ])
        || !isNonNegativeSafeInteger(value.totalViews)
        || !isNonNegativeSafeInteger(value.totalClicks)
        || !isNonNegativeSafeInteger(value.totalSessions)
        || !isNonNegativeSafeInteger(value.daysWithData)
        || value.daysWithData > 7
        || (value.source !== undefined && (typeof value.source !== 'string'
            || !['intelligence_7d', 'missing_or_stale'].includes(value.source)))
        || (value.lastSettledLocalDate !== undefined && !isValidAnalyticsDateKey(value.lastSettledLocalDate))) return null;
    const clicksByItem = parseCountMap(value.clicksByItem);
    const viewsByItem = parseCountMap(value.viewsByItem);
    const recommendationClicksByItem = parseCountMap(value.recommendationClicksByItem);
    const hourlyClicksByItem = parseHourlyClicksMap(value.hourlyClicksByItem);
    const itemNames = parseItemNames(value.itemNames);
    if (!clicksByItem || !viewsByItem || !recommendationClicksByItem || !hourlyClicksByItem || !itemNames) return null;
    const itemIds = new Set([
        ...Object.keys(clicksByItem),
        ...Object.keys(viewsByItem),
        ...Object.keys(recommendationClicksByItem),
        ...Object.keys(hourlyClicksByItem),
        ...Object.keys(itemNames),
    ]);
    if (itemIds.size > MAX_INTELLIGENCE_ITEMS) return null;
    return {
        totalViews: value.totalViews,
        totalClicks: value.totalClicks,
        totalSessions: value.totalSessions,
        clicksByItem,
        viewsByItem,
        recommendationClicksByItem,
        hourlyClicksByItem,
        itemNames,
        daysWithData: value.daysWithData,
        source: value.source as AggregatedAnalytics['source'],
        lastSettledLocalDate: value.lastSettledLocalDate as string | undefined,
    };
}

export function parseIntelligenceSnapshot(
    data: unknown,
    expected: { tId: string; sId: string; projectId: string; lastSettledLocalDate: string },
): AggregatedAnalytics | null {
    if (!isValidAnalyticsDateKey(expected.lastSettledLocalDate)
        || !isRecord(data)
        || data.tId !== expected.tId
        || data.sId !== expected.sId
        || data.projectId !== expected.projectId
        || data.kind !== 'analyticsIntelligence7d'
        || data.lastSettledLocalDate !== expected.lastSettledLocalDate
        || data.endDate !== expected.lastSettledLocalDate
        || !isValidAnalyticsDateKey(data.startDate)
        || data.startDate !== addDaysToAnalyticsDateKey(expected.lastSettledLocalDate, -6)
        || !isNonNegativeSafeInteger(data.totalViews)
        || !isNonNegativeSafeInteger(data.totalClicks)
        || !isNonNegativeSafeInteger(data.totalSessions)
        || !isNonNegativeSafeInteger(data.daysWithData)
        || data.daysWithData > 7) return null;
    const clicksByItem = parseCountMap(data.clicksByItem);
    const viewsByItem = parseCountMap(data.viewsByItem);
    const recommendationClicksByItem = parseCountMap(data.recommendationClicksByItem);
    const hourlyClicksByItem = parseHourlyClicksMap(data.hourlyClicksByItem);
    const itemNames = parseItemNames(data.itemNames);
    if (!clicksByItem || !viewsByItem || !recommendationClicksByItem || !hourlyClicksByItem || !itemNames) return null;
    const itemIds = new Set([
        ...Object.keys(clicksByItem),
        ...Object.keys(viewsByItem),
        ...Object.keys(recommendationClicksByItem),
        ...Object.keys(hourlyClicksByItem),
        ...Object.keys(itemNames),
    ]);
    if (itemIds.size > MAX_INTELLIGENCE_ITEMS) return null;
    return parseAggregatedAnalytics({
        totalViews: data.totalViews,
        totalClicks: data.totalClicks,
        totalSessions: data.totalSessions,
        clicksByItem,
        viewsByItem,
        recommendationClicksByItem,
        hourlyClicksByItem,
        itemNames,
        daysWithData: data.daysWithData,
        source: 'intelligence_7d',
        lastSettledLocalDate: data.lastSettledLocalDate,
    });
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
    businessDayEndTime?: string,
): Promise<AggregatedAnalytics> {
    const todayKey = getBusinessAnalyticsDateKey(new Date(), timeZone, businessDayEndTime);
    const lastSettledKey = addDaysToAnalyticsDateKey(todayKey, -1);
    const snapshotDoc = await db.collection(DB_COLLECTIONS.ANALYTICS)
        .doc(getIntelligenceSnapshotDocId(tId, sId, projectId))
        .get();
    if (snapshotDoc.exists) {
        const parsed = parseIntelligenceSnapshot(snapshotDoc.data(), {
            tId,
            sId,
            projectId,
            lastSettledLocalDate: lastSettledKey,
        });
        if (parsed) return parsed;
    }

    // Cost rule: Decision Blocks and Menu Intelligence consume only the
    // scheduler-written compact input doc. Missing/stale snapshots settle as
    // empty for this run instead of opening a hidden daily-doc range query.
    return emptyAggregatedAnalytics('missing_or_stale');
}
