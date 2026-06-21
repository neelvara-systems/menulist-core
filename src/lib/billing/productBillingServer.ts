import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    createInitialSubscription as createMenuListInitialSubscription,
    getActiveSubscriptionForStore as getMenuListActiveSubscriptionForStore,
    getDirectActiveSubscriptionForStore as getMenuListDirectActiveSubscriptionForStore,
    getSubscriptionById as getMenuListSubscriptionById,
    updateSubscription as updateMenuListSubscription,
} from '@database/subscriptions/server';
import { getAnswerlatticeScopedSession, resolveAnswerlatticeSessionScope, canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { getGracePeriodInfo } from '@util/razorpay';
import type { MinimalStoreDataType } from '@type/platform/store';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { getActivePlanTypeForSubscription, safeSyncStorePlanEntitlementFromSubscription } from './subscriptionEntitlementSync';
import { validateTransition } from './subscriptionStateMachine';
import {
    normalizeBillingProductId,
    isAnswerlatticeBillingProduct,
    isProductBillingDisabled,
} from './productBillingPlans';

export type ProductBillingScope = {
    productId: ProductId;
    tenantId: number;
    storeId: number;
    userId: string;
    scopedSession: any;
};

const isTimestampLike = (value: any) => (
    value
    && typeof value === 'object'
    && typeof value.toDate === 'function'
    && typeof value.seconds === 'number'
);

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value?.constructor?.name && String(value.constructor.name).includes('FieldValue')) return value;
    if (typeof value === 'object' && '_methodName' in value) return value;
    if (isTimestampLike(value)) return admin.firestore.Timestamp.fromDate(value.toDate());
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeForAdminFirestore(nestedValue)]),
        );
    }
    return value;
};

const getDisabledBillingMessage = (productId: ProductId): string => (
    productId === PRODUCT_IDS.MYCODEX
        ? 'MyCodex billing is not configured.'
        : 'CampaignCue billing is not configured.'
);

export const getBillingFirestoreAdminForProduct = (productId: ProductId): FirebaseFirestore.Firestore => {
    if (productId === PRODUCT_IDS.ANSWERLATTICE) {
        if (!answerlatticeFirestoreAdmin || typeof (answerlatticeFirestoreAdmin as any).collection !== 'function') {
            throw new Error('Answerlattice Firebase is not configured.');
        }
        return answerlatticeFirestoreAdmin;
    }
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    return firestoreAdmin;
};

export const resolveBillingScopeFromSession = (
    session: any,
    rawProductId?: unknown,
): ProductBillingScope | null => {
    const productId = normalizeBillingProductId(rawProductId);
    const userId = session?.user?.id;
    if (!userId) return null;
    if (isProductBillingDisabled(productId)) return null;

    if (productId === PRODUCT_IDS.ANSWERLATTICE) {
        if (!canUseAnswerlatticeManagement(session)) return null;
        const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
        if (!answerlatticeScope) return null;

        return {
            productId,
            tenantId: answerlatticeScope.tenantId,
            storeId: answerlatticeScope.storeId,
            userId,
            scopedSession: getAnswerlatticeScopedSession(session),
        };
    }

    const tenantId = Number(session?.user?.tenantId);
    const storeId = Number(session?.user?.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) return null;

    return {
        productId,
        tenantId,
        storeId,
        userId,
        scopedSession: session,
    };
};

const productDocPayload = (
    productId: ProductId,
    data: Record<string, any>,
    options: { isNew?: boolean } = {},
) => {
    const now = admin.firestore.Timestamp.now();
    const tenantId = data.tId ?? data.tenantId;
    const storeId = data.sId ?? data.storeId;
    const userId = data.uId ?? data.userId;
    return sanitizeForAdminFirestore({
        ...data,
        pId: data.pId ?? productId,
        productId: data.productId ?? productId,
        ...(storeId !== undefined ? { sId: storeId } : {}),
        ...(tenantId !== undefined ? { tId: tenantId } : {}),
        ...(userId !== undefined ? { uId: userId } : {}),
        modifiedOn: now,
        ...(options.isNew && !data.createdOn ? { createdOn: now } : {}),
        ...(options.isNew && !data.createdBy ? { createdBy: data.name || data.email || 'Billing' } : {}),
        ...(options.isNew && !data.modifiedBy ? { modifiedBy: data.name || data.email || 'Billing' } : {}),
    });
};

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    return Number(value) || 0;
};

