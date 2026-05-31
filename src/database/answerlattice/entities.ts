/**
 * Answerlattice — Entity DAL (Product Ontology Layer)
 * 
 * Pillar 1 of 5 — Foundation layer.
 * Entities are first-class product concepts: features, plans, roles,
 * workflows, states, integrations, error codes.
 * 
 * RULES:
 * - Entity.type is IMMUTABLE after creation
 * - Entity cannot be deleted if referenced by CanonicalAnswer or EntityRelation
 * - Deprecation only (no hard delete)
 * - All writes server-enforced via requestBodyComposer
 * - tenantId (tId) mandatory on all documents
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, query, setDoc, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { markAnswerlatticeTenantHasEntities } from '@lib/answerlattice/tenantSummaryClient';
import { markAnswerlatticeCompiledContextSourceChanged } from '@lib/answerlattice/compiledSourceVersionsClient';
import { AnswerlatticeEntity, AnswerlatticeEntityRelation, AnswerlatticeEntitySearchIndex } from "@type/answerlattice";

// ═══════════════════════════════════════════════════════════════
// ENTITIES
// ═══════════════════════════════════════════════════════════════

const ENTITY_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITIES;
const RELATION_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS;
const SEARCH_INDEX_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX;

const getEntityCollectionRef = () => collection(answerlatticeFirebaseClient, ENTITY_COLLECTION);
const getEntityDocRef = (docId: string) => doc(answerlatticeFirebaseClient, ENTITY_COLLECTION, docId);
const getRelationCollectionRef = () => collection(answerlatticeFirebaseClient, RELATION_COLLECTION);
const getRelationDocRef = (docId: string) => doc(answerlatticeFirebaseClient, RELATION_COLLECTION, docId);
const getSearchIndexCollectionRef = () => collection(answerlatticeFirebaseClient, SEARCH_INDEX_COLLECTION);
const getSearchIndexDocRef = (docId: string) => doc(answerlatticeFirebaseClient, SEARCH_INDEX_COLLECTION, docId);

const resolveEntityScope = async (
    data?: Partial<AnswerlatticeEntity> | null,
    entityId?: string,
) => {
    const dataTId = Number(data?.tId);
    const dataSId = Number(data?.sId);
    if (Number.isFinite(dataTId) && dataTId > 0 && Number.isFinite(dataSId) && dataSId > 0) {
        return { tId: dataTId, sId: dataSId };
    }

    if (entityId) {
        const docSnap = await getDoc(getEntityDocRef(entityId));
        if (docSnap.exists()) {
            const existing = docSnap.data() as Partial<AnswerlatticeEntity>;
            const existingTId = Number(existing.tId);
            const existingSId = Number(existing.sId);
            if (Number.isFinite(existingTId) && existingTId > 0 && Number.isFinite(existingSId) && existingSId > 0) {
                return { tId: existingTId, sId: existingSId };
            }
        }
    }

    return null;
};

/**
 * Get all entities for a tenant+store
 */
export const getEntities = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getEntityCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntity[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeEntity);
            });
            return list;
        },
        "getEntities"
    );
};

/**
 * Get entities by type for a tenant+store
 */
export const getEntitiesByType = async (tId: number, sId: number, type: string) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getEntityCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('type', '==', type),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntity[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeEntity);
            });
            return list;
        },
        "getEntitiesByType"
    );
};

/**
 * Get a single entity by ID
 */
export const getEntityById = async (entityId: string) => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getEntityDocRef(entityId));
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as AnswerlatticeEntity;
            }
            return null;
        },
        "getEntityById"
    );
};

/**
 * Add a new entity
 * NOTE: entity.type is immutable after creation (enforced by update logic)
 */
