import type LoginUserType from "@type/loginUser";

export const ACTIVE_STORE_CONTEXT_STORAGE_KEY = "activeStoreContext";

type ActiveStoreContextValue = {
    baseStoreId: number;
    storeId: number;
    tenantId: number;
};

const normalizeStoreId = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const readActiveStoreContextValue = (): ActiveStoreContextValue | null => {
    if (typeof window === "undefined") return null;

    try {
        const stored = window.localStorage.getItem(ACTIVE_STORE_CONTEXT_STORAGE_KEY);
        if (!stored) return null;

        const legacyStoreId = normalizeStoreId(stored);
        if (legacyStoreId) {
            return { baseStoreId: 0, storeId: legacyStoreId, tenantId: 0 };
        }

        const parsed = JSON.parse(stored) as Partial<ActiveStoreContextValue>;
        const storeId = normalizeStoreId(parsed.storeId);
        const baseStoreId = normalizeStoreId(parsed.baseStoreId);
        const tenantId = normalizeStoreId(parsed.tenantId);

        if (!storeId || !baseStoreId || !tenantId) return null;
        return { baseStoreId, storeId, tenantId };
    } catch {
        return null;
    }
};

export const readActiveStoreContextId = (): number | null => {
    return readActiveStoreContextValue()?.storeId || null;
};

export const writeActiveStoreContextId = (
    storeId: number | null,
    owner?: { baseStoreId?: number | null; tenantId?: number | null },
) => {
    if (typeof window === "undefined") return;

    try {
        if (storeId) {
            const baseStoreId = normalizeStoreId(owner?.baseStoreId);
            const tenantId = normalizeStoreId(owner?.tenantId);

            if (baseStoreId && tenantId) {
                window.localStorage.setItem(
                    ACTIVE_STORE_CONTEXT_STORAGE_KEY,
                    JSON.stringify({ baseStoreId, storeId, tenantId }),
                );
            } else {
                window.localStorage.setItem(ACTIVE_STORE_CONTEXT_STORAGE_KEY, String(storeId));
            }
        } else {
            window.localStorage.removeItem(ACTIVE_STORE_CONTEXT_STORAGE_KEY);
        }
    } catch {
        // Storage can be unavailable in private or embedded browser contexts.
    }
};

export const applyActiveStoreContextToSession = (
    session: LoginUserType | null,
): LoginUserType | null => {
    const activeContext = readActiveStoreContextValue();
    const activeStoreId = activeContext?.storeId || null;
    if (!session || !activeStoreId || activeStoreId === session.sId) {
        return session;
    }

    const contextMatchesLoginStore =
        activeContext?.tenantId === session.tId &&
        activeContext?.baseStoreId === session.sId;

    if (!contextMatchesLoginStore) {
        writeActiveStoreContextId(null);
        return session;
    }

    return {
        ...session,
        sId: activeStoreId,
        user: {
            ...session.user,
            storeId: activeStoreId,
        },
    };
};
