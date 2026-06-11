import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_RATE_LIMIT_NAMESPACE } from "@constant/campaigncue/product";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature, type RateLimitFeature } from "@lib/rateLimit/configs";
import { logger } from "@lib/monitoring/logger";
import { buildSecurityContext } from "@lib/security/securityContext";
import { verifyTenantAccess } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const getCampaignCueSessionScope = (session: any) => {
    const tId = session?.tId || session?.user?.tenantId;
    const sId = session?.sId || session?.user?.storeId;
    const userId = session?.uId || session?.user?.id;
    const email = session?.user?.email || session?.email;
    const name = session?.user?.name || session?.name;
    return {
        email: email ? String(email) : undefined,
        name: name ? String(name) : undefined,
        sId: sId != null ? String(sId) : "",
        tId: tId != null ? String(tId) : "",
        userId: userId ? String(userId) : "",
    };
};

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
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            tenantId: scope.tId,
            storeId: scope.sId,
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
    const rateLimit = await checkRateLimit({
        key: `${CAMPAIGNCUE_RATE_LIMIT_NAMESPACE}:${params.keyPrefix}:${scope.userId || "unknown"}:${scope.tId || "_"}:${scope.sId || "_"}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security("Rate Limit Exceeded - CampaignCue", {
        ...buildSecurityContext(params.session, params.request),
        endpoint: params.request.nextUrl.pathname,
        feature: params.feature,
        limit: rateLimitConfig.limit,
        storeId: scope.sId,
        tenantId: scope.tId,
        userId: scope.userId,
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
