import { secureError } from '@lib/security/secureLogger';

export type ProjectPageLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedProjectPageStringContext = (
    label: string,
    value: unknown,
): ProjectPageLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getProjectPageProjectLogContext = (
    projectId?: unknown,
    masterProjectId?: unknown,
): ProjectPageLogContext => ({
    ...getBoundedProjectPageStringContext('projectId', projectId),
    ...getBoundedProjectPageStringContext('masterProjectId', masterProjectId),
});

export const getProjectPageStoreLogContext = (
    storeId?: unknown,
    tenantId?: unknown,
): ProjectPageLogContext => ({
    ...getBoundedProjectPageStringContext('storeId', storeId),
    ...getBoundedProjectPageStringContext('tenantId', tenantId),
});

const getProjectPageErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getProjectPageErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getProjectPageErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logProjectPageFailure = (
    failureCode: string,
    error?: unknown,
    context: ProjectPageLogContext = {},
): void => {
    secureError('[Projects Page] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getProjectPageErrorName(error),
        sourceErrorCode: getProjectPageErrorCode(error),
        sourceStatusCode: getProjectPageErrorStatus(error),
    });
};
