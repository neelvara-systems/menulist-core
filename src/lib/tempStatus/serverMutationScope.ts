import { resolveStorePermissionScopeDocumentIdAliases } from '@lib/permissions/scopeDocumentId';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';

type TempStatusMutationEntity = Record<string, unknown>;

const isUnavailableEntity = (entity: TempStatusMutationEntity): boolean => (
    entity.active === false
    || entity.deleted === true
    || isPlatformEntityBlocked(entity)
);

export function isTempStatusMutationScopeCurrent(params: {
    store: unknown;
    tenant: unknown;
    tenantDocumentId: string;
}): boolean {
    if (
        !params.store
        || typeof params.store !== 'object'
        || Array.isArray(params.store)
        || !params.tenant
        || typeof params.tenant !== 'object'
        || Array.isArray(params.tenant)
    ) {
        return false;
    }

    const store = params.store as TempStatusMutationEntity;
    const tenant = params.tenant as TempStatusMutationEntity;
    const persistedTenantScope = resolveStorePermissionScopeDocumentIdAliases([
        store.tenantId,
        store.tId,
    ]);

    return persistedTenantScope?.documentId === params.tenantDocumentId
        && !isUnavailableEntity(store)
        && !isUnavailableEntity(tenant);
}
