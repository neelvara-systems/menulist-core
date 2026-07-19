import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { buildAnswerlatticeEntityPrefixTokens } from './entitySearchTokens';
import { ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT } from './faqContent';
import { normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';
import { ANSWERLATTICE_PRODUCT_SURFACE_LIMIT } from './productSurfaceContent';
import { answerlatticeTokenize } from './tokenizer';
import {
    ANSWERLATTICE_ONTOLOGY_CONSTRAINTS,
    type AnswerlatticeEntity,
    type AnswerlatticeEntityCandidate,
    type AnswerlatticeEntityRelation,
    type AnswerlatticeEntitySearchIndex,
} from '@type/answerlattice';
import { FieldValue } from 'firebase-admin/firestore';
import type { Transaction } from 'firebase-admin/firestore';
import type { AnswerlatticeAccessContext } from './accessControl';
import {
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
} from './compiledContext';
import type {
    AnswerlatticeOntologyAction,
    AnswerlatticeOntologyActionResult,
} from './ontologyContracts';
import {
    AnswerlatticeStoredEntityCandidateSchema,
    AnswerlatticeStoredEntityRelationSchema,
    AnswerlatticeStoredEntitySchema,
} from './ontologyContracts';
import { upsertAnswerlatticeTenantSummaryAdmin } from './tenantSummaryAdmin';

const ENTITY_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITIES;
const RELATION_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS;
const SEARCH_INDEX_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX;
const CANDIDATE_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES;
const SLUG_INDEX_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SLUG_INDEX;
const AUDIT_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;
const ONTOLOGY_COUNTER_SCHEMA_VERSION = 1;

type Scope = { tId: number; sId: number };
type Actor = { id: string; label: string };
type OntologyCounter = {
    entityCount: number;
    pendingCandidateCount: number;
    relationCount: number;
    relationCounts: Record<string, number>;
    relationCountAccurate: boolean;
};

export class AnswerlatticeOntologyError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        public readonly publicMessage: string,
    ) {
        super(publicMessage);
        this.name = 'AnswerlatticeOntologyError';
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticeOntologyError('ontology_unavailable', 503, 'Product structure is temporarily unavailable.');
    }
    return answerlatticeFirestoreAdmin;
};

const syncTenantSummaryAfterEntityWrite = async (scope: Scope): Promise<void> => {
    await upsertAnswerlatticeTenantSummaryAdmin({
        ...scope,
        source: 'entity_created',
        active: true,
        hasEntities: true,
    });
};

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const canonicalJson = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
};

const getScopeAndActor = (access: AnswerlatticeAccessContext): { scope: Scope; actor: Actor } => {
    const tId = Number(access.scope.tenantId);
    const sId = Number(access.scope.storeId);
    const actorId = String(access.user.id || '').trim();
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0 || !actorId) {
        throw new AnswerlatticeOntologyError('ontology_scope_invalid', 403, 'Product structure access is unavailable.');
    }
    return {
        scope: { tId, sId },
        actor: {
            id: actorId.slice(0, 180),
            label: String(access.user.email || access.user.name || actorId).slice(0, 200),
        },
    };
};

const documentIsInScope = (data: Record<string, unknown>, scope: Scope) => (
    data.pId === PRODUCT_IDS.ANSWERLATTICE
    && data.tId === scope.tId
    && data.sId === scope.sId
);

const getCounterRef = (scope: Scope) => getDb().collection(SUMMARY_COLLECTION)
    .doc(`ontologyCounters_${scope.tId}_${scope.sId}`);

const normalizeCount = (value: unknown, field: string): number => {
    if (!Number.isSafeInteger(value) || Number(value) < 0) {
        throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, `The ${field} counter needs repair before this action can continue.`);
    }
    return Number(value);
};

const normalizeCounter = (value: unknown, scope: Scope): OntologyCounter | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (data.pId !== PRODUCT_IDS.ANSWERLATTICE || data.tId !== scope.tId || data.sId !== scope.sId) return null;
    const relationCountsRaw = data.relationCounts;
    if (!relationCountsRaw || typeof relationCountsRaw !== 'object' || Array.isArray(relationCountsRaw)) return null;
    const relationCounts: Record<string, number> = Object.create(null);
    for (const [entityId, count] of Object.entries(relationCountsRaw as Record<string, unknown>)) {
        relationCounts[entityId] = normalizeCount(count, 'entity relation');
    }
    return {
        entityCount: normalizeCount(data.entityCount, 'entity'),
        pendingCandidateCount: normalizeCount(data.pendingCandidateCount, 'candidate'),
        relationCount: normalizeCount(data.relationCount, 'relation'),
        relationCounts,
        relationCountAccurate: data.relationCountAccurate !== false,
    };
};

