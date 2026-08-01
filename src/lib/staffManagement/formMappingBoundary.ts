import { DEFAULT_ROLE_IDS } from '@data/shared/defaultRoles';
import type { StaffFormUser, StaffStoreOption } from './types';
import type { StoreDataType } from '@type/platform/store';
import type { TenantDataType } from '@type/platform/tenant';
import type { StoreRoleDataType } from '@type/platform/roles';

export const isStaffUserInTenantContext = (
    user: Pick<StaffFormUser, 'tenantId'>,
    activeTenantId: number | null | undefined,
): boolean => Boolean(activeTenantId && user.tenantId === activeTenantId);

export const mergeStaffRolesForCurrentStore = (
    currentStore: StoreDataType | null,
    expectedTenantId: number,
    expectedStoreId: number,
    sourceRoles: StoreRoleDataType[] | undefined,
    nextRoles: StoreRoleDataType[],
): StoreDataType | null => (
    currentStore?.tenantId === expectedTenantId
    && currentStore.storeId === expectedStoreId
    && currentStore.roles === sourceRoles
        ? { ...currentStore, roles: nextRoles }
        : currentStore
);

const rebuildStaffStoreIdentity = (
    user: StaffFormUser,
    stores: StaffFormUser['stores'],
    previousDefaultStoreId?: number,
    replacementDefaultStoreId?: number,
): StaffFormUser => {
    const storeIds = stores.map((store) => store.storeId);
    const retainedDefault = storeIds.includes(user.storeId ?? -1)
        ? user.storeId
        : undefined;
    const replacedDefault = user.storeId === previousDefaultStoreId
        && replacementDefaultStoreId !== undefined
        ? replacementDefaultStoreId
        : undefined;
    return {
        ...user,
        storeId: replacedDefault ?? retainedDefault ?? storeIds[0],
        storeIds,
        stores,
    };
};

export const applyStaffStoreSelection = (
    user: StaffFormUser,
    mappingIndex: number,
    selectedStore: Pick<StaffStoreOption, 'name' | 'storeId'>,
): StaffFormUser | null => {
    if (!Number.isSafeInteger(mappingIndex) || mappingIndex < 0 || mappingIndex >= user.stores.length) return null;
    if (user.stores.some((mapping, index) => index !== mappingIndex && mapping.storeId === selectedStore.storeId)) return null;
    const previousStoreId = user.stores[mappingIndex]?.storeId;
    const stores = user.stores.map((mapping, index) => (
        index === mappingIndex
            ? { name: selectedStore.name, role: '', storeId: selectedStore.storeId }
            : mapping
    ));
    return rebuildStaffStoreIdentity(user, stores, previousStoreId, selectedStore.storeId);
};

export const applyStaffStoreRole = (
    user: StaffFormUser,
    mappingIndex: number,
    role: string,
): StaffFormUser | null => {
    if (!Number.isSafeInteger(mappingIndex) || mappingIndex < 0 || mappingIndex >= user.stores.length) return null;
    return {
        ...user,
        stores: user.stores.map((mapping, index) => (
            index === mappingIndex ? { ...mapping, role } : mapping
        )),
    };
};

export const removeStaffStoreSelection = (
    user: StaffFormUser,
    mappingIndex: number,
): StaffFormUser | null => {
    const mapping = user.stores[mappingIndex];
    if (!mapping || mapping.role === DEFAULT_ROLE_IDS.OWNER) return null;
    return rebuildStaffStoreIdentity(
        user,
        user.stores.filter((_, index) => index !== mappingIndex),
    );
};

export const mergeLoadedStaffStoreForCurrentTenant = (
    currentTenant: TenantDataType | null,
    expectedTenantId: number,
    expectedStoreId: number,
    loadedStore: StoreDataType,
): TenantDataType | null => {
    if (
        currentTenant?.tenantId !== expectedTenantId
        || loadedStore.tenantId !== expectedTenantId
        || loadedStore.storeId !== expectedStoreId
        || !currentTenant.storesList.some((store) => store.storeId === expectedStoreId)
    ) {
        return currentTenant;
    }
    return {
        ...currentTenant,
        storesList: currentTenant.storesList.map((store) => (
            store.storeId === expectedStoreId ? { ...store, storeDetails: loadedStore } : store
        )),
    };
};
