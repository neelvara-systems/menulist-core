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
        const rawTransactions: any[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdOn: data.createdOn?.toDate?.()?.toISOString?.() || data.createdOn || null,
                modifiedOn: data.modifiedOn?.toDate?.()?.toISOString?.() || data.modifiedOn || null,
                validUntil: data.validUntil?.toDate?.()?.toISOString?.() || data.validUntil || null,
            };
        });

        // Current subscription state is needed for manual location capacity.
        // This dashboard is low-volume and capped, so one bounded read per
        // visible client keeps the reseller UI accurate without duplicating
        // subscription truth onto every transaction.
        const subscriptionIds = Array.from(new Set(
            rawTransactions
                .map((transaction) => String(transaction.subscriptionId || ''))
                .filter(Boolean),
        )).slice(0, isPlatform ? 200 : 100);
        const subscriptionDocs = subscriptionIds.length
            ? await db.getAll(...subscriptionIds.map((id) => db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(id)))
            : [];
        const subscriptionsById = new Map(subscriptionDocs
            .filter((doc) => doc.exists)
            .map((doc) => [doc.id, doc.data() || {}]));

        const transactions = rawTransactions.map((transaction) => {
            const subscription = subscriptionsById.get(String(transaction.subscriptionId || ''));
            const subscriptionStatus = subscription?.status;
            return {
                ...transaction,
                amountExpected: Number(transaction.amountExpected || 0),
                status: subscriptionStatus === 'pending'
                    ? 'pending_payment'
                    : (subscriptionStatus || transaction.status),
                subscriptionAmount: subscription?.amount,
                subscriptionBillingMode: subscription?.billingMode,
                subscriptionQuantity: subscription?.quantity || transaction.subscriptionQuantity || transaction.locationCount || 1,
                subscriptionShortUrl: subscription?.shortUrl || transaction.shortUrl || null,
                subscriptionStatus,
                validUntil: subscription?.validUntil?.toDate?.()?.toISOString?.()
                    || subscription?.cycleEndDate?.toDate?.()?.toISOString?.()
                    || transaction.validUntil
                    || null,
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
