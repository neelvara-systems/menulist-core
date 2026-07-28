import { resolvePosSyncNumericDocumentIdAliases } from '@lib/posSync/posSyncDocumentId';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';

type PosSyncScopeEntity = Record<string, unknown>;

const isUnavailable = (entity: PosSyncScopeEntity): boolean => (
    entity.active === false
    || entity.deleted === true
    || isPlatformEntityBlocked(entity)
);

export function isPosSyncSecretScopeCurrent(params: {
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
    const store = params.store as PosSyncScopeEntity;
    const tenant = params.tenant as PosSyncScopeEntity;
    const persistedTenant = resolvePosSyncNumericDocumentIdAliases([
        store.tenantId,
        store.tId,
    ]);

    return persistedTenant?.documentId === params.tenantDocumentId
        && !isUnavailable(store)
        && !isUnavailable(tenant);
}
