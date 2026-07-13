export const dynamic = 'force-dynamic';

/**
 * Answerlattice Public Signal Ingestion API
 *
 * Ingests structured support/friction signals from external SaaS systems.
 * Signals feed Answerlattice mutation governance and never mutate canonical answers directly.
 */

import { FEATURE_FLAGS } from '@config/features';
import { emitAnswerlatticeSignal } from '@lib/answerlattice/signalEmitter';
import { ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION, authenticateAnswerlatticePublicApi } from '@lib/answerlattice/publicApi';
import { apiError } from '@lib/publicApi/auth';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { ANSWERLATTICE_SIGNAL_TYPE, AnswerlatticeSignalType } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES = 32 * 1024;

const PublicSignalSchema = z.object({
    type: z.enum(Object.values(ANSWERLATTICE_SIGNAL_TYPE) as [string, ...string[]]),
    entityId: z.string().trim().min(1).max(180).optional(),
    externalId: z.string().trim().min(1).max(180).optional(),
    metadata: z.record(z.unknown()).optional(),
}).strict();

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, any> {
    if (!metadata) return {};

    const sanitized: Record<string, any> = {};
    const entries = Object.entries(metadata).slice(0, 20);
    for (const [key, value] of entries) {
        const safeKey = key.trim().replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60);
        if (!safeKey) continue;

        if (typeof value === 'string') {
            sanitized[safeKey] = value.trim().slice(0, 500);
        } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
            sanitized[safeKey] = value;
        } else if (Array.isArray(value)) {
            sanitized[safeKey] = value
                .filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
                .slice(0, 20)
                .map((item) => (typeof item === 'string' ? item.slice(0, 180) : item));
        }
    }

    return sanitized;
}

export async function POST(request: NextRequest) {
    const auth = await authenticateAnswerlatticePublicApi(request, 'POST /api/answerlattice/public/v1/signals', 'signals:write');
    if (auth.ok === false) return auth.response;

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
        return apiError('SIGNAL_MUTATION_DISABLED', 'Signal ingestion is not enabled for this workspace', 503);
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid request body',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return apiError(
                bodyResult.response.status === 413 ? 'REQUEST_BODY_TOO_LARGE' : 'INVALID_INPUT',
                bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid request body',
                bodyResult.response.status,
            );
        }

        const validation = PublicSignalSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return apiError('INVALID_INPUT', 'Invalid request body', 400);
        }

        const body = validation.data;
        const idempotencyKey = (body.externalId || request.headers.get('idempotency-key') || '').trim();
        if (!idempotencyKey || idempotencyKey.length > 180) {
            return apiError('IDEMPOTENCY_KEY_REQUIRED', 'Provide externalId or Idempotency-Key', 400);
        }
        const persisted = await emitAnswerlatticeSignal({
            type: body.type as AnswerlatticeSignalType,
            tId: auth.context.tId,
            sId: auth.context.sId,
            entityId: body.entityId,
            metadata: {
                ...sanitizeMetadata(body.metadata),
                externalId: idempotencyKey,
                requestId: idempotencyKey,
                source: 'answerlattice_public_api',
            },
        });
        if (!persisted) {
            return apiError('SIGNAL_PERSISTENCE_UNAVAILABLE', 'Signal ingestion temporarily unavailable', 503);
        }

        return NextResponse.json({
            schemaVersion: ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
            accepted: true,
        }, { status: 202 });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_signal_ingestion_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', auth.context.tId),
            ...getBoundedRuntimeStringContext('storeId', auth.context.sId),
        });
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
