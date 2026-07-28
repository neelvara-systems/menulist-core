import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type PaymentLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedPaymentStringContext = (
    label: string,
    value: unknown,
): PaymentLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getPaymentErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getPaymentErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
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
