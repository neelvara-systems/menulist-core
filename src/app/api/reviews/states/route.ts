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
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

/**
 * GET /api/reviews/states
 * 
 * Response: { success: true, data: { hasBlockActive: boolean, hasEscalationActive: boolean } }
 */
export const GET = withAuth(async (request: NextRequest, session) => {
    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
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
            .limit(1)
            .get();

        // Filter out expired block states
        const hasBlockActive = blockQuery.docs.some(doc => {
            const data = doc.data();
            return data.autoExpiresAt && data.autoExpiresAt.toMillis() > now.toMillis();
        });

        // Check for any active escalation states (non-expired)
        const escalationQuery = await db
            .collection(DB_COLLECTIONS.REVIEWS_STATE)
            .where("tId", "==", tenantId)
            .where("sId", "==", storeId)
            .where("escalationActive", "==", true)
            .limit(1)
            .get();

        const hasEscalationActive = escalationQuery.docs.some(doc => {
            const data = doc.data();
            return data.autoExpiresAt && data.autoExpiresAt.toMillis() > now.toMillis();
        });

        return NextResponse.json({
            success: true,
            data: { hasBlockActive, hasEscalationActive },
        });
    } catch (error) {
        console.error("[Reviews] Error fetching states:", error);
        return NextResponse.json(
            { error: "Failed to fetch review states" },
            { status: 500 }
        );
    }
});
