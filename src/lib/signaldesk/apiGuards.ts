import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_RATE_LIMIT_NAMESPACE } from "@constant/signaldesk/product";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature, type RateLimitFeature } from "@lib/rateLimit/configs";
import { logger } from "@lib/monitoring/logger";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { getSignalDeskAccessContext, getSignalDeskSessionIdentity, hasSignalDeskPermission } from "@lib/signaldesk/access";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import type { SignalDeskAccessContext, SignalDeskPermission } from "@type/signaldesk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SIGNALDESK_JSON_BODY_MAX_BYTES = 256 * 1024;
export const SIGNALDESK_PRIVATE_RESPONSE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
} as const;

export const withSignalDeskPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(SIGNALDESK_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

export const signalDeskPrivateJson = (body: unknown, init: ResponseInit = {}) => (
    withSignalDeskPrivateHeaders(NextResponse.json(body, init))
);

export type SignalDeskLogContext = Record<string, boolean | number | string | null | undefined>;

export function getSignalDeskRateLimitFailureDecision(input: {
    now?: number;
    reason?: unknown;
    resetAt?: unknown;
}) {
    const now = typeof input.now === "number" && Number.isFinite(input.now)
        ? input.now
        : Date.now();
    const resetAt = typeof input.resetAt === "number" && Number.isFinite(input.resetAt)
        ? input.resetAt
        : now + 1000;
    const providerUnavailable = input.reason === "provider_unavailable";
    return {
        code: providerUnavailable ? "RATE_LIMIT_UNAVAILABLE" as const : "RATE_LIMITED" as const,
        providerUnavailable,
        retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        status: providerUnavailable ? 503 as const : 429 as const,
    };
}

export const getBoundedSignalDeskStringContext = (
    label: string,
    value: unknown,
): SignalDeskLogContext => getBoundedRuntimeStringContext(label, value);

export const getSignalDeskAccessLogContext = (
    access?: Partial<SignalDeskAccessContext> | null,
): SignalDeskLogContext => ({
    ...getBoundedSignalDeskStringContext("signalDeskUserId", access?.userId),
    role: typeof access?.role === "string" ? access.role : undefined,
    active: access?.active === true,
    firebaseConfigured: access?.firebaseConfigured === true,
    isPlatformAdmin: access?.isPlatformAdmin === true,
    permissionCount: Array.isArray(access?.permissions) ? access.permissions.length : 0,
});

const getSignalDeskSecurityLogContext = (
    session: any,
    request: NextRequest,
    context: SignalDeskLogContext = {},
): SignalDeskLogContext => ({
    ...getBoundedSecurityRouteContext(session, request),
    ...getBoundedSignalDeskStringContext("endpoint", request.nextUrl.pathname),
    ...getBoundedSignalDeskStringContext("method", request.method),
    ...context,
});

export const logSignalDeskFailure = (
    failureCode: string,
    error?: unknown,
    context: SignalDeskLogContext = {},
): void => {
    logRuntimeFailure(failureCode, error, {
        product: "signaldesk",
        ...context,
    });
};

export const requireSignalDeskRuntime = () => {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL) {
        return signalDeskPrivateJson({ error: "SignalDesk is disabled" }, { status: 404 });
    }
    return null;
};

export const isSignalDeskMobileRequest = (request: NextRequest) => {
    const clientMode = request.headers.get("x-signaldesk-client-mode") || "";
    const userAgent = request.headers.get("user-agent") || "";
    const secChMobile = request.headers.get("sec-ch-ua-mobile") || "";
    return clientMode === "mobile-readonly"
        || secChMobile === "?1"
        || /\b(Android|iPhone|iPad|iPod|Mobile|Windows Phone)\b/i.test(userAgent);
};

export const blockSignalDeskMobileMutation = (request: NextRequest, message = "SignalDesk mobile is read-only") => {
    if (!isSignalDeskMobileRequest(request)) return null;
    return signalDeskPrivateJson({ error: message }, { status: 403 });
};

