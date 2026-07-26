import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type StaffClientLogContext = Record<string, boolean | number | string | undefined>;

type StaffClientErrorLike = Error & {
    code?: unknown;
    status?: unknown;
};

export const getBoundedStaffStringContext = (
    label: string,
    value: unknown,
): StaffClientLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getStaffClientErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getStaffClientErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as StaffClientErrorLike).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getStaffClientErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as StaffClientErrorLike).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logStaffClientFailure = (
    failureCode: string,
    error: unknown,
    context: StaffClientLogContext = {},
): void => {
    secureError('[Staff Management] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getStaffClientErrorName(error),
        sourceErrorCode: getStaffClientErrorCode(error),
        sourceStatusCode: getStaffClientErrorStatus(error),
    });
};

export const logStaffDiagnostic = (
    diagnosticCode: string,
    context: StaffClientLogContext = {},
): void => {
    secureLog('[Staff Management] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};
