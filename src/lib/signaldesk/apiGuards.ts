import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_RATE_LIMIT_NAMESPACE } from "@constant/signaldesk/product";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature, type RateLimitFeature } from "@lib/rateLimit/configs";
import { logger } from "@lib/monitoring/logger";
import { buildSecurityContext } from "@lib/security/securityContext";
import { getSignalDeskAccessContext, getSignalDeskSessionIdentity, hasSignalDeskPermission } from "@lib/signaldesk/access";
import type { SignalDeskAccessContext, SignalDeskPermission } from "@type/signaldesk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const requireSignalDeskRuntime = () => {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL) {
        return NextResponse.json({ error: "SignalDesk is disabled" }, { status: 404 });
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
    return NextResponse.json({ error: message }, { status: 403 });
};

export function logSignalDeskValidationFailure(params: {
    action?: string;
    details: unknown;
    request: NextRequest;
    session: any;
}) {
    logger.security("Input Validation Failed - SignalDesk API", {
        ...buildSecurityContext(params.session, params.request),
        action: params.action,
        endpoint: params.request.nextUrl.pathname,
        error: params.details,
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
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            requiredPermission: permission,
        }, "high");
        return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
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
    const rateLimit = await checkRateLimit({
        key: `${SIGNALDESK_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${identity.userId || identity.email || "unknown"}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security("Rate Limit Exceeded - SignalDesk", {
        ...buildSecurityContext(params.session, params.request),
        endpoint: params.request.nextUrl.pathname,
        feature: params.feature,
        limit: rateLimitConfig.limit,
        waitSeconds,
        window: rateLimitConfig.window,
    }, "medium");

    return NextResponse.json(
        {
            error: `Too many requests. Please wait ${waitSeconds} seconds.`,
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            status: 429,
            headers: {
                "Retry-After": String(waitSeconds),
                "X-RateLimit-Limit": String(rateLimitConfig.limit),
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(rateLimit.resetAt),
            },
        },
    );
}

export async function parseSignalDeskJsonBody(params: {
    request: NextRequest;
    session: any;
}) {
    try {
        return {
            data: await params.request.json(),
            success: true as const,
        };
    } catch {
        logger.security("Invalid JSON - SignalDesk API", {
            ...buildSecurityContext(params.session, params.request),
            endpoint: params.request.nextUrl.pathname,
        }, "medium");
        return {
            response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
            success: false as const,
        };
    }
}
