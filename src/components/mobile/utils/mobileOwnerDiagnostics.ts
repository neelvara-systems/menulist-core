import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMobileOwnerErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMobileOwnerErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
