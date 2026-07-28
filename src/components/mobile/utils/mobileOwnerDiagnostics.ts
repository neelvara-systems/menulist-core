import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type MobileOwnerLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMobileOwnerStringContext = (
    label: string,
    value: unknown,
): MobileOwnerLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getMobileOwnerStoreLogContext = (
    storeId?: unknown,
    tenantId?: unknown,
): MobileOwnerLogContext => ({
    ...getBoundedMobileOwnerStringContext('storeId', storeId),
    ...getBoundedMobileOwnerStringContext('tenantId', tenantId),
});

const getMobileOwnerErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMobileOwnerErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMobileOwnerErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logMobileOwnerFailure = (
    failureCode: string,
    error?: unknown,
    context: MobileOwnerLogContext = {},
): void => {
    secureError('[Mobile Owner] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMobileOwnerErrorName(error),
        sourceErrorCode: getMobileOwnerErrorCode(error),
        sourceStatusCode: getMobileOwnerErrorStatus(error),
    });
};
