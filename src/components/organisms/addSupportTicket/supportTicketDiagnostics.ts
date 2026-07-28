import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type SupportTicketLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedSupportTicketStringContext = (
    label: string,
    value: unknown,
): SupportTicketLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getSupportTicketErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getSupportTicketErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getSupportTicketErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logSupportTicketFailure = (
    failureCode: string,
    error?: unknown,
    context: SupportTicketLogContext = {},
): void => {
    secureError('[Support Ticket] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getSupportTicketErrorName(error),
        sourceErrorCode: getSupportTicketErrorCode(error),
        sourceStatusCode: getSupportTicketErrorStatus(error),
    });
};
