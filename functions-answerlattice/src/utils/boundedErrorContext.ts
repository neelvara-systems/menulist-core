export type BoundedFunctionsErrorContext = {
    sourceErrorCode?: string;
    sourceErrorName?: string;
    sourceStatusCode?: number;
};

const readField = (value: unknown, field: string): unknown => {
    if (!value || typeof value !== 'object') return undefined;
    try {
        return field in value
            ? (value as Record<string, unknown>)[field]
            : undefined;
    } catch {
        return undefined;
    }
};

const projectCode = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value.slice(0, 64);
    if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, 64);
    if (typeof value === 'bigint' || typeof value === 'boolean') return String(value).slice(0, 64);
    return undefined;
};

const projectStatus = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) return undefined;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
};

export const getBoundedFunctionsErrorContext = (error: unknown): BoundedFunctionsErrorContext => {
    let sourceErrorName: string | undefined;
    try {
        sourceErrorName = error instanceof Error
            ? (typeof error.name === 'string' && error.name ? error.name.slice(0, 80) : 'Error')
            : (error === undefined ? undefined : typeof error);
    } catch {
        sourceErrorName = 'object';
    }
    const status = readField(error, 'status');
    return {
        sourceErrorName,
        sourceErrorCode: projectCode(readField(error, 'code')),
        sourceStatusCode: projectStatus(status === undefined ? readField(error, 'statusCode') : status),
    };
};

export const getBoundedFunctionsErrorName = (error: unknown): string | undefined => (
    getBoundedFunctionsErrorContext(error).sourceErrorName
);

export const getBoundedFunctionsErrorCode = (error: unknown): string | undefined => (
    getBoundedFunctionsErrorContext(error).sourceErrorCode
);

export const getBoundedFunctionsErrorStatus = (error: unknown): number | undefined => (
    getBoundedFunctionsErrorContext(error).sourceStatusCode
);

export const getBoundedFunctionsErrorMessage = (error: unknown): string | undefined => {
    const message = readField(error, 'message');
    return typeof message === 'string' ? message.slice(0, 160) : undefined;
};
