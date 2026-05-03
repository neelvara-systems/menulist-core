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

function readAnalyticsMap(data: Record<string, any>, field: string): Record<string, any> {
    const result: Record<string, any> = { ...(data?.[field] || {}) };
    const prefix = `${field}.`;
    for (const [key, value] of Object.entries(data || {})) {
        if (!key.startsWith(prefix)) continue;
        Object.defineProperty(result, key.slice(prefix.length), {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
        });
    }
    return result;
}

function readNestedHourlyClicksByItem(data: Record<string, any>): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = { ...(data?.hourlyClicksByItem || {}) };
    const prefix = 'hourlyClicksByItem.';
    for (const [key, value] of Object.entries(data || {})) {
        if (!key.startsWith(prefix) || typeof value !== 'number') continue;
        const rest = key.slice(prefix.length);
        const lastDotIndex = rest.lastIndexOf('.');
        if (lastDotIndex === -1) continue;
        const itemId = rest.slice(0, lastDotIndex);
        const hour = rest.slice(lastDotIndex + 1);
        result[itemId] = result[itemId] || {};
        result[itemId][hour] = (result[itemId][hour] || 0) + value;
    }
    return result;
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
        languageTrackingEnabled: false,
        viewsByItem: {},
        viewsByEntrySource: {},
        menuSessionsBySource: {},
        actionSessionsBySource: {},
        menuActionClicksBySource: {},
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
        languageNames: {},
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
        result.languageTrackingEnabled = Boolean(result.languageTrackingEnabled || doc.languageTrackingEnabled);
        mergeMapField(result.viewsByItem, readAnalyticsMap(doc, 'viewsByItem'));
        mergeMapField(result.viewsByEntrySource, readAnalyticsMap(doc, 'viewsByEntrySource'));
        mergeMapField(result.menuSessionsBySource, readAnalyticsMap(doc, 'menuSessionsBySource'));
        mergeMapField(result.actionSessionsBySource, readAnalyticsMap(doc, 'actionSessionsBySource'));
        mergeMapField(result.menuActionClicksBySource, readAnalyticsMap(doc, 'menuActionClicksBySource'));
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
        mergeMapField(result.clicksByItem, readAnalyticsMap(doc, 'clicksByItem'));
        mergeMapField(result.recommendationClicksByItem, readAnalyticsMap(doc, 'recommendationClicksByItem'));
        mergeNestedMapField(result.hourlyClicksByItem, readNestedHourlyClicksByItem(doc));
        mergeMapField(result.unavailableItemTapsByItem, readAnalyticsMap(doc, 'unavailableItemTapsByItem'));
        mergeMapField(result.searchTerms, readAnalyticsMap(doc, 'searchTerms'));
        mergeMapField(result.zeroResultSearchTerms, readAnalyticsMap(doc, 'zeroResultSearchTerms'));
        mergeMapField(result.menuActionClicks, readAnalyticsMap(doc, 'menuActionClicks'));
        mergeMapField(result.recommendationClicks, readAnalyticsMap(doc, 'recommendationClicks'));
        mergeMapField(result.decisionBlocksRendered, readAnalyticsMap(doc, 'decisionBlocksRendered'));
        mergeMapField(result.shortcutClicks, readAnalyticsMap(doc, 'shortcutClicks'));
        Object.assign(result.itemNames, readAnalyticsMap(doc, 'itemNames'));
        Object.assign(result.categoryNames, readAnalyticsMap(doc, 'categoryNames'));
        Object.assign(result.languageNames, readAnalyticsMap(doc, 'languageNames'));
        Object.assign(result.attributeFilterNames, readAnalyticsMap(doc, 'attributeFilterNames'));
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

