import type LoginUserType from "@type/loginUser";
import {
    canUserAccessStore,
    normalizeStoreSwitchStoreId,
} from "@lib/multiOutlet/storeSwitchAccess";

export const ACTIVE_STORE_CONTEXT_STORAGE_KEY = "activeStoreContext";

export type ActiveStoreContextValue = {
    baseStoreId: number;
    storeId: number;
    tenantId: number;
};

export const normalizeActiveStoreContextValue = (value: unknown): ActiveStoreContextValue | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Partial<ActiveStoreContextValue>;
    if (
        typeof candidate.storeId !== "number"
        || typeof candidate.baseStoreId !== "number"
        || typeof candidate.tenantId !== "number"
    ) return null;
    const storeId = normalizeStoreSwitchStoreId(candidate.storeId);
    const baseStoreId = normalizeStoreSwitchStoreId(candidate.baseStoreId);
    const tenantId = normalizeStoreSwitchStoreId(candidate.tenantId);
    if (!storeId || !baseStoreId || !tenantId) return null;
    return { baseStoreId, storeId, tenantId };
};

const readActiveStoreContextValue = (): ActiveStoreContextValue | null => {
    if (typeof window === "undefined") return null;

    try {
        const stored = window.localStorage.getItem(ACTIVE_STORE_CONTEXT_STORAGE_KEY);
        if (!stored) return null;

        const legacyStoreId = normalizeStoreSwitchStoreId(stored);
        if (legacyStoreId) {
            return { baseStoreId: 0, storeId: legacyStoreId, tenantId: 0 };
        }

        return normalizeActiveStoreContextValue(JSON.parse(stored));
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
            const targetStoreId = normalizeStoreSwitchStoreId(storeId);
            const baseStoreId = normalizeStoreSwitchStoreId(owner?.baseStoreId);
            const tenantId = normalizeStoreSwitchStoreId(owner?.tenantId);

            if (targetStoreId && baseStoreId && tenantId) {
                window.localStorage.setItem(
                    ACTIVE_STORE_CONTEXT_STORAGE_KEY,
                    JSON.stringify({ baseStoreId, storeId: targetStoreId, tenantId }),
                );
            } else {
                window.localStorage.removeItem(ACTIVE_STORE_CONTEXT_STORAGE_KEY);
            }
        } else {
            window.localStorage.removeItem(ACTIVE_STORE_CONTEXT_STORAGE_KEY);
        }
    } catch {
        // Storage can be unavailable in private or embedded browser contexts.
    }
};

export const applyActiveStoreContextValueToSession = (
    session: LoginUserType | null,
    activeContext: ActiveStoreContextValue | null,
): LoginUserType | null => {
    const activeStoreId = activeContext?.storeId || null;
    if (!session || !activeStoreId || activeStoreId === session.sId) {
        return session;
    }

    const loginTenantId = normalizeStoreSwitchStoreId(session.tId);
    const loginStoreId = normalizeStoreSwitchStoreId(session.sId);
    const userTenantId = normalizeStoreSwitchStoreId(session.user?.tenantId);
    const userStoreId = normalizeStoreSwitchStoreId(session.user?.storeId);
    const contextMatchesLoginStore =
        Boolean(loginTenantId && loginStoreId && userTenantId && userStoreId)
        && loginTenantId === userTenantId
        && loginStoreId === userStoreId
        && activeContext?.tenantId === loginTenantId
        && activeContext?.baseStoreId === loginStoreId
        && canUserAccessStore({ sessionUser: session.user, storeId: activeStoreId });

    if (!contextMatchesLoginStore) {
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

export const applyActiveStoreContextToSession = (
    session: LoginUserType | null,
): LoginUserType | null => {
    const activeContext = readActiveStoreContextValue();
    const scopedSession = applyActiveStoreContextValueToSession(session, activeContext);
    if (activeContext && scopedSession === session && activeContext.storeId !== session?.sId) {
        writeActiveStoreContextId(null);
    }
    return scopedSession;
};
