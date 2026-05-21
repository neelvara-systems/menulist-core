import LoginUserType from "@type/loginUser";
import { getCanonicaScopedSession, isCanonicaRuntimeRoute } from "@lib/canonica/sessionScope";
import { applyActiveStoreContextToSession } from "@lib/multiOutlet/activeStoreContext";

const CLIENT_SESSION_TTL_MS = 5000;

let clientSessionCache: LoginUserType | null = null;
let clientSessionCacheAt = 0;
let clientSessionRequest: Promise<LoginUserType | null> | null = null;

const AUTH_LOG_BADGE = 'background: #0f172a; color: #67e8f9; padding: 2px 6px; border-radius: 999px; font-weight: 700;';
const AUTH_LOG_TEXT = 'color: #0891b2; font-weight: 700;';
const AUTH_SUCCESS_TEXT = 'color: #16a34a; font-weight: 700;';
const AUTH_WARN_TEXT = 'color: #f59e0b; font-weight: 700;';
const AUTH_ERROR_TEXT = 'color: #dc2626; font-weight: 700;';

const getActiveSession = async () => {
    if (typeof window === 'undefined') {
        const { getServerSession: sessionGetter } = await import("next-auth");
        const { authOptions } = await import(".")
        const session = await sessionGetter(authOptions);
        return session as unknown as LoginUserType;
    }

    const now = Date.now();
    if (clientSessionCache && now - clientSessionCacheAt < CLIENT_SESSION_TTL_MS) {
        const scopedSession = isCanonicaRuntimeRoute(window.location.pathname, window.location.hostname)
            ? getCanonicaScopedSession(clientSessionCache)
            : clientSessionCache;
        console.log(`%c🔐 Auth%c session cache hit`, AUTH_LOG_BADGE, AUTH_LOG_TEXT, {
            ageMs: now - clientSessionCacheAt,
        });
        return applyActiveStoreContextToSession(scopedSession);
    }

    if (clientSessionRequest) {
        console.log(`%c🔐 Auth%c session request joined`, AUTH_LOG_BADGE, AUTH_WARN_TEXT);
        return clientSessionRequest;
    }

    clientSessionRequest = (async () => {
        try {
            console.log(`%c🔐 Auth%c session fetch start`, AUTH_LOG_BADGE, AUTH_LOG_TEXT);
            const { getSession: sessionGetter } = await import('next-auth/react');
            const session = await sessionGetter();
            const sessionWithType = session as unknown as LoginUserType | null;
            clientSessionCache = sessionWithType;
            clientSessionCacheAt = Date.now();
            const scopedSession = isCanonicaRuntimeRoute(window.location.pathname, window.location.hostname)
                ? getCanonicaScopedSession(sessionWithType)
                : sessionWithType;
            const effectiveSession = applyActiveStoreContextToSession(scopedSession);
            console.log(`%c🔐 Auth%c session fetch success`, AUTH_LOG_BADGE, AUTH_SUCCESS_TEXT, {
                authenticated: Boolean(effectiveSession?.user),
                sId: effectiveSession?.sId ?? null,
                tId: effectiveSession?.tId ?? null,
            });
            return effectiveSession;
        } catch (error: any) {
            console.error(`%c🔐 Auth%c session fetch failed`, AUTH_LOG_BADGE, AUTH_ERROR_TEXT, {
                error: error?.message || 'Unknown error',
            });
            throw error;
        } finally {
            clientSessionRequest = null;
        }
    })();

    return clientSessionRequest;
};

export default getActiveSession;
