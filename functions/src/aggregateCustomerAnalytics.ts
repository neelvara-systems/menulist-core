import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { DB_COLLECTIONS, getAnalyticsDocId, getMonthDateRange, getWeekDateRange, TTL_CONFIG } from './constants/database';
import { firestoreAdmin } from './firebaseAdmin';
import { logger as appLogger } from './lib/logger';
import { addDaysToAnalyticsDateKey, getAnalyticsWeekday, parseAnalyticsDateKey } from './utils/analyticsDate';
import { getBusinessAnalyticsDateKey } from './utils/businessDay';
import { getAnalyticsErrorContext, getAnalyticsIdContext } from './analytics/analyticsDiagnostics';
import { CatalogInsightInput, OwnerDashboardAIPayloads, writeDashboardSummaryDocument } from './analytics/dashboardSummaryAggregation';
import {
    AnalyticsAiEntitlement,
    resolveAnalyticsAiEntitlement,
} from './analytics/analyticsAiEntitlements';
import {
    DailyDashboardMetrics,
    generateDailyAISummary,
    generateMonthlyAISummary,
    generateOwnerDashboardSummary,
    MonthlyDashboardMetrics,
    OwnerDashboardMetrics
} from './services/gemini/ownerDashboardSummary';
import { ECOMSAI_PLATFORM_USER_ROLE } from './constants/user';
import { FUNCTION_MAX_INSTANCES } from './config/secrets';
import {
    normalizeOwnerNotificationDocumentId,
} from './sharedData/ownerNotificationDeliveryBoundary';
import {
    normalizeStoreSummaryNumericDocumentId,
    parsePlatformStoreSummary,
} from './sharedData/storeSummaryBoundary';

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
const LATE_EVENT_CORRECTION_DAYS = 1;

