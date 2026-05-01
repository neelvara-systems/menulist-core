import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { DB_COLLECTIONS, getAnalyticsDocId, getMonthDateRange, getWeekDateRange, TTL_CONFIG } from './constants/database';
import { firestoreAdmin } from './firebaseAdmin';
import { addDaysToAnalyticsDateKey, getAnalyticsDateKey, getAnalyticsWeekday, parseAnalyticsDateKey } from './utils/analyticsDate';
import { writeDashboardSummaryDocument } from './analytics/dashboardSummaryAggregation';
import {
    DailyDashboardMetrics,
    generateDailyAISummary,
    generateMonthlyAISummary,
    generateOwnerDashboardSummary,
    MonthlyDashboardMetrics,
    OwnerDashboardMetrics
} from './services/gemini/ownerDashboardSummary';

/**
 * CUSTOMER-FACING ANALYTICS AGGREGATION
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Shared aggregation helpers for customer-facing analytics (menu views, clicks, etc.)
 * The active nightly trigger now lives in `decisionBlocksScoring.ts`, where menu
 * analytics and OBP analytics run together in one timezone-aware per-store flow.
 * 
 * ARCHITECTURE:
 * - 1 Tenant → Multiple Stores
 * - 1 Store → Multiple Projects (digital menus)
 * - Each Project gets its own analytics documents
 * 
 * DOCUMENT PATTERNS:
 * - Daily:    analytics/{tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}
 * - Summary:  analytics/{tId}_{sId}_{projectId}_overall_summary
 * - Weekly:   analytics/{tId}_{sId}_{projectId}_weekly_{YYYY-Www}
 * - Monthly:  analytics/{tId}_{sId}_{projectId}_monthly_{YYYY-MM}
 * 
 * TASKS:
 * 1. Update overall_summary from yesterday's daily doc
 * 2. Create/update weekly rollup (on Mondays)
 * 3. Create/update monthly rollup (on 1st of month)
 * 4. Delete daily docs older than 90 days (TTL cleanup)
 * 
 * Cost Optimization:
 * - Summary is updated nightly (not on every event) → 50% write reduction
 * - Weekly/monthly rollups reduce dashboard query costs
 * 
 * Deployment:
 * firebase deploy --only functions:computeDecisionBlocksScores
 */

// Use centralized constants from ./constants/database.ts
const ANALYTICS_COLLECTION = DB_COLLECTIONS.ANALYTICS;
const TTL_DAYS = TTL_CONFIG.ANALYTICS_DAILY_DAYS;
// Document ID patterns now use getAnalyticsDocId helpers

// Daily metrics structure (used for type reference in dailyData parameter)
interface DailyMetrics {
    date?: string;
    totalViews?: number;
    totalClicks?: number;
    totalSessions?: number;
    totalSearches?: number;
    zeroResultSearches?: number;
    totalUnavailableItemTaps?: number;
    totalMenuActionClicks?: number;
    totalRecommendationClicks?: number;
    // Decision Blocks rendered - CRITICAL for engagement rate calculation
    totalDecisionBlocksRendered?: number;
    decisionBlocksRendered?: Record<string, number>;  // { popular: n, quickPick: n, bestValue: n }
    viewsByDevice?: Record<string, number>;
    viewsByLocation?: Record<string, number>;
    viewsBySource?: Record<string, number>;
    clicksByItem?: Record<string, number>;
    recommendationClicks?: Record<string, number>;
    recommendationClicksByItem?: Record<string, number>;
    searchTerms?: Record<string, number>;
    menuActionClicks?: Record<string, number>;
    unavailableItemTapsByItem?: Record<string, number>;
    itemNames?: Record<string, string>;

    // ── Customer App (installable PWA surface) fields — additive-only, projectId='customerApp' ──
    // All optional so existing menu analytics projects (obp, menu slugs) are unaffected.
    totalPromptShown?: number;
    totalPromptDismissed?: number;
    totalInstallStarted?: number;
    totalInstalled?: number;
    uniqueInstallSessions?: number;
    totalAppOpens?: number;
    shortcutClicks?: Record<string, number>;      // { menu, call, directions }
    installsByDevice?: Record<string, number>;
    installsByLocation?: Record<string, number>;
    installsByPlatform?: Record<string, number>;
    installsBySource?: Record<string, number>;
    appOpensByPlatform?: Record<string, number>;
    hourlyPromptShown?: Record<string, number>;
    hourlyAppOpens?: Record<string, number>;
}

interface AggregationResults {
    totalProjects: number;
    summaryUpdates: number;
    weeklyRollups: number;
    monthlyRollups: number;
    dailyAiSummaries: number;
    weeklyAiSummaries: number;
    monthlyAiSummaries: number;
    documentsDeleted: number;
    errors: Array<{ projectKey: string; error: string }>;
}

const OBP_PROJECT_ID = 'obp';

function buildAggregationContext(now: Date = new Date(), timeZone?: string) {
    const localTodayStr = getAnalyticsDateKey(now, timeZone);
    const yesterdayStr = addDaysToAnalyticsDateKey(localTodayStr, -1);
    return buildAggregationContextForDate(yesterdayStr);
}

