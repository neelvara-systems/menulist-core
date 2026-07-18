type RecordLike = Record<string, unknown>;

export type VerifiedTopupSettlement = {
    amount: number;
    creditsToAdd: number;
    currency: string;
    packId: string;
    packName: string;
};

export type CurrentTopupSubscriptionSettlement = {
    creditsLastResetMonth: number | null;
    monthlyCredits: number;
    monthlyCreditsAllowance: number;
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
    if (present.length === 0) return null;
    return present.every((key) => asExactPositiveSafeInteger(record[key]) === expected)
        ? expected
        : null;
};

/**
 * Admit the transaction-current subscription before a paid top-up mutates it.
 * Scope aliases must agree exactly; explicit product aliases must also agree,
 * while legacy MenuList documents may omit product identity when requested.
 */
export function resolveCurrentTopupSubscriptionSettlement(params: {
    allowMissingProductId?: boolean;
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

    const productAliases = ['productId', 'pId']
        .filter((key) => subscription[key] !== undefined && subscription[key] !== null)
        .map((key) => subscription[key]);
    if (productAliases.length === 0 && !params.allowMissingProductId) return null;
    if (
        productAliases.some((value) => (
            typeof value !== 'string' || value !== params.expectedProductId
        ))
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

    return {
        creditsLastResetMonth,
        monthlyCredits,
        monthlyCreditsAllowance,
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
    const productId = asTrimmedString(topup.productId ?? topup.pId).toUpperCase();
    const tenantId = asPositiveSafeInteger(topup.tenantId ?? topup.tId);
    const storeId = asPositiveSafeInteger(topup.storeId ?? topup.sId);
    const billingStoreId = asPositiveSafeInteger(topup.billingStoreId ?? topup.storeId ?? topup.sId);
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
        || billingStoreId === null
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
        || asPositiveSafeInteger(notes.billingStoreId ?? notes.storeId ?? notes.sId) !== billingStoreId
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
