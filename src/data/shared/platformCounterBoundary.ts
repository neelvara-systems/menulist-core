export const PLATFORM_COUNTER_DOCUMENT_ID = 'summary';
export const LEGACY_PLATFORM_COUNTER_DOCUMENT_ID = 'default';
export const MAX_PLATFORM_COUNTER_COLLISION_PROBES = 25;

export type PlatformEntityCounter = 'store' | 'tenant';

export type PlatformCounterSnapshot = {
    stores: { count: number };
    tenants: { count: number };
};

const UNSAFE_COUNTER_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeSegment(value: string): boolean {
    return value.length > 0 && !UNSAFE_COUNTER_PATH_SEGMENTS.has(value);
}

function normalizeCounter(value: unknown): number {
    const numericValue = typeof value === 'number'
        ? value
        : typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
            ? Number(value)
            : Number.NaN;
    return Number.isSafeInteger(numericValue)
        && numericValue >= 0
        && (typeof value !== 'string' || String(numericValue) === value)
        ? numericValue
        : 0;
}

function normalizeEntityId(value: unknown): number {
    const normalized = normalizeCounter(value);
    return normalized > 0 ? normalized : 0;
}

function readDocumentCounter(data: unknown, counter: PlatformEntityCounter): number {
    if (!isRecord(data)) return 0;
    const counterMap = data[counter === 'tenant' ? 'tenants' : 'stores'];
    return isRecord(counterMap) ? normalizeCounter(counterMap.count) : 0;
}

function readStoreSummaryCounter(data: unknown, counter: PlatformEntityCounter): number {
    if (!isRecord(data)) return 0;
    let maximum = 0;

    const considerEntry = (storeId: string, entry: unknown): void => {
        if (!isSafeSegment(storeId)) return;
        const candidate = counter === 'store'
            ? normalizeEntityId(storeId)
            : isRecord(entry)
                ? normalizeEntityId(entry.tId)
                : 0;
        if (candidate > maximum) maximum = candidate;
    };

    const nested = data.stores;
    if (isRecord(nested)) {
        for (const [storeId, entry] of Object.entries(nested)) {
            considerEntry(storeId, entry);
        }
    }

    for (const [fieldPath, value] of Object.entries(data)) {
        if (!fieldPath.startsWith('stores.')) continue;
        const segments = fieldPath.split('.');
        if (!segments.every(isSafeSegment) || segments.length < 2) continue;
        const storeId = segments[1];
        if (segments.length === 2) {
            considerEntry(storeId, value);
        } else if (segments.length === 3 && segments[2] === 'tId') {
            considerEntry(storeId, { tId: value });
        }
    }

    return maximum;
}

export function resolvePlatformCounterFloor(
    canonicalData: unknown,
    legacyData: unknown,
    storesSummaryData: unknown,
    counter: PlatformEntityCounter,
): number {
    return Math.max(
        readDocumentCounter(canonicalData, counter),
        readDocumentCounter(legacyData, counter),
        readStoreSummaryCounter(storesSummaryData, counter),
    );
}

export async function findNextAvailablePlatformEntityId(
    counterFloor: number,
    candidateExists: (candidateId: number) => Promise<boolean>,
): Promise<number> {
    if (normalizeCounter(counterFloor) !== counterFloor) {
        throw new Error('platform_counter_floor_invalid');
    }

    let candidateId = counterFloor + 1;
    for (let probe = 0; probe < MAX_PLATFORM_COUNTER_COLLISION_PROBES; probe += 1) {
        if (!await candidateExists(candidateId)) return candidateId;
        candidateId += 1;
    }
    throw new Error('platform_counter_allocation_exhausted');
}