export const addEntity = async (data: Omit<AnswerlatticeEntity, 'id'>) => {
    return await apiCallComposer(
        async () => {
            // Ontology guardrail: prevent entity explosion
            const { ANSWERLATTICE_ONTOLOGY_CONSTRAINTS } = await import('@type/answerlattice');
            const countQuery = query(
                getEntityCollectionRef(),
                where('tId', '==', data.tId),
                where('sId', '==', data.sId),
                limit(ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITIES_PER_TENANT)
            );
            const countSnap = await getCountFromServer(countQuery);
            if (countSnap.data().count >= ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITIES_PER_TENANT) {
                throw new Error(
                    `Entity limit reached (${ANSWERLATTICE_ONTOLOGY_CONSTRAINTS.MAX_ENTITIES_PER_TENANT}). ` +
                    `Consider merging similar entities before adding new ones.`
                );
            }

            const submitData = await answerlatticeRequestBodyComposer(data);
            const docRef = await addDoc(getEntityCollectionRef(), submitData);
            await markAnswerlatticeCompiledContextSourceChanged('entities', data.tId, data.sId, {
                reason: 'entity_create',
                sourceId: docRef.id,
                sourceType: ENTITY_COLLECTION,
            });
            markAnswerlatticeTenantHasEntities(data.tId, data.sId, 'entity_created').catch(() => undefined);
            return { ...submitData, id: docRef.id } as AnswerlatticeEntity;
        },
        data,
        "addEntity"
    );
};

/**
 * Update an entity (type field is protected — cannot be changed)
 */
export const updateEntity = async (data: Partial<AnswerlatticeEntity> & { id: string }) => {
    return await apiCallComposer(
        async () => {
            // Protect immutable type field
            const { type, ...updateData } = data;
            const composedData = await answerlatticeRequestBodyComposer(updateData);
            await setDoc(getEntityDocRef(data.id), composedData, { merge: true });
            const scope = await resolveEntityScope(composedData as Partial<AnswerlatticeEntity>, data.id);
            if (scope) {
                await markAnswerlatticeCompiledContextSourceChanged('entities', scope.tId, scope.sId, {
                    reason: 'entity_update',
                    sourceId: data.id,
                    sourceType: ENTITY_COLLECTION,
                });
            }
            return composedData;
        },
        data,
        "updateEntity"
    );
};

/**
 * Deprecate an entity (soft delete — sets status to 'deprecated')
 * Hard delete is NOT allowed if entity is referenced.
 * 
 * Governance safeguard: checks for active canonical answers bound to
 * this entity. If found, deprecation is blocked to prevent orphan answers.
 * Drift Class D (Orphan Drift) would catch this eventually, but blocking
 * at write-time is the correct invariant enforcement.
 */
export const deprecateEntity = async (entityId: string) => {
    return await apiCallComposer(
        async () => {
            // 1. Fetch entity to get tenant context
            const entitySnap = await getDoc(getEntityDocRef(entityId));
            if (!entitySnap.exists()) {
                throw new Error(`Entity ${entityId} not found`);
            }
            const entity = entitySnap.data() as AnswerlatticeEntity;

            // 2. Check for active canonical answers bound to this entity
            const { getActiveAnswersForEntity } = await import('@database/answerlattice/canonicalAnswers');
            const boundAnswers = await getActiveAnswersForEntity(entity.tId, entity.sId, entityId);
            if (boundAnswers && boundAnswers.length > 0) {
                throw new Error(
                    `Cannot deprecate entity "${entityId}" — ${boundAnswers.length} active canonical answer(s) still reference it. ` +
                    `Reassign or retire those answers first.`
                );
            }

            // 3. Safe to deprecate
            const composedData = await answerlatticeRequestBodyComposer({ status: 'deprecated' });
            await setDoc(getEntityDocRef(entityId), composedData, { merge: true });
            await markAnswerlatticeCompiledContextSourceChanged('entities', entity.tId, entity.sId, {
                reason: 'entity_deprecate',
                sourceId: entityId,
                sourceType: ENTITY_COLLECTION,
            });
            return composedData;
        },
        { entityId },
        "deprecateEntity"
    );
};

// ═══════════════════════════════════════════════════════════════
// ENTITY RELATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all relations for a tenant+store
 */
export const getEntityRelations = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getRelationCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntityRelation[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeEntityRelation);
            });
            return list;
        },
        "getEntityRelations"
    );
};

/**
 * Get relations for a specific entity (as source)
 */
export const getRelationsForEntity = async (tId: number, sId: number, entityId: string) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getRelationCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('fromEntityId', '==', entityId),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntityRelation[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeEntityRelation);
            });
            return list;
        },
        "getRelationsForEntity"
    );
};

/**
 * Add a new entity relation
 */
