import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type FirebaseBootstrapLogContext = Record<string, boolean | number | string | null | undefined>;

type FirebaseErrorLike = Error & {
    code?: unknown;
    status?: unknown;
};

const FIREBASE_BOOTSTRAP_CONSOLE_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_/-]{0,79}$/;

export const getBoundedFirebaseStringContext = (
    label: string,
    value: unknown,
): FirebaseBootstrapLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getFirebaseErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getFirebaseErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getFirebaseErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const getSafeFirebaseBootstrapConsoleCode = (value: unknown): string => {
    return typeof value === 'string' && FIREBASE_BOOTSTRAP_CONSOLE_CODE_PATTERN.test(value)
        ? value
        : 'unknown';
};

export const getFirebaseBootstrapConsoleMessage = (
    failureCode: unknown,
    error?: unknown,
): string => {
    const sourceErrorCode = getFirebaseErrorCode(error);
    const sourceStatusCode = getFirebaseErrorStatus(error);
    const statusSuffix = typeof sourceStatusCode === 'number'
        ? ` status=${sourceStatusCode}`
        : '';

    return `[Firebase Bootstrap] Operation failed failure=${getSafeFirebaseBootstrapConsoleCode(failureCode)}`
        + ` source=${getSafeFirebaseBootstrapConsoleCode(sourceErrorCode)}`
        + statusSuffix;
};

export const getFirebaseAuthSessionLogContext = (session: any): FirebaseBootstrapLogContext => ({
    hasSessionUser: Boolean(session?.user),
    ...getBoundedFirebaseStringContext('tenantId', session?.user?.tenantId ?? session?.tId),
    ...getBoundedFirebaseStringContext('storeId', session?.user?.storeId ?? session?.sId),
    ...getBoundedFirebaseStringContext('userId', session?.user?.id),
});

export const createFirebaseBootstrapError = (
    message: string,
    code: string,
    context: FirebaseBootstrapLogContext = {},
): Error => {
    const error = new Error(message) as FirebaseErrorLike;
    error.name = 'FirebaseBootstrapError';
    error.code = code;

    const status = Number(context.statusCode);
    if (Number.isFinite(status)) {
        error.status = status;
    }

    return error;
};

export const logFirebaseBootstrapFailure = (
    failureCode: string,
    error?: unknown,
    context: FirebaseBootstrapLogContext = {},
): void => {
    secureError(getFirebaseBootstrapConsoleMessage(failureCode, error), new Error(failureCode), {
        ...context,
        sourceErrorName: getFirebaseErrorName(error),
        sourceErrorCode: getFirebaseErrorCode(error),
        sourceStatusCode: getFirebaseErrorStatus(error),
    });
};
