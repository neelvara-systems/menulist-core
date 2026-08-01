import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import {
    normalizeBillingSubscriptionScopeDocumentId,
} from "@lib/billing/subscriptionDocumentIdBoundary";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { getMenuListSubscriptionEntitlementScope } from "@lib/billing/menuListSubscriptionEntitlementBoundary";
import { getExactMasterStoreIdFromList } from "@lib/billing/masterStoreBoundary";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { MinimalStoreDataType } from "@type/platform/store";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { getGracePeriodInfo } from "@util/razorpay";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.SUBSCRIPTIONS;
const activeSubscriptionRequests = new Map<string, Promise<FirestoreSubscriptionDoc | null>>();

const projectExactSubscriptionForScope = (
    data: unknown,
    id: string,
    tenantId: number,
    storeId: number,
): FirestoreSubscriptionDoc | null => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const subscription = { ...(data as FirestoreSubscriptionDoc), id };
    const scope = getMenuListSubscriptionEntitlementScope(subscription);
    return scope?.tenantId === tenantId && scope.storeId === storeId ? subscription : null;
};

// Helper function to get subscription collection reference
export const getCollectionRef = () => collection(firebaseClient, COLLECTION);

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
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return null;
    const now = Timestamp.now();
    const q = query(
        getCollectionRef(),
        where("pId", "==", PRODUCT_IDS.MENULIST),
        where("productId", "==", PRODUCT_IDS.MENULIST),
        where("status", "in", ["active", "past_due", "cancelled", "paused"]),
        where("cycleEndDate", ">=", now),
        where("tenantId", "==", tenantScope.numericId),
        where("tId", "==", tenantScope.numericId),
        where("storeId", "==", storeScope.numericId),
        where("sId", "==", storeScope.numericId),
        orderBy("cycleEndDate", "desc"),
        limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Fallback: check for paused subscriptions whose billing cycle has ended.
        // A paused sub should still be visible for support recovery from the billing page.
        const pausedFallbackQuery = query(
            getCollectionRef(),
            where("pId", "==", PRODUCT_IDS.MENULIST),
            where("productId", "==", PRODUCT_IDS.MENULIST),
            where("status", "==", "paused"),
            where("tenantId", "==", tenantScope.numericId),
            where("tId", "==", tenantScope.numericId),
            where("storeId", "==", storeScope.numericId),
            where("sId", "==", storeScope.numericId),
            limit(1)
        );
        const pausedSnapshot = await getDocs(pausedFallbackQuery);
        if (!pausedSnapshot.empty) {
            const pausedDoc = pausedSnapshot.docs[0];
            return projectExactSubscriptionForScope(
                pausedDoc.data(),
                pausedDoc.id,
                tenantScope.numericId,
                storeScope.numericId,
            );
        }
        // Pending subscriptions have not started a billing cycle yet, so they
        // do not have cycle dates. Keep them visible on Billing so the owner
        // can complete a reseller or self-serve Razorpay checkout.
        const pendingQuery = query(
            getCollectionRef(),
            where("pId", "==", PRODUCT_IDS.MENULIST),
            where("productId", "==", PRODUCT_IDS.MENULIST),
            where("status", "==", "pending"),
            where("tenantId", "==", tenantScope.numericId),
            where("tId", "==", tenantScope.numericId),
            where("storeId", "==", storeScope.numericId),
            where("sId", "==", storeScope.numericId),
            limit(1)
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        if (!pendingSnapshot.empty) {
            const pendingDoc = pendingSnapshot.docs[0];
            return projectExactSubscriptionForScope(
                pendingDoc.data(),
                pendingDoc.id,
                tenantScope.numericId,
                storeScope.numericId,
            );
        }
        return null;
    }

    const docSnap = querySnapshot.docs[0];
    return projectExactSubscriptionForScope(
        docSnap.data(),
        docSnap.id,
        tenantScope.numericId,
        storeScope.numericId,
    );
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
    return getExactMasterStoreIdFromList(storesList);
}

/**
 * LAYER 3 — Orchestrator. Fetch + expiry + outlet fallback.
 */
export const getActiveSubscriptionForStore = async (
    tenantId: number,
    storeId: number,
    tenantStoresList?: MinimalStoreDataType[],
): Promise<FirestoreSubscriptionDoc | null> => {
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return null;
    const requestKey = `${tenantScope.documentId}:${storeScope.documentId}`;
    const shouldDedupeRequest = typeof window !== 'undefined';
    const existingRequest = shouldDedupeRequest ? activeSubscriptionRequests.get(requestKey) : null;
    if (existingRequest) return existingRequest;

    const request = apiCallComposer(
        async () => {
            const raw = await fetchSubscriptionRaw(tenantScope.numericId, storeScope.numericId);
            if (raw) return await expireIfGracePeriodEnded(raw);

            // BT4: Outlet fallback — outlet has no subscription, check master's
            if (!FEATURE_FLAGS.ENABLE_OUTLET_BILLING) return null;

            let masterStoreId: number | null = null;
            if (tenantStoresList) {
                masterStoreId = getMasterStoreIdFromList(tenantStoresList);
            } else {
                const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, tenantScope.documentId);
                const tenantSnap = await getDoc(tenantRef);
                if (tenantSnap.exists()) {
                    const tenantData = tenantSnap.data();
                    masterStoreId = getMasterStoreIdFromList(tenantData?.storesList);
                }
            }

            if (!masterStoreId || masterStoreId === storeScope.numericId) return null;

            const masterRaw = await fetchSubscriptionRaw(tenantScope.numericId, masterStoreId);
            if (!masterRaw) return null;
            return await expireIfGracePeriodEnded(masterRaw);
        },
        `getActiveSubscriptionForStore: ${storeScope.documentId}`
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
