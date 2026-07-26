import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import {
    addNonNegativeSafeIntegers,
    isNonNegativeSafeInteger,
} from "@lib/reseller/resellerMutationState";
import type { DocumentSnapshot } from "firebase-admin/firestore";

type DeferredRevenueRow = {
    amount: number;
    document: DocumentSnapshot;
    profileId: string;
    resellerId: string;
};

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
        .where("profileRevenueRecognized", "==", false)
        .limit(10)
        .get();

    if (snapshot.empty) return 0;

    return db.runTransaction(async (transaction) => {
        const currentSnapshots = await Promise.all(snapshot.docs.map((doc) => transaction.get(doc.ref)));
        const deferredSnapshots = currentSnapshots.filter((doc) => {
            if (!doc.exists) return false;
            const data = doc.data();
            return data?.profileRevenueRecognized === false
                && data.paymentMode === "online"
                && data.subscriptionId === subscriptionId
                && (data.status === "pending_payment" || data.status === "active");
        });
        if (deferredSnapshots.length === 0) return 0;
        const activatedCount = deferredSnapshots.filter((doc) => doc.data()?.status === "pending_payment").length;

        const deferredRows: DeferredRevenueRow[] = [];
        deferredSnapshots.forEach((doc) => {
            const data = doc.data() || {};
            // Old online rows were counted at onboarding. Only rows explicitly
            // written with the corrected deferred marker are recognized here.
            if (data.profileRevenueRecognized !== false) return;
            const profileId = data.resellerProfileId;
            const resellerId = data.resellerId;
            if (
                !isValidFirestoreDocumentId(profileId)
                || typeof resellerId !== "string"
                || !isValidFirestoreDocumentId(resellerId)
                || !isNonNegativeSafeInteger(data.amountExpected)
            ) {
                return;
            }
            deferredRows.push({
                amount: data.amountExpected,
                document: doc,
                profileId,
                resellerId,
            });
        });

        const rowsByProfile = new Map<string, DeferredRevenueRow[]>();
        deferredRows.forEach((row) => {
            rowsByProfile.set(row.profileId, [...(rowsByProfile.get(row.profileId) || []), row]);
        });
        const profileEntries = Array.from(rowsByProfile.entries());
        const profileSnapshots = await Promise.all(profileEntries.map(([profileId]) => (
            transaction.get(db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId))
        )));
        const recognizedTransactionIds = new Set<string>();
        const nextRevenueByProfile = new Map<string, number>();
        profileEntries.forEach(([profileId, rows], index) => {
            const profileSnapshot = profileSnapshots[index];
            if (!profileSnapshot?.exists) return;
            const profile = profileSnapshot.data() || {};
            if (!rows.every((row) => (
                profileId === row.resellerId || profile.authUserId === row.resellerId
            ))) {
                return;
            }
            let nextRevenue = profile.totalRevenueCollectedPaise === undefined
                ? 0
                : profile.totalRevenueCollectedPaise;
            if (!isNonNegativeSafeInteger(nextRevenue)) return;
            for (const row of rows) {
                const next = addNonNegativeSafeIntegers(nextRevenue, row.amount);
                if (next === null) return;
                nextRevenue = next;
            }
            nextRevenueByProfile.set(profileId, nextRevenue);
            rows.forEach((row) => recognizedTransactionIds.add(row.document.id));
        });
        const now = admin.firestore.Timestamp.now();

        deferredSnapshots.forEach((doc) => {
            const wasPending = doc.data()?.status === "pending_payment";
            const recognized = recognizedTransactionIds.has(doc.id);
            if (!wasPending && !recognized) return;
            transaction.update(doc.ref, {
                modifiedOn: now,
                ...(wasPending ? {
                    paymentConfirmedContext: context,
                    paymentConfirmedAt: now,
                    status: "active",
                } : {}),
                ...(recognized ? { profileRevenueRecognized: true } : {}),
            });
        });
        nextRevenueByProfile.forEach((nextRevenue, profileId) => {
            transaction.update(db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId), {
                modifiedOn: now,
                totalRevenueCollectedPaise: nextRevenue,
            });
        });

        return activatedCount;
    });
}
