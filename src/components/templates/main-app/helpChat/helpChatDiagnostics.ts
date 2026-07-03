import { secureError } from '@lib/security/secureLogger';

type HelpChatLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedHelpChatStringContext = (
    label: string,
    value: unknown,
): HelpChatLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getHelpChatErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getHelpChatErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getHelpChatErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logHelpChatFailure = (
    failureCode: string,
    error?: unknown,
    context: HelpChatLogContext = {},
): void => {
    secureError('[Help Chat] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getHelpChatErrorName(error),
        sourceErrorCode: getHelpChatErrorCode(error),
        sourceStatusCode: getHelpChatErrorStatus(error),
    });
};
