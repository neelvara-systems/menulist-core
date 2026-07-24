import { DB_COLLECTIONS } from '@constant/database';
import type { ProductId } from '@constant/product';
import { admin } from '@lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import {
    getActiveProductSubscriptionForStore,
    getBillingFirestoreAdminForProduct,
} from './productBillingServer';
import { isAnswerlatticeBillingProduct } from './productBillingPlans';
import { getProductSubscriptionBillingScope } from './productSubscriptionScopeBoundary';
import { normalizeBillingSubscriptionDocumentId } from './subscriptionDocumentIdBoundary';
import {
    normalizeBillingTopupDocumentId,
    normalizeBillingTopupScopeDocumentId,
} from './topupDocumentIdBoundary';
import {
    resolveCurrentTopupSubscriptionSettlement,
    resolveVerifiedTopupSettlement,
    type VerifiedTopupSettlement,
} from './topupSettlement';

type ProviderEntity = Record<string, any>;

export type ProductTopupSettlementResult = {
    alreadyApplied: boolean;
    applied: boolean;
    newBalance: number;
    settlement: VerifiedTopupSettlement;
    subscription: FirestoreSubscriptionDoc;
};

export async function persistPendingProductTopupSnapshot(params: {
    amount: number;
    billingDb: FirebaseFirestore.Firestore;
    billingStoreId: number;
    creditsAdded: number;
    currency: string;
    order: ProviderEntity;
    packId: string;
    packName: string;
    productId: ProductId;
    storeId: number;
    tenantId: number;
    userId: string;
}): Promise<'created' | 'replayed'> {
    const orderId = normalizeBillingTopupDocumentId(params.order?.id);
    if (!orderId) {
        throw new Error('Pending top-up provider order id is invalid.');
    }
    const packType = isAnswerlatticeBillingProduct(params.productId)
        ? 'answerlattice_credit_pack'
        : 'ai_enhancement_pack';
    const candidate = {
        amount: params.amount,
        billingStoreId: params.billingStoreId,
        createdOn: admin.firestore.FieldValue.serverTimestamp(),
        creditsAdded: params.creditsAdded,
        currency: params.currency,
        packId: params.packId,
        packName: params.packName,
        paymentProvider: 'razorpay',
        pId: params.productId,
        productId: params.productId,
        providerOrderId: orderId,
        sId: params.storeId,
        status: 'pending',
        storeId: params.storeId,
        tId: params.tenantId,
        tenantId: params.tenantId,
        type: packType,
        uId: params.userId,
        updatedOn: admin.firestore.FieldValue.serverTimestamp(),
        userId: params.userId,
    };
    const candidateSettlement = resolveVerifiedTopupSettlement({
        expectedOrderId: orderId,
        expectedPaymentId: '',
        expectedProductId: params.productId,
        expectedStoreId: params.storeId,
        expectedTenantId: params.tenantId,
        order: params.order,
        topupSnapshot: candidate,
    });
    if (
        !candidateSettlement
        || candidateSettlement.billingStoreId !== params.billingStoreId
        || typeof params.userId !== 'string'
        || params.userId.length === 0
        || params.userId.length > 256
    ) {
        throw new Error('Pending top-up snapshot is invalid.');
    }

    const topupRef = params.billingDb.collection(DB_COLLECTIONS.TOPUPS).doc(orderId);
    return params.billingDb.runTransaction(async (tx) => {
        const currentSnap = await tx.get(topupRef);
        if (!currentSnap.exists) {
            tx.create(topupRef, candidate);
            return 'created' as const;
        }

        const current = currentSnap.data();
        const currentSettlement = resolveVerifiedTopupSettlement({
            expectedOrderId: orderId,
            expectedPaymentId: '',
            expectedProductId: params.productId,
            expectedStoreId: params.storeId,
            expectedTenantId: params.tenantId,
            order: params.order,
            topupSnapshot: current,
        });
        if (
            !currentSettlement
            || currentSettlement.billingStoreId !== params.billingStoreId
            || current?.status !== 'pending'
            || current?.paymentProvider !== 'razorpay'
            || current?.type !== packType
            || current?.userId !== params.userId
            || current?.uId !== params.userId
            || current?.createdOn == null
        ) {
            throw new Error('Pending top-up order identity conflict.');
        }
        return 'replayed' as const;
    });
}

