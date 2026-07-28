import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

export type MenuEditorLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMenuEditorStringContext = (
    label: string,
    value: unknown,
): MenuEditorLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getMenuEditorProjectLogContext = (
    projectId?: unknown,
    masterProjectId?: unknown,
): MenuEditorLogContext => ({
    ...getBoundedMenuEditorStringContext('projectId', projectId),
    ...getBoundedMenuEditorStringContext('masterProjectId', masterProjectId),
});

const getMenuEditorErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMenuEditorErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMenuEditorErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logMenuEditorFailure = (
    failureCode: string,
    error?: unknown,
    context: MenuEditorLogContext = {},
): void => {
    secureError('[Menu Editor] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMenuEditorErrorName(error),
        sourceErrorCode: getMenuEditorErrorCode(error),
        sourceStatusCode: getMenuEditorErrorStatus(error),
    });
};

export const logMenuEditorDiagnostic = (
    diagnosticCode: string,
    context: MenuEditorLogContext = {},
): void => {
    secureLog('[Menu Editor] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};
