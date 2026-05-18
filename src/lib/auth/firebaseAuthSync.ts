import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { syncCanonicaAuthWithCustomToken } from "@lib/firebase/syncCanonicaAuth";
import { signInWithCustomToken } from "firebase/auth";

type FirebaseAuthSyncResult = {
    ready: boolean;
    claims?: Record<string, unknown>;
};

let syncRequest: Promise<FirebaseAuthSyncResult> | null = null;
let syncRequestKey = "";

const normalizeClaimValue = (value: unknown) => (
    value === null || value === undefined ? "" : String(value)
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

    return normalizeClaimValue(claims?.tenantId) === normalizeClaimValue(tenantId)
        && normalizeClaimValue(claims?.storeId) === normalizeClaimValue(storeId);
};

const sameEmail = (left?: string | null, right?: string | null) => (
    String(left || "").toLowerCase().trim() === String(right || "").toLowerCase().trim()
);

async function runFirebaseAuthSync(session: any): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!session?.user?.email) return { ready: false };

    const tenantId = getSessionTenantId(session);
    const storeId = getSessionStoreId(session);
    if (tenantId === null || tenantId === undefined || storeId === null || storeId === undefined) {
        return { ready: true };
    }

    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
        const currentToken = await currentUser.getIdTokenResult();
        if (claimsMatchSessionStore(currentToken.claims, session)) {
            return { ready: true, claims: currentToken.claims };
        }
    }

    const canRefreshCurrentUser = currentUser && sameEmail(currentUser.email, session.user.email);
    const response = await fetch("/api/auth/set-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canRefreshCurrentUser ? { uid: currentUser.uid } : {}),
    });

    if (!response.ok) {
        throw new Error(`Failed to sync Firebase Auth: ${response.status}`);
    }

    const data = await response.json();

    if (data.customToken) {
        await signInWithCustomToken(firebaseAuth, data.customToken);
    } else if (firebaseAuth.currentUser) {
        await firebaseAuth.currentUser.getIdToken(true);
    } else {
        throw new Error("Firebase Auth sync did not return a custom token");
    }

    await syncCanonicaAuthWithCustomToken(data.canonicaCustomToken);

    const refreshedToken = await firebaseAuth.currentUser?.getIdTokenResult(true);
    if (!claimsMatchSessionStore(refreshedToken?.claims, session)) {
        throw new Error("Firebase Auth claims do not match the current store");
    }

    return { ready: true, claims: refreshedToken?.claims };
}

export function ensureFirebaseAuthForSession(session: any): Promise<FirebaseAuthSyncResult> {
    const tenantId = getSessionTenantId(session);
    const storeId = getSessionStoreId(session);
    const currentUid = firebaseAuth?.currentUser?.uid || "none";
    const nextKey = [
        session?.user?.email || "no-email",
        tenantId ?? "no-tenant",
        storeId ?? "no-store",
        currentUid,
    ].join(":");

    if (syncRequest && syncRequestKey === nextKey) {
        return syncRequest;
    }

    syncRequestKey = nextKey;
    syncRequest = runFirebaseAuthSync(session).finally(() => {
        syncRequest = null;
        syncRequestKey = "";
    });

    return syncRequest;
}
