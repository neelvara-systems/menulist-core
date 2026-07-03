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
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getFirebaseErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getFirebaseErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as FirebaseErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getFirebaseErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as FirebaseErrorLike).status);
    return Number.isFinite(status) ? status : undefined;
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
