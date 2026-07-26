export const getBoundedLogValueContext = (
    label: string,
    value: unknown,
): Record<string, boolean | number> => {
    if (value === undefined || value === null) {
        return {
            [`${label}Present`]: false,
            [`${label}Length`]: 0,
        };
    }

    let length = 0;
    if (typeof value === "string") {
        length = value.length;
    } else if (
        typeof value === "number"
        || typeof value === "boolean"
        || typeof value === "bigint"
    ) {
        length = String(value).length;
    }

    return {
        [`${label}Present`]: typeof value !== "string" || value.length > 0,
        [`${label}Length`]: length,
    };
};

export type BoundedErrorLogContext = {
    sourceErrorCode?: string;
    sourceErrorName?: string;
    sourceStatusCode?: number;
};

const readUnknownObjectField = (value: unknown, field: string): unknown => {
    if (!value || typeof value !== "object") return undefined;

    try {
        return field in value
            ? (value as Record<string, unknown>)[field]
            : undefined;
    } catch {
        return undefined;
    }
};

const projectErrorCode = (value: unknown): string | undefined => {
    if (typeof value === "string") return value.slice(0, 64);
    if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, 64);
    if (typeof value === "bigint" || typeof value === "boolean") return String(value).slice(0, 64);
    return undefined;
};

const projectErrorStatus = (value: unknown): number | undefined => {
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value)) return undefined;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
};

export const getBoundedErrorLogContext = (error: unknown): BoundedErrorLogContext => {
    let sourceErrorName: string | undefined;
    try {
        sourceErrorName = error instanceof Error
            ? (typeof error.name === "string" && error.name ? error.name : "Error")
            : (error === undefined ? undefined : typeof error);
    } catch {
        sourceErrorName = "object";
    }

    const status = readUnknownObjectField(error, "status");
    const statusCode = status === undefined
        ? readUnknownObjectField(error, "statusCode")
        : status;

    return {
        sourceErrorName,
        sourceErrorCode: projectErrorCode(readUnknownObjectField(error, "code")),
        sourceStatusCode: projectErrorStatus(statusCode),
    };
};
