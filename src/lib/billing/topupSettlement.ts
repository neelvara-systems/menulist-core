import { hasCurrentSubscriptionPlanEntitlement } from './subscriptionPlanEntitlement';

type RecordLike = Record<string, unknown>;

const SETTLED_TOPUP_STATUSES = new Set([
    'paid',
    'partially_refunded',
    'refunded',
]);

export function isSettledTopupStatus(value: unknown): boolean {
    return typeof value === 'string' && SETTLED_TOPUP_STATUSES.has(value);
}

export type VerifiedTopupSettlement = {
    amount: number;
    billingStoreId: number;
    creditsToAdd: number;
    currency: string;
    packId: string;
    packName: string;
};

export type CurrentTopupSubscriptionSettlement = {
    creditsLastResetMonth: number | null;
    id: string | null;
    monthlyCredits: number;
    monthlyCreditsAllowance: number;
    providerSubscriptionId: string | null;
    storeId: number;
    tenantId: number;
    topUpCredits: number;
};

const asRecord = (value: unknown): RecordLike | null => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as RecordLike
        : null
);

const asTrimmedString = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : String(value ?? '').trim()
);

const asPositiveSafeInteger = (value: unknown): number | null => {
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
};

const asExactPositiveSafeInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
);

const asExactNonNegativeSafeInteger = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
);

const resolveExactIdentityAliases = (
    record: RecordLike,
    keys: string[],
    expected: number,
): number | null => {
    const present = keys.filter((key) => record[key] !== undefined && record[key] !== null);
    if (present.length !== keys.length) return null;
    return present.every((key) => asExactPositiveSafeInteger(record[key]) === expected)
        ? expected
        : null;
};

const resolveNormalizedProviderIdentityAliases = (
    record: RecordLike,
    keys: string[],
    expected: number,
): number | null => {
    const present = keys.filter((key) => record[key] !== undefined && record[key] !== null);
    if (present.length !== keys.length) return null;
    return present.every((key) => asPositiveSafeInteger(record[key]) === expected)
        ? expected
        : null;
};

const asBoundedNonEmptyString = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
};

/**
 * Admit the transaction-current subscription before a paid top-up mutates it.
 * Scope aliases must agree exactly and both product aliases must be present.
 */
export function resolveCurrentTopupSubscriptionSettlement(params: {
    expectedProductId: string;
    expectedStoreId: number;
    expectedTenantId: number;
    subscriptionSnapshot: unknown;
}): CurrentTopupSubscriptionSettlement | null {
    const subscription = asRecord(params.subscriptionSnapshot);
    if (!subscription) return null;

    const tenantId = resolveExactIdentityAliases(subscription, ['tenantId', 'tId'], params.expectedTenantId);
    const storeId = resolveExactIdentityAliases(subscription, ['storeId', 'sId'], params.expectedStoreId);
    if (tenantId === null || storeId === null) return null;

    if (
        subscription.pId !== params.expectedProductId
        || subscription.productId !== params.expectedProductId
        || !hasCurrentSubscriptionPlanEntitlement(subscription)
    ) {
        return null;
    }

    const topUpCredits = asExactNonNegativeSafeInteger(subscription.topUpCredits ?? 0);
    const monthlyCredits = asExactNonNegativeSafeInteger(subscription.monthlyCredits ?? 0);
    const monthlyCreditsAllowance = asExactNonNegativeSafeInteger(subscription.monthlyCreditsAllowance ?? 0);
    const rawResetMonth = subscription.creditsLastResetMonth;
    const creditsLastResetMonth = rawResetMonth === undefined || rawResetMonth === null || rawResetMonth === 0
        ? null
        : asExactPositiveSafeInteger(rawResetMonth);
    if (
        topUpCredits === null
        || monthlyCredits === null
        || monthlyCreditsAllowance === null
        || (rawResetMonth !== undefined && rawResetMonth !== null && rawResetMonth !== 0 && creditsLastResetMonth === null)
    ) {
        return null;
    }
    const id = subscription.id === undefined || subscription.id === null
        ? null
        : asBoundedNonEmptyString(subscription.id, 180);
    const providerSubscriptionId = subscription.providerSubscriptionId === undefined
        || subscription.providerSubscriptionId === null
        ? null
        : asBoundedNonEmptyString(subscription.providerSubscriptionId, 180);
    if (
        (subscription.id !== undefined && subscription.id !== null && id === null)
        || (
            subscription.providerSubscriptionId !== undefined
            && subscription.providerSubscriptionId !== null
            && providerSubscriptionId === null
        )
    ) {
        return null;
    }

    return {
        creditsLastResetMonth,
        id,
        monthlyCredits,
        monthlyCreditsAllowance,
        providerSubscriptionId,
        storeId,
        tenantId,
        topUpCredits,
    };
}

/**
 * Reconcile a paid Razorpay order with the immutable pending top-up snapshot.
 * The snapshot freezes value at order creation, so later price/pack changes or
 * a request-side product override cannot change the credits being settled.
 */
