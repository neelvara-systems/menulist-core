export const dynamic = 'force-dynamic';

/**
 * Answerlattice Public Entity Registry API
 *
 * Read-only entity registry for external systems that need stable ontology IDs.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { FEATURE_FLAGS } from '@config/features';
import {
    getAnswerlatticeContextBundleManifestServer,
    loadAnswerlatticeBundleObjectServer,
} from '@lib/answerlattice/contextBundleBuilderServer';
import { getAnswerlatticeBundleRefPath } from '@lib/answerlattice/compiledContext';
import {
    ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
    answerlatticePublicApiError,
    authenticateAnswerlatticePublicApi,
    buildAnswerlatticePublicApiResponseHeaders,
    toIsoTimestamp,
} from '@lib/answerlattice/publicApi';
import {
    ANSWERLATTICE_PUBLIC_ENTITY_STATUSES,
    buildAnswerlatticePublicEntityQueryPredicates,
} from '@lib/answerlattice/publicApiContracts';
import { generateETag } from '@lib/publicApi/auth';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { parseAnswerlatticeRetrievalEntity } from '@lib/answerlattice/retrievalContracts';
import { ANSWERLATTICE_ENTITY_STATUS, ANSWERLATTICE_ENTITY_TYPES } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EntityQuerySchema = z.object({
    type: z.enum(Object.values(ANSWERLATTICE_ENTITY_TYPES) as [string, ...string[]]).optional(),
    status: z.enum(ANSWERLATTICE_PUBLIC_ENTITY_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(100),
}).strict();

const CompiledEntitySchema = z.object({
    id: z.string().trim().min(1).max(180),
    type: z.enum(Object.values(ANSWERLATTICE_ENTITY_TYPES) as [string, ...string[]]),
    name: z.string().trim().min(1).max(240),
    slug: z.string().trim().min(1).max(240),
    description: z.string().max(8_000).optional().default(''),
    status: z.enum(Object.values(ANSWERLATTICE_ENTITY_STATUS) as [string, ...string[]]),
    aliases: z.array(z.string().trim().min(1).max(180)).max(20).optional().default([]),
    currentVersion: z.number().int().positive().max(999_999_999).nullable().optional().default(null),
    modifiedOn: z.string().datetime().nullable().optional().default(null),
}).strip();

type BundledEntitiesParams = {
    tId: number;
    sId: number;
    type?: string;
    status?: string;
    limit: number;
};

function getAnswerlatticeAdminDb() {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
}

const getEntityRegistryLogContext = (params: Pick<BundledEntitiesParams, 'tId' | 'sId'>) => ({
    ...getBoundedRuntimeStringContext('tenantId', params.tId),
    ...getBoundedRuntimeStringContext('storeId', params.sId),
});

const sortPublicEntities = <T extends { id: string; slug: string; type: string }>(entities: T[]): T[] => (
    [...entities].sort((left, right) => (
        left.type.localeCompare(right.type)
        || left.slug.localeCompare(right.slug)
        || left.id.localeCompare(right.id)
    ))
);

async function getEntityBundleManifest(params: BundledEntitiesParams) {
    try {
        return await getAnswerlatticeContextBundleManifestServer(params.tId, params.sId);
    } catch (error) {
        logRuntimeFailure('answerlattice_public_entities_bundle_manifest_load_failed', error, getEntityRegistryLogContext(params));
        return null;
    }
}

async function loadEntityBundleObject(path: string, params: BundledEntitiesParams) {
    try {
        return await loadAnswerlatticeBundleObjectServer<{ entities?: unknown[] }>(path);
    } catch (error) {
        logRuntimeFailure('answerlattice_public_entities_bundle_object_load_failed', error, getEntityRegistryLogContext(params));
        return null;
    }
}

async function loadBundledEntities(params: BundledEntitiesParams) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API_BUNDLE_READS) {
        return null;
    }
    const manifest = await getEntityBundleManifest(params);
    if (!manifest || manifest.status !== 'ready') return null;
    const path = getAnswerlatticeBundleRefPath(
        manifest,
        'private:mcp/entity-index.json',
        params.tId,
        params.sId,
    );
    if (!path) return null;
    const bundle = await loadEntityBundleObject(path, params);
    if (!bundle || !Array.isArray(bundle.entities)) return null;

    const visibleStatuses = params.status ? new Set([params.status]) : new Set(['active', 'beta']);
    const matchingEntities = sortPublicEntities(bundle.entities
        .flatMap((entity) => {
            const parsed = CompiledEntitySchema.safeParse(entity);
            return parsed.success ? [parsed.data] : [];
        })
        .filter((entity) => (!params.type || entity.type === params.type) && visibleStatuses.has(entity.status))
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
        })));
    return {
        entities: matchingEntities.slice(0, params.limit),
        truncated: matchingEntities.length > params.limit,
    };
}

export async function GET(request: NextRequest) {
    const auth = await authenticateAnswerlatticePublicApi(request, 'GET /api/answerlattice/public/v1/entities');
    if (auth.ok === false) return auth.response;

    try {
        const params = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validation = EntityQuerySchema.safeParse(params);
        if (!validation.success) {
            return answerlatticePublicApiError('INVALID_INPUT', 'Invalid query parameters', 400);
        }

        const { type, status, limit } = validation.data;
        const bundledEntities = await loadBundledEntities({
            tId: auth.context.tId,
            sId: auth.context.sId,
            type,
            status,
            limit,
        });
        const resolvedPage = bundledEntities || (await (async () => {
            const scanLimit = Math.min(Math.max(limit * 2, limit + 1), 201);
            let query = getAnswerlatticeAdminDb()
                .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', auth.context.tId)
                .where('sId', '==', auth.context.sId);
            for (const predicate of buildAnswerlatticePublicEntityQueryPredicates(type, status)) {
                query = query.where(predicate.field, predicate.operator, predicate.value);
            }
            const snapshot = await query.limit(scanLimit).get();

            const visibleStatuses = status ? new Set([status]) : new Set(['active', 'beta']);
            const matchingEntities = sortPublicEntities(snapshot.docs
                .flatMap((doc) => {
                    try {
                        return [parseAnswerlatticeRetrievalEntity(
                            { ...doc.data(), id: doc.id },
                            { tId: auth.context.tId, sId: auth.context.sId },
                        )];
                    } catch {
                        return [];
                    }
                })
                .filter((entity) => (!type || entity.type === type) && visibleStatuses.has(entity.status))
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
                })));
            return {
                entities: matchingEntities.slice(0, limit),
                truncated: matchingEntities.length > limit || snapshot.size === scanLimit,
            };
        })());

        const response = {
            schemaVersion: ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            source: bundledEntities ? 'compiled_bundle' : 'firestore_fallback',
            count: resolvedPage.entities.length,
            truncated: resolvedPage.truncated,
            entities: resolvedPage.entities,
        };
        const etag = `"${generateETag({
            schemaVersion: response.schemaVersion,
            source: response.source,
            truncated: response.truncated,
            entities: response.entities,
        })}"`;
        const responseHeaders = {
            ...buildAnswerlatticePublicApiResponseHeaders('private, max-age=60'),
            'ETag': etag,
        };

        if (request.headers.get('if-none-match') === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: responseHeaders,
            });
        }

        return NextResponse.json(response, {
            headers: responseHeaders,
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_entities_registry_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', auth.context.tId),
            ...getBoundedRuntimeStringContext('storeId', auth.context.sId),
        });
        return answerlatticePublicApiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