const ensureOntologyCounter = async (scope: Scope): Promise<void> => {
    const db = getDb();
    const counterRef = getCounterRef(scope);
    const current = await counterRef.get();
    if (current.exists) {
        const normalized = normalizeCounter(current.data(), scope);
        if (!normalized) {
            throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair before this action can continue.');
        }
        if (normalized.relationCountAccurate) return;
        const relations = await db.collection(RELATION_COLLECTION)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .count()
            .get();
        const relationCount = normalizeCount(relations.data().count, 'relation');
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(counterRef);
            const counter = normalizeCounter(snapshot.data(), scope);
            if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
            if (!counter.relationCountAccurate) {
                transaction.update(counterRef, {
                    relationCount,
                    relationCountAccurate: true,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        });
        return;
    }

    const [entities, pendingCandidates, relations] = await Promise.all([
        db.collection(ENTITY_COLLECTION)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .count()
            .get(),
        db.collection(CANDIDATE_COLLECTION)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('status', '==', 'pending')
            .count()
            .get(),
        db.collection(RELATION_COLLECTION)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .count()
            .get(),
    ]);
    const entityCount = normalizeCount(entities.data().count, 'entity');
    const pendingCandidateCount = normalizeCount(pendingCandidates.data().count, 'candidate');
    const relationCount = normalizeCount(relations.data().count, 'relation');
    if (entityCount > ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITIES_PER_TENANT) {
        throw new AnswerlatticeOntologyError('ontology_entity_limit_exceeded', 409, 'This workspace already exceeds the supported product-entity limit.');
    }

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(counterRef);
        if (snapshot.exists) {
            if (!normalizeCounter(snapshot.data(), scope)) {
                throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair before this action can continue.');
            }
            return;
        }
        transaction.create(counterRef, {
            schemaVersion: ONTOLOGY_COUNTER_SCHEMA_VERSION,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            entityCount,
            pendingCandidateCount,
            relationCount,
            relationCounts: {},
            relationCountsComplete: false,
            relationCountAccurate: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    });
};

const countRelationsForEntity = async (scope: Scope, entityId: string) => {
    const db = getDb();
    const [outgoing, incoming] = await Promise.all([
        db.collection(RELATION_COLLECTION)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('fromEntityId', '==', entityId)
            .count()
            .get(),
        db.collection(RELATION_COLLECTION)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('toEntityId', '==', entityId)
            .count()
            .get(),
    ]);
    return normalizeCount(outgoing.data().count, 'outgoing relation')
        + normalizeCount(incoming.data().count, 'incoming relation');
};

const ensureRelationCounters = async (scope: Scope, entityIds: string[]): Promise<void> => {
    await ensureOntologyCounter(scope);
    const counterRef = getCounterRef(scope);
    const snapshot = await counterRef.get();
    const counter = normalizeCounter(snapshot.data(), scope);
    if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
    const missing = Array.from(new Set(entityIds)).filter((entityId) => counter.relationCounts[entityId] === undefined);
    if (missing.length === 0) return;
    const initialized = Object.fromEntries(await Promise.all(missing.map(async (entityId) => [
        entityId,
        await countRelationsForEntity(scope, entityId),
    ]))) as Record<string, number>;
    await getDb().runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(counterRef);
        const current = normalizeCounter(currentSnapshot.data(), scope);
        if (!current) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
        const next = { ...current.relationCounts };
        let changed = false;
        for (const [entityId, count] of Object.entries(initialized)) {
            if (next[entityId] === undefined) {
                next[entityId] = count;
                changed = true;
            }
        }
        if (changed) transaction.update(counterRef, { relationCounts: next, updatedAt: FieldValue.serverTimestamp() });
    });
};

const buildSearchIndex = (
    entity: Pick<AnswerlatticeEntity, 'id' | 'name' | 'description' | 'aliases'>,
    scope: Scope,
    id: string,
    weight = 1,
): AnswerlatticeEntitySearchIndex => {
    const normalizedTokens = Array.from(new Set([
        ...answerlatticeTokenize(entity.name),
        ...answerlatticeTokenize(entity.description, 4).slice(0, 10),
    ])).slice(0, 80);
    const synonyms = Array.from(new Set((entity.aliases || []).map((alias) => alias.toLowerCase()))).slice(0, 20);
    return {
        id,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        entityId: entity.id,
        canonicalName: entity.name,
        synonyms,
        normalizedTokens,
        prefixTokens: buildAnswerlatticeEntityPrefixTokens({
            canonicalName: entity.name,
            normalizedTokens,
            synonyms,
        }),
        weight,
    };
};

const getSearchIndexId = (scope: Scope, entityId: string) => `entity_index_${sha(`${scope.tId}:${scope.sId}:${entityId}`).slice(0, 32)}`;
const getSlugIndexId = (scope: Scope, slug: string) => `entity_slug_${sha(`${scope.tId}:${scope.sId}:${slug}`).slice(0, 32)}`;
const getOperationId = (scope: Scope, requestId: string) => `ontology_${sha(`${scope.tId}:${scope.sId}:${requestId}`).slice(0, 40)}`;

const addInvalidationWrites = (
    transaction: Transaction,
    scope: Scope,
    source: 'entities' | 'entityRelations',
    reason: string,
    sourceId: string,
) => {
    const db = getDb();
    const now = FieldValue.serverTimestamp();
    transaction.set(db.collection(SUMMARY_COLLECTION).doc(getAnswerlatticeSourceVersionsDocId(scope.tId, scope.sId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        [source]: FieldValue.increment(1),
        updatedAt: now,
        lastReason: reason.slice(0, 80),
        lastSourceId: sourceId.slice(0, 160),
        lastSourceType: source === 'entities' ? ENTITY_COLLECTION : RELATION_COLLECTION,
    }, { merge: true });
    transaction.set(db.collection(SUMMARY_COLLECTION).doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        status: 'stale',
        staleReason: reason.slice(0, 80),
        updatedAt: now,
        lastReason: reason.slice(0, 80),
        lastSourceId: sourceId.slice(0, 160),
    }, { merge: true });
};

const readOperationReplay = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    action: AnswerlatticeOntologyAction,
    scope: Scope,
    fingerprint: string,
): AnswerlatticeOntologyActionResult | null => {
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    if (!documentIsInScope(data, scope)
        || data.action !== `ontology_${action.action}`
        || data.requestFingerprint !== fingerprint
        || !data.result
        || typeof data.result !== 'object') {
        throw new AnswerlatticeOntologyError('ontology_request_conflict', 409, 'This request identifier was already used with different details.');
    }
    return { ...(data.result as AnswerlatticeOntologyActionResult), replayed: true };
};

