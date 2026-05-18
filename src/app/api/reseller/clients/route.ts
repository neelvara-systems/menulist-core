export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

/**
 * GET /api/reseller/clients — List reseller's onboarded clients
 * 
 * Returns all transactions for the authenticated reseller.
 * PLATFORM role sees all resellers' transactions.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.3
 */
export const GET = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const isPlatform = session.user.platformRole === 'PLATFORM' || session.platformRole === 'PLATFORM';
        const resellerId = session.user.id;
        const db = admin.firestore();

        const transactionsCollection = db.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS);
        const transactionsQuery = isPlatform
            ? transactionsCollection.orderBy("createdOn", "desc").limit(200)
            : transactionsCollection.where("resellerId", "==", resellerId).limit(100);

        const snapshot = await transactionsQuery.get();
        const transactions = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdOn: data.createdOn?.toDate?.()?.toISOString?.() || data.createdOn || null,
                modifiedOn: data.modifiedOn?.toDate?.()?.toISOString?.() || data.modifiedOn || null,
                validUntil: data.validUntil?.toDate?.()?.toISOString?.() || data.validUntil || null,
            };
        }).sort((a, b) => new Date(b.createdOn || 0).getTime() - new Date(a.createdOn || 0).getTime());

        return NextResponse.json({ transactions });

    } catch (error) {
        console.error('[Reseller Clients] Failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clients.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
