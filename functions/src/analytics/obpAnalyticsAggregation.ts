/**
 * OBP Analytics Aggregation — Nightly Rollup (Full Parity with Digital Menu)
 *
 * Produces the SAME document structure as digital menu analytics:
 * - Weekly doc:  analytics/{tId}_{sId}_obp_weekly_{YYYY-Www}
 * - Monthly doc: analytics/{tId}_{sId}_obp_monthly_{YYYY-MM}
 * - Summary doc: analytics/{tId}_{sId}_obp_overall_summary
 *   └─ lifetime:  { totalOBPViews, totalOBPActionClicks, actions }
 *   └─ weekly:    { totalOBPViews, totalOBPActionClicks, actions, viewsChange }
 *
 * OBP is treated as a first-class analytics layer — equal weight to digital menu.
 * Owners may focus on OBP before they even publish a menu.
 *
 * @see __docs__/official-business-page/official-business-page_firebase.md
 */

import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {
    DB_COLLECTIONS,
    getAnalyticsDocId,
    getMonthDateRange,
    getWeekDateRange,
} from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    addDaysToAnalyticsDateKey,
    getAnalyticsDateKey,
    getAnalyticsDateRange,
    parseAnalyticsDateKey,
} from '../utils/analyticsDate';

const logger = functions.logger;

const OBP_PROJECT_ID = 'obp';
const OBP_DAILY_CACHE_DAYS = 45;

// ================================================================
// TYPES
// ================================================================

interface OBPDailyData {
    totalOBPViews?: number;
    totalOBPActionClicks?: number;
    totalOBPMenuClicks?: number;
    totalOBPLinkClicks?: number;
    totalOBPShares?: number;
    obpActionClicks?: {
        call?: number;
        whatsapp?: number;
        directions?: number;
        reserve?: number;
        order?: number;
    };
    obpLinkClicks?: {
        google_review?: number;
        instagram?: number;
        facebook?: number;
        website?: number;
    };
    obpShares?: {
        whatsapp?: number;
        copy_link?: number;
        copy_message?: number;
    };
    viewsBySource?: Record<string, number>;
    viewsByDevice?: Record<string, number>;
    hourlyViews?: Record<string, number>;
}

interface OBPAggregatedMetrics {
    totalOBPViews: number;
    totalOBPActionClicks: number;
    totalOBPMenuClicks: number;
    totalOBPLinkClicks: number;
    totalOBPShares: number;
    obpActionClicks: { call: number; whatsapp: number; directions: number; reserve: number; order: number };
    obpLinkClicks: { google_review: number; instagram: number; facebook: number; website: number };
    obpShares: { whatsapp: number; copy_link: number; copy_message: number };
    daysWithData: number;
}

// ================================================================
// HELPERS
// ================================================================

function getDateRange(start: Date, end: Date): string[] {
    return getAnalyticsDateRange(
        getAnalyticsDateKey(start),
        getAnalyticsDateKey(end),
    );
}

function emptyMetrics(): OBPAggregatedMetrics {
    return {
        totalOBPViews: 0,
        totalOBPActionClicks: 0,
        totalOBPMenuClicks: 0,
        totalOBPLinkClicks: 0,
        totalOBPShares: 0,
        obpActionClicks: { call: 0, whatsapp: 0, directions: 0, reserve: 0, order: 0 },
        obpLinkClicks: { google_review: 0, instagram: 0, facebook: 0, website: 0 },
        obpShares: { whatsapp: 0, copy_link: 0, copy_message: 0 },
        daysWithData: 0,
    };
}

function getOBPDashboardSummaryDocId(tId: string, sId: string): string {
    return `${tId}_${sId}_${OBP_PROJECT_ID}_dashboard_summary`;
}

function toDashboardMetrics(metrics: OBPAggregatedMetrics) {
    return {
        views: metrics.totalOBPViews,
        actionClicks: metrics.totalOBPActionClicks,
        menuClicks: metrics.totalOBPMenuClicks,
        linkClicks: metrics.totalOBPLinkClicks,
        shares: metrics.totalOBPShares,
        actions: metrics.obpActionClicks,
        shareMethods: metrics.obpShares,
        links: metrics.obpLinkClicks,
        daysWithData: metrics.daysWithData,
    };
}

