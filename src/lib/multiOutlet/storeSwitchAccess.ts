import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';

type SessionStoreMapping = {
    storeId?: number | string | null;
    role?: string | null;
    name?: string | null;
};

type SessionUserWithStores = {
    platformRole?: string | null;
    storeId?: number | string | null;
    storeIds?: Array<number | string | null> | null;
    stores?: SessionStoreMapping[] | null;
};

type StoreSummary = Record<string, any> & {
    active?: boolean;
    storeId?: number | string | null;
    storeDetails?: {
        active?: boolean;
        storeId?: number | string | null;
    } | null;
};

type TenantWithStoresList = {
    storesList?: StoreSummary[] | null;
} | null | undefined;

const toStoreId = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export const getStoreSummaryId = (store: StoreSummary | null | undefined): number | null => {
    return toStoreId(store?.storeId ?? store?.storeDetails?.storeId);
};

export const isPlatformStoreAccessUser = (sessionUser: SessionUserWithStores | null | undefined): boolean => {
    return sessionUser?.platformRole === ECOMSAI_PLATFORM_USER_ROLE;
};

export const getMappedStoreIdsForUser = (
    sessionUser: SessionUserWithStores | null | undefined,
): Set<number> => {
    const mappedStoreIds = new Set<number>();

    const loginStoreId = toStoreId(sessionUser?.storeId);
    if (loginStoreId) mappedStoreIds.add(loginStoreId);

    if (Array.isArray(sessionUser?.storeIds)) {
        sessionUser.storeIds.forEach((storeId) => {
            const mappedStoreId = toStoreId(storeId);
            if (mappedStoreId) mappedStoreIds.add(mappedStoreId);
        });
    }

    if (Array.isArray(sessionUser?.stores)) {
        sessionUser.stores.forEach((store) => {
            const mappedStoreId = toStoreId(store?.storeId);
            if (mappedStoreId) mappedStoreIds.add(mappedStoreId);
        });
    }

    return mappedStoreIds;
};

export const canUserAccessStore = ({
    allowPlatformAllStores = true,
    sessionUser,
    storeId,
}: {
    allowPlatformAllStores?: boolean;
    sessionUser: SessionUserWithStores | null | undefined;
    storeId: unknown;
}): boolean => {
    const targetStoreId = toStoreId(storeId);
    if (!targetStoreId) return false;
    if (allowPlatformAllStores && isPlatformStoreAccessUser(sessionUser)) return true;
    return getMappedStoreIdsForUser(sessionUser).has(targetStoreId);
};

export const getAccessibleStoreSummaries = ({
    includeInactive = false,
    sessionUser,
    tenantDetails,
}: {
    includeInactive?: boolean;
    sessionUser: SessionUserWithStores | null | undefined;
    tenantDetails: TenantWithStoresList;
}): StoreSummary[] => {
    const storesList = Array.isArray(tenantDetails?.storesList) ? tenantDetails.storesList : [];
    if (!storesList.length) return [];

    const isPlatformUser = isPlatformStoreAccessUser(sessionUser);
    const mappedStoreIds = getMappedStoreIdsForUser(sessionUser);

    return storesList.filter((store) => {
        const storeId = getStoreSummaryId(store);
        if (!storeId) return false;

        const isActive = store?.active !== false && store?.storeDetails?.active !== false;
        if (!includeInactive && !isActive) return false;

        return isPlatformUser || mappedStoreIds.has(storeId);
    });
};
