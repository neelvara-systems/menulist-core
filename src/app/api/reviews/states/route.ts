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
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

type ReviewsSessionDocumentId = {
    value: string | number;
    documentId: string;
};

function normalizeReviewsSessionDocumentId(value: unknown): ReviewsSessionDocumentId | null {
    const typedValue = typeof value === "string" || typeof value === "number" ? value : null;
    if (typedValue === null) return null;
    const raw = String(typedValue);
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId)
        ? { value: typedValue, documentId }
        : null;
}

function getReviewsSessionScope(session: any): {
    tenantId: string | number;
    storeId: string | number;
    tenantDocumentId: string;
    storeDocumentId: string;
} | null {
    const tenantId = normalizeReviewsSessionDocumentId(session?.tId);
    const storeId = normalizeReviewsSessionDocumentId(session?.sId);
    return tenantId && storeId
        ? {
            tenantId: tenantId.value,
            storeId: storeId.value,
            tenantDocumentId: tenantId.documentId,
            storeDocumentId: storeId.documentId,
        }
        : null;
}

/**
 * GET /api/reviews/states
 * 
 * Response: { success: true, data: { hasBlockActive: boolean, hasEscalationActive: boolean } }
 */
export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION) {
        return NextResponse.json({ error: "Feature disabled" }, { status: 404 });
    }

    const scope = getReviewsSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;
    const userId = session.uId || session.user?.id || "unknown";

    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeDocumentId);
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
            ...getBoundedRuntimeStringContext("userId", userId),
        });
        return NextResponse.json(
            { error: "Failed to fetch review states" },
            { status: 500 }
        );
    }
});
