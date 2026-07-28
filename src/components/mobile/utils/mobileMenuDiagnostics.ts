import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type MobileMenuLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMobileMenuStringContext = (
    label: string,
    value: unknown,
): MobileMenuLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getMobileMenuProjectLogContext = (
    projectId?: unknown,
    masterProjectId?: unknown,
): MobileMenuLogContext => ({
    ...getBoundedMobileMenuStringContext('projectId', projectId),
    ...getBoundedMobileMenuStringContext('masterProjectId', masterProjectId),
});

export const getMobileMenuStoreLogContext = (
    storeId?: unknown,
    tenantId?: unknown,
): MobileMenuLogContext => ({
    ...getBoundedMobileMenuStringContext('storeId', storeId),
    ...getBoundedMobileMenuStringContext('tenantId', tenantId),
});

const getMobileMenuErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMobileMenuErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMobileMenuErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logMobileMenuFailure = (
    failureCode: string,
    error?: unknown,
    context: MobileMenuLogContext = {},
): void => {
    secureError('[Mobile Menu] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMobileMenuErrorName(error),
        sourceErrorCode: getMobileMenuErrorCode(error),
        sourceStatusCode: getMobileMenuErrorStatus(error),
    });
};