const writeOperation = (
    transaction: Transaction,
    ref: FirebaseFirestore.DocumentReference,
    action: AnswerlatticeOntologyAction,
    scope: Scope,
    actor: Actor,
    fingerprint: string,
    result: AnswerlatticeOntologyActionResult,
    entityType: string,
    entityId: string,
) => {
    transaction.create(ref, {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        action: `ontology_${action.action}`,
        entityType,
        entityId,
        previousState: null,
        newState: result,
        result,
        requestId: action.requestId,
        requestFingerprint: fingerprint,
        performedBy: actor.label,
        timestamp: FieldValue.serverTimestamp(),
        createdOn: FieldValue.serverTimestamp(),
        createdBy: actor.label,
    });
};

const findLegacySlugOwner = async (scope: Scope, slug: string) => {
    const snapshot = await getDb().collection(ENTITY_COLLECTION)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('slug', '==', slug)
        .limit(2)
        .get();
    if (snapshot.size > 1) {
        throw new AnswerlatticeOntologyError('ontology_slug_duplicate_legacy', 409, 'Duplicate product identifiers must be merged before continuing.');
    }
    return snapshot.docs[0]?.id || null;
};

const findSearchIndexRef = async (scope: Scope, entityId: string) => {
    const db = getDb();
    const snapshot = await db.collection(SEARCH_INDEX_COLLECTION)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('entityId', '==', entityId)
        .limit(2)
        .get();
    if (snapshot.size > 1) {
        throw new AnswerlatticeOntologyError('ontology_search_index_duplicate', 409, 'This product entity has duplicate search-index records.');
    }
    return snapshot.docs[0]?.ref || db.collection(SEARCH_INDEX_COLLECTION).doc(getSearchIndexId(scope, entityId));
};

const createEntity = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'create_entity' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    await ensureOntologyCounter(scope);
    const db = getDb();
    const fingerprint = sha(canonicalJson(action));
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const entityId = `entity_${sha(`${scope.tId}:${scope.sId}:${action.requestId}`).slice(0, 32)}`;
    const entityRef = db.collection(ENTITY_COLLECTION).doc(entityId);
    const indexRef = db.collection(SEARCH_INDEX_COLLECTION).doc(getSearchIndexId(scope, entityId));
    const slugRef = db.collection(SLUG_INDEX_COLLECTION).doc(getSlugIndexId(scope, action.entity.slug));
    const counterRef = getCounterRef(scope);
    const legacySlugOwner = await findLegacySlugOwner(scope, action.entity.slug);
    if (legacySlugOwner && legacySlugOwner !== entityId) {
        throw new AnswerlatticeOntologyError('ontology_slug_conflict', 409, 'Another product entity already uses this identifier.');
    }
    const entity: AnswerlatticeEntity = {
        id: entityId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        ...action.entity,
    };
    const searchIndex = buildSearchIndex(entity, scope, indexRef.id);
    const result = await db.runTransaction<AnswerlatticeOntologyActionResult>(async (transaction) => {
        const [operationSnapshot, entitySnapshot, slugSnapshot, counterSnapshot] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(entityRef),
            transaction.get(slugRef),
            transaction.get(counterRef),
        ]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        if (entitySnapshot.exists) throw new AnswerlatticeOntologyError('ontology_entity_conflict', 409, 'This entity request already exists without a valid operation record.');
        if (slugSnapshot.exists && slugSnapshot.data()?.entityId !== entityId) {
            throw new AnswerlatticeOntologyError('ontology_slug_conflict', 409, 'Another product entity already uses this identifier.');
        }
        const counter = normalizeCounter(counterSnapshot.data(), scope);
        if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
        if (counter.entityCount >= ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITIES_PER_TENANT) {
            throw new AnswerlatticeOntologyError('ontology_entity_limit', 409, 'Merge existing entities before adding another product entity.');
        }
        const response: AnswerlatticeOntologyActionResult = {
            success: true,
            action: action.action,
            replayed: false,
            entity,
            searchIndex,
        };
        const now = FieldValue.serverTimestamp();
        transaction.create(entityRef, { ...entity, createdOn: now, modifiedOn: now, createdBy: actor.label, modifiedBy: actor.label, uId: actor.id });
        transaction.create(indexRef, { ...searchIndex, createdOn: now, modifiedOn: now, createdBy: actor.label, modifiedBy: actor.label, uId: actor.id });
        transaction.set(slugRef, { pId: PRODUCT_IDS.ANSWERLATTICE, ...scope, slug: entity.slug, entityId, createdAt: now, updatedAt: now });
        transaction.update(counterRef, { entityCount: counter.entityCount + 1, updatedAt: now });
        addInvalidationWrites(transaction, scope, 'entities', 'entity_create', entityId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entity', entityId);
        return response;
    });
    await syncTenantSummaryAfterEntityWrite(scope);
    return result;
};

