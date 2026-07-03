import { secureError, secureLog } from '@lib/security/secureLogger';

type I18nLogContext = Record<string, boolean | number | string | null | undefined>;

type I18nErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedI18nStringContext = (
    label: string,
    value: unknown,
): I18nLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getI18nErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getI18nErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as I18nErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getI18nErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as I18nErrorLike).status
        : (error as I18nErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

const shouldSkipI18nLog = (options: { developmentOnly?: boolean }): boolean => (
    Boolean(options.developmentOnly) && process.env.NODE_ENV !== 'development'
);

export const logI18nDiagnostic = (
    diagnosticCode: string,
    context: I18nLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipI18nLog(options)) return;

    secureLog('[i18n] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logI18nFailure = (
    failureCode: string,
    error?: unknown,
    context: I18nLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipI18nLog(options)) return;

    secureError('[i18n] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getI18nErrorName(error),
        sourceErrorCode: getI18nErrorCode(error),
        sourceStatusCode: getI18nErrorStatus(error),
    });
};
