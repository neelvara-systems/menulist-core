import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { PRODUCT_IDS } from "@constant/product";
import {
    getAnswerlatticeScopedSession,
    isAnswerlatticeRuntimeRoute,
    shouldUseAnswerlatticeClientScopeForRoute,
} from "@lib/answerlattice/sessionScope";
import { syncAnswerlatticeAuthWithCustomToken } from "@lib/firebase/syncAnswerlatticeAuth";
import { createFirebaseBootstrapError, logFirebaseBootstrapFailure } from "@lib/firebase/firebaseDiagnostics";
import { firebaseClaimsMatchTargetStore } from "@lib/auth/firebaseClaimsAcknowledgement";
import { answerlatticeClaimsMatchSessionScope } from "@lib/auth/answerlatticeAuthAcknowledgement";
import { resolveFirebaseAuthSessionScopeState } from "@lib/auth/firebaseAuthSessionScope";
import { applyActiveStoreContextToSession } from "@lib/multiOutlet/activeStoreContext";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { shouldUseSharedAnswerlatticeFirebase } from "@lib/firebase/answerlatticeConfig";
import { signInWithCustomToken, type IdTokenResult } from "firebase/auth";
import { AUTH_BROWSER_REQUEST_POLICY } from "./browserRequestPolicy";
import { createFirebaseAuthMutationQueue } from "./firebaseAuthMutationQueue";

type FirebaseAuthSyncResult = {
    ready: boolean;
    claims?: Record<string, unknown>;
};

let syncRequest: Promise<FirebaseAuthSyncResult> | null = null;
let syncRequestKey = "";
const runFirebaseAuthMutation = createFirebaseAuthMutationQueue();

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