export function resolveVerifiedTopupSettlement(params: {
    expectedOrderId: string;
    expectedPaymentId: string;
    expectedProductId: string;
    expectedStoreId: number;
    expectedTenantId: number;
    order: unknown;
    payment?: unknown;
    topupSnapshot: unknown;
}): VerifiedTopupSettlement | null {
    const order = asRecord(params.order);
    const topup = asRecord(params.topupSnapshot);
    const notes = asRecord(order?.notes);
    if (!order || !topup || !notes) return null;

    const providerOrderId = asTrimmedString(topup.providerOrderId);
    const tenantId = resolveExactIdentityAliases(topup, ['tenantId', 'tId'], params.expectedTenantId);
    const storeId = resolveExactIdentityAliases(topup, ['storeId', 'sId'], params.expectedStoreId);
    const billingStoreId = asExactPositiveSafeInteger(topup.billingStoreId);
    const packId = asTrimmedString(topup.packId);
    const creditsToAdd = asExactPositiveSafeInteger(topup.creditsAdded);
    const amount = asExactPositiveSafeInteger(topup.amount);
    const currency = asTrimmedString(topup.currency).toUpperCase();
    const status = asTrimmedString(topup.status);
    const packName = asBoundedNonEmptyString(topup.packName, 160);
    if (
        asTrimmedString(order.id) !== params.expectedOrderId
        || providerOrderId !== params.expectedOrderId
        || topup.pId !== params.expectedProductId
        || topup.productId !== params.expectedProductId
        || tenantId === null
        || storeId === null
        || billingStoreId === null
        || !/^[a-zA-Z0-9_-]{1,100}$/.test(packId)
        || creditsToAdd === null
        || amount === null
        || !/^[A-Z]{3}$/.test(currency)
        || (status !== 'pending' && !isSettledTopupStatus(status))
        || packName === null
    ) {
        return null;
    }

    if (
        asPositiveSafeInteger(order.amount) !== amount
        || asTrimmedString(order.currency).toUpperCase() !== currency
        || notes.pId !== params.expectedProductId
        || notes.productId !== params.expectedProductId
        || resolveNormalizedProviderIdentityAliases(notes, ['tenantId', 'tId'], params.expectedTenantId) === null
        || resolveNormalizedProviderIdentityAliases(notes, ['storeId', 'sId'], params.expectedStoreId) === null
        || asPositiveSafeInteger(notes.billingStoreId) !== billingStoreId
        || asTrimmedString(notes.packId) !== packId
        || asPositiveSafeInteger(notes.creditAmount) !== creditsToAdd
        || asPositiveSafeInteger(notes.price) !== amount
        || asTrimmedString(notes.currency).toUpperCase() !== currency
        || asBoundedNonEmptyString(notes.packName, 160) !== packName
    ) {
        return null;
    }

    const storedPaymentId = asTrimmedString(topup.providerPaymentId);
    if (status !== 'pending' && storedPaymentId !== params.expectedPaymentId) return null;

    if (params.payment !== undefined) {
        const payment = asRecord(params.payment);
        if (
            !payment
            || asTrimmedString(payment.id) !== params.expectedPaymentId
            || asTrimmedString(payment.order_id) !== params.expectedOrderId
            || asPositiveSafeInteger(payment.amount) !== amount
            || asTrimmedString(payment.currency).toUpperCase() !== currency
        ) {
            return null;
        }
    }

    return {
        amount,
        billingStoreId,
        creditsToAdd,
        currency,
        packId,
        packName,
    };
}

export function resolveTopupRefundCreditTarget(params: {
    creditsAdded: number;
    cumulativeRefundAmount: number;
    purchaseAmount: number;
}): number | null {
    const creditsAdded = asPositiveSafeInteger(params.creditsAdded);
    const cumulativeRefundAmount = asPositiveSafeInteger(params.cumulativeRefundAmount);
    const purchaseAmount = asPositiveSafeInteger(params.purchaseAmount);
    if (
        creditsAdded === null
        || cumulativeRefundAmount === null
        || purchaseAmount === null
        || cumulativeRefundAmount > purchaseAmount
    ) {
        return null;
    }

    if (cumulativeRefundAmount === purchaseAmount) return creditsAdded;
    const target = Number(
        (BigInt(creditsAdded) * BigInt(cumulativeRefundAmount)) / BigInt(purchaseAmount),
    );
    return Number.isSafeInteger(target) && target >= 0 ? target : null;
}

export function resolveTopupCreditDebtAllocation(params: {
    creditsPurchased: number;
    refundDebt: number;
}): {
    creditsAppliedToBalance: number;
    creditsOffsetAgainstRefundDebt: number;
    remainingRefundDebt: number;
} | null {
    const creditsPurchased = asPositiveSafeInteger(params.creditsPurchased);
    const refundDebt = asExactNonNegativeSafeInteger(params.refundDebt);
    if (creditsPurchased === null || refundDebt === null) return null;
    const creditsOffsetAgainstRefundDebt = Math.min(refundDebt, creditsPurchased);
    return {
        creditsAppliedToBalance: creditsPurchased - creditsOffsetAgainstRefundDebt,
        creditsOffsetAgainstRefundDebt,
        remainingRefundDebt: refundDebt - creditsOffsetAgainstRefundDebt,
    };
}