function buildAggregationContextForDate(settlementDate: string) {
    const localTodayStr = addDaysToAnalyticsDateKey(settlementDate, 1);
    const yesterdayStr = settlementDate;
    const yesterday = parseAnalyticsDateKey(yesterdayStr);
    const isMonday = getAnalyticsWeekday(localTodayStr) === 1;
    const isFirstOfMonth = localTodayStr.endsWith('-01');

    return {
        localTodayStr,
        yesterday,
        yesterdayStr,
        isMonday,
        isFirstOfMonth,
    };
}

async function collectStoreAnalyticsProjects(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    yesterdayStr: string,
    knownProjectIds: string[] = [],
): Promise<{ projectIds: Set<string>; yesterdayDocs: Map<string, any> }> {
    const projectIds = new Set<string>(
        knownProjectIds
            .map((projectId) => String(projectId || '').trim())
            .filter(Boolean)
    );
    const yesterdayDocs = new Map<string, any>();

    const analyticsDocsQuery = await db.collection(ANALYTICS_COLLECTION)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('grain', '==', 'daily')
        .where('localDate', '==', yesterdayStr)
        .get();

    analyticsDocsQuery.docs.forEach((doc) => {
        const data = doc.data();
        const projectId = String(data.projectId || '').trim();
        if (!projectId) return;
        if (projectId === OBP_PROJECT_ID) return;

        projectIds.add(projectId);
        yesterdayDocs.set(projectId, { id: doc.id, data });
    });

    return { projectIds, yesterdayDocs };
}

export async function aggregateCustomerAnalyticsForStore(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    now: Date = new Date(),
    timeZone?: string,
    knownProjectIds: string[] = [],
): Promise<AggregationResults> {
    const settlementDate = addDaysToAnalyticsDateKey(getAnalyticsDateKey(now, timeZone), -1);
    return aggregateCustomerAnalyticsForStoreDate(db, tId, sId, settlementDate, knownProjectIds);
}

export async function aggregateCustomerAnalyticsForStoreDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    knownProjectIds: string[] = [],
): Promise<AggregationResults> {
    const results: AggregationResults = {
        totalProjects: 0,
        summaryUpdates: 0,
        weeklyRollups: 0,
        monthlyRollups: 0,
        dailyAiSummaries: 0,
        weeklyAiSummaries: 0,
        monthlyAiSummaries: 0,
        documentsDeleted: 0,
        errors: [],
    };

    const { yesterday, yesterdayStr, isMonday, isFirstOfMonth } = buildAggregationContextForDate(settlementDate);
    const { projectIds, yesterdayDocs } = await collectStoreAnalyticsProjects(db, tId, sId, yesterdayStr, knownProjectIds);

    results.totalProjects = projectIds.size;

    for (const projectId of projectIds) {
        const projectKey = `${tId}_${sId}_${projectId}`;

        try {
            const yesterdayDoc = yesterdayDocs.get(projectId);
            if (yesterdayDoc) {
                const updated = await updateSummaryDocument(db, tId, sId, projectId, yesterdayDoc.data);
                if (updated) results.summaryUpdates++;
            }

            if (isMonday) {
                const weeklyAggregated = await createWeeklyRollup(db, tId, sId, projectId, yesterday);
                if (weeklyAggregated.daysWithData > 0) results.weeklyRollups++;

                if (weeklyAggregated.daysWithData > 0 && isMenuAnalyticsProject(projectId) && hasMenuAnalyticsActivity(weeklyAggregated.aggregated)) {
                    try {
                        await generateAndSaveWeeklyAISummary(
                            db,
                            tId,
                            sId,
                            projectId,
                            weeklyAggregated.aggregated,
                            weeklyAggregated.weekStart,
                            weeklyAggregated.weekEnd,
                        );
                        results.weeklyAiSummaries++;
                    } catch (aiError) {
                        console.error(`  ⚠ Weekly AI summary failed for ${projectKey}:`, aiError);
                    }
                }
            }

            if (isFirstOfMonth) {
                const monthlyAggregated = await createMonthlyRollup(db, tId, sId, projectId, yesterday);
                if (monthlyAggregated.daysWithData > 0) results.monthlyRollups++;

                if (monthlyAggregated.daysWithData > 0 && isMenuAnalyticsProject(projectId) && hasMenuAnalyticsActivity(monthlyAggregated.aggregated)) {
                    try {
                        await generateAndSaveMonthlyAISummary(
                            db,
                            tId,
                            sId,
                            projectId,
                            monthlyAggregated.aggregated,
                            monthlyAggregated.monthStart,
                            monthlyAggregated.monthEnd,
                            monthlyAggregated.daysWithData,
                        );
                        results.monthlyAiSummaries++;
                    } catch (aiError) {
                        console.error(`  ⚠ Monthly AI summary failed for ${projectKey}:`, aiError);
                    }
                }
            }

            if (isMenuAnalyticsProject(projectId) && yesterdayDoc && hasMenuAnalyticsActivity(yesterdayDoc.data)) {
                try {
                    await generateAndSaveDailyAISummary(db, tId, sId, projectId, yesterdayDoc.data, yesterdayStr);
                    results.dailyAiSummaries++;
                } catch (aiError) {
                    console.error(`  ⚠ Daily AI summary failed for ${projectKey}:`, aiError);
                }
            }

            await writeDashboardSummaryDocument(db, tId, sId, projectId, yesterdayStr, yesterdayDoc?.data || null);

            if (isFirstOfMonth) {
                const deletedCount = await cleanupOldDocuments(db, tId, sId, projectId);
                results.documentsDeleted += deletedCount;
            }
        } catch (error: any) {
            results.errors.push({ projectKey, error: error.message });
        }
    }

    return results;
}

