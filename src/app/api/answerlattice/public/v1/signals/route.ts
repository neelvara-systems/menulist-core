export const dynamic = 'force-dynamic';

/**
 * Answerlattice Public Signal Ingestion API
 *
 * Ingests structured support/friction signals from external SaaS systems.
 * Signals feed Answerlattice mutation governance and never mutate canonical answers directly.
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    AnswerlatticeSignalReplayConflictError,
    emitAnswerlatticeSignal,
} from '@lib/answerlattice/signalEmitter';
import {
    ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
    answerlatticePublicApiError,
    authenticateAnswerlatticePublicApi,
    buildAnswerlatticePublicApiResponseHeaders,
} from '@lib/answerlattice/publicApi';
import {
    ANSWERLATTICE_PUBLIC_SIGNAL_TYPES,
    sanitizeAnswerlatticePublicSignalMetadata,
} from '@lib/answerlattice/publicApiContracts';
import { normalizeAnswerlatticeEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { AnswerlatticeSignalType } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES = 32 * 1024;
const PUBLIC_SIGNAL_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,179}$/;

const PublicSignalSchema = z.object({
    type: z.enum(ANSWERLATTICE_PUBLIC_SIGNAL_TYPES),
    entityId: z.string().trim().min(1).max(180)
        .refine((value) => normalizeAnswerlatticeEntityId(value) === value, 'Invalid entity ID')
        .optional(),
    externalId: z.string().trim().regex(PUBLIC_SIGNAL_IDEMPOTENCY_KEY_PATTERN).optional(),
    metadata: z.record(z.unknown()).optional(),
}).strict();

export async function POST(request: NextRequest) {
    const auth = await authenticateAnswerlatticePublicApi(request, 'POST /api/answerlattice/public/v1/signals', 'signals:write');
    if (auth.ok === false) return auth.response;

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
        return answerlatticePublicApiError('SIGNAL_MUTATION_DISABLED', 'Signal ingestion is not enabled for this workspace', 503);
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid request body',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return answerlatticePublicApiError(
                bodyResult.response.status === 413 ? 'REQUEST_BODY_TOO_LARGE' : 'INVALID_INPUT',
                bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid request body',
                bodyResult.response.status,
            );
        }

        const validation = PublicSignalSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return answerlatticePublicApiError('INVALID_INPUT', 'Invalid request body', 400);
        }

        const body = validation.data;
        const bodyIdempotencyKey = body.externalId || '';
        const headerIdempotencyKey = request.headers.get('idempotency-key')?.trim() || '';
        if (
            bodyIdempotencyKey
            && headerIdempotencyKey
            && bodyIdempotencyKey !== headerIdempotencyKey
        ) {
            return answerlatticePublicApiError(
                'IDEMPOTENCY_KEY_CONFLICT',
                'externalId and Idempotency-Key must match when both are provided',
                409,
            );
        }
        const idempotencyKey = bodyIdempotencyKey || headerIdempotencyKey;
        if (!PUBLIC_SIGNAL_IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
            return answerlatticePublicApiError('IDEMPOTENCY_KEY_REQUIRED', 'Provide a valid externalId or Idempotency-Key', 400);
        }
        const persisted = await emitAnswerlatticeSignal({
            type: body.type as AnswerlatticeSignalType,
            tId: auth.context.tId,
            sId: auth.context.sId,
            entityId: body.entityId,
            failureMode: 'throw',
            metadata: {
                ...sanitizeAnswerlatticePublicSignalMetadata(body.metadata),
                externalId: idempotencyKey,
                requestId: idempotencyKey,
                source: 'answerlattice_public_api',
            },
        });
        if (!persisted) {
            return answerlatticePublicApiError('SIGNAL_PERSISTENCE_UNAVAILABLE', 'Signal ingestion temporarily unavailable', 503);
        }

        return NextResponse.json({
            schemaVersion: ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
            accepted: true,
        }, {
            status: 202,
            headers: buildAnswerlatticePublicApiResponseHeaders(),
        });
    } catch (error) {
        if (error instanceof AnswerlatticeSignalReplayConflictError) {
            return answerlatticePublicApiError(
                'IDEMPOTENCY_REPLAY_CONFLICT',
                'This idempotency key was already used with different signal content',
                409,
            );
        }
        logRuntimeFailure('answerlattice_public_signal_ingestion_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', auth.context.tId),
            ...getBoundedRuntimeStringContext('storeId', auth.context.sId),
        });
        return answerlatticePublicApiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
