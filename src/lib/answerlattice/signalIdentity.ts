import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';

export const normalizeExactAnswerlatticeSignalScopeId = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null
);

const cleanDeduplicationKey = (value: unknown): string | null => {
    const normalized = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    return normalized && normalized.length <= 260 ? normalized : null;
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

const stableSignalIdentityValue = (value: unknown): unknown => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(stableSignalIdentityValue);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, nested]) => [key, stableSignalIdentityValue(nested)]));
    }
    return String(value);
};

export const buildAnswerlatticeSignalPayloadFingerprint = (params: {
    type: unknown;
    entityId: unknown;
    deduplicationKey: unknown;
    metadata: unknown;
}): string => `sigfp_${hashAnswerlatticeSignalIdentity(JSON.stringify(stableSignalIdentityValue({
    type: String(params.type || ''),
    entityId: String(params.entityId || ''),
    deduplicationKey: String(params.deduplicationKey || ''),
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
