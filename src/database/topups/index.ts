import { DB_COLLECTIONS } from "@constant/database";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { FirestoreTopupDoc } from "@type/razorpay";
import { collection, doc, setDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.TOPUPS;

// Helper function to get subscription collection reference
export const getCollectionRef = () => collection(firebaseClient, COLLECTION);

const getDocRef = (docId: string) => doc(getCollectionRef(), docId);

export const createInitialTopupEntry = async (providerOrderId: string, data: Omit<FirestoreTopupDoc, "id" | "status">): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(providerOrderId); // Use the provider ID for the doc ref
            const payload = { ...data, status: "pending" };
            const processedData = await requestBodyComposer(payload);
            await setDoc(docRef, processedData); // Use setDoc to create with a specific ID
        },
        "createInitialTopupEntry"
    );
};

export const updateTopupOrder = async (providerOrderId: string, data: Partial<FirestoreTopupDoc>): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(providerOrderId);
            const processedData = await requestBodyComposer(data);
            await setDoc(docRef, processedData, { merge: true });
        },
        "updateTopupOrder"
    );
};

