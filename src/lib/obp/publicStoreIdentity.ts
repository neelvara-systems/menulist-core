export interface OBPPublicStoreIdentity {
    storeId: number;
    tenantId: number;
}

export function hasOBPPublicStoreIdentity(value: unknown): value is OBPPublicStoreIdentity {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    try {
        const storeId = Reflect.get(value, 'storeId');
        const tenantId = Reflect.get(value, 'tenantId');
        return Number.isSafeInteger(storeId)
            && Number(storeId) > 0
            && Number.isSafeInteger(tenantId)
            && Number(tenantId) > 0;
    } catch {
        return false;
    }
}
