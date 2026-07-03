import { secureError, secureLog } from '@lib/security/secureLogger';

type AuthLogContext = Record<string, boolean | number | string | null | undefined>;

type AuthErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedAuthStringContext = (
    label: string,
    value: unknown,
): AuthLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getAuthErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getAuthErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as AuthErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getAuthErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as AuthErrorLike).status
        : (error as AuthErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const getAuthSessionLogContext = (session: any): AuthLogContext => ({
    hasSessionUser: Boolean(session?.user),
    ...getBoundedAuthStringContext('tenantId', session?.tId ?? session?.user?.tenantId),
    ...getBoundedAuthStringContext('storeId', session?.sId ?? session?.user?.storeId),
    ...getBoundedAuthStringContext('userId', session?.uId ?? session?.user?.id),
});

export const createAuthDiagnosticError = (
    message: string,
    context: AuthLogContext = {},
): Error => {
    const error = new Error(message) as AuthErrorLike;
    error.name = 'AuthDiagnosticError';

    const status = Number(context.statusCode);
    if (Number.isFinite(status)) {
        error.status = status;
    }

    return error;
};

export const logAuthDiagnostic = (
    diagnosticCode: string,
    context: AuthLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (options.developmentOnly && process.env.NODE_ENV !== 'development') return;

    secureLog('[Auth] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logAuthFailure = (
    failureCode: string,
    error?: unknown,
    context: AuthLogContext = {},
): void => {
    secureError('[Auth] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getAuthErrorName(error),
        sourceErrorCode: getAuthErrorCode(error),
        sourceStatusCode: getAuthErrorStatus(error),
    });
};