// Daily metrics structure (used for type reference in dailyData parameter)
interface DailyMetrics {
    date?: string;
    totalViews?: number;
    totalClicks?: number;
    totalItemViews?: number;
    totalSessions?: number;
    menuSessions?: number;
    engagedSessions?: number;
    intentSessions?: number;
    actionSessions?: number;
    totalSearches?: number;
    zeroResultSearches?: number;
    totalUnavailableItemTaps?: number;
    totalMenuActionClicks?: number;
    totalRecommendationClicks?: number;
    languageTrackingEnabled?: boolean;
    // Decision Blocks rendered - CRITICAL for engagement rate calculation
    totalDecisionBlocksRendered?: number;
    decisionBlocksRendered?: Record<string, number>;  // { popular: n, quickPick: n, bestValue: n }
    viewsByDevice?: Record<string, number>;
    viewsByLocation?: Record<string, number>;
    viewsBySource?: Record<string, number>;
    viewsByMedium?: Record<string, number>;
    viewsByCampaign?: Record<string, number>;
    viewsByContent?: Record<string, number>;
    viewsByEntrySource?: Record<string, number>;
    menuSessionsBySource?: Record<string, number>;
    actionSessionsBySource?: Record<string, number>;
    actionSessionsByOpenHoursState?: Record<string, number>;
    menuActionClicksBySource?: Record<string, number>;
    menuActionClicksByOpenHoursState?: Record<string, number>;
    menuViewsByLanguage?: Record<string, number>;
    menuSessionsByLanguage?: Record<string, number>;
    languageAdoptions?: Record<string, number>;
    attributeFilterInteractions?: Record<string, number>;
    attributeFilterItemViews?: Record<string, number>;
    attributeFilterItemTaps?: Record<string, number>;
    attributeFilterSearches?: Record<string, number>;
    attributeFilterUnavailableTaps?: Record<string, number>;
    attributeFilterActionClicks?: Record<string, number>;
    viewsByCategory?: Record<string, number>;
    clicksByCategory?: Record<string, number>;
    hourlyViews?: Record<string, number>;
    hourlyMenuActionClicks?: Record<string, number>;
    viewsByItem?: Record<string, number>;
    clicksByItem?: Record<string, number>;
    recommendationClicks?: Record<string, number>;
    recommendationClicksByItem?: Record<string, number>;
    searchTerms?: Record<string, number>;
    zeroResultSearchTerms?: Record<string, number>;
    menuActionClicks?: Record<string, number>;
    unavailableItemTapsByItem?: Record<string, number>;
    itemNames?: Record<string, string>;
    categoryNames?: Record<string, string>;
    languageNames?: Record<string, string>;
    attributeFilterNames?: Record<string, string>;

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
const CUSTOMER_ANALYTICS_WEEKLY_AI_SUMMARY_FAILED = 'CUSTOMER_ANALYTICS_WEEKLY_AI_SUMMARY_FAILED';
const CUSTOMER_ANALYTICS_MONTHLY_AI_SUMMARY_FAILED = 'CUSTOMER_ANALYTICS_MONTHLY_AI_SUMMARY_FAILED';
const CUSTOMER_ANALYTICS_DAILY_AI_SUMMARY_FAILED = 'CUSTOMER_ANALYTICS_DAILY_AI_SUMMARY_FAILED';
const CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED = 'CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED';
const CUSTOMER_ANALYTICS_MANUAL_TRIGGER_FAILED = 'CUSTOMER_ANALYTICS_MANUAL_TRIGGER_FAILED';
const CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID = 'CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID';
const CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID = 'CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID';
const ANALYTICS_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const ANALYTICS_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ANALYTICS_CLEANUP_BATCH_SIZE = 400;
const ANALYTICS_NUMERIC_FIELDS: ReadonlyArray<keyof DailyMetrics> = [
    'actionSessions',
    'engagedSessions',
    'intentSessions',
    'menuSessions',
    'totalAppOpens',
    'totalClicks',
    'totalDecisionBlocksRendered',
    'totalInstalled',
    'totalInstallStarted',
    'totalItemViews',
    'totalMenuActionClicks',
    'totalPromptDismissed',
    'totalPromptShown',
    'totalRecommendationClicks',
    'totalSearches',
    'totalSessions',
    'totalUnavailableItemTaps',
    'totalViews',
    'uniqueInstallSessions',
    'zeroResultSearches',
];
const ANALYTICS_NUMERIC_MAP_FIELDS: ReadonlyArray<keyof DailyMetrics> = [
    'actionSessionsByOpenHoursState',
    'actionSessionsBySource',
    'appOpensByPlatform',
    'attributeFilterActionClicks',
    'attributeFilterInteractions',
    'attributeFilterItemTaps',
    'attributeFilterItemViews',
    'attributeFilterSearches',
    'attributeFilterUnavailableTaps',
    'clicksByCategory',
    'clicksByItem',
    'decisionBlocksRendered',
    'hourlyAppOpens',
    'hourlyMenuActionClicks',
    'hourlyPromptShown',
    'hourlyViews',
    'installsByDevice',
    'installsByLocation',
    'installsByPlatform',
    'installsBySource',
    'languageAdoptions',
    'menuActionClicks',
    'menuActionClicksByOpenHoursState',
    'menuActionClicksBySource',
    'menuSessionsByLanguage',
    'menuSessionsBySource',
    'menuViewsByLanguage',
    'recommendationClicks',
    'recommendationClicksByItem',
    'searchTerms',
    'shortcutClicks',
    'unavailableItemTapsByItem',
    'viewsByCampaign',
    'viewsByCategory',
    'viewsByContent',
    'viewsByDevice',
    'viewsByEntrySource',
    'viewsByItem',
    'viewsByLocation',
    'viewsByMedium',
    'viewsBySource',
    'zeroResultSearchTerms',
];
const ANALYTICS_STRING_MAP_FIELDS: ReadonlyArray<keyof DailyMetrics> = [
    'attributeFilterNames',
    'categoryNames',
    'itemNames',
    'languageNames',
];

function isAnalyticsRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAnalyticsProjectId(value: unknown): string | null {
    return typeof value === 'string'
        && value === value.trim()
        && ANALYTICS_PROJECT_ID_PATTERN.test(value)
        ? value
        : null;
}

function normalizeAnalyticsDateKey(value: unknown): string | null {
    if (typeof value !== 'string' || !ANALYTICS_DATE_KEY_PATTERN.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function isValidAnalyticsNumberMap(value: unknown): boolean {
    return value === undefined || (
        isAnalyticsRecord(value)
        && Object.entries(value).every(([key, entry]) => (
            /^[A-Za-z0-9_:-]{1,120}$/.test(key)
            && typeof entry === 'number'
            && Number.isFinite(entry)
            && entry >= 0
        ))
    );
}

function isValidAnalyticsStringMap(value: unknown): boolean {
    return value === undefined || (
        isAnalyticsRecord(value)
        && Object.entries(value).every(([key, entry]) => (
            /^[A-Za-z0-9_:-]{1,120}$/.test(key)
            && typeof entry === 'string'
            && entry.trim().length > 0
            && entry.length <= 120
        ))
    );
}

function normalizeAnalyticsDailyDocument(
    value: unknown,
    expected: { docId: string; projectId: string; sId: string; tId: string; date: string },
): DailyMetrics | null {
    if (!isAnalyticsRecord(value)) return null;
    const date = normalizeAnalyticsDateKey(value.localDate ?? value.date);
    const optionalDate = value.date === undefined ? expected.date : normalizeAnalyticsDateKey(value.date);
    const expectedSurface = expected.projectId === 'customerApp' ? 'customerApp' : 'menu';
    if (
        String(value.tId ?? '') !== expected.tId
        || String(value.sId ?? '') !== expected.sId
        || value.projectId !== expected.projectId
        || value.grain !== 'daily'
        || value.analyticsScope !== 'customer'
        || value.surface !== expectedSurface
        || date !== expected.date
        || optionalDate !== expected.date
        || expected.docId !== getAnalyticsDocId.daily(expected.tId, expected.sId, expected.projectId, expected.date)
    ) return null;

    return normalizeAnalyticsDailyMetrics(value, expected.date);
}

function normalizeAnalyticsDailyMetrics(value: unknown, expectedDate: string): DailyMetrics | null {
    if (!isAnalyticsRecord(value) || normalizeAnalyticsDateKey(value.date ?? expectedDate) !== expectedDate) return null;
    if (
        ANALYTICS_NUMERIC_FIELDS.some((field) => (
            value[field] !== undefined
            && (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || Number(value[field]) < 0)
        ))
        || value.languageTrackingEnabled !== undefined && typeof value.languageTrackingEnabled !== 'boolean'
        || ANALYTICS_NUMERIC_MAP_FIELDS.some((field) => !isValidAnalyticsNumberMap(value[field]))
        || ANALYTICS_STRING_MAP_FIELDS.some((field) => !isValidAnalyticsStringMap(value[field]))
    ) return null;

    return { ...value, date: expectedDate } as DailyMetrics;
}

function assertValidAnalyticsSummaryForSettlement(
    value: unknown,
    expected: { projectId: string; sId: string; tId: string },
): asserts value is Record<string, unknown> {
    if (!isAnalyticsRecord(value)) throw new Error(CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID);
    if (
        value.tId !== undefined && String(value.tId) !== expected.tId
        || value.sId !== undefined && String(value.sId) !== expected.sId
        || value.projectId !== undefined && value.projectId !== expected.projectId
        || value.grain !== undefined && value.grain !== 'summary'
        || value.analyticsScope !== undefined && value.analyticsScope !== 'customer'
    ) throw new Error(CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID);

    for (const [field, entry] of Object.entries(value)) {
        if (
            field.startsWith('lifetime')
            && field !== 'lifetime'
            && (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0)
        ) throw new Error(CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID);
    }
    if (value.lifetime !== undefined) {
        if (
            !isAnalyticsRecord(value.lifetime)
            || Object.values(value.lifetime).some((entry) => (
                typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0
            ))
        ) throw new Error(CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID);
    }
    if (
        ANALYTICS_NUMERIC_MAP_FIELDS.some((field) => !isValidAnalyticsNumberMap(value[field]))
        || ANALYTICS_STRING_MAP_FIELDS.some((field) => !isValidAnalyticsStringMap(value[field]))
        || value.languageTrackingEnabled !== undefined && typeof value.languageTrackingEnabled !== 'boolean'
    ) throw new Error(CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID);

    for (const field of ['firstDataDate', 'lastAggregatedDate', 'lastCorrectionDate'] as const) {
        if (value[field] !== undefined && !normalizeAnalyticsDateKey(value[field])) {
            throw new Error(CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID);
        }
    }
}

function assertValidAnalyticsDashboardIdentity(
    value: unknown,
    expected: { projectId: string; sId: string; tId: string },
): asserts value is Record<string, unknown> {
    const expectedKind = expected.projectId === 'customerApp'
        ? 'customerAppDashboardSummary'
        : 'ownerDashboardSummary';
    if (
        !isAnalyticsRecord(value)
        || String(value.tId ?? '') !== expected.tId
        || String(value.sId ?? '') !== expected.sId
        || value.projectId !== expected.projectId
        || value.kind !== expectedKind
    ) throw new Error('CUSTOMER_ANALYTICS_DASHBOARD_CONTRACT_INVALID');
}

function getDashboardSummaryDocId(tId: string, sId: string, projectId: string): string {
    return `${tId}_${sId}_${projectId}_dashboard_summary`;
}

function toDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

function normalizeDailyRow(date: string, data: Record<string, any>): Record<string, any> {
    return {
        ...data,
        date,
    };
}

function buildAggregationContext(now: Date = new Date(), timeZone?: string, businessDayEndTime?: string) {
    const localTodayStr = getBusinessAnalyticsDateKey(now, timeZone, businessDayEndTime);
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
): Promise<{ invalidDocuments: number; projectIds: Set<string>; yesterdayDocs: Map<string, any> }> {
    const projectIds = new Set<string>(
        knownProjectIds
            .map(normalizeAnalyticsProjectId)
            .filter((projectId): projectId is string => Boolean(projectId))
    );
    const yesterdayDocs = new Map<string, any>();
    let invalidDocuments = 0;

    const analyticsDocsQuery = await db.collection(ANALYTICS_COLLECTION)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('grain', '==', 'daily')
        .where('localDate', '==', yesterdayStr)
        .get();

    analyticsDocsQuery.docs.forEach((doc) => {
        const data = doc.data();
        const projectId = normalizeAnalyticsProjectId(data.projectId);
        if (!projectId) {
            invalidDocuments += 1;
            return;
        }
        if (projectId === OBP_PROJECT_ID) return;

        const normalized = normalizeAnalyticsDailyDocument(data, {
            date: yesterdayStr,
            docId: doc.id,
            projectId,
            sId,
            tId,
        });
        if (!normalized) {
            invalidDocuments += 1;
            return;
        }

        projectIds.add(projectId);
        yesterdayDocs.set(projectId, { id: doc.id, data: normalized });
    });

    return { invalidDocuments, projectIds, yesterdayDocs };
}

export async function aggregateCustomerAnalyticsForStore(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    now: Date = new Date(),
    timeZone?: string,
    businessDayEndTime?: string,
    knownProjectIds: string[] = [],
    analyticsAiEntitlement?: AnalyticsAiEntitlement,
    projectCatalogById: Record<string, CatalogInsightInput> = {},
): Promise<AggregationResults> {
    const settlementDate = addDaysToAnalyticsDateKey(getBusinessAnalyticsDateKey(now, timeZone, businessDayEndTime), -1);
    return aggregateCustomerAnalyticsForStoreDate(db, tId, sId, settlementDate, knownProjectIds, analyticsAiEntitlement, projectCatalogById);
}

export async function aggregateCustomerAnalyticsForStoreDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    knownProjectIds: string[] = [],
    analyticsAiEntitlement: AnalyticsAiEntitlement = resolveAnalyticsAiEntitlement(null),
    projectCatalogById: Record<string, CatalogInsightInput> = {},
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
    const { invalidDocuments, projectIds, yesterdayDocs } = await collectStoreAnalyticsProjects(db, tId, sId, yesterdayStr, knownProjectIds);
    if (invalidDocuments > 0) {
        appLogger.error('[AnalyticsSettlement] Invalid daily analytics contract', new Error(CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID), {
            failureCode: CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID,
            tId: getAnalyticsIdContext(tId),
            sId: getAnalyticsIdContext(sId),
            settlementDate: yesterdayStr,
            invalidDocuments,
        });
        results.errors.push({
            projectKey: `${tId}_${sId}_invalid_daily`,
            error: CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID,
        });
    }

    results.totalProjects = projectIds.size;

    for (const projectId of projectIds) {
        const projectKey = `${tId}_${sId}_${projectId}`;

        try {
            const yesterdayDoc = yesterdayDocs.get(projectId);
            const aiPayloads: OwnerDashboardAIPayloads = {};
            const aiSummaryTasks: Promise<void>[] = [];
            for (let offset = LATE_EVENT_CORRECTION_DAYS; offset >= 1; offset--) {
                await applyLateDailyCorrection(
                    db,
                    tId,
                    sId,
                    projectId,
                    addDaysToAnalyticsDateKey(yesterdayStr, -offset),
                );
            }

            if (yesterdayDoc) {
                const updated = await updateSummaryDocument(db, tId, sId, projectId, yesterdayDoc.data, yesterdayStr);
                if (updated) results.summaryUpdates++;
            }

            if (isMonday) {
                const weeklyAggregated = await createWeeklyRollup(db, tId, sId, projectId, yesterday, yesterdayDoc?.data || null);
                if (weeklyAggregated.daysWithData > 0) results.weeklyRollups++;

                if (
                    analyticsAiEntitlement.enabled
                    && weeklyAggregated.daysWithData > 0
                    && isMenuAnalyticsProject(projectId)
                    && hasMenuAnalyticsActivity(weeklyAggregated.aggregated)
                ) {
                    aiSummaryTasks.push((async () => {
                        const payload = await generateWeeklyAISummaryPayload(
                            db,
                            tId,
                            sId,
                            projectId,
                            weeklyAggregated.aggregated,
                            weeklyAggregated.weekStart,
                            weeklyAggregated.weekEnd,
                        );
                        aiPayloads.weekly = payload.summary;
                        aiPayloads.weeklyMetricsChange = payload.metricsChange;
                        results.weeklyAiSummaries++;
                    })().catch((aiError) => {
                        appLogger.warn('[AnalyticsSettlement] Weekly AI summary failed', {
                            failureCode: CUSTOMER_ANALYTICS_WEEKLY_AI_SUMMARY_FAILED,
                            tId: getAnalyticsIdContext(tId),
                            sId: getAnalyticsIdContext(sId),
                            projectId: getAnalyticsIdContext(projectId),
                            settlementDate: yesterdayStr,
                            projectKey: getAnalyticsIdContext(projectKey),
                            error: getAnalyticsErrorContext(aiError),
                        });
                    }));
                }
            }

            if (isFirstOfMonth) {
                const monthlyAggregated = await createMonthlyRollup(db, tId, sId, projectId, yesterday, yesterdayDoc?.data || null);
                if (monthlyAggregated.daysWithData > 0) results.monthlyRollups++;

                if (
                    analyticsAiEntitlement.enabled
                    && monthlyAggregated.daysWithData > 0
                    && isMenuAnalyticsProject(projectId)
                    && hasMenuAnalyticsActivity(monthlyAggregated.aggregated)
                ) {
                    aiSummaryTasks.push((async () => {
                        aiPayloads.monthly = await generateMonthlyAISummaryPayload(
                            monthlyAggregated.aggregated,
                            monthlyAggregated.monthStart,
                            monthlyAggregated.monthEnd,
                            monthlyAggregated.daysWithData,
                        );
                        results.monthlyAiSummaries++;
                    })().catch((aiError) => {
                        appLogger.warn('[AnalyticsSettlement] Monthly AI summary failed', {
                            failureCode: CUSTOMER_ANALYTICS_MONTHLY_AI_SUMMARY_FAILED,
                            tId: getAnalyticsIdContext(tId),
                            sId: getAnalyticsIdContext(sId),
                            projectId: getAnalyticsIdContext(projectId),
                            settlementDate: yesterdayStr,
                            projectKey: getAnalyticsIdContext(projectKey),
                            error: getAnalyticsErrorContext(aiError),
                        });
                    }));
                }
            }

            if (
                analyticsAiEntitlement.enabled
                && isMenuAnalyticsProject(projectId)
                && yesterdayDoc
                && hasMenuAnalyticsActivity(yesterdayDoc.data)
            ) {
                aiSummaryTasks.push((async () => {
                    aiPayloads.daily = await generateDailyAISummaryPayload(yesterdayDoc.data, yesterdayStr);
                    results.dailyAiSummaries++;
                })().catch((aiError) => {
                    appLogger.warn('[AnalyticsSettlement] Daily AI summary failed', {
                        failureCode: CUSTOMER_ANALYTICS_DAILY_AI_SUMMARY_FAILED,
                        tId: getAnalyticsIdContext(tId),
                        sId: getAnalyticsIdContext(sId),
                        projectId: getAnalyticsIdContext(projectId),
                        settlementDate: yesterdayStr,
                        projectKey: getAnalyticsIdContext(projectKey),
                        error: getAnalyticsErrorContext(aiError),
                    });
                }));
            }

            if (aiSummaryTasks.length > 0) {
                await Promise.all(aiSummaryTasks);
            }

            await writeDashboardSummaryDocument(
                db,
                tId,
                sId,
                projectId,
                yesterdayStr,
                yesterdayDoc?.data || null,
                aiPayloads,
                analyticsAiEntitlement,
                projectCatalogById[projectId] || null,
            );

            if (isFirstOfMonth) {
                const deletedCount = await cleanupOldDocuments(db, tId, sId, projectId);
                results.documentsDeleted += deletedCount;
            }
        } catch (error: any) {
            appLogger.error('[AnalyticsSettlement] Project aggregation failed', new Error(CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED), {
                failureCode: CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED,
                tId: getAnalyticsIdContext(tId),
                sId: getAnalyticsIdContext(sId),
                projectId: getAnalyticsIdContext(projectId),
                settlementDate: yesterdayStr,
                projectKey: getAnalyticsIdContext(projectKey),
                error: getAnalyticsErrorContext(error),
            });
            results.errors.push({ projectKey, error: CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED });
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
export async function updateSummaryDocument(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    dailyData: DailyMetrics,
    aggregateDate: string,
): Promise<boolean> {
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, projectId);
    const summaryRef = db.collection(ANALYTICS_COLLECTION).doc(summaryDocId);

    // Prepare incremental updates
    const updates: any = {
        analyticsScope: 'customer',
        grain: 'summary',
        lastUpdated: FieldValue.serverTimestamp(),
        lastAggregatedDate: aggregateDate,
        projectId,
        sId,
        surface: projectId === 'customerApp' ? 'customerApp' : 'menu',
        tId,
    };

    // Aggregate numeric totals
    if (dailyData.totalViews) updates.lifetimeTotalViews = FieldValue.increment(dailyData.totalViews);
    if (dailyData.totalClicks) updates.lifetimeTotalClicks = FieldValue.increment(dailyData.totalClicks);
    if (dailyData.totalSessions) updates.lifetimeTotalSessions = FieldValue.increment(dailyData.totalSessions);
    if (dailyData.menuSessions) updates.lifetimeMenuSessions = FieldValue.increment(dailyData.menuSessions);
    if (dailyData.engagedSessions) updates.lifetimeEngagedSessions = FieldValue.increment(dailyData.engagedSessions);
    if (dailyData.intentSessions) updates.lifetimeIntentSessions = FieldValue.increment(dailyData.intentSessions);
    if (dailyData.actionSessions) updates.lifetimeActionSessions = FieldValue.increment(dailyData.actionSessions);
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
    if (dailyData.languageTrackingEnabled) {
        updates.languageTrackingEnabled = true;
    }

    // Aggregate map fields (device, location, source breakdowns)
    const addMapUpdates = (field: string) => {
        const map = readAnalyticsMap(dailyData as any, field);
        for (const [key, value] of Object.entries(map)) {
            if (typeof value === 'number') {
                assignNestedMapUpdate(updates, field, key, FieldValue.increment(value));
            }
        }
    };

    addMapUpdates('viewsByDevice');
    addMapUpdates('viewsByLocation');
    addMapUpdates('viewsBySource');
    addMapUpdates('viewsByMedium');
    addMapUpdates('viewsByCampaign');
    addMapUpdates('viewsByContent');

    for (const field of [
        'viewsByEntrySource',
        'menuSessionsBySource',
        'actionSessionsBySource',
        'actionSessionsByOpenHoursState',
        'menuActionClicksBySource',
        'menuActionClicksByOpenHoursState',
        'menuViewsByLanguage',
        'menuSessionsByLanguage',
        'languageAdoptions',
        'attributeFilterInteractions',
        'attributeFilterItemViews',
        'attributeFilterItemTaps',
        'attributeFilterSearches',
        'attributeFilterUnavailableTaps',
        'attributeFilterActionClicks',
    ] as const) {
        addMapUpdates(field);
    }

    addMapUpdates('viewsByCategory');
    addMapUpdates('clicksByCategory');

    // Aggregate top items
    addMapUpdates('viewsByItem');
    addMapUpdates('clicksByItem');

    // Aggregate Decision Blocks rendered - CRITICAL for owner dashboard
    // Enables calculation of:
    // - Smart Picks Visibility Rate = totalDecisionBlocksRendered / totalViews
    // - Engagement Rate = totalRecommendationClicks / totalDecisionBlocksRendered
    if (dailyData.totalDecisionBlocksRendered) {
        updates.lifetimeTotalDecisionBlocksRendered = FieldValue.increment(dailyData.totalDecisionBlocksRendered);
    }

    // Aggregate per-block-type renders (popular, quickPick, bestValue)
    addMapUpdates('decisionBlocksRendered');

    // Aggregate recommendation clicks by block type
    addMapUpdates('recommendationClicks');

    // Aggregate recommendation clicks by item
    addMapUpdates('recommendationClicksByItem');

    addMapUpdates('menuActionClicks');

    addMapUpdates('searchTerms');

    addMapUpdates('zeroResultSearchTerms');

    const unavailableItemTapsByItem = readAnalyticsMap(dailyData as any, 'unavailableItemTapsByItem');
    const itemNames = readAnalyticsMap(dailyData as any, 'itemNames');
    for (const [itemId, taps] of Object.entries(unavailableItemTapsByItem)) {
        if (typeof taps === 'number') {
            assignNestedMapUpdate(updates, 'unavailableItemTapsByItem', itemId, FieldValue.increment(taps));
        }
        if (itemNames[itemId]) assignNestedMapUpdate(updates, 'itemNames', itemId, itemNames[itemId]);
    }
    const namedItemIds = new Set<string>([
        ...Object.keys(readAnalyticsMap(dailyData as any, 'clicksByItem')),
        ...Object.keys(readAnalyticsMap(dailyData as any, 'viewsByItem')),
        ...Object.keys(readAnalyticsMap(dailyData as any, 'recommendationClicksByItem')),
        ...Object.keys(unavailableItemTapsByItem),
    ]);
    namedItemIds.forEach((itemId) => {
        if (itemNames[itemId]) assignNestedMapUpdate(updates, 'itemNames', itemId, itemNames[itemId]);
    });

    for (const [categoryId, name] of Object.entries(readAnalyticsMap(dailyData as any, 'categoryNames'))) {
        assignNestedMapUpdate(updates, 'categoryNames', categoryId, name);
    }

    for (const [language, name] of Object.entries(readAnalyticsMap(dailyData as any, 'languageNames'))) {
        assignNestedMapUpdate(updates, 'languageNames', language, name);
    }

    for (const [filterId, name] of Object.entries(readAnalyticsMap(dailyData as any, 'attributeFilterNames'))) {
        assignNestedMapUpdate(updates, 'attributeFilterNames', filterId, name);
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
    addMapUpdates('shortcutClicks');
    addMapUpdates('installsByDevice');
    addMapUpdates('installsByLocation');
    addMapUpdates('installsByPlatform');
    addMapUpdates('installsBySource');
    addMapUpdates('appOpensByPlatform');

    return await db.runTransaction(async (transaction) => {
        const existingSummary = await transaction.get(summaryRef);
        const existingData = existingSummary.exists ? existingSummary.data() : null;
        if (existingData) assertValidAnalyticsSummaryForSettlement(existingData, { projectId, sId, tId });
        const lastAggregatedDate = existingData?.lastAggregatedDate
            ? normalizeAnalyticsDateKey(existingData.lastAggregatedDate) || ''
            : '';

        if (lastAggregatedDate >= aggregateDate) {
            return false;
        }

        transaction.set(summaryRef, updates, { merge: true });
        return true;
    });
}

export async function applyLateDailyCorrection(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    correctionDate: string,
): Promise<boolean> {
    const dashboardRef = db.collection(ANALYTICS_COLLECTION).doc(getDashboardSummaryDocId(tId, sId, projectId));
    const dailyRef = db.collection(ANALYTICS_COLLECTION).doc(getAnalyticsDocId.daily(tId, sId, projectId, correctionDate));
    const summaryRef = db.collection(ANALYTICS_COLLECTION).doc(getAnalyticsDocId.summary(tId, sId, projectId));
    const corrected = await db.runTransaction(async (transaction) => {
        const [dashboardSnap, dailySnap, summarySnap] = await Promise.all([
            transaction.get(dashboardRef),
            transaction.get(dailyRef),
            transaction.get(summaryRef),
        ]);
        if (!dashboardSnap.exists || !dailySnap.exists) return false;

        if (summarySnap.exists) {
            assertValidAnalyticsSummaryForSettlement(summarySnap.data(), { projectId, sId, tId });
        }

        const dashboardData = dashboardSnap.data();
        assertValidAnalyticsDashboardIdentity(dashboardData, { projectId, sId, tId });
        const dailyRows = Array.isArray(dashboardData.daily30d) ? dashboardData.daily30d : [];
        const previousRowValue = dailyRows.find((row: any) => String(row?.date || '') === correctionDate);
        if (!previousRowValue) return false;
        const previousRow = normalizeAnalyticsDailyMetrics(previousRowValue, correctionDate);
        if (!previousRow) throw new Error(CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID);

        const currentDaily = normalizeAnalyticsDailyDocument(dailySnap.data(), {
            date: correctionDate,
            docId: dailySnap.id,
            projectId,
            sId,
            tId,
        });
        if (!currentDaily) throw new Error(CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID);
        const { updates, hasDelta } = buildLateCorrectionSummaryUpdates(currentDaily, previousRow, correctionDate);
        if (!hasDelta) return false;

        const updatedRows = dailyRows.map((row: any) => (
            String(row?.date || '') === correctionDate ? currentDaily : row
        ));
        transaction.set(summaryRef, updates, { merge: true });
        transaction.set(dashboardRef, {
            daily30d: updatedRows,
            lateCorrection: {
                lastCorrectedLocalDate: correctionDate,
                correctedAt: FieldValue.serverTimestamp(),
            },
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
    if (!corrected) return false;

    appLogger.warn('[AnalyticsSettlement] Late daily correction applied', {
        tId,
        sId,
        projectId,
        correctionDate,
    });

    return true;
}

function buildLateCorrectionSummaryUpdates(
    currentDaily: Record<string, any>,
    previousDaily: Record<string, any>,
    correctionDate: string,
): { updates: Record<string, any>; hasDelta: boolean } {
    const updates: Record<string, any> = {
        lastCorrectionDate: correctionDate,
        lastCorrectedAt: FieldValue.serverTimestamp(),
    };
    let hasDelta = false;

    const addNumericDelta = (sourceField: string, targetField: string) => {
        const currentValue = typeof currentDaily[sourceField] === 'number' && Number.isFinite(currentDaily[sourceField])
            ? Math.max(0, currentDaily[sourceField])
            : 0;
        const previousValue = typeof previousDaily[sourceField] === 'number' && Number.isFinite(previousDaily[sourceField])
            ? Math.max(0, previousDaily[sourceField])
            : 0;
        const delta = Math.max(0, currentValue - previousValue);
        if (delta > 0) {
            updates[targetField] = FieldValue.increment(delta);
            hasDelta = true;
        }
    };

    const addMapDelta = (sourceField: string, targetField: string) => {
        const currentMap = readAnalyticsMap(currentDaily, sourceField);
        const previousMap = readAnalyticsMap(previousDaily, sourceField);
        for (const [key, value] of Object.entries(currentMap)) {
            if (typeof value !== 'number') continue;
            const previousValue = typeof previousMap[key] === 'number' && Number.isFinite(previousMap[key])
                ? Math.max(0, previousMap[key])
                : 0;
            const delta = Math.max(0, value - previousValue);
            if (delta > 0) {
                assignNestedMapUpdate(updates, targetField, key, FieldValue.increment(delta));
                hasDelta = true;
            }
        }
    };

    addNumericDelta('totalViews', 'lifetimeTotalViews');
    addNumericDelta('totalClicks', 'lifetimeTotalClicks');
    addNumericDelta('totalSessions', 'lifetimeTotalSessions');
    addNumericDelta('menuSessions', 'lifetimeMenuSessions');
    addNumericDelta('engagedSessions', 'lifetimeEngagedSessions');
    addNumericDelta('intentSessions', 'lifetimeIntentSessions');
    addNumericDelta('actionSessions', 'lifetimeActionSessions');
    addNumericDelta('totalSearches', 'lifetimeTotalSearches');
    addNumericDelta('zeroResultSearches', 'lifetimeZeroResultSearches');
    addNumericDelta('totalUnavailableItemTaps', 'lifetimeTotalUnavailableItemTaps');
    addNumericDelta('totalMenuActionClicks', 'lifetimeTotalMenuActionClicks');
    addNumericDelta('totalRecommendationClicks', 'lifetimeTotalRecommendationClicks');
    addNumericDelta('totalDecisionBlocksRendered', 'lifetimeTotalDecisionBlocksRendered');
    if (currentDaily.languageTrackingEnabled) {
        updates.languageTrackingEnabled = true;
    }
    addNumericDelta('totalPromptShown', 'lifetimeTotalPromptShown');
    addNumericDelta('totalPromptDismissed', 'lifetimeTotalPromptDismissed');
    addNumericDelta('totalInstallStarted', 'lifetimeTotalInstallStarted');
    addNumericDelta('totalInstalled', 'lifetimeTotalInstalled');
    addNumericDelta('uniqueInstallSessions', 'lifetimeUniqueInstalls');
    addNumericDelta('totalAppOpens', 'lifetimeTotalAppOpens');

    addMapDelta('viewsByDevice', 'viewsByDevice');
    addMapDelta('viewsByLocation', 'viewsByLocation');
    addMapDelta('viewsBySource', 'viewsBySource');
    addMapDelta('viewsByMedium', 'viewsByMedium');
    addMapDelta('viewsByCampaign', 'viewsByCampaign');
    addMapDelta('viewsByContent', 'viewsByContent');
    addMapDelta('viewsByEntrySource', 'viewsByEntrySource');
    addMapDelta('menuSessionsBySource', 'menuSessionsBySource');
    addMapDelta('actionSessionsBySource', 'actionSessionsBySource');
    addMapDelta('actionSessionsByOpenHoursState', 'actionSessionsByOpenHoursState');
    addMapDelta('menuActionClicksBySource', 'menuActionClicksBySource');
    addMapDelta('menuActionClicksByOpenHoursState', 'menuActionClicksByOpenHoursState');
    addMapDelta('menuViewsByLanguage', 'menuViewsByLanguage');
    addMapDelta('menuSessionsByLanguage', 'menuSessionsByLanguage');
    addMapDelta('languageAdoptions', 'languageAdoptions');
    addMapDelta('attributeFilterInteractions', 'attributeFilterInteractions');
    addMapDelta('attributeFilterItemViews', 'attributeFilterItemViews');
    addMapDelta('attributeFilterItemTaps', 'attributeFilterItemTaps');
    addMapDelta('attributeFilterSearches', 'attributeFilterSearches');
    addMapDelta('attributeFilterUnavailableTaps', 'attributeFilterUnavailableTaps');
    addMapDelta('attributeFilterActionClicks', 'attributeFilterActionClicks');
    addMapDelta('viewsByCategory', 'viewsByCategory');
    addMapDelta('clicksByCategory', 'clicksByCategory');
    addMapDelta('hourlyViews', 'hourlyViews');
    addMapDelta('hourlyMenuActionClicks', 'hourlyMenuActionClicks');
    addMapDelta('viewsByItem', 'viewsByItem');
    addMapDelta('clicksByItem', 'clicksByItem');
    addMapDelta('decisionBlocksRendered', 'decisionBlocksRendered');
    addMapDelta('recommendationClicks', 'recommendationClicks');
    addMapDelta('recommendationClicksByItem', 'recommendationClicksByItem');
    addMapDelta('menuActionClicks', 'menuActionClicks');
    addMapDelta('searchTerms', 'searchTerms');
    addMapDelta('zeroResultSearchTerms', 'zeroResultSearchTerms');
    addMapDelta('unavailableItemTapsByItem', 'unavailableItemTapsByItem');
    addMapDelta('shortcutClicks', 'shortcutClicks');
    addMapDelta('installsByDevice', 'installsByDevice');
    addMapDelta('installsByLocation', 'installsByLocation');
    addMapDelta('installsByPlatform', 'installsByPlatform');
    addMapDelta('installsBySource', 'installsBySource');
    addMapDelta('appOpensByPlatform', 'appOpensByPlatform');

    Object.entries(readAnalyticsMap(currentDaily, 'itemNames')).forEach(([itemId, name]) => {
        if (typeof name === 'string') assignNestedMapUpdate(updates, 'itemNames', itemId, name);
    });
    Object.entries(readAnalyticsMap(currentDaily, 'categoryNames')).forEach(([categoryId, name]) => {
        if (typeof name === 'string') assignNestedMapUpdate(updates, 'categoryNames', categoryId, name);
    });
    Object.entries(readAnalyticsMap(currentDaily, 'languageNames')).forEach(([language, name]) => {
        if (typeof name === 'string') assignNestedMapUpdate(updates, 'languageNames', language, name);
    });
    Object.entries(readAnalyticsMap(currentDaily, 'attributeFilterNames')).forEach(([filterId, name]) => {
        if (typeof name === 'string') assignNestedMapUpdate(updates, 'attributeFilterNames', filterId, name);
    });

    return { updates, hasDelta };
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
    referenceDate: Date,
    settledDailyData?: Record<string, any> | null,
): Promise<{ aggregated: any; weekStart: string; weekEnd: string; daysWithData: number; source: string }> {
    // Get week date range from utility
    const { weekStart, weekEnd } = getWeekDateRange(referenceDate);
    const weeklyDocId = getAnalyticsDocId.weekly(tId, sId, projectId, referenceDate);
    const weeklyRef = db.collection(ANALYTICS_COLLECTION).doc(weeklyDocId);

    const { docs: dailyDocs, source } = await getDailyDocsForRollup(
        db,
        tId,
        sId,
        projectId,
        weekStart,
        weekEnd,
        settledDailyData,
    );

    // Aggregate all daily data
    const aggregated = aggregateDailyDocs(dailyDocs);

    if (dailyDocs.length === 0) {
        return {
            aggregated,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            daysWithData: 0,
            source,
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
        buildSource: source,
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
        source,
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
    referenceDate: Date,
    settledDailyData?: Record<string, any> | null,
): Promise<{ aggregated: any; monthStart: string; monthEnd: string; daysWithData: number; source: string }> {
    // Get month date range from utility
    const { firstDay, lastDay } = getMonthDateRange(referenceDate);
    const monthlyDocId = getAnalyticsDocId.monthly(tId, sId, projectId, referenceDate);
    const monthlyRef = db.collection(ANALYTICS_COLLECTION).doc(monthlyDocId);

    const { docs: dailyDocs, source } = await getDailyDocsForRollup(
        db,
        tId,
        sId,
        projectId,
        firstDay,
        lastDay,
        settledDailyData,
    );

    // Aggregate all daily data
    const aggregated = aggregateDailyDocs(dailyDocs);

    if (dailyDocs.length === 0) {
        return {
            aggregated,
            monthStart: firstDay.toISOString().split('T')[0],
            monthEnd: lastDay.toISOString().split('T')[0],
            daysWithData: 0,
            source,
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
        buildSource: source,
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
        source,
    };
}

async function getDailyDocsForRollup(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    settledDailyData?: Record<string, any> | null,
): Promise<{ docs: any[]; source: 'dashboard_summary_cache' | 'daily_range_rebuild' }> {
    const startStr = toDateKey(startDate);
    const endStr = toDateKey(endDate);
    const previousSettledDate = addDaysToAnalyticsDateKey(endStr, -1);
    const dashboardSnap = await db.collection(ANALYTICS_COLLECTION)
        .doc(getDashboardSummaryDocId(tId, sId, projectId))
        .get();

    if (dashboardSnap.exists) {
        const dashboardData = dashboardSnap.data() || {};
        const rawDailyRows = Array.isArray(dashboardData.daily30d) ? dashboardData.daily30d : [];
        const dailyRows = rawDailyRows.flatMap((row: unknown) => {
            const date = isAnalyticsRecord(row) ? normalizeAnalyticsDateKey(row.date) : null;
            const normalized = date ? normalizeAnalyticsDailyMetrics(row, date) : null;
            return normalized ? [normalized] : [];
        });
        const hasValidDailyCache = dailyRows.length === rawDailyRows.length;
        const firstCachedDate = dailyRows
            .map((row) => String(row.date || ''))
            .filter(Boolean)
            .sort()[0] || '';
        const lastSettledLocalDate = normalizeAnalyticsDateKey(dashboardData.lastSettledLocalDate) || '';
        const canUseCache = hasValidDailyCache
            && dailyRows.length > 0
            && firstCachedDate <= startStr
            && lastSettledLocalDate >= previousSettledDate;

        if (canUseCache) {
            const byDate = new Map<string, Record<string, any>>();
            dailyRows.forEach((row) => {
                const date = String(row.date || '');
                if (date >= startStr && date <= endStr) {
                    byDate.set(date, row);
                }
            });

            if (settledDailyData) {
                byDate.set(endStr, normalizeDailyRow(endStr, settledDailyData));
            }

            return {
                docs: Array.from(byDate.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([, row]) => row),
                source: 'dashboard_summary_cache',
            };
        }
    }

    const rebuiltDocs = await getDailyDocsInRange(db, tId, sId, projectId, startDate, endDate);
    appLogger.warn('[AnalyticsSettlement] Rollup cache miss; rebuilt from daily docs', {
        tId,
        sId,
        projectId,
        startDate: startStr,
        endDate: endStr,
        docsRead: rebuiltDocs.length,
    });

    return {
        docs: rebuiltDocs,
        source: 'daily_range_rebuild',
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

    return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const date = normalizeAnalyticsDateKey(data.localDate ?? data.date);
        const normalized = date ? normalizeAnalyticsDailyDocument(data, {
            date,
            docId: doc.id,
            projectId,
            sId,
            tId,
        }) : null;
        if (!date || !normalized || date < startStr || date > endStr) {
            throw new Error(CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID);
        }
        return normalized;
    });
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
        menuSessions: 0,
        engagedSessions: 0,
        intentSessions: 0,
        actionSessions: 0,
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
        viewsByMedium: {},
        viewsByCampaign: {},
        viewsByContent: {},
        viewsByEntrySource: {},
        menuSessionsBySource: {},
        actionSessionsBySource: {},
        actionSessionsByOpenHoursState: {},
        menuActionClicksBySource: {},
        menuActionClicksByOpenHoursState: {},
        menuViewsByLanguage: {},
        menuSessionsByLanguage: {},
        languageAdoptions: {},
        attributeFilterInteractions: {},
        attributeFilterItemViews: {},
        attributeFilterItemTaps: {},
        attributeFilterSearches: {},
        attributeFilterUnavailableTaps: {},
        attributeFilterActionClicks: {},
        viewsByCategory: {},
        clicksByCategory: {},
        hourlyViews: {},
        hourlyMenuActionClicks: {},
        viewsByItem: {},
        clicksByItem: {},
        searchTerms: {},
        zeroResultSearchTerms: {},
        unavailableItemTapsByItem: {},
        menuActionClicks: {},
        recommendationClicks: {},
        decisionBlocksRendered: {},
        recommendationClicksByItem: {},
        itemNames: {},
        categoryNames: {},
        languageNames: {},
        attributeFilterNames: {},
        languageTrackingEnabled: false,
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
        if (doc.menuSessions) result.menuSessions += doc.menuSessions;
        if (doc.engagedSessions) result.engagedSessions += doc.engagedSessions;
        if (doc.intentSessions) result.intentSessions += doc.intentSessions;
        if (doc.actionSessions) result.actionSessions += doc.actionSessions;
        if (doc.totalSearches) result.totalSearches += doc.totalSearches;
        if (doc.zeroResultSearches) result.zeroResultSearches += doc.zeroResultSearches;
        if (doc.totalUnavailableItemTaps) result.totalUnavailableItemTaps += doc.totalUnavailableItemTaps;
        if (doc.totalMenuActionClicks) result.totalMenuActionClicks += doc.totalMenuActionClicks;
        if (doc.totalRecommendationClicks) result.totalRecommendationClicks += doc.totalRecommendationClicks;
        result.languageTrackingEnabled = Boolean(result.languageTrackingEnabled || doc.languageTrackingEnabled);
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
        mergeMapField(result.viewsByDevice, readAnalyticsMap(doc, 'viewsByDevice'));
        mergeMapField(result.viewsByLocation, readAnalyticsMap(doc, 'viewsByLocation'));
        mergeMapField(result.viewsBySource, readAnalyticsMap(doc, 'viewsBySource'));
        mergeMapField(result.viewsByMedium, readAnalyticsMap(doc, 'viewsByMedium'));
        mergeMapField(result.viewsByCampaign, readAnalyticsMap(doc, 'viewsByCampaign'));
        mergeMapField(result.viewsByContent, readAnalyticsMap(doc, 'viewsByContent'));
        mergeMapField(result.viewsByEntrySource, readAnalyticsMap(doc, 'viewsByEntrySource'));
        mergeMapField(result.menuSessionsBySource, readAnalyticsMap(doc, 'menuSessionsBySource'));
        mergeMapField(result.actionSessionsBySource, readAnalyticsMap(doc, 'actionSessionsBySource'));
        mergeMapField(result.actionSessionsByOpenHoursState, readAnalyticsMap(doc, 'actionSessionsByOpenHoursState'));
        mergeMapField(result.menuActionClicksBySource, readAnalyticsMap(doc, 'menuActionClicksBySource'));
        mergeMapField(result.menuActionClicksByOpenHoursState, readAnalyticsMap(doc, 'menuActionClicksByOpenHoursState'));
        mergeMapField(result.menuViewsByLanguage, readAnalyticsMap(doc, 'menuViewsByLanguage'));
        mergeMapField(result.menuSessionsByLanguage, readAnalyticsMap(doc, 'menuSessionsByLanguage'));
        mergeMapField(result.languageAdoptions, readAnalyticsMap(doc, 'languageAdoptions'));
        mergeMapField(result.attributeFilterInteractions, readAnalyticsMap(doc, 'attributeFilterInteractions'));
        mergeMapField(result.attributeFilterItemViews, readAnalyticsMap(doc, 'attributeFilterItemViews'));
        mergeMapField(result.attributeFilterItemTaps, readAnalyticsMap(doc, 'attributeFilterItemTaps'));
        mergeMapField(result.attributeFilterSearches, readAnalyticsMap(doc, 'attributeFilterSearches'));
        mergeMapField(result.attributeFilterUnavailableTaps, readAnalyticsMap(doc, 'attributeFilterUnavailableTaps'));
        mergeMapField(result.attributeFilterActionClicks, readAnalyticsMap(doc, 'attributeFilterActionClicks'));
        mergeMapField(result.viewsByCategory, readAnalyticsMap(doc, 'viewsByCategory'));
        mergeMapField(result.clicksByCategory, readAnalyticsMap(doc, 'clicksByCategory'));
        mergeMapField(result.hourlyViews, readAnalyticsMap(doc, 'hourlyViews'));
        mergeMapField(result.hourlyMenuActionClicks, readAnalyticsMap(doc, 'hourlyMenuActionClicks'));
        mergeMapField(result.viewsByItem, readAnalyticsMap(doc, 'viewsByItem'));
        mergeMapField(result.clicksByItem, readAnalyticsMap(doc, 'clicksByItem'));
        mergeMapField(result.searchTerms, readAnalyticsMap(doc, 'searchTerms'));
        mergeMapField(result.zeroResultSearchTerms, readAnalyticsMap(doc, 'zeroResultSearchTerms'));
        mergeMapField(result.unavailableItemTapsByItem, readAnalyticsMap(doc, 'unavailableItemTapsByItem'));
        mergeMapField(result.menuActionClicks, readAnalyticsMap(doc, 'menuActionClicks'));
        mergeMapField(result.recommendationClicks, readAnalyticsMap(doc, 'recommendationClicks'));
        // Decision Blocks breakdown
        mergeMapField(result.decisionBlocksRendered, readAnalyticsMap(doc, 'decisionBlocksRendered'));
        mergeMapField(result.recommendationClicksByItem, readAnalyticsMap(doc, 'recommendationClicksByItem'));
        Object.assign(result.itemNames, readAnalyticsMap(doc, 'itemNames'));
        Object.assign(result.categoryNames, readAnalyticsMap(doc, 'categoryNames'));
        Object.assign(result.languageNames, readAnalyticsMap(doc, 'languageNames'));
        Object.assign(result.attributeFilterNames, readAnalyticsMap(doc, 'attributeFilterNames'));
        // Customer App map fields (additive merge — keys summed, never replaced)
        mergeMapField(result.shortcutClicks, readAnalyticsMap(doc, 'shortcutClicks'));
        mergeMapField(result.installsByDevice, readAnalyticsMap(doc, 'installsByDevice'));
        mergeMapField(result.installsByLocation, readAnalyticsMap(doc, 'installsByLocation'));
        mergeMapField(result.installsByPlatform, readAnalyticsMap(doc, 'installsByPlatform'));
        mergeMapField(result.installsBySource, readAnalyticsMap(doc, 'installsBySource'));
        mergeMapField(result.appOpensByPlatform, readAnalyticsMap(doc, 'appOpensByPlatform'));
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

function readAnalyticsMap(data: Record<string, any>, field: string): Record<string, any> {
    const nested = isAnalyticsRecord(data?.[field]) ? data[field] : {};
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(nested)) {
        if (/^[A-Za-z0-9_:-]{1,120}$/.test(key)) {
            Object.defineProperty(result, key, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        }
    }
    const prefix = `${field}.`;
    for (const [key, value] of Object.entries(data || {})) {
        if (!key.startsWith(prefix)) continue;
        const childKey = key.slice(prefix.length);
        if (!/^[A-Za-z0-9_:-]{1,120}$/.test(childKey)) continue;
        Object.defineProperty(result, childKey, {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
        });
    }
    return result;
}

function assignNestedMapUpdate(target: Record<string, any>, field: string, key: string, value: any): void {
    target[field] = target[field] || {};
    Object.defineProperty(target[field], key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
    });
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
export async function cleanupOldDocuments(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string
): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TTL_DAYS);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const prefix = getAnalyticsDocId.dailyPrefix(tId, sId, projectId);

    let deleteCount = 0;
    while (true) {
        const oldDocsQuery = await db.collection(ANALYTICS_COLLECTION)
            .where('__name__', '>=', `${prefix}0000-00-00`)
            .where('__name__', '<', `${prefix}${cutoffStr}`)
            .limit(ANALYTICS_CLEANUP_BATCH_SIZE)
            .get();
        if (oldDocsQuery.empty) break;

        const batch = db.batch();
        oldDocsQuery.docs.forEach((document) => batch.delete(document.ref));
        await batch.commit();
        deleteCount += oldDocsQuery.size;
        if (oldDocsQuery.size < ANALYTICS_CLEANUP_BATCH_SIZE) break;
    }

    return deleteCount;
}

/**
 * Generate Weekly AI summary payload for the dashboard read model
 * Uses Gemini to create a simple, actionable summary for SMB owners
 */
async function generateWeeklyAISummaryPayload(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    aggregated: any,
    weekStart: string,
    weekEnd: string
): Promise<{
    summary: NonNullable<OwnerDashboardAIPayloads['weekly']>;
    metricsChange: NonNullable<OwnerDashboardAIPayloads['weeklyMetricsChange']>;
}> {
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

    // Build top items from actual item taps, not only recommendation clicks.
    const topItems: Array<{ itemId: string; clicks: number }> = [];
    if (aggregated.clicksByItem) {
        const entries = Object.entries(aggregated.clicksByItem) as [string, number][];
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

    return {
        summary: {
            markdown: aiSummary.markdown,
            bulletPoints: aiSummary.bulletPoints,
            period: { start: weekStart, end: weekEnd },
            generatedAt: Timestamp.now(),
            promptVersion: 'v1',
        },
        metricsChange: {
            menuVisitsChange,
        },
    };
}

/**
 * Generate Daily AI summary payload for the dashboard read model
 * Descriptive only, no conclusions - max 2 bullets
 */
async function generateDailyAISummaryPayload(
    dailyData: DailyMetrics,
    date: string
): Promise<NonNullable<OwnerDashboardAIPayloads['daily']>> {
    // Build top items from actual item taps, not only recommendation clicks.
    const topItems: Array<{ itemId: string; clicks: number }> = [];
    if (dailyData.clicksByItem) {
        const entries = Object.entries(dailyData.clicksByItem) as [string, number][];
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

    return {
        markdown: aiSummary.markdown,
        bulletPoints: aiSummary.bulletPoints,
        generatedAt: Timestamp.now(),
        promptVersion: 'v1',
    };
}

/**
 * Generate Monthly AI summary payload for the dashboard read model
 * Calm, reassuring tone - max 3 bullets
 */
async function generateMonthlyAISummaryPayload(
    aggregated: any,
    monthStart: string,
    monthEnd: string,
    daysWithData: number
): Promise<NonNullable<OwnerDashboardAIPayloads['monthly']>> {
    // Build top items from actual item taps, not only recommendation clicks.
    const topItems: Array<{ itemId: string; clicks: number }> = [];
    if (aggregated.clicksByItem) {
        const entries = Object.entries(aggregated.clicksByItem) as [string, number][];
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

    return {
        markdown: aiSummary.markdown,
        bulletPoints: aiSummary.bulletPoints,
        generatedAt: Timestamp.now(),
        promptVersion: 'v1',
    };
}

// Note: getISOWeek moved to constants/database.ts

export async function assertCurrentPlatformAnalyticsAuthority(
    db: FirebaseFirestore.Firestore,
    auth: {
        uid: string;
        token: Record<string, unknown>;
    },
): Promise<void> {
    const userDocumentId = normalizeOwnerNotificationDocumentId(auth.uid);
    if (!userDocumentId) {
        throw new HttpsError('permission-denied', 'Account is not allowed to perform this action.');
    }

    const tokenRole = String(auth.token.platformRole || auth.token.role || '');
    const userSnap = await db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId).get();
    const userData = userSnap.exists ? userSnap.data() : undefined;
    const currentRole = String(userData?.platformRole || userData?.role || '');
    if (
        tokenRole !== ECOMSAI_PLATFORM_USER_ROLE
        || currentRole !== ECOMSAI_PLATFORM_USER_ROLE
        || userData?.active === false
        || userData?.deleted === true
        || userData?.authDisabled === true
        || userData?.blocked === true
        || userData?.isVerified === false
    ) {
        throw new HttpsError(
            'permission-denied',
            'Only active platform owners can manually trigger analytics aggregation.',
        );
    }
}

/**
 * Manual trigger for testing/backfill
 */
export const triggerCustomerAnalyticsManually = onCall({
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
    maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
}, async (request) => {
    // Require authentication
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Must be authenticated to trigger aggregation.'
        );
    }

    await assertCurrentPlatformAnalyticsAuthority(firestoreAdmin, request.auth);
    const requesterRole = ECOMSAI_PLATFORM_USER_ROLE;

    const { tId, sId, projectId, forceWeekly, forceMonthly } = request.data || {};
    const tenantId = normalizeStoreSummaryNumericDocumentId(tId);
    const storeId = normalizeStoreSummaryNumericDocumentId(sId);
    const normalizedProjectId = normalizeAnalyticsProjectId(projectId);
    if (!tenantId || !storeId || !normalizedProjectId) {
        throw new HttpsError('invalid-argument', 'A valid tenant, store, and project are required.');
    }

    appLogger.info('[ManualCustomerAnalytics] Trigger accepted', {
        requesterRole,
        requesterPresent: Boolean(request.auth.uid),
        tIdLength: String(tId || '').length,
        sIdLength: String(sId || '').length,
        projectIdLength: String(projectId || '').length,
        hasProjectScope: Boolean(tId && sId && projectId),
        forceWeekly: Boolean(forceWeekly),
        forceMonthly: Boolean(forceMonthly),
    });

    const db = firestoreAdmin;
    try {
        // If specific project provided, only process that one
        if (tenantId && storeId && normalizedProjectId) {
            const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
            const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
            const storeSummary = storesSummary[storeId];
            if (!storeSummary || storeSummary.tId !== tenantId) {
                throw new HttpsError('failed-precondition', 'Store does not match the requested tenant.');
            }
            const timeZone = typeof storeSummary.timeZone === 'string' ? storeSummary.timeZone : undefined;
            const businessDayEndTime = typeof storeSummary.businessDayEndTime === 'string'
                ? storeSummary.businessDayEndTime
                : undefined;
            const { yesterday, yesterdayStr } = buildAggregationContext(new Date(), timeZone, businessDayEndTime);
            // Get yesterday's daily doc
            const dailyDocId = getAnalyticsDocId.daily(tenantId, storeId, normalizedProjectId, yesterdayStr);
            const dailyDoc = await db.collection(ANALYTICS_COLLECTION).doc(dailyDocId).get();

            const normalizedDaily = dailyDoc.exists
                ? normalizeAnalyticsDailyDocument(dailyDoc.data(), {
                    date: yesterdayStr,
                    docId: dailyDoc.id,
                    projectId: normalizedProjectId,
                    sId: storeId,
                    tId: tenantId,
                })
                : null;
            if (dailyDoc.exists && !normalizedDaily) {
                throw new HttpsError('failed-precondition', 'Daily analytics data is invalid.');
            }
            const summaryUpdated = normalizedDaily
                ? await updateSummaryDocument(
                    db,
                    tenantId,
                    storeId,
                    normalizedProjectId,
                    normalizedDaily,
                    yesterdayStr,
                )
                : false;

            if (forceWeekly === true) {
                await createWeeklyRollup(db, tenantId, storeId, normalizedProjectId, yesterday);
            }

            if (forceMonthly === true) {
                await createMonthlyRollup(db, tenantId, storeId, normalizedProjectId, yesterday);
            }

            const deletedCount = await cleanupOldDocuments(db, tenantId, storeId, normalizedProjectId);

            return {
                status: 'success',
                message: `Processed project ${tenantId}_${storeId}_${normalizedProjectId}`,
                summaryUpdated,
                weeklyRollup: forceWeekly === true,
                monthlyRollup: forceMonthly === true,
                documentsDeleted: deletedCount,
            };
        }

        // Otherwise, trigger full aggregation (same as scheduled)
        return {
            status: 'error',
            message: 'Please provide tId, sId, and projectId for manual trigger',
        };

    } catch (error) {
        appLogger.error('[ManualCustomerAnalytics] Trigger failed', new Error(CUSTOMER_ANALYTICS_MANUAL_TRIGGER_FAILED), {
            failureCode: CUSTOMER_ANALYTICS_MANUAL_TRIGGER_FAILED,
            tId: getAnalyticsIdContext(tId),
            sId: getAnalyticsIdContext(sId),
            projectId: getAnalyticsIdContext(projectId),
            hasProjectScope: Boolean(tId && sId && projectId),
            error: getAnalyticsErrorContext(error),
        });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError(
            'internal',
            'Aggregation failed. Please try again.'
        );
    }
});
