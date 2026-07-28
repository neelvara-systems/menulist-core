export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { getGrowthOSBoundedStringContext, getGrowthOSSecurityLogContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { guardGrowthOSReviewReply } from "@lib/growthos/reviewGuard";
import { getGrowthOSRateLimitFailureDecision } from "@lib/growthos/rateLimitPolicy";
import { evaluateGrowthOSServerEntitlement } from "@lib/growthos/serverEntitlements";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { GrowthOSReviewSuggestRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isGrowthOSMasterEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        if (FEATURE_FLAGS.GROWTHOS_REVIEW_REPLY_MODE !== "manual_paste_guarded") {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || "unknown");
        const tenantRateLimitHash = hashPublicRateLimitValue(session.tId || "unknown");
        const storeRateLimitHash = hashPublicRateLimitValue(session.sId || "unknown");
        const rateLimit = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `growthos-review:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
            limit: 10,
            window: 60,
        });
        if (!rateLimit.allowed) {
            const decision = getGrowthOSRateLimitFailureDecision(rateLimit);
            return NextResponse.json({
                error: decision.providerUnavailable
                    ? "Request protection is temporarily unavailable. Please try again shortly."
                    : "Rate limit exceeded. Please try again in a minute.",
                code: decision.code,
                retryAfter: decision.retryAfter,
            }, {
                status: decision.status,
                headers: {
                    "Retry-After": String(decision.retryAfter),
                    ...(decision.providerUnavailable ? {} : {
                        "X-RateLimit-Remaining": String(rateLimit.remaining),
                        "X-RateLimit-Reset": String(rateLimit.resetAt),
                    }),
                },
            });
        }

        const jsonBody = await parseGrowthOSJsonBody(request);
        if (!jsonBody.success) {
            logger.security("Invalid JSON - GrowthOS Review Guard API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/reviews/suggest"),
            }, "medium");
            return ("response" in jsonBody && jsonBody.response)
                || NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSReviewSuggestRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Review Guard Input Validation Failed", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/reviews/suggest", {
                    ...getGrowthOSBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Review Guard API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/reviews/suggest"),
            }, "critical");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const entitlement = await evaluateGrowthOSServerEntitlement({ session });
        if (!entitlement.allowed) {
            return NextResponse.json({
                error: "Growth Kits unavailable",
                message: entitlement.message,
                reason: entitlement.reason,
            }, { status: entitlement.reason === "feature_off" ? 404 : 403 });
        }

        const result = guardGrowthOSReviewReply({
            reviewText: String(validation.data.reviewText),
            rating: validation.data.rating,
            tone: validation.data.tone,
        });
        return NextResponse.json({ result }, { status: 200 });
    } catch (error) {
        logGrowthOSApiFailure("GrowthOS Review Guard API error", "growthos_review_guard_api_failed", error, {
            endpoint: "/api/growthos/reviews/suggest",
            ...getGrowthOSBoundedStringContext("userId", session?.uId || session?.user?.id),
        });
        return NextResponse.json({ error: "Growth Kit review reply failed" }, { status: 500 });
    }
});
