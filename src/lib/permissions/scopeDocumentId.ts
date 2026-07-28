import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export type StorePermissionScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export type StorePermissionSessionScope = {
    storeScope: StorePermissionScopeDocumentId;
    tenantScope: StorePermissionScopeDocumentId;
};

export function normalizeStorePermissionScopeDocumentId(
    value: unknown,
): StorePermissionScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export const resolveStorePermissionScopeDocumentIdAliases = (
    values: unknown[],
): StorePermissionScopeDocumentId | null => {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;

    const normalized = supplied.map(normalizeStorePermissionScopeDocumentId);
    const [first] = normalized;
    return first && normalized.every((scope) => scope?.numericId === first.numericId)
        ? first
        : null;
};

export function resolveStorePermissionSessionScope(
    session: unknown,
): StorePermissionSessionScope | null {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return null;
    const source = session as {
        sId?: unknown;
        storeId?: unknown;
        tId?: unknown;
        tenantId?: unknown;
        user?: {
            sId?: unknown;
            storeId?: unknown;
            tId?: unknown;
            tenantId?: unknown;
        } | null;
    };
    const tenantScope = resolveStorePermissionScopeDocumentIdAliases([
        source.tId,
        source.tenantId,
        source.user?.tId,
        source.user?.tenantId,
    ]);
    const storeScope = resolveStorePermissionScopeDocumentIdAliases([
        source.sId,
        source.storeId,
        source.user?.sId,
        source.user?.storeId,
    ]);

    return tenantScope && storeScope ? { storeScope, tenantScope } : null;
}

export function isStorePermissionDataInScope(
    storeData: unknown,
    storeScope: StorePermissionScopeDocumentId,
    tenantScope: StorePermissionScopeDocumentId,
): boolean {
    if (!storeData || typeof storeData !== 'object' || Array.isArray(storeData)) return false;
    const data = storeData as {
        sId?: unknown;
        storeId?: unknown;
        tId?: unknown;
        tenantId?: unknown;
    };
    const persistedTenantScope = resolveStorePermissionScopeDocumentIdAliases([
        data.tenantId,
        data.tId,
    ]);
    const embeddedStoreAliases = [data.storeId, data.sId]
        .filter((value) => value !== undefined && value !== null);
    const embeddedStoreScope = embeddedStoreAliases.length > 0
        ? resolveStorePermissionScopeDocumentIdAliases(embeddedStoreAliases)
        : storeScope;
    return persistedTenantScope?.numericId === tenantScope.numericId
        && embeddedStoreScope?.numericId === storeScope.numericId;
}
