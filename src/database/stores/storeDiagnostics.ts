import { secureError } from '@lib/security/secureLogger';

type StoreDataLogContext = Record<string, boolean | number | string | undefined>;

type StoreDataErrorLike = Error & {
    code?: unknown;
    status?: unknown;
};

export const getBoundedStoreStringContext = (
    label: string,
    value: unknown,
): StoreDataLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getStoreDataErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getStoreDataErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as StoreDataErrorLike).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getStoreDataErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as StoreDataErrorLike).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logStoreDataFailure = (
    failureCode: string,
    error?: unknown,
    context: StoreDataLogContext = {},
): void => {
    secureError('[Store Data] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getStoreDataErrorName(error),
        sourceErrorCode: getStoreDataErrorCode(error),
        sourceStatusCode: getStoreDataErrorStatus(error),
    });
};
