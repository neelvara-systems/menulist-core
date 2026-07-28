import {
    normalizeOwnerNotificationNumericScopeAliases,
    normalizeOwnerNotificationNumericScopeDocumentId,
} from '../sharedData/ownerNotificationDeliveryBoundary';

const MAX_CALLABLE_STORE_IDS = 500;

export interface CallableTenantStoreScope {
    tenantId: string;
    directStoreId: string | null;
    storeIds: readonly string[];
}

export function parseCallableTenantStoreScope(
    token: Record<string, unknown>,
): CallableTenantStoreScope | null {
    const tenantScope = normalizeOwnerNotificationNumericScopeAliases([
        token.tenantId,
        token.tId,
    ]);
    if (!tenantScope) return null;

    const directAliases = [token.storeId, token.sId];
    const hasDirectAlias = directAliases.some((value) => value !== undefined && value !== null);
    const directStoreScope = hasDirectAlias
        ? normalizeOwnerNotificationNumericScopeAliases(directAliases)
        : null;
    if (hasDirectAlias && !directStoreScope) return null;

    if (
        token.storeIds !== undefined
        && (!Array.isArray(token.storeIds) || token.storeIds.length > MAX_CALLABLE_STORE_IDS)
    ) return null;
    const storeIds: string[] = [];
    for (const value of Array.isArray(token.storeIds) ? token.storeIds : []) {
        const scope = normalizeOwnerNotificationNumericScopeDocumentId(value);
        if (!scope) return null;
        if (!storeIds.includes(scope.documentId)) storeIds.push(scope.documentId);
    }
    if (!directStoreScope && storeIds.length === 0) return null;

    return {
        tenantId: tenantScope.documentId,
        directStoreId: directStoreScope?.documentId ?? null,
        storeIds,
    };
}

export function hasCallableTenantStoreAccess(
    token: Record<string, unknown>,
    tenantId: unknown,
    storeId: unknown,
): boolean {
    const scope = parseCallableTenantStoreScope(token);
    const requestedTenant = normalizeOwnerNotificationNumericScopeDocumentId(tenantId);
    const requestedStore = normalizeOwnerNotificationNumericScopeDocumentId(storeId);
    return Boolean(
        scope
        && requestedTenant
        && requestedStore
        && scope.tenantId === requestedTenant.documentId
        && (
            scope.directStoreId === requestedStore.documentId
            || scope.storeIds.includes(requestedStore.documentId)
        )
    );
}
