import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';

export type FirebaseAuthSessionScopeState =
    | { status: 'absent' }
    | { status: 'invalid' }
    | { status: 'valid'; storeId: string; tenantId: string };

export function resolveFirebaseAuthSessionScopeState(
    session: unknown,
): FirebaseAuthSessionScopeState {
    if (!session || typeof session !== 'object' || Array.isArray(session)) {
        return { status: 'absent' };
    }
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
    const supplied = [
        source.tId,
        source.tenantId,
        source.user?.tId,
        source.user?.tenantId,
        source.sId,
        source.storeId,
        source.user?.sId,
        source.user?.storeId,
    ].filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return { status: 'absent' };

    const scope = resolveStorePermissionSessionScope(source);
    return scope
        ? {
            status: 'valid',
            storeId: scope.storeScope.documentId,
            tenantId: scope.tenantScope.documentId,
        }
        : { status: 'invalid' };
}
