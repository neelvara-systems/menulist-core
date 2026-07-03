import { secureError, secureLog } from '@lib/security/secureLogger';

type DatabaseLoggerContext = Record<string, boolean | number | string | null | undefined>;

type DatabaseLoggerErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedDatabaseLoggerStringContext = (
    label: string,
    value: unknown,
): DatabaseLoggerContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getObjectKeyCount = (value: unknown): number => (
    value && typeof value === 'object' ? Object.keys(value as Record<string, unknown>).length : 0
);

const getDatabaseLoggerErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getDatabaseLoggerErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as DatabaseLoggerErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getDatabaseLoggerErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as DatabaseLoggerErrorLike).status
        : (error as DatabaseLoggerErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const logDatabaseLoggerDiagnostic = (
    diagnosticCode: string,
    context: DatabaseLoggerContext = {},
): void => {
    secureLog('[Database Logger] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logDatabaseLoggerFailure = (
    failureCode: string,
    error?: unknown,
    context: DatabaseLoggerContext = {},
): void => {
    secureError('[Database Logger] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getDatabaseLoggerErrorName(error),
        sourceErrorCode: getDatabaseLoggerErrorCode(error),
        sourceStatusCode: getDatabaseLoggerErrorStatus(error),
    });
};
