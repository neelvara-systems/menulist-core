export const OWNER_CONTROL_TYPES = [
    'ownerBoost',
    'pinnedPopular',
    'pinnedQuickPick',
    'pinnedBestValue',
    'enablePopular',
    'enableQuickPick',
    'enableBestValue',
    'screenOverride',
] as const;

export type OwnerControlType = (typeof OWNER_CONTROL_TYPES)[number];

export type OwnerControlCounts = Partial<Record<OwnerControlType, number>>;

export interface OwnerControlUsageDocument<TTimestamp> {
    tId: string;
    sId: string;
    counts: OwnerControlCounts;
    lastUsed: Partial<Record<OwnerControlType, TTimestamp>>;
    monthlyUsage: Record<string, OwnerControlCounts>;
    firstTrackedAt: TTimestamp;
    lastUpdatedAt: TTimestamp;
}

const OWNER_CONTROL_TYPE_SET = new Set<string>(OWNER_CONTROL_TYPES);
const NUMERIC_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;
const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_MONTH_BUCKETS = 240;
const MAX_TIMESTAMP_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function getOwnerControlUsageMonthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
    const keys = Object.keys(value).sort();
    const expectedKeys = [...expected].sort();
    return keys.length === expectedKeys.length
        && keys.every((key, index) => key === expectedKeys[index]);
}

export function normalizeOwnerControlDocumentIdPart(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const normalized = String(value);
    if (!NUMERIC_DOCUMENT_ID_PATTERN.test(normalized)) return null;
    const numeric = Number(normalized);
    if (!Number.isSafeInteger(numeric) || numeric <= 0 || String(numeric) !== normalized) {
        return null;
    }
    return normalized;
}

function parseCounts(value: unknown): OwnerControlCounts | null {
    if (!isRecord(value)) return null;
    const keys = Object.keys(value);
    if (keys.length < 1 || keys.some((key) => !OWNER_CONTROL_TYPE_SET.has(key))) {
        return null;
    }

    const counts: OwnerControlCounts = {};
    for (const key of keys as OwnerControlType[]) {
        const count = value[key];
        if (!Number.isSafeInteger(count) || Number(count) <= 0) return null;
        counts[key] = Number(count);
    }
    return counts;
}

function sameKeys(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
        && leftKeys.every((key, index) => key === rightKeys[index]);
}

export function parseOwnerControlUsageDocument<TTimestamp>(
    value: unknown,
    documentId: string,
    isTimestamp: (candidate: unknown) => candidate is TTimestamp,
    timestampToMillis: (timestamp: TTimestamp) => number,
    nowMillis: number = Date.now(),
): OwnerControlUsageDocument<TTimestamp> | null {
    if (!isRecord(value)) return null;
    if (!hasExactKeys(value, [
        'tId',
        'sId',
        'counts',
        'lastUsed',
        'monthlyUsage',
        'firstTrackedAt',
        'lastUpdatedAt',
    ])) {
        return null;
    }

    if (typeof value.tId !== 'string' || typeof value.sId !== 'string') return null;
    const tId = normalizeOwnerControlDocumentIdPart(value.tId);
    const sId = normalizeOwnerControlDocumentIdPart(value.sId);
    if (!tId || !sId || documentId !== `${tId}_${sId}`) return null;

    const counts = parseCounts(value.counts);
    if (!counts || !isRecord(value.lastUsed) || !sameKeys(counts, value.lastUsed)) {
        return null;
    }

    if (!isTimestamp(value.firstTrackedAt) || !isTimestamp(value.lastUpdatedAt)) {
        return null;
    }
    const firstTrackedAtMillis = timestampToMillis(value.firstTrackedAt);
    const lastUpdatedAtMillis = timestampToMillis(value.lastUpdatedAt);
    if (
        !Number.isFinite(firstTrackedAtMillis)
        || !Number.isFinite(lastUpdatedAtMillis)
        || firstTrackedAtMillis < 0
        || firstTrackedAtMillis > lastUpdatedAtMillis
        || lastUpdatedAtMillis > nowMillis + MAX_TIMESTAMP_CLOCK_SKEW_MS
    ) {
        return null;
    }

    const lastUsed: Partial<Record<OwnerControlType, TTimestamp>> = {};
    let latestUsedAtMillis = Number.NEGATIVE_INFINITY;
    for (const key of Object.keys(value.lastUsed) as OwnerControlType[]) {
        const timestamp = value.lastUsed[key];
        if (!isTimestamp(timestamp)) return null;
        const usedAtMillis = timestampToMillis(timestamp);
        if (
            !Number.isFinite(usedAtMillis)
            || usedAtMillis < firstTrackedAtMillis
            || usedAtMillis > lastUpdatedAtMillis
        ) {
            return null;
        }
        latestUsedAtMillis = Math.max(latestUsedAtMillis, usedAtMillis);
        lastUsed[key] = timestamp;
    }
    if (latestUsedAtMillis !== lastUpdatedAtMillis) return null;

    if (!isRecord(value.monthlyUsage)) return null;
    const monthKeys = Object.keys(value.monthlyUsage).sort();
    if (
        monthKeys.length < 1
        || monthKeys.length > MAX_MONTH_BUCKETS
        || monthKeys.some((key) => !YEAR_MONTH_PATTERN.test(key))
    ) {
        return null;
    }

    const monthlyUsage: Record<string, OwnerControlCounts> = {};
    const monthlyTotals: OwnerControlCounts = {};
    const firstTrackedMonth = getOwnerControlUsageMonthKey(new Date(firstTrackedAtMillis));
    const lastUpdatedMonth = getOwnerControlUsageMonthKey(new Date(lastUpdatedAtMillis));
    for (const monthKey of monthKeys) {
        if (monthKey < firstTrackedMonth || monthKey > lastUpdatedMonth) return null;
        const monthCounts = parseCounts(value.monthlyUsage[monthKey]);
        if (!monthCounts) return null;
        monthlyUsage[monthKey] = monthCounts;
        for (const [controlType, count] of Object.entries(monthCounts) as Array<[OwnerControlType, number]>) {
            const total = (monthlyTotals[controlType] ?? 0) + count;
            if (!Number.isSafeInteger(total)) return null;
            monthlyTotals[controlType] = total;
        }
    }

    if (!sameKeys(counts, monthlyTotals)) return null;
    for (const [controlType, count] of Object.entries(counts) as Array<[OwnerControlType, number]>) {
        if (monthlyTotals[controlType] !== count) return null;
    }

    return {
        tId,
        sId,
        counts,
        lastUsed,
        monthlyUsage,
        firstTrackedAt: value.firstTrackedAt,
        lastUpdatedAt: value.lastUpdatedAt,
    };
}
