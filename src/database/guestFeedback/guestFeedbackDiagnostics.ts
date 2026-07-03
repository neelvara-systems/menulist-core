import { secureError } from '@lib/security/secureLogger';

type GuestFeedbackLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedGuestFeedbackStringContext = (
    label: string,
    value: unknown,
): GuestFeedbackLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getGuestFeedbackErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getGuestFeedbackErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getGuestFeedbackErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
