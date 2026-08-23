import { PRODUCT_IDS } from '@constant/product';

type AnswerlatticeAuthScope = {
    storeId: string;
    tenantId: string;
};

export function answerlatticeClaimsMatchSessionScope(
    claims: Record<string, unknown> | undefined,
    scope: AnswerlatticeAuthScope,
): boolean {
    return claims?.pId === PRODUCT_IDS.ANSWERLATTICE
        && typeof claims.tenantId === 'string'
        && typeof claims.storeId === 'string'
        && typeof claims.admin === 'boolean'
        && Array.isArray(claims.storeIds)
        && claims.tenantId === scope.tenantId
        && claims.storeId === scope.storeId
        && claims.storeIds.every((storeId) => typeof storeId === 'string')
        && claims.storeIds.includes(scope.storeId);
}
