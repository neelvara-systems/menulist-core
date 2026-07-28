import { logger } from "@lib/monitoring/logger";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import type { NextRequest } from "next/server";
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type GrowthOSDiagnosticContext = Record<string, boolean | number | string | null | undefined>;

const getGrowthOSSourceErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getGrowthOSSourceErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getGrowthOSSourceErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
