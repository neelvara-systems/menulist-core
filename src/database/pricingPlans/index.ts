import { DB_COLLECTIONS } from "@constant/database";
import { PricingPlan } from "@data/common";
import { collection, getDoc, getDocs, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { addDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.PRICING_PLANS;

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const getAllPricingPlans = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllPricingPlans"
    );
}

export const getActivePricingPlans = async (planType?: string) => {
    return await apiCallComposer(
        async () => {
            // Create base query for active plans
            let queryRef = query(getCollectionRef(), where("active", "==", true));

            // Add planType filter if specified
            if (planType) {
                queryRef = query(queryRef, where("planType", "==", planType));
            }

            const querySnapshot = await getDocs(queryRef);
            if (querySnapshot.empty) {
                return ([]);
            } else {
                const list: any = [];
                querySnapshot.forEach((doc) => {
                    list.push({ ...doc.data(), id: doc.id })
                });
                return (list)
            }
        },
        "getActivePricingPlans"
    );
}

export const getPricingPlanById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            } else {
                return null
            }
        },
        id,
        "getPricingPlanById"
    );
}

export const addPricingPlan = async (data: PricingPlan) => {
    return await apiCallComposer(
        async () => {
            // Add version and timestamps
            const planData = {
                ...data,
                version: 1,
                active: data.active ?? true,
                createdOn: serverTimestamp(),
                modifiedOn: serverTimestamp()
            };

            // Add plan to Firestore
            const docRef = await addDoc(getCollectionRef(), await requestBodyComposer(planData));

            // Return the added plan with ID
            return {
                ...planData,
                id: docRef.id
            };
        },
        data,
        "addPricingPlan"
    );
}

export const updatePricingPlan = async (data: PricingPlan) => {
    return await apiCallComposer(
        async () => {
            if (!data.id) {
                throw new Error("Plan ID is required for updates");
            }

            // Get current plan to increment version
            const currentPlan = await getPricingPlanById(data.id);

            // Prepare update data
            const updateData = {
                ...data,
                version: (currentPlan?.version || 0) + 1,
                modifiedOn: serverTimestamp()
            };

            // Update the plan
            await updateDoc(getDocRef(data.id), updateData);

            return updateData;
        },
        data,
        "updatePricingPlan"
    );
}

export const deactivatePricingPlan = async (id: string) => {
    return await apiCallComposer(
        async () => {
            await updateDoc(getDocRef(id), {
                active: false,
                modifiedOn: serverTimestamp()
            });
            return { id, active: false };
        },
        id,
        "deactivatePricingPlan"
    );
}

// Helper function to seed initial plans if needed
export const seedInitialPlans = async (plans: PricingPlan[]) => {
    return await apiCallComposer(
        async () => {
            const results = [];

            for (const plan of plans) {
                const result = await addPricingPlan(plan);
                results.push(result);
            }

            return results;
        },
        plans,
        "seedInitialPlans"
    );
}