const claimsMatchSessionStore = (claims: Record<string, unknown> | undefined, session: any) => {
    const sessionScope = resolveFirebaseAuthSessionScopeState(session);
    if (sessionScope.status === 'absent') return true;
    if (sessionScope.status === 'invalid') return false;

    return claimsUseCanonicalTenantStoreTypes(claims)
        && normalizeClaimValue(claims?.tenantId) === sessionScope.tenantId
        && normalizeClaimValue(claims?.storeId) === sessionScope.storeId;
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

export function getFirebaseAuthSessionScopeKey(session: any): string | null {
    const effectiveSession = getEffectiveSessionForFirebaseAuth(session);
    const email = typeof effectiveSession?.user?.email === 'string'
        ? effectiveSession.user.email.trim().toLowerCase()
        : '';
    const sessionScope = resolveFirebaseAuthSessionScopeState(effectiveSession);
    if (!email || sessionScope.status !== 'valid') {
        return null;
    }

    return [
        shouldUseAnswerlatticeScope(effectiveSession) ? PRODUCT_IDS.ANSWERLATTICE : PRODUCT_IDS.MENULIST,
        email,
        sessionScope.tenantId,
        sessionScope.storeId,
    ].join(':');
}

async function runFirebaseAuthSync(session: any): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!session?.user?.email) return { ready: false };
    const isAnswerlatticeScope = shouldUseAnswerlatticeScope(session);

    const sessionScope = resolveFirebaseAuthSessionScopeState(session);
    if (sessionScope.status === 'invalid') {
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_sync_invalid_session_scope',
        );
    }
    if (sessionScope.status === 'absent') {
        return { ready: true };
    }
    const { tenantId, storeId } = sessionScope;

    // Firebase restores its persisted browser actor asynchronously. Inspecting
    // currentUser before that first state settles makes every hard reload look
    // like a fresh OAuth handoff and needlessly calls /api/auth/set-claims.
    // Wait for the SDK's existing persistence state before deciding whether a
    // custom token is actually required.
    try {
        await firebaseAuth.authStateReady();
    } catch (error) {
        logFirebaseBootstrapFailure('firebase_auth_initial_state_failed', error, {
            sessionScopePresent: true,
        });
        throw createFirebaseBootstrapError(
            'Firebase Auth sync failed',
            'firebase_auth_initial_state_failed',
        );
    }

    const currentUser = firebaseAuth.currentUser;
    let canRefreshCurrentUser = false;
    if (currentUser) {
        try {
            const currentToken = await currentUser.getIdTokenResult();
            if (!isAnswerlatticeScope && claimsMatchSessionStore(currentToken.claims, session)) {
                return { ready: true, claims: currentToken.claims };
            }
            if (
                isAnswerlatticeScope
                && shouldUseSharedAnswerlatticeFirebase
                && answerlatticeClaimsMatchSessionScope(currentToken.claims, sessionScope)
            ) {
                return { ready: true, claims: currentToken.claims };
            }
            canRefreshCurrentUser = sameEmail(currentUser.email, session.user.email);
        } catch {
            // Continue through the normal fresh-token path when the cached token cannot be inspected.
        }
    }

    if (isAnswerlatticeScope && !shouldUseSharedAnswerlatticeFirebase) {
        const { answerlatticeAuth } = await import('@lib/firebase/answerlatticeFirebaseClient');
        const answerlatticeCurrentUser = answerlatticeAuth?.currentUser;
        if (answerlatticeCurrentUser && sameEmail(answerlatticeCurrentUser.email, session.user.email)) {
            try {
                const answerlatticeToken = await answerlatticeCurrentUser.getIdTokenResult();
                if (answerlatticeClaimsMatchSessionScope(answerlatticeToken.claims, sessionScope)) {
                    return { ready: true, claims: answerlatticeToken.claims };
                }
            } catch {
                // Continue through custom-token synchronization when the cached token is unavailable.
            }
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

    if (isAnswerlatticeScope) {
        if (shouldUseSharedAnswerlatticeFirebase) {
            if (!answerlatticeClaimsMatchSessionScope(refreshedToken?.claims, sessionScope)) {
                throw createFirebaseBootstrapError(
                    'Firebase Auth sync failed',
                    'answerlattice_shared_auth_sync_claims_mismatch',
                );
            }
            return { ready: true, claims: refreshedToken?.claims };
        }

        const answerlatticeCustomToken = getOptionalCustomToken(data.answerlatticeCustomToken);
        if (!answerlatticeCustomToken) {
            throw createFirebaseBootstrapError(
                'Firebase Auth sync failed',
                'answerlattice_auth_sync_missing_token',
            );
        }
        const answerlatticeAuthSynced = await syncAnswerlatticeAuthWithCustomToken(answerlatticeCustomToken);
        if (!answerlatticeAuthSynced) {
            throw createFirebaseBootstrapError(
                'Firebase Auth sync failed',
                'answerlattice_auth_sync_unavailable',
            );
        }

        const { answerlatticeAuth } = await import('@lib/firebase/answerlatticeFirebaseClient');
        const answerlatticeToken = await runFirebaseAuthNetworkOperation<IdTokenResult | undefined>(
            'Answerlattice current-user token result refresh',
            () => answerlatticeAuth?.currentUser?.getIdTokenResult(true) || Promise.resolve(undefined),
        );
        if (!answerlatticeClaimsMatchSessionScope(answerlatticeToken?.claims, sessionScope)) {
            throw createFirebaseBootstrapError(
                'Firebase Auth sync failed',
                'answerlattice_auth_sync_claims_mismatch',
            );
        }

        return { ready: true, claims: answerlatticeToken?.claims };
    }

    return { ready: true, claims: refreshedToken?.claims };
}

async function refreshFirebaseAuthClaimsCore(targetStoreId?: number | null): Promise<FirebaseAuthSyncResult> {
    if (typeof window === "undefined") return { ready: true };
    if (!firebaseAuth?.currentUser) {
        throw createFirebaseBootstrapError(
            'Firebase Auth claims refresh failed',
            'firebase_auth_claims_refresh_missing_user',
        );
    }

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

    const refreshedToken = await runFirebaseAuthNetworkOperation<IdTokenResult | undefined>(
        'current-user token result refresh',
        () => firebaseAuth.currentUser?.getIdTokenResult(true) || Promise.resolve(undefined),
    );

    if (targetStoreId && !firebaseClaimsMatchTargetStore(refreshedToken?.claims, targetStoreId)) {
        throw createFirebaseBootstrapError(
            'Firebase Auth claims refresh failed',
            'firebase_auth_claims_refresh_mismatch',
        );
    }

    if (shouldUseAnswerlatticeScope()) {
        if (shouldUseSharedAnswerlatticeFirebase) {
            if (refreshedToken?.claims?.pId !== PRODUCT_IDS.ANSWERLATTICE) {
                throw createFirebaseBootstrapError(
                    'Firebase Auth claims refresh failed',
                    'answerlattice_shared_auth_claims_refresh_mismatch',
                );
            }
            return { ready: true, claims: refreshedToken?.claims };
        }

        const answerlatticeCustomToken = getOptionalCustomToken(data.answerlatticeCustomToken);
        if (!answerlatticeCustomToken) {
            throw createFirebaseBootstrapError(
                'Firebase Auth claims refresh failed',
                'answerlattice_auth_claims_refresh_missing_token',
            );
        }
        const answerlatticeAuthSynced = await syncAnswerlatticeAuthWithCustomToken(answerlatticeCustomToken);
        if (!answerlatticeAuthSynced) {
            throw createFirebaseBootstrapError(
                'Firebase Auth claims refresh failed',
                'answerlattice_auth_claims_refresh_unavailable',
            );
        }
        const { answerlatticeAuth } = await import('@lib/firebase/answerlatticeFirebaseClient');
        const answerlatticeToken = await runFirebaseAuthNetworkOperation<IdTokenResult | undefined>(
            'Answerlattice current-user token result refresh',
            () => answerlatticeAuth?.currentUser?.getIdTokenResult(true) || Promise.resolve(undefined),
        );
        if (
            answerlatticeToken?.claims?.pId !== PRODUCT_IDS.ANSWERLATTICE
            || (targetStoreId && !firebaseClaimsMatchTargetStore(answerlatticeToken?.claims, targetStoreId))
        ) {
            throw createFirebaseBootstrapError(
                'Firebase Auth claims refresh failed',
                'answerlattice_auth_claims_refresh_mismatch',
            );
        }
        return { ready: true, claims: answerlatticeToken?.claims };
    }

    return { ready: true, claims: refreshedToken?.claims };
}

export function refreshFirebaseAuthClaims(targetStoreId?: number | null): Promise<FirebaseAuthSyncResult> {
    return runFirebaseAuthMutation(() => refreshFirebaseAuthClaimsCore(targetStoreId));
}

export async function syncAnswerlatticePlatformAuthForStore(
    targetStoreId: number,
): Promise<FirebaseAuthSyncResult> {
    if (
        typeof window === 'undefined'
        || !Number.isSafeInteger(targetStoreId)
        || targetStoreId <= 0
    ) {
        return { ready: false };
    }

    const response = await fetch('/api/auth/set-claims', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            productId: PRODUCT_IDS.ANSWERLATTICE,
            targetStoreId,
        }),
    });
    if (!response.ok) {
        throw createFirebaseBootstrapError(
            'Answerlattice platform authentication failed',
            'answerlattice_platform_auth_sync_http_failed',
            { statusCode: response.status },
        );
    }

    const data = await readSetClaimsSyncResponseJson(response, 'refresh');
    const answerlatticeCustomToken = getOptionalCustomToken(data.answerlatticeCustomToken);
    if (!answerlatticeCustomToken) {
        throw createFirebaseBootstrapError(
            'Answerlattice platform authentication failed',
            'answerlattice_platform_auth_sync_missing_token',
        );
    }
    await syncAnswerlatticeAuthWithCustomToken(answerlatticeCustomToken);

    const { answerlatticeAuth } = await import('@lib/firebase/answerlatticeFirebaseClient');
    const tokenResult = await answerlatticeAuth?.currentUser?.getIdTokenResult(true);
    if (
        tokenResult?.claims?.pId !== PRODUCT_IDS.ANSWERLATTICE
        || tokenResult.claims.platformRole !== 'PLATFORM'
        || String(tokenResult.claims.storeId || '') !== String(targetStoreId)
    ) {
        throw createFirebaseBootstrapError(
            'Answerlattice platform authentication failed',
            'answerlattice_platform_auth_sync_claims_mismatch',
        );
    }

    return { ready: true, claims: tokenResult.claims };
}

