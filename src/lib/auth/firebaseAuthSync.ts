import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { PRODUCT_IDS } from "@constant/product";
import {
    getAnswerlatticeScopedSession,
    isAnswerlatticeRuntimeRoute,
    shouldUseAnswerlatticeClientScopeForRoute,
} from "@lib/answerlattice/sessionScope";
import { syncAnswerlatticeAuthWithCustomToken } from "@lib/firebase/syncAnswerlatticeAuth";
import { createFirebaseBootstrapError, logFirebaseBootstrapFailure } from "@lib/firebase/firebaseDiagnostics";
import { applyActiveStoreContextToSession } from "@lib/multiOutlet/activeStoreContext";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { signInWithCustomToken, type IdTokenResult } from "firebase/auth";
import { AUTH_BROWSER_REQUEST_POLICY } from "./browserRequestPolicy";

type FirebaseAuthSyncResult = {
    ready: boolean;
    claims?: Record<string, unknown>;
};

let syncRequest: Promise<FirebaseAuthSyncResult> | null = null;
let syncRequestKey = "";

const FIREBASE_AUTH_NETWORK_RETRY_CODES = new Set(['auth/network-request-failed']);
const FIREBASE_AUTH_RETRY_DELAYS_MS = [750, 1500];
const FIREBASE_AUTH_SYNC_RESPONSE_JSON_MAX_BYTES = 32 * 1024;

type SetClaimsSyncResponse = {
    answerlatticeCustomToken?: unknown;
    customToken?: unknown;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getOptionalCustomToken = (value: unknown): string | undefined => (
    typeof value === 'string' && value.trim().length > 0 ? value : undefined
);

const readSetClaimsSyncResponseJson = async (
    response: Response,
    phase: 'sync' | 'refresh',
): Promise<SetClaimsSyncResponse> => {
    const context = {
        maxBytes: FIREBASE_AUTH_SYNC_RESPONSE_JSON_MAX_BYTES,
        phase,
        responseOk: response.ok,
        responseStatus: response.status,
        statusCode: response.status,
    };

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            FIREBASE_AUTH_SYNC_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logFirebaseBootstrapFailure('firebase_auth_sync_response_parse_failed', error, context);
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_sync_response_parse_failed',
            context,
        );
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        logFirebaseBootstrapFailure(
            'firebase_auth_sync_response_invalid',
            createFirebaseBootstrapError('Firebase Auth sync failed', 'firebase_auth_sync_response_invalid', context),
            context,
        );
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_sync_response_invalid',
            context,
        );
    }

    return payload as SetClaimsSyncResponse;
};

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

            await wait(FIREBASE_AUTH_RETRY_DELAYS_MS[attempt]);
        }
    }

    throw createFirebaseBootstrapError(
        'Firebase Auth operation failed',
        'firebase_auth_operation_failed',
        { operationLabelPresent: Boolean(label), operationLabelLength: label.length },
    );
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

const shouldUseAnswerlatticeScope = (session?: any) => {
    if (typeof window === "undefined") return false;
    if (session) {
        return shouldUseAnswerlatticeClientScopeForRoute(session, window.location.pathname, window.location.hostname);
    }
    return isAnswerlatticeRuntimeRoute(window.location.pathname, window.location.hostname);
};

const getEffectiveSessionForFirebaseAuth = (session: any) => {
    const outletScopedSession = typeof window === "undefined"
        ? session
        : applyActiveStoreContextToSession(session);

    return shouldUseAnswerlatticeScope(outletScopedSession)
        ? getAnswerlatticeScopedSession(outletScopedSession)
        : outletScopedSession;
};

async function runFirebaseAuthSync(session: any): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!session?.user?.email) return { ready: false };
    const isAnswerlatticeScope = shouldUseAnswerlatticeScope(session);

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
            if (!isAnswerlatticeScope && claimsMatchSessionStore(currentToken.claims, session)) {
                return { ready: true, claims: currentToken.claims };
            }
            canRefreshCurrentUser = sameEmail(currentUser.email, session.user.email);
        } catch {
            // Continue through the normal fresh-token path when the cached token cannot be inspected.
        }
    }

    const response = await fetch("/api/auth/set-claims", {
        ...AUTH_BROWSER_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...(canRefreshCurrentUser && currentUser ? { uid: currentUser.uid } : {}),
            targetStoreId: Number(storeId),
            ...(isAnswerlatticeScope ? { productId: PRODUCT_IDS.ANSWERLATTICE } : {}),
        }),
    });

    if (!response.ok) {
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_sync_http_failed',
            { statusCode: response.status },
        );
    }

    const data = await readSetClaimsSyncResponseJson(response, 'sync');
    const customToken = getOptionalCustomToken(data.customToken);

    if (customToken) {
        await runFirebaseAuthNetworkOperation(
            'custom-token sign-in',
            () => signInWithCustomToken(firebaseAuth, customToken),
        );
    } else if (firebaseAuth.currentUser) {
        await runFirebaseAuthNetworkOperation(
            'current-user token refresh',
            () => firebaseAuth.currentUser!.getIdToken(true),
        );
    } else {
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_sync_missing_custom_token',
        );
    }

    await syncAnswerlatticeAuthWithCustomToken(getOptionalCustomToken(data.answerlatticeCustomToken));

    const refreshedToken = await runFirebaseAuthNetworkOperation<IdTokenResult | undefined>(
        'current-user token result refresh',
        () => firebaseAuth.currentUser?.getIdTokenResult(true) || Promise.resolve(undefined),
    );
    if (!claimsMatchSessionStore(refreshedToken?.claims, session)) {
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_claims_mismatch',
        );
    }

    return { ready: true, claims: refreshedToken?.claims };
}

export async function refreshFirebaseAuthClaims(targetStoreId?: number | null): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!firebaseAuth?.currentUser) return { ready: false };

    const response = await fetch("/api/auth/set-claims", {
        ...AUTH_BROWSER_REQUEST_POLICY,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uid: firebaseAuth.currentUser.uid,
            ...(targetStoreId ? { targetStoreId } : {}),
            ...(shouldUseAnswerlatticeScope() ? { productId: PRODUCT_IDS.ANSWERLATTICE } : {}),
        }),
    });

    if (!response.ok) {
        throw createFirebaseBootstrapError(
            'Firebase Auth claims refresh failed',
            'firebase_auth_claims_refresh_http_failed',
            { statusCode: response.status },
        );
    }

    const data = await readSetClaimsSyncResponseJson(response, 'refresh');
    const customToken = getOptionalCustomToken(data.customToken);

    if (customToken) {
        await runFirebaseAuthNetworkOperation(
            'custom-token sign-in',
            () => signInWithCustomToken(firebaseAuth, customToken),
        );
    } else {
        await runFirebaseAuthNetworkOperation(
            'current-user token refresh',
            () => firebaseAuth.currentUser!.getIdToken(true),
        );
    }

    await syncAnswerlatticeAuthWithCustomToken(getOptionalCustomToken(data.answerlatticeCustomToken));

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
