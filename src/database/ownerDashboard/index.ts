/**
 * Owner Dashboard Database Layer
 * 
 * Fetches pre-aggregated data from Firestore for the Owner Dashboard.
 * All data is already computed by the nightly scheduler - this is READ-ONLY.
 * 
 * SCOPE GUARD:
 * This layer is designed for single-store SMB owners only.
 * Multi-store, franchise, or admin analytics MUST NOT reuse this layer.
 * 
 * ARCHITECTURE:
 * - Client-side aggregation of daily docs (intentionally constrained)
 * - Single-fetch strategy for cost efficiency (~37 reads vs ~69 before)
 * - SWR caching handles refresh behavior
 * 
 * If you need multi-store analytics, create a separate DAL.
 * 
 * Document patterns:
 * - Daily: analytics/{tId}_{sId}_{projectId}_daily_{date}
 * - Weekly: analytics/{tId}_{sId}_{projectId}_weekly_{week}
 * - Monthly: analytics/{tId}_{sId}_{projectId}_monthly_{month}
 * - Summary: analytics/{tId}_{sId}_{projectId}_overall_summary
 */

import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { getBusinessAnalyticsDateKey, getLatestSettledBusinessDateKey } from "@lib/analytics/businessDay";
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from "@lib/analytics/analyticsDiagnostics";
import {
    addDaysToAnalyticsDateKey,
    getAnalyticsDateKey,
    getAnalyticsDateRange,
    getAnalyticsISOWeek,
    formatAnalyticsDateKey,
    parseAnalyticsDateKey,
} from "@lib/analytics/dateKey";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    BlockPerformance,
    AttributeFilterInterest,
    DAILY_GUARDRAILS,
    DailyViewData,
    HistoricalWeek,
    LanguageUsage,
    MenuActionBreakdown,
    MonthlyViewData,
    MTDViewData,
    OpenHoursActionBreakdown,
    OverallData,
    OVERVIEW_GUARDRAILS,
    OverviewData,
    OwnerActionReceipt,
    OwnerActionPlan,
    OwnerActionSuggestion,
    OwnerConfidence,
    OwnerDashboardData,
    OwnerDashboardMetrics,
    SearchTerm,
    SourceQuality,
    TopCategory,
    TopItem,
    TrafficBreakdown,
    WeeklyAISummary,
    WeeklyViewData,
    WTDViewData,
} from "@template/main-app/projects/types";
import { doc, getDoc } from "firebase/firestore";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";

// Collection
const COLLECTION = DB_COLLECTIONS.ANALYTICS;
const OWNER_ACTION_MARK_DONE_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const MAX_OBP_DASHBOARD_SUMMARY_READ_DIAGNOSTICS = 25;
const OBP_PROJECT_ID = 'obp';
const reportedOBPDashboardSummaryReadFailures = new Set<string>();

// ================================================================
// DOCUMENT ID HELPERS
// ================================================================

const getDocId = {
    daily: (tId: string, sId: string, projectId: string, date: string) =>
        `${tId}_${sId}_${projectId}_daily_${date}`,
    weekly: (tId: string, sId: string, projectId: string, week: string) =>
        `${tId}_${sId}_${projectId}_weekly_${week}`,
    monthly: (tId: string, sId: string, projectId: string, month: string) =>
        `${tId}_${sId}_${projectId}_monthly_${month}`,
    summary: (tId: string, sId: string, projectId: string) =>
        `${tId}_${sId}_${projectId}_overall_summary`,
    dashboardSummary: (tId: string, sId: string, projectId: string) =>
        `${tId}_${sId}_${projectId}_dashboard_summary`,
};

function logOBPDashboardSummaryReadFailure(
    error: unknown,
    params: {
        tId: string;
        sId: string;
        summaryDocId: string;
    },
): void {
    const failureKey = `${params.tId.length}:${params.sId.length}:${params.summaryDocId.length}`;
    if (reportedOBPDashboardSummaryReadFailures.has(failureKey)) return;
    if (reportedOBPDashboardSummaryReadFailures.size >= MAX_OBP_DASHBOARD_SUMMARY_READ_DIAGNOSTICS) return;
    reportedOBPDashboardSummaryReadFailures.add(failureKey);

    logAnalyticsFailure('owner_dashboard_obp_summary_read_failed', error, {
        ...getBoundedAnalyticsStringContext('tenantId', params.tId),
        ...getBoundedAnalyticsStringContext('storeId', params.sId),
        ...getBoundedAnalyticsStringContext('projectId', OBP_PROJECT_ID),
        ...getBoundedAnalyticsStringContext('summaryDocId', params.summaryDocId),
        fallbackPolicy: 'use_daily_obp_docs_without_views_change',
        summaryDocKind: 'overall_summary',
    });
}

// ================================================================
// DATE HELPERS
// ================================================================

function getYesterdayDate(timeZone?: string, businessDayEndTime?: string): string {
    return getLatestSettledBusinessDateKey(new Date(), timeZone, businessDayEndTime);
}

function getTodayDate(timeZone?: string, businessDayEndTime?: string): string {
    return getBusinessAnalyticsDateKey(new Date(), timeZone, businessDayEndTime);
}

