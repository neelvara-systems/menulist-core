export const dynamic = 'force-dynamic';
/**
 * Review States API
 *
 * GET /api/reviews/states — Returns boolean block/escalation state
 * 
 * Returns ONLY booleans (no counts) to prevent dashboard mentality.
 * Owner sees: "has block active" / "has escalation active" — nothing more.
 *
 * @see __docs__/reviews-reputation/reviews-reputation_impl.md §4
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

/**
 * GET /api/reviews/states
 * 
 * Response: { success: true, data: { hasBlockActive: boolean, hasEscalationActive: boolean } }
 */
export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
    }

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const userRateLimitHash = hashPublicRateLimitValue(session.uId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const rateLimit = await checkRateLimit({
        key: `review-states:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        limit: 30,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 },
        );
    }

    try {
        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        // Check for any active block states (non-expired)
        const blockQuery = await db
            .collection(DB_COLLECTIONS.REVIEWS_STATE)
            .where("tId", "==", tenantId)
            .where("sId", "==", storeId)
            .where("blockActive", "==", true)
            .where("autoExpiresAt", ">", now)
            .limit(1)
            .get();

        const hasBlockActive = !blockQuery.empty;

        // Check for any active escalation states (non-expired)
        const escalationQuery = await db
            .collection(DB_COLLECTIONS.REVIEWS_STATE)
            .where("tId", "==", tenantId)
            .where("sId", "==", storeId)
            .where("escalationActive", "==", true)
            .where("autoExpiresAt", ">", now)
            .limit(1)
            .get();

        const hasEscalationActive = !escalationQuery.empty;

        return NextResponse.json({
            success: true,
            data: { hasBlockActive, hasEscalationActive },
        });
    } catch (error) {
        logRuntimeFailure("reviews_states_fetch_failed", error, {
            ...getBoundedRuntimeStringContext("tenantId", tenantId),
            ...getBoundedRuntimeStringContext("storeId", storeId),
            ...getBoundedRuntimeStringContext("userId", session.uId || session.user?.id),
        });
        return NextResponse.json(
            { error: "Failed to fetch review states" },
            { status: 500 }
        );
    }
});
