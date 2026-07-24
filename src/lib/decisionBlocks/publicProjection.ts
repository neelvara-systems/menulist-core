export interface PublicDecisionBlockEntry {
    itemId: string;
    reason: string;
    reasonParams?: { minutes: number };
}

export interface PublicDecisionBlocksProjection {
    tId: string;
    sId: string;
    projectId: string;
    popular: PublicDecisionBlockEntry[];
    quickPick: PublicDecisionBlockEntry[];
    bestValue: PublicDecisionBlockEntry[];
    computedAt: string;
    validUntil: string;
    statsUsed: {
        totalItems: number;
        itemsWithViews: number;
        itemsWithDuration: number;
        totalViews?: number;
        totalClicks?: number;
        itemsWithClicks?: number;
        itemsWithPrice?: number;
        durationCoverage?: number;
        priceCoverage?: number;
        daysWithData?: number;
    };
}

const MAX_PROJECTED_ITEMS = 2000;
const MAX_CANDIDATES_PER_BLOCK = 3;
const MAX_REASON_LENGTH = 160;
const MAX_TIMESTAMP_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_PROJECTION_LIFETIME_MS = 72 * 60 * 60 * 1000;

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

function isFiniteRatio(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isSafeItemId(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 512
        && value === value.trim()
        && !['__proto__', 'constructor', 'prototype'].includes(value)
        && !/[\u0000-\u001F\u007F]/.test(value);
}

function getTimestampMillis(value: unknown): number | null {
    try {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
        if (typeof value === 'string' || typeof value === 'number') {
            const millis = new Date(value).getTime();
            return Number.isFinite(millis) ? millis : null;
        }
        if (!isRecord(value)) return null;
        if (typeof value.toMillis === 'function') {
            const millis = value.toMillis();
            return typeof millis === 'number' && Number.isFinite(millis) ? millis : null;
        }
        if (typeof value.toDate === 'function') {
            const date = value.toDate();
            return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
        }
        const seconds = value.seconds ?? value._seconds;
        return typeof seconds === 'number' && Number.isFinite(seconds) ? seconds * 1000 : null;
    } catch {
        return null;
    }
}

function parseCandidateList(value: unknown): PublicDecisionBlockEntry[] | null {
    if (!Array.isArray(value) || value.length > MAX_CANDIDATES_PER_BLOCK) return null;
    const output: PublicDecisionBlockEntry[] = [];
    const itemIds = new Set<string>();
    for (const raw of value) {
        if (!isRecord(raw)
            || !hasOnlyKeys(raw, ['itemId', 'itemName', 'category', 'score', 'reason', 'reasonParams', 'price', 'duration'])
            || !isSafeItemId(raw.itemId)
            || itemIds.has(raw.itemId)
            || typeof raw.reason !== 'string'
            || raw.reason.length === 0
            || raw.reason.length > MAX_REASON_LENGTH
            || raw.reason !== raw.reason.trim()
            || typeof raw.score !== 'number'
            || !Number.isFinite(raw.score)
            || (raw.itemName !== undefined && (typeof raw.itemName !== 'string' || raw.itemName.length > 500))
            || (raw.category !== undefined && (typeof raw.category !== 'string' || raw.category.length > 512))
            || (raw.price !== undefined && (typeof raw.price !== 'number' || !Number.isFinite(raw.price) || raw.price < 0))
            || (raw.duration !== undefined && (typeof raw.duration !== 'number' || !Number.isFinite(raw.duration) || raw.duration < 0))) return null;
        let reasonParams: PublicDecisionBlockEntry['reasonParams'];
        if (raw.reasonParams !== undefined) {
            if (!isRecord(raw.reasonParams)
                || Object.keys(raw.reasonParams).join('|') !== 'minutes'
                || typeof raw.reasonParams.minutes !== 'number'
                || !Number.isFinite(raw.reasonParams.minutes)
                || raw.reasonParams.minutes < 0) return null;
            reasonParams = { minutes: raw.reasonParams.minutes };
        }
        itemIds.add(raw.itemId);
        output.push({
            itemId: raw.itemId,
            reason: raw.reason,
            ...(reasonParams ? { reasonParams } : {}),
        });
    }
    return output;
}

function parseStats(value: unknown): PublicDecisionBlocksProjection['statsUsed'] | null {
    if (!isRecord(value)
        || !hasOnlyKeys(value, [
            'totalItems', 'itemsWithViews', 'itemsWithDuration', 'totalViews',
            'totalClicks', 'itemsWithClicks', 'itemsWithPrice',
            'durationCoverage', 'priceCoverage', 'daysWithData',
        ])
        || !isNonNegativeSafeInteger(value.totalItems)
        || value.totalItems > MAX_PROJECTED_ITEMS
        || !isNonNegativeSafeInteger(value.itemsWithViews)
        || !isNonNegativeSafeInteger(value.itemsWithDuration)
        || value.itemsWithViews > value.totalItems
        || value.itemsWithDuration > value.totalItems
        || (value.totalViews !== undefined && !isNonNegativeSafeInteger(value.totalViews))
        || (value.totalClicks !== undefined && !isNonNegativeSafeInteger(value.totalClicks))
        || (value.itemsWithClicks !== undefined && (!isNonNegativeSafeInteger(value.itemsWithClicks) || value.itemsWithClicks > value.totalItems))
        || (value.itemsWithPrice !== undefined && (!isNonNegativeSafeInteger(value.itemsWithPrice) || value.itemsWithPrice > value.totalItems))
        || (value.durationCoverage !== undefined && !isFiniteRatio(value.durationCoverage))
        || (value.priceCoverage !== undefined && !isFiniteRatio(value.priceCoverage))
        || (value.daysWithData !== undefined && (!isNonNegativeSafeInteger(value.daysWithData) || value.daysWithData > 7))) return null;
    return {
        totalItems: value.totalItems,
        itemsWithViews: value.itemsWithViews,
        itemsWithDuration: value.itemsWithDuration,
        ...(isNonNegativeSafeInteger(value.totalViews) ? { totalViews: value.totalViews } : {}),
        ...(isNonNegativeSafeInteger(value.totalClicks) ? { totalClicks: value.totalClicks } : {}),
        ...(isNonNegativeSafeInteger(value.itemsWithClicks) ? { itemsWithClicks: value.itemsWithClicks } : {}),
        ...(isNonNegativeSafeInteger(value.itemsWithPrice) ? { itemsWithPrice: value.itemsWithPrice } : {}),
        ...(isFiniteRatio(value.durationCoverage) ? { durationCoverage: value.durationCoverage } : {}),
        ...(isFiniteRatio(value.priceCoverage) ? { priceCoverage: value.priceCoverage } : {}),
        ...(isNonNegativeSafeInteger(value.daysWithData) ? { daysWithData: value.daysWithData } : {}),
    };
}

export function projectPublicDecisionBlocks(
    value: unknown,
    expected: { tId: string; sId: string; projectId: string },
    nowMillis = Date.now(),
): PublicDecisionBlocksProjection | null {
    if (!isRecord(value)
        || !hasOnlyKeys(value, ['tId', 'sId', 'projectId', 'popular', 'quickPick', 'bestValue', 'computedAt', 'validUntil', 'statsUsed'])
        || value.tId !== expected.tId
        || value.sId !== expected.sId
        || value.projectId !== expected.projectId) return null;
    const popular = parseCandidateList(value.popular);
    const quickPick = parseCandidateList(value.quickPick);
    const bestValue = parseCandidateList(value.bestValue);
    const statsUsed = parseStats(value.statsUsed);
    const computedAtMillis = getTimestampMillis(value.computedAt);
    const validUntilMillis = getTimestampMillis(value.validUntil);
    if (!popular || !quickPick || !bestValue || !statsUsed
        || computedAtMillis === null
        || validUntilMillis === null
        || computedAtMillis > nowMillis + MAX_TIMESTAMP_FUTURE_SKEW_MS
        || validUntilMillis <= nowMillis
        || validUntilMillis <= computedAtMillis
        || validUntilMillis > computedAtMillis + MAX_PROJECTION_LIFETIME_MS) return null;
    return {
        ...expected,
        popular,
        quickPick,
        bestValue,
        computedAt: new Date(computedAtMillis).toISOString(),
        validUntil: new Date(validUntilMillis).toISOString(),
        statsUsed,
    };
}
