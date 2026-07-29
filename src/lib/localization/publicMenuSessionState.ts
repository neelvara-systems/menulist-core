type PublicMenuSessionStateField = 'activeLanguage' | 'activePage' | 'scrollY';

const POSITIVE_NUMERIC_ID_PATTERN = /^[1-9]\d{0,15}$/;
const PUBLIC_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

const normalizePositiveNumericId = (value: unknown): string | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }
    if (typeof value !== 'string' || !POSITIVE_NUMERIC_ID_PATTERN.test(value)) return null;
    return value;
};

export function getPublicMenuSessionStateKey(
    tenantId: unknown,
    storeId: unknown,
    projectId: unknown,
    field: PublicMenuSessionStateField,
): string | null {
    const normalizedTenantId = normalizePositiveNumericId(tenantId);
    const normalizedStoreId = normalizePositiveNumericId(storeId);
    const normalizedProjectId = typeof projectId === 'string'
        && PUBLIC_PROJECT_ID_PATTERN.test(projectId)
        ? projectId
        : null;

    if (!normalizedTenantId || !normalizedStoreId || !normalizedProjectId) return null;
    return `menulist_customerMenu_${normalizedTenantId}_${normalizedStoreId}_${normalizedProjectId}_${field}`;
}

export function parsePublicMenuScrollY(value: unknown): number | null {
    if (
        typeof value !== 'string'
        || !/^(0|[1-9]\d{0,7})$/.test(value)
    ) {
        return null;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed <= 10_000_000 ? parsed : null;
}
