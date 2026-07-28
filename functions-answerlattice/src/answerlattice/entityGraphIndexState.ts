import { createHash } from 'crypto';

const ENTITY_GRAPH_INDEX_REQUIRED_KEYS = [
    'entityCount',
    'graph',
    'lastRebuiltAt',
    'pId',
    'relationCount',
    'sId',
    'sourceHash',
    'sourceVersions',
    'tId',
    'version',
] as const;

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? '"[undefined]"';
}

export function hashAnswerlatticeEntityGraphPayload(value: unknown): string {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

const getTimestampMillis = (value: unknown): number | null => {
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) && millis > 0 ? millis : null;
    }
    if (!value || typeof value !== 'object') return null;
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== 'function') return null;
    try {
        const millis = toMillis.call(value);
        return typeof millis === 'number' && Number.isFinite(millis) && millis > 0
            ? millis
            : null;
    } catch {
        return null;
    }
};

export function isCurrentAnswerlatticeEntityGraphIndex(
    value: unknown,
    expected: {
        tId: number;
        sId: number;
        payload: Record<string, unknown>;
        sourceHash: string;
        preservesInteractionRules: boolean;
    },
): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const data = value as Record<string, unknown>;
    const expectedKeys = expected.preservesInteractionRules
        ? [...ENTITY_GRAPH_INDEX_REQUIRED_KEYS, 'interactionRules']
        : [...ENTITY_GRAPH_INDEX_REQUIRED_KEYS];
    const actualKeys = Object.keys(data).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    if (
        actualKeys.length !== sortedExpectedKeys.length
        || actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
    ) return false;
    if (
        data.pId !== 'AL'
        || data.tId !== expected.tId
        || data.sId !== expected.sId
        || !Number.isSafeInteger(data.version)
        || (data.version as number) <= 0
        || getTimestampMillis(data.lastRebuiltAt) === null
        || data.sourceHash !== expected.sourceHash
    ) return false;

    return hashAnswerlatticeEntityGraphPayload({
        entityCount: data.entityCount,
        relationCount: data.relationCount,
        graph: data.graph,
        sourceVersions: data.sourceVersions,
        interactionRules: data.interactionRules || [],
    }) === expected.sourceHash
        && hashAnswerlatticeEntityGraphPayload(expected.payload) === expected.sourceHash;
}
