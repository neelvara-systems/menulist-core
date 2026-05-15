import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";

/**
 * Marks pending reseller online-onboarding transactions active once Razorpay
 * confirms the subscription. Offline/cash transactions are created active.
 */
export async function markResellerTransactionsActiveForSubscription(
    subscriptionId: string,
    context: string,
): Promise<number> {
    if (!subscriptionId) return 0;

    const db = admin.firestore();
    const snapshot = await db.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
        .where("subscriptionId", "==", subscriptionId)
        .limit(10)
        .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    let updates = 0;
    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status !== "pending_payment") return;
        batch.update(doc.ref, {
            modifiedOn: admin.firestore.Timestamp.now(),
            paymentConfirmedContext: context,
            paymentConfirmedAt: admin.firestore.Timestamp.now(),
            status: "active",
        });
        updates += 1;
    });

    if (updates > 0) await batch.commit();
    return updates;
}
