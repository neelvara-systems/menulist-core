/**
 * SHARED ITEM EXTRACTOR
 * ═══════════════════════════════════════════════════════════════
 * 
 * Extracted from decisionBlocksScoring.ts for reuse by:
 * - Decision Blocks scoring
 * - Continuous Menu Intelligence
 * 
 * Extracts active items from project files.
 */

import type { AggregatedAnalytics } from './analyticsAggregator';

export interface ExtractedItem {
    itemId: string;
    itemName: string;
    category: string;
    views: number;
    clicks: number;
    orders: number;
    price: number;
    duration?: number;
    ownerBoost?: number;
    isBestSeller?: boolean;
    decisionBlockClicks: number;
    hourlyClicks?: Record<string, number>;
}

const UNSAFE_ITEM_MAP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_ITEM_ID_LENGTH = 512;
const MAX_INTELLIGENCE_ITEMS = 2000;
const MAX_EXTRACTION_ALIASES = 2000;

export function isSafeIntelligenceItemId(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= MAX_ITEM_ID_LENGTH
        && value === value.trim()
        && !UNSAFE_ITEM_MAP_KEYS.has(value)
        && !/[\u0000-\u001F\u007F]/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
    const allowedKeys = new Set(allowed);
    return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonNegativeSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseHourlyClicks(value: unknown): Record<string, number> | undefined | null {
    if (value === undefined) return undefined;
    if (!isRecord(value) || Object.keys(value).length > 24) return null;
    const output: Record<string, number> = {};
    for (const [hour, count] of Object.entries(value)) {
        if (!/^(?:\d|1\d|2[0-3])$/.test(hour)
            || !Number.isSafeInteger(count)
            || Number(count) <= 0) return null;
        output[hour] = Number(count);
    }
    return output;
}

export function parseExtractedItems(value: unknown): ExtractedItem[] | null {
    if (!Array.isArray(value) || value.length > MAX_INTELLIGENCE_ITEMS) return null;
    const output: ExtractedItem[] = [];
    const itemIds = new Set<string>();
    for (const raw of value) {
        if (!isRecord(raw)
            || !hasOnlyKeys(raw, [
                'itemId', 'itemName', 'category', 'views', 'clicks', 'orders',
                'price', 'duration', 'ownerBoost', 'isBestSeller',
                'decisionBlockClicks', 'hourlyClicks',
            ])
            || !isSafeIntelligenceItemId(raw.itemId)
            || itemIds.has(raw.itemId)
            || typeof raw.itemName !== 'string'
            || raw.itemName.length === 0
            || raw.itemName.length > 500
            || raw.itemName !== raw.itemName.trim()
            || typeof raw.category !== 'string'
            || (raw.category !== '' && !isSafeIntelligenceItemId(raw.category))
            || !isNonNegativeSafeInteger(raw.views)
            || !isNonNegativeSafeInteger(raw.clicks)
            || !isNonNegativeSafeInteger(raw.orders)
            || typeof raw.price !== 'number'
            || !Number.isFinite(raw.price)
            || raw.price < 0
            || (raw.duration !== undefined && (typeof raw.duration !== 'number'
                || !Number.isFinite(raw.duration)
                || raw.duration < 0))
            || (raw.ownerBoost !== undefined && (typeof raw.ownerBoost !== 'number'
                || !Number.isFinite(raw.ownerBoost)
                || raw.ownerBoost < -20
                || raw.ownerBoost > 20))
            || (raw.isBestSeller !== undefined && typeof raw.isBestSeller !== 'boolean')
            || !isNonNegativeSafeInteger(raw.decisionBlockClicks)) return null;
        const hourlyClicks = parseHourlyClicks(raw.hourlyClicks);
        if (hourlyClicks === null) return null;
        itemIds.add(raw.itemId);
        output.push({
            itemId: raw.itemId,
            itemName: raw.itemName,
            category: raw.category,
            views: raw.views,
            clicks: raw.clicks,
            orders: raw.orders,
            price: raw.price,
            duration: raw.duration as number | undefined,
            ownerBoost: raw.ownerBoost as number | undefined,
            isBestSeller: raw.isBestSeller === true,
            decisionBlockClicks: raw.decisionBlockClicks,
            hourlyClicks,
        });
    }
    return output;
}

function normalizeItemId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return isSafeIntelligenceItemId(normalized) ? normalized : null;
}

function normalizeCount(value: unknown): number {
    return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : 0;
}

function getItemAnalyticsIds(item: FirebaseFirestore.DocumentData): string[] {
    const currentId = normalizeItemId(item?.id);
    if (!currentId) return [];

    const ids = new Set<string>([currentId]);
    if (Array.isArray(item?.extractionIdAliases)) {
        if (item.extractionIdAliases.length > MAX_EXTRACTION_ALIASES) {
            throw new Error('decision_intelligence_invalid_catalog');
        }
        item.extractionIdAliases.forEach((value: unknown) => {
            const alias = normalizeItemId(value);
            if (alias) ids.add(alias);
        });
    }
    return Array.from(ids);
}

