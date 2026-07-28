import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type StaffClientLogContext = Record<string, boolean | number | string | undefined>;

export const getBoundedStaffStringContext = (
    label: string,
    value: unknown,
): StaffClientLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getStaffClientErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getStaffClientErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getStaffClientErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
