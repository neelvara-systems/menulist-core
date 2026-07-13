import {
    normalizeStorePermissionScopeDocumentId,
    type StorePermissionScopeDocumentId,
} from '@lib/permissions/server';

export type SetClaimsWorkspace = {
    storeScope: StorePermissionScopeDocumentId;
    tenantScope: StorePermissionScopeDocumentId;
};

export const resolveSetClaimsWorkspaceFromStore = (params: {
    dbUserTenantId: unknown;
    hasPlatformAccess: boolean;
    storeData: FirebaseFirestore.DocumentData | undefined;
    storeDocumentId: unknown;
}): SetClaimsWorkspace | null => {
    const storeScope = normalizeStorePermissionScopeDocumentId(params.storeDocumentId);
    const storedStoreScope = normalizeStorePermissionScopeDocumentId(
        params.storeData?.storeId ?? params.storeDocumentId,
    );
    const tenantScope = normalizeStorePermissionScopeDocumentId(params.storeData?.tenantId);
    const userTenantScope = normalizeStorePermissionScopeDocumentId(params.dbUserTenantId);
    if (
        !storeScope
        || !storedStoreScope
        || storedStoreScope.documentId !== storeScope.documentId
        || !tenantScope
        || params.storeData?.active === false
        || params.storeData?.authDisabled === true
        || params.storeData?.blocked === true
        || params.storeData?.deleted === true
    ) {
        return null;
    }
    if (!params.hasPlatformAccess && userTenantScope?.documentId !== tenantScope.documentId) {
        return null;
    }
    return { storeScope, tenantScope };
};

export const firebaseClaimsMatchTargetStore = (
    claims: Record<string, unknown> | undefined,
    targetStoreId: unknown,
): boolean => {
    const targetStoreScope = normalizeStorePermissionScopeDocumentId(targetStoreId);
    if (
        !targetStoreScope
        || typeof claims?.tenantId !== 'string'
        || typeof claims?.storeId !== 'string'
        || typeof claims?.admin !== 'boolean'
        || !Array.isArray(claims?.storeIds)
        || claims.storeId !== targetStoreScope.documentId
    ) {
        return false;
    }
    return claims.storeIds.some((storeId) => (
        normalizeStorePermissionScopeDocumentId(storeId)?.documentId === targetStoreScope.documentId
    ));
};
