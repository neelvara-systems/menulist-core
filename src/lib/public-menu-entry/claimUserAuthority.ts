import { isCurrentUserRecordEligible } from '@lib/auth/currentPlatformUser';
import { normalizeAuthSessionStoreScope, type AuthSessionStoreMapping } from '@lib/auth/sessionUserBoundary';

type PublicMenuClaimUserAuthority = {
    role: string;
    storeIds: number[];
    stores: AuthSessionStoreMapping[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

/**
 * Projects the current persisted user into the smallest authority context used
 * by an existing-account public-menu claim. Session scope selects the target;
 * the locked user document must independently confirm identity, lifecycle,
 * revocation state, tenant/store scope, and the exact current store role.
 */
export function resolvePublicMenuClaimUserAuthority(params: {
    documentId: string;
    expectedStoreId: number;
    expectedTenantId: number;
    session: unknown;
    userData: unknown;
}): PublicMenuClaimUserAuthority | null {
    if (
        !isRecord(params.userData)
        || !isCurrentUserRecordEligible({
            documentId: params.documentId,
            session: params.session,
            userData: params.userData,
        })
    ) {
        return null;
    }

    const scope = normalizeAuthSessionStoreScope(params.userData);
    if (
        scope.tenantId !== params.expectedTenantId
        || scope.storeId !== params.expectedStoreId
    ) {
        return null;
    }

    const mapping = scope.stores.find((candidate) => (
        candidate.storeId === params.expectedStoreId
        && candidate.role.length > 0
    ));
    if (!mapping) return null;

    return {
        role: mapping.role,
        storeIds: scope.storeIds,
        stores: scope.stores,
    };
}
