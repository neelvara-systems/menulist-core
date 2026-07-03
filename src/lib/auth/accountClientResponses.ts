import { createAuthDiagnosticError, logAuthFailure } from '@lib/auth/authDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { AUTH_BROWSER_REQUEST_POLICY } from './browserRequestPolicy';

export const AUTH_ACCOUNT_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
export const AUTH_ACCOUNT_REQUEST_POLICY = AUTH_BROWSER_REQUEST_POLICY;

export type AuthAccountResponseKind = 'profile_update' | 'password_change';

export type AuthProfileUpdateResponse = {
    success: true;
    updated: string[];
    updates: Record<string, unknown>;
};

export type AuthPasswordChangeResponse = {
    message?: string;
    success: true;
};

type AuthAccountLogContext = Record<string, boolean | number | string | undefined>;
type AuthAccountError = Error & { code?: string; status?: number };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isProfileUpdateResponse = (value: unknown): value is AuthProfileUpdateResponse => (
    isRecord(value)
    && value.success === true
    && Array.isArray(value.updated)
    && isRecord(value.updates)
);

const isPasswordChangeResponse = (value: unknown): value is AuthPasswordChangeResponse => (
    isRecord(value) && value.success === true
);

const isExpectedAuthAccountResponse = (
    kind: AuthAccountResponseKind,
    value: unknown,
): value is AuthProfileUpdateResponse | AuthPasswordChangeResponse => (
    kind === 'profile_update'
        ? isProfileUpdateResponse(value)
        : isPasswordChangeResponse(value)
);

const getAuthAccountResponseLogContext = (
    kind: AuthAccountResponseKind,
    response: Response,
): AuthAccountLogContext => ({
    maxBytes: AUTH_ACCOUNT_RESPONSE_JSON_MAX_BYTES,
    responseKind: kind,
    responseOk: response.ok,
    responseStatus: response.status,
});

const createAuthAccountClientError = (
    response: Response,
    code: string,
): AuthAccountError => {
    const error = createAuthDiagnosticError('Auth account request failed', {
        statusCode: response.status,
    }) as AuthAccountError;
    error.code = code.slice(0, 64);
    error.status = response.status;
    return error;
};

const getRejectedResponseCode = (
    kind: AuthAccountResponseKind,
    payload: unknown,
): string => {
    if (isRecord(payload) && typeof payload.code === 'string') {
        return payload.code;
    }
    return kind === 'profile_update'
        ? 'AUTH_PROFILE_UPDATE_REJECTED'
        : 'AUTH_PASSWORD_CHANGE_REJECTED';
};

export const readAuthAccountResponse = async <T extends AuthProfileUpdateResponse | AuthPasswordChangeResponse>(
    response: Response,
    kind: AuthAccountResponseKind,
): Promise<T> => {
    let payload: unknown = null;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            AUTH_ACCOUNT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAuthFailure(
            'auth_account_response_parse_failed',
            error,
            getAuthAccountResponseLogContext(kind, response),
        );
    }

    if (!response.ok) {
        throw createAuthAccountClientError(response, getRejectedResponseCode(kind, payload));
    }

    if (!isExpectedAuthAccountResponse(kind, payload)) {
        logAuthFailure(
            'auth_account_response_invalid',
            createAuthAccountClientError(response, 'AUTH_ACCOUNT_RESPONSE_INVALID'),
            getAuthAccountResponseLogContext(kind, response),
        );
        throw createAuthAccountClientError(response, 'AUTH_ACCOUNT_RESPONSE_INVALID');
    }

    return payload as T;
};
