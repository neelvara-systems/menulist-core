import { PRODUCT_IDS, type ProductId } from '@constant/product';

export type RazorpayWebhookProductDeclaration =
    | { outcome: 'declared'; productId: ProductId }
    | { outcome: 'invalid' }
    | { outcome: 'missing' };

type RazorpayWebhookSubscriptionIdDeclaration =
    | { outcome: 'declared'; subscriptionId: string }
    | { outcome: 'invalid' }
    | { outcome: 'missing' };

type RazorpayWebhookSubscriptionProductResolution =
    | { outcome: 'resolved'; productId: ProductId }
    | { outcome: 'conflict' }
    | { outcome: 'unresolved' };

export type RazorpaySubscriptionStateProjection = {
    chargeAtMillis: number;
    chargeAtSeconds: number;
    currentEndMillis: number;
    currentEndSeconds: number;
    currentStartMillis: number;
    currentStartSeconds: number;
    paidCount: number;
    quantity: number;
    startAtMillis: number;
    startAtSeconds: number;
    totalCount: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
);

export const resolveRazorpayWebhookProductDeclaration = (
    eventPayload: unknown,
): RazorpayWebhookProductDeclaration => {
    const event = asRecord(eventPayload);
    const payload = asRecord(event?.payload);
    const payment = asRecord(asRecord(payload?.payment)?.entity);
    const refund = asRecord(asRecord(payload?.refund)?.entity);
    const subscription = asRecord(asRecord(payload?.subscription)?.entity);
    const order = asRecord(asRecord(payload?.order)?.entity);
    const noteRecords = [payment?.notes, refund?.notes, subscription?.notes, order?.notes]
        .map(asRecord)
        .filter((value): value is Record<string, unknown> => value !== null);
    const aliases = [
        event?.productId,
        event?.pId,
        ...noteRecords.flatMap((notes) => [notes.productId, notes.pId]),
    ].filter((value) => value != null && value !== '');

    if (aliases.length === 0) return { outcome: 'missing' };
    if (!aliases.every((value) => value === PRODUCT_IDS.MENULIST || value === PRODUCT_IDS.ANSWERLATTICE)) {
        return { outcome: 'invalid' };
    }
    const [productId] = aliases as ProductId[];
    return aliases.every((value) => value === productId)
        ? { outcome: 'declared', productId }
        : { outcome: 'invalid' };
};

export const resolveRazorpayWebhookSubscriptionId = (
    eventPayload: unknown,
): RazorpayWebhookSubscriptionIdDeclaration => {
    const event = asRecord(eventPayload);
    const payload = asRecord(event?.payload);
    const payment = asRecord(asRecord(payload?.payment)?.entity);
    const refund = asRecord(asRecord(payload?.refund)?.entity);
    const subscription = asRecord(asRecord(payload?.subscription)?.entity);
    const order = asRecord(asRecord(payload?.order)?.entity);
    const aliases = [
        subscription?.id,
        payment?.subscription_id,
        refund?.subscription_id,
        order?.subscription_id,
    ].filter((value) => value != null);

    if (aliases.length === 0) return { outcome: 'missing' };
    if (!aliases.every((value) => (
        typeof value === 'string'
        && value.length > 0
        && value.length <= 180
        && value === value.trim()
    ))) {
        return { outcome: 'invalid' };
    }
    const [subscriptionId] = aliases as string[];
    return aliases.every((value) => value === subscriptionId)
        ? { outcome: 'declared', subscriptionId }
        : { outcome: 'invalid' };
};

