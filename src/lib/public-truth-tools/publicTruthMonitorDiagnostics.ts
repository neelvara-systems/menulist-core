import { logger } from "@lib/monitoring/logger";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import type { NextRequest } from "next/server";

type DiagnosticContext = Record<string, boolean | number | string | null | undefined>;

type SourceErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

const getSourceErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || "Error";
    return typeof error;
};

const getSourceErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) return undefined;
    const code = (error as SourceErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getSourceErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const statusValue = "status" in error
        ? (error as SourceErrorLike).status
        : (error as SourceErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const getPublicTruthMonitorBoundedStringContext = (
    key: string,
    value: unknown,
): DiagnosticContext => {
    const text = typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    const trimmed = text.trim();
    return {
        [`${key}Length`]: trimmed.length,
        [`${key}Present`]: trimmed.length > 0,
    };
};

export const getPublicTruthMonitorSecurityLogContext = (
    session: any,
    request: NextRequest,
    endpoint: string,
    context: DiagnosticContext = {},
): DiagnosticContext => ({
    ...getBoundedSecurityRouteContext(session, request),
    ...getPublicTruthMonitorBoundedStringContext("endpoint", endpoint),
    ...getPublicTruthMonitorBoundedStringContext("method", request.method),
    ...context,
});

export const logPublicTruthMonitorApiFailure = (
    message: string,
    failureCode: string,
    error: unknown,
    context: DiagnosticContext = {},
): string | undefined => logger.error(message, new Error(failureCode), {
    failureCode,
    ...context,
    sourceErrorCode: getSourceErrorCode(error),
    sourceErrorName: getSourceErrorName(error),
    sourceStatusCode: getSourceErrorStatus(error),
});
