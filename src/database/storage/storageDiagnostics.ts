import { secureError } from "@lib/security/secureLogger";
import { getBoundedLogValueContext } from "@lib/monitoring/boundedLogContext";

const getLogErrorName = (error: unknown): string => (
    error instanceof Error ? error.name : typeof error
);

const getLogErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code.slice(0, 80) : undefined;
};

export const getBoundedStringLogContext = (
    label: string,
    value: unknown,
): Record<string, unknown> => {
    return getBoundedLogValueContext(
        label,
        typeof value === "string" ? value.trim() : value,
    );
};

export const logStorageHelperFailure = (
    failureCode: string,
    error: unknown,
    context: Record<string, unknown> = {},
): void => {
    secureError(
        "[Storage Helper] Operation failed",
        new Error(failureCode),
        {
            ...context,
            errorCode: getLogErrorCode(error),
            errorName: getLogErrorName(error),
        },
    );
};
