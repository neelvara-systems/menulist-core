export interface ExactAnswerlatticeScope {
    tId: number;
    sId: number;
}

export function normalizeExactAnswerlatticeScopeId(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
        ? value
        : null;
}

export function normalizeStoredAnswerlatticeScopeId(value: unknown): number | null {
    const exact = normalizeExactAnswerlatticeScopeId(value);
    if (exact !== null) return exact;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized > 0
        ? normalized
        : null;
}

export function parseExactAnswerlatticeScope(
    tId: unknown,
    sId: unknown,
): ExactAnswerlatticeScope | null {
    const tenantId = normalizeExactAnswerlatticeScopeId(tId);
    const storeId = normalizeExactAnswerlatticeScopeId(sId);
    return tenantId === null || storeId === null
        ? null
        : { tId: tenantId, sId: storeId };
}

export function parseStoredAnswerlatticeScope(
    tId: unknown,
    sId: unknown,
): ExactAnswerlatticeScope | null {
    const tenantId = normalizeStoredAnswerlatticeScopeId(tId);
    const storeId = normalizeStoredAnswerlatticeScopeId(sId);
    return tenantId === null || storeId === null
        ? null
        : { tId: tenantId, sId: storeId };
}
