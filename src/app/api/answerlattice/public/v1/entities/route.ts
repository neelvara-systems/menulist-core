export const dynamic = 'force-dynamic';

/**
 * Answerlattice Public Entity Registry API
 *
 * Read-only entity registry for external systems that need stable ontology IDs.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { FEATURE_FLAGS } from '@config/features';
import {
    getAnswerlatticeContextBundleManifestServer,
    loadAnswerlatticeBundleObjectServer,
} from '@lib/answerlattice/contextBundleBuilderServer';
import { ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION, authenticateAnswerlatticePublicApi, toIsoTimestamp } from '@lib/answerlattice/publicApi';
import { apiError, generateETag } from '@lib/publicApi/auth';
import { secureError } from '@lib/security/secureLogger';
import { ANSWERLATTICE_ENTITY_STATUS, ANSWERLATTICE_ENTITY_TYPES } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EntityQuerySchema = z.object({
    type: z.enum(Object.values(ANSWERLATTICE_ENTITY_TYPES) as [string, ...string[]]).optional(),
    status: z.enum(Object.values(ANSWERLATTICE_ENTITY_STATUS) as [string, ...string[]]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

function getAnswerlatticeAdminDb() {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
}

async function loadBundledEntities(params: {
    tId: number;
    sId: number;
    type?: string;
    status?: string;
    limit: number;
}) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API_BUNDLE_READS) {
        return null;
    }
    const manifest = await getAnswerlatticeContextBundleManifestServer(params.tId, params.sId).catch(() => null);
    if (!manifest || manifest.status !== 'ready') return null;
    const ref = manifest.bundles?.['private:mcp/entity-index.json'];
    if (!ref?.path) return null;
    const bundle = await loadAnswerlatticeBundleObjectServer<{ entities?: any[] }>(ref.path).catch(() => null);
    if (!bundle || !Array.isArray(bundle.entities)) return null;

    const visibleStatuses = params.status ? new Set([params.status]) : new Set(['active', 'beta']);
    return bundle.entities
        .filter((entity) => (!params.type || entity.type === params.type) && visibleStatuses.has(entity.status))
        .slice(0, params.limit)
        .map((entity) => ({
            id: entity.id,
            type: entity.type,
            name: entity.name,
            slug: entity.slug,
            description: entity.description || '',
            status: entity.status,
            aliases: Array.isArray(entity.aliases) ? entity.aliases.slice(0, 20) : [],
            currentVersion: entity.currentVersion ?? null,
            modifiedOn: entity.modifiedOn || null,
        }));
}

export async function GET(request: NextRequest) {
    const auth = await authenticateAnswerlatticePublicApi(request, 'GET /api/answerlattice/public/v1/entities');
    if (auth.ok === false) return auth.response;

    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validation = EntityQuerySchema.safeParse(params);
        if (!validation.success) {
            return apiError('INVALID_INPUT', 'Invalid query parameters', 400);
        }

        const { type, status, limit } = validation.data;
        const bundledEntities = await loadBundledEntities({
            tId: auth.context.tId,
            sId: auth.context.sId,
            type,
            status,
            limit,
        });
        const resolvedEntities = bundledEntities || (await (async () => {
            const snapshot = await getAnswerlatticeAdminDb()
                .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
                .where('tId', '==', auth.context.tId)
                .where('sId', '==', auth.context.sId)
                .limit(Math.min(limit * 2, 200))
                .get();

            const visibleStatuses = status ? new Set([status]) : new Set(['active', 'beta']);
            return snapshot.docs
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
        })());

        const response = {
            schemaVersion: ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            source: bundledEntities ? 'compiled_bundle' : 'firestore_fallback',
            count: resolvedEntities.length,
            entities: resolvedEntities,
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
        secureError('[Answerlattice Public API] Entity registry failed', error as Error, {
            tId: auth.context.tId,
            sId: auth.context.sId,
        });
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
