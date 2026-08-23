import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { admin } from '@lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import {
    resolveBillingTaxSettlementSnapshot,
    type BillingTaxSnapshot,
} from '@data/shared/billingTaxPolicy';
import {
    getMenuListPurchasedCreditRecoveryId,
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
    isSettledTopupStatus,
    resolveCurrentTopupSubscriptionSettlement,
    resolveTopupCreditDebtAllocation,
    resolveTopupRefundCreditTarget,
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
    taxSnapshot?: BillingTaxSnapshot;
};

export type ProductTopupRefundResult = {
    creditsReversed: number;
    creditShortfall: number;
    isTopupRefund: boolean;
    replayed: boolean;
};

const asExactNonNegativeSafeInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
);

const asExactPositiveSafeInteger = (value: unknown): number | null => {
    const parsed = asExactNonNegativeSafeInteger(value);
    return parsed !== null && parsed > 0 ? parsed : null;
};

const asExactIdentity = (value: unknown): number | null => {
    const parsed = asExactPositiveSafeInteger(value);
    return parsed !== null ? parsed : null;
};

const asProviderId = (value: unknown, prefix: string): string | null => (
    typeof value === 'string'
    && value === value.trim()
    && value.length > prefix.length
    && value.length <= 180
    && value.startsWith(prefix)
    && /^[A-Za-z0-9_]+$/.test(value)
        ? value
        : null
);

