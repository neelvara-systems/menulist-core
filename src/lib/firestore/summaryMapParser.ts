export type SummaryMapData = Record<string, unknown>;

const UNSAFE_SUMMARY_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSummaryMapRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeSummaryMapSegment(value: string): boolean {
    return value.length > 0 && !UNSAFE_SUMMARY_PATH_SEGMENTS.has(value);
}

function createSafeSummaryMapRecord(source?: Record<string, unknown>): SummaryMapData {
    const result = Object.create(null) as SummaryMapData;
    if (!source) return result;

    for (const [key, value] of Object.entries(source)) {
        if (isSafeSummaryMapSegment(key)) result[key] = value;
    }
    return result;
}

export function parseSummaryMap(
    data: unknown,
    namespace: string,
): Record<string, SummaryMapData> {
    if (!isSafeSummaryMapSegment(namespace) || namespace.includes('.')) {
        throw new Error('[summaryMapParser] invalid namespace');
    }
    if (!isSummaryMapRecord(data)) return Object.create(null) as Record<string, SummaryMapData>;

    const result = Object.create(null) as Record<string, SummaryMapData>;
    const nested = data[namespace];
    if (isSummaryMapRecord(nested)) {
        for (const [entityId, entityData] of Object.entries(nested)) {
            if (isSafeSummaryMapSegment(entityId) && isSummaryMapRecord(entityData)) {
                result[entityId] = createSafeSummaryMapRecord(entityData);
            }
        }
    }

    const prefix = `${namespace}.`;
    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith(prefix)) continue;

        const rest = key.slice(prefix.length);
        if (!rest) continue;
        const [entityId, ...fieldPath] = rest.split('.');
        if (![entityId, ...fieldPath].every(isSafeSummaryMapSegment)) continue;

        if (!result[entityId]) result[entityId] = createSafeSummaryMapRecord();
        if (fieldPath.length === 0) {
            if (isSummaryMapRecord(value)) {
                result[entityId] = Object.assign(
                    createSafeSummaryMapRecord(),
                    result[entityId],
                    createSafeSummaryMapRecord(value),
                );
            }
            continue;
        }

        let target = result[entityId];
        for (let index = 0; index < fieldPath.length - 1; index += 1) {
            const segment = fieldPath[index];
            const next = isSummaryMapRecord(target[segment])
                ? createSafeSummaryMapRecord(target[segment])
                : createSafeSummaryMapRecord();
            target[segment] = next;
            target = next;
        }
        target[fieldPath[fieldPath.length - 1]] = value;
    }

    return result;
}
