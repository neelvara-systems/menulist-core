import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export type AiServiceLogContext = Record<string, boolean | number | string | null | undefined>;

type AiServiceErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getAiServiceErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as AiServiceErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getAiServiceErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as AiServiceErrorLike).status
        : (error as AiServiceErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
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
    secureError('[AI Service] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getAiServiceErrorName(error),
        sourceErrorCode: getAiServiceErrorCode(error),
        sourceStatusCode: getAiServiceErrorStatus(error),
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

export async function readAiServiceResponseJson<T extends object>(
    response: Response,
    options: AiServiceResponseParserOptions,
): Promise<T> {
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

    return payload as T;
}