function sumAnalyticsValues(values: Record<string, number>, itemIds: string[]): number {
    return itemIds.reduce((sum, itemId) => {
        const next = sum + normalizeCount(values[itemId]);
        if (!Number.isSafeInteger(next)) throw new Error('decision_intelligence_analytics_counter_overflow');
        return next;
    }, 0);
}

function mergeHourlyClicks(
    hourlyClicksByItem: Record<string, Record<string, number>>,
    itemIds: string[],
): Record<string, number> | undefined {
    const merged: Record<string, number> = {};
    itemIds.forEach((itemId) => {
        const hourly = hourlyClicksByItem[itemId];
        if (!hourly || typeof hourly !== 'object' || Array.isArray(hourly)) return;
        Object.entries(hourly).forEach(([hour, count]) => {
            if (!/^(?:[01]?\d|2[0-3])$/.test(hour)) return;
            const normalized = normalizeCount(count);
            const normalizedHour = String(Number(hour));
            if (normalized > 0) {
                const next = (merged[normalizedHour] || 0) + normalized;
                if (!Number.isSafeInteger(next)) throw new Error('decision_intelligence_analytics_counter_overflow');
                merged[normalizedHour] = next;
            }
        });
    });
    return Object.keys(merged).length > 0 ? merged : undefined;
}

function getItemName(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    const localizedName = Object.values(value as Record<string, unknown>)
        .find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    return localizedName?.trim().slice(0, 500) || fallback;
}

function getItemPrice(value: unknown): number {
    const normalized = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value || '').replace(/,/g, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function getItemDuration(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getOwnerBoost(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.max(-20, Math.min(20, value));
}

/**
 * Extract active items from project files and merge with analytics data
 * 
 * IMPORTANT: Only checks permanent state (active), NOT temporary state (available)
 * Availability is volatile - item available at 2 AM may be sold out at lunch
 * Runtime gate owns availability filtering, not the scheduler
 * 
 * @param projectData Project document data containing files
 * @param analytics Aggregated 7-day analytics
 * @returns Array of extracted items with merged analytics
 */
export function extractActiveItems(
    projectData: FirebaseFirestore.DocumentData,
    analytics: AggregatedAnalytics
): ExtractedItem[] {
    const itemStatsMap = new Map<string, ExtractedItem>();

    // The current project catalog is authoritative. Analytics can enrich a
    // current active item, including through retained extraction aliases, but
    // an old/deleted item ID can never create a scoreable item by itself.
    const files = projectData.files || [];
    if (!Array.isArray(files)) throw new Error('decision_intelligence_invalid_catalog');
    for (const file of files) {
        if (!isRecord(file)) throw new Error('decision_intelligence_invalid_catalog');
        const extractedData = isRecord(file.extractedData) ? file.extractedData : undefined;
        const data = extractedData && isRecord(extractedData.data) ? extractedData.data : undefined;
        const items = data?.items || [];
        if (!Array.isArray(items)) throw new Error('decision_intelligence_invalid_catalog');
        for (const item of items) {
            if (!isRecord(item)) throw new Error('decision_intelligence_invalid_catalog');
            // Only skip permanently disabled items (active=false)
            // DO NOT check 'available' - that's temporary state for runtime
            if (item.active === false) continue;

            const analyticsIds = getItemAnalyticsIds(item);
            const itemId = analyticsIds[0];
            if (!itemId) continue;
            if (itemStatsMap.has(itemId)) throw new Error('decision_intelligence_duplicate_catalog_item');
            if (itemStatsMap.size >= MAX_INTELLIGENCE_ITEMS) throw new Error('decision_intelligence_invalid_catalog');

            const hasAnalytics = analyticsIds.some((analyticsId) => (
                Object.prototype.hasOwnProperty.call(analytics.viewsByItem, analyticsId)
                || Object.prototype.hasOwnProperty.call(analytics.clicksByItem, analyticsId)
                || Object.prototype.hasOwnProperty.call(analytics.recommendationClicksByItem, analyticsId)
                || Object.prototype.hasOwnProperty.call(analytics.hourlyClicksByItem, analyticsId)
            ));

            itemStatsMap.set(itemId, {
                itemId,
                itemName: getItemName(item.name, itemId),
                category: normalizeItemId(item.category) || '',
                views: hasAnalytics ? sumAnalyticsValues(analytics.viewsByItem, analyticsIds) : 1,
                clicks: sumAnalyticsValues(analytics.clicksByItem, analyticsIds),
                orders: 0,
                price: getItemPrice(item.price),
                duration: getItemDuration(item.duration),
                ownerBoost: getOwnerBoost(item.ownerBoost),
                isBestSeller: item.isBestSeller === true,
                decisionBlockClicks: sumAnalyticsValues(analytics.recommendationClicksByItem, analyticsIds),
                hourlyClicks: mergeHourlyClicks(analytics.hourlyClicksByItem, analyticsIds),
            });
        }
    }

    const projected = parseExtractedItems(Array.from(itemStatsMap.values()));
    if (!projected) throw new Error('decision_intelligence_invalid_catalog');
    return projected;
}
