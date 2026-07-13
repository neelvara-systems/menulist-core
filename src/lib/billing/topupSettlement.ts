type RecordLike = Record<string, unknown>;

export type VerifiedTopupSettlement = {
    amount: number;
    creditsToAdd: number;
    currency: string;
    packId: string;
    packName: string;
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
    const productId = asTrimmedString(topup.productId ?? topup.pId).toUpperCase();
    const tenantId = asPositiveSafeInteger(topup.tenantId ?? topup.tId);
    const storeId = asPositiveSafeInteger(topup.storeId ?? topup.sId);
    const packId = asTrimmedString(topup.packId);
    const creditsToAdd = asPositiveSafeInteger(topup.creditsAdded);
    const amount = asPositiveSafeInteger(topup.amount);
    const currency = asTrimmedString(topup.currency).toUpperCase();
    const status = asTrimmedString(topup.status);
    if (
        asTrimmedString(order.id) !== params.expectedOrderId
        || providerOrderId !== params.expectedOrderId
        || productId !== params.expectedProductId
        || tenantId !== params.expectedTenantId
        || storeId !== params.expectedStoreId
        || !/^[a-zA-Z0-9_-]{1,100}$/.test(packId)
        || creditsToAdd === null
        || amount === null
        || !/^[A-Z]{3}$/.test(currency)
        || (status !== 'pending' && status !== 'paid')
    ) {
        return null;
    }

    if (
        asPositiveSafeInteger(order.amount) !== amount
        || asTrimmedString(order.currency).toUpperCase() !== currency
        || asTrimmedString(notes.productId ?? notes.pId).toUpperCase() !== productId
        || asPositiveSafeInteger(notes.tenantId ?? notes.tId) !== tenantId
        || asPositiveSafeInteger(notes.storeId ?? notes.sId) !== storeId
        || asTrimmedString(notes.packId) !== packId
        || asPositiveSafeInteger(notes.creditAmount) !== creditsToAdd
        || asPositiveSafeInteger(notes.price) !== amount
        || asTrimmedString(notes.currency).toUpperCase() !== currency
    ) {
        return null;
    }

    const storedPaymentId = asTrimmedString(topup.providerPaymentId);
    if (status === 'paid' && storedPaymentId !== params.expectedPaymentId) return null;

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
        creditsToAdd,
        currency,
        packId,
        packName: asTrimmedString(topup.packName ?? notes.packName).slice(0, 160),
    };
}
