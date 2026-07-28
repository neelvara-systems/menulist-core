export interface ExactAnswerlatticeScope {
    tId: number;
    sId: number;
}

export interface StoredAnswerlatticeScopeAliases {
    tId?: unknown;
    tenantId?: unknown;
    sId?: unknown;
    storeId?: unknown;
}

export interface StoredAnswerlatticeProductAliases {
    pId?: unknown;
    productId?: unknown;
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

function normalizeConsistentStoredAnswerlatticeScopeId(...values: unknown[]): number | null {
    const presentValues = values.filter(value => value !== undefined && value !== null);
    if (presentValues.length === 0) return null;
    const normalizedValues = presentValues.map(normalizeStoredAnswerlatticeScopeId);
    const expected = normalizedValues[0];
    return expected !== null && normalizedValues.every(value => value === expected)
        ? expected
        : null;
}

export function parseStoredAnswerlatticeScopeAliases(
    aliases: StoredAnswerlatticeScopeAliases,
): ExactAnswerlatticeScope | null {
    const tenantId = normalizeConsistentStoredAnswerlatticeScopeId(aliases.tId, aliases.tenantId);
    const storeId = normalizeConsistentStoredAnswerlatticeScopeId(aliases.sId, aliases.storeId);
    return tenantId === null || storeId === null
        ? null
        : { tId: tenantId, sId: storeId };
}

export function hasExactStoredAnswerlatticeProductAliases(
    aliases: StoredAnswerlatticeProductAliases,
): boolean {
    const presentValues = [aliases.pId, aliases.productId]
        .filter(value => value !== undefined && value !== null);
    return presentValues.length > 0 && presentValues.every(value => value === 'AL');
}
