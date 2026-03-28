import { DB_COLLECTIONS } from "@constant/database";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { addDoc, collection, getDocs, orderBy, query, where } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.PAYMENT_TRANSACTIONS;

// Helper function to get subscription collection reference
export const getCollectionRef = () => collection(firebaseClient, COLLECTION);

/**
 * Creates the initial subscription document in Firestore with a 'pending' status.
 * @param data - The details for the new subscription.
 * @returns The ID of the newly created Firestore document.
 */
export const createPaymentTransaction = async (data: any): Promise<string> => {
    return await apiCallComposer(
        async () => {
            const processedData = await requestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), processedData);
            return docRef.id;
        },
        "createPaymentTransaction"
    );
};


export const getBillingHistoryForStore = async (tenantId: number, storeId: number): Promise<any[]> => {
    return await apiCallComposer(
        async () => {

            // Your requestBodyComposer adds tId and sId to the top level of the transaction document.
            // We can query on these for efficient, multi-tenant filtering.
            const q = query(
                getCollectionRef(),
                where("tenantId", "==", Number(tenantId)),
                where("storeId", "==", Number(storeId)),
                // We only care about events that represent a successful payment.
                where("event", "in", ["subscription.charged", "order.paid"]),
                orderBy("created_at", "desc") // Show the most recent payments first
            );

            const querySnapshot = await getDocs(q);
            const transactions: any[] = [];
            querySnapshot.forEach((doc) => {
                transactions.push({ id: doc.id, ...doc.data() });
            });

            return transactions;
        },
        `getBillingHistoryForStore: ${storeId}`
    );
};
