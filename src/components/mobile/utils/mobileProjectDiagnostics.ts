import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMobileProjectErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMobileProjectErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
