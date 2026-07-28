import {
    resolveStorePermissionScopeDocumentIdAliases,
    type StorePermissionScopeDocumentId,
} from '@lib/permissions/scopeDocumentId';

export type SensitiveSessionStoreScope = {
    storeScope: StorePermissionScopeDocumentId;
    tenantScope: StorePermissionScopeDocumentId;
};

const presentValues = (values: readonly unknown[]): unknown[] => (
    values.filter((value) => value !== undefined && value !== null)
);

export function resolveSensitiveSessionStoreScope(params: {
    storeValues: readonly unknown[];
    tenantValues: readonly unknown[];
}): SensitiveSessionStoreScope | null {
    const storeScope = resolveStorePermissionScopeDocumentIdAliases([...params.storeValues]);
    const tenantScope = resolveStorePermissionScopeDocumentIdAliases([...params.tenantValues]);
    return storeScope && tenantScope ? { storeScope, tenantScope } : null;
}

export function isSensitiveStoreRecordInScope(params: {
    storeData: Record<string, unknown> | null | undefined;
    storeDocumentId: string;
    tenantDocumentId: string;
}): boolean {
    if (!params.storeData) return false;
    const embeddedStoreValues = presentValues([
        params.storeData.storeId,
        params.storeData.sId,
    ]);
    const embeddedStoreScope = embeddedStoreValues.length === 0
        ? { documentId: params.storeDocumentId }
        : resolveStorePermissionScopeDocumentIdAliases(embeddedStoreValues);
    const tenantScope = resolveStorePermissionScopeDocumentIdAliases([
        params.storeData.tenantId,
        params.storeData.tId,
    ]);
    return embeddedStoreScope?.documentId === params.storeDocumentId
        && tenantScope?.documentId === params.tenantDocumentId;
}
