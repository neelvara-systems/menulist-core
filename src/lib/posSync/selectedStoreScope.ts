import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { canUserAccessStore } from '@lib/multiOutlet/storeSwitchAccess';
import {
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
    type StorePermissionScopeDocumentId,
} from '@lib/permissions/scopeDocumentId';

export type PosSyncSelectedStoreScopeResolution =
    | { ok: false; reason: 'forbidden' | 'invalid_request' | 'not_onboarded' }
    | {
        ok: true;
        storeScope: StorePermissionScopeDocumentId;
        tenantScope: StorePermissionScopeDocumentId;
    };

export function resolvePosSyncSelectedStoreScope(
    session: any,
    requestedStoreId: unknown,
    requestedTenantId: unknown,
): PosSyncSelectedStoreScopeResolution {
    const sessionScope = resolveStorePermissionSessionScope(session);
    if (!sessionScope) return { ok: false, reason: 'not_onboarded' };

    const storeScope = normalizeStorePermissionScopeDocumentId(requestedStoreId);
    const tenantScope = normalizeStorePermissionScopeDocumentId(requestedTenantId);
    if (!storeScope || !tenantScope) return { ok: false, reason: 'invalid_request' };
    if (tenantScope.numericId !== sessionScope.tenantScope.numericId) {
        return { ok: false, reason: 'forbidden' };
    }

    const canAccessRequestedStore = storeScope.numericId === sessionScope.storeScope.numericId
        || canUserAccessStore({
            sessionUser: {
                ...(session?.user || {}),
                platformRole: resolveExactSessionPlatformRole(session) || undefined,
                storeId: session?.user?.storeId || sessionScope.storeScope.numericId,
                storeIds: session?.user?.storeIds || session?.storeIds,
                stores: session?.user?.stores || session?.stores,
            },
            storeId: storeScope.numericId,
        });
    if (!canAccessRequestedStore) return { ok: false, reason: 'forbidden' };

    return { ok: true, storeScope, tenantScope };
}
