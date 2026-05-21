import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { PRODUCT_IDS } from "@constant/product";
import { getCanonicaScopedSession, isCanonicaRuntimeRoute } from "@lib/canonica/sessionScope";
import { syncCanonicaAuthWithCustomToken } from "@lib/firebase/syncCanonicaAuth";
import { applyActiveStoreContextToSession } from "@lib/multiOutlet/activeStoreContext";
import { signInWithCustomToken, type IdTokenResult } from "firebase/auth";

type FirebaseAuthSyncResult = {
    ready: boolean;
    claims?: Record<string, unknown>;
};

let syncRequest: Promise<FirebaseAuthSyncResult> | null = null;
let syncRequestKey = "";

const FIREBASE_AUTH_NETWORK_RETRY_CODES = new Set(['auth/network-request-failed']);
const FIREBASE_AUTH_RETRY_DELAYS_MS = [750, 1500];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runFirebaseAuthNetworkOperation<T>(
    label: string,
    operation: () => Promise<T>,
): Promise<T> {
    for (let attempt = 0; attempt <= FIREBASE_AUTH_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
            return await operation();
        } catch (error: any) {
            const canRetry = FIREBASE_AUTH_NETWORK_RETRY_CODES.has(error?.code) && attempt < FIREBASE_AUTH_RETRY_DELAYS_MS.length;
            if (!canRetry) throw error;

            if (process.env.NODE_ENV !== 'production') {
                console.warn('[MenuList] Firebase Auth network retry', {
                    attempt: attempt + 1,
                    code: error?.code,
                    operation: label,
                });
            }
            await wait(FIREBASE_AUTH_RETRY_DELAYS_MS[attempt]);
        }
    }

    throw new Error(`Firebase Auth operation failed: ${label}`);
}

const normalizeClaimValue = (value: unknown) => (
    value === null || value === undefined ? "" : String(value)
);

const claimsUseCanonicalTenantStoreTypes = (claims: Record<string, unknown> | undefined) => (
    typeof claims?.tenantId === 'string'
    && typeof claims?.storeId === 'string'
    && typeof claims?.admin === 'boolean'
    && Array.isArray(claims?.storeIds)
);

const getSessionTenantId = (session: any) => (
    session?.user?.tenantId ?? session?.tId ?? null
);

const getSessionStoreId = (session: any) => (
    session?.user?.storeId ?? session?.sId ?? null
);

const claimsMatchSessionStore = (claims: Record<string, unknown> | undefined, session: any) => {
    const tenantId = getSessionTenantId(session);
    const storeId = getSessionStoreId(session);

    if (tenantId === null || tenantId === undefined || storeId === null || storeId === undefined) {
        return true;
    }

    return claimsUseCanonicalTenantStoreTypes(claims)
        && normalizeClaimValue(claims?.tenantId) === normalizeClaimValue(tenantId)
        && normalizeClaimValue(claims?.storeId) === normalizeClaimValue(storeId);
};

const sameEmail = (left?: string | null, right?: string | null) => (
    String(left || "").toLowerCase().trim() === String(right || "").toLowerCase().trim()
);

const shouldUseCanonicaScope = () => (
    typeof window !== "undefined"
    && isCanonicaRuntimeRoute(window.location.pathname, window.location.hostname)
);

const getEffectiveSessionForFirebaseAuth = (session: any) => {
    const outletScopedSession = typeof window === "undefined"
        ? session
        : applyActiveStoreContextToSession(session);

    return shouldUseCanonicaScope()
        ? getCanonicaScopedSession(outletScopedSession)
        : outletScopedSession;
};

