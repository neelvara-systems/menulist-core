import { logger } from "@lib/monitoring/logger";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import type { NextRequest } from "next/server";

type GrowthOSDiagnosticContext = Record<string, boolean | number | string | null | undefined>;

type GrowthOSSourceErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

const getGrowthOSSourceErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || "Error";
    return typeof error;
};

const getGrowthOSSourceErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) return undefined;
    const code = (error as GrowthOSSourceErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getGrowthOSSourceErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const statusValue = "status" in error
        ? (error as GrowthOSSourceErrorLike).status
        : (error as GrowthOSSourceErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const getGrowthOSBoundedStringContext = (
    key: string,
    value: unknown,
): GrowthOSDiagnosticContext => {
    const text = typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    const trimmed = text.trim();
    return {
        [`${key}Present`]: trimmed.length > 0,
        [`${key}Length`]: trimmed.length,
    };
};

export const getGrowthOSSourceErrorContext = (error: unknown): GrowthOSDiagnosticContext => ({
    sourceErrorName: getGrowthOSSourceErrorName(error),
    sourceErrorCode: getGrowthOSSourceErrorCode(error),
    sourceStatusCode: getGrowthOSSourceErrorStatus(error),
});

export const getGrowthOSSecurityLogContext = (
    session: any,
    request: NextRequest,
    endpoint: string,
    context: GrowthOSDiagnosticContext = {},
): GrowthOSDiagnosticContext => ({
    ...getBoundedSecurityRouteContext(session, request),
    ...getGrowthOSBoundedStringContext("endpoint", endpoint),
    ...getGrowthOSBoundedStringContext("method", request.method),
    ...context,
});

export const logGrowthOSApiFailure = (
    message: string,
    failureCode: string,
    error: unknown,
    context: GrowthOSDiagnosticContext = {},
): string | undefined => logger.error(message, new Error(failureCode), {
    failureCode,
    ...context,
    ...getGrowthOSSourceErrorContext(error),
});