const updateEntity = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'update_entity' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    const db = getDb();
    const entityRef = db.collection(ENTITY_COLLECTION).doc(action.entityId);
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const fingerprint = sha(canonicalJson(action));
    const existingEntitySnapshot = await entityRef.get();
    if (!existingEntitySnapshot.exists || !documentIsInScope(existingEntitySnapshot.data() || {}, scope)) {
        throw new AnswerlatticeOntologyError('ontology_entity_not_found', 404, 'Product entity not found.');
    }
    const existingParsed = AnswerlatticeStoredEntitySchema.safeParse({ ...existingEntitySnapshot.data(), id: action.entityId });
    if (!existingParsed.success) throw new AnswerlatticeOntologyError('ontology_entity_invalid', 409, 'This product entity needs repair before it can be changed.');
    const existing = existingParsed.data as AnswerlatticeEntity;
    const expectedUpdateTime = existingEntitySnapshot.updateTime?.toMillis() || null;
    if (existing.status === 'deprecated') throw new AnswerlatticeOntologyError('ontology_entity_deprecated', 409, 'Deprecated entities cannot be edited.');
    const next: AnswerlatticeEntity = { ...existing, ...action.changes, id: action.entityId, pId: PRODUCT_IDS.ANSWERLATTICE };
    const legacySlugOwner = action.changes.slug ? await findLegacySlugOwner(scope, next.slug) : action.entityId;
    if (legacySlugOwner && legacySlugOwner !== action.entityId) {
        throw new AnswerlatticeOntologyError('ontology_slug_conflict', 409, 'Another product entity already uses this identifier.');
    }
    const searchIndexRef = await findSearchIndexRef(scope, action.entityId);
    const searchIndex = buildSearchIndex(next, scope, searchIndexRef.id);
    const oldSlugRef = db.collection(SLUG_INDEX_COLLECTION).doc(getSlugIndexId(scope, existing.slug));
    const newSlugRef = db.collection(SLUG_INDEX_COLLECTION).doc(getSlugIndexId(scope, next.slug));
    return db.runTransaction(async (transaction) => {
        const refs = [operationRef, entityRef, searchIndexRef, oldSlugRef, newSlugRef];
        const [operationSnapshot, currentSnapshot, , oldSlugSnapshot, newSlugSnapshot] = await Promise.all(refs.map((ref) => transaction.get(ref)));
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        if (!currentSnapshot.exists || !documentIsInScope(currentSnapshot.data() || {}, scope)) {
            throw new AnswerlatticeOntologyError('ontology_entity_not_found', 404, 'Product entity not found.');
        }
        const currentParsed = AnswerlatticeStoredEntitySchema.safeParse({ ...currentSnapshot.data(), id: action.entityId });
        if (!currentParsed.success || currentParsed.data.type !== existing.type || currentParsed.data.status === 'deprecated') {
            throw new AnswerlatticeOntologyError('ontology_entity_changed', 409, 'This entity changed while you were editing it. Refresh and try again.');
        }
        if ((currentSnapshot.updateTime?.toMillis() || null) !== expectedUpdateTime) {
            throw new AnswerlatticeOntologyError('ontology_entity_changed', 409, 'This entity changed while you were editing it. Refresh and try again.');
        }
        if (newSlugSnapshot.exists && newSlugSnapshot.data()?.entityId !== action.entityId) {
            throw new AnswerlatticeOntologyError('ontology_slug_conflict', 409, 'Another product entity already uses this identifier.');
        }
        const response: AnswerlatticeOntologyActionResult = { success: true, action: action.action, replayed: false, entity: next, searchIndex };
        const now = FieldValue.serverTimestamp();
        transaction.update(entityRef, { ...action.changes, pId: PRODUCT_IDS.ANSWERLATTICE, modifiedOn: now, modifiedBy: actor.label });
        transaction.set(searchIndexRef, { ...searchIndex, modifiedOn: now, modifiedBy: actor.label }, { merge: true });
        transaction.set(newSlugRef, { pId: PRODUCT_IDS.ANSWERLATTICE, ...scope, slug: next.slug, entityId: action.entityId, updatedAt: now }, { merge: true });
        if (oldSlugRef.path !== newSlugRef.path && oldSlugSnapshot.exists && oldSlugSnapshot.data()?.entityId === action.entityId) {
            transaction.delete(oldSlugRef);
        }
        addInvalidationWrites(transaction, scope, 'entities', 'entity_update', action.entityId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entity', action.entityId);
        return response;
    });
};

