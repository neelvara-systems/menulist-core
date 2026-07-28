export function buildAnswerlatticeHookScopeKey(tId: unknown, sId: unknown): string | null {
    return Number.isSafeInteger(tId) && Number(tId) > 0
        && Number.isSafeInteger(sId) && Number(sId) > 0
        ? `${tId}:${sId}`
        : null;
}

export function isAnswerlatticeHookScopeCurrent(
    expectedScopeKey: string | null,
    currentScopeKey: string | null,
): expectedScopeKey is string {
    return expectedScopeKey !== null && expectedScopeKey === currentScopeKey;
}
