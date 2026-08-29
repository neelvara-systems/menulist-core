import { canUserAccessStore, normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';

type RefreshedSession = {
    user?: Parameters<typeof canUserAccessStore>[0]['sessionUser'];
} | null;

type RefreshedFirebaseClaims = {
    ready: boolean;
    claims?: Record<string, unknown>;
};

type RefreshFirebaseClaims = () => Promise<RefreshedFirebaseClaims>;

export const refreshCreatedOutletSessionAccess = async (
    refreshSession: () => Promise<RefreshedSession>,
    storeId: unknown,
    refreshFirebaseClaims?: RefreshFirebaseClaims,
): Promise<boolean> => {
    const normalizedStoreId = normalizeStoreSwitchStoreId(storeId);
    if (!normalizedStoreId) return false;

    const refreshedSession = await refreshSession();
    const sessionHasAccess = Boolean(
        refreshedSession?.user
        && canUserAccessStore({
            sessionUser: refreshedSession.user,
            storeId: normalizedStoreId,
        }),
    );
    if (!sessionHasAccess) return false;

    const refreshClaims = refreshFirebaseClaims || (async () => {
        const { refreshFirebaseAuthClaims } = await import('@lib/auth/firebaseAuthSync');
        return refreshFirebaseAuthClaims();
    });
    const refreshedClaims = await refreshClaims();
    return Boolean(
        refreshedClaims.ready
        && canUserAccessStore({
            allowPlatformAllStores: false,
            sessionUser: refreshedClaims.claims,
            storeId: normalizedStoreId,
        }),
    );
};