const deprecateEntity = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'deprecate_entity' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    const db = getDb();
    const entityRef = db.collection(ENTITY_COLLECTION).doc(action.entityId);
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const fingerprint = sha(canonicalJson(action));
    return db.runTransaction(async (transaction) => {
        const [
            operationSnapshot,
            entitySnapshot,
            activeAnswers,
            linkedArticles,
            tenantFaqs,
            tenantSurfaces,
            outgoing,
            incoming,
        ] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(entityRef),
            transaction.get(db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('status', '==', 'active')
                .where('scope.entityIds', 'array-contains', action.entityId)
                .limit(1)),
            transaction.get(db.collection(DB_COLLECTIONS.KB_ARTICLES)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('entityIds', 'array-contains', action.entityId)
                .limit(1)),
            transaction.get(db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .limit(ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT + 1)),
            transaction.get(db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .limit(ANSWERLATTICE_PRODUCT_SURFACE_LIMIT + 1)),
            transaction.get(db.collection(RELATION_COLLECTION)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('fromEntityId', '==', action.entityId)
                .limit(1)),
            transaction.get(db.collection(RELATION_COLLECTION)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('toEntityId', '==', action.entityId)
                .limit(1)),
        ]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        if (!entitySnapshot.exists || !documentIsInScope(entitySnapshot.data() || {}, scope)) {
            throw new AnswerlatticeOntologyError('ontology_entity_not_found', 404, 'Product entity not found.');
        }
        const parsed = AnswerlatticeStoredEntitySchema.safeParse({ ...entitySnapshot.data(), id: action.entityId });
        if (!parsed.success) throw new AnswerlatticeOntologyError('ontology_entity_invalid', 409, 'This product entity needs repair.');
        if (parsed.data.status === 'deprecated') {
            return { success: true, action: action.action, replayed: true, entity: parsed.data as AnswerlatticeEntity };
        }
        if (tenantFaqs.size > ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT
            || tenantSurfaces.size > ANSWERLATTICE_PRODUCT_SURFACE_LIMIT) {
            throw new AnswerlatticeOntologyError(
                'ontology_dependency_scan_limit',
                409,
                'Product structure dependencies exceed the supported review limit. Contact support for a controlled cleanup.',
            );
        }
        const linkedFaq = tenantFaqs.docs.some((document) => (
            documentIsInScope(document.data(), scope)
            && normalizeAnswerlatticeResolvedEntityIds(document.data().entityIds, 25).includes(action.entityId)
        ));
        const linkedSurface = tenantSurfaces.docs.some((document) => (
            documentIsInScope(document.data(), scope)
            && normalizeAnswerlatticeResolvedEntityIds(document.data().entityIds, 25).includes(action.entityId)
        ));
        if (!activeAnswers.empty) throw new AnswerlatticeOntologyError('ontology_entity_in_use', 409, 'Reassign active approved answers before deprecating this entity.');
        if (!linkedArticles.empty || linkedFaq || linkedSurface) {
            throw new AnswerlatticeOntologyError(
                'ontology_entity_content_dependency',
                409,
                'Reassign linked articles, FAQs, and product surfaces before deprecating this entity.',
            );
        }
        if (!outgoing.empty || !incoming.empty) throw new AnswerlatticeOntologyError('ontology_entity_related', 409, 'Remove this entity’s product relations before deprecating it.');
        const entity = { ...parsed.data, status: 'deprecated' as const, pId: PRODUCT_IDS.ANSWERLATTICE } as AnswerlatticeEntity;
        const response: AnswerlatticeOntologyActionResult = { success: true, action: action.action, replayed: false, entity };
        transaction.update(entityRef, { status: 'deprecated', modifiedOn: FieldValue.serverTimestamp(), modifiedBy: actor.label });
        addInvalidationWrites(transaction, scope, 'entities', 'entity_deprecate', action.entityId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entity', action.entityId);
        return response;
    });
};

