import { secureError } from "@lib/security/secureLogger";
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

export type ResellerApiLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedResellerApiStringContext = (
    label: string,
    value: unknown,
): ResellerApiLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getResellerApiErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getResellerApiErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getResellerApiErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const getResellerApiFailureLogData = (
    failureCode: string,
    error?: unknown,
    context: ResellerApiLogContext = {},
): ResellerApiLogContext => ({
    failureCode,
    ...context,
    sourceErrorName: getResellerApiErrorName(error),
    sourceErrorCode: getResellerApiErrorCode(error),
    sourceStatusCode: getResellerApiErrorStatus(error),
});

export const logResellerApiFailure = (
    failureCode: string,
    error?: unknown,
    context: ResellerApiLogContext = {},
): void => {
    secureError("[Reseller API] Operation failed", new Error(failureCode), getResellerApiFailureLogData(
        failureCode,
        error,
        context,
    ));
};
