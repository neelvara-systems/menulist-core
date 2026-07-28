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

const readUnknownObjectPath = (
    value: unknown,
    fields: readonly string[],
): unknown => (
    fields.reduce<unknown>(
        (current, field) => readUnknownObjectField(current, field),
        value,
    )
);

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
            ? (typeof error.name === "string" && error.name ? error.name.slice(0, 80) : "Error")
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

export const getBoundedErrorCode = (error: unknown): string | undefined => (
    getBoundedErrorLogContext(error).sourceErrorCode
);

export const getBoundedErrorStatus = (error: unknown): number | undefined => (
    getBoundedErrorLogContext(error).sourceStatusCode
);

export const getBoundedErrorName = (error: unknown): string | undefined => (
    getBoundedErrorLogContext(error).sourceErrorName
);

export const getBoundedNestedErrorCode = (
    error: unknown,
    nestedField: string,
): string | undefined => (
    getBoundedErrorCode(readUnknownObjectField(error, nestedField))
);

export const getBoundedErrorNumericField = (
    error: unknown,
    field: string,
): number | undefined => (
    projectErrorStatus(readUnknownObjectField(error, field))
);

export const getBoundedErrorCodeAtPath = (
    error: unknown,
    fields: readonly string[],
): string | undefined => (
    projectErrorCode(readUnknownObjectPath(error, fields))
);

export const getBoundedErrorNumberAtPath = (
    error: unknown,
    fields: readonly string[],
): number | undefined => (
    projectErrorStatus(readUnknownObjectPath(error, fields))
);

export const getBoundedErrorStringField = (
    error: unknown,
    field: string,
    maxLength = 64,
): string | undefined => {
    const value = readUnknownObjectField(error, field);
    return typeof value === "string" ? value.slice(0, maxLength) : undefined;
};

export const getBoundedNumericLogValue = (value: unknown): number | undefined => (
    projectErrorStatus(value)
);

export const getUnknownObjectValueAtPath = (
    value: unknown,
    fields: readonly string[],
): unknown => readUnknownObjectPath(value, fields);
