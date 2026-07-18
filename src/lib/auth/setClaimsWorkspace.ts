import {
    normalizeStorePermissionScopeDocumentId,
    type StorePermissionScopeDocumentId,
} from '@lib/permissions/scopeDocumentId';

export type SetClaimsWorkspace = {
    storeScope: StorePermissionScopeDocumentId;
    tenantScope: StorePermissionScopeDocumentId;
};

const SET_CLAIMS_ROLE_MAX_LENGTH = 64;

/**
 * A store membership must carry its own role before it can become a Firebase
 * claim. Platform/support sessions retain their separate platformRole claim,
 * but a missing store role must never default a normal member to owner.
 */
export const resolveSetClaimsRole = (params: {
    hasPlatformAccess: boolean;
    userRole: unknown;
}): string | null => {
    if (typeof params.userRole !== 'string') {
        return params.hasPlatformAccess ? 'staff' : null;
    }
    const role = params.userRole.trim();
    if (!role || role !== params.userRole || role.length > SET_CLAIMS_ROLE_MAX_LENGTH) {
        return params.hasPlatformAccess ? 'staff' : null;
    }
    if (!params.hasPlatformAccess && role.toUpperCase() === 'PLATFORM') {
        return null;
    }
    return role;
};

export const resolveSetClaimsWorkspaceFromStore = (params: {
    dbUserTenantId: unknown;
    hasPlatformAccess: boolean;
    storeData: Record<string, unknown> | undefined;
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
