import { logger } from "@lib/monitoring/logger";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import type { NextRequest } from "next/server";
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type DiagnosticContext = Record<string, boolean | number | string | null | undefined>;

const getSourceErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getSourceErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getSourceErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
