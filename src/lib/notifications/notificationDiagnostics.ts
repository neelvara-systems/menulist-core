import { secureError } from '@lib/security/secureLogger';

type NotificationLogContext = Record<string, boolean | number | string | null | undefined>;

type NotificationDiagnosticPayload = {
    eventType?: unknown;
    productId?: unknown;
    referenceId?: unknown;
    recipientEmail?: unknown;
    recipientName?: unknown;
    metadata?: unknown;
};

export const getBoundedNotificationStringContext = (
    label: string,
    value: unknown,
): NotificationLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getNotificationPayloadLogContext = (
    payload: NotificationDiagnosticPayload = {},
): NotificationLogContext => ({
    eventType: typeof payload.eventType === 'string' ? payload.eventType.slice(0, 80) : undefined,
    productId: typeof payload.productId === 'string' ? payload.productId.slice(0, 24) : undefined,
    metadataPresent: Boolean(payload.metadata),
    metadataKeyCount: payload.metadata && typeof payload.metadata === 'object'
        ? Object.keys(payload.metadata as Record<string, unknown>).length
        : 0,
    ...getBoundedNotificationStringContext('referenceId', payload.referenceId),
    ...getBoundedNotificationStringContext('recipientEmail', payload.recipientEmail),
    ...getBoundedNotificationStringContext('recipientName', payload.recipientName),
});

const getNotificationErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getNotificationErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getNotificationErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logNotificationFailure = (
    failureCode: string,
    error?: unknown,
    context: NotificationLogContext = {},
): void => {
    secureError('[Notification] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getNotificationErrorName(error),
        sourceErrorCode: getNotificationErrorCode(error),
        sourceStatusCode: getNotificationErrorStatus(error),
    });
};
