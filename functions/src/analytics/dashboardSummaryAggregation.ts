import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS, getAnalyticsDocId, getWeekDateRange } from '../constants/database';
import {
    addDaysToAnalyticsDateKey,
    parseAnalyticsDateKey,
} from '../utils/analyticsDate';

const ANALYTICS_COLLECTION = DB_COLLECTIONS.ANALYTICS;
const MENU_DAILY_CACHE_DAYS = 45;
const CUSTOMER_APP_DAILY_CACHE_DAYS = 45;
const INTELLIGENCE_ITEM_LIMIT = 250;
const DASHBOARD_ITEM_LIMIT = 75;

function getDashboardSummaryDocId(tId: string, sId: string, projectId: string): string {
    return `${tId}_${sId}_${projectId}_dashboard_summary`;
}

function formatWeekLabel(start: Date, end: Date): string {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = monthLabels[start.getUTCMonth()];
    const endMonth = monthLabels[end.getUTCMonth()];
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    return startMonth === endMonth
        ? `${startMonth} ${startDay}-${endDay}`
        : `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function formatMonthLabel(dateKey: string): string {
    const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const date = parseAnalyticsDateKey(dateKey);
    return `${monthLabels[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getDateRange(startKey: string, endKey: string): string[] {
    const dates: string[] = [];
    let current = startKey;
    while (current <= endKey) {
        dates.push(current);
        current = addDaysToAnalyticsDateKey(current, 1);
    }
    return dates;
}

function getDateRangeForDates(start: Date, end: Date): string[] {
    return getDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
}

function getLast4WeekRanges(settlementDate: string): Array<{ start: Date; end: Date }> {
    const localToday = parseAnalyticsDateKey(addDaysToAnalyticsDateKey(settlementDate, 1));
    const ranges: Array<{ start: Date; end: Date }> = [];
    for (let i = 0; i < 4; i++) {
        const target = new Date(localToday);
        target.setUTCDate(target.getUTCDate() - (i * 7));
        const { weekStart, weekEnd } = getWeekDateRange(target);
        ranges.push({ start: weekStart, end: weekEnd });
    }
    return ranges.reverse();
}

function mergeMapField(target: Record<string, number>, source?: Record<string, number>): void {
    if (!source) return;
    for (const [key, value] of Object.entries(source)) {
        if (typeof value === 'number') {
            target[key] = (target[key] || 0) + value;
        }
    }
}

function aggregateDailyDocs(docs: Record<string, any>[]): Record<string, any> {
    const result: Record<string, any> = {
        totalViews: 0,
        totalClicks: 0,
        totalSessions: 0,
        totalSearches: 0,
        zeroResultSearches: 0,
        totalUnavailableItemTaps: 0,
        totalMenuActionClicks: 0,
        totalRecommendationClicks: 0,
        totalDecisionBlocksRendered: 0,
        totalInstalled: 0,
        totalAppOpens: 0,
        uniqueInstallSessions: 0,
        viewsByItem: {},
        clicksByItem: {},
        recommendationClicksByItem: {},
        hourlyClicksByItem: {},
        unavailableItemTapsByItem: {},
        searchTerms: {},
        menuActionClicks: {},
        recommendationClicks: {},
        decisionBlocksRendered: {},
        shortcutClicks: {},
        itemNames: {},
    };

    for (const doc of docs) {
        result.totalViews += doc.totalViews || 0;
        result.totalClicks += doc.totalClicks || 0;
        result.totalSessions += doc.totalSessions || 0;
        result.totalSearches += doc.totalSearches || 0;
        result.zeroResultSearches += doc.zeroResultSearches || 0;
        result.totalUnavailableItemTaps += doc.totalUnavailableItemTaps || 0;
        result.totalMenuActionClicks += doc.totalMenuActionClicks || 0;
        result.totalRecommendationClicks += doc.totalRecommendationClicks || 0;
        result.totalDecisionBlocksRendered += doc.totalDecisionBlocksRendered || 0;
        result.totalInstalled += doc.totalInstalled || 0;
        result.totalAppOpens += doc.totalAppOpens || 0;
        result.uniqueInstallSessions += doc.uniqueInstallSessions || 0;
        mergeMapField(result.viewsByItem, doc.viewsByItem);
        mergeMapField(result.clicksByItem, doc.clicksByItem);
        mergeMapField(result.recommendationClicksByItem, doc.recommendationClicksByItem);
        mergeNestedMapField(result.hourlyClicksByItem, doc.hourlyClicksByItem);
        mergeMapField(result.unavailableItemTapsByItem, doc.unavailableItemTapsByItem);
        mergeMapField(result.searchTerms, doc.searchTerms);
        mergeMapField(result.menuActionClicks, doc.menuActionClicks);
        mergeMapField(result.recommendationClicks, doc.recommendationClicks);
        mergeMapField(result.decisionBlocksRendered, doc.decisionBlocksRendered);
        mergeMapField(result.shortcutClicks, doc.shortcutClicks);
        if (doc.itemNames) {
            Object.assign(result.itemNames, doc.itemNames);
        }
    }

    return result;
}

function mergeNestedMapField(target: Record<string, Record<string, number>>, source?: Record<string, Record<string, number>>): void {
    if (!source) return;
    for (const [outerKey, innerMap] of Object.entries(source)) {
        if (!innerMap || typeof innerMap !== 'object') continue;
        if (!target[outerKey]) target[outerKey] = {};
        mergeMapField(target[outerKey], innerMap);
    }
}

function getDashboardMetrics(data: Record<string, any> = {}) {
    return {
        menuVisits: data.totalViews || 0,
        itemClicks: data.totalClicks || 0,
        searches: data.totalSearches || 0,
        unavailableItemTaps: data.totalUnavailableItemTaps || 0,
        menuActionClicks: data.totalMenuActionClicks || 0,
        zeroResultSearches: data.zeroResultSearches || 0,
        smartPicksRendered: data.totalDecisionBlocksRendered || 0,
        smartPicksClicks: data.totalRecommendationClicks || 0,
    };
}

function getMenuActions(data: Record<string, any> = {}) {
    return {
        call: data.menuActionClicks?.call || 0,
        whatsapp: data.menuActionClicks?.whatsapp || 0,
        directions: data.menuActionClicks?.directions || 0,
        reserve: data.menuActionClicks?.reserve || 0,
        order: data.menuActionClicks?.order || 0,
    };
}

function getBlockPerformance(data: Record<string, any> = {}) {
    return {
        popular: {
            rendered: data.decisionBlocksRendered?.popular || 0,
            clicks: data.recommendationClicks?.popular || 0,
        },
        quickPick: {
            rendered: data.decisionBlocksRendered?.quickPick || 0,
            clicks: data.recommendationClicks?.quickPick || 0,
        },
        bestValue: {
            rendered: data.decisionBlocksRendered?.bestValue || 0,
            clicks: data.recommendationClicks?.bestValue || 0,
        },
    };
}

function topMapEntries(map?: Record<string, number>, names?: Record<string, string>) {
    return Object.entries(map || {})
        .map(([itemId, clicks]) => ({ itemId, clicks, name: names?.[itemId] }))
        .filter((item) => typeof item.clicks === 'number' && item.clicks > 0)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
}

function topSearchTerms(map?: Record<string, number>) {
    return Object.entries(map || {})
        .map(([term, count]) => ({ term, count }))
        .filter((item) => typeof item.count === 'number' && item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function topMap(map?: Record<string, number>, limit = 20): Record<string, number> {
    return Object.fromEntries(
        Object.entries(map || {})
            .filter(([, value]) => typeof value === 'number' && value > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit),
    );
}

function pickMap(map: Record<string, number> | undefined, keys: Set<string>): Record<string, number> {
    const result: Record<string, number> = {};
    for (const key of keys) {
        const value = map?.[key];
        if (typeof value === 'number' && value > 0) {
            result[key] = value;
        }
    }
    return result;
}

function pickNestedHourlyMap(
    map: Record<string, Record<string, number>> | undefined,
    keys: Set<string>,
): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const key of keys) {
        const hourly = map?.[key];
        if (!hourly) continue;
        const compactHourly = topMap(hourly, 24);
        if (Object.keys(compactHourly).length > 0) {
            result[key] = compactHourly;
        }
    }
    return result;
}

function buildIntelligence7dSnapshot(
    tId: string,
    sId: string,
    projectId: string,
    settlementDate: string,
    dailyMap: Map<string, Record<string, any>>,
) {
    const startDate = addDaysToAnalyticsDateKey(settlementDate, -6);
    const dates = getDateRange(startDate, settlementDate);
    const docs = dates.map((date) => dailyMap.get(date)).filter(Boolean);
    const aggregated = aggregateDailyDocs(docs);
    const keepItemIds = new Set<string>([
        ...Object.keys(topMap(aggregated.viewsByItem, INTELLIGENCE_ITEM_LIMIT)),
        ...Object.keys(topMap(aggregated.clicksByItem, INTELLIGENCE_ITEM_LIMIT)),
        ...Object.keys(topMap(aggregated.recommendationClicksByItem, INTELLIGENCE_ITEM_LIMIT)),
        ...Object.keys(aggregated.hourlyClicksByItem || {}),
    ]);
    const itemNames: Record<string, string> = {};
    keepItemIds.forEach((itemId) => {
        if (aggregated.itemNames?.[itemId]) {
            itemNames[itemId] = aggregated.itemNames[itemId];
        }
    });

    return {
        tId,
        sId,
        projectId,
        kind: 'analyticsIntelligence7d',
        startDate,
        endDate: settlementDate,
        lastSettledLocalDate: settlementDate,
        totalViews: aggregated.totalViews || 0,
        totalClicks: aggregated.totalClicks || 0,
        totalSessions: aggregated.totalSessions || 0,
        viewsByItem: pickMap(aggregated.viewsByItem, keepItemIds),
        clicksByItem: pickMap(aggregated.clicksByItem, keepItemIds),
        recommendationClicksByItem: pickMap(aggregated.recommendationClicksByItem, keepItemIds),
        hourlyClicksByItem: pickNestedHourlyMap(aggregated.hourlyClicksByItem, keepItemIds),
        itemNames,
        daysWithData: docs.length,
        modifiedOn: FieldValue.serverTimestamp(),
    };
}

function compactAnalyticsDay(date: string, data: Record<string, any>) {
    const itemNames: Record<string, string> = {};
    const keepItemIds = new Set<string>([
        ...Object.keys(topMap(data.viewsByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(topMap(data.clicksByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(topMap(data.recommendationClicksByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(topMap(data.unavailableItemTapsByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(data.hourlyClicksByItem || {}),
    ]);
    keepItemIds.forEach((itemId) => {
        if (data.itemNames?.[itemId]) {
            itemNames[itemId] = data.itemNames[itemId];
        }
    });

    return {
        date,
        totalViews: data.totalViews || 0,
        totalClicks: data.totalClicks || 0,
        totalSessions: data.totalSessions || 0,
        totalSearches: data.totalSearches || 0,
        zeroResultSearches: data.zeroResultSearches || 0,
        totalUnavailableItemTaps: data.totalUnavailableItemTaps || 0,
        totalMenuActionClicks: data.totalMenuActionClicks || 0,
        totalRecommendationClicks: data.totalRecommendationClicks || 0,
        totalDecisionBlocksRendered: data.totalDecisionBlocksRendered || 0,
        viewsByDevice: data.viewsByDevice || {},
        clicksByDevice: data.clicksByDevice || {},
        viewsByLocation: data.viewsByLocation || {},
        clicksByLocation: data.clicksByLocation || {},
        viewsByItem: pickMap(data.viewsByItem, keepItemIds),
        clicksByItem: pickMap(data.clicksByItem, keepItemIds),
        recommendationClicksByItem: pickMap(data.recommendationClicksByItem, keepItemIds),
        hourlyClicksByItem: pickNestedHourlyMap(data.hourlyClicksByItem, keepItemIds),
        searchTerms: topMap(data.searchTerms, DASHBOARD_ITEM_LIMIT),
        unavailableItemTapsByItem: pickMap(data.unavailableItemTapsByItem, keepItemIds),
        menuActionClicks: data.menuActionClicks || {},
        recommendationClicks: data.recommendationClicks || {},
        decisionBlocksRendered: data.decisionBlocksRendered || {},
        itemNames,
        lastUpdated: data.lastUpdated || data.modifiedOn || null,
    };
}

function buildDailyMapFromRows(rows: any[], startDate: string, endDate: string): Map<string, Record<string, any>> {
    const result = new Map<string, Record<string, any>>();
    rows.forEach((row) => {
        const date = String(row?.date || '');
        if (!date || date < startDate || date > endDate) return;
        result.set(date, row);
    });
    return result;
}

async function buildIncrementalDailyMap(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    settlementDate: string,
    existingDashboard: Record<string, any> | null,
    settledDailyData?: Record<string, any> | null,
): Promise<{ dailyMap: Map<string, Record<string, any>>; source: 'incremental' | 'rebuild' }> {
    const startDate = addDaysToAnalyticsDateKey(settlementDate, -(MENU_DAILY_CACHE_DAYS - 1));
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
        const dailyMap = buildDailyMapFromRows(existingRows, startDate, previousSettledDate);
        if (settledDailyData) {
            dailyMap.set(settlementDate, compactAnalyticsDay(settlementDate, settledDailyData));
        }
        return { dailyMap, source: 'incremental' };
    }

    return {
        dailyMap: await fetchExistingDailyDocsByDate(db, tId, sId, projectId, startDate, settlementDate),
        source: 'rebuild',
    };
}

async function buildIncrementalCustomerAppDailyMap(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    existingDashboard: Record<string, any> | null,
    settledDailyData?: Record<string, any> | null,
): Promise<{ dailyMap: Map<string, Record<string, any>>; source: 'incremental' | 'rebuild' }> {
    const startDate = addDaysToAnalyticsDateKey(settlementDate, -(CUSTOMER_APP_DAILY_CACHE_DAYS - 1));
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
        const dailyMap = buildDailyMapFromRows(existingRows, startDate, previousSettledDate);
        if (settledDailyData) {
            dailyMap.set(settlementDate, {
                date: settlementDate,
                totalInstalled: settledDailyData.totalInstalled || 0,
                totalAppOpens: settledDailyData.totalAppOpens || 0,
                shortcutClicks: settledDailyData.shortcutClicks || {},
            });
        }
        return { dailyMap, source: 'incremental' };
    }

    return {
        dailyMap: await fetchExistingDailyDocsByDate(db, tId, sId, 'customerApp', startDate, settlementDate),
        source: 'rebuild',
    };
}

function buildDailyView(data: Record<string, any>, date: string) {
    const menuVisits = data.totalViews || 0;
    return {
        date,
        metrics: getDashboardMetrics(data),
        blockPerformance: getBlockPerformance(data),
        topItems: topMapEntries(data.recommendationClicksByItem, data.itemNames),
        menuActions: getMenuActions(data),
        topSearchTerms: topSearchTerms(data.searchTerms),
        unavailableItems: topMapEntries(data.unavailableItemTapsByItem, data.itemNames),
        isLowActivity: menuVisits < 20,
        isPartial: false,
        lastUpdated: data.lastUpdated || data.modifiedOn || null,
    };
}

function buildPeriodView(aggregated: Record<string, any>) {
    return {
        metrics: getDashboardMetrics(aggregated),
        blockPerformance: getBlockPerformance(aggregated),
        topItems: topMapEntries(aggregated.recommendationClicksByItem, aggregated.itemNames),
        menuActions: getMenuActions(aggregated),
        topSearchTerms: topSearchTerms(aggregated.searchTerms),
        unavailableItems: topMapEntries(aggregated.unavailableItemTapsByItem, aggregated.itemNames),
    };
}

async function fetchExistingDailyDocsByDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    startDate: string,
    endDate: string,
): Promise<Map<string, Record<string, any>>> {
    const prefix = getAnalyticsDocId.dailyPrefix(tId, sId, projectId);
    const snapshot = await db.collection(ANALYTICS_COLLECTION)
        .where('__name__', '>=', `${prefix}${startDate}`)
        .where('__name__', '<=', `${prefix}${endDate}`)
        .get();
    const result = new Map<string, Record<string, any>>();
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const date = String(data.date || data.localDate || doc.id.slice(prefix.length));
        result.set(date, data);
    });
    return result;
}

async function writeCustomerAppDashboardSummary(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    settledDailyData?: Record<string, any> | null,
): Promise<void> {
    const dashboardRef = db.collection(ANALYTICS_COLLECTION).doc(getDashboardSummaryDocId(tId, sId, 'customerApp'));
    const [dashboardSnap, summarySnap] = await Promise.all([
        dashboardRef.get(),
        db.collection(ANALYTICS_COLLECTION).doc(getAnalyticsDocId.summary(tId, sId, 'customerApp')).get(),
    ]);
    const existingDashboard = dashboardSnap.exists ? dashboardSnap.data() || {} : null;
    const { dailyMap, source } = await buildIncrementalCustomerAppDailyMap(
        db,
        tId,
        sId,
        settlementDate,
        existingDashboard,
        settledDailyData,
    );
    const summary = summarySnap.exists ? summarySnap.data() || {} : {};

    if (!summarySnap.exists && dailyMap.size === 0) return;

    const daily30d = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
            date,
            totalInstalled: data.totalInstalled || 0,
            totalAppOpens: data.totalAppOpens || 0,
            shortcutClicks: data.shortcutClicks || {},
        }));

    await dashboardRef.set({
        tId,
        sId,
        projectId: 'customerApp',
        kind: 'customerAppDashboardSummary',
        buildSource: source,
        generatedForLocalDate: addDaysToAnalyticsDateKey(settlementDate, 1),
        lastSettledLocalDate: settlementDate,
        summary,
        daily30d,
        modifiedOn: FieldValue.serverTimestamp(),
    }, { merge: true });
}

async function writeMenuDashboardSummary(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    settlementDate: string,
    settledDailyData?: Record<string, any> | null,
): Promise<void> {
    const dashboardRef = db.collection(ANALYTICS_COLLECTION).doc(getDashboardSummaryDocId(tId, sId, projectId));
    const [dashboardSnap, summarySnap] = await Promise.all([
        dashboardRef.get(),
        db.collection(ANALYTICS_COLLECTION).doc(getAnalyticsDocId.summary(tId, sId, projectId)).get(),
    ]);
    const existingDashboard = dashboardSnap.exists ? dashboardSnap.data() || {} : null;
    const wtdDates = getDateRange(addDaysToAnalyticsDateKey(settlementDate, -6), settlementDate);
    const firstOfMonth = `${settlementDate.slice(0, 7)}-01`;
    const mtdDates = getDateRange(firstOfMonth, settlementDate);
    const weekRanges = getLast4WeekRanges(settlementDate);
    const { dailyMap, source } = await buildIncrementalDailyMap(
        db,
        tId,
        sId,
        projectId,
        settlementDate,
        existingDashboard,
        settledDailyData,
    );
    const summary = summarySnap.exists ? summarySnap.data() || {} : {};

    if (!summarySnap.exists && dailyMap.size === 0) return;

    const aggregateForDates = (dates: string[]) => aggregateDailyDocs(dates.map((date) => dailyMap.get(date)).filter(Boolean));
    const wtdDocs = wtdDates.map((date) => dailyMap.get(date)).filter(Boolean);
    const mtdDocs = mtdDates.map((date) => dailyMap.get(date)).filter(Boolean);
    const wtdAggregated = aggregateForDates(wtdDates);
    const mtdAggregated = aggregateForDates(mtdDates);
    const yesterdayData = dailyMap.get(settlementDate);
    const yesterday = yesterdayData ? buildDailyView(yesterdayData, settlementDate) : null;
    const wtd = wtdDocs.length > 0 ? {
        startDate: wtdDates[0],
        endDate: settlementDate,
        daysWithData: wtdDocs.length,
        ...buildPeriodView(wtdAggregated),
    } : null;
    const firstDate = parseAnalyticsDateKey(firstOfMonth);
    const daysInMonth = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0)).getUTCDate();
    const mtd = mtdDocs.length > 0 ? {
        monthName: formatMonthLabel(firstOfMonth),
        startDate: firstOfMonth,
        endDate: settlementDate,
        daysWithData: mtdDocs.length,
        daysInMonth,
        avgDailyScans: Math.round((mtdAggregated.totalViews || 0) / mtdDocs.length),
        ...buildPeriodView(mtdAggregated),
    } : null;
    const historicalWeeks = weekRanges.map((range) => {
        const dates = getDateRangeForDates(range.start, range.end);
        const docs = dates.map((date) => dailyMap.get(date)).filter(Boolean);
        if (docs.length === 0) return null;
        const aggregated = aggregateDailyDocs(docs);
        return {
            weekStart: range.start.toISOString().split('T')[0],
            weekEnd: range.end.toISOString().split('T')[0],
            weekLabel: formatWeekLabel(range.start, range.end),
            metrics: getDashboardMetrics(aggregated),
            isCurrentWeek: dates.includes(settlementDate),
        };
    }).filter(Boolean);
    const weekly = wtd ? {
        weekStart: wtd.startDate,
        weekEnd: wtd.endDate,
        ...buildPeriodView(wtdAggregated),
        aiSummary: summary.ownerDashboardSummary ? {
            markdown: summary.ownerDashboardSummary.markdown,
            bulletPoints: summary.ownerDashboardSummary.bulletPoints || [],
            generatedAt: summary.ownerDashboardSummary.generatedAt || null,
            promptVersion: summary.ownerDashboardSummary.promptVersion || 'v1',
            period: summary.ownerDashboardSummary.period,
        } : undefined,
        metricsChange: summary.ownerDashboardSummaryMetrics?.menuVisitsChange !== undefined ? {
            menuVisitsChange: summary.ownerDashboardSummaryMetrics.menuVisitsChange,
        } : undefined,
    } : null;
    const monthly = mtd ? {
        monthStart: mtd.startDate,
        monthEnd: mtd.endDate,
        daysWithData: mtd.daysWithData,
        ...buildPeriodView(mtdAggregated),
    } : null;

    let status: 'working' | 'low_activity' | 'no_data' = 'no_data';
    let statusMessage = 'No data yet. Your menu analytics will appear once customers start scanning.';
    if (wtd) {
        if ((wtd.metrics.menuVisits || 0) >= 50) {
            status = 'working';
            statusMessage = 'Your menu is working! Customers are scanning and exploring.';
        } else if ((wtd.metrics.menuVisits || 0) > 0) {
            status = 'low_activity';
            statusMessage = 'Some activity this week. Things are getting started.';
        }
    } else if (yesterday && yesterday.metrics.menuVisits > 0) {
        status = 'low_activity';
        statusMessage = 'Activity detected yesterday. Building your weekly summary.';
    }

    const overall = summarySnap.exists ? {
        lifetimeMetrics: {
            totalViews: summary.lifetimeTotalViews || summary.lifetime?.totalViews || 0,
            totalClicks: summary.lifetimeTotalClicks || summary.lifetime?.totalClicks || 0,
            totalSmartPicksRendered: summary.lifetimeTotalDecisionBlocksRendered || summary.lifetime?.totalDecisionBlocksRendered || 0,
            totalSmartPicksClicks: summary.lifetimeTotalRecommendationClicks || summary.lifetime?.totalRecommendationClicks || 0,
            totalSearches: summary.lifetimeTotalSearches || 0,
            totalZeroResultSearches: summary.lifetimeZeroResultSearches || 0,
            totalUnavailableItemTaps: summary.lifetimeTotalUnavailableItemTaps || 0,
            totalMenuActionClicks: summary.lifetimeTotalMenuActionClicks || 0,
        },
        menuActions: getMenuActions(summary),
        firstDataDate: summary.firstDataDate,
        lastUpdated: summary.modifiedOn || summary.lastUpdated || null,
    } : null;

    await dashboardRef.set({
        tId,
        sId,
        projectId,
        kind: 'ownerDashboardSummary',
        buildSource: source,
        generatedForLocalDate: addDaysToAnalyticsDateKey(settlementDate, 1),
        lastSettledLocalDate: settlementDate,
        overview: {
            status,
            statusMessage,
            wtd,
            mtd,
            yesterday,
            historicalWeeks,
            aiSummary: weekly?.aiSummary,
        },
        daily: yesterday,
        weekly,
        monthly,
        wtd,
        mtd,
        historicalWeeks,
        overall,
        analyticsSummary: summary,
        daily30d: Array.from(dailyMap.entries())
            .filter(([date]) => date >= addDaysToAnalyticsDateKey(settlementDate, -(MENU_DAILY_CACHE_DAYS - 1)) && date <= settlementDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => compactAnalyticsDay(date, data)),
        modifiedOn: FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection(ANALYTICS_COLLECTION).doc(`${tId}_${sId}_${projectId}_intelligence_7d`).set(
        buildIntelligence7dSnapshot(tId, sId, projectId, settlementDate, dailyMap),
        { merge: true },
    );
}

export async function writeDashboardSummaryDocument(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    projectId: string,
    settlementDate: string,
    settledDailyData?: Record<string, any> | null,
): Promise<void> {
    if (projectId === 'customerApp') {
        await writeCustomerAppDashboardSummary(db, tId, sId, settlementDate, settledDailyData);
        return;
    }

    await writeMenuDashboardSummary(db, tId, sId, projectId, settlementDate, settledDailyData);
}
