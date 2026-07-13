/** Answerlattice product-ontology DAL. Reads are scoped client queries; writes are server-owned. */

import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import {
    normalizeStoredAnswerlatticeEntity,
    normalizeStoredAnswerlatticeEntityRelation,
    normalizeStoredAnswerlatticeEntitySearchIndex,
    type AnswerlatticeOntologyEntityChanges,
} from '@lib/answerlattice/ontologyContracts';
import { runAnswerlatticeOntologyAction } from '@lib/answerlattice/ontologyClient';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import {
    normalizeAnswerlatticeEntityRelationId,
    normalizeAnswerlatticeResolvedEntityId,
} from '@lib/answerlattice/governanceIdBoundary';
import { runAnswerlatticeGovernanceAction } from '@lib/answerlattice/governanceClient';
import { createRuntimeId } from '@lib/runtime/randomId';
import type {
    AnswerlatticeEntity,
    AnswerlatticeEntityRelation,
    AnswerlatticeEntitySearchIndex,
    AnswerlatticeEntityType,
} from '@type/answerlattice';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

const ENTITY_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITIES;
const RELATION_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS;
const SEARCH_INDEX_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX;

const getActiveScope = async (expected?: { tId?: unknown; sId?: unknown }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('Answerlattice workspace scope is required');
    if (expected?.tId !== undefined && expected.tId !== scope.tenantId) throw new Error('Answerlattice tenant scope mismatch');
    if (expected?.sId !== undefined && expected.sId !== scope.storeId) throw new Error('Answerlattice workspace scope mismatch');
    return { session, tId: scope.tenantId, sId: scope.storeId };
};

const getEntityDocRef = (entityId: string) => doc(answerlatticeFirebaseClient, ENTITY_COLLECTION, entityId);

export const getEntities = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, ENTITY_COLLECTION),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            limit(500),
        ));
        const entities = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntity(document.data(), document.id));
        if (entities.some((entity) => !entity)) throw new Error('Invalid persisted Answerlattice entity');
        return entities as AnswerlatticeEntity[];
    },
    { tId, sId },
    'getEntities',
);

export const getEntitiesByType = async (tId: number, sId: number, type: string) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const allowedTypes = new Set<AnswerlatticeEntityType>(['feature', 'plan', 'role', 'workflow', 'state', 'integration', 'error']);
        if (!allowedTypes.has(type as AnswerlatticeEntityType)) return [];
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, ENTITY_COLLECTION),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            where('type', '==', type),
            limit(500),
        ));
        const entities = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntity(document.data(), document.id));
        if (entities.some((entity) => !entity)) throw new Error('Invalid persisted Answerlattice entity');
        return entities as AnswerlatticeEntity[];
    },
    { tId, sId, type },
    'getEntitiesByType',
);

export const getEntityById = async (entityId: string) => apiCallComposer(
    async () => {
        const scope = await getActiveScope();
        const normalized = normalizeAnswerlatticeResolvedEntityId(entityId);
        if (!normalized) return null;
        const snapshot = await getDoc(getEntityDocRef(normalized));
        if (!snapshot.exists()) return null;
        const entity = normalizeStoredAnswerlatticeEntity(snapshot.data(), snapshot.id);
        return entity && entity.tId === scope.tId && entity.sId === scope.sId ? entity : null;
    },
    { entityId },
    'getEntityById',
);

export const addEntity = async (data: Omit<AnswerlatticeEntity, 'id'>) => apiCallComposer(
    async () => {
        await getActiveScope({ tId: data.tId, sId: data.sId });
        const result = await runAnswerlatticeOntologyAction({
            action: 'create_entity',
            entity: {
                type: data.type,
                name: data.name,
                slug: data.slug,
                description: data.description,
                status: data.status === 'beta' ? 'beta' : 'active',
                ...(data.aliases ? { aliases: data.aliases } : {}),
                currentVersion: data.currentVersion,
            },
        }, `create_entity:${data.slug}`);
        return result.entity || null;
    },
    { hasEntity: Boolean(data), tId: data.tId, sId: data.sId },
    'addEntity',
);

export const updateEntity = async (data: Partial<AnswerlatticeEntity> & { id: string }) => apiCallComposer(
    async () => {
        const normalized = normalizeAnswerlatticeResolvedEntityId(data.id);
        if (!normalized || data.type !== undefined || data.tId !== undefined || data.sId !== undefined || data.pId !== undefined) {
            throw new Error('Invalid entity update');
        }
        await getActiveScope();
        const changes = Object.fromEntries(Object.entries({
            name: data.name,
            slug: data.slug,
            description: data.description,
            status: data.status === 'active' || data.status === 'beta' ? data.status : undefined,
            aliases: data.aliases,
            currentVersion: data.currentVersion,
        }).filter(([, value]) => value !== undefined)) as AnswerlatticeOntologyEntityChanges;
        const result = await runAnswerlatticeOntologyAction({
            action: 'update_entity',
            entityId: normalized,
            changes,
        }, `update_entity:${normalized}`);
        return result.entity || null;
    },
    { entityId: data.id, fields: Object.keys(data).filter((key) => key !== 'id') },
    'updateEntity',
);

