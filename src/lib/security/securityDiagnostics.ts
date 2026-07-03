import { secureError, secureLog } from './secureLogger';

type SecurityLogContext = Record<string, boolean | number | string | null | undefined>;

type SecurityErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

type SecuritySessionLike = {
    sId?: unknown;
    storeId?: unknown;
    tId?: unknown;
    tenantId?: unknown;
    uId?: unknown;
    user?: {
        email?: unknown;
        id?: unknown;
        storeId?: unknown;
        tenantId?: unknown;
    };
    userId?: unknown;
};

export const getBoundedSecurityStringContext = (
    label: string,
    value: unknown,
): SecurityLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getBoundedSecurityRouteContext = (
    session: SecuritySessionLike | null | undefined,
    request?: Request,
): SecurityLogContext => ({
    ...getBoundedSecurityStringContext('userId', session?.user?.id ?? session?.uId ?? session?.userId),
    ...getBoundedSecurityStringContext('email', session?.user?.email),
    ...getBoundedSecurityStringContext('tenantId', session?.tId ?? session?.tenantId ?? session?.user?.tenantId),
    ...getBoundedSecurityStringContext('storeId', session?.sId ?? session?.storeId ?? session?.user?.storeId),
    ...getBoundedSecurityStringContext('ip', request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip')),
    ...getBoundedSecurityStringContext('userAgent', request?.headers?.get('user-agent')),
});

const getSecurityErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getSecurityErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as SecurityErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getSecurityErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as SecurityErrorLike).status
        : (error as SecurityErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const logSecurityDiagnostic = (
    diagnosticCode: string,
    context: SecurityLogContext = {},
): void => {
    secureLog('[Security] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logSecurityFailure = (
    failureCode: string,
    error?: unknown,
    context: SecurityLogContext = {},
): void => {
    secureError('[Security] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getSecurityErrorName(error),
        sourceErrorCode: getSecurityErrorCode(error),
        sourceStatusCode: getSecurityErrorStatus(error),
    });
};