export const resolveRazorpayWebhookSubscriptionProduct = ({
    declaration,
    hasAnswerlatticeSubscription,
    hasMenuListSubscription,
}: {
    declaration: RazorpayWebhookProductDeclaration;
    hasAnswerlatticeSubscription: boolean;
    hasMenuListSubscription: boolean;
}): RazorpayWebhookSubscriptionProductResolution => {
    if (declaration.outcome === 'invalid' || (hasMenuListSubscription && hasAnswerlatticeSubscription)) {
        return { outcome: 'conflict' };
    }
    if (!hasMenuListSubscription && !hasAnswerlatticeSubscription) {
        return { outcome: 'unresolved' };
    }

    const storedProductId = hasMenuListSubscription
        ? PRODUCT_IDS.MENULIST
        : PRODUCT_IDS.ANSWERLATTICE;
    if (declaration.outcome === 'declared' && declaration.productId !== storedProductId) {
        return { outcome: 'conflict' };
    }
    return { outcome: 'resolved', productId: storedProductId };
};

const resolveExactPositiveSafeInteger = (value: unknown, max = Number.MAX_SAFE_INTEGER): number | null => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
    && value <= max
        ? value
        : null
);

const resolveExactNonNegativeSafeInteger = (value: unknown, max = Number.MAX_SAFE_INTEGER): number | null => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= max
        ? value
        : null
);

export const resolveRazorpaySubscriptionQuantity = (value: unknown): number | null => (
    resolveExactPositiveSafeInteger(value, 10_000)
);

const providerSecondsToMillis = (seconds: number): number | null => {
    const milliseconds = seconds * 1_000;
    return Number.isSafeInteger(milliseconds) && Number.isFinite(new Date(milliseconds).getTime())
        ? milliseconds
        : null;
};

export const resolveRazorpaySubscriptionState = (
    value: unknown,
    fallbackQuantity?: unknown,
): RazorpaySubscriptionStateProjection | null => {
    const subscription = asRecord(value);
    if (!subscription) return null;

    const currentStartSeconds = resolveExactPositiveSafeInteger(subscription.current_start);
    const currentEndSeconds = resolveExactPositiveSafeInteger(subscription.current_end);
    const chargeAtSeconds = resolveExactPositiveSafeInteger(subscription.charge_at);
    const startAtSeconds = resolveExactPositiveSafeInteger(subscription.start_at);
    const totalCount = resolveExactPositiveSafeInteger(subscription.total_count, 10_000);
    const paidCount = resolveExactNonNegativeSafeInteger(subscription.paid_count, 10_000);
    const quantity = resolveRazorpaySubscriptionQuantity(
        subscription.quantity == null ? fallbackQuantity : subscription.quantity,
    );
    if (
        currentStartSeconds == null
        || currentEndSeconds == null
        || chargeAtSeconds == null
        || startAtSeconds == null
        || totalCount == null
        || paidCount == null
        || quantity == null
        || paidCount > totalCount
        || currentEndSeconds <= currentStartSeconds
        || startAtSeconds > currentStartSeconds
        || chargeAtSeconds < currentStartSeconds
    ) {
        return null;
    }

    const currentStartMillis = providerSecondsToMillis(currentStartSeconds);
    const currentEndMillis = providerSecondsToMillis(currentEndSeconds);
    const chargeAtMillis = providerSecondsToMillis(chargeAtSeconds);
    const startAtMillis = providerSecondsToMillis(startAtSeconds);
    if (
        currentStartMillis == null
        || currentEndMillis == null
        || chargeAtMillis == null
        || startAtMillis == null
    ) {
        return null;
    }
    return {
        chargeAtMillis,
        chargeAtSeconds,
        currentEndMillis,
        currentEndSeconds,
        currentStartMillis,
        currentStartSeconds,
        paidCount,
        quantity,
        startAtMillis,
        startAtSeconds,
        totalCount,
    };
};

export const requireRazorpayRevenueAmountPaise = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('Razorpay revenue amount is invalid.');
    }
    return value;
};

export const resolveRazorpayAuditAmountPaise = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new Error('Razorpay audit amount is invalid.');
    }
    return value;
};

export const resolveRazorpayRevenueOccurredAtMillis = (value: unknown): number | undefined => {
    if (value == null) return undefined;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('Razorpay revenue event time is invalid.');
    }
    const milliseconds = providerSecondsToMillis(value);
    if (milliseconds == null) {
        throw new Error('Razorpay revenue event time is invalid.');
    }
    return milliseconds;
};
