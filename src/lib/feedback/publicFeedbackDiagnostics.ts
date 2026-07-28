import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type PublicFeedbackLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedPublicFeedbackStringContext = (
    label: string,
    value: unknown,
): PublicFeedbackLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getPublicFeedbackErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getPublicFeedbackErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getPublicFeedbackErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logPublicFeedbackPageFailure = (
    failureCode: string,
    error?: unknown,
    context: PublicFeedbackLogContext = {},
): void => {
    secureError('[Public Feedback] Page operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getPublicFeedbackErrorName(error),
        sourceErrorCode: getPublicFeedbackErrorCode(error),
        sourceStatusCode: getPublicFeedbackErrorStatus(error),
    });
};

export const logPublicFeedbackFormFailure = (
    failureCode: string,
    error?: unknown,
    context: PublicFeedbackLogContext = {},
): void => {
    secureError('[Public Feedback] Form operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getPublicFeedbackErrorName(error),
        sourceErrorCode: getPublicFeedbackErrorCode(error),
        sourceStatusCode: getPublicFeedbackErrorStatus(error),
    });
};
