import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type ProjectPageLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedProjectPageStringContext = (
    label: string,
    value: unknown,
): ProjectPageLogContext => {
    return getBoundedLogValueContext(label, value);
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
    return getBoundedErrorName(error);
};

const getProjectPageErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getProjectPageErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
