import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from './secureLogger';

type SecurityLogContext = Record<string, boolean | number | string | null | undefined>;

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
    return getBoundedLogValueContext(label, value);
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
    return getBoundedErrorName(error);
};

const getSecurityErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getSecurityErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
