import { secureError } from '@lib/security/secureLogger';

export type UseMenuListLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedUseMenuListStringContext = (
    label: string,
    value: unknown,
): UseMenuListLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getUseMenuListErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getUseMenuListErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getUseMenuListErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logUseMenuListFailure = (
    failureCode: string,
    error?: unknown,
    context: UseMenuListLogContext = {},
): void => {
    secureError('[Use MenuList] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getUseMenuListErrorName(error),
        sourceErrorCode: getUseMenuListErrorCode(error),
        sourceStatusCode: getUseMenuListErrorStatus(error),
    });
};