function toDashboardDailyMetrics(data: OBPDailyData) {
    return {
        views: data.totalOBPViews || 0,
        actionClicks: data.totalOBPActionClicks || 0,
        menuClicks: data.totalOBPMenuClicks || 0,
        linkClicks: data.totalOBPLinkClicks || 0,
        shares: data.totalOBPShares || 0,
        actions: {
            call: data.obpActionClicks?.call || 0,
            whatsapp: data.obpActionClicks?.whatsapp || 0,
            directions: data.obpActionClicks?.directions || 0,
            reserve: data.obpActionClicks?.reserve || 0,
            order: data.obpActionClicks?.order || 0,
        },
        shareMethods: {
            whatsapp: data.obpShares?.whatsapp || 0,
            copy_link: data.obpShares?.copy_link || 0,
            copy_message: data.obpShares?.copy_message || 0,
        },
        links: {
            google_review: data.obpLinkClicks?.google_review || 0,
            instagram: data.obpLinkClicks?.instagram || 0,
            facebook: data.obpLinkClicks?.facebook || 0,
            website: data.obpLinkClicks?.website || 0,
        },
        daysWithData: 1,
    };
}

function compactOBPAnalyticsDay(date: string, data: OBPDailyData) {
    return {
        date,
        totalOBPViews: data.totalOBPViews || 0,
        totalOBPActionClicks: data.totalOBPActionClicks || 0,
        totalOBPMenuClicks: data.totalOBPMenuClicks || 0,
        totalOBPLinkClicks: data.totalOBPLinkClicks || 0,
        totalOBPShares: data.totalOBPShares || 0,
        obpActionClicks: data.obpActionClicks || {},
        obpLinkClicks: data.obpLinkClicks || {},
        obpShares: data.obpShares || {},
    };
}

function buildOBPDailyMapFromRows(rows: any[], startDate: string, endDate: string): Map<string, OBPDailyData> {
    const result = new Map<string, OBPDailyData>();
    rows.forEach((row) => {
        const date = String(row?.date || '');
        if (!date || date < startDate || date > endDate) return;
        result.set(date, row as OBPDailyData);
    });
    return result;
}

async function buildIncrementalOBPDailyMap(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    existingDashboard: Record<string, any> | null,
    requiredDates: string[],
): Promise<{ dailyDocsByDate: Map<string, OBPDailyData>; yesterdayData: OBPDailyData | null; source: 'incremental' | 'rebuild' }> {
    const requiredSorted = Array.from(new Set(requiredDates.filter(Boolean))).sort();
    const requiredStartDate = requiredSorted[0] || settlementDate;
    const cacheStartDate = addDaysToAnalyticsDateKey(settlementDate, -(OBP_DAILY_CACHE_DAYS - 1));
    const startDate = requiredStartDate < cacheStartDate ? requiredStartDate : cacheStartDate;
    const previousSettledDate = addDaysToAnalyticsDateKey(settlementDate, -1);
    const existingRows = Array.isArray(existingDashboard?.daily30d) ? existingDashboard.daily30d : [];
    const firstExistingDate = existingRows
        .map((row: any) => String(row?.date || ''))
        .filter(Boolean)
        .sort()[0] || '';
    const canIncrement = existingDashboard?.lastSettledLocalDate === previousSettledDate
        && existingRows.length > 0
        && firstExistingDate <= startDate;

    if (canIncrement) {
        const yesterdayRef = db.collection(DB_COLLECTIONS.ANALYTICS)
            .doc(getAnalyticsDocId.daily(tId, sId, OBP_PROJECT_ID, settlementDate));
        const yesterdaySnap = await yesterdayRef.get();
        const yesterdayData = yesterdaySnap.exists ? yesterdaySnap.data() as OBPDailyData : null;
        const dailyDocsByDate = buildOBPDailyMapFromRows(existingRows, startDate, previousSettledDate);

        if (yesterdayData) {
            dailyDocsByDate.set(settlementDate, compactOBPAnalyticsDay(settlementDate, yesterdayData));
        }

        return { dailyDocsByDate, yesterdayData, source: 'incremental' };
    }

    const dailyDocsByDate = await fetchOBPDailyDocsByDate(db, tId, sId, requiredSorted);
    return {
        dailyDocsByDate,
        yesterdayData: dailyDocsByDate.get(settlementDate) || null,
        source: 'rebuild',
    };
}

