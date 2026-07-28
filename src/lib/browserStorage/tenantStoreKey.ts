const normalizeTenantStoreStorageId = (value: unknown): string | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return /^[1-9]\d{0,15}$/.test(normalized) ? normalized : null;
};

export const getTenantStoreStorageKey = (
    baseKey: string,
    tenantId: unknown,
    storeId: unknown,
): string | null => {
    const normalizedBaseKey = baseKey.trim();
    const normalizedTenantId = normalizeTenantStoreStorageId(tenantId);
    const normalizedStoreId = normalizeTenantStoreStorageId(storeId);
    if (
        !normalizedBaseKey
        || !/^[a-zA-Z0-9:_-]{1,96}$/.test(normalizedBaseKey)
        || !normalizedTenantId
        || !normalizedStoreId
    ) {
        return null;
    }
    return `${normalizedBaseKey}:${normalizedTenantId}:${normalizedStoreId}`;
};
