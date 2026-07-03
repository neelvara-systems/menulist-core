/**
 * Health Signals Computation — Weekly Aggregation (Pillars 4-6)
 *
 * Computes privacy-safe health indicators from existing analytics data:
 * - Trust Health Signal (Pillar 4): visitor volume, direct ratio, engagement, consistency
 * - Loyalty Health Signal (Pillar 5): return ratio, visit frequency, loyalty trend
 * - Risk/Decline Detection (Pillar 6): meta-signal combining trust + loyalty + engagement
 *
 * All signals are aggregate-only. No individual visitor tracking.
 * Results stored as `healthSignals` field on existing store document (zero new collections).
 *
 * Schedule: Weekly (Sunday 3 AM UTC) — called from masterScheduler or standalone
 *
 * @see __docs__/trust-health-signal/trust-health-signal_impl.md
 * @see __docs__/loyalty-health-signal/loyalty-health-signal_impl.md
 * @see __docs__/risk-decline-detection/risk-decline-detection_impl.md
 */

import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';

const logger = functions.logger;

// ================================================================
// TYPES
// ================================================================

interface HealthSignalState {
    state: string;
    computedAt: string;
    visible: boolean;
    dataPoints?: number;
    consecutiveWeakWeeks?: number;
}

interface WeeklyMetrics {
    weekStart: string;
    totalViews: number;
    uniqueVisitors: number;
    directVisits: number;
    totalActions: number;
    daysWithData: number;
}

interface DailyAnalyticsSummary {
    id: string;
    totalViews: number;
    uniqueVisitors?: number;
    directVisits?: number;
    totalActions: number;
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Get daily analytics docs for a store over the last N days.
 * Reads from existing analytics collection (zero new reads beyond what's already cached).
 */
async function getDailyAnalytics(
    tId: number,
    sId: number,
    days: number,
): Promise<DailyAnalyticsSummary[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD

    const analyticsRef = firestoreAdmin.collection(DB_COLLECTIONS.ANALYTICS);

    // Daily analytics docs follow pattern: {tId}_{sId}_daily_{YYYY-MM-DD}
    // or {tId}_{sId}_menu_daily_{YYYY-MM-DD}
    const prefix = `${tId}_${sId}_menu_daily_`;
    const snapshot = await analyticsRef
        .where('__name__', '>=', prefix + cutoffStr)
        .where('__name__', '<=', prefix + '\uf8ff')
        .get();

    return snapshot.docs.map((doc) => {
        const data = doc.data() || {};
        const totalViews = Number(data.totalMenuViews || data.totalViews || 0);

        return {
            id: doc.id,
            totalViews: Number.isFinite(totalViews) ? totalViews : 0,
            uniqueVisitors: Number.isFinite(Number(data.uniqueVisitors)) ? Number(data.uniqueVisitors) : undefined,
            directVisits: Number.isFinite(Number(data.directVisits)) ? Number(data.directVisits) : undefined,
            totalActions: Number(data.totalActions || data.totalClicks || 0),
        };
    });
}

/**
 * Group daily analytics into weekly buckets.
 */
function groupByWeek(dailyDocs: DailyAnalyticsSummary[]): WeeklyMetrics[] {
    const weekMap = new Map<string, WeeklyMetrics>();

    for (const doc of dailyDocs) {
        // Extract date from doc id (format: tId_sId_menu_daily_YYYY-MM-DD)
        const parts = doc.id.split('_');
        const dateStr = parts[parts.length - 1];
        if (!dateStr) continue;

        const date = new Date(dateStr);
        // ISO week start (Monday)
        const weekStart = getISOWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, {
                weekStart: weekKey,
                totalViews: 0,
                uniqueVisitors: 0,
                directVisits: 0,
                totalActions: 0,
                daysWithData: 0,
            });
        }

        const week = weekMap.get(weekKey)!;
        week.totalViews += doc.totalViews;
        week.uniqueVisitors += (doc.uniqueVisitors || Math.ceil(doc.totalViews * 0.7));
        week.directVisits += (doc.directVisits || Math.ceil(doc.totalViews * 0.4));
        week.totalActions += doc.totalActions;
        week.daysWithData += 1;
    }

