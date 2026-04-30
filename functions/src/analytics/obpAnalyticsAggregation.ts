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

const logger = functions.logger;

const OBP_PROJECT_ID = 'obp';

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
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
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

/**
 * Read OBP daily docs for a date range and aggregate
 */
async function aggregateOBPDailyDocs(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    dates: string[],
): Promise<OBPAggregatedMetrics> {
    const metrics = emptyMetrics();

    for (const date of dates) {
        const docId = getAnalyticsDocId.daily(tId, sId, OBP_PROJECT_ID, date);
        const docSnap = await db.collection(DB_COLLECTIONS.ANALYTICS).doc(docId).get();

        if (docSnap.exists) {
            const data = docSnap.data() as OBPDailyData;
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
    }

    return metrics;
}

// ================================================================
// MAIN AGGREGATION — Per Store
// ================================================================

async function aggregateOBPForStore(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
): Promise<boolean> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // ── 1. Current week aggregation → weekly doc ──
    const { weekStr, weekStart, weekEnd } = getWeekDateRange(yesterday);
    const weekDates = getDateRange(weekStart, weekEnd);
    const currentWeekMetrics = await aggregateOBPDailyDocs(db, tId, sId, weekDates);

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

    // ── 2. Previous week (for comparison) ──
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const { weekStr: prevWeekStr, weekStart: prevWeekStart } = getWeekDateRange(prevWeekEnd);
    const prevWeekDates = getDateRange(prevWeekStart, prevWeekEnd);
    const prevWeekMetrics = await aggregateOBPDailyDocs(db, tId, sId, prevWeekDates);

    // ── 3. Current month aggregation → monthly doc ──
    const { monthStr, firstDay, lastDay } = getMonthDateRange(yesterday);
    const monthDates = getDateRange(firstDay, yesterday); // Only up to yesterday
    const currentMonthMetrics = await aggregateOBPDailyDocs(db, tId, sId, monthDates);

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
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, OBP_PROJECT_ID);
    const summaryRef = db.collection(DB_COLLECTIONS.ANALYTICS).doc(summaryDocId);
    const existingSummary = await summaryRef.get();
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
    const yesterdayDocId = getAnalyticsDocId.daily(tId, sId, OBP_PROJECT_ID, yesterday.toISOString().split('T')[0]);
    const yesterdaySnap = await db.collection(DB_COLLECTIONS.ANALYTICS).doc(yesterdayDocId).get();
    const yesterdayData = yesterdaySnap.exists ? yesterdaySnap.data() as OBPDailyData : null;

    // Only increment lifetime if yesterday had data and we haven't processed this date yet
    const lastProcessedDate = existingData?.lastProcessedDate || '';
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const shouldIncrementLifetime = yesterdayData && lastProcessedDate !== yesterdayStr;

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
                const hadData = await aggregateOBPForStore(db, tId, sId);
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
