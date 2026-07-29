import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type ImageProviderLogContext = Record<string, boolean | number | string | undefined>;

export const getBoundedImageProviderStringContext = (
    label: string,
    value: unknown,
): ImageProviderLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getImageProviderErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getImageProviderErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getImageProviderErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const getImageProviderRequestLogContext = (payload: {
    operation: string;
    orientation?: unknown;
    page?: unknown;
    provider: string;
    query?: unknown;
}): ImageProviderLogContext => {
    const page = typeof payload.page === 'number'
        ? payload.page
        : (
            typeof payload.page === 'string'
            && /^-?\d+(?:\.\d+)?$/.test(payload.page)
        )
            ? Number(payload.page)
            : Number.NaN;

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
