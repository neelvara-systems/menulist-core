import { secureError } from '@lib/security/secureLogger';

type PaymentLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedPaymentStringContext = (
    label: string,
    value: unknown,
): PaymentLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getPaymentErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getPaymentErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

export const getPaymentFlowLogContext = (
    flow: string,
    productId?: unknown,
): PaymentLogContext => ({
    flow,
    ...getBoundedPaymentStringContext('productId', productId),
});

export const logPaymentFailure = (
    failureCode: string,
    error?: unknown,
    context: PaymentLogContext = {},
): void => {
    secureError('[Payment] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getPaymentErrorName(error),
        sourceErrorCode: getPaymentErrorCode(error),
    });
};
