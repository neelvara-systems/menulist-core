export type PaymentStatusError = Error & { code?: string; status?: number };

export type RazorpayPaymentResponse = Record<string, unknown> & {
    razorpay_payment_id: string;
    razorpay_signature: string;
    razorpay_subscription_id?: string;
};

export const PAYMENT_CHECKOUT_DISMISSED_CODE = 'payment_checkout_dismissed';
export const MAX_SUBSCRIPTION_QUANTITY = 31;

export const createPaymentStatusError = (
    message: string,
    code: string,
    status?: number,
): PaymentStatusError => {
    const error: PaymentStatusError = new Error(message);
    error.code = code;
    if (typeof status === 'number') error.status = status;
    return error;
};

export const createCheckoutDismissedError = (): PaymentStatusError => createPaymentStatusError(
    'Payment checkout was closed.',
    PAYMENT_CHECKOUT_DISMISSED_CODE,
);

export const isPaymentCheckoutDismissedError = (error: unknown): boolean => (
    error instanceof Error
    && 'code' in error
    && error.code === PAYMENT_CHECKOUT_DISMISSED_CODE
);

export const normalizeSubscriptionQuantity = (value: unknown): number => {
    if (value === undefined) return 1;
    const numeric = typeof value === 'number'
        ? value
        : typeof value === 'string' && /^[1-9]\d*$/.test(value)
            ? Number(value)
            : Number.NaN;
    if (!Number.isSafeInteger(numeric) || numeric < 1 || numeric > MAX_SUBSCRIPTION_QUANTITY) {
        throw createPaymentStatusError(
            'Subscription quantity is invalid.',
            'payment_subscription_quantity_invalid',
        );
    }
    return numeric;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isBoundedProviderString = (value: unknown): value is string => (
    typeof value === 'string'
    && /^[A-Za-z0-9_-]{1,512}$/.test(value)
);

export const isRazorpayPaymentResponse = (
    value: unknown,
    mode: 'subscription' | 'topup',
): value is RazorpayPaymentResponse => {
    if (!isRecord(value)) return false;
    if (!isBoundedProviderString(value.razorpay_payment_id)) return false;
    if (!isBoundedProviderString(value.razorpay_signature)) return false;
    return mode === 'topup' || isBoundedProviderString(value.razorpay_subscription_id);
};
