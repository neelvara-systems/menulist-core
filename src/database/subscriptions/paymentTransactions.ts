import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { normalizeBillingSubscriptionScopeDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.PAYMENT_TRANSACTIONS;

// Helper function to get subscription collection reference
export const getCollectionRef = () => collection(firebaseClient, COLLECTION);

export type BillingHistoryLedgerRow = Record<string, unknown> & { id: string };

export const getBillingHistoryForStore = async (tenantId: unknown, storeId: unknown): Promise<BillingHistoryLedgerRow[]> => {
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return [];

    return await apiCallComposer(
        async () => {

            // Server-owned ledger writers persist exact numeric tenant/store scope.
            // Firestore rules independently require the signed-in user to own both scopes.
            const q = query(
                getCollectionRef(),
                where("tenantId", "==", tenantScope.numericId),
                where("storeId", "==", storeScope.numericId),
                // Successful payments plus zero-cash referral credit rewards.
                where("event", "in", ["subscription.charged", "order.paid", "owner_referral.reward_issued"]),
                orderBy("created_at", "desc"), // Show the most recent payments first
                limit(50),
            );

            const querySnapshot = await getDocs(q);
            const transactions: BillingHistoryLedgerRow[] = [];
            querySnapshot.forEach((doc) => {
                transactions.push({ id: doc.id, ...doc.data() });
            });

            return transactions;
        },
        `getBillingHistoryForStore: ${storeScope.documentId}`
    );
};
