import { secureError } from '@lib/security/secureLogger';

export type MobileMenuLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMobileMenuStringContext = (
    label: string,
    value: unknown,
): MobileMenuLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMobileMenuErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMobileMenuErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