async function runFirebaseAuthSync(session: any): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!session?.user?.email) return { ready: false };

    const tenantId = getSessionTenantId(session);
    const storeId = getSessionStoreId(session);
    if (tenantId === null || tenantId === undefined || storeId === null || storeId === undefined) {
        return { ready: true };
    }

    const currentUser = firebaseAuth.currentUser;
    let canRefreshCurrentUser = false;
    if (currentUser) {
        try {
            const currentToken = await currentUser.getIdTokenResult();
            if (claimsMatchSessionStore(currentToken.claims, session)) {
                return { ready: true, claims: currentToken.claims };
            }
            canRefreshCurrentUser = sameEmail(currentUser.email, session.user.email);
        } catch (error: any) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[MenuList] Firebase Auth token check failed; requesting a fresh token from the active session.', {
                    code: error?.code || error?.name || 'unknown',
                });
            }
        }
    }

    const response = await fetch("/api/auth/set-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...(canRefreshCurrentUser && currentUser ? { uid: currentUser.uid } : {}),
            targetStoreId: Number(storeId),
            ...(shouldUseCanonicaScope() ? { productId: PRODUCT_IDS.CANONICA } : {}),
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to sync Firebase Auth: ${response.status}`);
    }

    const data = await response.json();

    if (data.customToken) {
        await runFirebaseAuthNetworkOperation(
            'custom-token sign-in',
            () => signInWithCustomToken(firebaseAuth, data.customToken),
        );
    } else if (firebaseAuth.currentUser) {
        await runFirebaseAuthNetworkOperation(
            'current-user token refresh',
            () => firebaseAuth.currentUser!.getIdToken(true),
        );
    } else {
        throw new Error("Firebase Auth sync did not return a custom token");
    }

    await syncCanonicaAuthWithCustomToken(data.canonicaCustomToken);

    const refreshedToken = await runFirebaseAuthNetworkOperation<IdTokenResult | undefined>(
        'current-user token result refresh',
        () => firebaseAuth.currentUser?.getIdTokenResult(true) || Promise.resolve(undefined),
    );
    if (!claimsMatchSessionStore(refreshedToken?.claims, session)) {
        throw new Error("Firebase Auth claims do not match the current store");
    }

    return { ready: true, claims: refreshedToken?.claims };
}

export async function refreshFirebaseAuthClaims(targetStoreId?: number | null): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!firebaseAuth?.currentUser) return { ready: false };

    const response = await fetch("/api/auth/set-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uid: firebaseAuth.currentUser.uid,
            ...(targetStoreId ? { targetStoreId } : {}),
            ...(shouldUseCanonicaScope() ? { productId: PRODUCT_IDS.CANONICA } : {}),
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh Firebase Auth claims: ${response.status}`);
    }

    const data = await response.json();

    if (data.customToken) {
        await runFirebaseAuthNetworkOperation(
            'custom-token sign-in',
            () => signInWithCustomToken(firebaseAuth, data.customToken),
        );
    } else {
        await runFirebaseAuthNetworkOperation(
            'current-user token refresh',
            () => firebaseAuth.currentUser!.getIdToken(true),
        );
    }

    await syncCanonicaAuthWithCustomToken(data.canonicaCustomToken);

    const refreshedToken = await runFirebaseAuthNetworkOperation<IdTokenResult | undefined>(
        'current-user token result refresh',
        () => firebaseAuth.currentUser?.getIdTokenResult(true) || Promise.resolve(undefined),
    );

    return { ready: true, claims: refreshedToken?.claims };
}

export function ensureFirebaseAuthForSession(session: any): Promise<FirebaseAuthSyncResult> {
    const effectiveSession = getEffectiveSessionForFirebaseAuth(session);
    const tenantId = getSessionTenantId(effectiveSession);
    const storeId = getSessionStoreId(effectiveSession);
    const currentUid = firebaseAuth?.currentUser?.uid || "none";
    const nextKey = [
        effectiveSession?.user?.email || "no-email",
        tenantId ?? "no-tenant",
        storeId ?? "no-store",
        currentUid,
    ].join(":");

    if (syncRequest && syncRequestKey === nextKey) {
        return syncRequest;
    }

    syncRequestKey = nextKey;
    syncRequest = runFirebaseAuthSync(effectiveSession).finally(() => {
        syncRequest = null;
        syncRequestKey = "";
    });

    return syncRequest;
}