export const addEntityRelation = async (data: Omit<AnswerlatticeEntityRelation, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await answerlatticeRequestBodyComposer(data);
            const docRef = await addDoc(getRelationCollectionRef(), submitData);
            await markAnswerlatticeCompiledContextSourceChanged('entityRelations', data.tId, data.sId, {
                reason: 'entity_relation_create',
                sourceId: docRef.id,
                sourceType: RELATION_COLLECTION,
            });
            return { ...submitData, id: docRef.id } as AnswerlatticeEntityRelation;
        },
        data,
        "addEntityRelation"
    );
};

/**
 * Delete an entity relation
 */
export const deleteEntityRelation = async (relationId: string) => {
    return await apiCallComposer(
        async () => {
            const relationSnap = await getDoc(getRelationDocRef(relationId));
            const relation = relationSnap.exists() ? (relationSnap.data() as AnswerlatticeEntityRelation) : null;
            await deleteDoc(getRelationDocRef(relationId));
            if (relation) {
                await markAnswerlatticeCompiledContextSourceChanged('entityRelations', relation.tId, relation.sId, {
                    reason: 'entity_relation_delete',
                    sourceId: relationId,
                    sourceType: RELATION_COLLECTION,
                });
            }
            return { id: relationId };
        },
        { relationId },
        "deleteEntityRelation"
    );
};

// ═══════════════════════════════════════════════════════════════
// ENTITY SEARCH INDEX (Deterministic Retrieval)
// ═══════════════════════════════════════════════════════════════

/**
 * Get search index entries for a tenant+store
 */
export const getEntitySearchIndex = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getSearchIndexCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeEntitySearchIndex[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeEntitySearchIndex);
            });
            return list;
        },
        "getEntitySearchIndex"
    );
};

/**
 * Add or update a search index entry for an entity
 */
export const upsertEntitySearchIndex = async (data: Omit<AnswerlatticeEntitySearchIndex, 'id'> & { id?: string }) => {
    return await apiCallComposer(
        async () => {
            const submitData = await answerlatticeRequestBodyComposer(data);
            if (data.id) {
                await setDoc(getSearchIndexDocRef(data.id), submitData, { merge: true });
                return { ...submitData, id: data.id } as AnswerlatticeEntitySearchIndex;
            } else {
                const docRef = await addDoc(getSearchIndexCollectionRef(), submitData);
                return { ...submitData, id: docRef.id } as AnswerlatticeEntitySearchIndex;
            }
        },
        data,
        "upsertEntitySearchIndex"
    );
};

// ═══════════════════════════════════════════════════════════════
// ALIAS → SEARCH INDEX SYNC (E1)
// Entity aliases are source of truth. Syncs to search index synonyms.
// ═══════════════════════════════════════════════════════════════

/**
 * Sync entity aliases to the corresponding search index entry's synonyms.
 * Called after aliases are updated on an entity document.
 * Entity.aliases is the source of truth; search index.synonyms is the derived copy.
 */
export const syncAliasesToSearchIndex = async (entityId: string, aliases: string[], tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getSearchIndexCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('entityId', '==', entityId),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const indexDoc = snapshot.docs[0];
            const composedData = await answerlatticeRequestBodyComposer({ synonyms: aliases });
            await setDoc(getSearchIndexDocRef(indexDoc.id), composedData, { merge: true });
            return { id: indexDoc.id, synonyms: aliases };
        },
        { entityId, aliases },
        "syncAliasesToSearchIndex"
    );
};

// ═══════════════════════════════════════════════════════════════
// ENTITY MERGE (E5)
// Merges two entities: transfers all references, adds alias, deprecates merged.
// ═══════════════════════════════════════════════════════════════

/**
 * Merge two entities into one.
 * Survivor keeps its identity. Merged entity's name becomes an alias on survivor.
 * All canonical answer references and relations are transferred.
 * Merged entity is deprecated (soft delete — never hard-deleted).
 * 
 * INVARIANTS:
 * - Cannot merge entities of different types
 * - Merged entity is never hard-deleted (audit trail)
 * - All references atomically transferred
 */
