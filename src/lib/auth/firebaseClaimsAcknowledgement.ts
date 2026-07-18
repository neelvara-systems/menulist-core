import { normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';

export const firebaseClaimsMatchTargetStore = (
    claims: Record<string, unknown> | undefined,
    targetStoreId: unknown,
): boolean => {
    const normalizedTargetStoreId = normalizeStoreSwitchStoreId(targetStoreId);
    if (
        !normalizedTargetStoreId
        || typeof claims?.tenantId !== 'string'
        || typeof claims?.storeId !== 'string'
        || typeof claims?.admin !== 'boolean'
        || !Array.isArray(claims?.storeIds)
        || claims.storeId !== String(normalizedTargetStoreId)
    ) {
        return false;
    }
    return claims.storeIds.some((storeId) => (
        normalizeStoreSwitchStoreId(storeId) === normalizedTargetStoreId
    ));
};
