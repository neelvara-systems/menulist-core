import { secureError, secureLog } from "@lib/security/secureLogger";
import { getBoundedLogValueContext } from "@lib/monitoring/boundedLogContext";

type PricingLogContext = Record<string, boolean | number | string | null | undefined>;

type PricingErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedPricingStringContext = (
    label: string,
    value: unknown,
): PricingLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getPricingErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || "Error";
    return typeof error;
};

const getPricingErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) return undefined;
    const code = (error as PricingErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getPricingErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const statusValue = "status" in error
        ? (error as PricingErrorLike).status
        : (error as PricingErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const logPricingDiagnostic = (
    diagnosticCode: string,
    context: PricingLogContext = {},
): void => {
    secureLog("[Pricing] Diagnostic", {
        diagnosticCode,
        ...context,
    });
};

export const logPricingFailure = (
    failureCode: string,
    error?: unknown,
    context: PricingLogContext = {},
): void => {
    secureError("[Pricing] Operation failed", new Error(failureCode), {
        ...context,
        sourceErrorName: getPricingErrorName(error),
        sourceErrorCode: getPricingErrorCode(error),
        sourceStatusCode: getPricingErrorStatus(error),
    });
};
