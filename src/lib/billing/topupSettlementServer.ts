import { DB_COLLECTIONS } from '@constant/database';
import type { ProductId } from '@constant/product';
import { admin } from '@lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import {
    getActiveProductSubscriptionForStore,
    getBillingFirestoreAdminForProduct,
} from './productBillingServer';
import { isAnswerlatticeBillingProduct } from './productBillingPlans';
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
    const tenantScope = normalizeBillingTopupScopeDocumentId(notes?.tenantId ?? notes?.tId);
    const storeScope = normalizeBillingTopupScopeDocumentId(notes?.storeId ?? notes?.sId);

    if (
        !orderId
        || !paymentId
        || paymentOrderId !== orderId
        || payment?.status !== 'captured'
        || !notes
        || !tenantScope
        || !storeScope
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
    const subscriptionTenantId = Number(subscription?.tenantId ?? subscription?.tId);
    const subscriptionStoreId = Number(subscription?.storeId ?? subscription?.sId);
    if (
        !subscription
        || !subscriptionId
        || !Number.isSafeInteger(subscriptionTenantId)
        || subscriptionTenantId !== tenantId
        || !Number.isSafeInteger(subscriptionStoreId)
        || subscriptionStoreId <= 0
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

            return {
                alreadyApplied: true,
                applied: false,
                newBalance: Number(subscriptionData?.topUpCredits ?? topupData.creditsAdded ?? 0),
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
            allowMissingProductId: !isAnswerlatticeProduct,
            expectedProductId: productId,
            expectedStoreId: subscriptionStoreId,
            expectedTenantId: subscriptionTenantId,
            subscriptionSnapshot: subscriptionData,
        });
        if (!transactionSettlement || !currentSubscription) {
            throw new Error('Top-up or subscription changed before settlement.');
        }

        const serverNow = admin.firestore.FieldValue.serverTimestamp();
        const newBalance = currentSubscription.topUpCredits + transactionSettlement.creditsToAdd;
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
