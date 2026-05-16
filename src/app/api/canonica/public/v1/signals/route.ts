export const dynamic = 'force-dynamic';

/**
 * Canonica Public Signal Ingestion API
 *
 * Ingests structured support/friction signals from external SaaS systems.
 * Signals feed Canonica mutation governance and never mutate canonical answers directly.
 */

import { FEATURE_FLAGS } from '@config/features';
import { emitCanonicaSignal } from '@lib/canonica/signalEmitter';
import { CANONICA_PUBLIC_API_SCHEMA_VERSION, authenticateCanonicaPublicApi } from '@lib/canonica/publicApi';
import { apiError } from '@lib/publicApi/auth';
import { secureError } from '@lib/security/secureLogger';
import { CANONICA_SIGNAL_TYPE, CanonicaSignalType } from '@type/canonica';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PublicSignalSchema = z.object({
    type: z.enum(Object.values(CANONICA_SIGNAL_TYPE) as [string, ...string[]]),
    entityId: z.string().trim().min(1).max(180).optional(),
    externalId: z.string().trim().min(1).max(180).optional(),
    metadata: z.record(z.unknown()).optional(),
});

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
    const auth = await authenticateCanonicaPublicApi(request, 'POST /api/canonica/public/v1/signals');
    if (auth.ok === false) return auth.response;

    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) {
        return apiError('SIGNAL_MUTATION_DISABLED', 'Signal ingestion is not enabled for this workspace', 503);
    }

    try {
        const validation = PublicSignalSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return apiError('INVALID_INPUT', 'Invalid request body', 400);
        }

        const body = validation.data;
        await emitCanonicaSignal({
            type: body.type as CanonicaSignalType,
            tId: auth.context.tId,
            sId: auth.context.sId,
            entityId: body.entityId,
            metadata: {
                ...sanitizeMetadata(body.metadata),
                externalId: body.externalId || null,
                source: 'canonica_public_api',
            },
        });

        return NextResponse.json({
            schemaVersion: CANONICA_PUBLIC_API_SCHEMA_VERSION,
            accepted: true,
        }, { status: 202 });
    } catch (error) {
        secureError('[Canonica Public API] Signal ingestion failed', error as Error, {
            tId: auth.context.tId,
            sId: auth.context.sId,
        });
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
