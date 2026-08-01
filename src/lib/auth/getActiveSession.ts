import LoginUserType from "@type/loginUser";
import { getAnswerlatticeScopedSession, shouldUseAnswerlatticeClientScopeForRoute } from "@lib/answerlattice/sessionScope";
import { applyActiveStoreContextToSession } from "@lib/multiOutlet/activeStoreContext";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { AUTH_BROWSER_REQUEST_POLICY } from "./browserRequestPolicy";
import {
    createAuthDiagnosticError,
    getAuthSessionLogContext,
    getBoundedAuthStringContext,
    logAuthDiagnostic,
    logAuthFailure,
} from "./authDiagnostics";
import { normalizeLoginUserSession } from "./loginSessionBoundary";

const CLIENT_SESSION_TTL_MS = 5000;
const AUTH_SESSION_RESPONSE_JSON_MAX_BYTES = 64 * 1024;

let clientSessionCache: LoginUserType | null = null;
let clientSessionCacheAt = 0;
let clientSessionRequest: Promise<LoginUserType | null> | null = null;
let clientSessionGeneration = 0;

export const clearClientSessionCache = (): void => {
    clientSessionGeneration += 1;
    clientSessionCache = null;
    clientSessionCacheAt = 0;
    clientSessionRequest = null;
};

const readClientSessionResponseJson = async (response: Response): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(response, AUTH_SESSION_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logAuthFailure('auth_session_response_parse_failed', error, {
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: AUTH_SESSION_RESPONSE_JSON_MAX_BYTES,
        });
        throw createAuthDiagnosticError('Failed to parse session response', {
            statusCode: response.status,
        });
    }
};

const getClientSessionFromApi = async (): Promise<LoginUserType | null> => {
    const response = await fetch('/api/auth/session', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw createAuthDiagnosticError('Failed to fetch session', {
            statusCode: response.status,
        });
    }

    const payload = await readClientSessionResponseJson(response);

    if (!payload) {
        return null;
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
        const invalid = createAuthDiagnosticError('Invalid session response', {
            statusCode: response.status,
        });
        logAuthFailure('auth_session_response_invalid', invalid, {
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: AUTH_SESSION_RESPONSE_JSON_MAX_BYTES,
        });
        throw invalid;
    }

    const payloadRecord = payload as Record<string, unknown>;
    if (!payloadRecord.user) {
        return null;
    }
    if (typeof payloadRecord.user !== 'object' || Array.isArray(payloadRecord.user)) {
        const invalid = createAuthDiagnosticError('Invalid session response', {
            statusCode: response.status,
        });
        logAuthFailure('auth_session_response_invalid', invalid, {
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: AUTH_SESSION_RESPONSE_JSON_MAX_BYTES,
        });
        throw invalid;
    }

    const session = normalizeLoginUserSession(payload);
    if (!session) {
        const invalid = createAuthDiagnosticError('Invalid session response', {
            statusCode: response.status,
        });
        logAuthFailure('auth_session_response_invalid', invalid, {
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: AUTH_SESSION_RESPONSE_JSON_MAX_BYTES,
        });
        throw invalid;
    }
    return session;
};

export const getProductScopedClientSession = (
    session: LoginUserType | null,
    pathname: string,
    hostname: string,
): LoginUserType | null => (
    shouldUseAnswerlatticeClientScopeForRoute(session, pathname, hostname)
        ? getAnswerlatticeScopedSession(session)
        : session
);

export const getClientSessionScopeForCurrentStore = (
    session: LoginUserType | null,
    pathname: string,
    hostname: string,
): LoginUserType | null => {
    const menuListSession = applyActiveStoreContextToSession(session);
    return getProductScopedClientSession(
        menuListSession,
        pathname,
        hostname,
    );
};

const getCurrentClientSessionScope = (session: LoginUserType | null): LoginUserType | null => (
    getClientSessionScopeForCurrentStore(
        session,
        window.location.pathname,
        window.location.hostname,
    )
);

const getActiveSession = async () => {
    if (typeof window === 'undefined') {
        const { getServerSession: sessionGetter } = await import("next-auth");
        const { authOptions } = await import(".")
        const session = await sessionGetter(authOptions);
        return normalizeLoginUserSession(session);
    }

    const now = Date.now();
    if (clientSessionCache && now - clientSessionCacheAt < CLIENT_SESSION_TTL_MS) {
        const scopedSession = getCurrentClientSessionScope(clientSessionCache);
        logAuthDiagnostic('auth_session_cache_hit', {
            ageMs: now - clientSessionCacheAt,
            ...getBoundedAuthStringContext('pathname', window.location.pathname),
            ...getBoundedAuthStringContext('hostname', window.location.hostname),
        }, { developmentOnly: true });
        return scopedSession;
    }

    if (clientSessionRequest) {
        const joinedRequest = clientSessionRequest;
        const joinedGeneration = clientSessionGeneration;
        logAuthDiagnostic('auth_session_request_joined', {
            ...getBoundedAuthStringContext('pathname', window.location.pathname),
            ...getBoundedAuthStringContext('hostname', window.location.hostname),
        }, { developmentOnly: true });
        const joinedSession = await joinedRequest;
        if (
            joinedGeneration !== clientSessionGeneration
            || clientSessionRequest !== joinedRequest
        ) {
            return null;
        }
        return getCurrentClientSessionScope(joinedSession);
    }

    logAuthDiagnostic('auth_session_fetch_start', {
        ...getBoundedAuthStringContext('pathname', window.location.pathname),
        ...getBoundedAuthStringContext('hostname', window.location.hostname),
    }, { developmentOnly: true });
    const requestGeneration = clientSessionGeneration;
    const request = getClientSessionFromApi();
    clientSessionRequest = request;
    try {
        const session = await request;
        if (
            requestGeneration !== clientSessionGeneration
            || clientSessionRequest !== request
        ) {
            return null;
        }
        clientSessionCache = session;
        clientSessionCacheAt = Date.now();
        const effectiveSession = getCurrentClientSessionScope(session);
        logAuthDiagnostic('auth_session_fetch_success', getAuthSessionLogContext(effectiveSession), { developmentOnly: true });
        return effectiveSession;
    } catch (error) {
        logAuthFailure('auth_session_fetch_failed', error, {
            ...getBoundedAuthStringContext('pathname', window.location.pathname),
            ...getBoundedAuthStringContext('hostname', window.location.hostname),
        });
        throw error;
    } finally {
        if (clientSessionRequest === request) {
            clientSessionRequest = null;
        }
    }
};

export default getActiveSession;
