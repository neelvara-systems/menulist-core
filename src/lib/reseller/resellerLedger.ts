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

    return db.runTransaction(async (transaction) => {
        const currentSnapshots = await Promise.all(snapshot.docs.map((doc) => transaction.get(doc.ref)));
        const pendingSnapshots = currentSnapshots.filter((doc) => doc.exists && doc.data()?.status === 'pending_payment');
        if (pendingSnapshots.length === 0) return 0;

        const onlineRevenueByProfile = new Map<string, number>();
        const revenueRecognizedTransactionIds = new Set<string>();
        pendingSnapshots.forEach((doc) => {
            const data = doc.data() || {};
            // Old online rows were counted at onboarding. Only rows explicitly
            // written with the corrected deferred marker are recognized here.
            if (data.paymentMode !== 'online' || data.profileRevenueRecognized !== false) return;
            const profileId = typeof data.resellerProfileId === 'string'
                ? data.resellerProfileId.trim()
                : '';
            const amount = Number(data.amountExpected);
            if (!profileId || !Number.isSafeInteger(amount) || amount < 0) return;
            onlineRevenueByProfile.set(profileId, (onlineRevenueByProfile.get(profileId) || 0) + amount);
            revenueRecognizedTransactionIds.add(doc.id);
        });

        const profileEntries = Array.from(onlineRevenueByProfile.entries());
        const profileSnapshots = await Promise.all(profileEntries.map(([profileId]) => (
            transaction.get(db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId))
        )));
        const now = admin.firestore.Timestamp.now();

        pendingSnapshots.forEach((doc) => {
            transaction.update(doc.ref, {
                modifiedOn: now,
                paymentConfirmedContext: context,
                paymentConfirmedAt: now,
                ...(revenueRecognizedTransactionIds.has(doc.id) ? { profileRevenueRecognized: true } : {}),
                status: 'active',
            });
        });
        profileEntries.forEach(([profileId, amount], index) => {
            if (!profileSnapshots[index]?.exists) return;
            transaction.update(db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId), {
                modifiedOn: now,
                totalRevenueCollectedPaise: admin.firestore.FieldValue.increment(amount),
            });
        });

        return pendingSnapshots.length;
    });
}
