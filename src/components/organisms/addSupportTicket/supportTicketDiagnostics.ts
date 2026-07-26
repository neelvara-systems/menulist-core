import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type SupportTicketLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedSupportTicketStringContext = (
    label: string,
    value: unknown,
): SupportTicketLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getSupportTicketErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getSupportTicketErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getSupportTicketErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
