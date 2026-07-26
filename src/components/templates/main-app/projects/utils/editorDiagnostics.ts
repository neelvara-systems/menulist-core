import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMenuEditorErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMenuEditorErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
