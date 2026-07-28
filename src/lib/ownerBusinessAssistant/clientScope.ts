type OwnerBusinessAssistantSessionScope = {
    sId?: unknown;
    tId?: unknown;
};

export type OwnerBusinessAssistantClientScope = {
    cacheScope: string;
    storeId: string;
    tenantId: string;
};

const normalizeScopeId = (value: unknown): string | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return /^[1-9]\d{0,15}$/.test(normalized) ? normalized : null;
};

export const resolveOwnerBusinessAssistantClientScope = (
    session: OwnerBusinessAssistantSessionScope | null | undefined,
    requestedStoreId?: unknown,
    requestedTenantId?: unknown,
): OwnerBusinessAssistantClientScope | null => {
    const tenantId = typeof session?.tId === 'number'
        && Number.isSafeInteger(session.tId)
        && session.tId > 0
        ? String(session.tId)
        : null;
    const storeId = typeof session?.sId === 'number'
        && Number.isSafeInteger(session.sId)
        && session.sId > 0
        ? String(session.sId)
        : null;
    if (!tenantId || !storeId) return null;

    if (requestedStoreId !== undefined && requestedStoreId !== null && requestedStoreId !== '') {
        const requested = normalizeScopeId(requestedStoreId);
        if (!requested || requested !== storeId) return null;
    }
    if (requestedTenantId !== undefined && requestedTenantId !== null && requestedTenantId !== '') {
        const requested = normalizeScopeId(requestedTenantId);
        if (!requested || requested !== tenantId) return null;
    }

    return {
        cacheScope: `${tenantId}:${storeId}`,
        storeId,
        tenantId,
    };
};
