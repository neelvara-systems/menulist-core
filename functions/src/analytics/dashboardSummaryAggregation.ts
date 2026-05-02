import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS, getAnalyticsDocId, getWeekDateRange } from '../constants/database';
import { logger as appLogger } from '../lib/logger';
import { generateOwnerActionPlan, OwnerActionCandidate } from '../services/gemini/ownerActionPlan';
import { AnalyticsAiEntitlement } from './analyticsAiEntitlements';
import {
    addDaysToAnalyticsDateKey,
    parseAnalyticsDateKey,
} from '../utils/analyticsDate';

const ANALYTICS_COLLECTION = DB_COLLECTIONS.ANALYTICS;
const MENU_DAILY_CACHE_DAYS = 45;
const CUSTOMER_APP_DAILY_CACHE_DAYS = 45;
const INTELLIGENCE_ITEM_LIMIT = 250;
const DASHBOARD_ITEM_LIMIT = 75;

export interface OwnerDashboardAISummaryPayload {
    markdown: string;
    bulletPoints: string[];
    generatedAt: any;
    promptVersion: string;
    period?: {
        start: string;
        end: string;
    };
}

export interface OwnerDashboardAIPayloads {
    daily?: OwnerDashboardAISummaryPayload;
    weekly?: OwnerDashboardAISummaryPayload;
    weeklyMetricsChange?: {
        menuVisitsChange: number;
    };
    monthly?: OwnerDashboardAISummaryPayload;
}

const DEFAULT_ANALYTICS_AI_ENTITLEMENT: AnalyticsAiEntitlement = {
    enabled: false,
    activePlanType: null,
    requiredPlanType: 'pro',
    reason: 'missing_plan',
};

export interface CatalogInsightInput {
    projectId?: string;
    defaultLanguage?: string;
    languages?: string[];
    files?: Array<Record<string, any>>;
}

interface CatalogInsightCategory {
    id: string;
    name: string;
    active: boolean;
    orderIndex: number;
    timeSlots: Array<Record<string, any>>;
}

interface CatalogInsightItem {
    id: string;
    name: string;
    categoryId: string;
    active: boolean;
    available: boolean;
    price: number | null;
    activeAttributes: number;
    tags: string[];
    dietaryTags: string[];
    spiceLevel?: string;
    targetAudience?: string;
    skillLevel?: string;
    duration?: number;
    isBestSeller: boolean;
    ownerBoost: number;
    orderIndex: number;
    hasImage: boolean;
    hasDescription: boolean;
    hasQualityReview: boolean;
}

