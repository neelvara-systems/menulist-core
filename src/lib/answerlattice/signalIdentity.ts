import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';

export const normalizeExactAnswerlatticeSignalScopeId = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null
);

const cleanDeduplicationKey = (value: unknown): string | null => {
    const normalized = typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
        : '';
    return normalized && normalized.length <= 260 ? normalized : null;
};

export const buildAnswerlatticeSignalMemoryDedupKey = (params: {
    tId: unknown;
    sId: unknown;
    deduplicationKey: unknown;
}): string | null => {
    const tId = normalizeExactAnswerlatticeSignalScopeId(params.tId);
    const sId = normalizeExactAnswerlatticeSignalScopeId(params.sId);
    const deduplicationKey = cleanDeduplicationKey(params.deduplicationKey);
    if (tId === null || sId === null || !deduplicationKey) return null;
    return `${tId}:${sId}:${deduplicationKey}`;
};

export const hashAnswerlatticeSignalIdentity = (value: string): string => {
    let hashA = 0x811c9dc5;
    let hashB = 0x01000193;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        hashA ^= code;
        hashA = Math.imul(hashA, 0x01000193);
        hashB = Math.imul(hashB ^ code, 0x85ebca6b);
    }
    return `${(hashA >>> 0).toString(36)}${(hashB >>> 0).toString(36)}`;
};

const stableSignalIdentityValue = (
    value: unknown,
    seen: WeakSet<object> = new WeakSet<object>(),
    depth = 0,
): unknown => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
    if (depth >= 6) return null;
    if (Array.isArray(value)) {
        if (seen.has(value)) return null;
        seen.add(value);
        try {
            return value.map(item => stableSignalIdentityValue(item, seen, depth + 1));
        } catch {
            return null;
        }
    }
    if (typeof value === 'object') {
        if (seen.has(value)) return null;
        seen.add(value);
        try {
            return Object.fromEntries(Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, nested]) => [key, stableSignalIdentityValue(nested, seen, depth + 1)]));
        } catch {
            return null;
        }
    }
    return null;
};

const normalizeSignalIdentityText = (value: unknown): string => (
    typeof value === 'string' ? value : ''
);

export const buildAnswerlatticeSignalPayloadFingerprint = (params: {
    type: unknown;
    entityId: unknown;
    deduplicationKey: unknown;
    metadata: unknown;
}): string => `sigfp_${hashAnswerlatticeSignalIdentity(JSON.stringify(stableSignalIdentityValue({
    type: normalizeSignalIdentityText(params.type),
    entityId: normalizeSignalIdentityText(params.entityId),
    deduplicationKey: normalizeSignalIdentityText(params.deduplicationKey),
    metadata: params.metadata,
})))}`;

export const buildAnswerlatticeSignalDocumentId = (params: {
    tId: unknown;
    sId: unknown;
    deduplicationKey: unknown;
}): string | null => {
    const tId = normalizeAnswerlatticeScopeDocumentId(params.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(params.sId);
    const deduplicationKey = cleanDeduplicationKey(params.deduplicationKey);
    if (!tId || !sId || !deduplicationKey) return null;
    return `sig_${hashAnswerlatticeSignalIdentity(`${tId}:${sId}:${deduplicationKey}`)}`;
};
