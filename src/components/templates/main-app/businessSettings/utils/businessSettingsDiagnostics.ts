import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type BusinessSettingsLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedBusinessSettingsStringContext = (
    label: string,
    value: unknown,
): BusinessSettingsLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getBusinessSettingsErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getBusinessSettingsErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getBusinessSettingsErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logBusinessSettingsFailure = (
    failureCode: string,
    error?: unknown,
    context: BusinessSettingsLogContext = {},
): void => {
    secureError('[Business Settings] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getBusinessSettingsErrorName(error),
        sourceErrorCode: getBusinessSettingsErrorCode(error),
        sourceStatusCode: getBusinessSettingsErrorStatus(error),
    });
};