const createRelation = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'create_relation' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    await ensureRelationCounters(scope, [action.fromEntityId, action.toEntityId]);
    const db = getDb();
    const fingerprint = sha(canonicalJson(action));
    const relationId = `relation_${sha(`${scope.tId}:${scope.sId}:${action.fromEntityId}:${action.toEntityId}:${action.relationType}`).slice(0, 32)}`;
    const relationRef = db.collection(RELATION_COLLECTION).doc(relationId);
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const counterRef = getCounterRef(scope);
    const relation: AnswerlatticeEntityRelation = {
        id: relationId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        fromEntityId: action.fromEntityId,
        toEntityId: action.toEntityId,
        relationType: action.relationType,
    };
    return db.runTransaction(async (transaction) => {
        const [operationSnapshot, relationSnapshot, fromSnapshot, toSnapshot, counterSnapshot] = await Promise.all([
            transaction.get(operationRef),
            transaction.get(relationRef),
            transaction.get(db.collection(ENTITY_COLLECTION).doc(action.fromEntityId)),
            transaction.get(db.collection(ENTITY_COLLECTION).doc(action.toEntityId)),
            transaction.get(counterRef),
        ]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        if (relationSnapshot.exists) {
            const parsed = AnswerlatticeStoredEntityRelationSchema.safeParse({ ...relationSnapshot.data(), id: relationId });
            if (parsed.success && parsed.data.fromEntityId === action.fromEntityId && parsed.data.toEntityId === action.toEntityId && parsed.data.relationType === action.relationType) {
                return { success: true, action: action.action, replayed: true, relation: parsed.data as AnswerlatticeEntityRelation };
            }
            throw new AnswerlatticeOntologyError('ontology_relation_conflict', 409, 'This relation identifier is already in use.');
        }
        for (const snapshot of [fromSnapshot, toSnapshot]) {
            if (!snapshot.exists || !documentIsInScope(snapshot.data() || {}, scope) || snapshot.data()?.status === 'deprecated') {
                throw new AnswerlatticeOntologyError('ontology_relation_entity_invalid', 409, 'Both relation endpoints must be active entities in this workspace.');
            }
        }
        const counter = normalizeCounter(counterSnapshot.data(), scope);
        if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
        const fromCount = counter.relationCounts[action.fromEntityId];
        const toCount = counter.relationCounts[action.toEntityId];
        if (!Number.isSafeInteger(fromCount) || !Number.isSafeInteger(toCount)) {
            throw new AnswerlatticeOntologyError('ontology_relation_counter_missing', 409, 'Relation counters need repair before this action can continue.');
        }
        if (fromCount >= ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_RELATIONS_PER_ENTITY
            || toCount >= ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_RELATIONS_PER_ENTITY) {
            throw new AnswerlatticeOntologyError('ontology_relation_limit', 409, 'One of these entities already has the maximum supported relations.');
        }
        const response: AnswerlatticeOntologyActionResult = { success: true, action: action.action, replayed: false, relation };
        const now = FieldValue.serverTimestamp();
        transaction.create(relationRef, { ...relation, createdOn: now, modifiedOn: now, createdBy: actor.label, modifiedBy: actor.label, uId: actor.id });
        transaction.update(counterRef, {
            relationCount: counter.relationCount + 1,
            relationCounts: {
                ...counter.relationCounts,
                [action.fromEntityId]: fromCount + 1,
                [action.toEntityId]: toCount + 1,
            },
            updatedAt: now,
        });
        addInvalidationWrites(transaction, scope, 'entityRelations', 'entity_relation_create', relationId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entityRelation', relationId);
        return response;
    });
};

const deleteRelation = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'delete_relation' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    const db = getDb();
    const relationRef = db.collection(RELATION_COLLECTION).doc(action.relationId);
    const initial = await relationRef.get();
    if (!initial.exists) return { success: true, action: action.action, replayed: true };
    const parsedInitial = AnswerlatticeStoredEntityRelationSchema.safeParse({ ...initial.data(), id: action.relationId });
    if (!parsedInitial.success || !documentIsInScope(initial.data() || {}, scope)) {
        throw new AnswerlatticeOntologyError('ontology_relation_not_found', 404, 'Product relation not found.');
    }
    await ensureRelationCounters(scope, [parsedInitial.data.fromEntityId, parsedInitial.data.toEntityId]);
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const counterRef = getCounterRef(scope);
    const fingerprint = sha(canonicalJson(action));
    return db.runTransaction(async (transaction) => {
        const [operationSnapshot, relationSnapshot, counterSnapshot] = await Promise.all([
            transaction.get(operationRef), transaction.get(relationRef), transaction.get(counterRef),
        ]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        if (!relationSnapshot.exists) return { success: true, action: action.action, replayed: true };
        const parsed = AnswerlatticeStoredEntityRelationSchema.safeParse({ ...relationSnapshot.data(), id: action.relationId });
        if (!parsed.success || !documentIsInScope(relationSnapshot.data() || {}, scope)) {
            throw new AnswerlatticeOntologyError('ontology_relation_not_found', 404, 'Product relation not found.');
        }
        const counter = normalizeCounter(counterSnapshot.data(), scope);
        if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
        const fromCount = normalizeCount(counter.relationCounts[parsed.data.fromEntityId], 'entity relation');
        const toCount = normalizeCount(counter.relationCounts[parsed.data.toEntityId], 'entity relation');
        const response: AnswerlatticeOntologyActionResult = { success: true, action: action.action, replayed: false };
        transaction.delete(relationRef);
        transaction.update(counterRef, {
            relationCount: Math.max(0, counter.relationCount - 1),
            relationCounts: {
                ...counter.relationCounts,
                [parsed.data.fromEntityId]: Math.max(0, fromCount - 1),
                [parsed.data.toEntityId]: Math.max(0, toCount - 1),
            },
            updatedAt: FieldValue.serverTimestamp(),
        });
        addInvalidationWrites(transaction, scope, 'entityRelations', 'entity_relation_delete', action.relationId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entityRelation', action.relationId);
        return response;
    });
};

const rebuildSearchIndex = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'rebuild_search_index' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    const db = getDb();
    const entityRef = db.collection(ENTITY_COLLECTION).doc(action.entityId);
    const indexRef = await findSearchIndexRef(scope, action.entityId);
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const fingerprint = sha(canonicalJson(action));
    return db.runTransaction(async (transaction) => {
        const [operationSnapshot, entitySnapshot] = await Promise.all([transaction.get(operationRef), transaction.get(entityRef)]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        const parsed = AnswerlatticeStoredEntitySchema.safeParse({ ...entitySnapshot.data(), id: action.entityId });
        if (!entitySnapshot.exists || !parsed.success || !documentIsInScope(entitySnapshot.data() || {}, scope)) {
            throw new AnswerlatticeOntologyError('ontology_entity_not_found', 404, 'Product entity not found.');
        }
        const searchIndex = buildSearchIndex(parsed.data as AnswerlatticeEntity, scope, indexRef.id, action.weight);
        const response: AnswerlatticeOntologyActionResult = { success: true, action: action.action, replayed: false, searchIndex };
        transaction.set(indexRef, { ...searchIndex, modifiedOn: FieldValue.serverTimestamp(), modifiedBy: actor.label }, { merge: true });
        addInvalidationWrites(transaction, scope, 'entities', 'entity_search_index_rebuild', action.entityId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entitySearchIndex', indexRef.id);
        return response;
    });
};

const reviewCandidate = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'review_candidate' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    await ensureOntologyCounter(scope);
    const db = getDb();
    const candidateRef = db.collection(CANDIDATE_COLLECTION).doc(action.candidateId);
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const counterRef = getCounterRef(scope);
    const fingerprint = sha(canonicalJson(action));
    return db.runTransaction(async (transaction) => {
        const [operationSnapshot, candidateSnapshot, counterSnapshot] = await Promise.all([
            transaction.get(operationRef), transaction.get(candidateRef), transaction.get(counterRef),
        ]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        const parsed = AnswerlatticeStoredEntityCandidateSchema.safeParse({ ...candidateSnapshot.data(), id: action.candidateId });
        if (!candidateSnapshot.exists || !parsed.success || !documentIsInScope(candidateSnapshot.data() || {}, scope)) {
            throw new AnswerlatticeOntologyError('ontology_candidate_not_found', 404, 'Entity candidate not found.');
        }
        if (parsed.data.status !== 'pending') {
            if (parsed.data.status === action.decision) {
                return { success: true, action: action.action, replayed: true, candidateId: action.candidateId, candidateStatus: action.decision };
            }
            throw new AnswerlatticeOntologyError('ontology_candidate_transition_invalid', 409, 'This candidate has already been reviewed.');
        }
        const counter = normalizeCounter(counterSnapshot.data(), scope);
        if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
        const response: AnswerlatticeOntologyActionResult = {
            success: true, action: action.action, replayed: false, candidateId: action.candidateId, candidateStatus: action.decision,
        };
        transaction.update(candidateRef, { status: action.decision, modifiedOn: FieldValue.serverTimestamp(), modifiedBy: actor.label });
        transaction.update(counterRef, { pendingCandidateCount: Math.max(0, counter.pendingCandidateCount - 1), updatedAt: FieldValue.serverTimestamp() });
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entityCandidate', action.candidateId);
        return response;
    });
};

const promoteCandidate = async (
    action: Extract<AnswerlatticeOntologyAction, { action: 'promote_candidate' }>,
    scope: Scope,
    actor: Actor,
): Promise<AnswerlatticeOntologyActionResult> => {
    await ensureOntologyCounter(scope);
    const db = getDb();
    const candidateRef = db.collection(CANDIDATE_COLLECTION).doc(action.candidateId);
    const initial = await candidateRef.get();
    const candidateParsed = AnswerlatticeStoredEntityCandidateSchema.safeParse({ ...initial.data(), id: action.candidateId });
    if (!initial.exists || !candidateParsed.success || !documentIsInScope(initial.data() || {}, scope)) {
        throw new AnswerlatticeOntologyError('ontology_candidate_not_found', 404, 'Entity candidate not found.');
    }
    if (candidateParsed.data.status === 'approved' && candidateParsed.data.promotedEntityId) {
        const entitySnapshot = await db.collection(ENTITY_COLLECTION).doc(candidateParsed.data.promotedEntityId).get();
        const entityParsed = AnswerlatticeStoredEntitySchema.safeParse({ ...entitySnapshot.data(), id: candidateParsed.data.promotedEntityId });
        if (entitySnapshot.exists && entityParsed.success && documentIsInScope(entitySnapshot.data() || {}, scope)) {
            return { success: true, action: action.action, replayed: true, entity: entityParsed.data as AnswerlatticeEntity, candidateId: action.candidateId, candidateStatus: 'approved' };
        }
    }
    if (candidateParsed.data.status !== 'pending' && candidateParsed.data.status !== 'approved') {
        throw new AnswerlatticeOntologyError('ontology_candidate_transition_invalid', 409, 'Only an unresolved candidate can become a product entity.');
    }
    const slug = candidateParsed.data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slug) throw new AnswerlatticeOntologyError('ontology_candidate_slug_invalid', 409, 'This candidate needs a clearer name before promotion.');
    const legacySlugOwner = await findLegacySlugOwner(scope, slug);
    if (legacySlugOwner) throw new AnswerlatticeOntologyError('ontology_slug_conflict', 409, 'An entity with this product identifier already exists. Mark this candidate as a duplicate instead.');
    const fingerprint = sha(canonicalJson(action));
    const operationRef = db.collection(AUDIT_COLLECTION).doc(getOperationId(scope, action.requestId));
    const entityId = `entity_${sha(`${scope.tId}:${scope.sId}:candidate:${action.candidateId}`).slice(0, 32)}`;
    const entityRef = db.collection(ENTITY_COLLECTION).doc(entityId);
    const indexRef = db.collection(SEARCH_INDEX_COLLECTION).doc(getSearchIndexId(scope, entityId));
    const slugRef = db.collection(SLUG_INDEX_COLLECTION).doc(getSlugIndexId(scope, slug));
    const counterRef = getCounterRef(scope);
    const entity: AnswerlatticeEntity = {
        id: entityId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        type: candidateParsed.data.type as AnswerlatticeEntity['type'],
        name: candidateParsed.data.name,
        slug,
        description: candidateParsed.data.description,
        status: 'active',
        currentVersion: 1_000_000,
    };
    const searchIndex = buildSearchIndex(entity, scope, indexRef.id);
    const result = await db.runTransaction<AnswerlatticeOntologyActionResult>(async (transaction) => {
        const [operationSnapshot, currentCandidate, entitySnapshot, slugSnapshot, counterSnapshot] = await Promise.all([
            transaction.get(operationRef), transaction.get(candidateRef), transaction.get(entityRef), transaction.get(slugRef), transaction.get(counterRef),
        ]);
        const replay = readOperationReplay(operationSnapshot, action, scope, fingerprint);
        if (replay) return replay;
        const parsed = AnswerlatticeStoredEntityCandidateSchema.safeParse({ ...currentCandidate.data(), id: action.candidateId });
        if (!currentCandidate.exists || !parsed.success || !documentIsInScope(currentCandidate.data() || {}, scope)) {
            throw new AnswerlatticeOntologyError('ontology_candidate_not_found', 404, 'Entity candidate not found.');
        }
        if (parsed.data.status === 'approved' && parsed.data.promotedEntityId === entityId && entitySnapshot.exists) {
            return { success: true, action: action.action, replayed: true, entity, candidateId: action.candidateId, candidateStatus: 'approved' };
        }
        if (parsed.data.status !== 'pending' && parsed.data.status !== 'approved') {
            throw new AnswerlatticeOntologyError('ontology_candidate_transition_invalid', 409, 'This candidate has already been reviewed.');
        }
        if (entitySnapshot.exists || slugSnapshot.exists) throw new AnswerlatticeOntologyError('ontology_slug_conflict', 409, 'An entity with this product identifier already exists.');
        const counter = normalizeCounter(counterSnapshot.data(), scope);
        if (!counter || counter.entityCount >= ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITIES_PER_TENANT) {
            throw new AnswerlatticeOntologyError('ontology_entity_limit', 409, 'Merge existing entities before promoting another candidate.');
        }
        const response: AnswerlatticeOntologyActionResult = {
            success: true, action: action.action, replayed: false, entity, searchIndex, candidateId: action.candidateId, candidateStatus: 'approved',
        };
        const now = FieldValue.serverTimestamp();
        transaction.create(entityRef, { ...entity, createdOn: now, modifiedOn: now, createdBy: actor.label, modifiedBy: actor.label, uId: actor.id });
        transaction.create(indexRef, { ...searchIndex, createdOn: now, modifiedOn: now, createdBy: actor.label, modifiedBy: actor.label, uId: actor.id });
        transaction.create(slugRef, { pId: PRODUCT_IDS.ANSWERLATTICE, ...scope, slug, entityId, createdAt: now, updatedAt: now });
        transaction.update(candidateRef, { status: 'approved', promotedEntityId: entityId, modifiedOn: now, modifiedBy: actor.label });
        transaction.update(counterRef, {
            entityCount: counter.entityCount + 1,
            pendingCandidateCount: parsed.data.status === 'pending' ? Math.max(0, counter.pendingCandidateCount - 1) : counter.pendingCandidateCount,
            updatedAt: now,
        });
        addInvalidationWrites(transaction, scope, 'entities', 'entity_candidate_promote', entityId);
        writeOperation(transaction, operationRef, action, scope, actor, fingerprint, response, 'entity', entityId);
        return response;
    });
    await syncTenantSummaryAfterEntityWrite(scope);
    return result;
};

export async function executeAnswerlatticeOntologyAction(
    action: AnswerlatticeOntologyAction,
    access: AnswerlatticeAccessContext,
): Promise<AnswerlatticeOntologyActionResult> {
    const { scope, actor } = getScopeAndActor(access);
    switch (action.action) {
        case 'create_entity': return createEntity(action, scope, actor);
        case 'update_entity': return updateEntity(action, scope, actor);
        case 'deprecate_entity': return deprecateEntity(action, scope, actor);
        case 'create_relation': return createRelation(action, scope, actor);
        case 'delete_relation': return deleteRelation(action, scope, actor);
        case 'rebuild_search_index': return rebuildSearchIndex(action, scope, actor);
        case 'review_candidate': return reviewCandidate(action, scope, actor);
        case 'promote_candidate': return promoteCandidate(action, scope, actor);
    }
}

export async function upsertAnswerlatticeExtractedEntityCandidate(params: {
    scope: Scope;
    actorLabel: string;
    candidate: Omit<AnswerlatticeEntityCandidate, 'id'>;
    sourceArticleId?: string;
}): Promise<{ candidateId: string; created: boolean; updated: boolean }> {
    const { scope } = params;
    await ensureOntologyCounter(scope);
    const db = getDb();
    const normalizedName = params.candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const candidateId = `candidate_${sha(`${scope.tId}:${scope.sId}:${params.candidate.type}:${normalizedName}`).slice(0, 32)}`;
    const candidateRef = db.collection(CANDIDATE_COLLECTION).doc(candidateId);
    const counterRef = getCounterRef(scope);
    return db.runTransaction(async (transaction) => {
        const [candidateSnapshot, counterSnapshot] = await Promise.all([
            transaction.get(candidateRef), transaction.get(counterRef),
        ]);
        const counter = normalizeCounter(counterSnapshot.data(), scope);
        if (!counter) throw new AnswerlatticeOntologyError('ontology_counter_invalid', 409, 'Product structure counters need repair.');
        const sourceArticleIds = params.sourceArticleId ? [params.sourceArticleId].slice(0, 50) : [];
        if (candidateSnapshot.exists) {
            const parsed = AnswerlatticeStoredEntityCandidateSchema.safeParse({ ...candidateSnapshot.data(), id: candidateId });
            if (!parsed.success || !documentIsInScope(candidateSnapshot.data() || {}, scope)) {
                throw new AnswerlatticeOntologyError('ontology_candidate_invalid', 409, 'An existing candidate needs repair.');
            }
            if (parsed.data.status !== 'pending') return { candidateId, created: false, updated: false };
            const existingSources = parsed.data.sourceArticleIds || [];
            const hasSource = params.sourceArticleId ? existingSources.includes(params.sourceArticleId) : true;
            const nextSources = params.sourceArticleId && !hasSource
                ? [...existingSources, params.sourceArticleId].slice(-50)
                : existingSources;
            transaction.update(candidateRef, {
                confidence: Math.max(parsed.data.confidence, params.candidate.confidence),
                description: params.candidate.confidence >= parsed.data.confidence ? params.candidate.description : parsed.data.description,
                frequency: {
                    ...parsed.data.frequency,
                    articles: parsed.data.frequency.articles + (hasSource ? 0 : 1),
                },
                sourceArticleIds: nextSources,
                modifiedOn: FieldValue.serverTimestamp(),
                modifiedBy: params.actorLabel.slice(0, 200),
            });
            return { candidateId, created: false, updated: !hasSource };
        }
        if (counter.pendingCandidateCount >= ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITY_CANDIDATES_PENDING) {
            throw new AnswerlatticeOntologyError('ontology_candidate_limit', 409, 'Review existing entity candidates before generating more.');
        }
        transaction.create(candidateRef, {
            ...params.candidate,
            id: candidateId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            status: 'pending',
            sourceArticleIds,
            createdOn: FieldValue.serverTimestamp(),
            modifiedOn: FieldValue.serverTimestamp(),
            createdBy: params.actorLabel.slice(0, 200),
            modifiedBy: params.actorLabel.slice(0, 200),
        });
        transaction.update(counterRef, { pendingCandidateCount: counter.pendingCandidateCount + 1, updatedAt: FieldValue.serverTimestamp() });
        return { candidateId, created: true, updated: false };
    });
}