    // Sort by week start (oldest first)
    return Array.from(weekMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function getISOWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Normalize a value to 0-1 range using min/max bounds.
 */
function normalize(value: number, min: number, max: number): number {
    if (max <= min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// ================================================================
// TRUST HEALTH COMPUTATION (Pillar 4)
// ================================================================

function computeTrustHealth(weeks: WeeklyMetrics[], previousState?: HealthSignalState): HealthSignalState {
    // Visibility threshold: 50+ unique visitors/week for 4+ consecutive weeks
    const qualifyingWeeks = weeks.filter(w => w.uniqueVisitors >= 50);
    if (qualifyingWeeks.length < 4) {
        return { state: 'stable', visible: false, dataPoints: 0, computedAt: new Date().toISOString() };
    }

    const recent = qualifyingWeeks.slice(-4); // Last 4 qualifying weeks

    // Signal 1: Volume Trend (compare last 2 weeks avg vs previous 2 weeks avg)
    const recentAvg = (recent[2].totalViews + recent[3].totalViews) / 2;
    const previousAvg = (recent[0].totalViews + recent[1].totalViews) / 2;
    const volumeTrend = previousAvg > 0 ? normalize(recentAvg / previousAvg, 0.5, 1.5) : 0.5;

    // Signal 2: Direct Visit Ratio
    const totalDirect = recent.reduce((sum, w) => sum + w.directVisits, 0);
    const totalViews = recent.reduce((sum, w) => sum + w.totalViews, 0);
    const directRatio = totalViews > 0 ? totalDirect / totalViews : 0;

    // Signal 3: Engagement Depth (actions per view)
    const totalActions = recent.reduce((sum, w) => sum + w.totalActions, 0);
    const engagementDepth = totalViews > 0 ? normalize(totalActions / totalViews, 0, 0.5) : 0;

    // Signal 4: Consistency (inverse coefficient of variation of daily visitors)
    const weeklyViews = recent.map(w => w.totalViews);
    const mean = weeklyViews.reduce((a, b) => a + b, 0) / weeklyViews.length;
    const variance = weeklyViews.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / weeklyViews.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    const consistency = normalize(1 - cv, 0, 1);

    // Weighted score
    const score = volumeTrend * 0.30 + directRatio * 0.25 + engagementDepth * 0.25 + consistency * 0.20;

    // Map to state
    const state = score >= 0.65 ? 'strong' : score >= 0.40 ? 'stable' : 'weak';

    return {
        state,
        visible: true,
        dataPoints: qualifyingWeeks.length,
        computedAt: new Date().toISOString(),
    };
}

// ================================================================
// LOYALTY HEALTH COMPUTATION (Pillar 5)
// ================================================================

function computeLoyaltyHealth(weeks: WeeklyMetrics[], previousState?: HealthSignalState): HealthSignalState {
    const qualifyingWeeks = weeks.filter(w => w.uniqueVisitors >= 50);
    if (qualifyingWeeks.length < 4) {
        return { state: 'stable', visible: false, dataPoints: 0, computedAt: new Date().toISOString() };
    }

    const recent = qualifyingWeeks.slice(-4);

    // Signal 1: Return Ratio (totalViews / uniqueVisitors — higher = more returning visitors)
    const totalViews = recent.reduce((sum, w) => sum + w.totalViews, 0);
    const totalUnique = recent.reduce((sum, w) => sum + w.uniqueVisitors, 0);
    const returnRatio = totalUnique > 0 ? normalize(totalViews / totalUnique, 1, 3) : 0;

    // Signal 2: Visit Frequency (average views per unique visitor per week)
    const weeklyFrequencies = recent.map(w => w.uniqueVisitors > 0 ? w.totalViews / w.uniqueVisitors : 0);
    const avgFrequency = weeklyFrequencies.reduce((a, b) => a + b, 0) / weeklyFrequencies.length;
    const frequency = normalize(avgFrequency, 1, 2.5);

    // Signal 3: Loyalty Trend (is return ratio improving?)
    const recentReturnRatio = (recent[2].totalViews + recent[3].totalViews) /
        Math.max(1, recent[2].uniqueVisitors + recent[3].uniqueVisitors);
    const previousReturnRatio = (recent[0].totalViews + recent[1].totalViews) /
        Math.max(1, recent[0].uniqueVisitors + recent[1].uniqueVisitors);
    const loyaltyTrend = previousReturnRatio > 0
        ? normalize(recentReturnRatio / previousReturnRatio, 0.7, 1.3)
        : 0.5;

    const score = returnRatio * 0.40 + frequency * 0.30 + loyaltyTrend * 0.30;
    const state = score >= 0.60 ? 'strong' : score >= 0.35 ? 'stable' : 'weak';

    return {
        state,
        visible: true,
        dataPoints: qualifyingWeeks.length,
        computedAt: new Date().toISOString(),
    };
}

// ================================================================
// RISK / DECLINE DETECTION (Pillar 6)
// ================================================================

function computeRiskState(
    trust: HealthSignalState,
    loyalty: HealthSignalState,
    weeks: WeeklyMetrics[],
    previousRisk?: HealthSignalState,
): HealthSignalState {
    // Prerequisites: both trust and loyalty must be visible
    if (!trust.visible || !loyalty.visible) {
        return { state: 'stable', visible: false, consecutiveWeakWeeks: 0, computedAt: new Date().toISOString() };
    }

    const trustWeak = trust.state === 'weak';
    const loyaltyWeak = loyalty.state === 'weak';

    // Engagement trend (last 2 weeks vs previous 2 weeks)
    const recent = weeks.slice(-4);
    let engagementDeclining = false;
    if (recent.length >= 4) {
        const recentActions = (recent[2].totalActions + recent[3].totalActions) / 2;
        const previousActions = (recent[0].totalActions + recent[1].totalActions) / 2;
        engagementDeclining = previousActions > 0 && (recentActions / previousActions) < 0.8;
    }

    // Count consecutive weak weeks
    const prevWeakWeeks = previousRisk?.consecutiveWeakWeeks || 0;
    const anyWeak = trustWeak || loyaltyWeak || engagementDeclining;
    const consecutiveWeakWeeks = anyWeak ? prevWeakWeeks + 1 : 0;

    // Determine state
    let state: 'stable' | 'watch' | 'at_risk' = 'stable';
    if (trustWeak && loyaltyWeak) state = 'at_risk';
    else if (consecutiveWeakWeeks >= 3) state = 'at_risk';
    else if (trustWeak || loyaltyWeak) state = 'watch';
    else if (engagementDeclining) state = 'watch';

    return {
        state,
        visible: true,
        consecutiveWeakWeeks,
        computedAt: new Date().toISOString(),
    };
}

// ================================================================
// MAIN: Process all stores
// ================================================================

/**
 * Process health signals for all active stores.
 * Called weekly by masterScheduler or standalone scheduler.
 */
export async function processHealthSignalsForAllStores(): Promise<{
    processed: number;
    updated: number;
    errors: number;
}> {
    const result = { processed: 0, updated: 0, errors: 0 };

    try {
        // Get all active stores
        const storesSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .where('active', '==', true)
            .get();

        logger.info(`[HealthSignals] Processing ${storesSnapshot.size} active stores`);

        for (const storeDoc of storesSnapshot.docs) {
            const storeData = storeDoc.data();
            const tId = storeData.tenantId;
            const sId = storeData.storeId;

            if (!tId || !sId) continue;
            result.processed++;

            try {
                // Get last 8 weeks of daily analytics
                const dailyDocs = await getDailyAnalytics(tId, sId, 56);
                if (dailyDocs.length === 0) continue; // No data — skip silently

                const weeks = groupByWeek(dailyDocs);
                const existingSignals = storeData.healthSignals || {};

                // Compute all three signals
                const trustState = computeTrustHealth(weeks, existingSignals.trust);
                const loyaltyState = computeLoyaltyHealth(weeks, existingSignals.loyalty);
                const riskState = computeRiskState(trustState, loyaltyState, weeks, existingSignals.risk);

                // Only write if something changed or is visible
                const hasVisibleSignal = trustState.visible || loyaltyState.visible || riskState.visible;
                const hadSignals = existingSignals.trust || existingSignals.loyalty || existingSignals.risk;

                if (hasVisibleSignal || hadSignals) {
                    await storeDoc.ref.update({
                        'healthSignals.trust': trustState,
                        'healthSignals.loyalty': loyaltyState,
                        'healthSignals.risk': riskState,
                    });
                    result.updated++;
                }
            } catch (storeError) {
                logger.warn('[HealthSignals] Store processing failed', {
                    tenantId: getAnalyticsIdContext(tId),
                    storeId: getAnalyticsIdContext(sId),
                    error: getAnalyticsErrorContext(storeError),
                });
                result.errors++;
            }
        }

        logger.info(`[HealthSignals] Complete: ${result.processed} processed, ${result.updated} updated, ${result.errors} errors`);
    } catch (error) {
        logger.error('[HealthSignals] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }

    return result;
}
