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
 * Runtime boundary: retained for compatibility, but not currently exported or
 * scheduled. Keep dormant until exact visitor counters and an activation gate exist.
 *
 * @see __docs__/trust-health-signal/trust-health-signal_impl.md
 * @see __docs__/loyalty-health-signal/loyalty-health-signal_impl.md
 * @see __docs__/risk-decline-detection/risk-decline-detection_impl.md
 */

import * as functions from 'firebase-functions';
import { FieldPath } from 'firebase-admin/firestore';
import { DB_COLLECTIONS, getAnalyticsDocId } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';

const logger = functions.logger;
const HEALTH_SIGNAL_WINDOW_DAYS = 56;
const MAX_DAILY_ANALYTICS_DOCS_PER_STORE = 1_000;
const STORE_PAGE_SIZE = 200;
const MAX_STORE_PAGES = 100;
const ANALYTICS_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    localDate: string;
    totalViews: number;
    uniqueVisitors: number;
    directVisits: number;
    totalActions: number;
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Get a bounded daily analytics window for a store.
 * This is a direct Firestore query and must remain dormant until activation cost is approved.
 */
function normalizeNumericScopeDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) && String(numeric) === raw ? raw : null;
}

function readNonNegativeInteger(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizeAnalyticsDateKey(value: unknown): string | null {
    if (typeof value !== 'string' || !ANALYTICS_DATE_KEY_PATTERN.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
        ? null
        : value;
}

function normalizeDailyAnalyticsDocument(
    id: string,
    data: Record<string, unknown>,
    expectedTId: string,
    expectedSId: string,
): DailyAnalyticsSummary | null {
    const projectId = typeof data.projectId === 'string' ? data.projectId : '';
    const localDate = normalizeAnalyticsDateKey(data.localDate ?? data.date);
    if (
        !projectId
        || !localDate
        || String(data.tId ?? '') !== expectedTId
        || String(data.sId ?? '') !== expectedSId
        || data.grain !== 'daily'
        || data.analyticsScope !== 'customer'
        || data.surface !== 'menu'
        || id !== getAnalyticsDocId.daily(expectedTId, expectedSId, projectId, localDate)
    ) return null;

    const totalViews = readNonNegativeInteger(data.totalMenuViews ?? data.totalViews);
    const uniqueVisitors = readNonNegativeInteger(data.uniqueVisitors);
    const entrySources = data.viewsByEntrySource && typeof data.viewsByEntrySource === 'object'
        && !Array.isArray(data.viewsByEntrySource)
        ? data.viewsByEntrySource as Record<string, unknown>
        : null;
    const directVisits = readNonNegativeInteger(data.directVisits)
        ?? readNonNegativeInteger(entrySources?.direct);
    const totalActions = readNonNegativeInteger(
        data.totalActions ?? data.totalClicks ?? data.totalMenuActionClicks ?? 0,
    );

    // These signals claim to use exact unique/direct counts. Missing fields
    // must hide the signal instead of fabricating percentages from page views.
    if (totalViews === null || uniqueVisitors === null || directVisits === null || totalActions === null) {
        return null;
    }

    return {
        id,
        localDate,
        totalViews,
        uniqueVisitors,
        directVisits,
        totalActions,
    };
}

async function getDailyAnalytics(
    tId: string,
    sId: string,
    days: number,
): Promise<DailyAnalyticsSummary[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];

    const analyticsRef = firestoreAdmin.collection(DB_COLLECTIONS.ANALYTICS);
    const snapshot = await analyticsRef
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('grain', '==', 'daily')
        .where('localDate', '>=', cutoffStr)
        .where('localDate', '<=', todayStr)
        .orderBy('localDate', 'asc')
        .limit(MAX_DAILY_ANALYTICS_DOCS_PER_STORE + 1)
        .get();

    if (snapshot.size > MAX_DAILY_ANALYTICS_DOCS_PER_STORE) {
        logger.warn('[HealthSignals] Analytics window rejected at document limit', {
            failureCode: 'HEALTH_SIGNALS_ANALYTICS_WINDOW_LIMIT_EXCEEDED',
            tenantId: getAnalyticsIdContext(tId),
            storeId: getAnalyticsIdContext(sId),
            maxDocuments: MAX_DAILY_ANALYTICS_DOCS_PER_STORE,
        });
        return [];
    }

    const normalizedRows: DailyAnalyticsSummary[] = [];
    let malformedMenuRow = false;
    for (const doc of snapshot.docs) {
        const data = doc.data() || {};
        if (data.surface !== 'menu') continue;
        const normalized = normalizeDailyAnalyticsDocument(doc.id, doc.data() || {}, tId, sId);
        if (!normalized) {
            malformedMenuRow = true;
            continue;
        }
        normalizedRows.push(normalized);
    }

    const dates = normalizedRows.map((row) => row.localDate);
    const hasMultipleProjectRowsForDate = new Set(dates).size !== dates.length;
    if (malformedMenuRow || hasMultipleProjectRowsForDate) {
        logger.warn('[HealthSignals] Analytics window rejected as incomplete or non-additive', {
            failureCode: 'HEALTH_SIGNALS_ANALYTICS_WINDOW_INVALID',
            tenantId: getAnalyticsIdContext(tId),
            storeId: getAnalyticsIdContext(sId),
            malformedMenuRow,
            hasMultipleProjectRowsForDate,
        });
        return [];
    }

    return normalizedRows;
}

/**
 * Group daily analytics into weekly buckets.
 */
function groupByWeek(dailyDocs: DailyAnalyticsSummary[]): WeeklyMetrics[] {
    const dayMap = new Map<string, Omit<DailyAnalyticsSummary, 'id'>>();
    for (const doc of dailyDocs) {
        const existing = dayMap.get(doc.localDate) || {
            localDate: doc.localDate,
            totalViews: 0,
            uniqueVisitors: 0,
            directVisits: 0,
            totalActions: 0,
        };
        existing.totalViews += doc.totalViews;
        existing.uniqueVisitors += doc.uniqueVisitors;
        existing.directVisits += doc.directVisits;
        existing.totalActions += doc.totalActions;
        dayMap.set(doc.localDate, existing);
    }

    const weekMap = new Map<string, WeeklyMetrics>();

    for (const doc of dayMap.values()) {
        const date = new Date(`${doc.localDate}T00:00:00.000Z`);
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
        week.uniqueVisitors += doc.uniqueVisitors;
        week.directVisits += doc.directVisits;
        week.totalActions += doc.totalActions;
        week.daysWithData += 1;
    }

    // Sort by week start (oldest first)
    return Array.from(weekMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function getISOWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function isSameISOWeek(previousComputedAt: unknown, currentDate: Date): boolean {
    if (typeof previousComputedAt !== 'string') return false;
    const previousDate = new Date(previousComputedAt);
    if (Number.isNaN(previousDate.getTime())) return false;
    return getISOWeekStart(previousDate).getTime() === getISOWeekStart(currentDate).getTime();
}

function getRecentQualifyingWeeks(weeks: WeeklyMetrics[], currentDate: Date): WeeklyMetrics[] {
    const currentWeekStartMillis = getISOWeekStart(currentDate).getTime();
    const recent = weeks
        .filter((week) => {
            const weekStart = new Date(`${week.weekStart}T00:00:00.000Z`).getTime();
            return Number.isFinite(weekStart) && weekStart < currentWeekStartMillis;
        })
        .slice(-4);
    if (recent.length < 4 || recent.some((week) => week.uniqueVisitors < 50)) return [];

    for (let index = 1; index < recent.length; index += 1) {
        const previous = new Date(`${recent[index - 1].weekStart}T00:00:00.000Z`).getTime();
        const current = new Date(`${recent[index].weekStart}T00:00:00.000Z`).getTime();
        if (current - previous !== 7 * 24 * 60 * 60 * 1000) return [];
    }
    return recent;
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

function computeTrustHealth(weeks: WeeklyMetrics[], currentDate: Date): HealthSignalState {
    const computedAt = currentDate.toISOString();
    // Visibility threshold: 50+ unique visitors/week for 4+ consecutive weeks
    const recent = getRecentQualifyingWeeks(weeks, currentDate);
    if (recent.length < 4) {
        return { state: 'stable', visible: false, dataPoints: 0, computedAt };
    }

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
        dataPoints: recent.length,
        computedAt,
    };
}

// ================================================================
// LOYALTY HEALTH COMPUTATION (Pillar 5)
// ================================================================

function computeLoyaltyHealth(weeks: WeeklyMetrics[], currentDate: Date): HealthSignalState {
    const computedAt = currentDate.toISOString();
    const recent = getRecentQualifyingWeeks(weeks, currentDate);
    if (recent.length < 4) {
        return { state: 'stable', visible: false, dataPoints: 0, computedAt };
    }

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
        dataPoints: recent.length,
        computedAt,
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
    currentDate = new Date(),
): HealthSignalState {
    const computedAt = currentDate.toISOString();
    // Prerequisites: both trust and loyalty must be visible
    if (!trust.visible || !loyalty.visible) {
        return { state: 'stable', visible: false, consecutiveWeakWeeks: 0, computedAt };
    }

    const trustWeak = trust.state === 'weak';
    const loyaltyWeak = loyalty.state === 'weak';

    // Use the same four completed, consecutive, qualifying weeks as trust and
    // loyalty. A partial current week must not create a false decline signal.
    const recent = getRecentQualifyingWeeks(weeks, currentDate);
    let engagementDeclining = false;
    if (recent.length >= 4) {
        const recentActions = (recent[2].totalActions + recent[3].totalActions) / 2;
        const previousActions = (recent[0].totalActions + recent[1].totalActions) / 2;
        engagementDeclining = previousActions > 0 && (recentActions / previousActions) < 0.8;
    }

    // Count consecutive weak weeks
    const previousWeakWeeks = previousRisk?.consecutiveWeakWeeks;
    const prevWeakWeeks = Number.isSafeInteger(previousWeakWeeks) && Number(previousWeakWeeks) >= 0
        ? Number(previousWeakWeeks)
        : 0;
    const anyWeak = trustWeak || loyaltyWeak || engagementDeclining;
    const sameWeek = isSameISOWeek(previousRisk?.computedAt, currentDate);
    const consecutiveWeakWeeks = anyWeak
        ? sameWeek
            ? Math.max(1, prevWeakWeeks)
            : prevWeakWeeks + 1
        : 0;

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
        computedAt,
    };
}

// ================================================================
// MAIN: Process all stores
// ================================================================

/**
 * Process health signals for all active stores.
 * Retained dormant. Do not wire it until the exact-metric activation gate is approved.
 */
export async function processHealthSignalsForAllStores(): Promise<{
    processed: number;
    updated: number;
    errors: number;
}> {
    const result = { processed: 0, updated: 0, errors: 0 };

    try {
        let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
        let reachedPageLimit = true;

        for (let page = 0; page < MAX_STORE_PAGES; page += 1) {
            let storesQuery = firestoreAdmin
                .collection(DB_COLLECTIONS.STORES)
                .where('active', '==', true)
                .orderBy(FieldPath.documentId())
                .limit(STORE_PAGE_SIZE);
            if (cursor) storesQuery = storesQuery.startAfter(cursor);

            const storesSnapshot = await storesQuery.get();
            if (storesSnapshot.empty) {
                reachedPageLimit = false;
                break;
            }

            for (const storeDoc of storesSnapshot.docs) {
                const storeData = storeDoc.data();
                const tId = normalizeNumericScopeDocumentId(storeData.tenantId ?? storeData.tId);
                const sId = normalizeNumericScopeDocumentId(storeData.storeId ?? storeData.sId);

                if (!tId || !sId || storeDoc.id !== sId) {
                    logger.warn('[HealthSignals] Store identity invalid; skipping', {
                        documentId: getAnalyticsIdContext(storeDoc.id),
                        tenantId: getAnalyticsIdContext(tId),
                        storeId: getAnalyticsIdContext(sId),
                    });
                    result.errors++;
                    continue;
                }
                result.processed++;

                try {
                    // Read the bounded current project-scoped daily window. Rows
                    // are admitted only after their embedded identity matches.
                    const dailyDocs = await getDailyAnalytics(tId, sId, HEALTH_SIGNAL_WINDOW_DAYS);
                    const weeks = groupByWeek(dailyDocs);
                    const existingSignals = storeData.healthSignals && typeof storeData.healthSignals === 'object'
                        && !Array.isArray(storeData.healthSignals)
                        ? storeData.healthSignals as Record<string, HealthSignalState | undefined>
                        : {};
                    const computationDate = new Date();

                    // Compute all three signals from exact counters only.
                    const trustState = computeTrustHealth(weeks, computationDate);
                    const loyaltyState = computeLoyaltyHealth(weeks, computationDate);
                    const riskState = computeRiskState(
                        trustState,
                        loyaltyState,
                        weeks,
                        existingSignals.risk,
                        computationDate,
                    );

                    // If prior signals exist but the exact input window has aged
                    // out, write hidden states so stale owner truth is not retained.
                    const hasVisibleSignal = trustState.visible || loyaltyState.visible || riskState.visible;
                    const hadSignals = Boolean(
                        existingSignals.trust || existingSignals.loyalty || existingSignals.risk,
                    );

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

            cursor = storesSnapshot.docs[storesSnapshot.docs.length - 1] || null;
            if (storesSnapshot.size < STORE_PAGE_SIZE || !cursor) {
                reachedPageLimit = false;
                break;
            }
        }

        if (reachedPageLimit) {
            logger.warn('[HealthSignals] Active-store scan reached bounded page limit', {
                maxStores: STORE_PAGE_SIZE * MAX_STORE_PAGES,
            });
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

export function normalizeHealthSignalDailyDocumentForTest(
    id: string,
    data: Record<string, unknown>,
    tId: string,
    sId: string,
): DailyAnalyticsSummary | null {
    return normalizeDailyAnalyticsDocument(id, data, tId, sId);
}

export function groupHealthSignalDailyDocumentsForTest(
    dailyDocs: DailyAnalyticsSummary[],
): WeeklyMetrics[] {
    return groupByWeek(dailyDocs);
}

export function getRecentQualifyingHealthSignalWeeksForTest(
    weeks: WeeklyMetrics[],
    currentDate: Date,
): WeeklyMetrics[] {
    return getRecentQualifyingWeeks(weeks, currentDate);
}

export function computeRiskStateForTest(
    trust: HealthSignalState,
    loyalty: HealthSignalState,
    weeks: WeeklyMetrics[],
    previousRisk: HealthSignalState | undefined,
    currentDate: Date,
): HealthSignalState {
    return computeRiskState(trust, loyalty, weeks, previousRisk, currentDate);
}
