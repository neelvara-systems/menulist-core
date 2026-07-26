import { secureError, secureLog } from '@lib/security/secureLogger';
import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';

export type ProjectPersistenceLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedProjectPersistenceStringContext = (
    label: string,
    value: unknown,
): ProjectPersistenceLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getProjectPersistenceProjectLogContext = (
    projectId?: unknown,
    masterProjectId?: unknown,
): ProjectPersistenceLogContext => ({
    ...getBoundedProjectPersistenceStringContext('projectId', projectId),
    ...getBoundedProjectPersistenceStringContext('masterProjectId', masterProjectId),
});

const getProjectPersistenceErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getProjectPersistenceErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getProjectPersistenceErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logProjectPersistenceFailure = (
    failureCode: string,
    error?: unknown,
    context: ProjectPersistenceLogContext = {},
): void => {
    secureError('[Project Persistence] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getProjectPersistenceErrorName(error),
        sourceErrorCode: getProjectPersistenceErrorCode(error),
        sourceStatusCode: getProjectPersistenceErrorStatus(error),
    });
};

export const logProjectPersistenceInfo = (
    eventCode: string,
    context: ProjectPersistenceLogContext = {},
): void => {
    if (process.env.NODE_ENV !== 'development') return;

    secureLog('[Project Persistence] Diagnostic', {
        eventCode,
        ...context,
    });
};