/**
 * Customer App (`projectId='customerApp'`) reuses the shared analytics
 * collection and rollup pipeline, but the Gemini owner-dashboard summaries
 * remain menu-specific. Keep that boundary explicit so Customer App is fully
 * aggregated without being forced through menu-only AI prompts.
 */
function isMenuAnalyticsProject(projectId: string): boolean {
    return projectId !== 'customerApp';
}

function hasMenuAnalyticsActivity(data: DailyMetrics | Record<string, any> | null | undefined): boolean {
    if (!data) return false;

    return Boolean(
        (typeof data.totalViews === 'number' && data.totalViews > 0)
        || (typeof data.totalClicks === 'number' && data.totalClicks > 0)
        || (typeof data.totalSessions === 'number' && data.totalSessions > 0)
        || (typeof data.totalSearches === 'number' && data.totalSearches > 0)
        || (typeof data.totalUnavailableItemTaps === 'number' && data.totalUnavailableItemTaps > 0)
        || (typeof data.totalMenuActionClicks === 'number' && data.totalMenuActionClicks > 0)
        || (typeof data.totalRecommendationClicks === 'number' && data.totalRecommendationClicks > 0)
        || (typeof data.totalDecisionBlocksRendered === 'number' && data.totalDecisionBlocksRendered > 0)
    );
}

/**
 * Update the overall_summary document with data from a daily document
 */
