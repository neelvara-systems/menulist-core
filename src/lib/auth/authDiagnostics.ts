import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
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
    return getBoundedLogValueContext(label, value);
};

const getAuthErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getAuthErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getAuthErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
