import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_CUE_LAYERS } from "@constant/campaigncue/cueLayers";
import { CAMPAIGNCUE_RATE_LIMIT_NAMESPACE } from "@constant/campaigncue/product";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature, type RateLimitFeature } from "@lib/rateLimit/configs";
import { logger } from "@lib/monitoring/logger";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import {
    getBoundedSecurityRouteContext,
    getBoundedSecurityStringContext,
} from "@lib/security/securityDiagnostics";
import { type AuthenticatedHandler, verifyTenantAccess, withAuth } from "@/middleware/auth";
import { resolveCampaignCueSessionIdentity } from "@lib/campaigncue/workspaceScope";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

const CAMPAIGNCUE_JSON_BODY_MAX_BYTES = Math.max(
    64 * 1024,
    Math.ceil(CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_BYTES * 1.38)
        + CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES
        + (128 * 1024),
);

const CAMPAIGNCUE_PRIVATE_RESPONSE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const getCampaignCueSecuritySession = (session: unknown) => {
    if (!isRecord(session)) return undefined;
    const user = isRecord(session.user) ? session.user : undefined;
    return {
        sId: session.sId,
        storeId: session.storeId,
        tId: session.tId,
        tenantId: session.tenantId,
        uId: session.uId,
        user: user ? {
            email: user.email,
            id: user.id,
            storeId: user.storeId,
            tenantId: user.tenantId,
        } : undefined,
        userId: session.userId,
    };
};

export const withCampaignCuePrivateResponseHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(CAMPAIGNCUE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

export const withCampaignCueAuth = (handler: AuthenticatedHandler) => {
    const authenticatedHandler = withAuth(handler);
    return async (...args: Parameters<typeof authenticatedHandler>): Promise<NextResponse> => (
        withCampaignCuePrivateResponseHeaders(await authenticatedHandler(...args))
    );
};

export const getCampaignCueSessionScope = (session: unknown) => {
    const identity = resolveCampaignCueSessionIdentity(session);
    const sessionRecord = isRecord(session) ? session : null;
    const userRecord = isRecord(sessionRecord?.user) ? sessionRecord.user : null;
    const email = userRecord?.email || sessionRecord?.email;
    const name = userRecord?.name || sessionRecord?.name;
    return {
        email: email ? String(email) : undefined,
        name: name ? String(name) : undefined,
        sId: identity?.sId || "",
        tId: identity?.tId || "",
        userId: identity?.userId || "",
    };
};

export type CampaignCueSecurityLogContext = Record<string, boolean | number | string | null | undefined>;

export const getCampaignCueSecurityLogContext = (
    session: unknown,
    request: NextRequest,
    endpoint = request.nextUrl.pathname,
    context: CampaignCueSecurityLogContext = {},
): CampaignCueSecurityLogContext => ({
    ...getBoundedSecurityRouteContext(getCampaignCueSecuritySession(session), request),
    ...getBoundedSecurityStringContext("endpoint", endpoint),
    ...getBoundedSecurityStringContext("method", request.method),
    ...context,
});

export const requireCampaignCueRuntime = () => {
    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_APP_SHELL) {
        return withCampaignCuePrivateResponseHeaders(
            NextResponse.json({ error: "CampaignCue app is disabled" }, { status: 404 }),
        );
    }
    return null;
};

export const requireCampaignCueSessionScope = (
    request: NextRequest,
    session: unknown,
) => {
    const scope = getCampaignCueSessionScope(session);
    if (!scope.tId || !scope.sId || !scope.userId) {
        return {
            error: withCampaignCuePrivateResponseHeaders(
                NextResponse.json({ error: "CampaignCue workspace requires an onboarded account" }, { status: 400 }),
            ),
            scope,
        };
    }

    if (!verifyTenantAccess(session, scope.tId, scope.sId, request)) {
        logger.security("Tenant Access Violation - CampaignCue", {
            ...getCampaignCueSecurityLogContext(session, request, request.nextUrl.pathname, {
                ...getBoundedSecurityStringContext("tenantId", scope.tId),
                ...getBoundedSecurityStringContext("storeId", scope.sId),
            }),
        }, "critical");
        return {
            error: withCampaignCuePrivateResponseHeaders(
                NextResponse.json({ error: "Forbidden" }, { status: 403 }),
            ),
            scope,
        };
    }

    return { scope };
};

export const applyCampaignCueRateLimit = async (params: {
    request: NextRequest;
    session: unknown;
    feature: RateLimitFeature;
    keyPrefix: string;
}) => {
    const scope = getCampaignCueSessionScope(params.session);
    const rateLimitConfig = getRateLimitForFeature(params.feature);
    const userRateLimitHash = hashPublicRateLimitValue(scope.userId || "unknown");
    const tenantRateLimitHash = hashPublicRateLimitValue(scope.tId || "_");
    const storeRateLimitHash = hashPublicRateLimitValue(scope.sId || "_");
    const rateLimit = await checkRateLimit({
        key: `${CAMPAIGNCUE_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    if (rateLimit.allowed) return null;

    const providerUnavailable = rateLimit.reason === "provider_unavailable";
    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security(providerUnavailable
        ? "Rate Limit Provider Unavailable - CampaignCue"
        : "Rate Limit Exceeded - CampaignCue", {
        ...getCampaignCueSecurityLogContext(params.session, params.request, params.request.nextUrl.pathname, {
            ...getBoundedSecurityStringContext("feature", params.feature),
            ...getBoundedSecurityStringContext("storeId", scope.sId),
            ...getBoundedSecurityStringContext("tenantId", scope.tId),
            ...getBoundedSecurityStringContext("userId", scope.userId),
        }),
        ...(!providerUnavailable ? {
            limit: rateLimitConfig.limit,
            waitSeconds,
            window: rateLimitConfig.window,
        } : {}),
    }, "medium");

    if (providerUnavailable) {
        return withCampaignCuePrivateResponseHeaders(NextResponse.json(
            { error: "CampaignCue is temporarily unavailable. Please try again later." },
            { status: 503 },
        ));
    }

    return withCampaignCuePrivateResponseHeaders(NextResponse.json(
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
    ));
};

export const parseCampaignCueJsonBody = async (params: {
    endpoint?: string;
    logLabel?: string;
    request: NextRequest;
    session: unknown;
}) => {
    const bodyResult = await readBoundedJsonBody(params.request, CAMPAIGNCUE_JSON_BODY_MAX_BYTES, {
        invalidJsonMessage: "Invalid JSON",
    });

    if (bodyResult.ok === true) {
        return {
            data: bodyResult.data,
            success: true as const,
        };
    }

    logger.security(params.logLabel || "Invalid JSON - CampaignCue API", {
        ...getCampaignCueSecurityLogContext(
            params.session,
            params.request,
            params.endpoint || params.request.nextUrl.pathname,
            { status: bodyResult.response.status },
        ),
    }, "medium");
    return {
        response: withCampaignCuePrivateResponseHeaders(bodyResult.response),
        success: false as const,
    };
};

export const logCampaignCueInputValidationFailure = (params: {
    endpoint: string;
    label: string;
    request: NextRequest;
    session: unknown;
    validationError: string;
}) => {
    logger.security(params.label, {
        ...getCampaignCueSecurityLogContext(params.session, params.request, params.endpoint, {
            ...getBoundedSecurityStringContext("validationError", params.validationError),
        }),
    }, "medium");
};
