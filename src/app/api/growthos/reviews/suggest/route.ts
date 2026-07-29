export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { growthOSPrivateJson, withGrowthOSPrivateHeaders } from "@lib/growthos/apiResponse";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { getGrowthOSBoundedStringContext, getGrowthOSSecurityLogContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { guardGrowthOSReviewReply } from "@lib/growthos/reviewGuard";
import { getGrowthOSRateLimitFailureDecision } from "@lib/growthos/rateLimitPolicy";
import { evaluateGrowthOSServerEntitlement } from "@lib/growthos/serverEntitlements";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import { validateAPIInput } from "@lib/security/inputValidation";
import { GrowthOSReviewSuggestRequestSchema, parseGrowthOSJsonBody } from "@lib/validation/growthosSchemas";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isGrowthOSMasterEnabled()) {
            return growthOSPrivateJson({ error: "Feature disabled" }, { status: 404 });
        }

        if (FEATURE_FLAGS.GROWTHOS_REVIEW_REPLY_MODE !== "manual_paste_guarded") {
            return growthOSPrivateJson({ error: "Feature disabled" }, { status: 404 });
        }

        const scope = resolveStorePermissionSessionScope(session);
        const actorId = resolveCurrentSessionUserDocumentId(session);
        if (!scope || !actorId) {
            return growthOSPrivateJson({ error: "Forbidden" }, { status: 403 });
        }
        const userRateLimitHash = hashPublicRateLimitValue(actorId);
        const tenantRateLimitHash = hashPublicRateLimitValue(scope.tenantScope.documentId);
        const storeRateLimitHash = hashPublicRateLimitValue(scope.storeScope.documentId);
        const rateLimit = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `growthos-review:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
            limit: 10,
            window: 60,
        });
        if (!rateLimit.allowed) {
            const decision = getGrowthOSRateLimitFailureDecision(rateLimit);
            return growthOSPrivateJson({
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
                ? withGrowthOSPrivateHeaders(jsonBody.response)
                : growthOSPrivateJson({ error: "Invalid JSON" }, { status: 400 });
        }

        const validation = validateAPIInput(GrowthOSReviewSuggestRequestSchema, jsonBody.data);
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Review Guard Input Validation Failed", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/reviews/suggest", {
                    ...getGrowthOSBoundedStringContext("validationError", errorMsg),
                }),
            }, "medium");
            return growthOSPrivateJson({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }

        if (!verifyTenantAccess(
            session,
            scope.tenantScope.numericId,
            scope.storeScope.numericId,
            request,
        )) {
            logger.security("Tenant Access Violation - GrowthOS Review Guard API", {
                ...getGrowthOSSecurityLogContext(session, request, "/api/growthos/reviews/suggest"),
            }, "critical");
            return growthOSPrivateJson({ error: "Forbidden" }, { status: 403 });
        }

        const entitlement = await evaluateGrowthOSServerEntitlement({ session });
        if (!entitlement.allowed) {
            return growthOSPrivateJson({
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
        return growthOSPrivateJson({ result }, { status: 200 });
    } catch (error) {
        logGrowthOSApiFailure("GrowthOS Review Guard API error", "growthos_review_guard_api_failed", error, {
            endpoint: "/api/growthos/reviews/suggest",
            ...getGrowthOSBoundedStringContext("userId", session?.uId || session?.user?.id),
        });
        return growthOSPrivateJson({ error: "Growth Kit review reply failed" }, { status: 500 });
    }
});
