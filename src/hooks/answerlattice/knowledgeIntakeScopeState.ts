export function getAnswerlatticeKnowledgeIntakeScopeKey(
    tenantId: unknown,
    storeId: unknown,
): string | null {
    if (
        typeof tenantId !== "number"
        || !Number.isSafeInteger(tenantId)
        || tenantId <= 0
        || typeof storeId !== "number"
        || !Number.isSafeInteger(storeId)
        || storeId <= 0
    ) return null;
    return `${tenantId}:${storeId}`;
}

export function isAnswerlatticeKnowledgeIntakeScopeCurrent(
    expectedScopeKey: string | null,
    currentScopeKey: string | null,
): boolean {
    return expectedScopeKey !== null && expectedScopeKey === currentScopeKey;
}