async function updateSummaryDocument(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    dailyData: DailyMetrics
): Promise<boolean> {
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, projectId);
    const summaryRef = db.collection(ANALYTICS_COLLECTION).doc(summaryDocId);
    const aggregateDate = dailyData.date || new Date().toISOString().split('T')[0];

    // Prepare incremental updates
    const updates: any = {
        lastUpdated: FieldValue.serverTimestamp(),
        lastAggregatedDate: aggregateDate,
    };

    // Aggregate numeric totals
    if (dailyData.totalViews) updates.lifetimeTotalViews = FieldValue.increment(dailyData.totalViews);
    if (dailyData.totalClicks) updates.lifetimeTotalClicks = FieldValue.increment(dailyData.totalClicks);
    if (dailyData.totalSessions) updates.lifetimeTotalSessions = FieldValue.increment(dailyData.totalSessions);
    if (dailyData.totalSearches) updates.lifetimeTotalSearches = FieldValue.increment(dailyData.totalSearches);
    if (dailyData.zeroResultSearches) updates.lifetimeZeroResultSearches = FieldValue.increment(dailyData.zeroResultSearches);
    if (dailyData.totalUnavailableItemTaps) {
        updates.lifetimeTotalUnavailableItemTaps = FieldValue.increment(dailyData.totalUnavailableItemTaps);
    }
    if (dailyData.totalMenuActionClicks) {
        updates.lifetimeTotalMenuActionClicks = FieldValue.increment(dailyData.totalMenuActionClicks);
    }
    if (dailyData.totalRecommendationClicks) {
        updates.lifetimeTotalRecommendationClicks = FieldValue.increment(dailyData.totalRecommendationClicks);
    }

    // Aggregate map fields (device, location, source breakdowns)
    if (dailyData.viewsByDevice) {
        for (const [key, value] of Object.entries(dailyData.viewsByDevice)) {
            if (typeof value === 'number') {
                updates[`viewsByDevice.${key}`] = FieldValue.increment(value);
            }
        }
    }

    if (dailyData.viewsByLocation) {
        for (const [key, value] of Object.entries(dailyData.viewsByLocation)) {
            if (typeof value === 'number') {
                updates[`viewsByLocation.${key}`] = FieldValue.increment(value);
            }
        }
    }

    if (dailyData.viewsBySource) {
        for (const [key, value] of Object.entries(dailyData.viewsBySource)) {
            if (typeof value === 'number') {
                updates[`viewsBySource.${key}`] = FieldValue.increment(value);
            }
        }
    }

    // Aggregate top items (clicksByItem)
    if (dailyData.clicksByItem) {
        for (const [itemId, clicks] of Object.entries(dailyData.clicksByItem)) {
            if (typeof clicks === 'number') {
                updates[`clicksByItem.${itemId}`] = FieldValue.increment(clicks);
            }
        }
    }

    // Aggregate Decision Blocks rendered - CRITICAL for owner dashboard
    // Enables calculation of:
    // - Smart Picks Visibility Rate = totalDecisionBlocksRendered / totalViews
    // - Engagement Rate = totalRecommendationClicks / totalDecisionBlocksRendered
    if (dailyData.totalDecisionBlocksRendered) {
        updates.lifetimeTotalDecisionBlocksRendered = FieldValue.increment(dailyData.totalDecisionBlocksRendered);
    }

    // Aggregate per-block-type renders (popular, quickPick, bestValue)
    if (dailyData.decisionBlocksRendered) {
        for (const [blockType, count] of Object.entries(dailyData.decisionBlocksRendered)) {
            if (typeof count === 'number') {
                updates[`decisionBlocksRendered.${blockType}`] = FieldValue.increment(count);
            }
        }
    }

    // Aggregate recommendation clicks by block type
    if (dailyData.recommendationClicks) {
        for (const [blockType, clicks] of Object.entries(dailyData.recommendationClicks)) {
            if (typeof clicks === 'number') {
                updates[`recommendationClicks.${blockType}`] = FieldValue.increment(clicks);
            }
        }
    }

    // Aggregate recommendation clicks by item
    if (dailyData.recommendationClicksByItem) {
        for (const [itemId, clicks] of Object.entries(dailyData.recommendationClicksByItem)) {
            if (typeof clicks === 'number') {
                updates[`recommendationClicksByItem.${itemId}`] = FieldValue.increment(clicks);
            }
        }
    }

    if (dailyData.menuActionClicks) {
        for (const [action, clicks] of Object.entries(dailyData.menuActionClicks)) {
            if (typeof clicks === 'number') {
                updates[`menuActionClicks.${action}`] = FieldValue.increment(clicks);
            }
        }
    }

    if (dailyData.searchTerms) {
        for (const [term, count] of Object.entries(dailyData.searchTerms)) {
            if (typeof count === 'number') {
                updates[`searchTerms.${term}`] = FieldValue.increment(count);
            }
        }
    }

    if (dailyData.unavailableItemTapsByItem) {
        for (const [itemId, taps] of Object.entries(dailyData.unavailableItemTapsByItem)) {
            if (typeof taps === 'number') {
                updates[`unavailableItemTapsByItem.${itemId}`] = FieldValue.increment(taps);
            }
            if (dailyData.itemNames?.[itemId]) {
                updates[`itemNames.${itemId}`] = dailyData.itemNames[itemId];
            }
        }
    }

    // ── Customer App (projectId='customerApp') lifetime totals ──
    // All guarded — only increment when source field is present, so other projects are unaffected.
    if (dailyData.totalPromptShown) {
        updates.lifetimeTotalPromptShown = FieldValue.increment(dailyData.totalPromptShown);
    }
    if (dailyData.totalPromptDismissed) {
        updates.lifetimeTotalPromptDismissed = FieldValue.increment(dailyData.totalPromptDismissed);
    }
    if (dailyData.totalInstallStarted) {
        updates.lifetimeTotalInstallStarted = FieldValue.increment(dailyData.totalInstallStarted);
    }
    if (dailyData.totalInstalled) {
        updates.lifetimeTotalInstalled = FieldValue.increment(dailyData.totalInstalled);
    }
    if (dailyData.uniqueInstallSessions) {
        updates.lifetimeUniqueInstalls = FieldValue.increment(dailyData.uniqueInstallSessions);
    }
    if (dailyData.totalAppOpens) {
        updates.lifetimeTotalAppOpens = FieldValue.increment(dailyData.totalAppOpens);
    }

    // Customer App map rollups (additive merge via FieldValue.increment on each key)
    if (dailyData.shortcutClicks) {
        for (const [key, value] of Object.entries(dailyData.shortcutClicks)) {
            if (typeof value === 'number') {
                updates[`shortcutClicks.${key}`] = FieldValue.increment(value);
            }
        }
    }
    if (dailyData.installsByDevice) {
        for (const [key, value] of Object.entries(dailyData.installsByDevice)) {
            if (typeof value === 'number') {
                updates[`installsByDevice.${key}`] = FieldValue.increment(value);
            }
        }
    }
    if (dailyData.installsByLocation) {
        for (const [key, value] of Object.entries(dailyData.installsByLocation)) {
            if (typeof value === 'number') {
                updates[`installsByLocation.${key}`] = FieldValue.increment(value);
            }
        }
    }
    if (dailyData.installsByPlatform) {
        for (const [key, value] of Object.entries(dailyData.installsByPlatform)) {
            if (typeof value === 'number') {
                updates[`installsByPlatform.${key}`] = FieldValue.increment(value);
            }
        }
    }
    if (dailyData.installsBySource) {
        for (const [key, value] of Object.entries(dailyData.installsBySource)) {
            if (typeof value === 'number') {
                updates[`installsBySource.${key}`] = FieldValue.increment(value);
            }
        }
    }
    if (dailyData.appOpensByPlatform) {
        for (const [key, value] of Object.entries(dailyData.appOpensByPlatform)) {
            if (typeof value === 'number') {
                updates[`appOpensByPlatform.${key}`] = FieldValue.increment(value);
            }
        }
    }

    return await db.runTransaction(async (transaction) => {
        const existingSummary = await transaction.get(summaryRef);
        const lastAggregatedDate = existingSummary.exists
            ? String(existingSummary.data()?.lastAggregatedDate || '')
            : '';

        if (lastAggregatedDate >= aggregateDate) {
            return false;
        }

        transaction.set(summaryRef, updates, { merge: true });
        return true;
    });
}

/**
 * Create weekly rollup document
 * Aggregates last 7 days of data into a single document
 * Returns aggregated data for AI summary generation
 */
