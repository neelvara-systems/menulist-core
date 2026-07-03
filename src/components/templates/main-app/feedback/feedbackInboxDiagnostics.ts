import { secureError } from '@lib/security/secureLogger';

type FeedbackInboxLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedFeedbackInboxStringContext = (
    label: string,
    value: unknown,
): FeedbackInboxLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getFeedbackInboxErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getFeedbackInboxErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getFeedbackInboxErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
