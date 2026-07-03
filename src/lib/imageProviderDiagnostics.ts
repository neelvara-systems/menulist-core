import { secureError } from '@lib/security/secureLogger';

type ImageProviderLogContext = Record<string, boolean | number | string | undefined>;

type ImageProviderErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    response?: {
        status?: unknown;
    };
};

export const getBoundedImageProviderStringContext = (
    label: string,
    value: unknown,
): ImageProviderLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getImageProviderErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getImageProviderErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as ImageProviderErrorLike).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getImageProviderErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const status = Number((error as ImageProviderErrorLike).status ?? (error as ImageProviderErrorLike).response?.status);
    return Number.isFinite(status) ? status : undefined;
};

export const getImageProviderRequestLogContext = (payload: {
    operation: string;
    orientation?: unknown;
    page?: unknown;
    provider: string;
    query?: unknown;
}): ImageProviderLogContext => {
    const page = Number(payload.page);

    return {
        provider: payload.provider,
        operation: payload.operation,
        page: Number.isFinite(page) ? page : undefined,
        ...getBoundedImageProviderStringContext('orientation', payload.orientation),
        ...getBoundedImageProviderStringContext('query', payload.query),
    };
};

export const logImageProviderFailure = (
    failureCode: string,
    error: unknown,
    context: ImageProviderLogContext = {},
): void => {
    secureError('[Image Provider] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getImageProviderErrorName(error),
        sourceErrorCode: getImageProviderErrorCode(error),
        sourceStatusCode: getImageProviderErrorStatus(error),
    });
};
