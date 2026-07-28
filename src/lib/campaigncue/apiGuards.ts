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
import { verifyTenantAccess } from "@/middleware/auth";
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

export const getCampaignCueSessionScope = (session: any) => {
    const identity = resolveCampaignCueSessionIdentity(session);
    const email = session?.user?.email || session?.email;
    const name = session?.user?.name || session?.name;
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
    session: any,
    request: NextRequest,
    endpoint = request.nextUrl.pathname,
    context: CampaignCueSecurityLogContext = {},
): CampaignCueSecurityLogContext => ({
    ...getBoundedSecurityRouteContext(session, request),
    ...getBoundedSecurityStringContext("endpoint", endpoint),
    ...getBoundedSecurityStringContext("method", request.method),
    ...context,
});

export const requireCampaignCueRuntime = () => {
    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_APP_SHELL) {
        return NextResponse.json({ error: "CampaignCue app is disabled" }, { status: 404 });
    }
    return null;
};

export const requireCampaignCueSessionScope = (
    request: NextRequest,
    session: any,
) => {
    const scope = getCampaignCueSessionScope(session);
    if (!scope.tId || !scope.sId || !scope.userId) {
        return {
            error: NextResponse.json({ error: "CampaignCue workspace requires an onboarded account" }, { status: 400 }),
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
            error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
            scope,
        };
    }

    return { scope };
};

export const applyCampaignCueRateLimit = async (params: {
    request: NextRequest;
    session: any;
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
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security("Rate Limit Exceeded - CampaignCue", {
        ...getCampaignCueSecurityLogContext(params.session, params.request, params.request.nextUrl.pathname, {
            ...getBoundedSecurityStringContext("feature", params.feature),
            ...getBoundedSecurityStringContext("storeId", scope.sId),
            ...getBoundedSecurityStringContext("tenantId", scope.tId),
            ...getBoundedSecurityStringContext("userId", scope.userId),
        }),
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
};

export const parseCampaignCueJsonBody = async (params: {
    endpoint?: string;
    logLabel?: string;
    request: NextRequest;
    session: any;
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
        response: bodyResult.response,
        success: false as const,
    };
};