interface CatalogInsightContext {
    itemsById: Record<string, CatalogInsightItem>;
    categoriesById: Record<string, CatalogInsightCategory>;
    itemsByCategoryId: Record<string, CatalogInsightItem[]>;
}

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
        menuSessions: 0,
        engagedSessions: 0,
        intentSessions: 0,
        actionSessions: 0,
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
        viewsByEntrySource: {},
        menuSessionsBySource: {},
        actionSessionsBySource: {},
        menuActionClicksBySource: {},
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
        clicksByItem: {},
        recommendationClicksByItem: {},
        hourlyClicksByItem: {},
        unavailableItemTapsByItem: {},
        searchTerms: {},
        zeroResultSearchTerms: {},
        menuActionClicks: {},
        recommendationClicks: {},
        decisionBlocksRendered: {},
        shortcutClicks: {},
        itemNames: {},
        categoryNames: {},
        attributeFilterNames: {},
    };

    for (const doc of docs) {
        result.totalViews += doc.totalViews || 0;
        result.totalClicks += doc.totalClicks || 0;
        result.totalSessions += doc.totalSessions || 0;
        result.menuSessions += doc.menuSessions || 0;
        result.engagedSessions += doc.engagedSessions || 0;
        result.intentSessions += doc.intentSessions || 0;
        result.actionSessions += doc.actionSessions || 0;
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
        mergeMapField(result.viewsByEntrySource, doc.viewsByEntrySource);
        mergeMapField(result.menuSessionsBySource, doc.menuSessionsBySource);
        mergeMapField(result.actionSessionsBySource, doc.actionSessionsBySource);
        mergeMapField(result.menuActionClicksBySource, doc.menuActionClicksBySource);
        mergeMapField(result.attributeFilterInteractions, doc.attributeFilterInteractions);
        mergeMapField(result.attributeFilterItemViews, doc.attributeFilterItemViews);
        mergeMapField(result.attributeFilterItemTaps, doc.attributeFilterItemTaps);
        mergeMapField(result.attributeFilterSearches, doc.attributeFilterSearches);
        mergeMapField(result.attributeFilterUnavailableTaps, doc.attributeFilterUnavailableTaps);
        mergeMapField(result.attributeFilterActionClicks, doc.attributeFilterActionClicks);
        mergeMapField(result.viewsByCategory, doc.viewsByCategory);
        mergeMapField(result.clicksByCategory, doc.clicksByCategory);
        mergeMapField(result.hourlyViews, doc.hourlyViews);
        mergeMapField(result.hourlyMenuActionClicks, doc.hourlyMenuActionClicks);
        mergeMapField(result.clicksByItem, doc.clicksByItem);
        mergeMapField(result.recommendationClicksByItem, doc.recommendationClicksByItem);
        mergeNestedMapField(result.hourlyClicksByItem, doc.hourlyClicksByItem);
        mergeMapField(result.unavailableItemTapsByItem, doc.unavailableItemTapsByItem);
        mergeMapField(result.searchTerms, doc.searchTerms);
        mergeMapField(result.zeroResultSearchTerms, doc.zeroResultSearchTerms);
        mergeMapField(result.menuActionClicks, doc.menuActionClicks);
        mergeMapField(result.recommendationClicks, doc.recommendationClicks);
        mergeMapField(result.decisionBlocksRendered, doc.decisionBlocksRendered);
        mergeMapField(result.shortcutClicks, doc.shortcutClicks);
        if (doc.itemNames) {
            Object.assign(result.itemNames, doc.itemNames);
        }
        if (doc.categoryNames) {
            Object.assign(result.categoryNames, doc.categoryNames);
        }
        if (doc.attributeFilterNames) {
            Object.assign(result.attributeFilterNames, doc.attributeFilterNames);
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
    const menuSessions = data.menuSessions || data.totalSessions || 0;
    const engagedSessions = data.engagedSessions || 0;
    const intentSessions = data.intentSessions || 0;
    const actionSessions = data.actionSessions || 0;

    return {
        menuVisits: data.totalViews || 0,
        itemClicks: data.totalClicks || 0,
        menuSessions,
        engagedSessions,
        intentSessions,
        actionSessions,
        engagedSessionRate: menuSessions > 0 ? Math.round((engagedSessions / menuSessions) * 100) : 0,
        intentRate: menuSessions > 0 ? Math.round((intentSessions / menuSessions) * 100) : 0,
        actionRate: menuSessions > 0 ? Math.round((actionSessions / menuSessions) * 100) : 0,
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

function topCategoryEntries(data: Record<string, any> = {}) {
    const views = data.viewsByCategory || {};
    const clicks = data.clicksByCategory || {};
    const categoryIds = new Set<string>([
        ...Object.keys(views),
        ...Object.keys(clicks),
    ]);

    return Array.from(categoryIds)
        .map((categoryId) => ({
            categoryId,
            name: data.categoryNames?.[categoryId],
            views: views[categoryId] || 0,
            clicks: clicks[categoryId] || 0,
        }))
        .filter((category) => category.views > 0 || category.clicks > 0)
        .sort((a, b) => (b.views + b.clicks) - (a.views + a.clicks))
        .slice(0, 5);
}

function topAttributeFilters(data: Record<string, any> = {}) {
    const interactions = data.attributeFilterInteractions || {};
    const actionClicks = data.attributeFilterActionClicks || {};
    const itemViews = data.attributeFilterItemViews || {};
    const itemTaps = data.attributeFilterItemTaps || {};
    const searches = data.attributeFilterSearches || {};
    const unavailableTaps = data.attributeFilterUnavailableTaps || {};
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
            label: data.attributeFilterNames?.[filterId] || filterId,
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

function sourceQualityEntries(data: Record<string, any> = {}) {
    const sessions = data.menuSessionsBySource || {};
    const actionSessions = data.actionSessionsBySource || {};
    const actionClicks = data.menuActionClicksBySource || {};
    const sourceIds = new Set<string>([
        ...Object.keys(sessions),
        ...Object.keys(actionSessions),
        ...Object.keys(actionClicks),
    ]);

    return Array.from(sourceIds)
        .map((source) => {
            const menuSessions = sessions[source] || 0;
            const actions = actionClicks[source] || 0;
            const sourceActionSessions = actionSessions[source] || 0;
            return {
                source,
                label: SOURCE_LABELS[source] || source,
                menuSessions,
                actionSessions: sourceActionSessions,
                actionClicks: actions,
                actionRate: menuSessions > 0 ? Math.round((sourceActionSessions / menuSessions) * 100) : 0,
            };
        })
        .filter((entry) => entry.menuSessions > 0 || entry.actionClicks > 0)
        .sort((a, b) => (b.actionSessions - a.actionSessions) || (b.menuSessions - a.menuSessions))
        .slice(0, 6);
}

function topHourlyEntry(map?: Record<string, number>) {
    const [hour, count] = Object.entries(map || {})
        .filter(([, value]) => typeof value === 'number' && value > 0)
        .sort((a, b) => b[1] - a[1])[0] || [];
    if (!hour) return null;
    return { hour, count };
}

function buildOwnerConfidence(data: Record<string, any> = {}) {
    const metrics = getDashboardMetrics(data);
    if (metrics.menuVisits === 0) {
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

function buildOwnerActionCandidates(data: Record<string, any> = {}): OwnerActionCandidate[] {
    const metrics = getDashboardMetrics(data);
    const candidates: OwnerActionCandidate[] = [];
    const topSearch = topSearchTerms(data.searchTerms)[0];
    const topZeroSearch = topSearchTerms(data.zeroResultSearchTerms)[0];
    const topUnavailable = topMapEntries(data.unavailableItemTapsByItem, data.itemNames)[0];
    const topCategory = topCategoryEntries(data)[0];
    const sourceQuality = sourceQualityEntries(data);
    const bestSource = sourceQuality[0];
    const peakHour = topHourlyEntry(data.hourlyViews);

    if (topZeroSearch) {
        candidates.push({
            id: 'search-vocabulary',
            type: 'search_vocabulary',
            title: 'Add the words customers search for',
            description: `Customers searched for "${topZeroSearch.term}" but did not get a match.`,
            reason: `${topZeroSearch.count} no-result searches`,
            actionLabel: 'Review menu wording',
            metricLabel: `${topZeroSearch.count} misses`,
            priority: 'high',
        });
    }

    if (topUnavailable) {
        candidates.push({
            id: 'unavailable-demand',
            type: 'demand_gap',
            title: 'Check unavailable demand',
            description: `${topUnavailable.name || topUnavailable.itemId} was tapped while unavailable.`,
            reason: `${topUnavailable.clicks} unavailable taps`,
            actionLabel: 'Restock or update availability',
            metricLabel: `${topUnavailable.clicks} taps`,
            priority: 'high',
        });
    }

    if ((metrics.engagedSessions || 0) >= 5 && (metrics.actionRate || 0) < 20) {
        candidates.push({
            id: 'action-leakage',
            type: 'action_leakage',
            title: 'Make the next step clearer',
            description: 'Customers are browsing, but fewer sessions are ending in call, WhatsApp, directions, reserve, or order.',
            reason: `${metrics.engagedSessionRate || 0}% engaged sessions, ${metrics.actionRate || 0}% action rate`,
            actionLabel: 'Check customer action buttons',
            metricLabel: `${metrics.actionRate || 0}% action rate`,
            priority: 'high',
        });
    }

    if (topCategory && (topCategory.views + topCategory.clicks) >= 5) {
        candidates.push({
            id: 'menu-reorder',
            type: 'menu_reorder',
            title: 'Move the strongest category higher',
            description: `${topCategory.name || topCategory.categoryId} is getting the most category interest.`,
            reason: `${topCategory.views} views and ${topCategory.clicks} taps`,
            actionLabel: 'Review menu order',
            metricLabel: `${topCategory.views + topCategory.clicks} signals`,
            priority: 'medium',
        });
    }

    if (topSearch && !topZeroSearch && topSearch.count >= 3) {
        candidates.push({
            id: 'demand-focus',
            type: 'demand_gap',
            title: 'Use current customer demand',
            description: `"${topSearch.term}" is the most searched term in this period.`,
            reason: `${topSearch.count} searches`,
            actionLabel: 'Feature matching items',
            metricLabel: `${topSearch.count} searches`,
            priority: 'medium',
        });
    }

    if (peakHour && peakHour.count >= 5) {
        candidates.push({
            id: 'daypart-focus',
            type: 'daypart',
            title: 'Use the busiest browsing hour',
            description: `Customer menu activity is strongest around ${peakHour.hour}:00.`,
            reason: `${peakHour.count} menu views in that hour`,
            actionLabel: 'Time today’s share',
            metricLabel: `${peakHour.hour}:00 peak`,
            priority: 'low',
        });
    }

    if (bestSource && bestSource.menuSessions >= 3) {
        candidates.push({
            id: 'source-quality',
            type: 'source_quality',
            title: 'Use the source that brings action',
            description: `${bestSource.label} is producing the strongest customer action signal.`,
            reason: `${bestSource.actionRate}% action rate from ${bestSource.menuSessions} sessions`,
            actionLabel: 'Share there again',
            metricLabel: `${bestSource.actionRate}%`,
            priority: 'medium',
        });
    }

    if (metrics.menuVisits > 0 && candidates.length === 0) {
        candidates.push({
            id: 'confidence',
            type: 'confidence',
            title: 'Menu state is stable',
            description: 'Customers are viewing the menu and no urgent demand gap was detected.',
            reason: `${metrics.menuVisits} menu scans`,
            actionLabel: 'No action needed',
            metricLabel: `${metrics.menuVisits} scans`,
            priority: 'low',
        });
    }

    return candidates
        .sort((a, b) => {
            const weight = { high: 3, medium: 2, low: 1 };
            return weight[b.priority] - weight[a.priority];
        })
        .slice(0, 4);
}

function buildActionPlanFingerprint(candidates: OwnerActionCandidate[]): string {
    return candidates
        .map((candidate) => [
            candidate.id,
            candidate.priority,
            candidate.metricLabel || '',
            candidate.reason,
        ].join(':'))
        .join('|');
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

function isAnalyticsRow(row: Record<string, any> | undefined): row is Record<string, any> {
    return Boolean(row);
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
    const docs = dates.map((date) => dailyMap.get(date)).filter(isAnalyticsRow);
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
        menuSessions: data.menuSessions || 0,
        engagedSessions: data.engagedSessions || 0,
        intentSessions: data.intentSessions || 0,
        actionSessions: data.actionSessions || 0,
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
        viewsByEntrySource: topMap(data.viewsByEntrySource, DASHBOARD_ITEM_LIMIT),
        menuSessionsBySource: topMap(data.menuSessionsBySource, DASHBOARD_ITEM_LIMIT),
        actionSessionsBySource: topMap(data.actionSessionsBySource, DASHBOARD_ITEM_LIMIT),
        menuActionClicksBySource: topMap(data.menuActionClicksBySource, DASHBOARD_ITEM_LIMIT),
        attributeFilterInteractions: topMap(data.attributeFilterInteractions, DASHBOARD_ITEM_LIMIT),
        attributeFilterItemViews: topMap(data.attributeFilterItemViews, DASHBOARD_ITEM_LIMIT),
        attributeFilterItemTaps: topMap(data.attributeFilterItemTaps, DASHBOARD_ITEM_LIMIT),
        attributeFilterSearches: topMap(data.attributeFilterSearches, DASHBOARD_ITEM_LIMIT),
        attributeFilterUnavailableTaps: topMap(data.attributeFilterUnavailableTaps, DASHBOARD_ITEM_LIMIT),
        attributeFilterActionClicks: topMap(data.attributeFilterActionClicks, DASHBOARD_ITEM_LIMIT),
        viewsByItem: pickMap(data.viewsByItem, keepItemIds),
        viewsByCategory: topMap(data.viewsByCategory, DASHBOARD_ITEM_LIMIT),
        clicksByCategory: topMap(data.clicksByCategory, DASHBOARD_ITEM_LIMIT),
        hourlyViews: topMap(data.hourlyViews, 24),
        hourlyMenuActionClicks: topMap(data.hourlyMenuActionClicks, 24),
        clicksByItem: pickMap(data.clicksByItem, keepItemIds),
        recommendationClicksByItem: pickMap(data.recommendationClicksByItem, keepItemIds),
        hourlyClicksByItem: pickNestedHourlyMap(data.hourlyClicksByItem, keepItemIds),
        searchTerms: topMap(data.searchTerms, DASHBOARD_ITEM_LIMIT),
        zeroResultSearchTerms: topMap(data.zeroResultSearchTerms, DASHBOARD_ITEM_LIMIT),
        unavailableItemTapsByItem: pickMap(data.unavailableItemTapsByItem, keepItemIds),
        menuActionClicks: data.menuActionClicks || {},
        recommendationClicks: data.recommendationClicks || {},
        decisionBlocksRendered: data.decisionBlocksRendered || {},
        itemNames,
        categoryNames: data.categoryNames || {},
        attributeFilterNames: data.attributeFilterNames || {},
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
                totalPromptShown: settledDailyData.totalPromptShown || 0,
                totalPromptDismissed: settledDailyData.totalPromptDismissed || 0,
                totalInstallStarted: settledDailyData.totalInstallStarted || 0,
                totalInstalled: settledDailyData.totalInstalled || 0,
                uniqueInstallSessions: settledDailyData.uniqueInstallSessions || 0,
                totalAppOpens: settledDailyData.totalAppOpens || 0,
                shortcutClicks: settledDailyData.shortcutClicks || {},
                installsByDevice: settledDailyData.installsByDevice || {},
                installsByLocation: settledDailyData.installsByLocation || {},
                installsByPlatform: settledDailyData.installsByPlatform || {},
                installsBySource: settledDailyData.installsBySource || {},
                appOpensByPlatform: settledDailyData.appOpensByPlatform || {},
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
        topCategories: topCategoryEntries(data),
        topAttributeFilters: topAttributeFilters(data),
        menuActions: getMenuActions(data),
        topSearchTerms: topSearchTerms(data.searchTerms),
        unavailableItems: topMapEntries(data.unavailableItemTapsByItem, data.itemNames),
        sourceQuality: sourceQualityEntries(data),
        ownerConfidence: buildOwnerConfidence(data),
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
        topCategories: topCategoryEntries(aggregated),
        topAttributeFilters: topAttributeFilters(aggregated),
        menuActions: getMenuActions(aggregated),
        topSearchTerms: topSearchTerms(aggregated.searchTerms),
        unavailableItems: topMapEntries(aggregated.unavailableItemTapsByItem, aggregated.itemNames),
        sourceQuality: sourceQualityEntries(aggregated),
        ownerConfidence: buildOwnerConfidence(aggregated),
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
    if (source === 'rebuild') {
        appLogger.warn('[AnalyticsSettlement] Customer App dashboard summary rebuilt from daily docs', {
            tId,
            sId,
            projectId: 'customerApp',
            settlementDate,
            daysLoaded: dailyMap.size,
        });
    }
    const summary = summarySnap.exists ? summarySnap.data() || {} : {};

    if (!summarySnap.exists && dailyMap.size === 0) return;

    const daily30d = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
            date,
            totalPromptShown: data.totalPromptShown || 0,
            totalPromptDismissed: data.totalPromptDismissed || 0,
            totalInstallStarted: data.totalInstallStarted || 0,
            totalInstalled: data.totalInstalled || 0,
            uniqueInstallSessions: data.uniqueInstallSessions || 0,
            totalAppOpens: data.totalAppOpens || 0,
            shortcutClicks: data.shortcutClicks || {},
            installsByDevice: data.installsByDevice || {},
            installsByLocation: data.installsByLocation || {},
            installsByPlatform: data.installsByPlatform || {},
            installsBySource: data.installsBySource || {},
            appOpensByPlatform: data.appOpensByPlatform || {},
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
    aiPayloads: OwnerDashboardAIPayloads = {},
    analyticsAiEntitlement: AnalyticsAiEntitlement = DEFAULT_ANALYTICS_AI_ENTITLEMENT,
): Promise<void> {
    const canUseAnalyticsAi = analyticsAiEntitlement.enabled;
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
    if (source === 'rebuild') {
        appLogger.warn('[AnalyticsSettlement] Menu dashboard summary rebuilt from daily docs', {
            tId,
            sId,
            projectId,
            settlementDate,
            daysLoaded: dailyMap.size,
        });
    }
    const summary = summarySnap.exists ? summarySnap.data() || {} : {};

    if (!summarySnap.exists && dailyMap.size === 0) return;

    const aggregateForDates = (dates: string[]) => aggregateDailyDocs(dates.map((date) => dailyMap.get(date)).filter(isAnalyticsRow));
    const wtdDocs = wtdDates.map((date) => dailyMap.get(date)).filter(isAnalyticsRow);
    const mtdDocs = mtdDates.map((date) => dailyMap.get(date)).filter(isAnalyticsRow);
    const wtdAggregated = aggregateForDates(wtdDates);
    const mtdAggregated = aggregateForDates(mtdDates);
    const yesterdayData = dailyMap.get(settlementDate);
    const yesterday = yesterdayData ? {
        ...buildDailyView(yesterdayData, settlementDate),
        aiSummary: canUseAnalyticsAi ? (aiPayloads.daily || yesterdayData.aiSummary) : undefined,
    } : null;
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
        const docs = dates.map((date) => dailyMap.get(date)).filter(isAnalyticsRow);
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
        aiSummary: canUseAnalyticsAi ? (aiPayloads.weekly || (summary.ownerDashboardSummary ? {
            markdown: summary.ownerDashboardSummary.markdown,
            bulletPoints: summary.ownerDashboardSummary.bulletPoints || [],
            generatedAt: summary.ownerDashboardSummary.generatedAt || null,
            promptVersion: summary.ownerDashboardSummary.promptVersion || 'v1',
            period: summary.ownerDashboardSummary.period,
        } : undefined)) : undefined,
        metricsChange: aiPayloads.weeklyMetricsChange || (summary.ownerDashboardSummaryMetrics?.menuVisitsChange !== undefined ? {
            menuVisitsChange: summary.ownerDashboardSummaryMetrics.menuVisitsChange,
        } : undefined),
    } : null;
    const monthly = mtd ? {
        monthStart: mtd.startDate,
        monthEnd: mtd.endDate,
        daysWithData: mtd.daysWithData,
        ...buildPeriodView(mtdAggregated),
        aiSummary: canUseAnalyticsAi ? aiPayloads.monthly : undefined,
    } : null;
    const actionPlanInput = wtdDocs.length > 0 ? wtdAggregated : mtdDocs.length > 0 ? mtdAggregated : (yesterdayData || {});
    const actionPlanCandidates = buildOwnerActionCandidates(actionPlanInput);
    const actionPlanFingerprint = buildActionPlanFingerprint(actionPlanCandidates);
    const reusableActionPlan = existingDashboard?.ownerActionPlan?.fingerprint === actionPlanFingerprint
        ? existingDashboard.ownerActionPlan
        : null;
    const shouldGenerateActionPlan = canUseAnalyticsAi
        && actionPlanCandidates.length > 0
        && ((actionPlanInput.menuSessions || 0) >= 3 || (actionPlanInput.totalViews || 0) >= 3);
    const ownerActionPlan = canUseAnalyticsAi ? (reusableActionPlan || {
        ...(shouldGenerateActionPlan
            ? await generateOwnerActionPlan(actionPlanCandidates)
            : { generatedBy: 'rules' as const, actions: actionPlanCandidates }),
        fingerprint: actionPlanFingerprint,
    }) : undefined;
    const ownerConfidence = buildOwnerConfidence(actionPlanInput);
    const sourceQuality = sourceQualityEntries(actionPlanInput);

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

    const lifetimeMenuSessions = summary.lifetimeMenuSessions || summary.lifetime?.menuSessions || 0;
    const lifetimeEngagedSessions = summary.lifetimeEngagedSessions || summary.lifetime?.engagedSessions || 0;
    const lifetimeIntentSessions = summary.lifetimeIntentSessions || summary.lifetime?.intentSessions || 0;
    const lifetimeActionSessions = summary.lifetimeActionSessions || summary.lifetime?.actionSessions || 0;
    const overall = summarySnap.exists ? {
        lifetimeMetrics: {
            totalViews: summary.lifetimeTotalViews || summary.lifetime?.totalViews || 0,
            totalClicks: summary.lifetimeTotalClicks || summary.lifetime?.totalClicks || 0,
            totalSmartPicksRendered: summary.lifetimeTotalDecisionBlocksRendered || summary.lifetime?.totalDecisionBlocksRendered || 0,
            totalSmartPicksClicks: summary.lifetimeTotalRecommendationClicks || summary.lifetime?.totalRecommendationClicks || 0,
            menuSessions: lifetimeMenuSessions,
            engagedSessions: lifetimeEngagedSessions,
            intentSessions: lifetimeIntentSessions,
            actionSessions: lifetimeActionSessions,
            engagedSessionRate: lifetimeMenuSessions > 0 ? Math.round((lifetimeEngagedSessions / lifetimeMenuSessions) * 100) : 0,
            intentRate: lifetimeMenuSessions > 0 ? Math.round((lifetimeIntentSessions / lifetimeMenuSessions) * 100) : 0,
            actionRate: lifetimeMenuSessions > 0 ? Math.round((lifetimeActionSessions / lifetimeMenuSessions) * 100) : 0,
            totalSearches: summary.lifetimeTotalSearches || 0,
            totalZeroResultSearches: summary.lifetimeZeroResultSearches || 0,
            totalUnavailableItemTaps: summary.lifetimeTotalUnavailableItemTaps || 0,
            totalMenuActionClicks: summary.lifetimeTotalMenuActionClicks || 0,
        },
        topCategories: topCategoryEntries(summary),
        topAttributeFilters: topAttributeFilters(summary),
        menuActions: getMenuActions(summary),
        sourceQuality: sourceQualityEntries(summary),
        ownerConfidence: buildOwnerConfidence(summary),
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
            ownerActionPlan,
            ownerConfidence,
            sourceQuality,
            analyticsAiEntitlement,
        },
        daily: yesterday,
        weekly,
        monthly,
        wtd,
        mtd,
        historicalWeeks,
        overall,
        ownerActionPlan,
        ownerConfidence,
        sourceQuality,
        analyticsAiEntitlement,
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
    aiPayloads: OwnerDashboardAIPayloads = {},
    analyticsAiEntitlement: AnalyticsAiEntitlement = DEFAULT_ANALYTICS_AI_ENTITLEMENT,
): Promise<void> {
    if (projectId === 'customerApp') {
        await writeCustomerAppDashboardSummary(db, tId, sId, settlementDate, settledDailyData);
        return;
    }

    await writeMenuDashboardSummary(db, tId, sId, projectId, settlementDate, settledDailyData, aiPayloads, analyticsAiEntitlement);
}
