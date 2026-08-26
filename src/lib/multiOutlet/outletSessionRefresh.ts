import { canUserAccessStore, normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';

type RefreshedSession = {
    user?: Parameters<typeof canUserAccessStore>[0]['sessionUser'];
} | null;

export const refreshCreatedOutletSessionAccess = async (
    refreshSession: () => Promise<RefreshedSession>,
    storeId: unknown,
): Promise<boolean> => {
    const normalizedStoreId = normalizeStoreSwitchStoreId(storeId);
    if (!normalizedStoreId) return false;

    const refreshedSession = await refreshSession();
    return Boolean(
        refreshedSession?.user
        && canUserAccessStore({
            sessionUser: refreshedSession.user,
            storeId: normalizedStoreId,
        }),
    );
};
