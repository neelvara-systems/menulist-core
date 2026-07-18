export type ClaimAccountCacheScope = {
    storeId: number;
    tenantId: number;
};

export async function runClaimAccountCacheRevalidation(
    scope: ClaimAccountCacheScope,
    dependencies: {
        onFailure: (error: unknown) => void;
        revalidate: (storeId: number, tenantId: number) => Promise<void>;
    },
): Promise<boolean> {
    try {
        await dependencies.revalidate(scope.storeId, scope.tenantId);
        return true;
    } catch (error) {
        dependencies.onFailure(error);
        return false;
    }
}
