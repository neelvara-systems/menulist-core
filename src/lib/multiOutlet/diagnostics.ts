import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type MultiOutletLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMultiOutletStringContext = (
    label: string,
    value: unknown,
): MultiOutletLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getMultiOutletProjectLogContext = (
    projectId?: unknown,
    masterProjectId?: unknown,
): MultiOutletLogContext => ({
    ...getBoundedMultiOutletStringContext('projectId', projectId),
    ...getBoundedMultiOutletStringContext('masterProjectId', masterProjectId),
});

const getMultiOutletErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMultiOutletErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMultiOutletErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logMultiOutletFailure = (
    failureCode: string,
    error?: unknown,
    context: MultiOutletLogContext = {},
): void => {
    secureError('[Multi-Outlet] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMultiOutletErrorName(error),
        sourceErrorCode: getMultiOutletErrorCode(error),
        sourceStatusCode: getMultiOutletErrorStatus(error),
    });
};