async function createWeeklyRollup(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    referenceDate: Date
): Promise<{ aggregated: any; weekStart: string; weekEnd: string; daysWithData: number }> {
    // Get week date range from utility
    const { weekStart, weekEnd } = getWeekDateRange(referenceDate);
    const weeklyDocId = getAnalyticsDocId.weekly(tId, sId, projectId, referenceDate);
    const weeklyRef = db.collection(ANALYTICS_COLLECTION).doc(weeklyDocId);

    const dailyDocs = await getDailyDocsInRange(db, tId, sId, projectId, weekStart, weekEnd);

    // Aggregate all daily data
    const aggregated = aggregateDailyDocs(dailyDocs);

    if (dailyDocs.length === 0) {
        return {
            aggregated,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            daysWithData: 0,
        };
    }

    // Save weekly rollup
    await weeklyRef.set({
        tId,
        sId,
        projectId,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        daysWithData: dailyDocs.length,
        ...aggregated,
        createdOn: FieldValue.serverTimestamp(),
        modifiedOn: FieldValue.serverTimestamp(),
    });

    // Return aggregated data for AI summary
    return {
        aggregated,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        daysWithData: dailyDocs.length,
    };
}

/**
 * Create monthly rollup document
 * Aggregates all days in the previous month
 * Returns aggregated data for AI summary generation
 */
async function createMonthlyRollup(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    referenceDate: Date
): Promise<{ aggregated: any; monthStart: string; monthEnd: string; daysWithData: number }> {
    // Get month date range from utility
    const { firstDay, lastDay } = getMonthDateRange(referenceDate);
    const monthlyDocId = getAnalyticsDocId.monthly(tId, sId, projectId, referenceDate);
    const monthlyRef = db.collection(ANALYTICS_COLLECTION).doc(monthlyDocId);

    const dailyDocs = await getDailyDocsInRange(db, tId, sId, projectId, firstDay, lastDay);

    // Aggregate all daily data
    const aggregated = aggregateDailyDocs(dailyDocs);

    if (dailyDocs.length === 0) {
        return {
            aggregated,
            monthStart: firstDay.toISOString().split('T')[0],
            monthEnd: lastDay.toISOString().split('T')[0],
            daysWithData: 0,
        };
    }

    // Save monthly rollup
    await monthlyRef.set({
        tId,
        sId,
        projectId,
        monthStart: firstDay.toISOString().split('T')[0],
        monthEnd: lastDay.toISOString().split('T')[0],
        daysWithData: dailyDocs.length,
        ...aggregated,
        createdOn: FieldValue.serverTimestamp(),
        modifiedOn: FieldValue.serverTimestamp(),
    });

    // Return aggregated data for AI summary
    return {
        aggregated,
        monthStart: firstDay.toISOString().split('T')[0],
        monthEnd: lastDay.toISOString().split('T')[0],
        daysWithData: dailyDocs.length,
    };
}

/**
 * Get daily documents within a date range
 */
async function getDailyDocsInRange(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    startDate: Date,
    endDate: Date
): Promise<any[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const prefix = getAnalyticsDocId.dailyPrefix(tId, sId, projectId);

    const querySnapshot = await db.collection(ANALYTICS_COLLECTION)
        .where('__name__', '>=', `${prefix}${startStr}`)
        .where('__name__', '<=', `${prefix}${endStr}`)
        .get();

    return querySnapshot.docs.map(doc => doc.data());
}

/**
 * Aggregate multiple daily documents into a single summary
 * Used for weekly and monthly rollups
 */
function aggregateDailyDocs(docs: any[]): any {
    const result: any = {
        totalViews: 0,
        totalClicks: 0,
        totalSessions: 0,
        totalSearches: 0,
        zeroResultSearches: 0,
        totalUnavailableItemTaps: 0,
        totalMenuActionClicks: 0,
        totalRecommendationClicks: 0,
        // Decision Blocks rendered - for owner dashboard
        totalDecisionBlocksRendered: 0,
        viewsByDevice: {},
        viewsByLocation: {},
        viewsBySource: {},
        clicksByItem: {},
        searchTerms: {},
        unavailableItemTapsByItem: {},
        menuActionClicks: {},
        recommendationClicks: {},
        decisionBlocksRendered: {},
        recommendationClicksByItem: {},
        itemNames: {},
        // ── Customer App (projectId='customerApp') fields ──
        // Stay zero for all other projects; summed only when daily docs contain these keys.
        totalPromptShown: 0,
        totalPromptDismissed: 0,
        totalInstallStarted: 0,
        totalInstalled: 0,
        uniqueInstallSessions: 0,
        totalAppOpens: 0,
        shortcutClicks: {},
        installsByDevice: {},
        installsByLocation: {},
        installsByPlatform: {},
        installsBySource: {},
        appOpensByPlatform: {},
    };

    for (const doc of docs) {
        // Sum numeric totals
        if (doc.totalViews) result.totalViews += doc.totalViews;
        if (doc.totalClicks) result.totalClicks += doc.totalClicks;
        if (doc.totalSessions) result.totalSessions += doc.totalSessions;
        if (doc.totalSearches) result.totalSearches += doc.totalSearches;
        if (doc.zeroResultSearches) result.zeroResultSearches += doc.zeroResultSearches;
        if (doc.totalUnavailableItemTaps) result.totalUnavailableItemTaps += doc.totalUnavailableItemTaps;
        if (doc.totalMenuActionClicks) result.totalMenuActionClicks += doc.totalMenuActionClicks;
        if (doc.totalRecommendationClicks) result.totalRecommendationClicks += doc.totalRecommendationClicks;
        // Decision Blocks rendered
        if (doc.totalDecisionBlocksRendered) result.totalDecisionBlocksRendered += doc.totalDecisionBlocksRendered;

        // Customer App numeric totals (additive; zero when field absent)
        if (doc.totalPromptShown) result.totalPromptShown += doc.totalPromptShown;
        if (doc.totalPromptDismissed) result.totalPromptDismissed += doc.totalPromptDismissed;
        if (doc.totalInstallStarted) result.totalInstallStarted += doc.totalInstallStarted;
        if (doc.totalInstalled) result.totalInstalled += doc.totalInstalled;
        if (doc.uniqueInstallSessions) result.uniqueInstallSessions += doc.uniqueInstallSessions;
        if (doc.totalAppOpens) result.totalAppOpens += doc.totalAppOpens;

        // Merge map fields
        mergeMapField(result.viewsByDevice, doc.viewsByDevice);
        mergeMapField(result.viewsByLocation, doc.viewsByLocation);
        mergeMapField(result.viewsBySource, doc.viewsBySource);
        mergeMapField(result.clicksByItem, doc.clicksByItem);
        mergeMapField(result.searchTerms, doc.searchTerms);
        mergeMapField(result.unavailableItemTapsByItem, doc.unavailableItemTapsByItem);
        mergeMapField(result.menuActionClicks, doc.menuActionClicks);
        mergeMapField(result.recommendationClicks, doc.recommendationClicks);
        // Decision Blocks breakdown
        mergeMapField(result.decisionBlocksRendered, doc.decisionBlocksRendered);
        mergeMapField(result.recommendationClicksByItem, doc.recommendationClicksByItem);
        if (doc.itemNames) {
            Object.assign(result.itemNames, doc.itemNames);
        }
        // Customer App map fields (additive merge — keys summed, never replaced)
        mergeMapField(result.shortcutClicks, doc.shortcutClicks);
        mergeMapField(result.installsByDevice, doc.installsByDevice);
        mergeMapField(result.installsByLocation, doc.installsByLocation);
        mergeMapField(result.installsByPlatform, doc.installsByPlatform);
        mergeMapField(result.installsBySource, doc.installsBySource);
        mergeMapField(result.appOpensByPlatform, doc.appOpensByPlatform);
    }

    return result;
}

