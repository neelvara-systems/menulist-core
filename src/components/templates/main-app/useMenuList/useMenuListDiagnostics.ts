import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type UseMenuListLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedUseMenuListStringContext = (
    label: string,
    value: unknown,
): UseMenuListLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getUseMenuListErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getUseMenuListErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getUseMenuListErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logUseMenuListFailure = (
    failureCode: string,
    error?: unknown,
    context: UseMenuListLogContext = {},
): void => {
    secureError('[Use MenuList] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getUseMenuListErrorName(error),
        sourceErrorCode: getUseMenuListErrorCode(error),
        sourceStatusCode: getUseMenuListErrorStatus(error),
    });
};
