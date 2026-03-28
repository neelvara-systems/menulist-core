import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { MinimalStoreDataType } from "@type/platform/store";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { getGracePeriodInfo } from "@util/razorpay";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, Timestamp, where } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.SUBSCRIPTIONS;

// Helper function to get subscription collection reference
export const getCollectionRef = () => collection(firebaseClient, COLLECTION);

const getDocRef = (docId: string) => doc(getCollectionRef(), docId);

// ── Subscription Status Reference ──
// active: The user is in good standing and is scheduled to be billed again.
// past_due: A payment failed, and the system is retrying. Access is often still granted for a grace period.
// cancelled: The user has voluntarily requested to end their subscription. Auto-renewal is OFF. Access is still granted until cycleEndDate.
// paused: The user has paused billing. Access valid until cycleEndDate. Resumable from billing page even after cycle ends.
// expired: The cycleEndDate for a cancelled subscription has passed, or grace period ended. The user has lost access to paid features.
// completed: All billing cycles exhausted (total_count reached). User must purchase new plan.

/**
 * LAYER 1 — Pure Firestore fetch. No business logic, no mutations.
 * Returns the raw subscription document or null.
 */
const fetchSubscriptionRaw = async (tenantId: number, storeId: number): Promise<FirestoreSubscriptionDoc | null> => {
    const now = Timestamp.now();
    const q = query(
        getCollectionRef(),
        where("status", "in", ["active", "past_due", "cancelled", "paused"]),
        where("cycleEndDate", ">=", now),
        where("tenantId", "==", tenantId),
        where("storeId", "==", storeId),
        limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Fallback: check for paused subscriptions whose billing cycle has ended.
        // A paused sub should still be visible so the user can resume it from the billing page.
        const pausedFallbackQuery = query(
            getCollectionRef(),
            where("status", "==", "paused"),
            where("tenantId", "==", tenantId),
            where("storeId", "==", storeId),
            limit(1)
        );
        const pausedSnapshot = await getDocs(pausedFallbackQuery);
        if (!pausedSnapshot.empty) {
            const pausedDoc = pausedSnapshot.docs[0];
            return { id: pausedDoc.id, ...pausedDoc.data() } as FirestoreSubscriptionDoc;
        }
        return null;
    }

    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as FirestoreSubscriptionDoc;
};

/**
 * LAYER 2 — Grace period enforcement. Single responsibility: expire if grace period ended.
 * This is the ONLY place that performs a write (auto-expire) during a read path.
 * Isolated so the blast radius of a bug here is minimal.
 */
const expireIfGracePeriodEnded = async (sub: FirestoreSubscriptionDoc): Promise<FirestoreSubscriptionDoc | null> => {
    if (!sub.pastDueSinceAt) return sub;

    const { remainingDays, graceEndsDate } = getGracePeriodInfo(sub.pastDueSinceAt);

    if (remainingDays > 0) {
        // User is INSIDE the grace period — still has access
        return sub;
    }

    // User is OUTSIDE the grace period — auto-expire
    validateTransition(sub.status, 'expired', 'dal:grace-period-auto-expire');
    await updateSubscription(sub.id, {
        status: 'expired',
        cycleEndDate: Timestamp.now(),
        subscriptionEndDate: Timestamp.now(),
        statuses: [
            ...sub.statuses,
            {
                status: "expired",
                timestamp: Timestamp.now(),
                amount: sub.amount,
                currency: sub.currency,
                remark: `Expired due to payment failed and past due since ${graceEndsDate?.toLocaleDateString()}`
            },
        ],
    });
    return null;
};

/** BT5: Derive master store ID from storesList without extra Firestore read. */
export function getMasterStoreIdFromList(storesList?: MinimalStoreDataType[]): number | null {
    if (!storesList?.length) return null;
    return storesList.find(s => s.isMaster === true)?.storeId ?? null;
}

/**
 * LAYER 3 — Orchestrator. Fetch + expiry + outlet fallback.
 */
export const getActiveSubscriptionForStore = async (
    tenantId: number,
    storeId: number,
    tenantStoresList?: MinimalStoreDataType[],
): Promise<FirestoreSubscriptionDoc | null> => {
    return await apiCallComposer(
        async () => {
            const raw = await fetchSubscriptionRaw(tenantId, storeId);
            if (raw) return await expireIfGracePeriodEnded(raw);

            // BT4: Outlet fallback — outlet has no subscription, check master's
            if (!FEATURE_FLAGS.ENABLE_OUTLET_BILLING) return null;

            let masterStoreId: number | null = null;
            if (tenantStoresList) {
                masterStoreId = getMasterStoreIdFromList(tenantStoresList);
            } else {
                const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
                const tenantSnap = await getDoc(tenantRef);
                if (tenantSnap.exists()) {
                    const tenantData = tenantSnap.data();
                    masterStoreId = getMasterStoreIdFromList(tenantData?.storesList);
                }
            }

            if (!masterStoreId || masterStoreId === storeId) return null;

            const masterRaw = await fetchSubscriptionRaw(tenantId, masterStoreId);
            if (!masterRaw) return null;
            return await expireIfGracePeriodEnded(masterRaw);
        },
        `getActiveSubscriptionForStore: ${storeId}`
    );
};


/**
 * Creates the initial subscription document in Firestore with a 'pending' status,
 * using the Razorpay Subscription ID as the Firestore Document ID.
 * @param providerSubscriptionId - The ID from Razorpay, which will be used as the document ID.
 * @param data - The details for the new subscription.
 */
export const createInitialSubscription = async (providerSubscriptionId: string, data: Omit<FirestoreSubscriptionDoc, "id">): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(providerSubscriptionId); // Use the provider ID for the doc ref
            const processedData = await requestBodyComposer(data);
            await setDoc(docRef, processedData); // Use setDoc to create with a specific ID
        },
        "createInitialSubscription"
    );
};

/**
 * Updates an existing subscription document in Firestore.
 * @param subscriptionId - The Firestore document ID of the subscription.
 * @param data - The data to update.
 */
export const updateSubscription = async (subscriptionId: string, data: Partial<FirestoreSubscriptionDoc>): Promise<void> => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(subscriptionId);
            const processedData = await requestBodyComposer(data);
            await setDoc(docRef, processedData, { merge: true });
        },
        "updateSubscription"
    );
};

export const getSubscriptionById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id };
            } else {
                return null
            }
        },
        id,
        "getSubscriptionById"
    );
}