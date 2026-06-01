export const dynamic = "force-dynamic";

import { FEATURE_FLAGS } from "@config/features";
import { isGrowthOSMasterEnabled } from "@lib/growthos/entitlements";
import { guardGrowthOSReviewReply } from "@lib/growthos/reviewGuard";
import { evaluateGrowthOSServerEntitlement } from "@lib/growthos/serverEntitlements";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { GrowthOSReviewSuggestRequestSchema } from "@lib/validation/growthosSchemas";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../../middleware/auth";

export const POST = withAuth(async (request, session) => {
    try {
        if (!isGrowthOSMasterEnabled()) {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        if (FEATURE_FLAGS.GROWTHOS_REVIEW_REPLY_MODE !== "manual_paste_guarded") {
            return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
        }

        const rateLimit = await checkRateLimit({
            key: `growthos-review:${session.uId || session.user?.id}:${session.tId}`,
            limit: 10,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Rate limit exceeded. Please try again in a minute." }, { status: 429 });
        }

        const validation = validateAPIInput(GrowthOSReviewSuggestRequestSchema, await request.json());
        if (!validation.success) {
            const errorMsg = "error" in validation ? validation.error : "Invalid input";
            logger.security("GrowthOS Review Guard Input Validation Failed", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/reviews/suggest",
                error: errorMsg,
            }, "medium");
            return NextResponse.json({ error: "Invalid input", details: errorMsg }, { status: 400 });
        }

        if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
            logger.security("Tenant Access Violation - GrowthOS Review Guard API", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/growthos/reviews/suggest",
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
        logger.error("GrowthOS Review Guard API error", error, {
            endpoint: "/api/growthos/reviews/suggest",
            userId: session?.uId || session?.user?.id,
        });
        return NextResponse.json({ error: "Growth Kit review reply failed" }, { status: 500 });
    }
});
