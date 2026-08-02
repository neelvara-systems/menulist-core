import { MENULIST_PLATFORM_USER_ROLE } from '@constant/user';

export type SessionStoreMapping = {
    storeId?: number | string | null;
    role?: string | null;
    name?: string | null;
};

export type SessionUserWithStores = {
    platformRole?: string | null;
    storeId?: number | string | null;
    storeIds?: Array<number | string | null> | null;
    stores?: SessionStoreMapping[] | null;
};

export type StoreSummary = Record<string, unknown> & {
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

export type StoreSwitchAttemptToken = number;

let activeStoreSwitchAttemptToken: StoreSwitchAttemptToken | null = null;
let nextStoreSwitchAttemptToken = 0;

/**
 * Claims one browser-wide store-switch attempt. Multiple switch controls can
 * be mounted together, but Firebase custom claims are process-global for the
 * signed-in browser user and must never be refreshed concurrently.
 */
export const claimStoreSwitchAttempt = (): StoreSwitchAttemptToken | null => {
    if (activeStoreSwitchAttemptToken !== null) return null;
    nextStoreSwitchAttemptToken += 1;
    activeStoreSwitchAttemptToken = nextStoreSwitchAttemptToken;
    return activeStoreSwitchAttemptToken;
};

export const releaseStoreSwitchAttempt = (token: StoreSwitchAttemptToken): boolean => {
    if (activeStoreSwitchAttemptToken !== token) return false;
    activeStoreSwitchAttemptToken = null;
    return true;
};

export const normalizeStoreSwitchStoreId = (value: unknown): number | null => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) && String(numeric) === raw ? numeric : null;
};

export const getStoreSummaryId = (store: StoreSummary | null | undefined): number | null => {
    return normalizeStoreSwitchStoreId(store?.storeId ?? store?.storeDetails?.storeId);
};

export const isPlatformStoreAccessUser = (sessionUser: SessionUserWithStores | null | undefined): boolean => {
    return sessionUser?.platformRole === MENULIST_PLATFORM_USER_ROLE;
};

export const getMappedStoreIdsForUser = (
    sessionUser: SessionUserWithStores | null | undefined,
): Set<number> => {
    const mappedStoreIds = new Set<number>();

    const loginStoreId = normalizeStoreSwitchStoreId(sessionUser?.storeId);
    if (loginStoreId) mappedStoreIds.add(loginStoreId);

    if (Array.isArray(sessionUser?.storeIds)) {
        sessionUser.storeIds.forEach((storeId) => {
            const mappedStoreId = normalizeStoreSwitchStoreId(storeId);
            if (mappedStoreId) mappedStoreIds.add(mappedStoreId);
        });
    }

    if (Array.isArray(sessionUser?.stores)) {
        sessionUser.stores.forEach((store) => {
            const mappedStoreId = normalizeStoreSwitchStoreId(store?.storeId);
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
    const targetStoreId = normalizeStoreSwitchStoreId(storeId);
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
