import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type MenuProcessingLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMenuProcessingStringContext = (
    label: string,
    value: unknown,
): MenuProcessingLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getMenuProcessingErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMenuProcessingErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMenuProcessingErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
