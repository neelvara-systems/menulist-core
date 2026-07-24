import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import {
    normalizeAnswerlatticeBillingScopeDocumentId,
    normalizeAnswerlatticeSubscriptionId,
} from '@lib/answerlattice/billingDocumentIdBoundary';
import {
    isAnswerlatticePaymentHistoryItemInScope,
    isAnswerlatticeSubscriptionInScope,
} from '@lib/answerlattice/billingScopeBoundary';
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { isAnswerlatticeStoreInScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

const subscriptionRequests = new Map<string, Promise<FirestoreSubscriptionDoc | null>>();

const getSubscriptionCollectionRef = () => collection(answerlatticeFirebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS);
const getPaymentTransactionCollectionRef = () => collection(answerlatticeFirebaseClient, DB_COLLECTIONS.PAYMENT_TRANSACTIONS);
const getStoreDocumentRef = (storeDocumentId: string) => doc(answerlatticeFirebaseClient, DB_COLLECTIONS.STORES, storeDocumentId);
const getSubscriptionDocumentRef = (subscriptionId: string) => {
    const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscriptionId);
    if (!normalizedSubscriptionId) throw new Error('Invalid Answerlattice subscription id');
    return doc(answerlatticeFirebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS, normalizedSubscriptionId);
};

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
    ...data,
    id,
    providerSubscriptionId: data.providerSubscriptionId || id,
    pId: data.pId ?? data.productId,
    productId: data.productId ?? data.pId,
    tId: tenantId,
    sId: storeId,
    tenantId,
    storeId,
    amount: Number.isFinite(Number(data.amount)) ? Number(data.amount) : 0,
    quantity: Number.isFinite(Number(data.quantity)) && Number(data.quantity) > 0 ? Number(data.quantity) : 1,
    monthlyCreditsAllowance: Number.isFinite(Number(data.monthlyCreditsAllowance)) && Number(data.monthlyCreditsAllowance) >= 0 ? Number(data.monthlyCreditsAllowance) : 0,
    monthlyCredits: Number.isFinite(Number(data.monthlyCredits)) && Number(data.monthlyCredits) >= 0 ? Number(data.monthlyCredits) : 0,
    topUpCredits: Number.isFinite(Number(data.topUpCredits)) && Number(data.topUpCredits) >= 0 ? Number(data.topUpCredits) : 0,
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
    storeDocumentId: string,
): Promise<FirestoreSubscriptionDoc | null> => {
    const storeSnapshot = await getDoc(getStoreDocumentRef(storeDocumentId));
    if (!storeSnapshot.exists()) return null;
    const storeData = storeSnapshot.data() || {};
    if (!isAnswerlatticeStoreInScope(storeData, { tenantId, storeId }, storeSnapshot.id)) return null;
    const summary = storeData.answerlatticeSubscription;
    if (!summary || typeof summary !== 'object') return null;

    const rawSubscriptionId = typeof (summary.id || summary.providerSubscriptionId) === 'string'
        ? String(summary.id || summary.providerSubscriptionId)
        : '';
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(rawSubscriptionId);
    if (!rawSubscriptionId || !subscriptionId) {
        if (!isAnswerlatticeSubscriptionInScope(summary, { tId: tenantId, sId: storeId })) return null;
        const summarySubscription = normalizeSubscription(
            summary,
            `answerlattice_summary_${tenantId}_${storeId}`,
            tenantId,
            storeId,
        );
        return isCurrentSubscription(summarySubscription) ? summarySubscription : null;
    }

    const subscriptionSnapshot = await getDoc(getSubscriptionDocumentRef(subscriptionId));
    if (!subscriptionSnapshot.exists()) {
        if (!isAnswerlatticeSubscriptionInScope(summary, { tId: tenantId, sId: storeId })) return null;
        const summarySubscription = normalizeSubscription(summary, subscriptionId, tenantId, storeId);
        return isCurrentSubscription(summarySubscription) ? summarySubscription : null;
    }

    const subscriptionData = subscriptionSnapshot.data();
    if (!isAnswerlatticeSubscriptionInScope(subscriptionData, { tId: tenantId, sId: storeId })) return null;
    const subscription = normalizeSubscription(subscriptionData, subscriptionSnapshot.id, tenantId, storeId);
    return isCurrentSubscription(subscription) ? subscription : null;
};

const fetchAnswerlatticeSubscriptionRaw = async (
    tenantId: number,
    storeId: number,
    storeDocumentId: string,
): Promise<FirestoreSubscriptionDoc | null> => {
    const summarySubscription = await fetchSubscriptionFromStoreSummary(tenantId, storeId, storeDocumentId);
    if (summarySubscription) return summarySubscription;

    const fallbackSnapshot = await getDocs(query(
        getSubscriptionCollectionRef(),
        where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
        where('productId', '==', PRODUCT_IDS.ANSWERLATTICE),
        where('tenantId', '==', tenantId),
        where('tId', '==', tenantId),
        where('storeId', '==', storeId),
        where('sId', '==', storeId),
        limit(10),
    ));
    const subscriptions = fallbackSnapshot.docs
        .filter((docSnap) => isAnswerlatticeSubscriptionInScope(docSnap.data(), { tId: tenantId, sId: storeId }))
        .map((docSnap) => normalizeSubscription(docSnap.data(), docSnap.id, tenantId, storeId))
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
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(tenantId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return null;
    const requestKey = `${tenantScope.documentId}:${storeScope.documentId}`;
    const existingRequest = subscriptionRequests.get(requestKey);
    if (existingRequest) return existingRequest;

    const request = fetchAnswerlatticeSubscriptionRaw(tenantScope.numericId, storeScope.numericId, storeScope.documentId)
        .catch((error) => {
            logAnswerlatticeFailure('answerlattice_billing_active_subscription_load_failed', error, {
                ...getAnswerlatticeScopeLogContext({
                    sId: storeScope.numericId,
                    tId: tenantScope.numericId,
                }),
            });
            throw error;
        })
        .finally(() => subscriptionRequests.delete(requestKey));

    subscriptionRequests.set(requestKey, request);
    return await request;
};

export const getAnswerlatticeBillingHistoryForStore = async (
    tenantId: number,
    storeId: number,
): Promise<any[]> => {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(tenantId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return [];
    return await apiCallComposer(
        async () => {
            const historyQuery = query(
                getPaymentTransactionCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('productId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tenantId', '==', tenantScope.numericId),
                where('tId', '==', tenantScope.numericId),
                where('storeId', '==', storeScope.numericId),
                where('sId', '==', storeScope.numericId),
                where('event', 'in', ['subscription.charged', 'order.paid']),
                orderBy('created_at', 'desc'),
                limit(25),
            );

            const snapshot = await getDocs(historyQuery);
            return snapshot.docs
                .map((docSnap): Record<string, unknown> & { id: string } => ({
                    ...docSnap.data(),
                    id: docSnap.id,
                }))
                .filter((item) => isAnswerlatticePaymentHistoryItemInScope(item, {
                    tId: tenantScope.numericId,
                    sId: storeScope.numericId,
                }))
                .filter((item) => ['subscription.charged', 'order.paid'].includes(String(item.event)))
                .slice(0, 25);
        },
        `getAnswerlatticeBillingHistoryForStore: ${storeScope.documentId}`,
    );
};
