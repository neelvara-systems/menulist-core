import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type GuestFeedbackLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedGuestFeedbackStringContext = (
    label: string,
    value: unknown,
): GuestFeedbackLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getGuestFeedbackErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getGuestFeedbackErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getGuestFeedbackErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logGuestFeedbackFailure = (
    failureCode: string,
    error?: unknown,
    context: GuestFeedbackLogContext = {},
): void => {
    secureError('[Guest Feedback] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getGuestFeedbackErrorName(error),
        sourceErrorCode: getGuestFeedbackErrorCode(error),
        sourceStatusCode: getGuestFeedbackErrorStatus(error),
    });
};
