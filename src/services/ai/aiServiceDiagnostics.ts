import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export type AiServiceLogContext = Record<string, boolean | number | string | null | undefined>;

type AiServiceResponseParserOptions = {
    context?: AiServiceLogContext;
    invalidFailureCode: string;
    maxBytes: number;
    parseFailureCode: string;
};

export const AI_SERVICE_ROUTE_REQUEST_OPTIONS: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

export const getBoundedAiServiceStringContext = (
    label: string,
    value: unknown,
): AiServiceLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getAiServiceErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getAiServiceErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getAiServiceErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const createAiServiceHttpError = (
    failureCode: string,
    response: Response,
): Error & { code: string; statusCode: number } => Object.assign(new Error(failureCode), {
    code: failureCode,
    statusCode: response.status,
});

const createAiServiceResponseError = (
    failureCode: string,
    response: Response,
): Error & { code: string; statusCode: number } => Object.assign(new Error(failureCode), {
    code: failureCode,
    statusCode: response.status,
});

export const logAiServiceFailure = (
    failureCode: string,
    error?: unknown,
    context: AiServiceLogContext = {},
): void => {
    const boundedContext = {
        ...context,
        failureCode,
        sourceErrorName: getAiServiceErrorName(error),
        sourceErrorCode: getAiServiceErrorCode(error),
        sourceStatusCode: getAiServiceErrorStatus(error),
    };

    if (typeof window === 'undefined') {
        secureError('[AI Service] Operation failed', new Error(failureCode), boundedContext);
        return;
    }

    // Browser API failures already recover through owner-facing UI. Keep the
    // bounded diagnostic available to local support capture without raising a
    // Next.js development error overlay over that recovery state.
    secureLog('[AI Service] Operation failed', {
        ...boundedContext,
        severity: 'error',
    });
};

export const logAiServiceDiagnostic = (
    diagnosticCode: string,
    context: AiServiceLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (options.developmentOnly && process.env.NODE_ENV !== 'development') return;

    secureLog('[AI Service] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export async function readAiServiceResponseJson(
    response: Response,
    options: AiServiceResponseParserOptions,
): Promise<Record<string, unknown>> {
    const {
        context = {},
        invalidFailureCode,
        maxBytes,
        parseFailureCode,
    } = options;
    const logContext = {
        ...context,
        maxBytes,
        responseOk: response.ok,
        responseStatus: response.status,
    };

    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, maxBytes);
    } catch (error) {
        logAiServiceFailure(parseFailureCode, error, logContext);
        throw createAiServiceResponseError(parseFailureCode, response);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        logAiServiceFailure(
            invalidFailureCode,
            createAiServiceResponseError(invalidFailureCode, response),
            logContext,
        );
        throw createAiServiceResponseError(invalidFailureCode, response);
    }

    return payload as Record<string, unknown>;
}
