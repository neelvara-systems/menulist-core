/**
 * Answerlattice — Entity Management Hook
 * 
 * Provides data fetching and CRUD actions for the entity management dashboard.
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (Pillar 1)
 */

import { FEATURE_FLAGS } from '@config/features';
import { addAuditLog } from '@database/answerlattice/auditLogs';
import {
    addEntity,
    addEntityRelation,
    deleteEntityRelation,
    deprecateEntity,
    getEntities,
    getEntityRelations,
    getEntitySearchIndex,
    mergeEntities,
    syncAliasesToSearchIndex,
    updateEntity,
    upsertEntitySearchIndex,
} from '@database/answerlattice/entities';
import { AnswerlatticeEntity, AnswerlatticeEntityRelation, AnswerlatticeEntitySearchIndex } from '@type/answerlattice';
import { message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

const ANSWERLATTICE_ENTITIES_LOAD_FAILED = 'Could not load entities';
const ANSWERLATTICE_ENTITY_CREATE_FAILED = 'Could not create entity';
const ANSWERLATTICE_ENTITY_UPDATE_FAILED = 'Could not update entity';
const ANSWERLATTICE_ENTITY_DEPRECATE_FAILED = 'Could not deprecate entity';
const ANSWERLATTICE_ENTITY_ALIASES_UPDATE_FAILED = 'Could not update aliases';
const ANSWERLATTICE_ENTITY_MERGE_FAILED = 'Could not merge entities';
const ANSWERLATTICE_ENTITY_RELATION_ADD_FAILED = 'Could not add relation';
const ANSWERLATTICE_ENTITY_RELATION_REMOVE_FAILED = 'Could not remove relation';
const ANSWERLATTICE_ENTITY_SEARCH_INDEX_UPDATE_FAILED = 'Could not update search index';

interface UseEntitiesReturn {
    entities: AnswerlatticeEntity[];
    relations: AnswerlatticeEntityRelation[];
    searchIndex: AnswerlatticeEntitySearchIndex[];
    loading: boolean;
    error: string | null;
    selectedEntity: AnswerlatticeEntity | null;
    setSelectedEntity: (entity: AnswerlatticeEntity | null) => void;
    create: (data: Omit<AnswerlatticeEntity, 'id'>) => Promise<AnswerlatticeEntity | null>;
    update: (data: Partial<AnswerlatticeEntity> & { id: string }) => Promise<void>;
    deprecate: (entityId: string) => Promise<void>;
    updateAliases: (entityId: string, aliases: string[]) => Promise<void>;
    merge: (survivorId: string, mergedId: string) => Promise<void>;
    addRelation: (data: Omit<AnswerlatticeEntityRelation, 'id'>) => Promise<void>;
    removeRelation: (relationId: string) => Promise<void>;
    upsertSearchEntry: (data: Omit<AnswerlatticeEntitySearchIndex, 'id'> & { id?: string }) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useEntities(tId: number, sId: number): UseEntitiesReturn {
    const [entities, setEntities] = useState<AnswerlatticeEntity[]>([]);
    const [relations, setRelations] = useState<AnswerlatticeEntityRelation[]>([]);
    const [searchIndex, setSearchIndex] = useState<AnswerlatticeEntitySearchIndex[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<AnswerlatticeEntity | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const [entitiesResult, relationsResult, indexResult] = await Promise.all([
                getEntities(tId, sId),
                getEntityRelations(tId, sId),
                getEntitySearchIndex(tId, sId),
            ]);
            setEntities(entitiesResult || []);
            setRelations(relationsResult || []);
            setSearchIndex(indexResult || []);
        } catch {
            setError(ANSWERLATTICE_ENTITIES_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<AnswerlatticeEntity, 'id'>): Promise<AnswerlatticeEntity | null> => {
        try {
            const result = await addEntity(data);
            if (result) {
                await addAuditLog({
                    tId, sId,
                    action: 'entity_created',
                    entityType: 'entity',
                    entityId: result.id,
                    previousState: undefined,
                    newState: { name: data.name, type: data.type },
                    performedBy: 'admin',
                    timestamp: Timestamp.now(),
                });
                message.success(`Entity "${data.name}" created`);
                await refresh();
            }
            return result;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_CREATE_FAILED);
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<AnswerlatticeEntity> & { id: string }) => {
        try {
            await updateEntity(data);
            await addAuditLog({
                tId, sId,
                action: 'entity_updated',
                entityType: 'entity',
                entityId: data.id,
                previousState: undefined,
                newState: { fields: Object.keys(data).filter(k => k !== 'id') },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Entity updated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_UPDATE_FAILED);
        }
    }, [tId, sId, refresh]);

    const deprecateEntity_ = useCallback(async (entityId: string) => {
        try {
            await deprecateEntity(entityId);
            message.success('Entity deprecated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_DEPRECATE_FAILED);
        }
    }, [refresh]);

    const updateAliases_ = useCallback(async (entityId: string, aliases: string[]) => {
        try {
            const cleaned = aliases
                .map(a => a.toLowerCase().trim())
                .filter(a => a.length >= 2);
            const unique = Array.from(new Set(cleaned)).slice(0, 20);
            await updateEntity({ id: entityId, aliases: unique });
            await syncAliasesToSearchIndex(entityId, unique, tId, sId);
            await addAuditLog({
                tId, sId,
                action: 'entity_aliases_updated',
                entityType: 'entity',
                entityId,
                previousState: undefined,
                newState: { aliases: unique },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Aliases updated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_ALIASES_UPDATE_FAILED);
        }
    }, [tId, sId, refresh]);

    const merge_ = useCallback(async (survivorId: string, mergedId: string) => {
        try {
            const result = await mergeEntities(survivorId, mergedId, tId, sId);
            if (result?.success) {
                message.success(`Entities merged. ${result.transferredRefs} reference(s) transferred.`);
                await refresh();
            }
        } catch {
            message.error(ANSWERLATTICE_ENTITY_MERGE_FAILED);
        }
    }, [tId, sId, refresh]);

    const addRelation_ = useCallback(async (data: Omit<AnswerlatticeEntityRelation, 'id'>) => {
        try {
            await addEntityRelation(data);
            message.success('Relation added');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_RELATION_ADD_FAILED);
        }
    }, [refresh]);

    const removeRelation = useCallback(async (relationId: string) => {
        try {
            await deleteEntityRelation(relationId);
            message.success('Relation removed');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_RELATION_REMOVE_FAILED);
        }
    }, [refresh]);

    const upsertSearchEntry = useCallback(async (data: Omit<AnswerlatticeEntitySearchIndex, 'id'> & { id?: string }) => {
        try {
            await upsertEntitySearchIndex(data);
            message.success('Search index updated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_SEARCH_INDEX_UPDATE_FAILED);
        }
    }, [refresh]);

    return {
        entities, relations, searchIndex, loading, error,
        selectedEntity, setSelectedEntity,
        create, update,
        deprecate: deprecateEntity_,
        updateAliases: updateAliases_,
        merge: merge_,
        addRelation: addRelation_,
        removeRelation,
        upsertSearchEntry,
        refresh,
    };
}
