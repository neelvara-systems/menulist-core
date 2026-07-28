import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type FirebaseAdminLogContext = Record<string, boolean | number | string | null | undefined>;

const getFirebaseAdminErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getFirebaseAdminErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getFirebaseAdminErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const shouldSkipFirebaseAdminLog = (options: { developmentOnly?: boolean }): boolean => (
    Boolean(options.developmentOnly) && process.env.NODE_ENV !== 'development'
);

export const getBoundedFirebaseAdminStringContext = (
    label: string,
    value: unknown,
): FirebaseAdminLogContext => {
    return getBoundedLogValueContext(label, value);
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
