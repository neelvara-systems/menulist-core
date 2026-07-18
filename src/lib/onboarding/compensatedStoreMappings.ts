const ONBOARDING_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;

export const normalizePersistedOnboardingScopeId = (value: unknown): number | null => {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    if (!ONBOARDING_SCOPE_DOCUMENT_ID_PATTERN.test(raw)) return null;
    const numericId = Number(raw);
    return Number.isSafeInteger(numericId) && String(numericId) === raw ? numericId : null;
};

export const removeCompensatedStoreFromMappings = (stores: unknown, storeId: number) => (
    Array.isArray(stores)
        ? stores.filter((store) => (
            !store
            || typeof store !== "object"
            || Array.isArray(store)
            || normalizePersistedOnboardingScopeId((store as Record<string, unknown>).storeId) !== storeId
        ))
        : []
);

export const removeCompensatedStoreId = (storeIds: unknown, storeId: number) => (
    Array.isArray(storeIds)
        ? storeIds.filter((id) => normalizePersistedOnboardingScopeId(id) !== storeId)
        : []
);