export const deprecateEntity = async (entityId: string) => apiCallComposer(
    async () => {
        await getActiveScope();
        const normalized = normalizeAnswerlatticeResolvedEntityId(entityId);
        if (!normalized) throw new Error('Invalid entity ID');
        const result = await runAnswerlatticeOntologyAction({
            action: 'deprecate_entity',
            entityId: normalized,
        }, `deprecate_entity:${normalized}`);
        return result.entity || null;
    },
    { entityId },
    'deprecateEntity',
);

export const getEntityRelations = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, RELATION_COLLECTION),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            limit(500),
        ));
        const relations = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntityRelation(document.data(), document.id));
        if (relations.some((relation) => !relation)) throw new Error('Invalid persisted Answerlattice entity relation');
        return relations as AnswerlatticeEntityRelation[];
    },
    { tId, sId },
    'getEntityRelations',
);

export const getRelationsForEntity = async (tId: number, sId: number, entityId: string) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const normalized = normalizeAnswerlatticeResolvedEntityId(entityId);
        if (!normalized) return [];
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, RELATION_COLLECTION),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            where('fromEntityId', '==', normalized),
            limit(20),
        ));
        const relations = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntityRelation(document.data(), document.id));
        if (relations.some((relation) => !relation)) throw new Error('Invalid persisted Answerlattice entity relation');
        return relations as AnswerlatticeEntityRelation[];
    },
    { tId, sId, entityId },
    'getRelationsForEntity',
);

export const addEntityRelation = async (data: Omit<AnswerlatticeEntityRelation, 'id'>) => apiCallComposer(
    async () => {
        await getActiveScope({ tId: data.tId, sId: data.sId });
        const result = await runAnswerlatticeOntologyAction({
            action: 'create_relation',
            fromEntityId: data.fromEntityId,
            toEntityId: data.toEntityId,
            relationType: data.relationType,
        }, `create_relation:${data.fromEntityId}:${data.toEntityId}:${data.relationType}`);
        return result.relation || null;
    },
    { tId: data.tId, sId: data.sId, fromEntityId: data.fromEntityId, toEntityId: data.toEntityId },
    'addEntityRelation',
);

export const deleteEntityRelation = async (relationId: string) => apiCallComposer(
    async () => {
        await getActiveScope();
        const normalized = normalizeAnswerlatticeEntityRelationId(relationId);
        if (!normalized) throw new Error('Invalid relation ID');
        return runAnswerlatticeOntologyAction({
            action: 'delete_relation',
            relationId: normalized,
        }, `delete_relation:${normalized}`);
    },
    { relationId },
    'deleteEntityRelation',
);

export const getEntitySearchIndex = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, SEARCH_INDEX_COLLECTION),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            limit(500),
        ));
        const entries = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntitySearchIndex(document.data(), document.id));
        if (entries.some((entry) => !entry)) throw new Error('Invalid persisted Answerlattice entity search index');
        return entries as AnswerlatticeEntitySearchIndex[];
    },
    { tId, sId },
    'getEntitySearchIndex',
);

export const upsertEntitySearchIndex = async (data: Omit<AnswerlatticeEntitySearchIndex, 'id'> & { id?: string }) => apiCallComposer(
    async () => {
        await getActiveScope({ tId: data.tId, sId: data.sId });
        const result = await runAnswerlatticeOntologyAction({
            action: 'rebuild_search_index',
            entityId: data.entityId,
            weight: data.weight,
        }, `rebuild_search_index:${data.entityId}`);
        return result.searchIndex || null;
    },
    { tId: data.tId, sId: data.sId, entityId: data.entityId },
    'upsertEntitySearchIndex',
);

export const syncAliasesToSearchIndex = async (entityId: string, _aliases: string[], tId: number, sId: number) => apiCallComposer(
    async () => {
        await getActiveScope({ tId, sId });
        const result = await runAnswerlatticeOntologyAction({
            action: 'rebuild_search_index',
            entityId,
            weight: 1,
        }, `rebuild_search_index:${entityId}`);
        return result.searchIndex || null;
    },
    { entityId, tId, sId },
    'syncAliasesToSearchIndex',
);

export const mergeEntities = async (survivorId: string, mergedId: string, tId: number, sId: number) => apiCallComposer(
    async () => {
        await getActiveScope({ tId, sId });
        const normalizedSurvivor = normalizeAnswerlatticeResolvedEntityId(survivorId);
        const normalizedMerged = normalizeAnswerlatticeResolvedEntityId(mergedId);
        if (!normalizedSurvivor || !normalizedMerged) throw new Error('Invalid entity ID');
        return runAnswerlatticeGovernanceAction({
            action: 'merge_entities',
            requestId: createRuntimeId('al_merge'),
            survivorId: normalizedSurvivor,
            mergedId: normalizedMerged,
        });
    },
    { survivorId, mergedId, tId, sId },
    'mergeEntities',
);