function topLanguageEntries(data: Record<string, any> = {}) {
    if (!data.languageTrackingEnabled) return [];

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

function localizedValue(value: any, language: string, fallback = ''): string {
    if (typeof value === 'string') return value.trim() || fallback;
    if (!value || typeof value !== 'object') return fallback;
    return String(value[language] || value.en || Object.values(value).find(Boolean) || fallback).trim();
}

function parseCatalogPrice(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTextList(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return values
        .map((value) => String(value || '').trim())
        .filter(Boolean);
}

function isPopularItem(item: CatalogInsightItem): boolean {
    if (item.isBestSeller) return true;
    return item.tags.some((tag) => {
        const normalized = tag.toLowerCase();
        return normalized.includes('popular') || normalized.includes('best seller') || normalized.includes('bestseller');
    });
}

function normalizeCatalogForInsights(projectData?: CatalogInsightInput | null): CatalogInsightContext | null {
    if (!projectData?.files?.length) return null;

    const primaryLanguage = projectData.defaultLanguage
        || projectData.languages?.[0]
        || projectData.files
            .flatMap((file) => file?.extractedData?.data?.languages || [])
            .find((language: any) => language?.isPrimary)?.code
        || 'en';
    const categoriesById: Record<string, CatalogInsightCategory> = {};
    const itemsById: Record<string, CatalogInsightItem> = {};
    const itemsByCategoryId: Record<string, CatalogInsightItem[]> = {};

    for (const file of projectData.files) {
        if (!file || file.active === false || file.deleted === true) continue;
        const extractedData = file.extractedData?.data;
        const categories = Array.isArray(extractedData?.categories) ? extractedData.categories : [];
        const items = Array.isArray(extractedData?.items) ? extractedData.items : [];

        categories.forEach((category: any, index: number) => {
            if (!category?.id) return;
            categoriesById[category.id] = {
                id: String(category.id),
                name: localizedValue(category.name, primaryLanguage, String(category.id)),
                active: category.active !== false,
                orderIndex: Number.isFinite(Number(category.orderIndex)) ? Number(category.orderIndex) : index,
                timeSlots: Array.isArray(category.timeSlots) ? category.timeSlots : [],
            };
        });

        items.forEach((item: any, index: number) => {
            if (!item?.id) return;
            const categoryId = String(item.category || '');
            const activeAttributes = Array.isArray(item.attributes)
                ? item.attributes.filter((attribute: any) => attribute?.active !== false).length
                : 0;
            const description = localizedValue(item.description, primaryLanguage, '');
            const tags = normalizeTextList(item.tags);
            const dietaryTags = normalizeTextList(item.dietaryTags);
            const catalogItem: CatalogInsightItem = {
                id: String(item.id),
                name: localizedValue(item.name, primaryLanguage, String(item.id)),
                categoryId,
                active: item.active !== false,
                available: item.available !== false,
                price: parseCatalogPrice(item.price),
                activeAttributes,
                tags,
                dietaryTags,
                spiceLevel: item.spiceLevel,
                targetAudience: item.targetAudience,
                skillLevel: item.skillLevel,
                duration: typeof item.duration === 'number' ? item.duration : undefined,
                isBestSeller: Boolean(item.isBestSeller),
                ownerBoost: typeof item.ownerBoost === 'number' ? item.ownerBoost : 0,
                orderIndex: Number.isFinite(Number(item.orderIndex)) ? Number(item.orderIndex) : index,
                hasImage: Array.isArray(item.images) && item.images.length > 0,
                hasDescription: description.length > 0,
                hasQualityReview: Boolean(item.qualityReview?.priceOutlierReviewedAt || item.qualityReview?.priceOutlierReviewedPrice),
            };

            itemsById[catalogItem.id] = catalogItem;
            if (!itemsByCategoryId[categoryId]) itemsByCategoryId[categoryId] = [];
            itemsByCategoryId[categoryId].push(catalogItem);
        });
    }

    return Object.keys(itemsById).length > 0
        ? { itemsById, categoriesById, itemsByCategoryId }
        : null;
}

function itemSignal(data: Record<string, any>, itemId: string) {
    const views = data.viewsByItem?.[itemId] || 0;
    const taps = data.clicksByItem?.[itemId] || 0;
    const recommendationTaps = data.recommendationClicksByItem?.[itemId] || 0;
    const unavailableTaps = data.unavailableItemTapsByItem?.[itemId] || 0;
    const score = views + (taps * 2) + (recommendationTaps * 2) + (unavailableTaps * 3);
    return { views, taps, recommendationTaps, unavailableTaps, score };
}

function categorySignal(data: Record<string, any>, categoryId: string) {
    const views = data.viewsByCategory?.[categoryId] || 0;
    const taps = data.clicksByCategory?.[categoryId] || 0;
    return { views, taps, score: views + (taps * 2) };
}

function slotHours(timeSlots: Array<Record<string, any>>): Set<string> {
    const hours = new Set<string>();
    timeSlots.forEach((slot) => {
        const start = Number(String(slot.startTime || '').split(':')[0]);
        const end = Number(String(slot.endTime || '').split(':')[0]);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return;
        const span = start === end ? 24 : ((end - start + 24) % 24);
        for (let offset = 0; offset < span; offset++) {
            hours.add(String((start + offset) % 24));
        }
    });
    return hours;
}

function activeMetadataBuckets(item: CatalogInsightItem): string[] {
    const buckets = new Set<string>();
    [...item.dietaryTags, ...item.tags].forEach((tag) => {
        const normalized = tag.toLowerCase();
        if (normalized.includes('veg')) buckets.add('veg');
        if (normalized.includes('vegan')) buckets.add('vegan');
        if (normalized.includes('halal')) buckets.add('halal');
        if (normalized.includes('gluten')) buckets.add('gluten-free');
    });
    if (item.spiceLevel && item.spiceLevel !== 'none') buckets.add(`${item.spiceLevel} spice`);
    if (item.targetAudience) buckets.add(item.targetAudience.replace(/-/g, ' '));
    if (item.skillLevel) buckets.add(item.skillLevel.replace(/-/g, ' '));
    if (typeof item.duration === 'number' && item.duration > 0 && item.duration <= 30) buckets.add('quick choices');
    return Array.from(buckets);
}

function buildCatalogActionCandidates(
    data: Record<string, any>,
    catalog?: CatalogInsightContext | null,
): OwnerActionCandidate[] {
    if (!catalog) return [];

    const candidates: OwnerActionCandidate[] = [];
    const items = Object.values(catalog.itemsById);
    const categories = Object.values(catalog.categoriesById);
    const sortedCategories = categories
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
    const categoryRank = new Map(sortedCategories.map((category, index) => [category.id, index]));

    const unavailableItem = items
        .map((item) => ({ item, signal: itemSignal(data, item.id) }))
        .filter(({ item, signal }) => !item.available && signal.unavailableTaps > 0)
        .sort((a, b) => b.signal.unavailableTaps - a.signal.unavailableTaps)[0];
    if (unavailableItem) {
        candidates.push({
            id: `catalog-unavailable-${unavailableItem.item.id}`,
            type: 'unavailable_demand',
            title: 'Restock this requested item',
            description: `${unavailableItem.item.name} is unavailable but customers still tapped it.`,
            reason: `${unavailableItem.signal.unavailableTaps} unavailable taps`,
            actionLabel: 'Restock or update availability',
            metricLabel: `${unavailableItem.signal.unavailableTaps} taps`,
            priority: 'high',
        });
    }

    const highDemandUnmarked = items
        .map((item) => ({ item, signal: itemSignal(data, item.id) }))
        .filter(({ item, signal }) => item.active && item.available && !isPopularItem(item) && signal.score >= 6)
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    if (highDemandUnmarked) {
        candidates.push({
            id: `catalog-bestseller-add-${highDemandUnmarked.item.id}`,
            type: 'bestseller_validation',
            title: 'Mark this item as popular',
            description: `${highDemandUnmarked.item.name} is getting customer interest but is not marked as popular.`,
            reason: `${highDemandUnmarked.signal.score} interest signals`,
            actionLabel: 'Review popular label',
            metricLabel: `${highDemandUnmarked.signal.score} signals`,
            priority: 'medium',
        });
    } else {
        const overMarkedPopular = items
            .map((item) => ({ item, signal: itemSignal(data, item.id) }))
            .filter(({ item, signal }) => item.active && isPopularItem(item) && signal.score === 0 && (data.totalViews || 0) >= 20)
            .sort((a, b) => a.item.orderIndex - b.item.orderIndex)[0];
        if (overMarkedPopular) {
            candidates.push({
                id: `catalog-bestseller-review-${overMarkedPopular.item.id}`,
                type: 'bestseller_validation',
                title: 'Review one popular label',
                description: `${overMarkedPopular.item.name} is marked popular but has no recent customer interest.`,
                reason: `${data.totalViews || 0} menu views this period`,
                actionLabel: 'Check popular items',
                metricLabel: '0 signals',
                priority: 'low',
            });
        }
    }

    const topCategory = categories
        .map((category) => ({ category, signal: categorySignal(data, category.id), rank: categoryRank.get(category.id) || 0 }))
        .filter(({ category, signal, rank }) => category.active && rank >= 2 && signal.score >= 5)
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    if (topCategory) {
        candidates.push({
            id: `catalog-category-order-${topCategory.category.id}`,
            type: 'category_reorder',
            title: 'Move this category higher',
            description: `${topCategory.category.name} is lower in the menu but gets strong customer interest.`,
            reason: `${topCategory.signal.views} views and ${topCategory.signal.taps} taps`,
            actionLabel: 'Review category order',
            metricLabel: `${topCategory.signal.score} signals`,
            priority: 'medium',
        });
    }

    const hiddenItem = items
        .map((item) => ({ item, signal: itemSignal(data, item.id) }))
        .filter(({ item, signal }) => !item.active && signal.score >= 3)
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    const hiddenCategory = categories
        .map((category) => ({ category, signal: categorySignal(data, category.id) }))
        .filter(({ category, signal }) => !category.active && signal.score >= 5)
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    if (hiddenItem || hiddenCategory) {
        candidates.push(hiddenItem ? {
            id: `catalog-hidden-item-${hiddenItem.item.id}`,
            type: 'hidden_demand',
            title: 'Review this hidden item',
            description: `${hiddenItem.item.name} is hidden but still has recent customer interest.`,
            reason: `${hiddenItem.signal.score} interest signals`,
            actionLabel: 'Review visibility',
            metricLabel: `${hiddenItem.signal.score} signals`,
            priority: 'high',
        } : {
            id: `catalog-hidden-category-${hiddenCategory!.category.id}`,
            type: 'hidden_demand',
            title: 'Review this hidden category',
            description: `${hiddenCategory!.category.name} is hidden but still has recent customer interest.`,
            reason: `${hiddenCategory!.signal.score} category signals`,
            actionLabel: 'Review visibility',
            metricLabel: `${hiddenCategory!.signal.score} signals`,
            priority: 'high',
        });
    }

    const variantItem = items
        .map((item) => ({ item, signal: itemSignal(data, item.id) }))
        .filter(({ item, signal }) => item.active && item.activeAttributes >= 2 && signal.score >= 5)
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    if (variantItem) {
        candidates.push({
            id: `catalog-variant-${variantItem.item.id}`,
            type: 'variant_clarity',
            title: 'Make options clearer',
            description: `${variantItem.item.name} has multiple options and strong customer interest.`,
            reason: `${variantItem.item.activeAttributes} options, ${variantItem.signal.score} signals`,
            actionLabel: 'Check option names and prices',
            metricLabel: `${variantItem.item.activeAttributes} options`,
            priority: 'medium',
        });
    }

    const missingContentItem = items
        .map((item) => ({ item, signal: itemSignal(data, item.id) }))
        .filter(({ item, signal }) => item.active && signal.score >= 6 && (!item.hasImage || !item.hasDescription))
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    if (missingContentItem) {
        candidates.push({
            id: `catalog-metadata-content-${missingContentItem.item.id}`,
            type: 'metadata_demand',
            title: 'Add detail to a high-interest item',
            description: `${missingContentItem.item.name} has demand but is missing ${!missingContentItem.item.hasImage ? 'a photo' : 'a description'}.`,
            reason: `${missingContentItem.signal.score} interest signals`,
            actionLabel: !missingContentItem.item.hasImage ? 'Add photo' : 'Add description',
            metricLabel: `${missingContentItem.signal.score} signals`,
            priority: 'medium',
        });
    } else {
        const metadataBuckets: Record<string, { score: number; count: number }> = {};
        items.forEach((item) => {
            const signal = itemSignal(data, item.id).score;
            if (signal <= 0) return;
            activeMetadataBuckets(item).forEach((bucket) => {
                if (!metadataBuckets[bucket]) metadataBuckets[bucket] = { score: 0, count: 0 };
                metadataBuckets[bucket].score += signal;
                metadataBuckets[bucket].count += 1;
            });
        });
        const topBucket = Object.entries(metadataBuckets)
            .filter(([, value]) => value.score >= 6 && value.count >= 2)
            .sort((a, b) => b[1].score - a[1].score)[0];
        if (topBucket) {
            candidates.push({
                id: `catalog-metadata-${topBucket[0].replace(/[^a-z0-9]+/gi, '-')}`,
                type: 'metadata_demand',
                title: 'Use this customer preference',
                description: `${topBucket[0]} items are getting repeated customer interest.`,
                reason: `${topBucket[1].score} signals across ${topBucket[1].count} items`,
                actionLabel: 'Feature matching items',
                metricLabel: `${topBucket[1].score} signals`,
                priority: 'medium',
            });
        }
    }

    const timedCategory = categories
        .filter((category) => category.active && category.timeSlots.length > 0)
        .map((category) => {
            const hours = slotHours(category.timeSlots);
            const itemsForCategory = catalog.itemsByCategoryId[category.id] || [];
            let totalClicks = 0;
            let slotClicks = 0;
            itemsForCategory.forEach((item) => {
                const hourly = data.hourlyClicksByItem?.[item.id] || {};
                Object.entries(hourly).forEach(([hour, count]) => {
                    const value = typeof count === 'number' ? count : 0;
                    totalClicks += value;
                    if (hours.has(hour)) slotClicks += value;
                });
            });
            const signal = categorySignal(data, category.id);
            return { category, signal, totalClicks, slotClicks };
        })
        .filter(({ signal, totalClicks }) => signal.score >= 5 || totalClicks >= 3)
        .sort((a, b) => (b.totalClicks || b.signal.score) - (a.totalClicks || a.signal.score))[0];
    if (timedCategory) {
        const outsideSlotClicks = timedCategory.totalClicks - timedCategory.slotClicks;
        candidates.push({
            id: `catalog-timed-category-${timedCategory.category.id}`,
            type: 'timed_category',
            title: outsideSlotClicks > timedCategory.slotClicks ? 'Check this timed category' : 'Use this timed category window',
            description: `${timedCategory.category.name} has customer interest during its scheduled menu window.`,
            reason: timedCategory.totalClicks > 0
                ? `${timedCategory.slotClicks}/${timedCategory.totalClicks} item taps during visible hours`
                : `${timedCategory.signal.score} category signals`,
            actionLabel: 'Review category timing',
            metricLabel: timedCategory.totalClicks > 0 ? `${timedCategory.slotClicks}/${timedCategory.totalClicks} taps` : `${timedCategory.signal.score} signals`,
            priority: outsideSlotClicks > timedCategory.slotClicks ? 'medium' : 'low',
        });
    }

    const priceItem = items
        .map((item) => ({ item, signal: itemSignal(data, item.id) }))
        .filter(({ item, signal }) => item.active && item.hasQualityReview && (signal.views >= 5 || signal.taps + signal.recommendationTaps >= 3))
        .sort((a, b) => b.signal.score - a.signal.score)[0];
    if (priceItem) {
        const actionInterest = priceItem.signal.taps + priceItem.signal.recommendationTaps;
        candidates.push({
            id: `catalog-price-${priceItem.item.id}`,
            type: 'price_signal',
            title: actionInterest > 0 ? 'Price looks acceptable' : 'Check price clarity',
            description: actionInterest > 0
                ? `${priceItem.item.name} is still getting taps after price review.`
                : `${priceItem.item.name} gets views but no item taps after price review.`,
            reason: `${priceItem.signal.views} views, ${actionInterest} taps`,
            actionLabel: actionInterest > 0 ? 'No price action needed' : 'Review price display',
            metricLabel: `${priceItem.signal.views} views`,
            priority: actionInterest > 0 ? 'low' : 'medium',
        });
    }

    return candidates;
}

export function buildCatalogActionCandidatesForTest(
    data: Record<string, any>,
    projectCatalogData?: CatalogInsightInput | null,
): OwnerActionCandidate[] {
    return buildCatalogActionCandidates(data, normalizeCatalogForInsights(projectCatalogData));
}

function buildOwnerActionCandidates(data: Record<string, any> = {}, catalog?: CatalogInsightContext | null): OwnerActionCandidate[] {
    const metrics = getDashboardMetrics(data);
    const catalogCandidates = buildCatalogActionCandidates(data, catalog);
    const candidates: OwnerActionCandidate[] = [...catalogCandidates];
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

    const hasCatalogUnavailableCandidate = catalogCandidates.some((candidate) => candidate.type === 'unavailable_demand');
    if (topUnavailable && !hasCatalogUnavailableCandidate) {
        candidates.push({
            id: 'unavailable-demand',
            type: 'unavailable_demand',
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
            candidate.type,
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
    const viewsByItem = readAnalyticsMap(data, 'viewsByItem');
    const clicksByItem = readAnalyticsMap(data, 'clicksByItem');
    const recommendationClicksByItem = readAnalyticsMap(data, 'recommendationClicksByItem');
    const unavailableItemTapsByItem = readAnalyticsMap(data, 'unavailableItemTapsByItem');
    const hourlyClicksByItem = readNestedHourlyClicksByItem(data);
    const itemNameMap = readAnalyticsMap(data, 'itemNames');
    const itemNames: Record<string, string> = {};
    const keepItemIds = new Set<string>([
        ...Object.keys(topMap(viewsByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(topMap(clicksByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(topMap(recommendationClicksByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(topMap(unavailableItemTapsByItem, DASHBOARD_ITEM_LIMIT)),
        ...Object.keys(hourlyClicksByItem),
    ]);
    keepItemIds.forEach((itemId) => {
        if (itemNameMap[itemId]) {
            itemNames[itemId] = itemNameMap[itemId];
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
        languageTrackingEnabled: Boolean(data.languageTrackingEnabled),
        viewsByDevice: readAnalyticsMap(data, 'viewsByDevice'),
        clicksByDevice: readAnalyticsMap(data, 'clicksByDevice'),
        viewsByLocation: readAnalyticsMap(data, 'viewsByLocation'),
        clicksByLocation: readAnalyticsMap(data, 'clicksByLocation'),
        viewsByEntrySource: topMap(readAnalyticsMap(data, 'viewsByEntrySource'), DASHBOARD_ITEM_LIMIT),
        menuSessionsBySource: topMap(readAnalyticsMap(data, 'menuSessionsBySource'), DASHBOARD_ITEM_LIMIT),
        actionSessionsBySource: topMap(readAnalyticsMap(data, 'actionSessionsBySource'), DASHBOARD_ITEM_LIMIT),
        menuActionClicksBySource: topMap(readAnalyticsMap(data, 'menuActionClicksBySource'), DASHBOARD_ITEM_LIMIT),
        menuViewsByLanguage: topMap(readAnalyticsMap(data, 'menuViewsByLanguage'), DASHBOARD_ITEM_LIMIT),
        menuSessionsByLanguage: topMap(readAnalyticsMap(data, 'menuSessionsByLanguage'), DASHBOARD_ITEM_LIMIT),
        languageAdoptions: topMap(readAnalyticsMap(data, 'languageAdoptions'), DASHBOARD_ITEM_LIMIT),
        attributeFilterInteractions: topMap(readAnalyticsMap(data, 'attributeFilterInteractions'), DASHBOARD_ITEM_LIMIT),
        attributeFilterItemViews: topMap(readAnalyticsMap(data, 'attributeFilterItemViews'), DASHBOARD_ITEM_LIMIT),
        attributeFilterItemTaps: topMap(readAnalyticsMap(data, 'attributeFilterItemTaps'), DASHBOARD_ITEM_LIMIT),
        attributeFilterSearches: topMap(readAnalyticsMap(data, 'attributeFilterSearches'), DASHBOARD_ITEM_LIMIT),
        attributeFilterUnavailableTaps: topMap(readAnalyticsMap(data, 'attributeFilterUnavailableTaps'), DASHBOARD_ITEM_LIMIT),
        attributeFilterActionClicks: topMap(readAnalyticsMap(data, 'attributeFilterActionClicks'), DASHBOARD_ITEM_LIMIT),
        viewsByItem: pickMap(viewsByItem, keepItemIds),
        viewsByCategory: topMap(readAnalyticsMap(data, 'viewsByCategory'), DASHBOARD_ITEM_LIMIT),
        clicksByCategory: topMap(readAnalyticsMap(data, 'clicksByCategory'), DASHBOARD_ITEM_LIMIT),
        hourlyViews: topMap(readAnalyticsMap(data, 'hourlyViews'), 24),
        hourlyMenuActionClicks: topMap(readAnalyticsMap(data, 'hourlyMenuActionClicks'), 24),
        clicksByItem: pickMap(clicksByItem, keepItemIds),
        recommendationClicksByItem: pickMap(recommendationClicksByItem, keepItemIds),
        hourlyClicksByItem: pickNestedHourlyMap(hourlyClicksByItem, keepItemIds),
        searchTerms: topMap(readAnalyticsMap(data, 'searchTerms'), DASHBOARD_ITEM_LIMIT),
        zeroResultSearchTerms: topMap(readAnalyticsMap(data, 'zeroResultSearchTerms'), DASHBOARD_ITEM_LIMIT),
        unavailableItemTapsByItem: pickMap(unavailableItemTapsByItem, keepItemIds),
        menuActionClicks: readAnalyticsMap(data, 'menuActionClicks'),
        recommendationClicks: readAnalyticsMap(data, 'recommendationClicks'),
        decisionBlocksRendered: readAnalyticsMap(data, 'decisionBlocksRendered'),
        itemNames,
        categoryNames: readAnalyticsMap(data, 'categoryNames'),
        languageNames: readAnalyticsMap(data, 'languageNames'),
        attributeFilterNames: readAnalyticsMap(data, 'attributeFilterNames'),
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
                shortcutClicks: readAnalyticsMap(settledDailyData, 'shortcutClicks'),
                installsByDevice: readAnalyticsMap(settledDailyData, 'installsByDevice'),
                installsByLocation: readAnalyticsMap(settledDailyData, 'installsByLocation'),
                installsByPlatform: readAnalyticsMap(settledDailyData, 'installsByPlatform'),
                installsBySource: readAnalyticsMap(settledDailyData, 'installsBySource'),
                appOpensByPlatform: readAnalyticsMap(settledDailyData, 'appOpensByPlatform'),
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
        topLanguages: topLanguageEntries(data),
        topAttributeFilters: topAttributeFilters(data),
        menuActions: getMenuActions(data),
        topSearchTerms: topSearchTerms(data.searchTerms),
        topZeroResultSearchTerms: topSearchTerms(data.zeroResultSearchTerms),
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
        topLanguages: topLanguageEntries(aggregated),
        topAttributeFilters: topAttributeFilters(aggregated),
        menuActions: getMenuActions(aggregated),
        topSearchTerms: topSearchTerms(aggregated.searchTerms),
        topZeroResultSearchTerms: topSearchTerms(aggregated.zeroResultSearchTerms),
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
            shortcutClicks: readAnalyticsMap(data, 'shortcutClicks'),
            installsByDevice: readAnalyticsMap(data, 'installsByDevice'),
            installsByLocation: readAnalyticsMap(data, 'installsByLocation'),
            installsByPlatform: readAnalyticsMap(data, 'installsByPlatform'),
            installsBySource: readAnalyticsMap(data, 'installsBySource'),
            appOpensByPlatform: readAnalyticsMap(data, 'appOpensByPlatform'),
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
    projectCatalogData?: CatalogInsightInput | null,
): Promise<void> {
    const canUseAnalyticsAi = analyticsAiEntitlement.enabled;
    const catalogInsights = canUseAnalyticsAi ? normalizeCatalogForInsights(projectCatalogData) : null;
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
    const actionPlanCandidates = buildOwnerActionCandidates(actionPlanInput, catalogInsights);
    const catalogInsightCount = actionPlanCandidates.filter((candidate) => [
        'unavailable_demand',
        'bestseller_validation',
        'category_reorder',
        'hidden_demand',
        'variant_clarity',
        'metadata_demand',
        'timed_category',
        'price_signal',
    ].includes(candidate.type)).length;
    if (canUseAnalyticsAi) {
        appLogger.info('[AnalyticsSettlement] Catalog menu intelligence evaluated', {
            tId,
            sId,
            projectId,
            settlementDate,
            catalogInsightCount,
            actionCandidateCount: actionPlanCandidates.length,
            hasCatalogInput: Boolean(projectCatalogData),
        });
    }
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
        topLanguages: topLanguageEntries(summary),
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
        ...(canUseAnalyticsAi ? {
            catalogInsightCount,
            catalogInsightGeneratedAt: FieldValue.serverTimestamp(),
        } : {}),
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
    projectCatalogData?: CatalogInsightInput | null,
): Promise<void> {
    if (projectId === 'customerApp') {
        await writeCustomerAppDashboardSummary(db, tId, sId, settlementDate, settledDailyData);
        return;
    }

    await writeMenuDashboardSummary(db, tId, sId, projectId, settlementDate, settledDailyData, aiPayloads, analyticsAiEntitlement, projectCatalogData);
}