export function logSignalDeskValidationFailure(params: {
    action?: string;
    details?: unknown;
    request: NextRequest;
    session: any;
}) {
    logger.security("Input Validation Failed - SignalDesk API", {
        ...getSignalDeskSecurityLogContext(params.session, params.request, {
            ...getBoundedSignalDeskStringContext("action", params.action),
        }),
        ...getBoundedSignalDeskStringContext("validationDetails", params.details),
    }, "medium");
}

export async function requireSignalDeskAccess(
    request: NextRequest,
    session: any,
    permission: SignalDeskPermission = "signaldesk.view",
): Promise<{ access: SignalDeskAccessContext } | { response: NextResponse }> {
    const access = await getSignalDeskAccessContext(session);
    if (!hasSignalDeskPermission(access, permission)) {
        logger.security("Authorization Failed - SignalDesk", {
            ...getSignalDeskSecurityLogContext(session, request, {
                ...getBoundedSignalDeskStringContext("requiredPermission", permission),
            }),
        }, "high");
        return { response: signalDeskPrivateJson({ error: "Forbidden" }, { status: 403 }) };
    }

    return { access: access as SignalDeskAccessContext };
}

export async function applySignalDeskRateLimit(params: {
    request: NextRequest;
    session: any;
    feature: RateLimitFeature;
    keyPrefix: string;
}) {
    const identity = getSignalDeskSessionIdentity(params.session);
    const rateLimitConfig = getRateLimitForFeature(params.feature);
    const identityKey = hashPublicRateLimitValue(identity.userId || identity.email || "unknown");
    const rateLimit = await checkRateLimit({
        key: `${SIGNALDESK_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${identityKey}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    if (rateLimit.allowed) return null;

    const decision = getSignalDeskRateLimitFailureDecision({
        reason: rateLimit.reason,
        resetAt: rateLimit.resetAt,
    });
    logger.security(decision.providerUnavailable
        ? "Rate Limit Provider Unavailable - SignalDesk"
        : "Rate Limit Exceeded - SignalDesk", {
        ...getSignalDeskSecurityLogContext(params.session, params.request, {
            ...getBoundedSignalDeskStringContext("feature", params.feature),
        }),
        limit: rateLimitConfig.limit,
        waitSeconds: decision.retryAfter,
        window: rateLimitConfig.window,
    }, "medium");

    return signalDeskPrivateJson(
        {
            error: decision.providerUnavailable
                ? "SignalDesk request protection is temporarily unavailable. Please try again shortly."
                : `Too many requests. Please wait ${decision.retryAfter} seconds.`,
            code: decision.code,
            retryAfter: decision.retryAfter,
            ...(decision.providerUnavailable ? {} : { resetAt: rateLimit.resetAt }),
        },
        {
            status: decision.status,
            headers: {
                "Retry-After": String(decision.retryAfter),
                "X-RateLimit-Limit": String(rateLimitConfig.limit),
                ...(decision.providerUnavailable ? {} : {
                    "X-RateLimit-Remaining": String(rateLimit.remaining),
                    "X-RateLimit-Reset": String(rateLimit.resetAt),
                }),
            },
        },
    );
}

export async function parseSignalDeskJsonBody(params: {
    request: NextRequest;
    session: any;
}) {
    const bodyResult = await readBoundedJsonBody(params.request, SIGNALDESK_JSON_BODY_MAX_BYTES, {
        invalidJsonMessage: "Invalid JSON",
        tooLargeMessage: "Request body too large",
    });
    if (bodyResult.ok === false) {
        logger.security("Invalid JSON - SignalDesk API", {
            ...getSignalDeskSecurityLogContext(params.session, params.request),
            status: bodyResult.response.status,
        }, "medium");
        return {
            response: withSignalDeskPrivateHeaders(bodyResult.response),
            success: false as const,
        };
    }

    return {
        data: bodyResult.data,
        success: true as const,
    };
}