/**
 * Merge a map field by summing values
 */
function mergeMapField(target: Record<string, number>, source: Record<string, number> | undefined): void {
    if (!source) return;
    for (const [key, value] of Object.entries(source)) {
        if (typeof value === 'number') {
            target[key] = (target[key] || 0) + value;
        }
    }
}

function getTopMetricEntry(source?: Record<string, number>): { key: string; count: number } | undefined {
    if (!source) return undefined;

    const entries = Object.entries(source)
        .filter(([, count]) => typeof count === 'number' && count > 0)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) return undefined;

    return { key: entries[0][0], count: entries[0][1] };
}

/**
 * Delete daily documents older than TTL_DAYS
 */
async function cleanupOldDocuments(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string
): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TTL_DAYS);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const prefix = getAnalyticsDocId.dailyPrefix(tId, sId, projectId);

    // Query documents older than cutoff
    const oldDocsQuery = await db.collection(ANALYTICS_COLLECTION)
        .where('__name__', '>=', `${prefix}0000-00-00`)
        .where('__name__', '<', `${prefix}${cutoffStr}`)
        .get();

    if (oldDocsQuery.empty) {
        return 0;
    }

    // Delete in batches of 500 (Firestore limit)
    const batch = db.batch();
    let deleteCount = 0;

    for (const doc of oldDocsQuery.docs) {
        batch.delete(doc.ref);
        deleteCount++;

        // Commit batch if we hit 500
        if (deleteCount % 500 === 0) {
            await batch.commit();
        }
    }

    // Commit remaining deletes
    if (deleteCount % 500 !== 0) {
        await batch.commit();
    }

    return deleteCount;
}

/**
 * Generate Weekly AI summary and save to summary document
 * Uses Gemini to create a simple, actionable summary for SMB owners
 */