/**
 * Applies a provider-confirmed top-up without relying on the browser callback.
 * The signed webhook path and the authenticated checkout callback both settle
 * against the immutable pending order snapshot and the transaction-current
 * subscription. This helper is intentionally strict: malformed or mismatched
 * provider payloads fail so the webhook can be retried and investigated.
 */
export async function settleProductTopupFromProvider(params: {
    order: ProviderEntity;
    payment: ProviderEntity;
    productId: ProductId;
}): Promise<ProductTopupSettlementResult> {
    const { order, payment, productId } = params;
    const orderId = normalizeBillingTopupDocumentId(order?.id);
    const paymentId = typeof payment?.id === 'string' ? payment.id.trim() : '';
    const paymentOrderId = typeof payment?.order_id === 'string' ? payment.order_id.trim() : '';
    const notes = order?.notes && typeof order.notes === 'object' && !Array.isArray(order.notes)
        ? order.notes
        : null;
    const tenantScope = normalizeBillingTopupScopeDocumentId(notes?.tenantId);
    const compactTenantScope = normalizeBillingTopupScopeDocumentId(notes?.tId);
    const storeScope = normalizeBillingTopupScopeDocumentId(notes?.storeId);
    const compactStoreScope = normalizeBillingTopupScopeDocumentId(notes?.sId);

    if (
        !orderId
        || !paymentId
        || paymentOrderId !== orderId
        || payment?.status !== 'captured'
        || !notes
        || !tenantScope
        || !compactTenantScope
        || compactTenantScope.numericId !== tenantScope.numericId
        || !storeScope
        || !compactStoreScope
        || compactStoreScope.numericId !== storeScope.numericId
    ) {
        throw new Error('Provider top-up payload is incomplete or invalid.');
    }

    const tenantId = tenantScope.numericId;
    const storeId = storeScope.numericId;
    const billingDb = getBillingFirestoreAdminForProduct(productId);
    const topupRef = billingDb.collection(DB_COLLECTIONS.TOPUPS).doc(orderId);
    const initialTopupSnap = await topupRef.get();
    const initialTopup = initialTopupSnap.exists ? initialTopupSnap.data() : null;
    const initialSettlement = resolveVerifiedTopupSettlement({
        expectedOrderId: orderId,
        expectedPaymentId: paymentId,
        expectedProductId: productId,
        expectedStoreId: storeId,
        expectedTenantId: tenantId,
        order,
        payment,
        topupSnapshot: initialTopup,
    });
    if (!initialSettlement) {
        throw new Error('Provider top-up does not match the pending settlement snapshot.');
    }

    const subscription = await getActiveProductSubscriptionForStore(productId, tenantId, storeId);
    const subscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);
    const subscriptionScope = getProductSubscriptionBillingScope(productId, subscription);
    if (
        !subscription
        || !subscriptionId
        || !subscriptionScope
        || subscriptionScope.tenantId !== tenantId
        || initialSettlement.billingStoreId !== subscriptionScope.storeId
    ) {
        throw new Error('No current subscription is available for the paid top-up.');
    }

    const isAnswerlatticeProduct = isAnswerlatticeBillingProduct(productId);
    const subscriptionRef = billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const answerlatticeStoreRef = isAnswerlatticeProduct
        ? billingDb.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId)
        : null;

    const result = await billingDb.runTransaction(async (tx) => {
        const [topupSnap, subscriptionSnap] = await Promise.all([
            tx.get(topupRef),
            tx.get(subscriptionRef),
        ]);
        const topupData = topupSnap.exists ? topupSnap.data() : null;
        const subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() : null;

        if (topupData?.status === 'paid') {
            if (topupData.providerPaymentId !== paymentId) {
                throw new Error('Paid top-up is already linked to another payment.');
            }

            const existingSettlement = resolveVerifiedTopupSettlement({
                expectedOrderId: orderId,
                expectedPaymentId: paymentId,
                expectedProductId: productId,
                expectedStoreId: storeId,
                expectedTenantId: tenantId,
                order,
                payment,
                topupSnapshot: topupData,
            });
            if (!existingSettlement) {
                throw new Error('Paid top-up no longer matches its provider evidence.');
            }

            const currentSubscription = resolveCurrentTopupSubscriptionSettlement({
                expectedProductId: productId,
                expectedStoreId: subscriptionScope.storeId,
                expectedTenantId: subscriptionScope.tenantId,
                subscriptionSnapshot: subscriptionData,
            });
            if (!currentSubscription || existingSettlement.billingStoreId !== currentSubscription.storeId) {
                throw new Error('Paid top-up subscription requires reconciliation.');
            }

            return {
                alreadyApplied: true,
                applied: false,
                newBalance: currentSubscription.topUpCredits,
                settlement: existingSettlement,
            };
        }

        const transactionSettlement = resolveVerifiedTopupSettlement({
            expectedOrderId: orderId,
            expectedPaymentId: paymentId,
            expectedProductId: productId,
            expectedStoreId: storeId,
            expectedTenantId: tenantId,
            order,
            payment,
            topupSnapshot: topupData,
        });
        const currentSubscription = resolveCurrentTopupSubscriptionSettlement({
            expectedProductId: productId,
            expectedStoreId: subscriptionScope.storeId,
            expectedTenantId: subscriptionScope.tenantId,
            subscriptionSnapshot: subscriptionData,
        });
        if (
            !transactionSettlement
            || !currentSubscription
            || transactionSettlement.billingStoreId !== currentSubscription.storeId
        ) {
            throw new Error('Top-up or subscription changed before settlement.');
        }

        const serverNow = admin.firestore.FieldValue.serverTimestamp();
        const newBalance = currentSubscription.topUpCredits + transactionSettlement.creditsToAdd;
        if (!Number.isSafeInteger(newBalance)) {
            throw new Error('Top-up credit balance exceeds the supported range.');
        }
        tx.set(subscriptionRef, {
            topUpCredits: newBalance,
            modifiedOn: serverNow,
        }, { merge: true });
        tx.set(topupRef, {
            paymentProvider: 'razorpay',
            providerOrderId: orderId,
            providerPaymentId: paymentId,
            creditsAdded: transactionSettlement.creditsToAdd,
            amount: transactionSettlement.amount,
            currency: transactionSettlement.currency,
            status: 'paid',
            userId: topupData?.userId ?? topupData?.uId ?? null,
            tenantId,
            storeId,
            productId,
            pId: productId,
            tId: tenantId,
            sId: storeId,
            uId: topupData?.uId ?? topupData?.userId ?? null,
            packId: transactionSettlement.packId,
            type: isAnswerlatticeProduct ? 'answerlattice_credit_pack' : 'ai_enhancement_pack',
            packName: transactionSettlement.packName,
            paidAt: serverNow,
            updatedOn: serverNow,
            createdOn: topupData?.createdOn || serverNow,
        }, { merge: true });

        if (answerlatticeStoreRef) {
            tx.set(answerlatticeStoreRef, {
                answerlatticeSubscription: {
                    id: subscription.id || subscription.providerSubscriptionId || null,
                    providerSubscriptionId: subscription.providerSubscriptionId || subscription.id || null,
                    monthlyCreditsAllowance: currentSubscription.monthlyCreditsAllowance,
                    monthlyCredits: currentSubscription.monthlyCredits,
                    topUpCredits: newBalance,
                    creditsLastResetMonth: currentSubscription.creditsLastResetMonth,
                    updatedAt: serverNow,
                },
                answerlatticeBillingUpdatedAt: serverNow,
            }, { merge: true });
        }

        return {
            alreadyApplied: false,
            applied: true,
            newBalance,
            settlement: transactionSettlement,
        };
    });

    return {
        ...result,
        subscription: {
            ...subscription,
            topUpCredits: result.newBalance,
        },
    };
}
