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

const resolveStorePermissionSessionScopeAlias = (
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
        tId?: unknown;
        user?: { storeId?: unknown; tenantId?: unknown } | null;
    };
    const tenantScope = resolveStorePermissionSessionScopeAlias([
        source.tId,
        source.user?.tenantId,
    ]);
    const storeScope = resolveStorePermissionSessionScopeAlias([
        source.sId,
        source.user?.storeId,
    ]);

    return tenantScope && storeScope ? { storeScope, tenantScope } : null;
}
