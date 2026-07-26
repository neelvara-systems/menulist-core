import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMultiOutletErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMultiOutletErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
