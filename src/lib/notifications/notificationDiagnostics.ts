import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
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
    return getBoundedLogValueContext(label, value);
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
    return getBoundedErrorName(error);
};

const getNotificationErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getNotificationErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
