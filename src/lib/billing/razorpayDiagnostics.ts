import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/sessionUserDocumentId';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import { secureError } from '@lib/security/secureLogger';

type RazorpayDiagnosticContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedRazorpayStringContext = (
    label: string,
    value: unknown,
): RazorpayDiagnosticContext => {
    return getBoundedLogValueContext(label, value);
};

export const getBoundedRazorpaySecurityContext = (
    session: any,
    request?: Request,
): RazorpayDiagnosticContext => {
    const scope = resolveStorePermissionSessionScope(session);
    return {
        ...getBoundedRazorpayStringContext('userId', resolveCurrentSessionUserDocumentId(session)),
        ...getBoundedRazorpayStringContext('email', session?.user?.email),
        ...getBoundedRazorpayStringContext('tenantId', scope?.tenantScope.documentId),
        ...getBoundedRazorpayStringContext('storeId', scope?.storeScope.documentId),
        ...getBoundedRazorpayStringContext('ip', request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip')),
        ...getBoundedRazorpayStringContext('userAgent', request?.headers?.get('user-agent')),
    };
};

const getRazorpayErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getRazorpayErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getRazorpayErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
