import { secureError } from '@lib/security/secureLogger';

export type CampaignLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedCampaignStringContext = (
    label: string,
    value: unknown,
): CampaignLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getCampaignErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getCampaignErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getCampaignErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