async function generateAndSaveWeeklyAISummary(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    aggregated: any,
    weekStart: string,
    weekEnd: string
): Promise<void> {
    // Get previous week data for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const prevWeekDocs = await getDailyDocsInRange(db, tId, sId, projectId, prevWeekStart, prevWeekEnd);
    const prevWeekAggregated = aggregateDailyDocs(prevWeekDocs);

    // Calculate change percentage
    const menuVisitsChange = prevWeekAggregated.totalViews > 0
        ? Math.round(((aggregated.totalViews - prevWeekAggregated.totalViews) / prevWeekAggregated.totalViews) * 100)
        : 0;

    // Build top items from clicksByItem
    const topItems: Array<{ itemId: string; clicks: number }> = [];
    if (aggregated.recommendationClicksByItem) {
        const entries = Object.entries(aggregated.recommendationClicksByItem) as [string, number][];
        entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([itemId, clicks]) => {
                topItems.push({ itemId, clicks });
            });
    }

    // Build block performance from decisionBlocksRendered and recommendationClicks
    const blockPerformance = {
        popular: {
            rendered: aggregated.decisionBlocksRendered?.popular || 0,
            clicks: aggregated.recommendationClicks?.popular || 0,
        },
        quickPick: {
            rendered: aggregated.decisionBlocksRendered?.quickPick || 0,
            clicks: aggregated.recommendationClicks?.quickPick || 0,
        },
        bestValue: {
            rendered: aggregated.decisionBlocksRendered?.bestValue || 0,
            clicks: aggregated.recommendationClicks?.bestValue || 0,
        },
    };

    const topSearchTerm = getTopMetricEntry(aggregated.searchTerms);
    const topUnavailableItem = getTopMetricEntry(aggregated.unavailableItemTapsByItem);
    const topMenuAction = getTopMetricEntry(aggregated.menuActionClicks);

    // Build metrics for AI
    const metrics: OwnerDashboardMetrics = {
        period: 'last_7_days',
        weekStart,
        weekEnd,
        menuVisits: aggregated.totalViews || 0,
        menuVisitsChange,
        itemClicks: aggregated.totalClicks || 0,
        searches: aggregated.totalSearches || 0,
        zeroResultSearches: aggregated.zeroResultSearches || 0,
        unavailableItemTaps: aggregated.totalUnavailableItemTaps || 0,
        menuActionClicks: aggregated.totalMenuActionClicks || 0,
        topSearchTerm: topSearchTerm ? { term: topSearchTerm.key, count: topSearchTerm.count } : undefined,
        topUnavailableItem: topUnavailableItem ? { itemId: topUnavailableItem.key, taps: topUnavailableItem.count } : undefined,
        topMenuAction: topMenuAction ? { action: topMenuAction.key, count: topMenuAction.count } : undefined,
        smartPicksRendered: aggregated.totalDecisionBlocksRendered || 0,
        smartPicksClicks: aggregated.totalRecommendationClicks || 0,
        topItems,
        blockPerformance,
    };

    // Generate AI summary
    const aiSummary = await generateOwnerDashboardSummary(metrics);

    // Save to summary document
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, projectId);
    const summaryRef = db.collection(ANALYTICS_COLLECTION).doc(summaryDocId);

    await summaryRef.set({
        ownerDashboardSummary: {
            markdown: aiSummary.markdown,
            bulletPoints: aiSummary.bulletPoints,
            period: { start: weekStart, end: weekEnd },
            generatedAt: Timestamp.now(),
            promptVersion: 'v1',
        },
        ownerDashboardSummaryMetrics: {
            menuVisitsChange,
        },
        lastOwnerSummaryGenerated: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`[Weekly AI Summary] Saved to ${summaryDocId}`);
}

/**
 * Generate Daily AI summary and save to daily document
 * Descriptive only, no conclusions - max 2 bullets
 */
async function generateAndSaveDailyAISummary(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    dailyData: DailyMetrics,
    date: string
): Promise<void> {
    // Build top items from recommendationClicksByItem
    const topItems: Array<{ itemId: string; clicks: number }> = [];
    if (dailyData.recommendationClicksByItem) {
        const entries = Object.entries(dailyData.recommendationClicksByItem) as [string, number][];
        entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([itemId, clicks]) => {
                topItems.push({ itemId, clicks });
            });
    }

    // Build block performance
    const blockPerformance = {
        popular: {
            rendered: dailyData.decisionBlocksRendered?.popular || 0,
            clicks: dailyData.recommendationClicks?.popular || 0,
        },
        quickPick: {
            rendered: dailyData.decisionBlocksRendered?.quickPick || 0,
            clicks: dailyData.recommendationClicks?.quickPick || 0,
        },
        bestValue: {
            rendered: dailyData.decisionBlocksRendered?.bestValue || 0,
            clicks: dailyData.recommendationClicks?.bestValue || 0,
        },
    };

    const topSearchTerm = getTopMetricEntry(dailyData.searchTerms);
    const topUnavailableItem = getTopMetricEntry(dailyData.unavailableItemTapsByItem);
    const topMenuAction = getTopMetricEntry(dailyData.menuActionClicks);

    // Build metrics for AI
    const metrics: DailyDashboardMetrics = {
        period: 'yesterday',
        date,
        menuVisits: dailyData.totalViews || 0,
        itemClicks: dailyData.totalClicks || 0,
        searches: dailyData.totalSearches || 0,
        zeroResultSearches: dailyData.zeroResultSearches || 0,
        unavailableItemTaps: dailyData.totalUnavailableItemTaps || 0,
        menuActionClicks: dailyData.totalMenuActionClicks || 0,
        topSearchTerm: topSearchTerm ? { term: topSearchTerm.key, count: topSearchTerm.count } : undefined,
        topUnavailableItem: topUnavailableItem ? { itemId: topUnavailableItem.key, taps: topUnavailableItem.count } : undefined,
        topMenuAction: topMenuAction ? { action: topMenuAction.key, count: topMenuAction.count } : undefined,
        smartPicksRendered: dailyData.totalDecisionBlocksRendered || 0,
        smartPicksClicks: dailyData.totalRecommendationClicks || 0,
        topItems,
        blockPerformance,
    };

    // Generate AI summary
    const aiSummary = await generateDailyAISummary(metrics);

    // Save to daily document
    const dailyDocId = getAnalyticsDocId.daily(tId, sId, projectId, date);
    const dailyRef = db.collection(ANALYTICS_COLLECTION).doc(dailyDocId);

    await dailyRef.set({
        aiSummary: {
            markdown: aiSummary.markdown,
            bulletPoints: aiSummary.bulletPoints,
            generatedAt: Timestamp.now(),
            promptVersion: 'v1',
        },
    }, { merge: true });

    console.log(`[Daily AI Summary] Saved to ${dailyDocId}`);
}

