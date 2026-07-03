import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

const subscriptionRequests = new Map<string, Promise<FirestoreSubscriptionDoc | null>>();

const getSubscriptionCollectionRef = () => collection(answerlatticeFirebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS);
const getPaymentTransactionCollectionRef = () => collection(answerlatticeFirebaseClient, DB_COLLECTIONS.PAYMENT_TRANSACTIONS);
const getStoreDocumentRef = (storeId: number) => doc(answerlatticeFirebaseClient, DB_COLLECTIONS.STORES, String(storeId));
const getSubscriptionDocumentRef = (subscriptionId: string) => doc(answerlatticeFirebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS, subscriptionId);

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    return Number(value) || 0;
};

const normalizeSubscription = (
    data: Record<string, any>,
    id: string,
    tenantId: number,
    storeId: number,
): FirestoreSubscriptionDoc => ({
    id,
    ...data,
    providerSubscriptionId: data.providerSubscriptionId || id,
    tenantId: Number(data.tenantId ?? data.tId ?? tenantId),
    storeId: Number(data.storeId ?? data.sId ?? storeId),
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : 0,
    quantity: Number.isFinite(Number(data.quantity)) && Number(data.quantity) > 0 ? Number(data.quantity) : 1,
    monthlyCreditsAllowance: Number.isFinite(Number(data.monthlyCreditsAllowance)) ? Number(data.monthlyCreditsAllowance) : 0,
    monthlyCredits: Number.isFinite(Number(data.monthlyCredits)) ? Number(data.monthlyCredits) : 0,
    topUpCredits: Number.isFinite(Number(data.topUpCredits)) ? Number(data.topUpCredits) : 0,
    currency: data.currency || 'INR',
    status: data.status || 'pending',
    planType: data.planType || 'MONTH',
    planName: data.planName || 'Answerlattice Plan',
    planId: data.planId || '',
    paymentMethod: data.paymentMethod || { type: '', brand: '', last4: '', upiId: '', upiTransactionId: '' },
    statuses: Array.isArray(data.statuses) ? data.statuses : [],
    billingHistory: Array.isArray(data.billingHistory) ? data.billingHistory : [],
    shortUrl: data.shortUrl || '',
} as FirestoreSubscriptionDoc);

const isSubscriptionForScope = (subscription: FirestoreSubscriptionDoc, tenantId: number, storeId: number): boolean => (
    Number(subscription.tenantId ?? subscription.tId) === Number(tenantId)
    && Number(subscription.storeId ?? subscription.sId) === Number(storeId)
);

const isCurrentSubscription = (subscription: FirestoreSubscriptionDoc): boolean => {
    if (['pending', 'paused', 'past_due'].includes(String(subscription.status))) return true;
    if (subscription.status === 'active') {
        const cycleEndMs = toMillis(subscription.cycleEndDate);
        return !cycleEndMs || cycleEndMs >= Date.now();
    }
    if (subscription.status === 'cancelled') {
        const cycleEndMs = toMillis(subscription.cycleEndDate);
        return Boolean(cycleEndMs && cycleEndMs >= Date.now());
    }
    return false;
};

const fetchSubscriptionFromStoreSummary = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const storeSnapshot = await getDoc(getStoreDocumentRef(storeId));
    const summary = storeSnapshot.exists() ? storeSnapshot.data()?.answerlatticeSubscription : null;
    if (!summary || typeof summary !== 'object') return null;

    const subscriptionId = String(summary.id || summary.providerSubscriptionId || '').trim();
    if (!subscriptionId) {
        return normalizeSubscription(summary, `answerlattice_summary_${tenantId}_${storeId}`, tenantId, storeId);
    }

    const subscriptionSnapshot = await getDoc(getSubscriptionDocumentRef(subscriptionId));
    if (!subscriptionSnapshot.exists()) {
        return normalizeSubscription(summary, subscriptionId, tenantId, storeId);
    }

    const subscription = normalizeSubscription(subscriptionSnapshot.data(), subscriptionSnapshot.id, tenantId, storeId);
    return isSubscriptionForScope(subscription, tenantId, storeId) ? subscription : null;
};

const fetchAnswerlatticeSubscriptionRaw = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const summarySubscription = await fetchSubscriptionFromStoreSummary(tenantId, storeId);
    if (summarySubscription) return summarySubscription;

    const fallbackSnapshot = await getDocs(query(
        getSubscriptionCollectionRef(),
        where('tenantId', '==', Number(tenantId)),
        where('storeId', '==', Number(storeId)),
        limit(10),
    ));
    const subscriptions = fallbackSnapshot.docs
        .map((docSnap) => normalizeSubscription(docSnap.data(), docSnap.id, tenantId, storeId))
        .filter((subscription) => isSubscriptionForScope(subscription, tenantId, storeId))
        .filter(isCurrentSubscription)
        .sort((a, b) => toMillis(b.cycleEndDate) - toMillis(a.cycleEndDate));

    if (subscriptions.length) {
        return subscriptions[0];
    }

    return null;
};

export const getAnswerlatticeActiveSubscriptionForStore = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const requestKey = `${tenantId}:${storeId}`;
    const existingRequest = subscriptionRequests.get(requestKey);
    if (existingRequest) return existingRequest;

    const request = fetchAnswerlatticeSubscriptionRaw(tenantId, storeId)
        .catch((error) => {
            logAnswerlatticeFailure('answerlattice_billing_active_subscription_load_failed', error, {
                ...getAnswerlatticeScopeLogContext({
                    sId: storeId,
                    tId: tenantId,
                }),
            });
            return null;
        })
        .finally(() => subscriptionRequests.delete(requestKey));

    subscriptionRequests.set(requestKey, request);
    return await request;
};

export const getAnswerlatticeBillingHistoryForStore = async (
    tenantId: number,
    storeId: number,
): Promise<any[]> => {
    return await apiCallComposer(
        async () => {
            const historyQuery = query(
                getPaymentTransactionCollectionRef(),
                where('tenantId', '==', Number(tenantId)),
                where('storeId', '==', Number(storeId)),
                limit(50),
            );

            const snapshot = await getDocs(historyQuery);
            return snapshot.docs
                .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                .filter((item: any) => Number(item.tenantId ?? item.tId) === Number(tenantId))
                .filter((item: any) => ['subscription.charged', 'order.paid'].includes(String(item.event)))
                .sort((a: any, b: any) => Number(b.created_at || 0) - Number(a.created_at || 0))
                .slice(0, 25);
        },
        `getAnswerlatticeBillingHistoryForStore: ${storeId}`,
    );
};
