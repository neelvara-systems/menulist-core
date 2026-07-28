import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type CampaignLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedCampaignStringContext = (
    label: string,
    value: unknown,
): CampaignLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getCampaignErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getCampaignErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getCampaignErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logCampaignFailure = (
    failureCode: string,
    error?: unknown,
    context: CampaignLogContext = {},
): void => {
    secureError('[Campaign Action] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getCampaignErrorName(error),
        sourceErrorCode: getCampaignErrorCode(error),
        sourceStatusCode: getCampaignErrorStatus(error),
    });
};
