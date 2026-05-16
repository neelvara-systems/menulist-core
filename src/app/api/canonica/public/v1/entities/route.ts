export const dynamic = 'force-dynamic';

/**
 * Canonica Public Entity Registry API
 *
 * Read-only entity registry for external systems that need stable ontology IDs.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { CANONICA_PUBLIC_API_SCHEMA_VERSION, authenticateCanonicaPublicApi, toIsoTimestamp } from '@lib/canonica/publicApi';
import { apiError, generateETag } from '@lib/publicApi/auth';
import { secureError } from '@lib/security/secureLogger';
import { CANONICA_ENTITY_STATUS, CANONICA_ENTITY_TYPES } from '@type/canonica';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EntityQuerySchema = z.object({
    type: z.enum(Object.values(CANONICA_ENTITY_TYPES) as [string, ...string[]]).optional(),
    status: z.enum(Object.values(CANONICA_ENTITY_STATUS) as [string, ...string[]]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

function getCanonicaAdminDb() {
    if (!canonicaFirestoreAdmin || typeof canonicaFirestoreAdmin.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
}

export async function GET(request: NextRequest) {
    const auth = await authenticateCanonicaPublicApi(request, 'GET /api/canonica/public/v1/entities');
    if (auth.ok === false) return auth.response;

    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validation = EntityQuerySchema.safeParse(params);
        if (!validation.success) {
            return apiError('INVALID_INPUT', 'Invalid query parameters', 400);
        }

        const { type, status, limit } = validation.data;
        const snapshot = await getCanonicaAdminDb()
            .collection(DB_COLLECTIONS.CANONICA_ENTITIES)
            .where('tId', '==', auth.context.tId)
            .where('sId', '==', auth.context.sId)
            .limit(Math.min(limit * 2, 200))
            .get();

        const visibleStatuses = status ? new Set([status]) : new Set(['active', 'beta']);
        const entities = snapshot.docs
            .map((doc) => ({ ...doc.data(), id: doc.id } as any))
            .filter((entity) => (!type || entity.type === type) && visibleStatuses.has(entity.status))
            .slice(0, limit)
            .map((entity) => ({
                id: entity.id,
                type: entity.type,
                name: entity.name,
                slug: entity.slug,
                description: entity.description || '',
                status: entity.status,
                aliases: Array.isArray(entity.aliases) ? entity.aliases.slice(0, 20) : [],
                currentVersion: entity.currentVersion ?? null,
                modifiedOn: toIsoTimestamp(entity.modifiedOn),
            }));

        const response = {
            schemaVersion: CANONICA_PUBLIC_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            count: entities.length,
            entities,
        };
        const etag = `"${generateETag(response)}"`;

        if (request.headers.get('if-none-match') === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    'ETag': etag,
                    'Cache-Control': 'private, max-age=60',
                },
            });
        }

        return NextResponse.json(response, {
            headers: {
                'ETag': etag,
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (error) {
        secureError('[Canonica Public API] Entity registry failed', error as Error, {
            tId: auth.context.tId,
            sId: auth.context.sId,
        });
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