const normalizeAnswerlatticeSubscription = (
    data: Record<string, any>,
    id: string,
    tenantId: number,
    storeId: number,
): FirestoreSubscriptionDoc => ({
    ...(data as FirestoreSubscriptionDoc),
    id,
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

const isAnswerlatticeSubscriptionForScope = (
    subscription: FirestoreSubscriptionDoc,
    tenantId: number,
    storeId: number,
): boolean => (
    Number(subscription.tenantId ?? subscription.tId) === Number(tenantId)
    && Number(subscription.storeId ?? subscription.sId) === Number(storeId)
);

const isCurrentAnswerlatticeSubscription = (subscription: FirestoreSubscriptionDoc): boolean => {
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

export const createProductInitialSubscription = async (
    productId: ProductId,
    providerSubscriptionId: string,
    data: Omit<FirestoreSubscriptionDoc, 'id'>,
): Promise<void> => {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        await createMenuListInitialSubscription(providerSubscriptionId, data);
        return;
    }

    await getBillingFirestoreAdminForProduct(productId)
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(providerSubscriptionId)
        .set(productDocPayload(productId, data, { isNew: true }));
};

export const updateProductSubscription = async (
    productId: ProductId,
    subscriptionId: string,
    data: Partial<FirestoreSubscriptionDoc>,
): Promise<void> => {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        await updateMenuListSubscription(subscriptionId, data);
        return;
    }

    await getBillingFirestoreAdminForProduct(productId)
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(subscriptionId)
        .set(productDocPayload(productId, data), { merge: true });
};

export const getProductSubscriptionById = async (
    productId: ProductId,
    id: string,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (isProductBillingDisabled(productId)) {
        return null;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        return await getMenuListSubscriptionById(id);
    }

    const docSnap = await getBillingFirestoreAdminForProduct(productId)
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(id)
        .get();

    if (!docSnap.exists) return null;
    return { ...(docSnap.data() as FirestoreSubscriptionDoc), id };
};

const fetchAnswerlatticeSubscriptionRaw = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const db = getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE);
    const collectionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
    const subscriptionSummary = storeSnap.exists ? storeSnap.data()?.answerlatticeSubscription : null;
    const summarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || '').trim();

    if (summarySubscriptionId) {
        const subscriptionSnap = await collectionRef.doc(summarySubscriptionId).get();
        if (subscriptionSnap.exists) {
            const subscription = normalizeAnswerlatticeSubscription(subscriptionSnap.data() || {}, subscriptionSnap.id, tenantId, storeId);
            if (isAnswerlatticeSubscriptionForScope(subscription, tenantId, storeId) && isCurrentAnswerlatticeSubscription(subscription)) {
                return subscription;
            }
        }
    }

    const fallbackSnapshot = await collectionRef
        .where('tenantId', '==', tenantId)
        .where('storeId', '==', storeId)
        .limit(10)
        .get();

    return fallbackSnapshot.docs
        .map((docSnap) => normalizeAnswerlatticeSubscription(docSnap.data(), docSnap.id, tenantId, storeId))
        .filter((subscription) => isAnswerlatticeSubscriptionForScope(subscription, tenantId, storeId))
        .filter(isCurrentAnswerlatticeSubscription)
        .sort((a, b) => toMillis(b.cycleEndDate) - toMillis(a.cycleEndDate))[0] || null;
};

const expireIfGracePeriodEnded = async (
    productId: ProductId,
    sub: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (!sub.pastDueSinceAt) return sub;

    const { remainingDays, graceEndsDate } = getGracePeriodInfo(sub.pastDueSinceAt);
    if (remainingDays > 0) return sub;

    if (!validateTransition(sub.status, 'expired', 'server:grace-period-auto-expire')) {
        return sub;
    }

    await updateProductSubscription(productId, sub.id, {
        status: 'expired',
        cycleEndDate: admin.firestore.Timestamp.now() as any,
        subscriptionEndDate: admin.firestore.Timestamp.now() as any,
        statuses: [
            ...sub.statuses,
            {
                status: 'expired',
                timestamp: admin.firestore.Timestamp.now() as any,
                amount: sub.amount,
                currency: sub.currency,
                remark: `Expired due to payment failed and past due since ${graceEndsDate?.toLocaleDateString()}`,
            },
        ],
    });

    return null;
};

