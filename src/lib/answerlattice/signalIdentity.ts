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
