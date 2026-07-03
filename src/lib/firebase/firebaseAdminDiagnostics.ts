import { secureError, secureLog } from '@lib/security/secureLogger';

type FirebaseAdminLogContext = Record<string, boolean | number | string | null | undefined>;

type FirebaseAdminErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

const getFirebaseAdminErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getFirebaseAdminErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as FirebaseAdminErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getFirebaseAdminErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as FirebaseAdminErrorLike).status
        : (error as FirebaseAdminErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

const shouldSkipFirebaseAdminLog = (options: { developmentOnly?: boolean }): boolean => (
    Boolean(options.developmentOnly) && process.env.NODE_ENV !== 'development'
);

export const getBoundedFirebaseAdminStringContext = (
    label: string,
    value: unknown,
): FirebaseAdminLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const logFirebaseAdminDiagnostic = (
    diagnosticCode: string,
    context: FirebaseAdminLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipFirebaseAdminLog(options)) return;

    secureLog('[Firebase Admin] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logFirebaseAdminFailure = (
    failureCode: string,
    error?: unknown,
    context: FirebaseAdminLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipFirebaseAdminLog(options)) return;

    secureError('[Firebase Admin] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getFirebaseAdminErrorName(error),
        sourceErrorCode: getFirebaseAdminErrorCode(error),
        sourceStatusCode: getFirebaseAdminErrorStatus(error),
    });
};