export const mergeEntities = async (
    survivorId: string,
    mergedId: string,
    tId: number,
    sId: number
) => {
    return await apiCallComposer(
        async () => {
            // 1. Fetch both entities
            const survivorSnap = await getDoc(getEntityDocRef(survivorId));
            const mergedSnap = await getDoc(getEntityDocRef(mergedId));
            if (!survivorSnap.exists()) throw new Error(`Survivor entity ${survivorId} not found`);
            if (!mergedSnap.exists()) throw new Error(`Merged entity ${mergedId} not found`);

            const survivor = { ...survivorSnap.data(), id: survivorSnap.id } as AnswerlatticeEntity;
            const merged = { ...mergedSnap.data(), id: mergedSnap.id } as AnswerlatticeEntity;

            if (survivor.type !== merged.type) {
                throw new Error(`Cannot merge entities of different types: "${survivor.type}" vs "${merged.type}"`);
            }

            // 2. Transfer canonical answer references (mergedId → survivorId)
            const { getCanonicalAnswers, updateCanonicalAnswer } = await import('@database/answerlattice/canonicalAnswers');
            const answers = await getCanonicalAnswers(tId, sId);
            let transferred = 0;
            for (const answer of (answers || [])) {
                if (answer.scope.entityIds.includes(mergedId)) {
                    const newEntityIds = answer.scope.entityIds
                        .map((id: string) => id === mergedId ? survivorId : id)
                        .filter((id: string, i: number, arr: string[]) => arr.indexOf(id) === i);
                    await updateCanonicalAnswer({
                        id: answer.id,
                        scope: { ...answer.scope, entityIds: newEntityIds }
                    });
                    transferred++;
                }
            }

            // 3. Transfer relations (delete old, create with survivor)
            const relations = await getEntityRelations(tId, sId);
            for (const rel of (relations || [])) {
                if (rel.fromEntityId === mergedId || rel.toEntityId === mergedId) {
                    const newFrom = rel.fromEntityId === mergedId ? survivorId : rel.fromEntityId;
                    const newTo = rel.toEntityId === mergedId ? survivorId : rel.toEntityId;
                    // Skip self-referencing relations after merge
                    if (newFrom === newTo) {
                        await deleteEntityRelation(rel.id);
                        continue;
                    }
                    await deleteEntityRelation(rel.id);
                    await addEntityRelation({
                        tId, sId,
                        fromEntityId: newFrom,
                        toEntityId: newTo,
                        relationType: rel.relationType,
                    });
                }
            }

            // 4. Combine aliases — add merged entity's name as alias on survivor
            const mergedAliases = merged.aliases || [];
            const survivorAliases = survivor.aliases || [];
            const allAliases = [...survivorAliases, ...mergedAliases, merged.name.toLowerCase().trim()];
            const combinedAliases = Array.from(new Set(allAliases)).slice(0, 20);

            const survivorUpdate = await answerlatticeRequestBodyComposer({ aliases: combinedAliases });
            await setDoc(getEntityDocRef(survivorId), survivorUpdate, { merge: true });

            // 5. Sync combined aliases to search index
            await syncAliasesToSearchIndex(survivorId, combinedAliases, tId, sId);

            // 6. Deprecate merged entity
            const deprecateData = await answerlatticeRequestBodyComposer({ status: 'deprecated' });
            await setDoc(getEntityDocRef(mergedId), deprecateData, { merge: true });
            await markAnswerlatticeCompiledContextSourceChanged('entities', tId, sId, {
                reason: 'entity_merge',
                sourceId: survivorId,
                sourceType: ENTITY_COLLECTION,
            });
            await markAnswerlatticeCompiledContextSourceChanged('entityRelations', tId, sId, {
                reason: 'entity_merge_relations',
                sourceId: survivorId,
                sourceType: RELATION_COLLECTION,
            });

            // 7. Audit log
            const { addAuditLog } = await import('@database/answerlattice/auditLogs');
            const { Timestamp } = await import('firebase/firestore');
            await addAuditLog({
                tId, sId,
                action: 'entity_merged',
                entityType: 'entity',
                entityId: survivorId,
                previousState: { mergedEntityId: mergedId, mergedName: merged.name },
                newState: { survivorId, combinedAliases, transferredAnswers: transferred },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });

            return { success: true, transferredRefs: transferred, combinedAliases };
        },
        { survivorId, mergedId, tId, sId },
        "mergeEntities"
    );
};
