import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type FeedbackInboxLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedFeedbackInboxStringContext = (
    label: string,
    value: unknown,
): FeedbackInboxLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getFeedbackInboxErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getFeedbackInboxErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getFeedbackInboxErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logFeedbackInboxFailure = (
    failureCode: string,
    error?: unknown,
    context: FeedbackInboxLogContext = {},
): void => {
    secureError('[Feedback Inbox] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getFeedbackInboxErrorName(error),
        sourceErrorCode: getFeedbackInboxErrorCode(error),
        sourceStatusCode: getFeedbackInboxErrorStatus(error),
    });
};
