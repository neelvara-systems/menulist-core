import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { normalizeBillingSubscriptionDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { MinimalStoreDataType } from "@type/platform/store";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { getGracePeriodInfo } from "@util/razorpay";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, Timestamp, where } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.SUBSCRIPTIONS;
const activeSubscriptionRequests = new Map<string, Promise<FirestoreSubscriptionDoc | null>>();

// Helper function to get subscription collection reference
export const getCollectionRef = () => collection(firebaseClient, COLLECTION);

const getDocRef = (docId: string) => {
    const normalizedDocId = normalizeBillingSubscriptionDocumentId(docId);
    if (!normalizedDocId) throw new Error("Invalid billing subscription id.");
    return doc(getCollectionRef(), normalizedDocId);
};

// ── Subscription Status Reference ──
// active: The user is in good standing and is scheduled to be billed again.
// past_due: A payment failed, and the system is retrying. Access is often still granted for a grace period.
// cancelled: The user has voluntarily requested to end their subscription. Auto-renewal is OFF. Access is still granted until cycleEndDate.
// paused: Legacy/provider-side pause state. Access valid until cycleEndDate.
// Self-service pause/resume is disabled unless ENABLE_SUBSCRIPTION_PAUSE is enabled.
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
        // A paused sub should still be visible for support recovery from the billing page.
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
        // Pending subscriptions have not started a billing cycle yet, so they
        // do not have cycle dates. Keep them visible on Billing so the owner
        // can complete a reseller or self-serve Razorpay checkout.
        const pendingQuery = query(
            getCollectionRef(),
            where("status", "==", "pending"),
            where("tenantId", "==", tenantId),
            where("storeId", "==", storeId),
            limit(1)
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        if (!pendingSnapshot.empty) {
            const pendingDoc = pendingSnapshot.docs[0];
            return { id: pendingDoc.id, ...pendingDoc.data() } as FirestoreSubscriptionDoc;
        }
        return null;
    }

    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as FirestoreSubscriptionDoc;
};

/**
 * LAYER 2 — Client grace-period enforcement.
 * Browser reads never mutate billing documents. They return no active access
 * once grace has ended; server-owned paths perform the authoritative expiry
 * write and entitlement/cache sync.
 */
const expireIfGracePeriodEnded = async (sub: FirestoreSubscriptionDoc): Promise<FirestoreSubscriptionDoc | null> => {
    if (!sub.pastDueSinceAt) return sub;

    const { remainingDays } = getGracePeriodInfo(sub.pastDueSinceAt);

    if (remainingDays > 0) {
        // User is INSIDE the grace period — still has access
        return sub;
    }

    // Client reads cannot mutate billing documents. Server-owned access paths
    // perform the authoritative expiry write and entitlement sync.
    if (!validateTransition(sub.status, 'expired', 'dal:grace-period-client-check')) {
        return sub;
    }
    return null;
};

/** BT5: Derive master store ID from storesList without extra Firestore read. */
export function getMasterStoreIdFromList(storesList?: MinimalStoreDataType[]): number | null {
    if (!storesList?.length) return null;

    const normalizedStores = storesList
        .map((store) => {
            const storeId = Number(store?.storeId);
            return Number.isFinite(storeId) && storeId > 0
                ? { store, storeId }
                : null;
        })
        .filter((store): store is { store: MinimalStoreDataType; storeId: number } => Boolean(store));

    const explicitMaster = normalizedStores.find(({ store }) => (
        store?.isMaster === true
        || store?.storeDetails?.isMaster === true
    ));
    if (explicitMaster) return explicitMaster.storeId;

    // Legacy tenants may have store.isMaster=true while tenants.storesList
    // missed the same marker. If all outlets are explicitly isMaster:false,
    // the remaining active unflagged store is the master without another read.
    const activeStores = normalizedStores.filter(({ store }) => (
        (store as any)?.active !== false
        && store?.storeDetails?.active !== false
    ));
    if (activeStores.length === 1) return activeStores[0].storeId;

    const unflaggedActiveStores = activeStores.filter(({ store }) => (
        store?.isMaster !== false
        && store?.storeDetails?.isMaster !== false
    ));
    if (unflaggedActiveStores.length === 1) return unflaggedActiveStores[0].storeId;

    return null;
}

/**
 * LAYER 3 — Orchestrator. Fetch + expiry + outlet fallback.
 */
export const getActiveSubscriptionForStore = async (
    tenantId: number,
    storeId: number,
    tenantStoresList?: MinimalStoreDataType[],
): Promise<FirestoreSubscriptionDoc | null> => {
    const requestKey = `${tenantId}:${storeId}`;
    const shouldDedupeRequest = typeof window !== 'undefined';
    const existingRequest = shouldDedupeRequest ? activeSubscriptionRequests.get(requestKey) : null;
    if (existingRequest) return existingRequest;

    const request = apiCallComposer(
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
    ).finally(() => {
        if (shouldDedupeRequest) {
            activeSubscriptionRequests.delete(requestKey);
        }
    });

    if (shouldDedupeRequest) {
        activeSubscriptionRequests.set(requestKey, request);
    }
    return await request;
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
            const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(id);
            if (!normalizedSubscriptionId) return null;

            const collectionDocRef = doc(getCollectionRef(), normalizedSubscriptionId);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            } else {
                return null
            }
        },
        id,
        "getSubscriptionById"
    );
}