/**
 * Generate Monthly AI summary and save to monthly document
 * Calm, reassuring tone - max 3 bullets
 */
async function generateAndSaveMonthlyAISummary(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    aggregated: any,
    monthStart: string,
    monthEnd: string,
    daysWithData: number
): Promise<void> {
    // Build top items from recommendationClicksByItem
    const topItems: Array<{ itemId: string; clicks: number }> = [];
    if (aggregated.recommendationClicksByItem) {
        const entries = Object.entries(aggregated.recommendationClicksByItem) as [string, number][];
        entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([itemId, clicks]) => {
                topItems.push({ itemId, clicks });
            });
    }

    // Build block performance
    const blockPerformance = {
        popular: {
            rendered: aggregated.decisionBlocksRendered?.popular || 0,
            clicks: aggregated.recommendationClicks?.popular || 0,
        },
        quickPick: {
            rendered: aggregated.decisionBlocksRendered?.quickPick || 0,
            clicks: aggregated.recommendationClicks?.quickPick || 0,
        },
        bestValue: {
            rendered: aggregated.decisionBlocksRendered?.bestValue || 0,
            clicks: aggregated.recommendationClicks?.bestValue || 0,
        },
    };

    const topSearchTerm = getTopMetricEntry(aggregated.searchTerms);
    const topUnavailableItem = getTopMetricEntry(aggregated.unavailableItemTapsByItem);
    const topMenuAction = getTopMetricEntry(aggregated.menuActionClicks);

    // Build metrics for AI
    const metrics: MonthlyDashboardMetrics = {
        period: 'last_month',
        monthStart,
        monthEnd,
        daysWithData,
        menuVisits: aggregated.totalViews || 0,
        itemClicks: aggregated.totalClicks || 0,
        searches: aggregated.totalSearches || 0,
        zeroResultSearches: aggregated.zeroResultSearches || 0,
        unavailableItemTaps: aggregated.totalUnavailableItemTaps || 0,
        menuActionClicks: aggregated.totalMenuActionClicks || 0,
        topSearchTerm: topSearchTerm ? { term: topSearchTerm.key, count: topSearchTerm.count } : undefined,
        topUnavailableItem: topUnavailableItem ? { itemId: topUnavailableItem.key, taps: topUnavailableItem.count } : undefined,
        topMenuAction: topMenuAction ? { action: topMenuAction.key, count: topMenuAction.count } : undefined,
        smartPicksRendered: aggregated.totalDecisionBlocksRendered || 0,
        smartPicksClicks: aggregated.totalRecommendationClicks || 0,
        topItems,
        blockPerformance,
    };

    // Generate AI summary
    const aiSummary = await generateMonthlyAISummary(metrics);

    // Save to monthly document
    const monthlyDocId = getAnalyticsDocId.monthly(tId, sId, projectId, new Date(monthStart));
    const monthlyRef = db.collection(ANALYTICS_COLLECTION).doc(monthlyDocId);

    await monthlyRef.set({
        aiSummary: {
            markdown: aiSummary.markdown,
            bulletPoints: aiSummary.bulletPoints,
            generatedAt: Timestamp.now(),
            promptVersion: 'v1',
        },
    }, { merge: true });

    console.log(`[Monthly AI Summary] Saved to ${monthlyDocId}`);
}

// Note: getISOWeek moved to constants/database.ts

/**
 * Manual trigger for testing/backfill
 */
export const triggerCustomerAnalyticsManually = onCall({
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
}, async (request) => {
    // Require authentication
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Must be authenticated to trigger aggregation.'
        );
    }

    const { tId, sId, projectId, forceWeekly, forceMonthly } = request.data || {};

    console.log(`[Manual Trigger] User: ${request.auth.uid}, Project: ${tId}_${sId}_${projectId}`);

    const db = firestoreAdmin;
    try {
        // If specific project provided, only process that one
        if (tId && sId && projectId) {
            const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
            const storeSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores?.[String(sId)] : null;
            const timeZone = storeSummary?.timeZone;
            const { yesterday, yesterdayStr } = buildAggregationContext(new Date(), timeZone);
            // Get yesterday's daily doc
            const dailyDocId = getAnalyticsDocId.daily(tId, sId, projectId, yesterdayStr);
            const dailyDoc = await db.collection(ANALYTICS_COLLECTION).doc(dailyDocId).get();

            if (dailyDoc.exists) {
                await updateSummaryDocument(db, tId, sId, projectId, dailyDoc.data() as DailyMetrics);
            }

            if (forceWeekly) {
                await createWeeklyRollup(db, tId, sId, projectId, yesterday);
            }

            if (forceMonthly) {
                await createMonthlyRollup(db, tId, sId, projectId, yesterday);
            }

            const deletedCount = await cleanupOldDocuments(db, tId, sId, projectId);

            return {
                status: 'success',
                message: `Processed project ${tId}_${sId}_${projectId}`,
                summaryUpdated: dailyDoc.exists,
                weeklyRollup: forceWeekly || false,
                monthlyRollup: forceMonthly || false,
                documentsDeleted: deletedCount,
            };
        }

        // Otherwise, trigger full aggregation (same as scheduled)
        return {
            status: 'error',
            message: 'Please provide tId, sId, and projectId for manual trigger',
        };

    } catch (error) {
        throw new HttpsError(
            'internal',
            'Aggregation failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        );
    }
});
