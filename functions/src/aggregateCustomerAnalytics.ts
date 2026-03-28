import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DB_COLLECTIONS, getAnalyticsDocId, getMonthDateRange, getWeekDateRange, TTL_CONFIG } from './constants/database';
import { firestoreAdmin } from './firebaseAdmin';
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
 * Runs daily at 3:00 AM UTC to aggregate customer analytics (menu views, clicks, etc.)
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
 * firebase deploy --only functions:aggregateCustomerAnalytics
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
    totalOrders?: number;
    totalRevenue?: number;
    totalSearches?: number;
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

/**
 * Main scheduled function - runs daily at 3:00 AM UTC
 */
export const aggregateCustomerAnalytics = onSchedule({
    schedule: '0 3 * * *',  // Daily at 3:00 AM UTC
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
}, async () => {
    console.log('=== Customer Analytics Aggregation Started ===');
    console.log('Triggered at:', new Date().toISOString());

    const db = firestoreAdmin;
    const results: AggregationResults = {
        totalProjects: 0,
        summaryUpdates: 0,
        weeklyRollups: 0,
        monthlyRollups: 0,
        dailyAiSummaries: 0,
        weeklyAiSummaries: 0,
        monthlyAiSummaries: 0,
        documentsDeleted: 0,
        errors: []
    };

    try {
        // Get yesterday's date (we aggregate yesterday's data)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Check if today is Monday (for weekly rollup)
        const today = new Date();
        const isMonday = today.getDay() === 1;

        // Check if today is 1st of month (for monthly rollup)
        const isFirstOfMonth = today.getDate() === 1;

        // Get all unique project keys from daily documents
        // Query pattern: Find all documents with _daily_ in the name from yesterday
        const dailyDocsQuery = await db.collection(ANALYTICS_COLLECTION)
            .where('__name__', '>=', `0_0_`)  // Start from beginning
            .where('__name__', '<=', `~`)     // End at the end
            .get();

        // Extract unique project keys from document IDs
        const projectKeys = new Set<string>();
        const yesterdayDocs = new Map<string, any>();

        dailyDocsQuery.docs.forEach(doc => {
            const docId = doc.id;
            // Parse: {tId}_{sId}_{projectId}_daily_{date}
            const match = docId.match(/^(\d+)_(\d+)_([^_]+)_daily_(\d{4}-\d{2}-\d{2})$/);
            if (match) {
                const [, tId, sId, projectId, date] = match;
                const projectKey = `${tId}_${sId}_${projectId}`;
                projectKeys.add(projectKey);

                // Store yesterday's doc for aggregation
                if (date === yesterdayStr) {
                    yesterdayDocs.set(projectKey, { id: doc.id, data: doc.data() });
                }
            }
        });

        results.totalProjects = projectKeys.size;
        console.log(`Found ${results.totalProjects} unique projects to process`);

        // Process each project
        for (const projectKey of projectKeys) {
            const [tId, sId, projectId] = projectKey.split('_');

            try {
                // 1. Update summary from yesterday's data
                const yesterdayDoc = yesterdayDocs.get(projectKey);
                if (yesterdayDoc) {
                    await updateSummaryDocument(db, tId, sId, projectId, yesterdayDoc.data);
                    results.summaryUpdates++;
                    console.log(`  ✓ Summary updated for ${projectKey}`);
                }

                // 2. Weekly rollup (on Mondays)
                if (isMonday) {
                    const weeklyAggregated = await createWeeklyRollup(db, tId, sId, projectId, yesterday);
                    results.weeklyRollups++;
                    console.log(`  ✓ Weekly rollup created for ${projectKey}`);

                    // 2b. Generate Weekly AI summary (only on Mondays, after weekly rollup)
                    if (weeklyAggregated.aggregated.totalViews > 0) {
                        try {
                            await generateAndSaveWeeklyAISummary(
                                db, tId, sId, projectId,
                                weeklyAggregated.aggregated,
                                weeklyAggregated.weekStart,
                                weeklyAggregated.weekEnd
                            );
                            results.weeklyAiSummaries++;
                            console.log(`  ✓ Weekly AI summary generated for ${projectKey}`);
                        } catch (aiError) {
                            // Don't fail the whole process if AI summary fails
                            console.error(`  ⚠ Weekly AI summary failed for ${projectKey}:`, aiError);
                        }
                    }
                }

                // 3. Monthly rollup (on 1st of month)
                if (isFirstOfMonth) {
                    const monthlyAggregated = await createMonthlyRollup(db, tId, sId, projectId, yesterday);
                    results.monthlyRollups++;
                    console.log(`  ✓ Monthly rollup created for ${projectKey}`);

                    // 3b. Generate Monthly AI summary
                    if (monthlyAggregated.aggregated.totalViews > 0) {
                        try {
                            await generateAndSaveMonthlyAISummary(
                                db, tId, sId, projectId,
                                monthlyAggregated.aggregated,
                                monthlyAggregated.monthStart,
                                monthlyAggregated.monthEnd,
                                monthlyAggregated.daysWithData
                            );
                            results.monthlyAiSummaries++;
                            console.log(`  ✓ Monthly AI summary generated for ${projectKey}`);
                        } catch (aiError) {
                            console.error(`  ⚠ Monthly AI summary failed for ${projectKey}:`, aiError);
                        }
                    }
                }

                // 4. Generate Daily AI summary (every night)
                if (yesterdayDoc && yesterdayDoc.data.totalViews > 0) {
                    try {
                        await generateAndSaveDailyAISummary(db, tId, sId, projectId, yesterdayDoc.data, yesterdayStr);
                        results.dailyAiSummaries++;
                        console.log(`  ✓ Daily AI summary generated for ${projectKey}`);
                    } catch (aiError) {
                        console.error(`  ⚠ Daily AI summary failed for ${projectKey}:`, aiError);
                    }
                }

                // 4. TTL cleanup - delete documents older than 90 days
                const deletedCount = await cleanupOldDocuments(db, tId, sId, projectId);
                results.documentsDeleted += deletedCount;
                if (deletedCount > 0) {
                    console.log(`  ✓ Deleted ${deletedCount} old documents for ${projectKey}`);
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`  ✗ Error processing ${projectKey}:`, errorMessage);
                results.errors.push({ projectKey, error: errorMessage });
            }
        }

        // Log final summary
        console.log('=== Customer Analytics Aggregation Complete ===');
        console.log(`Total Projects: ${results.totalProjects}`);
        console.log(`Summary Updates: ${results.summaryUpdates}`);
        console.log(`Weekly Rollups: ${results.weeklyRollups}`);
        console.log(`Monthly Rollups: ${results.monthlyRollups}`);
        console.log(`Daily AI Summaries: ${results.dailyAiSummaries}`);
        console.log(`Weekly AI Summaries: ${results.weeklyAiSummaries}`);
        console.log(`Monthly AI Summaries: ${results.monthlyAiSummaries}`);
        console.log(`Documents Deleted: ${results.documentsDeleted}`);
        console.log(`Errors: ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.error('Errors:', JSON.stringify(results.errors, null, 2));
        }

    } catch (error) {
        console.error('Critical error in aggregation function:', error);
        throw error;
    }
});

/**
 * Update the overall_summary document with data from a daily document
 */
async function updateSummaryDocument(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    dailyData: DailyMetrics
): Promise<void> {
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, projectId);
    const summaryRef = db.collection(ANALYTICS_COLLECTION).doc(summaryDocId);

    // Prepare incremental updates
    const updates: any = {
        lastUpdated: FieldValue.serverTimestamp(),
        lastAggregatedDate: dailyData.date || new Date().toISOString().split('T')[0],
    };

    // Aggregate numeric totals
    if (dailyData.totalViews) updates.lifetimeTotalViews = FieldValue.increment(dailyData.totalViews);
    if (dailyData.totalClicks) updates.lifetimeTotalClicks = FieldValue.increment(dailyData.totalClicks);
    if (dailyData.totalSessions) updates.lifetimeTotalSessions = FieldValue.increment(dailyData.totalSessions);
    if (dailyData.totalOrders) updates.lifetimeTotalOrders = FieldValue.increment(dailyData.totalOrders);
    if (dailyData.totalRevenue) updates.lifetimeTotalRevenue = FieldValue.increment(dailyData.totalRevenue);
    if (dailyData.totalSearches) updates.lifetimeTotalSearches = FieldValue.increment(dailyData.totalSearches);
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

    await summaryRef.set(updates, { merge: true });
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
): Promise<{ aggregated: any; weekStart: string; weekEnd: string }> {
    // Get week date range from utility
    const { weekStart, weekEnd } = getWeekDateRange(referenceDate);
    const weeklyDocId = getAnalyticsDocId.weekly(tId, sId, projectId, referenceDate);
    const weeklyRef = db.collection(ANALYTICS_COLLECTION).doc(weeklyDocId);

    const dailyDocs = await getDailyDocsInRange(db, tId, sId, projectId, weekStart, weekEnd);

    // Aggregate all daily data
    const aggregated = aggregateDailyDocs(dailyDocs);

    // Save weekly rollup
    await weeklyRef.set({
        tId,
        sId,
        projectId,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        ...aggregated,
        createdOn: FieldValue.serverTimestamp(),
        modifiedOn: FieldValue.serverTimestamp(),
    });

    // Return aggregated data for AI summary
    return {
        aggregated,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
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
        totalOrders: 0,
        totalRevenue: 0,
        totalSearches: 0,
        totalRecommendationClicks: 0,
        // Decision Blocks rendered - for owner dashboard
        totalDecisionBlocksRendered: 0,
        viewsByDevice: {},
        viewsByLocation: {},
        viewsBySource: {},
        clicksByItem: {},
        recommendationClicks: {},
        decisionBlocksRendered: {},
        recommendationClicksByItem: {},
    };

    for (const doc of docs) {
        // Sum numeric totals
        if (doc.totalViews) result.totalViews += doc.totalViews;
        if (doc.totalClicks) result.totalClicks += doc.totalClicks;
        if (doc.totalSessions) result.totalSessions += doc.totalSessions;
        if (doc.totalOrders) result.totalOrders += doc.totalOrders;
        if (doc.totalRevenue) result.totalRevenue += doc.totalRevenue;
        if (doc.totalSearches) result.totalSearches += doc.totalSearches;
        if (doc.totalRecommendationClicks) result.totalRecommendationClicks += doc.totalRecommendationClicks;
        // Decision Blocks rendered
        if (doc.totalDecisionBlocksRendered) result.totalDecisionBlocksRendered += doc.totalDecisionBlocksRendered;

        // Merge map fields
        mergeMapField(result.viewsByDevice, doc.viewsByDevice);
        mergeMapField(result.viewsByLocation, doc.viewsByLocation);
        mergeMapField(result.viewsBySource, doc.viewsBySource);
        mergeMapField(result.clicksByItem, doc.clicksByItem);
        mergeMapField(result.recommendationClicks, doc.recommendationClicks);
        // Decision Blocks breakdown
        mergeMapField(result.decisionBlocksRendered, doc.decisionBlocksRendered);
        mergeMapField(result.recommendationClicksByItem, doc.recommendationClicksByItem);
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

    // Build metrics for AI
    const metrics: OwnerDashboardMetrics = {
        period: 'last_7_days',
        weekStart,
        weekEnd,
        menuVisits: aggregated.totalViews || 0,
        menuVisitsChange,
        itemClicks: aggregated.totalClicks || 0,
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

    // Build metrics for AI
    const metrics: DailyDashboardMetrics = {
        period: 'yesterday',
        date,
        menuVisits: dailyData.totalViews || 0,
        itemClicks: dailyData.totalClicks || 0,
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

    // Build metrics for AI
    const metrics: MonthlyDashboardMetrics = {
        period: 'last_month',
        monthStart,
        monthEnd,
        daysWithData,
        menuVisits: aggregated.totalViews || 0,
        itemClicks: aggregated.totalClicks || 0,
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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        // If specific project provided, only process that one
        if (tId && sId && projectId) {
            // Get yesterday's daily doc
            const dailyDocId = getAnalyticsDocId.daily(tId, sId, projectId, yesterday.toISOString().split('T')[0]);
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
