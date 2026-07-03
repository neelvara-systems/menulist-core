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

const CLIENT_SESSION_TTL_MS = 5000;
const AUTH_SESSION_RESPONSE_JSON_MAX_BYTES = 64 * 1024;

let clientSessionCache: LoginUserType | null = null;
let clientSessionCacheAt = 0;
let clientSessionRequest: Promise<LoginUserType | null> | null = null;

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

    if (!(payload as any).user) {
        return null;
    }

    return payload as LoginUserType;
};

const getActiveSession = async () => {
    if (typeof window === 'undefined') {
        const { getServerSession: sessionGetter } = await import("next-auth");
        const { authOptions } = await import(".")
        const session = await sessionGetter(authOptions);
        return session as unknown as LoginUserType;
    }

    const now = Date.now();
    if (clientSessionCache && now - clientSessionCacheAt < CLIENT_SESSION_TTL_MS) {
        const scopedSession = shouldUseAnswerlatticeClientScopeForRoute(clientSessionCache, window.location.pathname, window.location.hostname)
            ? getAnswerlatticeScopedSession(clientSessionCache)
            : clientSessionCache;
        logAuthDiagnostic('auth_session_cache_hit', {
            ageMs: now - clientSessionCacheAt,
            ...getBoundedAuthStringContext('pathname', window.location.pathname),
            ...getBoundedAuthStringContext('hostname', window.location.hostname),
        }, { developmentOnly: true });
        return applyActiveStoreContextToSession(scopedSession);
    }

    if (clientSessionRequest) {
        logAuthDiagnostic('auth_session_request_joined', {
            ...getBoundedAuthStringContext('pathname', window.location.pathname),
            ...getBoundedAuthStringContext('hostname', window.location.hostname),
        }, { developmentOnly: true });
        return clientSessionRequest;
    }

    clientSessionRequest = (async () => {
        try {
            logAuthDiagnostic('auth_session_fetch_start', {
                ...getBoundedAuthStringContext('pathname', window.location.pathname),
                ...getBoundedAuthStringContext('hostname', window.location.hostname),
            }, { developmentOnly: true });
            const session = await getClientSessionFromApi();
            const sessionWithType = session as unknown as LoginUserType | null;
            clientSessionCache = sessionWithType;
            clientSessionCacheAt = Date.now();
            const scopedSession = shouldUseAnswerlatticeClientScopeForRoute(sessionWithType, window.location.pathname, window.location.hostname)
                ? getAnswerlatticeScopedSession(sessionWithType)
                : sessionWithType;
            const effectiveSession = applyActiveStoreContextToSession(scopedSession);
            logAuthDiagnostic('auth_session_fetch_success', getAuthSessionLogContext(effectiveSession), { developmentOnly: true });
            return effectiveSession;
        } catch (error: any) {
            logAuthFailure('auth_session_fetch_failed', error, {
                ...getBoundedAuthStringContext('pathname', window.location.pathname),
                ...getBoundedAuthStringContext('hostname', window.location.hostname),
            });
            throw error;
        } finally {
            clientSessionRequest = null;
        }
    })();

    return clientSessionRequest;
};

export default getActiveSession;
