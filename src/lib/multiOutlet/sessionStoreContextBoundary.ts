import { normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';

type StoreScopeRecord = Record<string, unknown> & {
    active?: unknown;
    authDisabled?: unknown;
    blocked?: unknown;
    deleted?: unknown;
    id?: unknown;
    sId?: unknown;
    storeId?: unknown;
    tId?: unknown;
    tenantId?: unknown;
};

const allPresentIdsMatch = (values: unknown[], expected: number): boolean => {
    const presentValues = values.filter((value) => value !== undefined && value !== null);
    return presentValues.length > 0
        && presentValues.every((value) => normalizeStoreSwitchStoreId(value) === expected);
};

export const isActiveStoreRecordInTenantScope = (
    value: unknown,
    expected: { storeId: unknown; tenantId: unknown },
): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const store = value as StoreScopeRecord;
    const storeId = normalizeStoreSwitchStoreId(expected.storeId);
    const tenantId = normalizeStoreSwitchStoreId(expected.tenantId);
    if (!storeId || !tenantId) return false;

    return allPresentIdsMatch([store.storeId, store.sId, store.id], storeId)
        && allPresentIdsMatch([store.tenantId, store.tId], tenantId)
        && store.active !== false
        && store.deleted !== true
        && store.authDisabled !== true
        && store.blocked !== true;
};

export const getActiveTenantStoreSummaryId = (value: unknown): number | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const summary = value as Record<string, unknown> & {
        active?: unknown;
        storeDetails?: { active?: unknown; storeId?: unknown } | null;
        storeId?: unknown;
    };
    if (summary.active !== undefined && typeof summary.active !== 'boolean') return null;
    if (summary.storeDetails?.active !== undefined && typeof summary.storeDetails.active !== 'boolean') return null;
    if (summary.active === false || summary.storeDetails?.active === false) return null;
    return normalizeStoreSwitchStoreId(summary.storeId ?? summary.storeDetails?.storeId);
};
