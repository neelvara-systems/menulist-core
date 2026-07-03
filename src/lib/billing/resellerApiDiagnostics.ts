import { secureError } from "@lib/security/secureLogger";

export type ResellerApiLogContext = Record<string, boolean | number | string | null | undefined>;

type ResellerApiErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedResellerApiStringContext = (
    label: string,
    value: unknown,
): ResellerApiLogContext => {
    const normalized = value === undefined || value === null ? "" : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getResellerApiErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || "Error";
    return typeof error;
};

const getResellerApiErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) return undefined;
    const code = (error as ResellerApiErrorLike).code;
    if (code === undefined || code === null) return undefined;
    const normalized = String(code).slice(0, 64);
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : "non_standard_code";
};

const getResellerApiErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const statusValue = "status" in error
        ? (error as ResellerApiErrorLike).status
        : (error as ResellerApiErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const getResellerApiFailureLogData = (
    failureCode: string,
    error?: unknown,
    context: ResellerApiLogContext = {},
): ResellerApiLogContext => ({
    failureCode,
    ...context,
    sourceErrorName: getResellerApiErrorName(error),
    sourceErrorCode: getResellerApiErrorCode(error),
    sourceStatusCode: getResellerApiErrorStatus(error),
});

export const logResellerApiFailure = (
    failureCode: string,
    error?: unknown,
    context: ResellerApiLogContext = {},
): void => {
    secureError("[Reseller API] Operation failed", new Error(failureCode), getResellerApiFailureLogData(
        failureCode,
        error,
        context,
    ));
};
