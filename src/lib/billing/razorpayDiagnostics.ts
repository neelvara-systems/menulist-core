import { secureError } from '@lib/security/secureLogger';

type RazorpayDiagnosticContext = Record<string, boolean | number | string | null | undefined>;

type RazorpayErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedRazorpayStringContext = (
    label: string,
    value: unknown,
): RazorpayDiagnosticContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getBoundedRazorpaySecurityContext = (
    session: any,
    request?: Request,
): RazorpayDiagnosticContext => ({
    ...getBoundedRazorpayStringContext('userId', session?.user?.id || session?.uId || session?.userId),
    ...getBoundedRazorpayStringContext('email', session?.user?.email),
    ...getBoundedRazorpayStringContext('tenantId', session?.user?.tenantId || session?.tId),
    ...getBoundedRazorpayStringContext('storeId', session?.user?.storeId || session?.sId),
    ...getBoundedRazorpayStringContext('ip', request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip')),
    ...getBoundedRazorpayStringContext('userAgent', request?.headers?.get('user-agent')),
});

const getRazorpayErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getRazorpayErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as RazorpayErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getRazorpayErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as RazorpayErrorLike).status
        : (error as RazorpayErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const getRazorpayFailureLogData = (
    failureCode: string,
    error?: unknown,
    context: RazorpayDiagnosticContext = {},
): RazorpayDiagnosticContext => ({
    failureCode,
    ...context,
    sourceErrorName: getRazorpayErrorName(error),
    sourceErrorCode: getRazorpayErrorCode(error),
    sourceStatusCode: getRazorpayErrorStatus(error),
});

export const logRazorpayNonBlockingFailure = (
    failureCode: string,
    error?: unknown,
    context: RazorpayDiagnosticContext = {},
): void => {
    secureError(
        '[Razorpay] Non-blocking operation failed',
        new Error(failureCode),
        getRazorpayFailureLogData(failureCode, error, context),
    );
};

export const getRazorpaySubscriptionMutationLogContext = (
    subscription: any,
): RazorpayDiagnosticContext => ({
    ...getBoundedRazorpayStringContext('subscriptionId', subscription?.id || subscription?.providerSubscriptionId),
    ...getBoundedRazorpayStringContext('providerSubscriptionId', subscription?.providerSubscriptionId || subscription?.id),
    ...getBoundedRazorpayStringContext('status', subscription?.status),
    ...getBoundedRazorpayStringContext('tenantId', subscription?.tenantId),
    ...getBoundedRazorpayStringContext('storeId', subscription?.storeId),
    ...getBoundedRazorpayStringContext('planId', subscription?.planId),
    quantity: Number.isFinite(Number(subscription?.quantity)) ? Number(subscription.quantity) : undefined,
});
