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
    secureError('[Firebase Bootstrap] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getFirebaseErrorName(error),
        sourceErrorCode: getFirebaseErrorCode(error),
        sourceStatusCode: getFirebaseErrorStatus(error),
    });
};
