import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const OPS_CONTROL_ROOM_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
export const OPS_CONTROL_ROOM_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

const OPS_CONTROL_ROOM_RESPONSE_PARSE_FAILED = 'ops_control_room_response_parse_failed';
const OPS_CONTROL_ROOM_RESPONSE_INVALID = 'ops_control_room_response_invalid';
const OPS_CONTROL_ROOM_RESPONSE_REJECTED = 'ops_control_room_response_rejected';

type OpsControlRoomResponseKind = 'safeMode' | 'muteAlerts';
type OpsControlRoomResponseContext = Record<string, boolean | number | string | null | undefined>;

export type OpsControlRoomSafeModeResponse = {
    success: true;
    SAFE_MODE: boolean;
};

export type OpsControlRoomMuteAlertsResponse = {
    success: true;
    mutedUntil: string;
    durationMinutes: number;
};

export type OpsControlRoomForceRepublishResponse = {
    success: boolean;
    projectId: string;
    verification: string;
    publicMenuUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isOpsControlRoomSafeModeResponse(value: unknown): value is OpsControlRoomSafeModeResponse {
    return isRecord(value)
        && value.success === true
        && typeof value.SAFE_MODE === 'boolean';
}

function isOpsControlRoomMuteAlertsResponse(value: unknown): value is OpsControlRoomMuteAlertsResponse {
    return isRecord(value)
        && value.success === true
        && typeof value.mutedUntil === 'string'
        && isFiniteNumber(value.durationMinutes);
}

export function isOpsControlRoomForceRepublishResponse(
    value: unknown,
): value is OpsControlRoomForceRepublishResponse {
    return isRecord(value)
        && typeof value.success === 'boolean'
        && typeof value.projectId === 'string'
        && value.projectId.trim().length > 0
        && typeof value.verification === 'string'
        && value.verification.trim().length > 0
        && (value.publicMenuUrl === undefined || typeof value.publicMenuUrl === 'string');
}

export function logInvalidOpsControlRoomForceRepublishResponse(
    value: unknown,
    context: OpsControlRoomResponseContext = {},
) {
    const response = isRecord(value) ? value : null;
    logOpsFailure(
        'ops_control_room_force_republish_response_invalid',
        new Error('ops_control_room_force_republish_response_invalid'),
        {
            ...context,
            hasProjectId: typeof response?.projectId === 'string' && response.projectId.trim().length > 0,
            hasVerification: typeof response?.verification === 'string' && response.verification.trim().length > 0,
            successKnown: typeof response?.success === 'boolean',
        },
    );
}

function getOpsControlRoomResponseContext(
    response: Response,
    kind: OpsControlRoomResponseKind,
    context: OpsControlRoomResponseContext = {},
): OpsControlRoomResponseContext {
    return {
        ...context,
        ...getBoundedOpsStringContext('responseKind', kind),
        maxBytes: OPS_CONTROL_ROOM_RESPONSE_JSON_MAX_BYTES,
        responseOk: response.ok,
        responseStatus: response.status,
    };
}

async function readOpsControlRoomResponse<T>(
    response: Response,
    kind: OpsControlRoomResponseKind,
    isValid: (value: unknown) => value is T,
    context?: OpsControlRoomResponseContext,
): Promise<T | null> {
    const logContext = getOpsControlRoomResponseContext(response, kind, context);

    if (!response.ok) {
        logOpsFailure(
            OPS_CONTROL_ROOM_RESPONSE_REJECTED,
            new Error(OPS_CONTROL_ROOM_RESPONSE_REJECTED),
            logContext,
        );
        return null;
    }

    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            OPS_CONTROL_ROOM_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logOpsFailure(OPS_CONTROL_ROOM_RESPONSE_PARSE_FAILED, error, logContext);
        return null;
    }

    if (!isValid(payload)) {
        logOpsFailure(
            OPS_CONTROL_ROOM_RESPONSE_INVALID,
            new Error(OPS_CONTROL_ROOM_RESPONSE_INVALID),
            logContext,
        );
        return null;
    }

    return payload;
}

export function readOpsControlRoomSafeModeResponse(
    response: Response,
    context?: OpsControlRoomResponseContext,
): Promise<OpsControlRoomSafeModeResponse | null> {
    return readOpsControlRoomResponse(
        response,
        'safeMode',
        isOpsControlRoomSafeModeResponse,
        context,
    );
}

export function readOpsControlRoomMuteAlertsResponse(
    response: Response,
    context?: OpsControlRoomResponseContext,
): Promise<OpsControlRoomMuteAlertsResponse | null> {
    return readOpsControlRoomResponse(
        response,
        'muteAlerts',
        isOpsControlRoomMuteAlertsResponse,
        context,
    );
}
