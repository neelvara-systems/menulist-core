import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { secureError } from '@lib/security/secureLogger';

export const TEMP_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

export type TempStatusAction = 'set' | 'clear';

type TempStatusResponseContext = Record<string, boolean | number | string | null | undefined>;
type TempStatusClientError = Error & { code?: string; status?: number };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isTempStatusSuccessResponse = (value: unknown): value is { success: true } => (
    isRecord(value) && value.success === true
);

const getTempStatusResponseContext = (
    response: Response,
    action: TempStatusAction,
    context: TempStatusResponseContext,
): TempStatusResponseContext => ({
    ...context,
    action,
    maxBytes: TEMP_STATUS_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
});

const createTempStatusClientError = (
    response: Response,
    code: string,
): TempStatusClientError => {
    const error = new Error('Temporary status request failed') as TempStatusClientError;
    error.code = code.slice(0, 64);
    error.status = response.status;
    return error;
};

const getRejectedCode = (payload: unknown, action: TempStatusAction): string => {
    if (isRecord(payload) && typeof payload.code === 'string') {
        return payload.code;
    }

    return action === 'set'
        ? 'TEMP_STATUS_SET_REJECTED'
        : 'TEMP_STATUS_CLEAR_REJECTED';
};

const logTempStatusClientFailure = (
    failureCode: string,
    error: unknown,
    context: TempStatusResponseContext,
): void => {
    secureError('[Temp Status] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: error instanceof Error ? error.name || 'Error' : typeof error,
        sourceErrorCode: isRecord(error) && typeof error.code === 'string'
            ? error.code.slice(0, 64)
            : undefined,
        sourceStatusCode: isRecord(error) && Number.isFinite(Number(error.status))
            ? Number(error.status)
            : undefined,
    });
};

export const readTempStatusResponse = async (
    response: Response,
    action: TempStatusAction,
    context: TempStatusResponseContext = {},
): Promise<{ success: true }> => {
    let payload: unknown = null;
    const responseContext = getTempStatusResponseContext(response, action, context);

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            TEMP_STATUS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logTempStatusClientFailure(
            'temp_status_response_parse_failed',
            error,
            responseContext,
        );
    }

    if (!response.ok) {
        throw createTempStatusClientError(response, getRejectedCode(payload, action));
    }

    if (!isTempStatusSuccessResponse(payload)) {
        const error = createTempStatusClientError(response, 'TEMP_STATUS_RESPONSE_INVALID');
        logTempStatusClientFailure(
            'temp_status_response_invalid',
            error,
            responseContext,
        );
        throw error;
    }

    return payload;
};
