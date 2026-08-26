import type { StoreDataType } from '@type/platform/store';

export const isReadableStoreDocument = (
    value: unknown,
    expectedStoreId: number,
): value is StoreDataType => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const store = value as Partial<StoreDataType>;
    return Number.isSafeInteger(store.storeId)
        && store.storeId === expectedStoreId
        && Number.isSafeInteger(store.tenantId)
        && Number(store.tenantId) > 0
        && typeof store.storeKey === 'string'
        && typeof store.tenantName === 'string'
        && typeof store.active === 'boolean'
        && typeof store.deleted === 'boolean'
        && typeof store.name === 'string'
        && typeof store.email === 'string'
        && typeof store.phoneNumber === 'string'
        && typeof store.logo === 'string'
        && typeof store.city === 'string'
        && typeof store.state === 'string'
        && typeof store.currencyCode === 'string'
        && typeof store.currencySymbol === 'string'
        && typeof store.businessType === 'string'
        && typeof store.businessCategory === 'string'
        && typeof store.contactPersonName === 'string'
        && typeof store.contactPersonEmail === 'string'
        && typeof store.contactPersonNumber === 'string'
        && Array.isArray(store.roles);
};