export async function persistPendingProductTopupSnapshot(params: {
    amount: number;
    baseAmount?: number;
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
    taxSnapshot?: BillingTaxSnapshot;
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
        ...(typeof params.baseAmount === 'number' ? { baseAmount: params.baseAmount } : {}),
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
        ...(params.taxSnapshot ? { taxSnapshot: params.taxSnapshot } : {}),
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
    const taxSnapshot = initialTopup?.taxSnapshot
        ? resolveBillingTaxSettlementSnapshot({
            amount: initialSettlement.amount,
            currency: initialSettlement.currency,
            quantity: 1,
            snapshot: initialTopup.taxSnapshot as BillingTaxSnapshot,
        })
        : undefined;
    if (!taxSnapshot) {
        throw new Error('Paid top-up does not match its stored tax terms.');
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

        const isSettledTopup = Boolean(topupData && isSettledTopupStatus(topupData.status));
        if (isSettledTopup && topupData) {
            if (topupData.providerPaymentId !== paymentId) {
                throw new Error('Settled top-up is already linked to another payment.');
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
                throw new Error('Settled top-up no longer matches its provider evidence.');
            }

            const currentSubscription = resolveCurrentTopupSubscriptionSettlement({
                expectedProductId: productId,
                expectedStoreId: subscriptionScope.storeId,
                expectedTenantId: subscriptionScope.tenantId,
                subscriptionSnapshot: subscriptionData,
            });
            if (!currentSubscription || existingSettlement.billingStoreId !== currentSubscription.storeId) {
                throw new Error('Settled top-up subscription requires reconciliation.');
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
        const currentRefundDebt = asExactNonNegativeSafeInteger(subscriptionData?.topUpCreditRefundDebt ?? 0);
        if (currentRefundDebt === null) {
            throw new Error('Top-up refund debt balance is invalid.');
        }
        const debtAllocation = resolveTopupCreditDebtAllocation({
            creditsPurchased: transactionSettlement.creditsToAdd,
            refundDebt: currentRefundDebt,
        });
        if (!debtAllocation) {
            throw new Error('Top-up refund debt allocation is invalid.');
        }
        const {
            creditsAppliedToBalance,
            creditsOffsetAgainstRefundDebt,
            remainingRefundDebt: newRefundDebt,
        } = debtAllocation;
        const newBalance = currentSubscription.topUpCredits + creditsAppliedToBalance;
        if (!Number.isSafeInteger(newBalance)) {
            throw new Error('Top-up credit balance exceeds the supported range.');
        }
        tx.set(subscriptionRef, {
            topUpCredits: newBalance,
            topUpCreditRefundDebt: newRefundDebt,
            modifiedOn: serverNow,
        }, { merge: true });
        tx.set(topupRef, {
            paymentProvider: 'razorpay',
            providerOrderId: orderId,
            providerPaymentId: paymentId,
            subscriptionDocumentId: subscriptionId,
            providerSubscriptionId: currentSubscription.providerSubscriptionId
                || currentSubscription.id
                || null,
            creditsAdded: transactionSettlement.creditsToAdd,
            creditsAppliedToBalance,
            creditsOffsetAgainstRefundDebt,
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
                    id: currentSubscription.id || currentSubscription.providerSubscriptionId || null,
                    providerSubscriptionId: currentSubscription.providerSubscriptionId || currentSubscription.id || null,
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
        ...(taxSnapshot ? { taxSnapshot } : {}),
        subscription: {
            ...subscription,
            topUpCredits: result.newBalance,
        },
    };
}

/**
 * Reverses purchased credits only when a processed provider refund
 * belongs to a settled top-up. Subscription refunds return a no-op result.
 */
export async function settleProductTopupRefund(params: {
    amount: number;
    currency: string;
    paymentId: string;
    productId: ProductId;
    refundId: string;
}): Promise<ProductTopupRefundResult> {
    const paymentId = asProviderId(params.paymentId, 'pay_');
    const refundId = asProviderId(params.refundId, 'rfnd_');
    const refundAmount = asExactPositiveSafeInteger(params.amount);
    const currency = typeof params.currency === 'string' ? params.currency.trim().toUpperCase() : '';
    if (!paymentId || !refundId || refundAmount === null || !/^[A-Z]{3}$/.test(currency)) {
        throw new Error('Processed top-up refund evidence is invalid.');
    }

    const billingDb = getBillingFirestoreAdminForProduct(params.productId);
    const candidates = await billingDb.collection(DB_COLLECTIONS.TOPUPS)
        .where('providerPaymentId', '==', paymentId)
        .limit(2)
        .get();
    if (candidates.empty) {
        return { creditsReversed: 0, creditShortfall: 0, isTopupRefund: false, replayed: false };
    }
    if (candidates.size !== 1) {
        throw new Error('Processed refund matches multiple top-up records.');
    }

    const candidate = candidates.docs[0];
    const topupRef = candidate.ref;
    const refundRef = topupRef.collection('refunds').doc(refundId);
    return billingDb.runTransaction(async (tx) => {
        const topupSnapshot = await tx.get(topupRef);
        if (!topupSnapshot.exists) {
            throw new Error('Processed top-up refund record disappeared.');
        }
        const topup = topupSnapshot.data() || {};
        const tenantId = asExactIdentity(topup.tenantId);
        const compactTenantId = asExactIdentity(topup.tId);
        const storeId = asExactIdentity(topup.storeId);
        const compactStoreId = asExactIdentity(topup.sId);
        const purchaseAmount = asExactPositiveSafeInteger(topup.amount);
        const creditsAdded = asExactPositiveSafeInteger(topup.creditsAdded);
        const parsedPreviousRefundAmount = asExactNonNegativeSafeInteger(topup.refundedAmount);
        const parsedPreviousCreditsRefunded = asExactNonNegativeSafeInteger(topup.creditsRefunded);
        const previousRefundAmount = topup.refundedAmount == null ? 0 : parsedPreviousRefundAmount;
        const previousCreditsRefunded = topup.creditsRefunded == null ? 0 : parsedPreviousCreditsRefunded;
        const subscriptionId = normalizeBillingSubscriptionDocumentId(topup.subscriptionDocumentId);
        const providerOrderId = normalizeBillingTopupDocumentId(topup.providerOrderId);
        const topupCurrency = typeof topup.currency === 'string' ? topup.currency.trim().toUpperCase() : '';
        if (
            topup.productId !== params.productId
            || topup.pId !== params.productId
            || topup.providerPaymentId !== paymentId
            || providerOrderId !== topupSnapshot.id
            || topup.paymentProvider !== 'razorpay'
            || (topup.status !== 'paid' && topup.status !== 'partially_refunded' && topup.status !== 'refunded')
            || tenantId === null
            || compactTenantId !== tenantId
            || storeId === null
            || compactStoreId !== storeId
            || purchaseAmount === null
            || creditsAdded === null
            || previousRefundAmount === null
            || previousCreditsRefunded === null
            || !subscriptionId
            || topupCurrency !== currency
        ) {
            throw new Error('Processed refund does not match settled product top-up evidence.');
        }

        const recoveryRef = params.productId === PRODUCT_IDS.MENULIST
            ? billingDb.collection(DB_COLLECTIONS.MENULIST_PURCHASED_CREDIT_RECOVERIES).doc(
                getMenuListPurchasedCreditRecoveryId(tenantId, storeId),
            )
            : null;
        const [refundSnapshot, subscriptionSnapshot, recoverySnapshot] = await Promise.all([
            tx.get(refundRef),
            tx.get(billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId)),
            recoveryRef ? tx.get(recoveryRef) : Promise.resolve(null),
        ]);
        if (refundSnapshot.exists) {
            const existing = refundSnapshot.data() || {};
            if (
                existing.paymentId !== paymentId
                || existing.amount !== refundAmount
                || existing.currency !== currency
            ) {
                throw new Error('Processed top-up refund replay conflicts with stored evidence.');
            }
            return {
                creditsReversed: asExactNonNegativeSafeInteger(existing.creditsReversed) ?? 0,
                creditShortfall: asExactNonNegativeSafeInteger(existing.creditShortfall) ?? 0,
                isTopupRefund: true,
                replayed: true,
            };
        }

        const cumulativeRefundAmount = previousRefundAmount + refundAmount;
        if (!Number.isSafeInteger(cumulativeRefundAmount)) {
            throw new Error('Processed top-up refund amount exceeds the supported range.');
        }
        const targetCreditsRefunded = resolveTopupRefundCreditTarget({
            creditsAdded,
            cumulativeRefundAmount,
            purchaseAmount,
        });
        if (targetCreditsRefunded === null || targetCreditsRefunded < previousCreditsRefunded) {
            throw new Error('Processed top-up refund exceeds the settled purchase.');
        }
        const creditsToReverse = targetCreditsRefunded - previousCreditsRefunded;

        if (!subscriptionSnapshot.exists) {
            throw new Error('Processed top-up refund subscription no longer exists.');
        }
        const subscription = subscriptionSnapshot.data() || {};
        const subscriptionScope = getProductSubscriptionBillingScope(PRODUCT_IDS.MENULIST, {
            ...subscription,
            id: subscriptionSnapshot.id,
        } as FirestoreSubscriptionDoc);
        if (
            !subscriptionScope
            || subscriptionScope.tenantId !== tenantId
            || subscriptionScope.storeId !== storeId
        ) {
            throw new Error('Processed top-up refund subscription scope conflicts with purchase evidence.');
        }
        const activeCredits = asExactNonNegativeSafeInteger(subscription.topUpCredits);
        const existingRefundDebt = asExactNonNegativeSafeInteger(subscription.topUpCreditRefundDebt ?? 0);
        if (activeCredits === null || existingRefundDebt === null) {
            throw new Error('Processed top-up refund found an invalid purchased-credit balance.');
        }

        const recovery = recoverySnapshot?.exists ? recoverySnapshot.data() || {} : {};
        const recoveryScopeMatches = recoverySnapshot?.exists
            && recovery.productId === params.productId
            && recovery.pId === params.productId
            && asExactIdentity(recovery.tenantId) === tenantId
            && asExactIdentity(recovery.storeId) === storeId;
        if (recoverySnapshot?.exists && !recoveryScopeMatches) {
            throw new Error('Processed top-up refund recovery scope conflicts with purchase evidence.');
        }
        const frozenCredits = recoverySnapshot?.exists
            ? asExactNonNegativeSafeInteger(recovery.purchasedCredits)
            : 0;
        if (recoverySnapshot?.exists && frozenCredits === null) {
            throw new Error('Processed top-up refund found an invalid frozen-credit balance.');
        }

        const activeReversal = Math.min(activeCredits ?? 0, creditsToReverse);
        const remainingAfterActive = creditsToReverse - activeReversal;
        const frozenReversal = Math.min(frozenCredits ?? 0, remainingAfterActive);
        const creditsReversed = activeReversal + frozenReversal;
        const creditShortfall = creditsToReverse - creditsReversed;
        const now = admin.firestore.FieldValue.serverTimestamp();
        const subscriptionRef = billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
        const nextRefundDebt = existingRefundDebt + creditShortfall;
        if (!Number.isSafeInteger(nextRefundDebt)) {
            throw new Error('Processed top-up refund debt exceeds the supported range.');
        }
        if (activeReversal > 0 || creditShortfall > 0) {
            tx.set(subscriptionRef, {
                topUpCredits: activeCredits - activeReversal,
                topUpCreditRefundDebt: nextRefundDebt,
                modifiedOn: now,
            }, { merge: true });
        }
        if (recoveryRef && recoverySnapshot?.exists && frozenReversal > 0) {
            tx.set(recoveryRef, {
                purchasedCredits: (frozenCredits ?? 0) - frozenReversal,
                updatedAt: now,
            }, { merge: true });
        }
        tx.create(refundRef, {
            amount: refundAmount,
            creditsReversed,
            creditShortfall,
            currency,
            paymentId,
            refundId,
            processedAt: now,
        });
        const priorCreditsReversed = asExactNonNegativeSafeInteger(topup.creditsReversed);
        const priorCreditShortfall = asExactNonNegativeSafeInteger(topup.creditReversalShortfall);
        if (
            (topup.creditsReversed != null && priorCreditsReversed === null)
            || (topup.creditReversalShortfall != null && priorCreditShortfall === null)
        ) {
            throw new Error('Processed top-up refund found invalid reversal totals.');
        }
        const cumulativeCreditsReversed = (priorCreditsReversed ?? 0) + creditsReversed;
        const cumulativeCreditShortfall = (priorCreditShortfall ?? 0) + creditShortfall;
        if (!Number.isSafeInteger(cumulativeCreditsReversed) || !Number.isSafeInteger(cumulativeCreditShortfall)) {
            throw new Error('Processed top-up refund reversal totals exceed the supported range.');
        }
        tx.set(topupRef, {
            creditsRefunded: targetCreditsRefunded,
            creditsReversed: cumulativeCreditsReversed,
            creditReversalShortfall: cumulativeCreditShortfall,
            refundedAmount: cumulativeRefundAmount,
            requiresReconciliation: cumulativeCreditShortfall > 0,
            status: cumulativeRefundAmount === purchaseAmount ? 'refunded' : 'partially_refunded',
            updatedOn: now,
        }, { merge: true });
        return { creditsReversed, creditShortfall, isTopupRefund: true, replayed: false };
    });
}

export const settleMenuListTopupRefund = (params: Omit<Parameters<typeof settleProductTopupRefund>[0], 'productId'>) => (
    settleProductTopupRefund({ ...params, productId: PRODUCT_IDS.MENULIST })
);
