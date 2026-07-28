import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type MobileProjectLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMobileProjectStringContext = (
    label: string,
    value: unknown,
): MobileProjectLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getMobileProjectLogContext = (
    projectId?: unknown,
    masterProjectId?: unknown,
): MobileProjectLogContext => ({
    ...getBoundedMobileProjectStringContext('projectId', projectId),
    ...getBoundedMobileProjectStringContext('masterProjectId', masterProjectId),
});

export const getMobileProjectStoreLogContext = (
    storeId?: unknown,
    tenantId?: unknown,
): MobileProjectLogContext => ({
    ...getBoundedMobileProjectStringContext('storeId', storeId),
    ...getBoundedMobileProjectStringContext('tenantId', tenantId),
});

const getMobileProjectErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMobileProjectErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMobileProjectErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logMobileProjectFailure = (
    failureCode: string,
    error?: unknown,
    context: MobileProjectLogContext = {},
): void => {
    secureError('[Mobile Project] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMobileProjectErrorName(error),
        sourceErrorCode: getMobileProjectErrorCode(error),
        sourceStatusCode: getMobileProjectErrorStatus(error),
    });
};
