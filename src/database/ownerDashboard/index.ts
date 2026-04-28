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
    OwnerDashboardData,
    OwnerDashboardMetrics,
    SearchTerm,
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
};

// ================================================================
// DATE HELPERS
// ================================================================

function getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

function getCurrentWeekId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const weekNum = getISOWeek(now);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getLastWeekId(): string {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const year = lastWeek.getFullYear();
    const weekNum = getISOWeek(lastWeek);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function getCurrentMonthId(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getLastMonthId(): string {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function getLast7Days(): string[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return getDateRange(sevenDaysAgo, yesterday);
}

function getMonthToDateDates(): string[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const firstOfMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    return getDateRange(firstOfMonth, yesterday);
}

function getWeekStartEnd(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

function formatWeekLabel(start: Date, end: Date): string {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function getLast4WeeksRanges(): Array<{ start: Date; end: Date; weekId: string }> {
    const weeks: Array<{ start: Date; end: Date; weekId: string }> = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - (i * 7));
        const { start, end } = getWeekStartEnd(targetDate);
        const year = start.getFullYear();
        const weekNum = getISOWeek(start);
        weeks.push({
            start,
            end,
            weekId: `${year}-W${weekNum.toString().padStart(2, '0')}`,
        });
    }

    return weeks.reverse(); // Oldest first
}

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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

// ================================================================
// AGGREGATION HELPERS
// ================================================================

interface DailyDocData {
    date: string;
    totalViews: number;
    totalClicks: number;
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
    menuActionClicks?: Partial<MenuActionBreakdown>;
    searchTerms?: Record<string, number>;
    unavailableItemTapsByItem?: Record<string, number>;
    itemNames?: Record<string, string>;
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
                    totalSearches: data.totalSearches || 0,
                    zeroResultSearches: data.zeroResultSearches || 0,
                    totalUnavailableItemTaps: data.totalUnavailableItemTaps || 0,
                    totalMenuActionClicks: data.totalMenuActionClicks || 0,
                    totalDecisionBlocksRendered: data.totalDecisionBlocksRendered || 0,
                    totalRecommendationClicks: data.totalRecommendationClicks || 0,
                    decisionBlocksRendered: data.decisionBlocksRendered,
                    recommendationClicks: data.recommendationClicks,
                    recommendationClicksByItem: data.recommendationClicksByItem,
                    menuActionClicks: data.menuActionClicks,
                    searchTerms: data.searchTerms,
                    unavailableItemTapsByItem: data.unavailableItemTapsByItem,
                    itemNames: data.itemNames,
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
    menuActions: MenuActionBreakdown;
    topSearchTerms: SearchTerm[];
    unavailableItems: TopItem[];
} {
    const metrics: OwnerDashboardMetrics = {
        menuVisits: 0,
        itemClicks: 0,
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
    const searchTermMap: Record<string, number> = {};
    const unavailableItemsMap: Record<string, { clicks: number; name?: string }> = {};
    const menuActions: MenuActionBreakdown = { call: 0, whatsapp: 0, directions: 0, reserve: 0, order: 0 };

    for (const doc of docs) {
        metrics.menuVisits += doc.totalViews;
        metrics.itemClicks += doc.totalClicks;
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

        if (doc.searchTerms) {
            for (const [term, count] of Object.entries(doc.searchTerms)) {
                searchTermMap[term] = (searchTermMap[term] || 0) + count;
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

    const unavailableItems: TopItem[] = Object.entries(unavailableItemsMap)
        .map(([itemId, data]) => ({
            itemId,
            clicks: data.clicks,
            name: data.name,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

    return { metrics, blockPerformance, topItems, menuActions, topSearchTerms, unavailableItems };
}

// ================================================================
// FETCH DAILY DATA
// ================================================================

export async function getOwnerDashboardDaily(
    tId: string,
    sId: string,
    projectId: string
): Promise<DailyViewData | null> {
    return await apiCallComposer(
        async () => {
            const yesterdayDate = getYesterdayDate();
            const docId = getDocId.daily(tId, sId, projectId, yesterdayDate);
            const docRef = doc(firebaseClient, COLLECTION, docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();
            const menuVisits = data.totalViews || 0;

            return {
                date: yesterdayDate,
                metrics: {
                    menuVisits,
                    itemClicks: data.totalClicks || 0,
                    searches: data.totalSearches || 0,
                    unavailableItemTaps: data.totalUnavailableItemTaps || 0,
                    menuActionClicks: data.totalMenuActionClicks || 0,
                    zeroResultSearches: data.zeroResultSearches || 0,
                    smartPicksRendered: data.totalDecisionBlocksRendered || 0,
                    smartPicksClicks: data.totalRecommendationClicks || 0,
                },
                blockPerformance: transformBlockPerformance(data),
                topItems: transformToTopItems(data),
                menuActions: transformMenuActions(data),
                topSearchTerms: transformTopSearchTerms(data),
                unavailableItems: transformUnavailableItems(data),
                aiSummary: data.aiSummary ? {
                    markdown: data.aiSummary.markdown,
                    bulletPoints: data.aiSummary.bulletPoints || [],
                    generatedAt: data.aiSummary.generatedAt?.toDate?.() || new Date(),
                    promptVersion: data.aiSummary.promptVersion || 'v1',
                } : undefined,
                isLowActivity: menuVisits < DAILY_GUARDRAILS.LOW_ACTIVITY_THRESHOLD,
            } as DailyViewData;
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
    projectId: string
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
            const currentWeekDocId = getDocId.weekly(tId, sId, projectId, getCurrentWeekId());
            const lastWeekDocId = getDocId.weekly(tId, sId, projectId, getLastWeekId());
            const currentWeekSnap = await getDoc(doc(firebaseClient, COLLECTION, currentWeekDocId));
            const lastWeekSnap = currentWeekSnap.exists()
                ? currentWeekSnap
                : await getDoc(doc(firebaseClient, COLLECTION, lastWeekDocId));

            if (!lastWeekSnap.exists()) {
                return null;
            }

            const weeklyData = lastWeekSnap.data();

            // Get AI summary from ownerDashboardSummary
            const aiSummaryData = summaryData.ownerDashboardSummary;

            return {
                weekStart: weeklyData.weekStart || aiSummaryData?.period?.start || '',
                weekEnd: weeklyData.weekEnd || aiSummaryData?.period?.end || '',
                metrics: {
                    menuVisits: weeklyData.totalViews || 0,
                    itemClicks: weeklyData.totalClicks || 0,
                    searches: weeklyData.totalSearches || 0,
                    unavailableItemTaps: weeklyData.totalUnavailableItemTaps || 0,
                    menuActionClicks: weeklyData.totalMenuActionClicks || 0,
                    zeroResultSearches: weeklyData.zeroResultSearches || 0,
                    smartPicksRendered: weeklyData.totalDecisionBlocksRendered || 0,
                    smartPicksClicks: weeklyData.totalRecommendationClicks || 0,
                },
                metricsChange: summaryData.ownerDashboardSummaryMetrics?.menuVisitsChange !== undefined ? {
                    menuVisitsChange: summaryData.ownerDashboardSummaryMetrics.menuVisitsChange,
                } : undefined,
                blockPerformance: transformBlockPerformance(weeklyData),
                topItems: transformToTopItems(weeklyData),
                menuActions: transformMenuActions(weeklyData),
                topSearchTerms: transformTopSearchTerms(weeklyData),
                unavailableItems: transformUnavailableItems(weeklyData),
                aiSummary: aiSummaryData ? {
                    markdown: aiSummaryData.markdown,
                    bulletPoints: aiSummaryData.bulletPoints || [],
                    generatedAt: aiSummaryData.generatedAt?.toDate?.() || new Date(),
                    promptVersion: aiSummaryData.promptVersion || 'v1',
                    period: aiSummaryData.period,
                } : undefined,
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
    projectId: string
): Promise<MonthlyViewData | null> {
    return await apiCallComposer(
        async () => {
            // Try last month first (since current month is incomplete)
            const lastMonthId = getLastMonthId();
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
                metrics: {
                    menuVisits: data.totalViews || 0,
                    itemClicks: data.totalClicks || 0,
                    searches: data.totalSearches || 0,
                    unavailableItemTaps: data.totalUnavailableItemTaps || 0,
                    menuActionClicks: data.totalMenuActionClicks || 0,
                    zeroResultSearches: data.zeroResultSearches || 0,
                    smartPicksRendered: data.totalDecisionBlocksRendered || 0,
                    smartPicksClicks: data.totalRecommendationClicks || 0,
                },
                blockPerformance: transformBlockPerformance(data),
                topItems: transformToTopItems(data),
                menuActions: transformMenuActions(data),
                topSearchTerms: transformTopSearchTerms(data),
                unavailableItems: transformUnavailableItems(data),
                aiSummary: data.aiSummary ? {
                    markdown: data.aiSummary.markdown,
                    bulletPoints: data.aiSummary.bulletPoints || [],
                    generatedAt: data.aiSummary.generatedAt?.toDate?.() || new Date(),
                    promptVersion: data.aiSummary.promptVersion || 'v1',
                } : undefined,
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
    projectId: string
): Promise<WTDViewData | null> {
    return await apiCallComposer(
        async () => {
            const dates = getLast7Days();
            const docs = await fetchDailyDocs(tId, sId, projectId, dates);

            if (docs.length === 0) {
                return null;
            }

            const { metrics, blockPerformance, topItems, menuActions, topSearchTerms, unavailableItems } = aggregateDailyDocs(docs);

            return {
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                daysWithData: docs.length,
                metrics,
                blockPerformance,
                topItems,
                menuActions,
                topSearchTerms,
                unavailableItems,
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
    projectId: string
): Promise<MTDViewData | null> {
    return await apiCallComposer(
        async () => {
            const dates = getMonthToDateDates();

            if (dates.length === 0) {
                return null;
            }

            const docs = await fetchDailyDocs(tId, sId, projectId, dates);

            if (docs.length === 0) {
                return null;
            }

            const { metrics, blockPerformance, topItems, menuActions, topSearchTerms, unavailableItems } = aggregateDailyDocs(docs);

            // Get month name
            const firstDate = new Date(dates[0]);
            const monthName = firstDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            // Get days in month
            const daysInMonth = new Date(
                firstDate.getFullYear(),
                firstDate.getMonth() + 1,
                0
            ).getDate();

            return {
                monthName,
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                daysWithData: docs.length,
                daysInMonth,
                metrics,
                blockPerformance,
                topItems,
                menuActions,
                topSearchTerms,
                unavailableItems,
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
    projectId: string
): Promise<HistoricalWeek[]> {
    return await apiCallComposer(
        async () => {
            const weekRanges = getLast4WeeksRanges();
            const currentWeekId = getCurrentWeekId();

            // Fetch all weeks in parallel for better performance
            const weekPromises = weekRanges.map(async (week) => {
                const dates = getDateRange(week.start, week.end);
                const docs = await fetchDailyDocs(tId, sId, projectId, dates);

                if (docs.length > 0) {
                    const { metrics } = aggregateDailyDocs(docs);
                    return {
                        weekStart: week.start.toISOString().split('T')[0],
                        weekEnd: week.end.toISOString().split('T')[0],
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
    projectId: string
): Promise<OverviewData | null> {
    return await apiCallComposer(
        async () => {
            // Step 1: Calculate all date ranges
            const yesterdayDate = getYesterdayDate();
            const wtdDates = getLast7Days();
            const mtdDates = getMonthToDateDates();
            const weekRanges = getLast4WeeksRanges();
            const currentWeekId = getCurrentWeekId();

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
                const { metrics, blockPerformance, topItems, menuActions, topSearchTerms, unavailableItems } = aggregateDailyDocs(wtdDocs);
                wtd = {
                    startDate: wtdDates[0],
                    endDate: wtdDates[wtdDates.length - 1],
                    daysWithData: wtdDocs.length,
                    metrics,
                    blockPerformance,
                    topItems,
                    menuActions,
                    topSearchTerms,
                    unavailableItems,
                };
            }

            // Step 5: Build MTD from cached data
            const mtdDocs = mtdDates
                .map(d => docsMap.get(d))
                .filter((d): d is DailyDocData => d !== undefined);

            let mtd: MTDViewData | null = null;
            if (mtdDocs.length > 0) {
                const { metrics, blockPerformance, topItems, menuActions, topSearchTerms, unavailableItems } = aggregateDailyDocs(mtdDocs);
                const firstDate = new Date(mtdDates[0]);
                const monthName = firstDate.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                });
                const daysInMonth = new Date(
                    firstDate.getFullYear(),
                    firstDate.getMonth() + 1,
                    0
                ).getDate();

                mtd = {
                    monthName,
                    startDate: mtdDates[0],
                    endDate: mtdDates[mtdDates.length - 1],
                    daysWithData: mtdDocs.length,
                    daysInMonth,
                    metrics,
                    blockPerformance,
                    topItems,
                    menuActions,
                    topSearchTerms,
                    unavailableItems,
                    avgDailyScans: Math.round(metrics.menuVisits / mtdDocs.length),
                };
            }

            // Step 6: Build yesterday from cached data
            const yesterdayDoc = docsMap.get(yesterdayDate);
            let yesterday: DailyViewData | null = null;
            if (yesterdayDoc) {
                const menuVisits = yesterdayDoc.totalViews;
                yesterday = {
                    date: yesterdayDate,
                    metrics: {
                        menuVisits,
                        itemClicks: yesterdayDoc.totalClicks,
                        searches: yesterdayDoc.totalSearches || 0,
                        unavailableItemTaps: yesterdayDoc.totalUnavailableItemTaps || 0,
                        menuActionClicks: yesterdayDoc.totalMenuActionClicks || 0,
                        zeroResultSearches: yesterdayDoc.zeroResultSearches || 0,
                        smartPicksRendered: yesterdayDoc.totalDecisionBlocksRendered,
                        smartPicksClicks: yesterdayDoc.totalRecommendationClicks,
                    },
                    blockPerformance: {
                        popular: {
                            rendered: yesterdayDoc.decisionBlocksRendered?.popular || 0,
                            clicks: yesterdayDoc.recommendationClicks?.popular || 0,
                        },
                        quickPick: {
                            rendered: yesterdayDoc.decisionBlocksRendered?.quickPick || 0,
                            clicks: yesterdayDoc.recommendationClicks?.quickPick || 0,
                        },
                        bestValue: {
                            rendered: yesterdayDoc.decisionBlocksRendered?.bestValue || 0,
                            clicks: yesterdayDoc.recommendationClicks?.bestValue || 0,
                        },
                    },
                    topItems: yesterdayDoc.recommendationClicksByItem
                        ? Object.entries(yesterdayDoc.recommendationClicksByItem)
                            .map(([itemId, clicks]) => ({
                                itemId,
                                clicks: clicks as number,
                                name: yesterdayDoc.itemNames?.[itemId],
                            }))
                            .sort((a, b) => b.clicks - a.clicks)
                            .slice(0, 5)
                        : [],
                    menuActions: transformMenuActions(yesterdayDoc),
                    topSearchTerms: transformTopSearchTerms(yesterdayDoc),
                    unavailableItems: transformUnavailableItems(yesterdayDoc),
                    isLowActivity: menuVisits < DAILY_GUARDRAILS.LOW_ACTIVITY_THRESHOLD,
                };
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
                        weekStart: week.start.toISOString().split('T')[0],
                        weekEnd: week.end.toISOString().split('T')[0],
                        weekLabel: formatWeekLabel(week.start, week.end),
                        metrics,
                        isCurrentWeek: week.weekId === currentWeekId,
                    });
                }
            }

            // Step 8: Fetch summary doc for AI summary (1 extra read)
            const weekly = await getOwnerDashboardWeekly(tId, sId, projectId);

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
    projectId: string
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

            return {
                lifetimeMetrics: {
                    totalViews: data.lifetimeTotalViews || lifetime.totalViews || 0,
                    totalClicks: data.lifetimeTotalClicks || lifetime.totalClicks || 0,
                    totalSmartPicksRendered: data.lifetimeTotalDecisionBlocksRendered || lifetime.totalDecisionBlocksRendered || 0,
                    totalSmartPicksClicks: data.lifetimeTotalRecommendationClicks || lifetime.totalRecommendationClicks || 0,
                    totalSearches: data.lifetimeTotalSearches || 0,
                    totalUnavailableItemTaps: data.lifetimeTotalUnavailableItemTaps || 0,
                    totalMenuActionClicks: data.lifetimeTotalMenuActionClicks || 0,
                },
                menuActions: transformMenuActions(data),
                firstDataDate: data.firstDataDate,
                lastUpdated: data.modifiedOn?.toDate?.() || data.lastUpdated?.toDate?.(),
            } as OverallData;
        },
        "getOwnerDashboardOverall"
    );
}

// ================================================================
// FETCH ALL DASHBOARD DATA
// ================================================================

export async function getOwnerDashboardData(
    tId: string,
    sId: string,
    projectId: string
): Promise<OwnerDashboardData> {
    return await apiCallComposer(
        async () => {
            // Fetch overview (includes wtd, mtd, yesterday, historical weeks) and overall in parallel
            const [overview, overall] = await Promise.all([
                getOwnerDashboardOverview(tId, sId, projectId),
                getOwnerDashboardOverall(tId, sId, projectId),
            ]);

            return {
                // Overview (primary view)
                overview,

                // Period views - extracted from overview for convenience
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
}

export interface OBPPeriodMetrics {
    views: number;
    actionClicks: number;
    menuClicks: number;
    shares: number;
    actions: OBPActionBreakdown;
    daysWithData: number;
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
    lifetimeShares: number;
    lifetimeActions: OBPActionBreakdown;
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
    totalOBPShares: number;
    obpActionClicks: { call: number; whatsapp: number; directions: number };
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
                totalOBPShares: data.totalOBPShares || 0,
                obpActionClicks: {
                    call: data.obpActionClicks?.call || 0,
                    whatsapp: data.obpActionClicks?.whatsapp || 0,
                    directions: data.obpActionClicks?.directions || 0,
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
        shares: 0,
        actions: { call: 0, whatsapp: 0, directions: 0 },
        daysWithData: docs.length,
    };

    for (const d of docs) {
        result.views += d.totalOBPViews;
        result.actionClicks += d.totalOBPActionClicks;
        result.menuClicks += d.totalOBPMenuClicks;
        result.shares += d.totalOBPShares;
        result.actions.call += d.obpActionClicks.call;
        result.actions.whatsapp += d.obpActionClicks.whatsapp;
        result.actions.directions += d.obpActionClicks.directions;
    }

    return result;
}

// ── OBP Overview Fetch (mirrors getOwnerDashboardOverview) ──

const OBP_LOW_ACTIVITY_THRESHOLD = 3; // views per week

export async function getOBPDashboardOverview(
    tId: string,
    sId: string,
): Promise<OBPOverviewData | null> {
    return await apiCallComposer(
        async () => {
            // Step 1: Calculate all date ranges (same strategy as menu overview)
            const yesterdayDate = getYesterdayDate();
            const wtdDates = getLast7Days();
            const mtdDates = getMonthToDateDates();
            const weekRanges = getLast4WeeksRanges();
            const currentWeekId = getCurrentWeekId();

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
                shares: yesterdayDoc.totalOBPShares,
                actions: yesterdayDoc.obpActionClicks,
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
                const firstDate = new Date(mtdDates[0]);
                const monthName = firstDate.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                });
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
                        weekStart: week.start.toISOString().split('T')[0],
                        weekEnd: week.end.toISOString().split('T')[0],
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

// ── OBP Overall (Lifetime) Fetch ──

export async function getOBPDashboardOverall(
    tId: string,
    sId: string,
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
                lifetimeShares: lifetime.totalOBPShares || 0,
                lifetimeActions: {
                    call: lifetime.obpActionClicks?.call || 0,
                    whatsapp: lifetime.obpActionClicks?.whatsapp || 0,
                    directions: lifetime.obpActionClicks?.directions || 0,
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
): Promise<OBPDashboardData> {
    return await apiCallComposer(
        async () => {
            const [overview, overall] = await Promise.all([
                getOBPDashboardOverview(tId, sId),
                getOBPDashboardOverall(tId, sId),
            ]);

            return {
                overview,
                overall,
                lastFetched: new Date(),
            };
        },
        "getOBPDashboardData"
    );
}