/**
 * Read OBP daily docs for a date range and aggregate
 */
async function fetchOBPDailyDocsByDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    dates: string[],
): Promise<Map<string, OBPDailyData>> {
    const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
    const result = new Map<string, OBPDailyData>();

    if (uniqueDates.length === 0) {
        return result;
    }

    const prefix = getAnalyticsDocId.dailyPrefix(tId, sId, OBP_PROJECT_ID);
    const startDate = uniqueDates[0];
    const endDate = uniqueDates[uniqueDates.length - 1];
    const allowedDates = new Set(uniqueDates);

    const snapshot = await db.collection(DB_COLLECTIONS.ANALYTICS)
        .where('__name__', '>=', `${prefix}${startDate}`)
        .where('__name__', '<=', `${prefix}${endDate}`)
        .get();

    snapshot.docs.forEach((doc) => {
        const data = doc.data() as OBPDailyData;
        const date = String((data as any).date || (data as any).localDate || doc.id.slice(prefix.length));
        if (allowedDates.has(date)) {
            result.set(date, data);
        }
    });

    return result;
}

function aggregateOBPDailyDocsFromMap(
    docsByDate: Map<string, OBPDailyData>,
    dates: string[],
): OBPAggregatedMetrics {
    const metrics = emptyMetrics();

    for (const date of dates) {
        const data = docsByDate.get(date);
        if (!data) continue;

        metrics.totalOBPViews += data.totalOBPViews || 0;
        metrics.totalOBPActionClicks += data.totalOBPActionClicks || 0;
        metrics.totalOBPMenuClicks += data.totalOBPMenuClicks || 0;
        metrics.totalOBPLinkClicks += data.totalOBPLinkClicks || 0;
        metrics.totalOBPShares += data.totalOBPShares || 0;
        metrics.obpActionClicks.call += data.obpActionClicks?.call || 0;
        metrics.obpActionClicks.whatsapp += data.obpActionClicks?.whatsapp || 0;
        metrics.obpActionClicks.directions += data.obpActionClicks?.directions || 0;
        metrics.obpActionClicks.reserve += data.obpActionClicks?.reserve || 0;
        metrics.obpActionClicks.order += data.obpActionClicks?.order || 0;
        metrics.obpLinkClicks.google_review += data.obpLinkClicks?.google_review || 0;
        metrics.obpLinkClicks.instagram += data.obpLinkClicks?.instagram || 0;
        metrics.obpLinkClicks.facebook += data.obpLinkClicks?.facebook || 0;
        metrics.obpLinkClicks.website += data.obpLinkClicks?.website || 0;
        metrics.obpShares.whatsapp += data.obpShares?.whatsapp || 0;
        metrics.obpShares.copy_link += data.obpShares?.copy_link || 0;
        metrics.obpShares.copy_message += data.obpShares?.copy_message || 0;
        metrics.daysWithData++;
    }

    return metrics;
}

// ================================================================
// MAIN AGGREGATION — Per Store
// ================================================================

export async function aggregateOBPAnalyticsForStore(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    now: Date = new Date(),
    timeZone?: string,
): Promise<boolean> {
    const localTodayStr = getAnalyticsDateKey(now, timeZone);
    const yesterdayStr = addDaysToAnalyticsDateKey(localTodayStr, -1);
    return aggregateOBPAnalyticsForStoreDate(db, tId, sId, yesterdayStr);
}

export async function aggregateOBPAnalyticsForStoreDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
): Promise<boolean> {
    const yesterdayStr = settlementDate;
    const yesterday = parseAnalyticsDateKey(yesterdayStr);

    // ── 1. Current week aggregation → weekly doc ──
    const { weekStr, weekStart, weekEnd } = getWeekDateRange(yesterday);
    const weekDates = getDateRange(weekStart, weekEnd);

    // ── 2. Previous week (for comparison) ──
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const { weekStr: prevWeekStr, weekStart: prevWeekStart } = getWeekDateRange(prevWeekEnd);
    const prevWeekDates = getDateRange(prevWeekStart, prevWeekEnd);

    // ── 3. Current month aggregation → monthly doc ──
    const { monthStr, firstDay, lastDay } = getMonthDateRange(yesterday);
    const monthDates = getDateRange(firstDay, yesterday); // Only up to yesterday

    const requiredDates = Array.from(new Set([...weekDates, ...prevWeekDates, ...monthDates, yesterdayStr]));
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, OBP_PROJECT_ID);
    const summaryRef = db.collection(DB_COLLECTIONS.ANALYTICS).doc(summaryDocId);
    const dashboardRef = db.collection(DB_COLLECTIONS.ANALYTICS).doc(getOBPDashboardSummaryDocId(tId, sId));
    const [existingSummary, existingDashboardSnap] = await Promise.all([
        summaryRef.get(),
        dashboardRef.get(),
    ]);
    const existingDashboard = existingDashboardSnap.exists ? existingDashboardSnap.data() || {} : null;

    // COST OPTIMIZATION: steady-state OBP aggregation reads the existing compact
    // dashboard cache plus yesterday's doc. The wider daily range query is only
    // used for first deploy, cache gaps, or catch-up rebuilds.
    const { dailyDocsByDate, yesterdayData, source } = await buildIncrementalOBPDailyMap(
        db,
        tId,
        sId,
        yesterdayStr,
        existingDashboard,
        requiredDates,
    );
    const currentWeekMetrics = aggregateOBPDailyDocsFromMap(dailyDocsByDate, weekDates);
    const prevWeekMetrics = aggregateOBPDailyDocsFromMap(dailyDocsByDate, prevWeekDates);
    const currentMonthMetrics = aggregateOBPDailyDocsFromMap(dailyDocsByDate, monthDates);

    if (currentWeekMetrics.daysWithData > 0) {
        const weeklyDocId = getAnalyticsDocId.weekly(tId, sId, OBP_PROJECT_ID, yesterday);
        await db.collection(DB_COLLECTIONS.ANALYTICS).doc(weeklyDocId).set({
            ...currentWeekMetrics,
            weekStr,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    if (currentMonthMetrics.daysWithData > 0) {
        const monthlyDocId = getAnalyticsDocId.monthly(tId, sId, OBP_PROJECT_ID, yesterday);
        await db.collection(DB_COLLECTIONS.ANALYTICS).doc(monthlyDocId).set({
            ...currentMonthMetrics,
            monthStr,
            monthStart: firstDay.toISOString().split('T')[0],
            monthEnd: lastDay.toISOString().split('T')[0],
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    // ── 4. Update summary doc with weekly + lifetime ──
    const existingData = existingSummary.exists ? existingSummary.data() : {};

    // Calculate week-over-week change
    let viewsChange: number | null = null;
    if (prevWeekMetrics.totalOBPViews > 0 && currentWeekMetrics.totalOBPViews > 0) {
        viewsChange = Math.round(
            ((currentWeekMetrics.totalOBPViews - prevWeekMetrics.totalOBPViews)
                / prevWeekMetrics.totalOBPViews) * 100
        );
    }

    // Lifetime: accumulate from existing + today's new data
    // We recalculate lifetime from all-time by reading existing lifetime and adding delta
    const existingLifetime = existingData?.lifetime || {};

    // For lifetime, we use a simple approach: store lifetime counters that get
    // updated by adding today's daily doc (yesterday's data) to existing lifetime
    // Only increment lifetime if yesterday had data and we haven't processed this date yet
    const lastProcessedDate = existingData?.lastProcessedDate || '';
    const shouldIncrementLifetime = yesterdayData && lastProcessedDate < yesterdayStr;

    const lifetimeUpdate = shouldIncrementLifetime ? {
        totalOBPViews: (existingLifetime.totalOBPViews || 0) + (yesterdayData?.totalOBPViews || 0),
        totalOBPActionClicks: (existingLifetime.totalOBPActionClicks || 0) + (yesterdayData?.totalOBPActionClicks || 0),
        totalOBPMenuClicks: (existingLifetime.totalOBPMenuClicks || 0) + (yesterdayData?.totalOBPMenuClicks || 0),
        totalOBPLinkClicks: (existingLifetime.totalOBPLinkClicks || 0) + (yesterdayData?.totalOBPLinkClicks || 0),
        totalOBPShares: (existingLifetime.totalOBPShares || 0) + (yesterdayData?.totalOBPShares || 0),
        obpActionClicks: {
            call: (existingLifetime.obpActionClicks?.call || 0) + (yesterdayData?.obpActionClicks?.call || 0),
            whatsapp: (existingLifetime.obpActionClicks?.whatsapp || 0) + (yesterdayData?.obpActionClicks?.whatsapp || 0),
            directions: (existingLifetime.obpActionClicks?.directions || 0) + (yesterdayData?.obpActionClicks?.directions || 0),
            reserve: (existingLifetime.obpActionClicks?.reserve || 0) + (yesterdayData?.obpActionClicks?.reserve || 0),
            order: (existingLifetime.obpActionClicks?.order || 0) + (yesterdayData?.obpActionClicks?.order || 0),
        },
        obpLinkClicks: {
            google_review: (existingLifetime.obpLinkClicks?.google_review || 0) + (yesterdayData?.obpLinkClicks?.google_review || 0),
            instagram: (existingLifetime.obpLinkClicks?.instagram || 0) + (yesterdayData?.obpLinkClicks?.instagram || 0),
            facebook: (existingLifetime.obpLinkClicks?.facebook || 0) + (yesterdayData?.obpLinkClicks?.facebook || 0),
            website: (existingLifetime.obpLinkClicks?.website || 0) + (yesterdayData?.obpLinkClicks?.website || 0),
        },
        obpShares: {
            whatsapp: (existingLifetime.obpShares?.whatsapp || 0) + (yesterdayData?.obpShares?.whatsapp || 0),
            copy_link: (existingLifetime.obpShares?.copy_link || 0) + (yesterdayData?.obpShares?.copy_link || 0),
            copy_message: (existingLifetime.obpShares?.copy_message || 0) + (yesterdayData?.obpShares?.copy_message || 0),
        },
    } : existingLifetime;

    const hasAnyData = currentWeekMetrics.daysWithData > 0 ||
        currentMonthMetrics.daysWithData > 0 ||
        (lifetimeUpdate.totalOBPViews || 0) > 0;

    if (!hasAnyData) return false;

    await summaryRef.set({
        // Weekly namespace — same pattern as menu analytics
        weekly: {
            ...currentWeekMetrics,
            weekStr,
            viewsChange,
        },
        // Monthly namespace
        monthly: {
            ...currentMonthMetrics,
            monthStr,
        },
        // Previous week for comparison
        previousWeek: {
            totalOBPViews: prevWeekMetrics.totalOBPViews,
            totalOBPActionClicks: prevWeekMetrics.totalOBPActionClicks,
            weekStr: prevWeekStr,
        },
        // Lifetime counters
        lifetime: lifetimeUpdate,
        // Meta
        lastProcessedDate: yesterdayStr,
        firstDataDate: existingData?.firstDataDate || yesterdayStr,
        modifiedOn: FieldValue.serverTimestamp(),
    }, { merge: true });

    const yesterdayMetrics = yesterdayData ? toDashboardDailyMetrics(yesterdayData) : null;
    const wtd = currentWeekMetrics.daysWithData > 0 ? toDashboardMetrics(currentWeekMetrics) : null;
    const mtd = currentMonthMetrics.daysWithData > 0
        ? { ...toDashboardMetrics(currentMonthMetrics), monthName: monthStr }
        : null;
    const overall = {
        lifetimeViews: lifetimeUpdate.totalOBPViews || 0,
        lifetimeActionClicks: lifetimeUpdate.totalOBPActionClicks || 0,
        lifetimeMenuClicks: lifetimeUpdate.totalOBPMenuClicks || 0,
        lifetimeLinkClicks: lifetimeUpdate.totalOBPLinkClicks || 0,
        lifetimeShares: lifetimeUpdate.totalOBPShares || 0,
        lifetimeActions: lifetimeUpdate.obpActionClicks || emptyMetrics().obpActionClicks,
        lifetimeShareMethods: lifetimeUpdate.obpShares || emptyMetrics().obpShares,
        lifetimeLinks: lifetimeUpdate.obpLinkClicks || emptyMetrics().obpLinkClicks,
        firstDataDate: existingData?.firstDataDate || yesterdayStr,
        lastUpdated: FieldValue.serverTimestamp(),
    };
    let status: 'working' | 'low_activity' | 'no_data' = 'no_data';
    let statusMessage = 'No visitors yet. Share your official link to start getting views.';
    if (wtd) {
        if (wtd.views >= 3) {
            status = 'working';
            statusMessage = 'Your official page is getting visitors!';
        } else if (wtd.views > 0) {
            status = 'low_activity';
            statusMessage = 'Some visitors this week. Share your link more to grow.';
        }
    } else if (yesterdayMetrics && yesterdayMetrics.views > 0) {
        status = 'low_activity';
        statusMessage = 'Activity detected yesterday.';
    }

    await dashboardRef.set({
        tId,
        sId,
        projectId: OBP_PROJECT_ID,
        kind: 'obpDashboardSummary',
        buildSource: source,
        generatedForLocalDate: addDaysToAnalyticsDateKey(yesterdayStr, 1),
        lastSettledLocalDate: yesterdayStr,
        overview: {
            status,
            statusMessage,
            yesterday: yesterdayMetrics,
            wtd,
            mtd,
            historicalWeeks: currentWeekMetrics.daysWithData > 0 ? [{
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                weekLabel: weekStr,
                views: currentWeekMetrics.totalOBPViews,
                actionClicks: currentWeekMetrics.totalOBPActionClicks,
                isCurrentWeek: true,
            }] : [],
            viewsChange,
        },
        overall,
        daily30d: Array.from(dailyDocsByDate.entries())
            .filter(([date]) => date >= addDaysToAnalyticsDateKey(yesterdayStr, -(OBP_DAILY_CACHE_DAYS - 1)) && date <= yesterdayStr)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => compactOBPAnalyticsDay(date, data)),
        modifiedOn: FieldValue.serverTimestamp(),
    }, { merge: true });

    return true;
}

// ================================================================
// PUBLIC API — Called by nightly scheduler
// ================================================================

/**
 * Aggregate OBP analytics for all stores.
 * Produces weekly doc, monthly doc, and summary doc per store.
 * Same document pattern as digital menu analytics.
 */
export async function aggregateOBPAnalyticsForAllStores(): Promise<{
    storesProcessed: number;
    storesWithData: number;
    errors: number;
}> {
    const db = firestoreAdmin;
    const result = { storesProcessed: 0, storesWithData: 0, errors: 0 };

    try {
        const summaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc('storesSummary')
            .get();

        if (!summaryDoc.exists) {
            logger.warn('[OBP Aggregation] No storesSummary found');
            return result;
        }

        const storesMap = summaryDoc.data()?.stores || {};
        const storeEntries = Object.entries(storesMap) as [string, any][];

        for (const [sId, storeInfo] of storeEntries) {
            if (!storeInfo?.active) continue;

            const tId = storeInfo.tId != null ? String(storeInfo.tId) : '';
            if (!tId) continue;
            result.storesProcessed++;

            try {
                const hadData = await aggregateOBPAnalyticsForStore(db, tId, sId, new Date(), storeInfo?.timeZone);
                if (hadData) result.storesWithData++;
            } catch (e: any) {
                logger.error(`[OBP Aggregation] Store ${sId}: ${e.message}`);
                result.errors++;
            }
        }
    } catch (e: any) {
        logger.error(`[OBP Aggregation] Fatal: ${e.message}`);
    }

    return result;
}
