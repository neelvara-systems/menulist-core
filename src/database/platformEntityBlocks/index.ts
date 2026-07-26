import type { PlatformBlockEntityType } from '@type/platform/blocking';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    parsePlatformEntityBlockAcknowledgement,
    type PlatformEntityBlockAcknowledgement,
} from '@lib/platform/entityBlockAcknowledgement';

export const PLATFORM_ENTITY_BLOCK_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
export const PLATFORM_ENTITY_BLOCK_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type PlatformEntityBlockClientError = Error & {
    code?: string;
    status?: number;
};

const PLATFORM_ENTITY_BLOCK_FAILED_MESSAGE = 'Could not update block status';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const parsePlatformEntityBlockResponse = (
    value: unknown,
    expected: {
        blocked: boolean;
        entityId: string | number;
        entityType: PlatformBlockEntityType;
    },
): PlatformEntityBlockAcknowledgement | null => {
    if (!isRecord(value) || value.success !== true || !isRecord(value.entity)) {
        return null;
    }

    return parsePlatformEntityBlockAcknowledgement(value.entity, expected);
};

const getPlatformEntityBlockResponseContext = ({
    blocked,
    entityId,
    entityType,
    response,
}: {
    blocked: boolean;
    entityId: string | number;
    entityType: PlatformBlockEntityType;
    response: Response;
}) => ({
    blocked,
    entityType,
    maxBytes: PLATFORM_ENTITY_BLOCK_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
    ...getBoundedRuntimeStringContext('entityId', entityId),
});

const createPlatformEntityBlockError = (
    response: Response,
    code = 'PLATFORM_ENTITY_BLOCK_RESPONSE_FAILED',
): PlatformEntityBlockClientError => {
    const error = new Error(PLATFORM_ENTITY_BLOCK_FAILED_MESSAGE) as PlatformEntityBlockClientError;
    error.code = code.slice(0, 64);
    error.status = response.status;
    return error;
};

async function readPlatformEntityBlockResponseJson(
    response: Response,
    context: {
        blocked: boolean;
        entityId: string | number;
        entityType: PlatformBlockEntityType;
    },
): Promise<unknown> {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            PLATFORM_ENTITY_BLOCK_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(
            'platform_entity_block_response_parse_failed',
            error,
            getPlatformEntityBlockResponseContext({
                ...context,
                response,
            }),
        );
        return null;
    }
}

export async function updatePlatformEntityBlockState({
    blocked,
    entityId,
    entityType,
    reason,
}: {
    blocked: boolean;
    entityId: string | number;
    entityType: PlatformBlockEntityType;
    reason: string;
}) {
    const response = await fetch('/api/platform/entity-blocks', {
        ...PLATFORM_ENTITY_BLOCK_REQUEST_POLICY,
        body: JSON.stringify({
            blocked,
            entityId,
            entityType,
            reason,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });

    const responseContext = {
        blocked,
        entityId,
        entityType,
    };
    const payload = await readPlatformEntityBlockResponseJson(response, responseContext);

    if (!response.ok) {
        const error = createPlatformEntityBlockError(response);
        logRuntimeFailure(
            'platform_entity_block_response_rejected',
            error,
            getPlatformEntityBlockResponseContext({
                ...responseContext,
                response,
            }),
        );
        throw error;
    }

    const entity = parsePlatformEntityBlockResponse(payload, responseContext);
    if (!entity) {
        const error = createPlatformEntityBlockError(response, 'PLATFORM_ENTITY_BLOCK_RESPONSE_INVALID');
        logRuntimeFailure(
            'platform_entity_block_response_invalid',
            error,
            getPlatformEntityBlockResponseContext({
                ...responseContext,
                response,
            }),
        );
        throw error;
    }

    return entity;
}
