export const RAZORPAY_SUBSCRIPTION_WEBHOOK_EVENTS = [
    'subscription.authenticated',
    'subscription.activated',
    'subscription.charged',
    'subscription.completed',
    'subscription.updated',
    'subscription.pending',
    'subscription.halted',
    'subscription.cancelled',
    'subscription.paused',
    'subscription.resumed',
] as const;

export type RazorpaySubscriptionWebhookEvent = typeof RAZORPAY_SUBSCRIPTION_WEBHOOK_EVENTS[number];

export const RAZORPAY_PROVIDER_SUBSCRIPTION_STATUSES = [
    'created',
    'authenticated',
    'active',
    'pending',
    'halted',
    'paused',
    'cancelled',
    'completed',
    'expired',
] as const;

export type RazorpayProviderSubscriptionStatus = typeof RAZORPAY_PROVIDER_SUBSCRIPTION_STATUSES[number];

export type RazorpayLocalSubscriptionStatus =
    | 'pending'
    | 'active'
    | 'past_due'
    | 'paused'
    | 'cancelled'
    | 'completed'
    | 'expired';

export type RazorpayCheckoutVerificationOutcome = 'active' | 'processing';

export const RAZORPAY_EMANDATE_CONFIRMATION_WINDOW_MS = 48 * 60 * 60 * 1000;

export type RazorpayPendingCheckoutAction = 'checkout' | 'processing' | 'replace';

export type RazorpaySubscriptionWebhookPolicy = {
    expectedProviderStatuses: readonly RazorpayProviderSubscriptionStatus[];
    nextStatus: RazorpayLocalSubscriptionStatus | null;
    settlesCapturedPayment: boolean;
};

export const RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES: Readonly<
    Record<RazorpaySubscriptionWebhookEvent, RazorpaySubscriptionWebhookPolicy>
> = {
    'subscription.authenticated': {
        expectedProviderStatuses: ['authenticated'],
        nextStatus: null,
        settlesCapturedPayment: false,
    },
    'subscription.activated': {
        expectedProviderStatuses: ['active'],
        nextStatus: null,
        settlesCapturedPayment: false,
    },
    'subscription.charged': {
        expectedProviderStatuses: ['active'],
        nextStatus: 'active',
        settlesCapturedPayment: true,
    },
    'subscription.completed': {
        expectedProviderStatuses: ['completed'],
        nextStatus: 'completed',
        settlesCapturedPayment: false,
    },
    'subscription.updated': {
        expectedProviderStatuses: RAZORPAY_PROVIDER_SUBSCRIPTION_STATUSES,
        nextStatus: null,
        settlesCapturedPayment: false,
    },
    'subscription.pending': {
        expectedProviderStatuses: ['pending'],
        nextStatus: 'past_due',
        settlesCapturedPayment: false,
    },
    'subscription.halted': {
        expectedProviderStatuses: ['halted'],
        nextStatus: 'past_due',
        settlesCapturedPayment: false,
    },
    'subscription.cancelled': {
        expectedProviderStatuses: ['cancelled'],
        nextStatus: 'cancelled',
        settlesCapturedPayment: false,
    },
    'subscription.paused': {
        expectedProviderStatuses: ['paused'],
        nextStatus: 'paused',
        settlesCapturedPayment: false,
    },
    'subscription.resumed': {
        expectedProviderStatuses: ['active'],
        nextStatus: 'active',
        settlesCapturedPayment: false,
    },
};

export const RAZORPAY_PROVIDER_SUBSCRIPTION_STATUS_MAP: Readonly<
    Record<RazorpayProviderSubscriptionStatus, RazorpayLocalSubscriptionStatus>
> = {
    created: 'pending',
    authenticated: 'pending',
    active: 'active',
    pending: 'past_due',
    halted: 'past_due',
    paused: 'paused',
    cancelled: 'cancelled',
    completed: 'completed',
    expired: 'expired',
};

export const resolveRazorpayProviderSubscriptionStatus = (
    value: unknown,
): RazorpayProviderSubscriptionStatus | null => (
    typeof value === 'string'
    && (RAZORPAY_PROVIDER_SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
        ? value as RazorpayProviderSubscriptionStatus
        : null
);

export const resolveRazorpayCheckoutVerificationOutcome = (
    value: unknown,
): RazorpayCheckoutVerificationOutcome | null => {
    const providerStatus = resolveRazorpayProviderSubscriptionStatus(value);
    if (providerStatus === 'active') return 'active';
    if (providerStatus === 'created' || providerStatus === 'authenticated') return 'processing';
    return null;
};

export const resolveRazorpayPendingCheckoutAction = (
    value: unknown,
    nowMillis: number = Date.now(),
): RazorpayPendingCheckoutAction | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (!Number.isSafeInteger(nowMillis) || nowMillis < 0) return null;

    const entity = value as Record<string, unknown>;
    const providerStatus = resolveRazorpayProviderSubscriptionStatus(entity.status);
    if (!providerStatus) return null;

    if (providerStatus === 'created') {
        const paymentMethod = typeof entity.payment_method === 'string'
            ? entity.payment_method.trim().toLowerCase()
            : '';
        if (paymentMethod !== 'emandate') return 'checkout';

        const createdAtSeconds = entity.created_at;
        if (
            typeof createdAtSeconds !== 'number'
            || !Number.isSafeInteger(createdAtSeconds)
            || createdAtSeconds <= 0
        ) return null;
        const createdAtMillis = createdAtSeconds * 1000;
        if (!Number.isSafeInteger(createdAtMillis) || createdAtMillis > nowMillis) return null;

        return nowMillis - createdAtMillis <= RAZORPAY_EMANDATE_CONFIRMATION_WINDOW_MS
            ? 'processing'
            : 'replace';
    }

    if (providerStatus === 'cancelled' || providerStatus === 'completed' || providerStatus === 'expired') {
        return 'replace';
    }

    return 'processing';
};

export const getRazorpaySubscriptionWebhookPolicy = (
    event: unknown,
): RazorpaySubscriptionWebhookPolicy | null => (
    typeof event === 'string'
    && Object.prototype.hasOwnProperty.call(RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES, event)
        ? RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES[event as RazorpaySubscriptionWebhookEvent]
        : null
);

export const isRazorpaySubscriptionWebhookProviderStatusValid = (
    event: unknown,
    providerStatus: unknown,
): boolean => {
    const policy = getRazorpaySubscriptionWebhookPolicy(event);
    const normalizedStatus = resolveRazorpayProviderSubscriptionStatus(providerStatus);
    return Boolean(
        policy
        && normalizedStatus
        && policy.expectedProviderStatuses.includes(normalizedStatus),
    );
};
