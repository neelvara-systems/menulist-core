import { resolveStorePermissionScopeDocumentIdAliases } from '@lib/permissions/scopeDocumentId';

export type AccessStatusScopeResolution =
    | { state: 'absent' }
    | { state: 'invalid' }
    | { documentId: string; state: 'resolved' };

const presentValues = (values: readonly unknown[]): unknown[] => (
    values.filter((value) => value !== undefined && value !== null && value !== '')
);

export function resolveAccessStatusPreferredScope(
    persistedValues: readonly unknown[],
    sessionValues: readonly unknown[],
): AccessStatusScopeResolution {
    const persisted = presentValues(persistedValues);
    const supplied = persisted.length > 0 ? persisted : presentValues(sessionValues);
    if (supplied.length === 0) return { state: 'absent' };

    const scope = resolveStorePermissionScopeDocumentIdAliases(supplied);
    return scope
        ? { documentId: scope.documentId, state: 'resolved' }
        : { state: 'invalid' };
}

export function isAccessStatusEntityIdentityConsistent(
    entity: Record<string, unknown> | null,
    documentId: string | null,
    aliases: readonly string[],
): boolean {
    if (!entity || !documentId) return false;
    const values = presentValues(aliases.map((alias) => entity[alias]));
    if (values.length === 0) return true;
    return resolveStorePermissionScopeDocumentIdAliases(values)?.documentId === documentId;
}

export function isAccessStatusStoreOwnedByTenant(
    storeData: Record<string, unknown> | null,
    tenantDocumentId: string | null,
): boolean {
    if (!storeData || !tenantDocumentId) return false;
    return resolveStorePermissionScopeDocumentIdAliases([
        storeData.tenantId,
        storeData.tId,
    ])?.documentId === tenantDocumentId;
}
