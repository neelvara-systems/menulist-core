import { secureError, secureLog } from '@lib/security/secureLogger';

type MenuProcessingLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMenuProcessingStringContext = (
    label: string,
    value: unknown,
): MenuProcessingLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getMenuProcessingErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMenuProcessingErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMenuProcessingErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const getMenuProcessingJobLogContext = (jobId: unknown): MenuProcessingLogContext => ({
    ...getBoundedMenuProcessingStringContext('jobId', jobId),
});

export const getMenuProcessingProjectLogContext = (projectId: unknown): MenuProcessingLogContext => ({
    ...getBoundedMenuProcessingStringContext('projectId', projectId),
});

export const logMenuProcessingFailure = (
    failureCode: string,
    error?: unknown,
    context: MenuProcessingLogContext = {},
): void => {
    secureError('[Menu Processing] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMenuProcessingErrorName(error),
        sourceErrorCode: getMenuProcessingErrorCode(error),
        sourceStatusCode: getMenuProcessingErrorStatus(error),
    });
};

export const logMenuProcessingDiagnostic = (
    diagnosticCode: string,
    context: MenuProcessingLogContext = {},
): void => {
    secureLog('[Menu Processing] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};