export function ensureFirebaseAuthForSession(session: any): Promise<FirebaseAuthSyncResult> {
    const effectiveSession = getEffectiveSessionForFirebaseAuth(session);
    const sessionScope = resolveFirebaseAuthSessionScopeState(effectiveSession);
    const currentUid = firebaseAuth?.currentUser?.uid || "none";
    const nextKey = [
        shouldUseAnswerlatticeScope(effectiveSession) ? PRODUCT_IDS.ANSWERLATTICE : PRODUCT_IDS.MENULIST,
        effectiveSession?.user?.email || "no-email",
        sessionScope.status,
        sessionScope.status === 'valid' ? sessionScope.tenantId : "no-tenant",
        sessionScope.status === 'valid' ? sessionScope.storeId : "no-store",
        currentUid,
    ].join(":");

    if (syncRequest && syncRequestKey === nextKey) {
        return syncRequest;
    }

    const request = runFirebaseAuthMutation(() => runFirebaseAuthSync(effectiveSession));
    syncRequestKey = nextKey;
    syncRequest = request;
    void request.then(
        () => {
            if (syncRequest === request) {
                syncRequest = null;
                syncRequestKey = "";
            }
        },
        () => {
            if (syncRequest === request) {
                syncRequest = null;
                syncRequestKey = "";
            }
        },
    );

    return request;
}
