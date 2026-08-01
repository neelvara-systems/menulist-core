import { resolveStorePermissionScopeDocumentIdAliases } from '@lib/permissions/scopeDocumentId';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';

type TempStatusMutationEntity = Record<string, unknown>;

const isOptionalBoolean = (value: unknown): boolean => (
    value === undefined || typeof value === 'boolean'
);

const hasValidLifecycleState = (entity: TempStatusMutationEntity): boolean => {
    if (
        !isOptionalBoolean(entity.active)
        || !isOptionalBoolean(entity.deleted)
        || !isOptionalBoolean(entity.blocked)
        || !isOptionalBoolean(entity.tenantBlocked)
    ) {
        return false;
    }
    if (entity.blockDetails === undefined) return true;
    if (!entity.blockDetails || typeof entity.blockDetails !== 'object' || Array.isArray(entity.blockDetails)) {
        return false;
    }
    return isOptionalBoolean((entity.blockDetails as Record<string, unknown>).blocked);
};

const isUnavailableEntity = (entity: TempStatusMutationEntity): boolean => (
    !hasValidLifecycleState(entity)
    || entity.active === false
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