export const getDirectActiveProductSubscriptionForStore = async (
    productId: ProductId,
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (isProductBillingDisabled(productId)) {
        return null;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        return await getMenuListDirectActiveSubscriptionForStore(tenantId, storeId);
    }

    const raw = await fetchAnswerlatticeSubscriptionRaw(tenantId, storeId);
    if (!raw) return null;
    return await expireIfGracePeriodEnded(productId, raw);
};

export const getActiveProductSubscriptionForStore = async (
    productId: ProductId,
    tenantId: number,
    storeId: number,
    tenantStoresList?: MinimalStoreDataType[],
): Promise<FirestoreSubscriptionDoc | null> => {
    if (isProductBillingDisabled(productId)) {
        return null;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        return await getMenuListActiveSubscriptionForStore(tenantId, storeId, tenantStoresList);
    }

    return await getDirectActiveProductSubscriptionForStore(productId, tenantId, storeId);
};

export const writeProductPaymentTransactionAudit = async (
    productId: ProductId,
    data: any,
): Promise<string> => {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    const db = getBillingFirestoreAdminForProduct(productId);
    const tenantId = Number(data?.tenantId ?? data?.tId);
    const storeId = Number(data?.storeId ?? data?.sId);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).add(sanitizeForAdminFirestore({
        ...data,
        pId: productId,
        productId,
        tenantId: Number.isFinite(tenantId) ? tenantId : null,
        storeId: Number.isFinite(storeId) ? storeId : null,
        tId: data?.tId ?? (Number.isFinite(tenantId) ? tenantId : null),
        sId: data?.sId ?? (Number.isFinite(storeId) ? storeId : null),
        createdOn: now,
        modifiedOn: now,
    }));

    return docRef.id;
};

export const syncAnswerlatticeSubscriptionEntitlementFromSubscription = async (
    subscription: FirestoreSubscriptionDoc,
    source: string,
): Promise<void> => {
    const storeId = String(subscription.storeId || '').trim();
    if (!storeId) return;

    const db = getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE);
    const syncedAt = admin.firestore.FieldValue.serverTimestamp();
    const activePlanType = getActivePlanTypeForSubscription(subscription);
    const subscriptionSummary = {
        id: subscription.id || subscription.providerSubscriptionId,
        providerSubscriptionId: subscription.providerSubscriptionId || subscription.id || null,
        planId: subscription.planId || null,
        planName: subscription.planName || null,
        status: subscription.status || null,
        currency: subscription.currency || null,
        amount: subscription.amount ?? null,
        isBeta: subscription.planId === 'answerlattice_beta',
        subscriptionEndDate: subscription.subscriptionEndDate || null,
        monthlyCreditsAllowance: subscription.monthlyCreditsAllowance ?? 0,
        monthlyCredits: subscription.monthlyCredits ?? 0,
        topUpCredits: subscription.topUpCredits ?? 0,
        creditsLastResetMonth: subscription.creditsLastResetMonth ?? null,
        updatedAt: syncedAt,
    };

    await Promise.all([
        db.collection(DB_COLLECTIONS.STORES).doc(storeId).set({
            activePlanType,
            answerlatticeSubscription: subscriptionSummary,
            answerlatticeBillingUpdatedAt: syncedAt,
        }, { merge: true }),
        subscription.id
            ? db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscription.id).set({
                analyticsEntitlement: {
                    activePlanType,
                    status: subscription.status || null,
                    syncedAt,
                    source,
                },
            }, { merge: true })
            : Promise.resolve(),
    ]);
};

export async function safeSyncProductSubscriptionEntitlementFromSubscription(
    productId: ProductId,
    subscription: FirestoreSubscriptionDoc,
    source: string,
): Promise<void> {
    if (isProductBillingDisabled(productId)) {
        return;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        await safeSyncStorePlanEntitlementFromSubscription(subscription, source);
        return;
    }

    try {
        await syncAnswerlatticeSubscriptionEntitlementFromSubscription(subscription, source);
    } catch (error) {
        logger.error('Failed to sync Answerlattice subscription entitlement', error, {
            source,
            subscriptionId: subscription.id,
            tenantId: subscription.tenantId,
            storeId: subscription.storeId,
            planId: subscription.planId,
            status: subscription.status,
        });
    }
}
