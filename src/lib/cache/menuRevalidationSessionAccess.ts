import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import {
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
} from '@lib/permissions/scopeDocumentId';

export type MenuRevalidationSessionAccess = {
    allowedStoreIds: ReadonlySet<string>;
    platformSession: boolean;
    tenantId?: string;
};

export function resolveMenuRevalidationSessionAccess(
    session: unknown,
): MenuRevalidationSessionAccess | null {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return null;
    const source = session as {
        platformRole?: unknown;
        user?: {
            platformRole?: unknown;
            storeIds?: unknown;
            stores?: unknown;
        } | null;
    };
    const platformRole = resolveExactSessionPlatformRole(source);
    if (platformRole === null) return null;
    if (platformRole === ECOMSAI_PLATFORM_USER_ROLE) {
        return { allowedStoreIds: new Set<string>(), platformSession: true };
    }

    const scope = resolveStorePermissionSessionScope(source);
    if (!scope) return null;
    const allowedStoreIds = new Set<string>([scope.storeScope.documentId]);
    const addStoreId = (value: unknown) => {
        const normalized = normalizeStorePermissionScopeDocumentId(value);
        if (normalized) allowedStoreIds.add(normalized.documentId);
    };
    if (Array.isArray(source.user?.storeIds)) {
        source.user.storeIds.forEach(addStoreId);
    }
    if (Array.isArray(source.user?.stores)) {
        source.user.stores.forEach((store) => {
            if (store && typeof store === 'object' && !Array.isArray(store)) {
                addStoreId((store as { storeId?: unknown }).storeId);
            }
        });
    }

    return {
        allowedStoreIds,
        platformSession: false,
        tenantId: scope.tenantScope.documentId,
    };
}

export function canMenuRevalidationSessionAccessStore(
    access: MenuRevalidationSessionAccess,
    storeId: string,
): boolean {
    return access.platformSession || access.allowedStoreIds.has(storeId);
}
