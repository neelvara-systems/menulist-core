import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type StoreDataLogContext = Record<string, boolean | number | string | undefined>;

export const getBoundedStoreStringContext = (
    label: string,
    value: unknown,
): StoreDataLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getStoreDataErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getStoreDataErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getStoreDataErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logStoreDataFailure = (
    failureCode: string,
    error?: unknown,
    context: StoreDataLogContext = {},
): void => {
    secureError('[Store Data] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getStoreDataErrorName(error),
        sourceErrorCode: getStoreDataErrorCode(error),
        sourceStatusCode: getStoreDataErrorStatus(error),
    });
};
