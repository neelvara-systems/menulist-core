export type PlatformStoreSummaryData = Record<string, unknown> & {
    storeId: string;
    tId: string;
};

const UNSAFE_STORE_SUMMARY_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeSegment(value: string): boolean {
    return value.length > 0 && !UNSAFE_STORE_SUMMARY_SEGMENTS.has(value);
}

export function normalizeStoreSummaryNumericDocumentId(value: unknown): string | null {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) && numericValue > 0 && String(numericValue) === value
        ? value
        : null;
}

export function normalizeStoreSummaryDate(value: unknown): Date | null {
    try {
        let candidate: Date | null = null;
        if (value instanceof Date) {
            candidate = value;
        } else if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>;
            if (typeof record.toDate === 'function') {
                candidate = (record.toDate as () => Date)();
            } else {
                const seconds = typeof record.seconds === 'number'
                    ? record.seconds
                    : typeof record._seconds === 'number'
                        ? record._seconds
                        : null;
                if (seconds !== null) candidate = new Date(seconds * 1000);
            }
        } else if (typeof value === 'number') {
            candidate = new Date(Math.abs(value) < 100_000_000_000 ? value * 1000 : value);
        } else if (typeof value === 'string') {
            candidate = new Date(value);
        }
        return candidate && Number.isFinite(candidate.getTime()) ? candidate : null;
    } catch {
        return null;
    }
}

function createSafeRecord(source?: Record<string, unknown>): Record<string, unknown> {
    const result = Object.create(null) as Record<string, unknown>;
    if (!source) return result;
    for (const [key, value] of Object.entries(source)) {
        if (isSafeSegment(key)) result[key] = value;
    }
    return result;
}

export function normalizePlatformStoreSummaryIdentity(
    rawStoreId: unknown,
    rawEntry: unknown,
): { storeId: string; tId: string } | null {
    if (!isRecord(rawEntry)) return null;
    const storeId = normalizeStoreSummaryNumericDocumentId(rawStoreId);
    const tenantId = normalizeStoreSummaryNumericDocumentId(rawEntry.tId ?? rawEntry.tenantId);
    const embeddedStoreId = rawEntry.storeId === undefined
        ? storeId
        : normalizeStoreSummaryNumericDocumentId(rawEntry.storeId);
    return storeId && tenantId && embeddedStoreId === storeId
        ? { storeId, tId: tenantId }
        : null;
}

function parseRawStoreSummaryMap(data: unknown): Record<string, Record<string, unknown>> {
    const result = Object.create(null) as Record<string, Record<string, unknown>>;
    if (!isRecord(data)) return result;

    if (isRecord(data.stores)) {
        for (const [storeId, entry] of Object.entries(data.stores)) {
            if (isSafeSegment(storeId) && isRecord(entry)) result[storeId] = createSafeRecord(entry);
        }
    }

    for (const [fieldPath, value] of Object.entries(data)) {
        if (!fieldPath.startsWith('stores.')) continue;
        const segments = fieldPath.slice('stores.'.length).split('.');
        if (segments.length === 0 || !segments.every(isSafeSegment)) continue;
        const [storeId, ...nestedPath] = segments;
        if (!result[storeId]) result[storeId] = createSafeRecord();

        if (nestedPath.length === 0) {
            if (isRecord(value)) {
                result[storeId] = Object.assign(
                    createSafeRecord(),
                    result[storeId],
                    createSafeRecord(value),
                );
            }
            continue;
        }

        let target = result[storeId];
        for (let index = 0; index < nestedPath.length - 1; index += 1) {
            const segment = nestedPath[index];
            const next = isRecord(target[segment])
                ? createSafeRecord(target[segment])
                : createSafeRecord();
            target[segment] = next;
            target = next;
        }
        target[nestedPath[nestedPath.length - 1]] = value;
    }

    return result;
}

export function parsePlatformStoreSummary(data: unknown): Record<string, PlatformStoreSummaryData> {
    const result = Object.create(null) as Record<string, PlatformStoreSummaryData>;
    for (const [rawStoreId, rawEntry] of Object.entries(parseRawStoreSummaryMap(data))) {
        const identity = normalizePlatformStoreSummaryIdentity(rawStoreId, rawEntry);
        if (!identity) continue;
        result[identity.storeId] = Object.assign(createSafeRecord(rawEntry), identity);
    }
    return result;
}
