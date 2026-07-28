import { secureError, secureLog } from '@lib/security/secureLogger';
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

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
    return getBoundedErrorName(error);
};

const getProjectPersistenceErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getProjectPersistenceErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
