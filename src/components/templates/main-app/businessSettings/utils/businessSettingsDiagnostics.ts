import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type BusinessSettingsLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedBusinessSettingsStringContext = (
    label: string,
    value: unknown,
): BusinessSettingsLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getBusinessSettingsErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getBusinessSettingsErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getBusinessSettingsErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