function getCurrentWeekId(timeZone?: string, businessDayEndTime?: string): string {
    const settledKey = getYesterdayDate(timeZone, businessDayEndTime);
    const settledDate = parseAnalyticsDateKey(settledKey);
    const year = settledDate.getUTCFullYear();
    const weekNum = getAnalyticsISOWeek(settledKey);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getLastWeekId(timeZone?: string, businessDayEndTime?: string): string {
    const lastWeekKey = addDaysToAnalyticsDateKey(getYesterdayDate(timeZone, businessDayEndTime), -7);
    const lastWeek = parseAnalyticsDateKey(lastWeekKey);
    const year = lastWeek.getUTCFullYear();
    const weekNum = getAnalyticsISOWeek(lastWeekKey);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getCurrentMonthId(timeZone?: string, businessDayEndTime?: string): string {
    return getYesterdayDate(timeZone, businessDayEndTime).slice(0, 7);
}

function getLastMonthId(timeZone?: string, businessDayEndTime?: string): string {
    const today = parseAnalyticsDateKey(getTodayDate(timeZone, businessDayEndTime));
    const lastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const year = lastMonth.getUTCFullYear();
    const month = String(lastMonth.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getDateRange(startDate: Date, endDate: Date): string[] {
    return getAnalyticsDateRange(
        getAnalyticsDateKey(startDate),
        getAnalyticsDateKey(endDate),
    );
}

function getLast7Days(timeZone?: string, businessDayEndTime?: string): string[] {
    const yesterdayKey = getYesterdayDate(timeZone, businessDayEndTime);
    const sevenDaysAgoKey = addDaysToAnalyticsDateKey(yesterdayKey, -6);
    return getAnalyticsDateRange(sevenDaysAgoKey, yesterdayKey);
}

function getMonthToDateDates(timeZone?: string, businessDayEndTime?: string): string[] {
    const yesterdayKey = getYesterdayDate(timeZone, businessDayEndTime);
    const firstOfMonthKey = `${yesterdayKey.slice(0, 7)}-01`;
    return getAnalyticsDateRange(firstOfMonthKey, yesterdayKey);
}

function getWeekStartEnd(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday start
    const start = new Date(d);
    start.setUTCDate(diff);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start, end };
}

function formatWeekLabel(start: Date, end: Date): string {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = monthLabels[start.getUTCMonth()];
    const endMonth = monthLabels[end.getUTCMonth()];
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function formatMonthLabel(dateKey: string): string {
    const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const date = parseAnalyticsDateKey(dateKey);
    return `${monthLabels[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getLast4WeeksRanges(timeZone?: string, businessDayEndTime?: string): Array<{ start: Date; end: Date; weekId: string }> {
    const weeks: Array<{ start: Date; end: Date; weekId: string }> = [];
    const now = parseAnalyticsDateKey(getYesterdayDate(timeZone, businessDayEndTime));

    for (let i = 0; i < 4; i++) {
        const targetDate = new Date(now);
        targetDate.setUTCDate(targetDate.getUTCDate() - (i * 7));
        const { start, end } = getWeekStartEnd(targetDate);
        const year = start.getUTCFullYear();
        const weekNum = getAnalyticsISOWeek(getAnalyticsDateKey(start));
        weeks.push({
            start,
            end,
            weekId: `${year}-W${weekNum.toString().padStart(2, '0')}`,
        });
    }

    return weeks.reverse();
}

// ================================================================
// TRANSFORM HELPERS
// ================================================================

function readAnalyticsMap(data: any, field: string): Record<string, any> {
    const result: Record<string, any> = { ...(data?.[field] || {}) };
    const prefix = `${field}.`;

    Object.entries(data || {}).forEach(([key, value]) => {
        if (!key.startsWith(prefix)) return;
        Object.defineProperty(result, key.slice(prefix.length), {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
        });
    });

    return result;
}

function buildItemStatusLabel(input: {
    views: number;
    clicks: number;
    recommendationClicks: number;
    unavailableTaps: number;
}): Pick<TopItem, 'statusLabel' | 'statusTone' | 'statusReason'> {
    const totalActionTaps = input.clicks + input.recommendationClicks;
    if (input.unavailableTaps > 0) {
        return {
            statusLabel: 'Unavailable demand',
            statusTone: 'warning',
            statusReason: `${input.unavailableTaps} unavailable taps`,
        };
    }
    if (input.clicks >= 5 || input.recommendationClicks >= 3) {
        return {
            statusLabel: 'Strong item',
            statusTone: 'success',
            statusReason: `${totalActionTaps} item taps`,
        };
    }
    if (input.views >= 5 && totalActionTaps === 0) {
        return {
            statusLabel: 'Needs work',
            statusTone: 'warning',
            statusReason: `${input.views} views, no taps`,
        };
    }
    if (input.views >= 5) {
        return {
            statusLabel: 'Getting attention',
            statusTone: 'default',
            statusReason: `${input.views} views`,
        };
    }
    return {};
}

function transformToTopItems(data: any): TopItem[] {
    const viewsByItem = readAnalyticsMap(data, 'viewsByItem');
    const clicksByItem = readAnalyticsMap(data, 'clicksByItem');
    const recommendationClicksByItem = readAnalyticsMap(data, 'recommendationClicksByItem');
    const unavailableItemTapsByItem = readAnalyticsMap(data, 'unavailableItemTapsByItem');
    const itemNames = readAnalyticsMap(data, 'itemNames');
    const itemIds = new Set<string>([
        ...Object.keys(viewsByItem),
        ...Object.keys(clicksByItem),
        ...Object.keys(recommendationClicksByItem),
        ...Object.keys(unavailableItemTapsByItem),
    ]);
    if (!itemIds.size) return [];

    return Array.from(itemIds)
        .map((itemId) => {
            const views = Number(viewsByItem[itemId]) || 0;
            const clicks = Number(clicksByItem[itemId]) || 0;
            const recommendationClicks = Number(recommendationClicksByItem[itemId]) || 0;
            const unavailableTaps = Number(unavailableItemTapsByItem[itemId]) || 0;
            return {
                itemId,
                clicks,
                name: itemNames[itemId],
                views,
                recommendationClicks,
                unavailableTaps,
                ...buildItemStatusLabel({ views, clicks, recommendationClicks, unavailableTaps }),
                score: clicks + recommendationClicks + unavailableTaps + (views * 0.25),
            };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ score, ...item }) => item);
}

function transformOpenHoursActionBreakdown(data: any): OpenHoursActionBreakdown {
    const actionClicks = readAnalyticsMap(data, 'menuActionClicksByOpenHoursState');
    const actionSessions = readAnalyticsMap(data, 'actionSessionsByOpenHoursState');
    const open = Number(actionClicks.open) || 0;
    const closed = Number(actionClicks.closed) || 0;
    const unknown = Number(actionClicks.unknown) || 0;
    const total = open + closed + unknown;
    return {
        open,
        closed,
        unknown,
        actionSessionsOpen: Number(actionSessions.open) || 0,
        actionSessionsClosed: Number(actionSessions.closed) || 0,
        actionSessionsUnknown: Number(actionSessions.unknown) || 0,
        closedShare: total > 0 ? Math.round((closed / total) * 100) : 0,
    };
}

function transformBlockPerformance(data: any): BlockPerformance {
    const decisionBlocksRendered = readAnalyticsMap(data, 'decisionBlocksRendered');
    const recommendationClicks = readAnalyticsMap(data, 'recommendationClicks');
    return {
        popular: {
            rendered: decisionBlocksRendered.popular || 0,
            clicks: recommendationClicks.popular || 0,
        },
        quickPick: {
            rendered: decisionBlocksRendered.quickPick || 0,
            clicks: recommendationClicks.quickPick || 0,
        },
        bestValue: {
            rendered: decisionBlocksRendered.bestValue || 0,
            clicks: recommendationClicks.bestValue || 0,
        },
    };
}

function transformMenuActions(data: any): MenuActionBreakdown {
    const menuActionClicks = readAnalyticsMap(data, 'menuActionClicks');
    return {
        call: menuActionClicks.call || 0,
        whatsapp: menuActionClicks.whatsapp || 0,
        directions: menuActionClicks.directions || 0,
        reserve: menuActionClicks.reserve || 0,
        order: menuActionClicks.order || 0,
    };
}

function transformTopSearchTerms(data: any, field: 'searchTerms' | 'zeroResultSearchTerms' = 'searchTerms'): SearchTerm[] {
    const terms = readAnalyticsMap(data, field);
    if (!Object.keys(terms).length) return [];

    return Object.entries(terms)
        .map(([term, count]) => ({ term, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function transformUnavailableItems(data: any): TopItem[] {
    const unavailableItemTapsByItem = readAnalyticsMap(data, 'unavailableItemTapsByItem');
    const itemNames = readAnalyticsMap(data, 'itemNames');
    if (!Object.keys(unavailableItemTapsByItem).length) return [];

    return Object.entries(unavailableItemTapsByItem)
        .map(([itemId, clicks]) => ({
            itemId,
            clicks: clicks as number,
            name: itemNames[itemId],
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
}

function transformTopCategories(data: any): TopCategory[] {
    const views = readAnalyticsMap(data, 'viewsByCategory');
    const clicks = readAnalyticsMap(data, 'clicksByCategory');
    const categoryNames = readAnalyticsMap(data, 'categoryNames');
    const categoryIds = new Set<string>([
        ...Object.keys(views),
        ...Object.keys(clicks),
    ]);

    return Array.from(categoryIds)
        .map((categoryId) => ({
            categoryId,
            name: categoryNames[categoryId],
            views: views[categoryId] || 0,
            clicks: clicks[categoryId] || 0,
        }))
        .filter((category) => category.views > 0 || category.clicks > 0)
        .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
        .slice(0, 5);
}

function transformTopAttributeFilters(data: any): AttributeFilterInterest[] {
    const interactions = readAnalyticsMap(data, 'attributeFilterInteractions');
    const actionClicks = readAnalyticsMap(data, 'attributeFilterActionClicks');
    const itemViews = readAnalyticsMap(data, 'attributeFilterItemViews');
    const itemTaps = readAnalyticsMap(data, 'attributeFilterItemTaps');
    const searches = readAnalyticsMap(data, 'attributeFilterSearches');
    const unavailableTaps = readAnalyticsMap(data, 'attributeFilterUnavailableTaps');
    const attributeFilterNames = readAnalyticsMap(data, 'attributeFilterNames');
    const filterIds = new Set<string>([
        ...Object.keys(interactions),
        ...Object.keys(actionClicks),
        ...Object.keys(itemViews),
        ...Object.keys(itemTaps),
        ...Object.keys(searches),
        ...Object.keys(unavailableTaps),
    ]);

    return Array.from(filterIds)
        .map((filterId) => ({
            filterId,
            label: attributeFilterNames[filterId] || filterId,
            interactions: interactions[filterId] || 0,
            itemViews: itemViews[filterId] || 0,
            itemTaps: itemTaps[filterId] || 0,
            searches: searches[filterId] || 0,
            unavailableTaps: unavailableTaps[filterId] || 0,
            actionClicks: actionClicks[filterId] || 0,
        }))
        .filter((entry) => entry.interactions > 0 || entry.actionClicks > 0)
        .sort((a, b) => (b.actionClicks - a.actionClicks) || (b.interactions - a.interactions))
        .slice(0, 5);
}

const SOURCE_LABELS: Record<string, string> = {
    copy_link: 'Copied link',
    qr: 'QR / table scan',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    google: 'Google',
    obp: 'Official business page',
    menu_kit: 'Menu kit',
    native_share: 'Phone share',
    shortcut: 'Customer app shortcut',
    direct: 'Direct link',
    other: 'Other source',
};

function transformSourceQuality(data: any): SourceQuality[] {
    const sessions = readAnalyticsMap(data, 'menuSessionsBySource');
    const actionSessions = readAnalyticsMap(data, 'actionSessionsBySource');
    const actionClicks = readAnalyticsMap(data, 'menuActionClicksBySource');
    const sourceIds = new Set<string>([
        ...Object.keys(sessions),
        ...Object.keys(actionSessions),
        ...Object.keys(actionClicks),
    ]);

    return Array.from(sourceIds)
        .map((source) => {
            const menuSessions = sessions[source] || 0;
            const sourceActionSessions = actionSessions[source] || 0;
            return {
                source,
                label: SOURCE_LABELS[source] || source,
                menuSessions,
                actionSessions: sourceActionSessions,
                actionClicks: actionClicks[source] || 0,
                actionRate: menuSessions > 0 ? Math.round((sourceActionSessions / menuSessions) * 100) : 0,
            };
        })
        .filter((entry) => entry.menuSessions > 0 || entry.actionClicks > 0)
        .sort((a, b) => (b.actionSessions - a.actionSessions) || (b.menuSessions - a.menuSessions))
        .slice(0, 6);
}

function transformTrafficBreakdown(data: any, field: string): TrafficBreakdown[] {
    const values = readAnalyticsMap(data, field);
    if (!Object.keys(values).length) return [];

    return Object.entries(values)
        .map(([key, views]) => ({
            key,
            label: String(key).replace(/_/g, ' '),
            views: Number(views) || 0,
        }))
        .filter((entry) => entry.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 6);
}

function transformTopLanguages(data: any): LanguageUsage[] {
    if (!data?.languageTrackingEnabled) return [];

    const menuViews = readAnalyticsMap(data, 'menuViewsByLanguage');
    const menuSessions = readAnalyticsMap(data, 'menuSessionsByLanguage');
    const adoptions = readAnalyticsMap(data, 'languageAdoptions');
    const languageNames = readAnalyticsMap(data, 'languageNames');
    const languageIds = new Set<string>([
        ...Object.keys(menuViews),
        ...Object.keys(menuSessions),
        ...Object.keys(adoptions),
    ]);

    return Array.from(languageIds)
        .map((language) => ({
            language,
            label: languageNames[language] || language.toUpperCase(),
            menuViews: menuViews[language] || 0,
            menuSessions: menuSessions[language] || 0,
            adoptions: adoptions[language] || 0,
        }))
        .filter((entry) => entry.menuViews > 0 || entry.menuSessions > 0 || entry.adoptions > 0)
        .sort((a, b) => ((b.menuSessions + b.adoptions + b.menuViews) - (a.menuSessions + a.adoptions + a.menuViews)))
        .slice(0, 5);
}

function transformOwnerConfidence(data: any): OwnerConfidence {
    const metrics = transformMetrics(data);
    if ((metrics.menuVisits || 0) === 0) {
        return {
            status: 'no_data',
            label: 'Waiting for activity',
            message: 'No customer activity is available for this period yet.',
        };
    }
    if ((metrics.zeroResultSearches || 0) > 0 || (metrics.unavailableItemTaps || 0) > 0 || (metrics.actionRate || 0) < 10) {
        return {
            status: 'watch',
            label: 'Watch',
            message: 'Customers are showing interest, but one menu area needs attention.',
        };
    }
    return {
        status: 'stable',
        label: 'Menu state is stable',
        message: 'Customers are finding and using the menu normally.',
    };
}

function transformMetrics(data: any): OwnerDashboardMetrics {
    const menuSessions = data?.menuSessions || data?.totalSessions || 0;
    const engagedSessions = data?.engagedSessions || 0;
    const intentSessions = data?.intentSessions || 0;
    const actionSessions = data?.actionSessions || 0;

    return {
        menuVisits: data?.totalViews || 0,
        itemClicks: data?.totalClicks || 0,
        menuSessions,
        engagedSessions,
        intentSessions,
        actionSessions,
        engagedSessionRate: menuSessions > 0 ? Math.round((engagedSessions / menuSessions) * 100) : 0,
        intentRate: menuSessions > 0 ? Math.round((intentSessions / menuSessions) * 100) : 0,
        actionRate: menuSessions > 0 ? Math.round((actionSessions / menuSessions) * 100) : 0,
        searches: data?.totalSearches || 0,
        unavailableItemTaps: data?.totalUnavailableItemTaps || 0,
        menuActionClicks: data?.totalMenuActionClicks || 0,
        zeroResultSearches: data?.zeroResultSearches || 0,
        smartPicksRendered: data?.totalDecisionBlocksRendered || 0,
        smartPicksClicks: data?.totalRecommendationClicks || 0,
    };
}

// ================================================================
// AGGREGATION HELPERS
// ================================================================

interface DailyDocData {
    date: string;
    totalViews: number;
    totalClicks: number;
    menuSessions: number;
    engagedSessions: number;
    intentSessions: number;
    actionSessions: number;
    totalSearches: number;
    zeroResultSearches: number;
    totalUnavailableItemTaps: number;
    totalMenuActionClicks: number;
    totalDecisionBlocksRendered: number;
    totalRecommendationClicks: number;
    languageTrackingEnabled?: boolean;
    decisionBlocksRendered?: {
        popular?: number;
        quickPick?: number;
        bestValue?: number;
    };
    recommendationClicks?: {
        popular?: number;
        quickPick?: number;
        bestValue?: number;
    };
    viewsByItem?: Record<string, number>;
    clicksByItem?: Record<string, number>;
    recommendationClicksByItem?: Record<string, number>;
    viewsByCategory?: Record<string, number>;
    clicksByCategory?: Record<string, number>;
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
    hourlyViews?: Record<string, number>;
    hourlyMenuActionClicks?: Record<string, number>;
    menuActionClicks?: Partial<MenuActionBreakdown>;
    searchTerms?: Record<string, number>;
    zeroResultSearchTerms?: Record<string, number>;
    unavailableItemTapsByItem?: Record<string, number>;
    itemNames?: Record<string, string>;
    categoryNames?: Record<string, string>;
    languageNames?: Record<string, string>;
    attributeFilterNames?: Record<string, string>;
}

function mergeNumericMap(target: Record<string, number>, source?: Record<string, number>): void {
    Object.entries(source || {}).forEach(([key, value]) => {
        target[key] = (target[key] || 0) + (Number(value) || 0);
    });
}

async function fetchDailyDocs(
    tId: string,
    sId: string,
    projectId: string,
    dates: string[]
): Promise<DailyDocData[]> {
    const docs: DailyDocData[] = [];

    // Fetch in batches of 10 to avoid too many parallel requests
    const batchSize = 10;
    for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);
        const promises = batch.map(async (date) => {
            const docId = getDocId.daily(tId, sId, projectId, date);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    date,
                    totalViews: data.totalViews || 0,
                    totalClicks: data.totalClicks || 0,
                    menuSessions: data.menuSessions || 0,
                    engagedSessions: data.engagedSessions || 0,
                    intentSessions: data.intentSessions || 0,
                    actionSessions: data.actionSessions || 0,
                    totalSearches: data.totalSearches || 0,
                    zeroResultSearches: data.zeroResultSearches || 0,
                    totalUnavailableItemTaps: data.totalUnavailableItemTaps || 0,
                    totalMenuActionClicks: data.totalMenuActionClicks || 0,
                    totalDecisionBlocksRendered: data.totalDecisionBlocksRendered || 0,
                    totalRecommendationClicks: data.totalRecommendationClicks || 0,
                    languageTrackingEnabled: Boolean(data.languageTrackingEnabled),
                    decisionBlocksRendered: readAnalyticsMap(data, 'decisionBlocksRendered'),
                    recommendationClicks: readAnalyticsMap(data, 'recommendationClicks'),
                    viewsByItem: readAnalyticsMap(data, 'viewsByItem'),
                    clicksByItem: readAnalyticsMap(data, 'clicksByItem'),
                    recommendationClicksByItem: readAnalyticsMap(data, 'recommendationClicksByItem'),
                    viewsByCategory: readAnalyticsMap(data, 'viewsByCategory'),
                    clicksByCategory: readAnalyticsMap(data, 'clicksByCategory'),
                    viewsBySource: readAnalyticsMap(data, 'viewsBySource'),
                    viewsByMedium: readAnalyticsMap(data, 'viewsByMedium'),
                    viewsByCampaign: readAnalyticsMap(data, 'viewsByCampaign'),
                    viewsByContent: readAnalyticsMap(data, 'viewsByContent'),
                    viewsByEntrySource: readAnalyticsMap(data, 'viewsByEntrySource'),
                    menuSessionsBySource: readAnalyticsMap(data, 'menuSessionsBySource'),
                    actionSessionsBySource: readAnalyticsMap(data, 'actionSessionsBySource'),
                    actionSessionsByOpenHoursState: readAnalyticsMap(data, 'actionSessionsByOpenHoursState'),
                    menuActionClicksBySource: readAnalyticsMap(data, 'menuActionClicksBySource'),
                    menuActionClicksByOpenHoursState: readAnalyticsMap(data, 'menuActionClicksByOpenHoursState'),
                    menuViewsByLanguage: readAnalyticsMap(data, 'menuViewsByLanguage'),
                    menuSessionsByLanguage: readAnalyticsMap(data, 'menuSessionsByLanguage'),
                    languageAdoptions: readAnalyticsMap(data, 'languageAdoptions'),
                    attributeFilterInteractions: readAnalyticsMap(data, 'attributeFilterInteractions'),
                    attributeFilterItemViews: readAnalyticsMap(data, 'attributeFilterItemViews'),
                    attributeFilterItemTaps: readAnalyticsMap(data, 'attributeFilterItemTaps'),
                    attributeFilterSearches: readAnalyticsMap(data, 'attributeFilterSearches'),
                    attributeFilterUnavailableTaps: readAnalyticsMap(data, 'attributeFilterUnavailableTaps'),
                    attributeFilterActionClicks: readAnalyticsMap(data, 'attributeFilterActionClicks'),
                    hourlyViews: readAnalyticsMap(data, 'hourlyViews'),
                    hourlyMenuActionClicks: readAnalyticsMap(data, 'hourlyMenuActionClicks'),
                    menuActionClicks: readAnalyticsMap(data, 'menuActionClicks'),
                    searchTerms: readAnalyticsMap(data, 'searchTerms'),
                    zeroResultSearchTerms: readAnalyticsMap(data, 'zeroResultSearchTerms'),
                    unavailableItemTapsByItem: readAnalyticsMap(data, 'unavailableItemTapsByItem'),
                    itemNames: readAnalyticsMap(data, 'itemNames'),
                    categoryNames: readAnalyticsMap(data, 'categoryNames'),
                    languageNames: readAnalyticsMap(data, 'languageNames'),
                    attributeFilterNames: readAnalyticsMap(data, 'attributeFilterNames'),
                } as DailyDocData;
            }
            return null;
        });

        const results = await Promise.all(promises);
        docs.push(...results.filter((d): d is DailyDocData => d !== null));
    }

    return docs;
}

function aggregateDailyDocs(docs: DailyDocData[]): {
    metrics: OwnerDashboardMetrics;
    blockPerformance: BlockPerformance;
    topItems: TopItem[];
    topCategories: TopCategory[];
    topLanguages: LanguageUsage[];
    topAttributeFilters: AttributeFilterInterest[];
    menuActions: MenuActionBreakdown;
    openHoursActionBreakdown: OpenHoursActionBreakdown;
    topSearchTerms: SearchTerm[];
    topZeroResultSearchTerms: SearchTerm[];
    unavailableItems: TopItem[];
    sourceQuality: SourceQuality[];
    utmSources: TrafficBreakdown[];
    utmMediums: TrafficBreakdown[];
    utmCampaigns: TrafficBreakdown[];
    utmContent: TrafficBreakdown[];
    ownerConfidence: OwnerConfidence;
} {
    const metrics: OwnerDashboardMetrics = {
        menuVisits: 0,
        itemClicks: 0,
        menuSessions: 0,
        engagedSessions: 0,
        intentSessions: 0,
        actionSessions: 0,
        engagedSessionRate: 0,
        intentRate: 0,
        actionRate: 0,
        smartPicksRendered: 0,
        smartPicksClicks: 0,
        searches: 0,
        unavailableItemTaps: 0,
        menuActionClicks: 0,
        zeroResultSearches: 0,
    };

    const blockPerformance: BlockPerformance = {
        popular: { rendered: 0, clicks: 0 },
        quickPick: { rendered: 0, clicks: 0 },
        bestValue: { rendered: 0, clicks: 0 },
    };

    const itemClicksMap: Record<string, { clicks: number; name?: string }> = {};
    const topItemData = {
        viewsByItem: {} as Record<string, number>,
        clicksByItem: {} as Record<string, number>,
        recommendationClicksByItem: {} as Record<string, number>,
        unavailableItemTapsByItem: {} as Record<string, number>,
        itemNames: {} as Record<string, string>,
    };
    const categoryMap: Record<string, { views: number; clicks: number; name?: string }> = {};
    const searchTermMap: Record<string, number> = {};
    const zeroResultSearchTermMap: Record<string, number> = {};
    const unavailableItemsMap: Record<string, { clicks: number; name?: string }> = {};
    const sourceData = {
        menuSessionsBySource: {} as Record<string, number>,
        actionSessionsBySource: {} as Record<string, number>,
        menuActionClicksBySource: {} as Record<string, number>,
        viewsBySource: {} as Record<string, number>,
        viewsByMedium: {} as Record<string, number>,
        viewsByCampaign: {} as Record<string, number>,
        viewsByContent: {} as Record<string, number>,
    };
    const openHoursData = {
        menuActionClicksByOpenHoursState: {} as Record<string, number>,
        actionSessionsByOpenHoursState: {} as Record<string, number>,
    };
    const languageData = {
        languageTrackingEnabled: false,
        menuViewsByLanguage: {} as Record<string, number>,
        menuSessionsByLanguage: {} as Record<string, number>,
        languageAdoptions: {} as Record<string, number>,
        languageNames: {} as Record<string, string>,
    };
    const filterData = {
        attributeFilterInteractions: {} as Record<string, number>,
        attributeFilterItemViews: {} as Record<string, number>,
        attributeFilterItemTaps: {} as Record<string, number>,
        attributeFilterSearches: {} as Record<string, number>,
        attributeFilterUnavailableTaps: {} as Record<string, number>,
        attributeFilterActionClicks: {} as Record<string, number>,
        attributeFilterNames: {} as Record<string, string>,
    };
    const menuActions: MenuActionBreakdown = { call: 0, whatsapp: 0, directions: 0, reserve: 0, order: 0 };

    for (const doc of docs) {
        metrics.menuVisits += doc.totalViews;
        metrics.itemClicks += doc.totalClicks;
        metrics.menuSessions = (metrics.menuSessions || 0) + doc.menuSessions;
        metrics.engagedSessions = (metrics.engagedSessions || 0) + doc.engagedSessions;
        metrics.intentSessions = (metrics.intentSessions || 0) + doc.intentSessions;
        metrics.actionSessions = (metrics.actionSessions || 0) + doc.actionSessions;
        metrics.searches = (metrics.searches || 0) + doc.totalSearches;
        metrics.zeroResultSearches = (metrics.zeroResultSearches || 0) + doc.zeroResultSearches;
        metrics.unavailableItemTaps = (metrics.unavailableItemTaps || 0) + doc.totalUnavailableItemTaps;
        metrics.menuActionClicks = (metrics.menuActionClicks || 0) + doc.totalMenuActionClicks;
        metrics.smartPicksRendered += doc.totalDecisionBlocksRendered;
        metrics.smartPicksClicks += doc.totalRecommendationClicks;
        languageData.languageTrackingEnabled = Boolean(languageData.languageTrackingEnabled || doc.languageTrackingEnabled);

        if (doc.decisionBlocksRendered) {
            blockPerformance.popular.rendered += doc.decisionBlocksRendered.popular || 0;
            blockPerformance.quickPick.rendered += doc.decisionBlocksRendered.quickPick || 0;
            blockPerformance.bestValue.rendered += doc.decisionBlocksRendered.bestValue || 0;
        }

        if (doc.recommendationClicks) {
            blockPerformance.popular.clicks += doc.recommendationClicks.popular || 0;
            blockPerformance.quickPick.clicks += doc.recommendationClicks.quickPick || 0;
            blockPerformance.bestValue.clicks += doc.recommendationClicks.bestValue || 0;
        }

        if (doc.clicksByItem) {
            for (const [itemId, clicks] of Object.entries(doc.clicksByItem)) {
                if (!itemClicksMap[itemId]) {
                    itemClicksMap[itemId] = { clicks: 0, name: doc.itemNames?.[itemId] };
                }
                itemClicksMap[itemId].clicks += clicks;
            }
        }
        mergeNumericMap(topItemData.viewsByItem, doc.viewsByItem);
        mergeNumericMap(topItemData.clicksByItem, doc.clicksByItem);
        mergeNumericMap(topItemData.recommendationClicksByItem, doc.recommendationClicksByItem);
        mergeNumericMap(topItemData.unavailableItemTapsByItem, doc.unavailableItemTapsByItem);
        Object.assign(topItemData.itemNames, doc.itemNames || {});

        if (doc.viewsByCategory) {
            for (const [categoryId, views] of Object.entries(doc.viewsByCategory)) {
                if (!categoryMap[categoryId]) {
                    categoryMap[categoryId] = { views: 0, clicks: 0, name: doc.categoryNames?.[categoryId] };
                }
                categoryMap[categoryId].views += views;
            }
        }

        if (doc.clicksByCategory) {
            for (const [categoryId, clicks] of Object.entries(doc.clicksByCategory)) {
                if (!categoryMap[categoryId]) {
                    categoryMap[categoryId] = { views: 0, clicks: 0, name: doc.categoryNames?.[categoryId] };
                }
                categoryMap[categoryId].clicks += clicks;
            }
        }

        if (doc.searchTerms) {
            for (const [term, count] of Object.entries(doc.searchTerms)) {
                searchTermMap[term] = (searchTermMap[term] || 0) + count;
            }
        }

        if (doc.zeroResultSearchTerms) {
            for (const [term, count] of Object.entries(doc.zeroResultSearchTerms)) {
                zeroResultSearchTermMap[term] = (zeroResultSearchTermMap[term] || 0) + count;
            }
        }

        for (const [field, target] of [
            ['menuSessionsBySource', sourceData.menuSessionsBySource],
            ['actionSessionsBySource', sourceData.actionSessionsBySource],
            ['menuActionClicksBySource', sourceData.menuActionClicksBySource],
            ['actionSessionsByOpenHoursState', openHoursData.actionSessionsByOpenHoursState],
            ['menuActionClicksByOpenHoursState', openHoursData.menuActionClicksByOpenHoursState],
            ['viewsBySource', sourceData.viewsBySource],
            ['viewsByMedium', sourceData.viewsByMedium],
            ['viewsByCampaign', sourceData.viewsByCampaign],
            ['viewsByContent', sourceData.viewsByContent],
            ['menuViewsByLanguage', languageData.menuViewsByLanguage],
            ['menuSessionsByLanguage', languageData.menuSessionsByLanguage],
            ['languageAdoptions', languageData.languageAdoptions],
            ['attributeFilterInteractions', filterData.attributeFilterInteractions],
            ['attributeFilterItemViews', filterData.attributeFilterItemViews],
            ['attributeFilterItemTaps', filterData.attributeFilterItemTaps],
            ['attributeFilterSearches', filterData.attributeFilterSearches],
            ['attributeFilterUnavailableTaps', filterData.attributeFilterUnavailableTaps],
            ['attributeFilterActionClicks', filterData.attributeFilterActionClicks],
        ] as const) {
            const map = doc[field];
            if (!map) continue;
            for (const [key, count] of Object.entries(map)) {
                target[key] = (target[key] || 0) + count;
            }
        }

        if (doc.attributeFilterNames) {
            Object.assign(filterData.attributeFilterNames, doc.attributeFilterNames);
        }

        if (doc.languageNames) {
            Object.assign(languageData.languageNames, doc.languageNames);
        }

        if (doc.unavailableItemTapsByItem) {
            for (const [itemId, clicks] of Object.entries(doc.unavailableItemTapsByItem)) {
                if (!unavailableItemsMap[itemId]) {
                    unavailableItemsMap[itemId] = { clicks: 0, name: doc.itemNames?.[itemId] };
                }
                unavailableItemsMap[itemId].clicks += clicks;
            }
        }

        if (doc.menuActionClicks) {
            menuActions.call += doc.menuActionClicks.call || 0;
            menuActions.whatsapp += doc.menuActionClicks.whatsapp || 0;
            menuActions.directions += doc.menuActionClicks.directions || 0;
            menuActions.reserve += doc.menuActionClicks.reserve || 0;
            menuActions.order += doc.menuActionClicks.order || 0;
        }
    }

    const menuSessions = metrics.menuSessions || 0;
    metrics.engagedSessionRate = menuSessions > 0 ? Math.round(((metrics.engagedSessions || 0) / menuSessions) * 100) : 0;
    metrics.intentRate = menuSessions > 0 ? Math.round(((metrics.intentSessions || 0) / menuSessions) * 100) : 0;
    metrics.actionRate = menuSessions > 0 ? Math.round(((metrics.actionSessions || 0) / menuSessions) * 100) : 0;

    const topItems = transformToTopItems(topItemData);

    const topSearchTerms: SearchTerm[] = Object.entries(searchTermMap)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const topZeroResultSearchTerms: SearchTerm[] = Object.entries(zeroResultSearchTermMap)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const topCategories: TopCategory[] = Object.entries(categoryMap)
        .map(([categoryId, data]) => ({
            categoryId,
            views: data.views,
            clicks: data.clicks,
            name: data.name,
        }))
        .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
        .slice(0, 5);
    const topLanguages = transformTopLanguages(languageData);
    const topAttributeFilters = transformTopAttributeFilters(filterData);

    const unavailableItems: TopItem[] = Object.entries(unavailableItemsMap)
        .map(([itemId, data]) => ({
            itemId,
            clicks: data.clicks,
            name: data.name,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

    return {
        metrics,
        blockPerformance,
        topItems,
        topCategories,
        topLanguages,
        topAttributeFilters,
        menuActions,
        openHoursActionBreakdown: transformOpenHoursActionBreakdown(openHoursData),
        topSearchTerms,
        topZeroResultSearchTerms,
        unavailableItems,
        sourceQuality: transformSourceQuality(sourceData),
        utmSources: transformTrafficBreakdown(sourceData, 'viewsBySource'),
        utmMediums: transformTrafficBreakdown(sourceData, 'viewsByMedium'),
        utmCampaigns: transformTrafficBreakdown(sourceData, 'viewsByCampaign'),
        utmContent: transformTrafficBreakdown(sourceData, 'viewsByContent'),
        ownerConfidence: transformOwnerConfidence({
            totalViews: metrics.menuVisits,
            menuSessions: metrics.menuSessions,
            engagedSessions: metrics.engagedSessions,
            actionSessions: metrics.actionSessions,
            zeroResultSearches: metrics.zeroResultSearches,
            totalUnavailableItemTaps: metrics.unavailableItemTaps,
        }),
    };
}

function buildDailyViewData(
    data: Record<string, any>,
    date: string,
    options?: {
        includeAiSummary?: boolean;
        isPartial?: boolean;
    }
): DailyViewData {
    const menuVisits = data.totalViews || 0;

    return {
        date,
        metrics: transformMetrics(data),
        blockPerformance: transformBlockPerformance(data),
        topItems: transformToTopItems(data),
        topCategories: transformTopCategories(data),
        topLanguages: data.topLanguages || transformTopLanguages(data),
        topAttributeFilters: data.topAttributeFilters || transformTopAttributeFilters(data),
        menuActions: transformMenuActions(data),
        openHoursActionBreakdown: data.openHoursActionBreakdown || transformOpenHoursActionBreakdown(data),
        topSearchTerms: transformTopSearchTerms(data),
        topZeroResultSearchTerms: data.topZeroResultSearchTerms || transformTopSearchTerms(data, 'zeroResultSearchTerms'),
        unavailableItems: transformUnavailableItems(data),
        sourceQuality: data.sourceQuality || transformSourceQuality(data),
        utmSources: data.utmSources || transformTrafficBreakdown(data, 'viewsBySource'),
        utmMediums: data.utmMediums || transformTrafficBreakdown(data, 'viewsByMedium'),
        utmCampaigns: data.utmCampaigns || transformTrafficBreakdown(data, 'viewsByCampaign'),
        utmContent: data.utmContent || transformTrafficBreakdown(data, 'viewsByContent'),
        ownerConfidence: data.ownerConfidence || transformOwnerConfidence(data),
        aiSummary: options?.includeAiSummary && data.aiSummary ? {
            markdown: data.aiSummary.markdown,
            bulletPoints: data.aiSummary.bulletPoints || [],
            generatedAt: data.aiSummary.generatedAt?.toDate?.() || new Date(),
            promptVersion: data.aiSummary.promptVersion || 'v1',
        } : undefined,
        isLowActivity: menuVisits < DAILY_GUARDRAILS.LOW_ACTIVITY_THRESHOLD,
        isPartial: options?.isPartial,
        lastUpdated: data.lastUpdated?.toDate?.() || undefined,
    } as DailyViewData;
}

function parseDateValue(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeWeeklyAiSummary(data: Record<string, any>): WeeklyAISummary | undefined {
    if (!data?.aiSummary) return undefined;
    return {
        ...data.aiSummary,
        generatedAt: parseDateValue(data.aiSummary.generatedAt) || new Date(),
        period: data.aiSummary.period || {
            start: data.weekStart || '',
            end: data.weekEnd || '',
        },
    } as WeeklyAISummary;
}

function normalizeDailyViewData(data: any): DailyViewData | null {
    if (!data) return null;
    return {
        ...data,
        blockPerformance: data.blockPerformance || transformBlockPerformance(data),
        topItems: data.topItems || transformToTopItems(data),
        topCategories: data.topCategories || transformTopCategories(data),
        topLanguages: data.topLanguages || transformTopLanguages(data),
        topAttributeFilters: data.topAttributeFilters || transformTopAttributeFilters(data),
        menuActions: data.menuActions || transformMenuActions(data),
        openHoursActionBreakdown: data.openHoursActionBreakdown || transformOpenHoursActionBreakdown(data),
        topSearchTerms: data.topSearchTerms || transformTopSearchTerms(data),
        topZeroResultSearchTerms: data.topZeroResultSearchTerms || transformTopSearchTerms(data, 'zeroResultSearchTerms'),
        unavailableItems: data.unavailableItems || transformUnavailableItems(data),
        sourceQuality: data.sourceQuality || transformSourceQuality(data),
        utmSources: data.utmSources || transformTrafficBreakdown(data, 'viewsBySource'),
        utmMediums: data.utmMediums || transformTrafficBreakdown(data, 'viewsByMedium'),
        utmCampaigns: data.utmCampaigns || transformTrafficBreakdown(data, 'viewsByCampaign'),
        utmContent: data.utmContent || transformTrafficBreakdown(data, 'viewsByContent'),
        ownerConfidence: data.ownerConfidence || transformOwnerConfidence(data),
        lastUpdated: parseDateValue(data.lastUpdated),
        aiSummary: data.aiSummary ? {
            ...data.aiSummary,
            generatedAt: parseDateValue(data.aiSummary.generatedAt) || new Date(),
        } : undefined,
    } as DailyViewData;
}

function normalizePeriodViewData<T extends WeeklyViewData | MonthlyViewData | WTDViewData | MTDViewData>(data: any): T | null {
    if (!data) return null;
    return {
        ...data,
        metrics: data.metrics || transformMetrics(data),
        blockPerformance: data.blockPerformance || transformBlockPerformance(data),
        topItems: data.topItems || transformToTopItems(data),
        topCategories: data.topCategories || transformTopCategories(data),
        topLanguages: data.topLanguages || transformTopLanguages(data),
        topAttributeFilters: data.topAttributeFilters || transformTopAttributeFilters(data),
        menuActions: data.menuActions || transformMenuActions(data),
        openHoursActionBreakdown: data.openHoursActionBreakdown || transformOpenHoursActionBreakdown(data),
        topSearchTerms: data.topSearchTerms || transformTopSearchTerms(data),
        topZeroResultSearchTerms: data.topZeroResultSearchTerms || transformTopSearchTerms(data, 'zeroResultSearchTerms'),
        unavailableItems: data.unavailableItems || transformUnavailableItems(data),
        sourceQuality: data.sourceQuality || transformSourceQuality(data),
        utmSources: data.utmSources || transformTrafficBreakdown(data, 'viewsBySource'),
        utmMediums: data.utmMediums || transformTrafficBreakdown(data, 'viewsByMedium'),
        utmCampaigns: data.utmCampaigns || transformTrafficBreakdown(data, 'viewsByCampaign'),
        utmContent: data.utmContent || transformTrafficBreakdown(data, 'viewsByContent'),
        ownerConfidence: data.ownerConfidence || transformOwnerConfidence(data),
        aiSummary: data.aiSummary ? {
            ...data.aiSummary,
            generatedAt: parseDateValue(data.aiSummary.generatedAt) || new Date(),
        } : undefined,
    } as T;
}

function normalizeOverviewData(data: any): OverviewData | null {
    if (!data) return null;
    return {
        ...data,
        wtd: normalizePeriodViewData<WTDViewData>(data.wtd),
        mtd: normalizePeriodViewData<MTDViewData>(data.mtd),
        yesterday: normalizeDailyViewData(data.yesterday),
        ownerActionPlan: normalizeOwnerActionPlan(data.ownerActionPlan),
        ownerConfidence: data.ownerConfidence,
        sourceQuality: data.sourceQuality || [],
        analyticsAiEntitlement: data.analyticsAiEntitlement,
        catalogInsightCount: data.catalogInsightCount,
        catalogInsightGeneratedAt: parseDateValue(data.catalogInsightGeneratedAt),
        aiSummary: data.aiSummary ? {
            ...data.aiSummary,
            generatedAt: parseDateValue(data.aiSummary.generatedAt) || new Date(),
        } : undefined,
    } as OverviewData;
}

function normalizeOwnerActionReceipt(data: any): OwnerActionReceipt | undefined {
    if (!data || !data.receiptId || !data.actionId) return undefined;
    const result = data.result ? {
        ...data.result,
        checkedAt: parseDateValue(data.result.checkedAt),
    } : undefined;

    return {
        ...data,
        markedDoneAt: parseDateValue(data.markedDoneAt) || new Date(),
        result,
    } as OwnerActionReceipt;
}

type OwnerActionMarkDonePayload = {
    success: true;
    receipt: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isOwnerActionMarkDonePayload(value: unknown): value is OwnerActionMarkDonePayload {
    return isRecord(value) && value.success === true && isRecord(value.receipt);
}

function getOwnerActionMarkDoneResponseContext(params: {
    projectId: string;
    action: OwnerActionSuggestion;
    response?: Response;
}) {
    return {
        ...getBoundedAnalyticsStringContext('projectId', params.projectId),
        ...getBoundedAnalyticsStringContext('actionId', params.action.id),
        ...getBoundedAnalyticsStringContext('actionType', params.action.type),
        ...getBoundedAnalyticsStringContext('actionTitle', params.action.title),
        ...getBoundedAnalyticsStringContext('actionLabel', params.action.actionLabel),
        responseOk: params.response?.ok,
        responseStatus: params.response?.status,
    };
}

async function readOwnerActionMarkDoneResponse(
    response: Response,
    params: {
        projectId: string;
        action: OwnerActionSuggestion;
    },
): Promise<unknown> {
    try {
        return await readJsonResponseWithLimit<unknown>(response, OWNER_ACTION_MARK_DONE_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logAnalyticsFailure(
            'owner_dashboard_action_mark_done_response_parse_failed',
            error,
            getOwnerActionMarkDoneResponseContext({ ...params, response }),
        );
        return null;
    }
}

function normalizeOwnerActionReceipts(data: any): Record<string, OwnerActionReceipt> | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const receipts = Object.entries(data).reduce<Record<string, OwnerActionReceipt>>((acc, [key, value]) => {
        const receipt = normalizeOwnerActionReceipt(value);
        if (receipt) acc[key] = receipt;
        return acc;
    }, {});
    return Object.keys(receipts).length > 0 ? receipts : undefined;
}

function normalizeOwnerActionPlan(data: any, fallbackReceipts?: any): OwnerActionPlan | undefined {
    if (!data || !Array.isArray(data.actions)) return undefined;
    const receipts = normalizeOwnerActionReceipts(data.receipts || fallbackReceipts);
    return {
        generatedBy: data.generatedBy || 'rules',
        actions: data.actions.map((action: any) => ({
            ...action,
            receipt: normalizeOwnerActionReceipt(action.receipt),
            result: action.result ? {
                ...action.result,
                checkedAt: parseDateValue(action.result.checkedAt),
            } : undefined,
        })),
        fingerprint: data.fingerprint,
        receipts,
    };
}

function normalizeOwnerDashboardData(data: any, projectId: string): OwnerDashboardData {
    const overview = normalizeOverviewData(data.overview);
    const daily = normalizeDailyViewData(data.daily || data.overview?.yesterday);
    const ownerActionPlan = normalizeOwnerActionPlan(data.ownerActionPlan || overview?.ownerActionPlan, data.ownerActionReceipts);

    return {
        overview,
        today: null,
        daily,
        weekly: normalizePeriodViewData<WeeklyViewData>(data.weekly),
        monthly: normalizePeriodViewData<MonthlyViewData>(data.monthly),
        wtd: normalizePeriodViewData<WTDViewData>(data.wtd || overview?.wtd),
        mtd: normalizePeriodViewData<MTDViewData>(data.mtd || overview?.mtd),
        historicalWeeks: data.historicalWeeks || overview?.historicalWeeks || [],
        overall: data.overall ? {
            ...data.overall,
            blockPerformance: data.overall.blockPerformance || transformBlockPerformance(data.overall),
            topItems: data.overall.topItems || transformToTopItems(data.overall),
            topCategories: data.overall.topCategories || transformTopCategories(data.overall),
            topLanguages: data.overall.topLanguages || transformTopLanguages(data.overall),
            topAttributeFilters: data.overall.topAttributeFilters || transformTopAttributeFilters(data.overall),
            menuActions: data.overall.menuActions || transformMenuActions(data.overall),
            openHoursActionBreakdown: data.overall.openHoursActionBreakdown || transformOpenHoursActionBreakdown(data.overall),
            topSearchTerms: data.overall.topSearchTerms || transformTopSearchTerms(data.overall),
            topZeroResultSearchTerms: data.overall.topZeroResultSearchTerms || transformTopSearchTerms(data.overall, 'zeroResultSearchTerms'),
            unavailableItems: data.overall.unavailableItems || transformUnavailableItems(data.overall),
            sourceQuality: data.overall.sourceQuality || transformSourceQuality(data.overall),
            utmSources: data.overall.utmSources || transformTrafficBreakdown(data.overall, 'viewsBySource'),
            utmMediums: data.overall.utmMediums || transformTrafficBreakdown(data.overall, 'viewsByMedium'),
            utmCampaigns: data.overall.utmCampaigns || transformTrafficBreakdown(data.overall, 'viewsByCampaign'),
            utmContent: data.overall.utmContent || transformTrafficBreakdown(data.overall, 'viewsByContent'),
            ownerConfidence: data.overall.ownerConfidence || transformOwnerConfidence({
                totalViews: data.overall.lifetimeMetrics?.totalViews || 0,
                menuSessions: data.overall.lifetimeMetrics?.menuSessions || 0,
                engagedSessions: data.overall.lifetimeMetrics?.engagedSessions || 0,
                actionSessions: data.overall.lifetimeMetrics?.actionSessions || 0,
                zeroResultSearches: data.overall.lifetimeMetrics?.totalZeroResultSearches || 0,
                totalUnavailableItemTaps: data.overall.lifetimeMetrics?.totalUnavailableItemTaps || 0,
            }),
            lastUpdated: parseDateValue(data.overall.lastUpdated),
        } as OverallData : null,
        ownerActionPlan,
        ownerConfidence: data.ownerConfidence || overview?.ownerConfidence,
        sourceQuality: data.sourceQuality || overview?.sourceQuality || [],
        analyticsAiEntitlement: data.analyticsAiEntitlement || overview?.analyticsAiEntitlement,
        catalogInsightCount: data.catalogInsightCount || overview?.catalogInsightCount,
        catalogInsightGeneratedAt: parseDateValue(data.catalogInsightGeneratedAt) || overview?.catalogInsightGeneratedAt,
        projectId,
        lastFetched: new Date(),
    };
}

function emptyOwnerDashboardData(projectId: string): OwnerDashboardData {
    return {
        overview: null,
        today: null,
        daily: null,
        weekly: null,
        monthly: null,
        wtd: null,
        mtd: null,
        historicalWeeks: [],
        overall: null,
        projectId,
        lastFetched: new Date(),
    };
}

// ================================================================
// FETCH DAILY DATA
// ================================================================

export async function getOwnerDashboardToday(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<DailyViewData | null> {
    return await apiCallComposer(
        async () => {
            const todayDate = getTodayDate(timeZone, businessDayEndTime);
            const docId = getDocId.daily(tId, sId, projectId, todayDate);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            return buildDailyViewData(docSnap.data(), todayDate, {
                includeAiSummary: false,
                isPartial: true,
            });
        },
        "getOwnerDashboardToday"
    );
}

export async function getOwnerDashboardDaily(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<DailyViewData | null> {
    return await apiCallComposer(
        async () => {
            const yesterdayDate = getYesterdayDate(timeZone, businessDayEndTime);
            const docId = getDocId.daily(tId, sId, projectId, yesterdayDate);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            return buildDailyViewData(docSnap.data(), yesterdayDate, {
                includeAiSummary: false,
                isPartial: false,
            });
        },
        "getOwnerDashboardDaily"
    );
}

// ================================================================
// FETCH WEEKLY DATA
// ================================================================

export async function getOwnerDashboardWeekly(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<WeeklyViewData | null> {
    return await apiCallComposer(
        async () => {
            const summaryDocId = getDocId.summary(tId, sId, projectId);
            const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
            const summarySnap = await getDoc(summaryRef);

            if (!summarySnap.exists()) {
                return null;
            }

            const summaryData = summarySnap.data();
            const currentWeekDocId = getDocId.weekly(tId, sId, projectId, getCurrentWeekId(timeZone, businessDayEndTime));
            const lastWeekDocId = getDocId.weekly(tId, sId, projectId, getLastWeekId(timeZone, businessDayEndTime));
            const currentWeekSnap = await getDoc(doc(firebaseClient, COLLECTION, currentWeekDocId));
            const lastWeekSnap = currentWeekSnap.exists()
                ? currentWeekSnap
                : await getDoc(doc(firebaseClient, COLLECTION, lastWeekDocId));

            if (!lastWeekSnap.exists()) {
                return null;
            }

            const weeklyData = lastWeekSnap.data();

            return {
                weekStart: weeklyData.weekStart || '',
                weekEnd: weeklyData.weekEnd || '',
                metrics: transformMetrics(weeklyData),
                metricsChange: summaryData.ownerDashboardSummaryMetrics?.menuVisitsChange !== undefined ? {
                    menuVisitsChange: summaryData.ownerDashboardSummaryMetrics.menuVisitsChange,
                } : undefined,
                blockPerformance: transformBlockPerformance(weeklyData),
                topItems: transformToTopItems(weeklyData),
                topCategories: transformTopCategories(weeklyData),
                topLanguages: weeklyData.topLanguages || transformTopLanguages(weeklyData),
                topAttributeFilters: weeklyData.topAttributeFilters || transformTopAttributeFilters(weeklyData),
                menuActions: transformMenuActions(weeklyData),
                topSearchTerms: transformTopSearchTerms(weeklyData),
                topZeroResultSearchTerms: weeklyData.topZeroResultSearchTerms || transformTopSearchTerms(weeklyData, 'zeroResultSearchTerms'),
                unavailableItems: transformUnavailableItems(weeklyData),
                sourceQuality: weeklyData.sourceQuality || transformSourceQuality(weeklyData),
                utmSources: weeklyData.utmSources || transformTrafficBreakdown(weeklyData, 'viewsBySource'),
                utmMediums: weeklyData.utmMediums || transformTrafficBreakdown(weeklyData, 'viewsByMedium'),
                utmCampaigns: weeklyData.utmCampaigns || transformTrafficBreakdown(weeklyData, 'viewsByCampaign'),
                utmContent: weeklyData.utmContent || transformTrafficBreakdown(weeklyData, 'viewsByContent'),
                aiSummary: normalizeWeeklyAiSummary(weeklyData),
            } as WeeklyViewData;
        },
        "getOwnerDashboardWeekly"
    );
}

async function getOwnerDashboardWeeklyAiSummary(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<WeeklyAISummary | undefined> {
    const currentWeekDocId = getDocId.weekly(tId, sId, projectId, getCurrentWeekId(timeZone, businessDayEndTime));
    const lastWeekDocId = getDocId.weekly(tId, sId, projectId, getLastWeekId(timeZone, businessDayEndTime));
    const currentWeekSnap = await getDoc(doc(firebaseClient, COLLECTION, currentWeekDocId));
    const weeklySnap = currentWeekSnap.exists()
        ? currentWeekSnap
        : await getDoc(doc(firebaseClient, COLLECTION, lastWeekDocId));

    return weeklySnap.exists() ? normalizeWeeklyAiSummary(weeklySnap.data()) : undefined;
}

// ================================================================
// FETCH MONTHLY DATA
// ================================================================

export async function getOwnerDashboardMonthly(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<MonthlyViewData | null> {
    return await apiCallComposer(
        async () => {
            // Try last month first (since current month is incomplete)
            const lastMonthId = getLastMonthId(timeZone, businessDayEndTime);
            const docId = getDocId.monthly(tId, sId, projectId, lastMonthId);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();

            return {
                monthStart: data.monthStart || '',
                monthEnd: data.monthEnd || '',
                daysWithData: data.daysWithData || 0,
                metrics: transformMetrics(data),
                blockPerformance: transformBlockPerformance(data),
                topItems: transformToTopItems(data),
                topCategories: transformTopCategories(data),
                topLanguages: data.topLanguages || transformTopLanguages(data),
                topAttributeFilters: data.topAttributeFilters || transformTopAttributeFilters(data),
                menuActions: transformMenuActions(data),
                topSearchTerms: transformTopSearchTerms(data),
                topZeroResultSearchTerms: data.topZeroResultSearchTerms || transformTopSearchTerms(data, 'zeroResultSearchTerms'),
                unavailableItems: transformUnavailableItems(data),
                sourceQuality: data.sourceQuality || transformSourceQuality(data),
                utmSources: data.utmSources || transformTrafficBreakdown(data, 'viewsBySource'),
                utmMediums: data.utmMediums || transformTrafficBreakdown(data, 'viewsByMedium'),
                utmCampaigns: data.utmCampaigns || transformTrafficBreakdown(data, 'viewsByCampaign'),
                utmContent: data.utmContent || transformTrafficBreakdown(data, 'viewsByContent'),
            } as MonthlyViewData;
        },
        "getOwnerDashboardMonthly"
    );
}

// ================================================================
// FETCH WTD (Week-to-Date / Rolling 7 Days)
// ================================================================

export async function getOwnerDashboardWTD(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<WTDViewData | null> {
    return await apiCallComposer(
        async () => {
            const dates = getLast7Days(timeZone, businessDayEndTime);
            const docs = await fetchDailyDocs(tId, sId, projectId, dates);

            if (docs.length === 0) {
                return null;
            }

            const { metrics, blockPerformance, topItems, topCategories, topLanguages, topAttributeFilters, menuActions, openHoursActionBreakdown, topSearchTerms, topZeroResultSearchTerms, unavailableItems, sourceQuality, utmSources, utmMediums, utmCampaigns, utmContent, ownerConfidence } = aggregateDailyDocs(docs);

            return {
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                daysWithData: docs.length,
                metrics,
                blockPerformance,
                topItems,
                topCategories,
                topLanguages,
                topAttributeFilters,
                menuActions,
                openHoursActionBreakdown,
                topSearchTerms,
                topZeroResultSearchTerms,
                unavailableItems,
                sourceQuality,
                utmSources,
                utmMediums,
                utmCampaigns,
                utmContent,
                ownerConfidence,
            } as WTDViewData;
        },
        "getOwnerDashboardWTD"
    );
}

// ================================================================
// FETCH MTD (Month-to-Date)
// ================================================================

export async function getOwnerDashboardMTD(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<MTDViewData | null> {
    return await apiCallComposer(
        async () => {
            const dates = getMonthToDateDates(timeZone, businessDayEndTime);

            if (dates.length === 0) {
                return null;
            }

            const docs = await fetchDailyDocs(tId, sId, projectId, dates);

            if (docs.length === 0) {
                return null;
            }

            const { metrics, blockPerformance, topItems, topCategories, topLanguages, topAttributeFilters, menuActions, openHoursActionBreakdown, topSearchTerms, topZeroResultSearchTerms, unavailableItems, sourceQuality, utmSources, utmMediums, utmCampaigns, utmContent, ownerConfidence } = aggregateDailyDocs(docs);

            // Get month name
            const firstDate = parseAnalyticsDateKey(dates[0]);
            const monthName = formatMonthLabel(dates[0]);

            // Get days in month
            const daysInMonth = new Date(Date.UTC(
                firstDate.getUTCFullYear(),
                firstDate.getUTCMonth() + 1,
                0
            )).getUTCDate();

            return {
                monthName,
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                daysWithData: docs.length,
                daysInMonth,
                metrics,
                blockPerformance,
                topItems,
                topCategories,
                topLanguages,
                topAttributeFilters,
                menuActions,
                openHoursActionBreakdown,
                topSearchTerms,
                topZeroResultSearchTerms,
                unavailableItems,
                sourceQuality,
                utmSources,
                utmMediums,
                utmCampaigns,
                utmContent,
                ownerConfidence,
                avgDailyScans: docs.length > 0
                    ? Math.round(metrics.menuVisits / docs.length)
                    : 0,
            } as MTDViewData;
        },
        "getOwnerDashboardMTD"
    );
}

// ================================================================
// FETCH HISTORICAL WEEKS (Last 4 Weeks)
// ================================================================

export async function getOwnerDashboardHistoricalWeeks(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<HistoricalWeek[]> {
    return await apiCallComposer(
        async () => {
            const weekRanges = getLast4WeeksRanges(timeZone, businessDayEndTime);
            const currentWeekId = getCurrentWeekId(timeZone, businessDayEndTime);

            // Fetch all weeks in parallel for better performance
            const weekPromises = weekRanges.map(async (week) => {
                const dates = getDateRange(week.start, week.end);
                const docs = await fetchDailyDocs(tId, sId, projectId, dates);

                if (docs.length > 0) {
                    const { metrics } = aggregateDailyDocs(docs);
                    return {
                        weekStart: formatAnalyticsDateKey(week.start),
                        weekEnd: formatAnalyticsDateKey(week.end),
                        weekLabel: formatWeekLabel(week.start, week.end),
                        metrics,
                        isCurrentWeek: week.weekId === currentWeekId,
                    } as HistoricalWeek;
                }
                return null;
            });

            const results = await Promise.all(weekPromises);
            return results.filter((w): w is HistoricalWeek => w !== null);
        },
        "getOwnerDashboardHistoricalWeeks"
    ) || [];
}

// ================================================================
// BUILD OVERVIEW DATA (OPTIMIZED - Single Fetch Strategy)
// ================================================================

/**
 * Optimized Overview Fetch
 * 
 * BEFORE: ~69 reads (duplicate fetches for overlapping dates)
 * AFTER:  ~35 reads max (fetch each date only once)
 * 
 * Strategy:
 * 1. Calculate ALL unique dates needed (MTD + historical weeks beyond MTD)
 * 2. Fetch all unique dates in ONE batch
 * 3. Aggregate into WTD, MTD, Daily, Historical from cached data
 */
export async function getOwnerDashboardOverview(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<OverviewData | null> {
    return await apiCallComposer(
        async () => {
            // Step 1: Calculate all date ranges
            const yesterdayDate = getYesterdayDate(timeZone, businessDayEndTime);
            const wtdDates = getLast7Days(timeZone, businessDayEndTime);
            const mtdDates = getMonthToDateDates(timeZone, businessDayEndTime);
            const weekRanges = getLast4WeeksRanges(timeZone, businessDayEndTime);
            const currentWeekId = getCurrentWeekId(timeZone, businessDayEndTime);

            // Step 2: Collect ALL unique dates needed
            const allDatesSet = new Set<string>();

            // Add MTD dates (includes WTD and yesterday)
            mtdDates.forEach(d => allDatesSet.add(d));

            // Add historical weeks dates (may extend beyond MTD)
            for (const week of weekRanges) {
                const weekDates = getDateRange(week.start, week.end);
                weekDates.forEach(d => allDatesSet.add(d));
            }

            const allUniqueDates = Array.from(allDatesSet).sort();

            // Step 3: Fetch ALL docs in ONE batch (reduces reads from ~69 to ~35)
            const allDocs = await fetchDailyDocs(tId, sId, projectId, allUniqueDates);

            // Create lookup map for fast access
            const docsMap = new Map<string, DailyDocData>();
            for (const doc of allDocs) {
                docsMap.set(doc.date, doc);
            }

            // Step 4: Build WTD from cached data
            const wtdDocs = wtdDates
                .map(d => docsMap.get(d))
                .filter((d): d is DailyDocData => d !== undefined);

            let wtd: WTDViewData | null = null;
            if (wtdDocs.length > 0) {
                const { metrics, blockPerformance, topItems, topCategories, topLanguages, topAttributeFilters, menuActions, openHoursActionBreakdown, topSearchTerms, topZeroResultSearchTerms, unavailableItems, sourceQuality, utmSources, utmMediums, utmCampaigns, utmContent, ownerConfidence } = aggregateDailyDocs(wtdDocs);
                wtd = {
                    startDate: wtdDates[0],
                    endDate: wtdDates[wtdDates.length - 1],
                    daysWithData: wtdDocs.length,
                    metrics,
                    blockPerformance,
                    topItems,
                    topCategories,
                    topLanguages,
                    topAttributeFilters,
                    menuActions,
                    openHoursActionBreakdown,
                    topSearchTerms,
                    topZeroResultSearchTerms,
                    unavailableItems,
                    sourceQuality,
                    utmSources,
                    utmMediums,
                    utmCampaigns,
                    utmContent,
                    ownerConfidence,
                };
            }

            // Step 5: Build MTD from cached data
            const mtdDocs = mtdDates
                .map(d => docsMap.get(d))
                .filter((d): d is DailyDocData => d !== undefined);

            let mtd: MTDViewData | null = null;
            if (mtdDocs.length > 0) {
                const { metrics, blockPerformance, topItems, topCategories, topLanguages, topAttributeFilters, menuActions, openHoursActionBreakdown, topSearchTerms, topZeroResultSearchTerms, unavailableItems, sourceQuality, utmSources, utmMediums, utmCampaigns, utmContent, ownerConfidence } = aggregateDailyDocs(mtdDocs);
                const firstDate = parseAnalyticsDateKey(mtdDates[0]);
                const monthName = formatMonthLabel(mtdDates[0]);
                const daysInMonth = new Date(Date.UTC(
                    firstDate.getUTCFullYear(),
                    firstDate.getUTCMonth() + 1,
                    0
                )).getUTCDate();

                mtd = {
                    monthName,
                    startDate: mtdDates[0],
                    endDate: mtdDates[mtdDates.length - 1],
                    daysWithData: mtdDocs.length,
                    daysInMonth,
                    metrics,
                    blockPerformance,
                    topItems,
                    topCategories,
                    topLanguages,
                    topAttributeFilters,
                    menuActions,
                    openHoursActionBreakdown,
                    topSearchTerms,
                    topZeroResultSearchTerms,
                    unavailableItems,
                    sourceQuality,
                    utmSources,
                    utmMediums,
                    utmCampaigns,
                    utmContent,
                    ownerConfidence,
                    avgDailyScans: Math.round(metrics.menuVisits / mtdDocs.length),
                };
            }

            // Step 6: Build yesterday from cached data
            const yesterdayDoc = docsMap.get(yesterdayDate);
            let yesterday: DailyViewData | null = null;
            if (yesterdayDoc) {
                yesterday = buildDailyViewData(yesterdayDoc, yesterdayDate, {
                    includeAiSummary: false,
                    isPartial: false,
                });
            }

            // Step 7: Build historical weeks from cached data
            const historicalWeeks: HistoricalWeek[] = [];
            for (const week of weekRanges) {
                const weekDates = getDateRange(week.start, week.end);
                const weekDocs = weekDates
                    .map(d => docsMap.get(d))
                    .filter((d): d is DailyDocData => d !== undefined);

                if (weekDocs.length > 0) {
                    const { metrics } = aggregateDailyDocs(weekDocs);
                    historicalWeeks.push({
                        weekStart: formatAnalyticsDateKey(week.start),
                        weekEnd: formatAnalyticsDateKey(week.end),
                        weekLabel: formatWeekLabel(week.start, week.end),
                        metrics,
                        isCurrentWeek: week.weekId === currentWeekId,
                    });
                }
            }

            // Step 8: Fetch only the weekly AI summary. Avoid the full weekly
            // dashboard path here because the overview already built metrics
            // from daily docs above.
            const weeklyAiSummary = await getOwnerDashboardWeeklyAiSummary(tId, sId, projectId, timeZone, businessDayEndTime);

            // Step 9: Determine status
            let status: 'working' | 'low_activity' | 'no_data' = 'no_data';
            let statusMessage = 'No data yet. Your menu analytics will appear once customers start scanning.';

            if (wtd) {
                if (wtd.metrics.menuVisits >= OVERVIEW_GUARDRAILS.LOW_ACTIVITY_THRESHOLD) {
                    status = 'working';
                    statusMessage = 'Your menu is working! Customers are scanning and exploring.';
                } else if (wtd.metrics.menuVisits > 0) {
                    status = 'low_activity';
                    statusMessage = 'Some activity this week. Things are getting started.';
                }
            } else if (yesterday && yesterday.metrics.menuVisits > 0) {
                status = 'low_activity';
                statusMessage = 'Activity detected yesterday. Building your weekly summary.';
            }

            return {
                status,
                statusMessage,
                wtd,
                mtd,
                yesterday,
                historicalWeeks,
                aiSummary: weeklyAiSummary,
            } as OverviewData;
        },
        "getOwnerDashboardOverview"
    );
}

// ================================================================
// FETCH OVERALL (LIFETIME) DATA
// ================================================================

export async function getOwnerDashboardOverall(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
): Promise<OverallData | null> {
    return await apiCallComposer(
        async () => {
            const docId = getDocId.summary(tId, sId, projectId);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();
            const lifetime = data.lifetime || {};
            const menuSessions = data.lifetimeMenuSessions || lifetime.menuSessions || 0;
            const engagedSessions = data.lifetimeEngagedSessions || lifetime.engagedSessions || 0;
            const intentSessions = data.lifetimeIntentSessions || lifetime.intentSessions || 0;
            const actionSessions = data.lifetimeActionSessions || lifetime.actionSessions || 0;

            return {
                lifetimeMetrics: {
                    totalViews: data.lifetimeTotalViews || lifetime.totalViews || 0,
                    totalClicks: data.lifetimeTotalClicks || lifetime.totalClicks || 0,
                    totalSmartPicksRendered: data.lifetimeTotalDecisionBlocksRendered || lifetime.totalDecisionBlocksRendered || 0,
                    totalSmartPicksClicks: data.lifetimeTotalRecommendationClicks || lifetime.totalRecommendationClicks || 0,
                    menuSessions,
                    engagedSessions,
                    intentSessions,
                    actionSessions,
                    engagedSessionRate: menuSessions > 0 ? Math.round((engagedSessions / menuSessions) * 100) : 0,
                    intentRate: menuSessions > 0 ? Math.round((intentSessions / menuSessions) * 100) : 0,
                    actionRate: menuSessions > 0 ? Math.round((actionSessions / menuSessions) * 100) : 0,
                    totalSearches: data.lifetimeTotalSearches || 0,
                    totalZeroResultSearches: data.lifetimeZeroResultSearches || 0,
                    totalUnavailableItemTaps: data.lifetimeTotalUnavailableItemTaps || 0,
                    totalMenuActionClicks: data.lifetimeTotalMenuActionClicks || 0,
                },
                blockPerformance: transformBlockPerformance(data),
                topItems: transformToTopItems(data),
                topCategories: transformTopCategories(data),
                topLanguages: data.topLanguages || transformTopLanguages(data),
                topAttributeFilters: data.topAttributeFilters || transformTopAttributeFilters(data),
                menuActions: transformMenuActions(data),
                topSearchTerms: transformTopSearchTerms(data),
                topZeroResultSearchTerms: data.topZeroResultSearchTerms || transformTopSearchTerms(data, 'zeroResultSearchTerms'),
                unavailableItems: transformUnavailableItems(data),
                sourceQuality: transformSourceQuality(data),
                utmSources: transformTrafficBreakdown(data, 'viewsBySource'),
                utmMediums: transformTrafficBreakdown(data, 'viewsByMedium'),
                utmCampaigns: transformTrafficBreakdown(data, 'viewsByCampaign'),
                utmContent: transformTrafficBreakdown(data, 'viewsByContent'),
                ownerConfidence: transformOwnerConfidence({
                    totalViews: data.lifetimeTotalViews || lifetime.totalViews || 0,
                    menuSessions,
                    engagedSessions,
                    actionSessions,
                    zeroResultSearches: data.lifetimeZeroResultSearches || lifetime.zeroResultSearches || 0,
                    totalUnavailableItemTaps: data.lifetimeTotalUnavailableItemTaps || 0,
                }),
                firstDataDate: data.firstDataDate,
                lastUpdated: data.modifiedOn?.toDate?.() || data.lastUpdated?.toDate?.(),
            } as OverallData;
        },
        "getOwnerDashboardOverall"
    );
}

// ================================================================
// FETCH SETTLED DASHBOARD READ MODEL
// ================================================================

export async function getOwnerDashboardSettled(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<OwnerDashboardData> {
    return await apiCallComposer(
        async () => {
            const summaryDocId = getDocId.dashboardSummary(tId, sId, projectId);
            const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
            const summarySnap = await getDoc(summaryRef);

            if (summarySnap.exists()) {
                return normalizeOwnerDashboardData(summarySnap.data(), projectId);
            }

            return emptyOwnerDashboardData(projectId);
        },
        "getOwnerDashboardSettled"
    );
}

export async function markOwnerActionDone(params: {
    projectId: string;
    action: OwnerActionSuggestion;
}): Promise<OwnerActionReceipt> {
    const response = await fetch('/api/analytics/owner-action/mark-done', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        redirect: 'manual',
        body: JSON.stringify({
            projectId: params.projectId,
            actionId: params.action.id,
            actionType: params.action.type,
            actionTitle: params.action.title,
            actionLabel: params.action.actionLabel,
            metricLabel: params.action.metricLabel,
        }),
    });

    const payload = await readOwnerActionMarkDoneResponse(response, params);
    if (!response.ok) {
        logAnalyticsFailure(
            'owner_dashboard_action_mark_done_response_rejected',
            undefined,
            getOwnerActionMarkDoneResponseContext({ ...params, response }),
        );
        throw new Error('Could not mark action done');
    }

    if (!isOwnerActionMarkDonePayload(payload)) {
        logAnalyticsFailure(
            'owner_dashboard_action_mark_done_response_invalid',
            undefined,
            getOwnerActionMarkDoneResponseContext({ ...params, response }),
        );
        throw new Error('Could not mark action done');
    }

    const receipt = normalizeOwnerActionReceipt(payload.receipt);
    if (!receipt) {
        logAnalyticsFailure(
            'owner_dashboard_action_mark_done_receipt_invalid',
            undefined,
            getOwnerActionMarkDoneResponseContext({ ...params, response }),
        );
        throw new Error('Could not mark action done');
    }

    return receipt;
}

// ================================================================
// FETCH ALL DASHBOARD DATA (legacy fallback when read model is missing)
// ================================================================

export async function getOwnerDashboardData(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<OwnerDashboardData> {
    return await apiCallComposer(
        async () => {
            // Fetch overview (includes wtd, mtd, yesterday, historical weeks) and overall in parallel
            const [overview, overall] = await Promise.all([
                getOwnerDashboardOverview(tId, sId, projectId, timeZone, businessDayEndTime),
                getOwnerDashboardOverall(tId, sId, projectId, timeZone),
            ]);

            return {
                // Overview (primary view)
                overview,

                // Period views - extracted from overview for convenience
                today: null,
                daily: overview?.yesterday || null,
                weekly: null, // Lazy loaded when needed
                monthly: null, // Lazy loaded when needed

                // WTD/MTD from overview
                wtd: overview?.wtd || null,
                mtd: overview?.mtd || null,

                // Historical weeks
                historicalWeeks: overview?.historicalWeeks || [],

                // Lifetime footer
                overall,

                // Meta
                projectId,
                lastFetched: new Date(),
            };
        },
        "getOwnerDashboardData"
    );
}

// ================================================================
// CUSTOMER APP DASHBOARD READ MODEL
// ================================================================

export interface CustomerAppDashboardSummary {
    summary: Record<string, any> | null;
    daily30d: Array<Record<string, any>>;
    generatedForLocalDate?: string;
    lastSettledLocalDate?: string;
    lastFetched: Date;
}

export async function getCustomerAppDashboardSummary(
    tId: string,
    sId: string,
): Promise<CustomerAppDashboardSummary | null> {
    return await apiCallComposer(
        async () => {
            const summaryDocId = getDocId.dashboardSummary(tId, sId, 'customerApp');
            const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
            const summarySnap = await getDoc(summaryRef);

            if (!summarySnap.exists()) {
                return null;
            }

            const data = summarySnap.data();
            return {
                summary: data.summary || null,
                daily30d: Array.isArray(data.daily30d) ? data.daily30d : [],
                generatedForLocalDate: data.generatedForLocalDate,
                lastSettledLocalDate: data.lastSettledLocalDate,
                lastFetched: new Date(),
            };
        },
        "getCustomerAppDashboardSummary"
    );
}

// ================================================================
// OBP ANALYTICS (Official Business Page)
// Full parity with digital menu analytics — OBP is a first-class layer.
// Uses projectId='obp' as virtual project.
//
// Document pattern (same as menu, just projectId='obp'):
// - Daily:   analytics/{tId}_{sId}_obp_daily_{date}
// - Weekly:  analytics/{tId}_{sId}_obp_weekly_{week}     (written by nightly CF)
// - Monthly: analytics/{tId}_{sId}_obp_monthly_{month}   (written by nightly CF)
// - Summary: analytics/{tId}_{sId}_obp_overall_summary   (written by nightly CF)
//
// @see __docs__/official-business-page/official-business-page_impl.md ADR-9
// ================================================================

// ── OBP Types ──

export interface OBPActionBreakdown {
    call: number;
    whatsapp: number;
    directions: number;
    reserve: number;
    order: number;
}

export interface OBPShareBreakdown {
    whatsapp: number;
    copy_link: number;
    copy_message: number;
}

export interface OBPLinkBreakdown {
    google_review: number;
    instagram: number;
    facebook: number;
    website: number;
}

export interface OBPSourceBreakdown {
    source: string;
    label: string;
    views: number;
    actionClicks: number;
    menuClicks: number;
    linkClicks: number;
}

export interface OBPOpenHoursActionBreakdown {
    open: number;
    closed: number;
    unknown: number;
    closedShare?: number;
}

export interface OBPLanguageUsage {
    language: string;
    label: string;
    views: number;
    sessions: number;
    adoptions: number;
}

export interface OBPPeriodMetrics {
    views: number;
    actionClicks: number;
    menuClicks: number;
    linkClicks: number;
    shares: number;
    actions: OBPActionBreakdown;
    shareMethods: OBPShareBreakdown;
    links: OBPLinkBreakdown;
    sources: OBPSourceBreakdown[];
    openHoursActionBreakdown?: OBPOpenHoursActionBreakdown;
    topLanguages?: OBPLanguageUsage[];
    daysWithData: number;
}

export interface OBPTodayData extends OBPPeriodMetrics {
    date: string;
    isPartial?: boolean;
    lastUpdated?: Date;
}

export interface OBPHistoricalWeek {
    weekStart: string;
    weekEnd: string;
    weekLabel: string;
    views: number;
    actionClicks: number;
    isCurrentWeek: boolean;
}

export interface OBPOverviewData {
    status: 'working' | 'low_activity' | 'no_data';
    statusMessage: string;
    yesterday: OBPPeriodMetrics | null;
    wtd: OBPPeriodMetrics | null;
    mtd: (OBPPeriodMetrics & { monthName: string }) | null;
    historicalWeeks: OBPHistoricalWeek[];
    viewsChange: number | null; // week-over-week % change (from summary doc)
}

export interface OBPOverallData {
    lifetimeViews: number;
    lifetimeActionClicks: number;
    lifetimeMenuClicks: number;
    lifetimeLinkClicks: number;
    lifetimeShares: number;
    lifetimeActions: OBPActionBreakdown;
    lifetimeShareMethods: OBPShareBreakdown;
    lifetimeLinks: OBPLinkBreakdown;
    lifetimeSources: OBPSourceBreakdown[];
    lifetimeOpenHoursActionBreakdown?: OBPOpenHoursActionBreakdown;
    lifetimeLanguages?: OBPLanguageUsage[];
    firstDataDate?: string;
    lastUpdated?: Date;
}

export interface OBPDashboardData {
    overview: OBPOverviewData | null;
    overall: OBPOverallData | null;
    lastFetched: Date;
}

// ── OBP Daily Doc Shape ──

interface OBPDailyDoc {
    date: string;
    totalOBPViews: number;
    totalOBPActionClicks: number;
    totalOBPMenuClicks: number;
    totalOBPLinkClicks: number;
    totalOBPShares: number;
    obpActionClicks: { call: number; whatsapp: number; directions: number; reserve: number; order: number };
    obpShares: OBPShareBreakdown;
    obpLinkClicks: OBPLinkBreakdown;
    viewsByEntrySource: Record<string, number>;
    viewsBySource: Record<string, number>;
    obpActionClicksBySource: Record<string, number>;
    obpMenuClicksBySource: Record<string, number>;
    obpLinkClicksBySource: Record<string, number>;
    obpActionClicksByOpenHoursState: Record<string, number>;
    obpMenuClicksByOpenHoursState: Record<string, number>;
    obpLinkClicksByOpenHoursState: Record<string, number>;
    obpLanguageTrackingEnabled?: boolean;
    obpViewsByLanguage?: Record<string, number>;
    obpSessionsByLanguage?: Record<string, number>;
    obpLanguageAdoptions?: Record<string, number>;
    obpLanguageNames?: Record<string, string>;
}

// ── OBP Aggregation Helpers ──

function readOBPCounter(data: Record<string, any>, mapName: string, key: string): number {
    return Number(data?.[mapName]?.[key] || data?.[`${mapName}.${key}`] || 0);
}

const OBP_SOURCE_LABELS: Record<string, string> = {
    copy_link: 'Copied link',
    direct: 'Direct link',
    facebook: 'Facebook',
    google: 'Google',
    instagram: 'Instagram',
    menu_kit: 'Menu kit',
    native_share: 'Phone share',
    obp: 'Official business page',
    qr: 'QR / table scan',
    shortcut: 'Customer app shortcut',
    whatsapp: 'WhatsApp',
    other: 'Other source',
};

function sumOBPMap(target: Record<string, number>, source: Record<string, number> = {}) {
    Object.entries(source || {}).forEach(([key, value]) => {
        const numeric = Number(value || 0);
        if (numeric > 0) target[key] = (target[key] || 0) + numeric;
    });
}

function buildOBPSourceBreakdown(data: {
    viewsByEntrySource?: Record<string, number>;
    viewsBySource?: Record<string, number>;
    obpActionClicksBySource?: Record<string, number>;
    obpMenuClicksBySource?: Record<string, number>;
    obpLinkClicksBySource?: Record<string, number>;
}): OBPSourceBreakdown[] {
    const sourceIds = new Set<string>([
        ...Object.keys(data.viewsByEntrySource || {}),
        ...Object.keys(data.obpActionClicksBySource || {}),
        ...Object.keys(data.obpMenuClicksBySource || {}),
        ...Object.keys(data.obpLinkClicksBySource || {}),
    ]);

    return Array.from(sourceIds)
        .map((source) => ({
            source,
            label: OBP_SOURCE_LABELS[source] || source,
            views: data.viewsByEntrySource?.[source] || 0,
            actionClicks: data.obpActionClicksBySource?.[source] || 0,
            menuClicks: data.obpMenuClicksBySource?.[source] || 0,
            linkClicks: data.obpLinkClicksBySource?.[source] || 0,
        }))
        .filter((entry) => entry.views > 0 || entry.actionClicks > 0 || entry.menuClicks > 0 || entry.linkClicks > 0)
        .sort((a, b) => (b.views + b.actionClicks + b.menuClicks + b.linkClicks) - (a.views + a.actionClicks + a.menuClicks + a.linkClicks))
        .slice(0, 6);
}

function buildOBPOpenHoursActionBreakdown(data: {
    obpActionClicksByOpenHoursState?: Record<string, number>;
    obpMenuClicksByOpenHoursState?: Record<string, number>;
    obpLinkClicksByOpenHoursState?: Record<string, number>;
}): OBPOpenHoursActionBreakdown {
    const read = (state: 'open' | 'closed' | 'unknown') => (
        (data.obpActionClicksByOpenHoursState?.[state] || 0)
        + (data.obpMenuClicksByOpenHoursState?.[state] || 0)
        + (data.obpLinkClicksByOpenHoursState?.[state] || 0)
    );
    const open = read('open');
    const closed = read('closed');
    const unknown = read('unknown');
    const total = open + closed + unknown;
    return {
        open,
        closed,
        unknown,
        closedShare: total > 0 ? Math.round((closed / total) * 100) : 0,
    };
}

function buildOBPLanguageBreakdown(data: {
    obpLanguageTrackingEnabled?: boolean;
    obpViewsByLanguage?: Record<string, number>;
    obpSessionsByLanguage?: Record<string, number>;
    obpLanguageAdoptions?: Record<string, number>;
    obpLanguageNames?: Record<string, string>;
}): OBPLanguageUsage[] {
    if (!data.obpLanguageTrackingEnabled) return [];

    const views = data.obpViewsByLanguage || {};
    const sessions = data.obpSessionsByLanguage || {};
    const adoptions = data.obpLanguageAdoptions || {};
    const names = data.obpLanguageNames || {};
    const languageIds = new Set<string>([
        ...Object.keys(views),
        ...Object.keys(sessions),
        ...Object.keys(adoptions),
    ]);

    return Array.from(languageIds)
        .map((language) => ({
            language,
            label: names[language] || language.toUpperCase(),
            views: views[language] || 0,
            sessions: sessions[language] || 0,
            adoptions: adoptions[language] || 0,
        }))
        .filter((entry) => entry.views > 0 || entry.sessions > 0 || entry.adoptions > 0)
        .sort((a, b) => ((b.sessions + b.adoptions + b.views) - (a.sessions + a.adoptions + a.views)))
        .slice(0, 5);
}

function readOBPActionBreakdown(data: Record<string, any>): OBPActionBreakdown {
    return {
        call: readOBPCounter(data, 'obpActionClicks', 'call'),
        whatsapp: readOBPCounter(data, 'obpActionClicks', 'whatsapp'),
        directions: readOBPCounter(data, 'obpActionClicks', 'directions'),
        reserve: readOBPCounter(data, 'obpActionClicks', 'reserve'),
        order: readOBPCounter(data, 'obpActionClicks', 'order'),
    };
}

function readOBPShareBreakdown(data: Record<string, any>): OBPShareBreakdown {
    return {
        whatsapp: readOBPCounter(data, 'obpShares', 'whatsapp'),
        copy_link: readOBPCounter(data, 'obpShares', 'copy_link'),
        copy_message: readOBPCounter(data, 'obpShares', 'copy_message'),
    };
}

function readOBPLinkBreakdown(data: Record<string, any>): OBPLinkBreakdown {
    return {
        google_review: readOBPCounter(data, 'obpLinkClicks', 'google_review'),
        instagram: readOBPCounter(data, 'obpLinkClicks', 'instagram'),
        facebook: readOBPCounter(data, 'obpLinkClicks', 'facebook'),
        website: readOBPCounter(data, 'obpLinkClicks', 'website'),
    };
}

function readOBPLifetimeCounter(data: Record<string, any>, lifetime: Record<string, any>, field: string): number {
    return Number(lifetime?.[field] || data?.[`lifetime.${field}`] || 0);
}

function readOBPLifetimeMapCounter(
    data: Record<string, any>,
    lifetime: Record<string, any>,
    mapName: string,
    key: string,
): number {
    return Number(lifetime?.[mapName]?.[key] || data?.[`lifetime.${mapName}.${key}`] || 0);
}

async function fetchOBPDailyDocs(
    tId: string,
    sId: string,
    dates: string[],
): Promise<OBPDailyDoc[]> {
    const docs: OBPDailyDoc[] = [];

    for (const date of dates) {
        const docId = getDocId.daily(tId, sId, OBP_PROJECT_ID, date);
        const docRef = doc(firebaseClient, COLLECTION, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            docs.push({
                date,
                totalOBPViews: data.totalOBPViews || 0,
                totalOBPActionClicks: data.totalOBPActionClicks || 0,
                totalOBPMenuClicks: data.totalOBPMenuClicks || 0,
                totalOBPLinkClicks: data.totalOBPLinkClicks || 0,
                totalOBPShares: data.totalOBPShares || 0,
                obpActionClicks: readOBPActionBreakdown(data),
                obpShares: readOBPShareBreakdown(data),
                obpLinkClicks: readOBPLinkBreakdown(data),
                viewsByEntrySource: readAnalyticsMap(data, 'viewsByEntrySource'),
                viewsBySource: readAnalyticsMap(data, 'viewsBySource'),
                obpActionClicksBySource: readAnalyticsMap(data, 'obpActionClicksBySource'),
                obpMenuClicksBySource: readAnalyticsMap(data, 'obpMenuClicksBySource'),
                obpLinkClicksBySource: readAnalyticsMap(data, 'obpLinkClicksBySource'),
                obpActionClicksByOpenHoursState: readAnalyticsMap(data, 'obpActionClicksByOpenHoursState'),
                obpMenuClicksByOpenHoursState: readAnalyticsMap(data, 'obpMenuClicksByOpenHoursState'),
                obpLinkClicksByOpenHoursState: readAnalyticsMap(data, 'obpLinkClicksByOpenHoursState'),
                obpLanguageTrackingEnabled: Boolean(data.obpLanguageTrackingEnabled),
                obpViewsByLanguage: readAnalyticsMap(data, 'obpViewsByLanguage'),
                obpSessionsByLanguage: readAnalyticsMap(data, 'obpSessionsByLanguage'),
                obpLanguageAdoptions: readAnalyticsMap(data, 'obpLanguageAdoptions'),
                obpLanguageNames: readAnalyticsMap(data, 'obpLanguageNames') as Record<string, string>,
            });
        }
    }

    return docs;
}

function aggregateOBPDocs(docs: OBPDailyDoc[]): OBPPeriodMetrics {
    const result: OBPPeriodMetrics = {
        views: 0,
        actionClicks: 0,
        menuClicks: 0,
        linkClicks: 0,
        shares: 0,
        actions: { call: 0, whatsapp: 0, directions: 0, reserve: 0, order: 0 },
        shareMethods: { whatsapp: 0, copy_link: 0, copy_message: 0 },
        links: { google_review: 0, instagram: 0, facebook: 0, website: 0 },
        sources: [],
        topLanguages: [],
        daysWithData: docs.length,
    };
    const sourceAccumulator = {
        viewsByEntrySource: {} as Record<string, number>,
        viewsBySource: {} as Record<string, number>,
        obpActionClicksBySource: {} as Record<string, number>,
        obpMenuClicksBySource: {} as Record<string, number>,
        obpLinkClicksBySource: {} as Record<string, number>,
        obpActionClicksByOpenHoursState: {} as Record<string, number>,
        obpMenuClicksByOpenHoursState: {} as Record<string, number>,
        obpLinkClicksByOpenHoursState: {} as Record<string, number>,
        obpLanguageTrackingEnabled: false,
        obpViewsByLanguage: {} as Record<string, number>,
        obpSessionsByLanguage: {} as Record<string, number>,
        obpLanguageAdoptions: {} as Record<string, number>,
        obpLanguageNames: {} as Record<string, string>,
    };

    for (const d of docs) {
        result.views += d.totalOBPViews;
        result.actionClicks += d.totalOBPActionClicks;
        result.menuClicks += d.totalOBPMenuClicks;
        result.linkClicks += d.totalOBPLinkClicks;
        result.shares += d.totalOBPShares;
        result.actions.call += d.obpActionClicks.call;
        result.actions.whatsapp += d.obpActionClicks.whatsapp;
        result.actions.directions += d.obpActionClicks.directions;
        result.actions.reserve += d.obpActionClicks.reserve;
        result.actions.order += d.obpActionClicks.order;
        result.shareMethods.whatsapp += d.obpShares.whatsapp;
        result.shareMethods.copy_link += d.obpShares.copy_link;
        result.shareMethods.copy_message += d.obpShares.copy_message;
        result.links.google_review += d.obpLinkClicks.google_review;
        result.links.instagram += d.obpLinkClicks.instagram;
        result.links.facebook += d.obpLinkClicks.facebook;
        result.links.website += d.obpLinkClicks.website;
        sumOBPMap(sourceAccumulator.viewsByEntrySource, d.viewsByEntrySource);
        sumOBPMap(sourceAccumulator.viewsBySource, d.viewsBySource);
        sumOBPMap(sourceAccumulator.obpActionClicksBySource, d.obpActionClicksBySource);
        sumOBPMap(sourceAccumulator.obpMenuClicksBySource, d.obpMenuClicksBySource);
        sumOBPMap(sourceAccumulator.obpLinkClicksBySource, d.obpLinkClicksBySource);
        sumOBPMap(sourceAccumulator.obpActionClicksByOpenHoursState, d.obpActionClicksByOpenHoursState);
        sumOBPMap(sourceAccumulator.obpMenuClicksByOpenHoursState, d.obpMenuClicksByOpenHoursState);
        sumOBPMap(sourceAccumulator.obpLinkClicksByOpenHoursState, d.obpLinkClicksByOpenHoursState);
        sourceAccumulator.obpLanguageTrackingEnabled = Boolean(sourceAccumulator.obpLanguageTrackingEnabled || d.obpLanguageTrackingEnabled);
        sumOBPMap(sourceAccumulator.obpViewsByLanguage, d.obpViewsByLanguage);
        sumOBPMap(sourceAccumulator.obpSessionsByLanguage, d.obpSessionsByLanguage);
        sumOBPMap(sourceAccumulator.obpLanguageAdoptions, d.obpLanguageAdoptions);
        Object.assign(sourceAccumulator.obpLanguageNames, d.obpLanguageNames || {});
    }

    result.sources = buildOBPSourceBreakdown(sourceAccumulator);
    result.openHoursActionBreakdown = buildOBPOpenHoursActionBreakdown(sourceAccumulator);
    result.topLanguages = buildOBPLanguageBreakdown(sourceAccumulator);
    return result;
}

function buildOBPTodayData(data: Record<string, any>, date: string): OBPTodayData {
    return {
        date,
        views: data.totalOBPViews || 0,
        actionClicks: data.totalOBPActionClicks || 0,
        menuClicks: data.totalOBPMenuClicks || 0,
        linkClicks: data.totalOBPLinkClicks || 0,
        shares: data.totalOBPShares || 0,
        actions: readOBPActionBreakdown(data),
        shareMethods: readOBPShareBreakdown(data),
        links: readOBPLinkBreakdown(data),
        sources: buildOBPSourceBreakdown({
            viewsByEntrySource: readAnalyticsMap(data, 'viewsByEntrySource'),
            viewsBySource: readAnalyticsMap(data, 'viewsBySource'),
            obpActionClicksBySource: readAnalyticsMap(data, 'obpActionClicksBySource'),
            obpMenuClicksBySource: readAnalyticsMap(data, 'obpMenuClicksBySource'),
            obpLinkClicksBySource: readAnalyticsMap(data, 'obpLinkClicksBySource'),
        }),
        openHoursActionBreakdown: buildOBPOpenHoursActionBreakdown({
            obpActionClicksByOpenHoursState: readAnalyticsMap(data, 'obpActionClicksByOpenHoursState'),
            obpMenuClicksByOpenHoursState: readAnalyticsMap(data, 'obpMenuClicksByOpenHoursState'),
            obpLinkClicksByOpenHoursState: readAnalyticsMap(data, 'obpLinkClicksByOpenHoursState'),
        }),
        topLanguages: buildOBPLanguageBreakdown({
            obpLanguageTrackingEnabled: Boolean(data.obpLanguageTrackingEnabled),
            obpViewsByLanguage: readAnalyticsMap(data, 'obpViewsByLanguage'),
            obpSessionsByLanguage: readAnalyticsMap(data, 'obpSessionsByLanguage'),
            obpLanguageAdoptions: readAnalyticsMap(data, 'obpLanguageAdoptions'),
            obpLanguageNames: readAnalyticsMap(data, 'obpLanguageNames') as Record<string, string>,
        }),
        daysWithData: 1,
        isPartial: true,
        lastUpdated: data.lastUpdated?.toDate?.() || undefined,
    };
}

// ── OBP Overview Fetch (mirrors getOwnerDashboardOverview) ──

const OBP_LOW_ACTIVITY_THRESHOLD = 3; // views per week

export async function getOBPDashboardOverview(
    tId: string,
    sId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<OBPOverviewData | null> {
    return await apiCallComposer(
        async () => {
            // Step 1: Calculate all date ranges (same strategy as menu overview)
            const yesterdayDate = getYesterdayDate(timeZone, businessDayEndTime);
            const wtdDates = getLast7Days(timeZone, businessDayEndTime);
            const mtdDates = getMonthToDateDates(timeZone, businessDayEndTime);
            const weekRanges = getLast4WeeksRanges(timeZone, businessDayEndTime);
            const currentWeekId = getCurrentWeekId(timeZone, businessDayEndTime);

            // Step 2: Collect all unique dates
            const allDatesSet = new Set<string>();
            mtdDates.forEach(d => allDatesSet.add(d));
            for (const week of weekRanges) {
                const weekDates = getDateRange(week.start, week.end);
                weekDates.forEach(d => allDatesSet.add(d));
            }
            const allUniqueDates = Array.from(allDatesSet).sort();

            // Step 3: Fetch all OBP daily docs in one batch
            const allDocs = await fetchOBPDailyDocs(tId, sId, allUniqueDates);
            const docsMap = new Map<string, OBPDailyDoc>();
            for (const d of allDocs) {
                docsMap.set(d.date, d);
            }

            // Step 4: Build yesterday
            const yesterdayDoc = docsMap.get(yesterdayDate);
            const yesterday: OBPPeriodMetrics | null = yesterdayDoc ? {
                views: yesterdayDoc.totalOBPViews,
                actionClicks: yesterdayDoc.totalOBPActionClicks,
                menuClicks: yesterdayDoc.totalOBPMenuClicks,
                linkClicks: yesterdayDoc.totalOBPLinkClicks,
                shares: yesterdayDoc.totalOBPShares,
                actions: yesterdayDoc.obpActionClicks,
                shareMethods: yesterdayDoc.obpShares,
                links: yesterdayDoc.obpLinkClicks,
                sources: buildOBPSourceBreakdown(yesterdayDoc),
                openHoursActionBreakdown: buildOBPOpenHoursActionBreakdown(yesterdayDoc),
                daysWithData: 1,
            } : null;

            // Step 5: Build WTD
            const wtdDocs = wtdDates
                .map(d => docsMap.get(d))
                .filter((d): d is OBPDailyDoc => d !== undefined);
            const wtd = wtdDocs.length > 0 ? aggregateOBPDocs(wtdDocs) : null;

            // Step 6: Build MTD
            const mtdDocs = mtdDates
                .map(d => docsMap.get(d))
                .filter((d): d is OBPDailyDoc => d !== undefined);
            let mtd: (OBPPeriodMetrics & { monthName: string }) | null = null;
            if (mtdDocs.length > 0) {
                const monthName = formatMonthLabel(mtdDates[0]);
                mtd = { ...aggregateOBPDocs(mtdDocs), monthName };
            }

            // Step 7: Build historical weeks
            const historicalWeeks: OBPHistoricalWeek[] = [];
            for (const week of weekRanges) {
                const weekDates = getDateRange(week.start, week.end);
                const weekDocs = weekDates
                    .map(d => docsMap.get(d))
                    .filter((d): d is OBPDailyDoc => d !== undefined);

                if (weekDocs.length > 0) {
                    const agg = aggregateOBPDocs(weekDocs);
                    historicalWeeks.push({
                        weekStart: formatAnalyticsDateKey(week.start),
                        weekEnd: formatAnalyticsDateKey(week.end),
                        weekLabel: formatWeekLabel(week.start, week.end),
                        views: agg.views,
                        actionClicks: agg.actionClicks,
                        isCurrentWeek: week.weekId === currentWeekId,
                    });
                }
            }

            // Step 8: Read viewsChange from summary doc (written by nightly CF)
            let viewsChange: number | null = null;
            const summaryDocId = getDocId.summary(tId, sId, OBP_PROJECT_ID);
            try {
                const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
                const summarySnap = await getDoc(summaryRef);
                if (summarySnap.exists()) {
                    viewsChange = summarySnap.data()?.weekly?.viewsChange ?? null;
                }
            } catch (error) {
                logOBPDashboardSummaryReadFailure(error, { tId, sId, summaryDocId });
            }

            // Step 9: Determine status
            let status: 'working' | 'low_activity' | 'no_data' = 'no_data';
            let statusMessage = 'No visitors yet. Share your official link to start getting views.';

            if (wtd) {
                if (wtd.views >= OBP_LOW_ACTIVITY_THRESHOLD) {
                    status = 'working';
                    statusMessage = 'Your official page is getting visitors!';
                } else if (wtd.views > 0) {
                    status = 'low_activity';
                    statusMessage = 'Some visitors this week. Share your link more to grow.';
                }
            } else if (yesterday && yesterday.views > 0) {
                status = 'low_activity';
                statusMessage = 'Activity detected yesterday.';
            }

            return {
                status,
                statusMessage,
                yesterday,
                wtd,
                mtd,
                historicalWeeks,
                viewsChange,
            };
        },
        "getOBPDashboardOverview"
    );
}

export async function getOBPDashboardToday(
    tId: string,
    sId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<OBPTodayData | null> {
    return await apiCallComposer(
        async () => {
            const todayDate = getTodayDate(timeZone, businessDayEndTime);
            const docId = getDocId.daily(tId, sId, OBP_PROJECT_ID, todayDate);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            return buildOBPTodayData(docSnap.data(), todayDate);
        },
        "getOBPDashboardToday"
    );
}

// ── OBP Overall (Lifetime) Fetch ──

export async function getOBPDashboardOverall(
    tId: string,
    sId: string,
    timeZone?: string,
): Promise<OBPOverallData | null> {
    return await apiCallComposer(
        async () => {
            const summaryDocId = getDocId.summary(tId, sId, OBP_PROJECT_ID);
            const docRef = doc(firebaseClient, COLLECTION, summaryDocId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return null;

            const data = docSnap.data();
            const lifetime = data.lifetime || {};

            const lifetimeViews = readOBPLifetimeCounter(data, lifetime, 'totalOBPViews');
            if (!lifetimeViews && lifetimeViews !== 0) return null;

            return {
                lifetimeViews,
                lifetimeActionClicks: readOBPLifetimeCounter(data, lifetime, 'totalOBPActionClicks'),
                lifetimeMenuClicks: readOBPLifetimeCounter(data, lifetime, 'totalOBPMenuClicks'),
                lifetimeLinkClicks: readOBPLifetimeCounter(data, lifetime, 'totalOBPLinkClicks'),
                lifetimeShares: readOBPLifetimeCounter(data, lifetime, 'totalOBPShares'),
                lifetimeActions: {
                    call: readOBPLifetimeMapCounter(data, lifetime, 'obpActionClicks', 'call'),
                    whatsapp: readOBPLifetimeMapCounter(data, lifetime, 'obpActionClicks', 'whatsapp'),
                    directions: readOBPLifetimeMapCounter(data, lifetime, 'obpActionClicks', 'directions'),
                    reserve: readOBPLifetimeMapCounter(data, lifetime, 'obpActionClicks', 'reserve'),
                    order: readOBPLifetimeMapCounter(data, lifetime, 'obpActionClicks', 'order'),
                },
                lifetimeShareMethods: {
                    whatsapp: readOBPLifetimeMapCounter(data, lifetime, 'obpShares', 'whatsapp'),
                    copy_link: readOBPLifetimeMapCounter(data, lifetime, 'obpShares', 'copy_link'),
                    copy_message: readOBPLifetimeMapCounter(data, lifetime, 'obpShares', 'copy_message'),
                },
                lifetimeLinks: {
                    google_review: readOBPLifetimeMapCounter(data, lifetime, 'obpLinkClicks', 'google_review'),
                    instagram: readOBPLifetimeMapCounter(data, lifetime, 'obpLinkClicks', 'instagram'),
                    facebook: readOBPLifetimeMapCounter(data, lifetime, 'obpLinkClicks', 'facebook'),
                    website: readOBPLifetimeMapCounter(data, lifetime, 'obpLinkClicks', 'website'),
                },
                lifetimeSources: buildOBPSourceBreakdown({
                    viewsByEntrySource: readAnalyticsMap(lifetime, 'viewsByEntrySource'),
                    viewsBySource: readAnalyticsMap(lifetime, 'viewsBySource'),
                    obpActionClicksBySource: readAnalyticsMap(lifetime, 'obpActionClicksBySource'),
                    obpMenuClicksBySource: readAnalyticsMap(lifetime, 'obpMenuClicksBySource'),
                    obpLinkClicksBySource: readAnalyticsMap(lifetime, 'obpLinkClicksBySource'),
                }),
                lifetimeOpenHoursActionBreakdown: buildOBPOpenHoursActionBreakdown({
                    obpActionClicksByOpenHoursState: readAnalyticsMap(lifetime, 'obpActionClicksByOpenHoursState'),
                    obpMenuClicksByOpenHoursState: readAnalyticsMap(lifetime, 'obpMenuClicksByOpenHoursState'),
                    obpLinkClicksByOpenHoursState: readAnalyticsMap(lifetime, 'obpLinkClicksByOpenHoursState'),
                }),
                lifetimeLanguages: buildOBPLanguageBreakdown({
                    obpLanguageTrackingEnabled: Boolean(lifetime.obpLanguageTrackingEnabled),
                    obpViewsByLanguage: readAnalyticsMap(lifetime, 'obpViewsByLanguage'),
                    obpSessionsByLanguage: readAnalyticsMap(lifetime, 'obpSessionsByLanguage'),
                    obpLanguageAdoptions: readAnalyticsMap(lifetime, 'obpLanguageAdoptions'),
                    obpLanguageNames: readAnalyticsMap(lifetime, 'obpLanguageNames') as Record<string, string>,
                }),
                firstDataDate: data.firstDataDate,
                lastUpdated: data.modifiedOn?.toDate?.() || undefined,
            };
        },
        "getOBPDashboardOverall"
    );
}

// ── OBP Combined Dashboard Fetch ──

export async function getOBPDashboardData(
    tId: string,
    sId: string,
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<OBPDashboardData> {
    return await apiCallComposer(
        async () => {
            const summaryDocId = getDocId.dashboardSummary(tId, sId, OBP_PROJECT_ID);
            const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
            const summarySnap = await getDoc(summaryRef);

            if (summarySnap.exists()) {
                const data = summarySnap.data();
                const normalizeOBPPeriod = (period: any) => period ? {
                    ...period,
                    sources: period.sources || [],
                    openHoursActionBreakdown: period.openHoursActionBreakdown || { open: 0, closed: 0, unknown: 0, closedShare: 0 },
                    topLanguages: period.topLanguages || [],
                } : null;
                const overview = data.overview ? {
                    ...data.overview,
                    yesterday: normalizeOBPPeriod(data.overview.yesterday),
                    wtd: normalizeOBPPeriod(data.overview.wtd),
                    mtd: normalizeOBPPeriod(data.overview.mtd),
                } : null;
                return {
                    overview,
                    overall: data.overall ? {
                        ...data.overall,
                        lifetimeSources: data.overall.lifetimeSources || [],
                        lifetimeOpenHoursActionBreakdown: data.overall.lifetimeOpenHoursActionBreakdown || { open: 0, closed: 0, unknown: 0, closedShare: 0 },
                        lifetimeLanguages: data.overall.lifetimeLanguages || [],
                        lastUpdated: parseDateValue(data.overall.lastUpdated),
                    } : null,
                    lastFetched: new Date(),
                };
            }

            return {
                overview: null,
                overall: null,
                lastFetched: new Date(),
            };
        },
        "getOBPDashboardData"
    );
}
