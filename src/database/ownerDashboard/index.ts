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
    DAILY_GUARDRAILS,
    DailyViewData,
    HistoricalWeek,
    MenuActionBreakdown,
    MonthlyViewData,
    MTDViewData,
    OverallData,
    OVERVIEW_GUARDRAILS,
    OverviewData,
    OwnerActionPlan,
    OwnerConfidence,
    OwnerDashboardData,
    OwnerDashboardMetrics,
    SearchTerm,
    SourceQuality,
    TopCategory,
    TopItem,
    WeeklyViewData,
    WTDViewData,
} from "@template/main-app/projects/types";
import { doc, getDoc } from "firebase/firestore";

// Collection
const COLLECTION = DB_COLLECTIONS.ANALYTICS;

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

// ================================================================
// DATE HELPERS
// ================================================================

function getYesterdayDate(timeZone?: string): string {
    const todayKey = getAnalyticsDateKey(new Date(), timeZone);
    return addDaysToAnalyticsDateKey(todayKey, -1);
}

function getTodayDate(timeZone?: string): string {
    return getAnalyticsDateKey(new Date(), timeZone);
}

function getCurrentWeekId(timeZone?: string): string {
    const todayKey = getTodayDate(timeZone);
    const today = parseAnalyticsDateKey(todayKey);
    const year = today.getUTCFullYear();
    const weekNum = getAnalyticsISOWeek(todayKey);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getLastWeekId(timeZone?: string): string {
    const lastWeekKey = addDaysToAnalyticsDateKey(getTodayDate(timeZone), -7);
    const lastWeek = parseAnalyticsDateKey(lastWeekKey);
    const year = lastWeek.getUTCFullYear();
    const weekNum = getAnalyticsISOWeek(lastWeekKey);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getCurrentMonthId(timeZone?: string): string {
    const todayKey = getTodayDate(timeZone);
    return todayKey.slice(0, 7);
}

function getLastMonthId(timeZone?: string): string {
    const today = parseAnalyticsDateKey(getTodayDate(timeZone));
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

function getLast7Days(timeZone?: string): string[] {
    const yesterdayKey = getYesterdayDate(timeZone);
    const sevenDaysAgoKey = addDaysToAnalyticsDateKey(getTodayDate(timeZone), -7);
    return getAnalyticsDateRange(sevenDaysAgoKey, yesterdayKey);
}

function getMonthToDateDates(timeZone?: string): string[] {
    const yesterdayKey = getYesterdayDate(timeZone);
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

function getLast4WeeksRanges(timeZone?: string): Array<{ start: Date; end: Date; weekId: string }> {
    const weeks: Array<{ start: Date; end: Date; weekId: string }> = [];
    const now = parseAnalyticsDateKey(getTodayDate(timeZone));

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

function transformToTopItems(data: any): Array<{ itemId: string; name?: string; clicks: number }> {
    if (!data?.recommendationClicksByItem) return [];

    return Object.entries(data.recommendationClicksByItem)
        .map(([itemId, clicks]) => ({
            itemId,
            clicks: clicks as number,
            name: data.itemNames?.[itemId],
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
}

function transformBlockPerformance(data: any): BlockPerformance {
    return {
        popular: {
            rendered: data?.decisionBlocksRendered?.popular || 0,
            clicks: data?.recommendationClicks?.popular || 0,
        },
        quickPick: {
            rendered: data?.decisionBlocksRendered?.quickPick || 0,
            clicks: data?.recommendationClicks?.quickPick || 0,
        },
        bestValue: {
            rendered: data?.decisionBlocksRendered?.bestValue || 0,
            clicks: data?.recommendationClicks?.bestValue || 0,
        },
    };
}

function transformMenuActions(data: any): MenuActionBreakdown {
    return {
        call: data?.menuActionClicks?.call || 0,
        whatsapp: data?.menuActionClicks?.whatsapp || 0,
        directions: data?.menuActionClicks?.directions || 0,
        reserve: data?.menuActionClicks?.reserve || 0,
        order: data?.menuActionClicks?.order || 0,
    };
}

function transformTopSearchTerms(data: any): SearchTerm[] {
    if (!data?.searchTerms) return [];

    return Object.entries(data.searchTerms)
        .map(([term, count]) => ({ term, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function transformUnavailableItems(data: any): TopItem[] {
    if (!data?.unavailableItemTapsByItem) return [];

    return Object.entries(data.unavailableItemTapsByItem)
        .map(([itemId, clicks]) => ({
            itemId,
            clicks: clicks as number,
            name: data.itemNames?.[itemId],
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
}

function transformTopCategories(data: any): TopCategory[] {
    const views = data?.viewsByCategory || {};
    const clicks = data?.clicksByCategory || {};
    const categoryIds = new Set<string>([
        ...Object.keys(views),
        ...Object.keys(clicks),
    ]);

    return Array.from(categoryIds)
        .map((categoryId) => ({
            categoryId,
            name: data?.categoryNames?.[categoryId],
            views: views[categoryId] || 0,
            clicks: clicks[categoryId] || 0,
        }))
        .filter((category) => category.views > 0 || category.clicks > 0)
        .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
        .slice(0, 5);
}

const SOURCE_LABELS: Record<string, string> = {
    qr: 'QR / table scan',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    google: 'Google',
    obp: 'Official business page',
    menu_kit: 'Menu kit',
    shortcut: 'Customer app shortcut',
    direct: 'Direct link',
    other: 'Other source',
};

function transformSourceQuality(data: any): SourceQuality[] {
    const sessions = data?.menuSessionsBySource || {};
    const actionSessions = data?.actionSessionsBySource || {};
    const actionClicks = data?.menuActionClicksBySource || {};
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
    recommendationClicksByItem?: Record<string, number>;
    viewsByCategory?: Record<string, number>;
    clicksByCategory?: Record<string, number>;
    viewsByEntrySource?: Record<string, number>;
    menuSessionsBySource?: Record<string, number>;
    actionSessionsBySource?: Record<string, number>;
    menuActionClicksBySource?: Record<string, number>;
    hourlyViews?: Record<string, number>;
    hourlyMenuActionClicks?: Record<string, number>;
    menuActionClicks?: Partial<MenuActionBreakdown>;
    searchTerms?: Record<string, number>;
    zeroResultSearchTerms?: Record<string, number>;
    unavailableItemTapsByItem?: Record<string, number>;
    itemNames?: Record<string, string>;
    categoryNames?: Record<string, string>;
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
                    decisionBlocksRendered: data.decisionBlocksRendered,
                    recommendationClicks: data.recommendationClicks,
                    recommendationClicksByItem: data.recommendationClicksByItem,
                    viewsByCategory: data.viewsByCategory,
                    clicksByCategory: data.clicksByCategory,
                    viewsByEntrySource: data.viewsByEntrySource,
                    menuSessionsBySource: data.menuSessionsBySource,
                    actionSessionsBySource: data.actionSessionsBySource,
                    menuActionClicksBySource: data.menuActionClicksBySource,
                    hourlyViews: data.hourlyViews,
                    hourlyMenuActionClicks: data.hourlyMenuActionClicks,
                    menuActionClicks: data.menuActionClicks,
                    searchTerms: data.searchTerms,
                    zeroResultSearchTerms: data.zeroResultSearchTerms,
                    unavailableItemTapsByItem: data.unavailableItemTapsByItem,
                    itemNames: data.itemNames,
                    categoryNames: data.categoryNames,
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
    menuActions: MenuActionBreakdown;
    topSearchTerms: SearchTerm[];
    unavailableItems: TopItem[];
    sourceQuality: SourceQuality[];
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
    const categoryMap: Record<string, { views: number; clicks: number; name?: string }> = {};
    const searchTermMap: Record<string, number> = {};
    const unavailableItemsMap: Record<string, { clicks: number; name?: string }> = {};
    const sourceData = {
        menuSessionsBySource: {} as Record<string, number>,
        actionSessionsBySource: {} as Record<string, number>,
        menuActionClicksBySource: {} as Record<string, number>,
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

        if (doc.recommendationClicksByItem) {
            for (const [itemId, clicks] of Object.entries(doc.recommendationClicksByItem)) {
                if (!itemClicksMap[itemId]) {
                    itemClicksMap[itemId] = { clicks: 0, name: doc.itemNames?.[itemId] };
                }
                itemClicksMap[itemId].clicks += clicks;
            }
        }

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

        for (const [field, target] of [
            ['menuSessionsBySource', sourceData.menuSessionsBySource],
            ['actionSessionsBySource', sourceData.actionSessionsBySource],
            ['menuActionClicksBySource', sourceData.menuActionClicksBySource],
        ] as const) {
            const map = doc[field];
            if (!map) continue;
            for (const [key, count] of Object.entries(map)) {
                target[key] = (target[key] || 0) + count;
            }
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

    const topItems: TopItem[] = Object.entries(itemClicksMap)
        .map(([itemId, data]) => ({
            itemId,
            clicks: data.clicks,
            name: data.name,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

    const topSearchTerms: SearchTerm[] = Object.entries(searchTermMap)
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
        menuActions,
        topSearchTerms,
        unavailableItems,
        sourceQuality: transformSourceQuality(sourceData),
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
        menuActions: transformMenuActions(data),
        topSearchTerms: transformTopSearchTerms(data),
        unavailableItems: transformUnavailableItems(data),
        sourceQuality: data.sourceQuality || transformSourceQuality(data),
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

function normalizeDailyViewData(data: any): DailyViewData | null {
    if (!data) return null;
    return {
        ...data,
        sourceQuality: data.sourceQuality || transformSourceQuality(data),
        ownerConfidence: data.ownerConfidence || transformOwnerConfidence(data),
        lastUpdated: parseDateValue(data.lastUpdated),
        aiSummary: data.aiSummary ? {
            ...data.aiSummary,
            generatedAt: parseDateValue(data.aiSummary.generatedAt) || new Date(),
        } : undefined,
    } as DailyViewData;
}

function normalizeOverviewData(data: any): OverviewData | null {
    if (!data) return null;
    return {
        ...data,
        yesterday: normalizeDailyViewData(data.yesterday),
        ownerActionPlan: normalizeOwnerActionPlan(data.ownerActionPlan),
        ownerConfidence: data.ownerConfidence,
        sourceQuality: data.sourceQuality || [],
        analyticsAiEntitlement: data.analyticsAiEntitlement,
        aiSummary: data.aiSummary ? {
            ...data.aiSummary,
            generatedAt: parseDateValue(data.aiSummary.generatedAt) || new Date(),
        } : undefined,
    } as OverviewData;
}

function normalizeOwnerActionPlan(data: any): OwnerActionPlan | undefined {
    if (!data || !Array.isArray(data.actions)) return undefined;
    return {
        generatedBy: data.generatedBy || 'rules',
        actions: data.actions,
        fingerprint: data.fingerprint,
    };
}

function normalizeOwnerDashboardData(data: any, projectId: string): OwnerDashboardData {
    const overview = normalizeOverviewData(data.overview);
    const daily = normalizeDailyViewData(data.daily || data.overview?.yesterday);
    const ownerActionPlan = normalizeOwnerActionPlan(data.ownerActionPlan || overview?.ownerActionPlan);

    return {
        overview,
        today: null,
        daily,
        weekly: data.weekly || null,
        monthly: data.monthly || null,
        wtd: data.wtd || overview?.wtd || null,
        mtd: data.mtd || overview?.mtd || null,
        historicalWeeks: data.historicalWeeks || overview?.historicalWeeks || [],
        overall: data.overall ? {
            ...data.overall,
            sourceQuality: data.overall.sourceQuality || [],
            ownerConfidence: data.overall.ownerConfidence,
            lastUpdated: parseDateValue(data.overall.lastUpdated),
        } as OverallData : null,
        ownerActionPlan,
        ownerConfidence: data.ownerConfidence || overview?.ownerConfidence,
        sourceQuality: data.sourceQuality || overview?.sourceQuality || [],
        analyticsAiEntitlement: data.analyticsAiEntitlement || overview?.analyticsAiEntitlement,
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
): Promise<DailyViewData | null> {
    return await apiCallComposer(
        async () => {
            const todayDate = getTodayDate(timeZone);
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
): Promise<DailyViewData | null> {
    return await apiCallComposer(
        async () => {
            const yesterdayDate = getYesterdayDate(timeZone);
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
            const currentWeekDocId = getDocId.weekly(tId, sId, projectId, getCurrentWeekId(timeZone));
            const lastWeekDocId = getDocId.weekly(tId, sId, projectId, getLastWeekId(timeZone));
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
                menuActions: transformMenuActions(weeklyData),
                topSearchTerms: transformTopSearchTerms(weeklyData),
                unavailableItems: transformUnavailableItems(weeklyData),
            } as WeeklyViewData;
        },
        "getOwnerDashboardWeekly"
    );
}

// ================================================================
// FETCH MONTHLY DATA
// ================================================================

export async function getOwnerDashboardMonthly(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
): Promise<MonthlyViewData | null> {
    return await apiCallComposer(
        async () => {
            // Try last month first (since current month is incomplete)
            const lastMonthId = getLastMonthId(timeZone);
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
                menuActions: transformMenuActions(data),
                topSearchTerms: transformTopSearchTerms(data),
                unavailableItems: transformUnavailableItems(data),
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
): Promise<WTDViewData | null> {
    return await apiCallComposer(
        async () => {
            const dates = getLast7Days(timeZone);
            const docs = await fetchDailyDocs(tId, sId, projectId, dates);

            if (docs.length === 0) {
                return null;
            }

            const { metrics, blockPerformance, topItems, topCategories, menuActions, topSearchTerms, unavailableItems, sourceQuality, ownerConfidence } = aggregateDailyDocs(docs);

            return {
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                daysWithData: docs.length,
                metrics,
                blockPerformance,
                topItems,
                topCategories,
                menuActions,
                topSearchTerms,
                unavailableItems,
                sourceQuality,
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
): Promise<MTDViewData | null> {
    return await apiCallComposer(
        async () => {
            const dates = getMonthToDateDates(timeZone);

            if (dates.length === 0) {
                return null;
            }

            const docs = await fetchDailyDocs(tId, sId, projectId, dates);

            if (docs.length === 0) {
                return null;
            }

            const { metrics, blockPerformance, topItems, topCategories, menuActions, topSearchTerms, unavailableItems, sourceQuality, ownerConfidence } = aggregateDailyDocs(docs);

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
                menuActions,
                topSearchTerms,
                unavailableItems,
                sourceQuality,
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
): Promise<HistoricalWeek[]> {
    return await apiCallComposer(
        async () => {
            const weekRanges = getLast4WeeksRanges(timeZone);
            const currentWeekId = getCurrentWeekId(timeZone);

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
): Promise<OverviewData | null> {
    return await apiCallComposer(
        async () => {
            // Step 1: Calculate all date ranges
            const yesterdayDate = getYesterdayDate(timeZone);
            const wtdDates = getLast7Days(timeZone);
            const mtdDates = getMonthToDateDates(timeZone);
            const weekRanges = getLast4WeeksRanges(timeZone);
            const currentWeekId = getCurrentWeekId(timeZone);

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
                const { metrics, blockPerformance, topItems, topCategories, menuActions, topSearchTerms, unavailableItems, sourceQuality, ownerConfidence } = aggregateDailyDocs(wtdDocs);
                wtd = {
                    startDate: wtdDates[0],
                    endDate: wtdDates[wtdDates.length - 1],
                    daysWithData: wtdDocs.length,
                    metrics,
                    blockPerformance,
                    topItems,
                    topCategories,
                    menuActions,
                    topSearchTerms,
                    unavailableItems,
                    sourceQuality,
                    ownerConfidence,
                };
            }

            // Step 5: Build MTD from cached data
            const mtdDocs = mtdDates
                .map(d => docsMap.get(d))
                .filter((d): d is DailyDocData => d !== undefined);

            let mtd: MTDViewData | null = null;
            if (mtdDocs.length > 0) {
                const { metrics, blockPerformance, topItems, topCategories, menuActions, topSearchTerms, unavailableItems, sourceQuality, ownerConfidence } = aggregateDailyDocs(mtdDocs);
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
                    menuActions,
                    topSearchTerms,
                    unavailableItems,
                    sourceQuality,
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

            // Step 8: Fetch summary doc for AI summary (1 extra read)
            const weekly = await getOwnerDashboardWeekly(tId, sId, projectId, timeZone);

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
                aiSummary: weekly?.aiSummary,
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
                topCategories: transformTopCategories(data),
                menuActions: transformMenuActions(data),
                sourceQuality: transformSourceQuality(data),
                ownerConfidence: transformOwnerConfidence({
                    totalViews: data.lifetimeTotalViews || lifetime.totalViews || 0,
                    menuSessions,
                    engagedSessions,
                    actionSessions,
                    zeroResultSearches: data.lifetimeTotalZeroResultSearches || 0,
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

// ================================================================
// FETCH ALL DASHBOARD DATA (legacy fallback when read model is missing)
// ================================================================

export async function getOwnerDashboardData(
    tId: string,
    sId: string,
    projectId: string,
    timeZone?: string,
): Promise<OwnerDashboardData> {
    return await apiCallComposer(
        async () => {
            // Fetch overview (includes wtd, mtd, yesterday, historical weeks) and overall in parallel
            const [overview, overall] = await Promise.all([
                getOwnerDashboardOverview(tId, sId, projectId, timeZone),
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

const OBP_PROJECT_ID = 'obp';

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

export interface OBPPeriodMetrics {
    views: number;
    actionClicks: number;
    menuClicks: number;
    linkClicks: number;
    shares: number;
    actions: OBPActionBreakdown;
    shareMethods: OBPShareBreakdown;
    links: OBPLinkBreakdown;
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
}

// ── OBP Aggregation Helpers ──

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
                obpActionClicks: {
                    call: data.obpActionClicks?.call || 0,
                    whatsapp: data.obpActionClicks?.whatsapp || 0,
                    directions: data.obpActionClicks?.directions || 0,
                    reserve: data.obpActionClicks?.reserve || 0,
                    order: data.obpActionClicks?.order || 0,
                },
                obpShares: {
                    whatsapp: data.obpShares?.whatsapp || 0,
                    copy_link: data.obpShares?.copy_link || 0,
                    copy_message: data.obpShares?.copy_message || 0,
                },
                obpLinkClicks: {
                    google_review: data.obpLinkClicks?.google_review || 0,
                    instagram: data.obpLinkClicks?.instagram || 0,
                    facebook: data.obpLinkClicks?.facebook || 0,
                    website: data.obpLinkClicks?.website || 0,
                },
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
        daysWithData: docs.length,
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
    }

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
): Promise<OBPOverviewData | null> {
    return await apiCallComposer(
        async () => {
            // Step 1: Calculate all date ranges (same strategy as menu overview)
            const yesterdayDate = getYesterdayDate(timeZone);
            const wtdDates = getLast7Days(timeZone);
            const mtdDates = getMonthToDateDates(timeZone);
            const weekRanges = getLast4WeeksRanges(timeZone);
            const currentWeekId = getCurrentWeekId(timeZone);

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
            try {
                const summaryDocId = getDocId.summary(tId, sId, OBP_PROJECT_ID);
                const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
                const summarySnap = await getDoc(summaryRef);
                if (summarySnap.exists()) {
                    viewsChange = summarySnap.data()?.weekly?.viewsChange ?? null;
                }
            } catch {
                // Non-critical
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
): Promise<OBPTodayData | null> {
    return await apiCallComposer(
        async () => {
            const todayDate = getTodayDate(timeZone);
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

            if (!lifetime.totalOBPViews && lifetime.totalOBPViews !== 0) return null;

            return {
                lifetimeViews: lifetime.totalOBPViews || 0,
                lifetimeActionClicks: lifetime.totalOBPActionClicks || 0,
                lifetimeMenuClicks: lifetime.totalOBPMenuClicks || 0,
                lifetimeLinkClicks: lifetime.totalOBPLinkClicks || 0,
                lifetimeShares: lifetime.totalOBPShares || 0,
                lifetimeActions: {
                    call: lifetime.obpActionClicks?.call || 0,
                    whatsapp: lifetime.obpActionClicks?.whatsapp || 0,
                    directions: lifetime.obpActionClicks?.directions || 0,
                    reserve: lifetime.obpActionClicks?.reserve || 0,
                    order: lifetime.obpActionClicks?.order || 0,
                },
                lifetimeShareMethods: {
                    whatsapp: lifetime.obpShares?.whatsapp || 0,
                    copy_link: lifetime.obpShares?.copy_link || 0,
                    copy_message: lifetime.obpShares?.copy_message || 0,
                },
                lifetimeLinks: {
                    google_review: lifetime.obpLinkClicks?.google_review || 0,
                    instagram: lifetime.obpLinkClicks?.instagram || 0,
                    facebook: lifetime.obpLinkClicks?.facebook || 0,
                    website: lifetime.obpLinkClicks?.website || 0,
                },
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
): Promise<OBPDashboardData> {
    return await apiCallComposer(
        async () => {
            const summaryDocId = getDocId.dashboardSummary(tId, sId, OBP_PROJECT_ID);
            const summaryRef = doc(firebaseClient, COLLECTION, summaryDocId);
            const summarySnap = await getDoc(summaryRef);

            if (summarySnap.exists()) {
                const data = summarySnap.data();
                return {
                    overview: data.overview || null,
                    overall: data.overall ? {
                        ...data.overall,
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
