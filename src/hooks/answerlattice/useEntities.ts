/**
 * Answerlattice — Entity Management Hook
 * 
 * Provides data fetching and CRUD actions for the entity management dashboard.
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (Pillar 1)
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    addEntity,
    addEntityRelation,
    deleteEntityRelation,
    deprecateEntity,
    getEntities,
    getEntityRelations,
    getEntitySearchIndex,
    mergeEntities,
    updateEntity,
    upsertEntitySearchIndex,
} from '@database/answerlattice/entities';
import { AnswerlatticeEntity, AnswerlatticeEntityRelation, AnswerlatticeEntitySearchIndex } from '@type/answerlattice';
import { message } from 'antd';
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
    update: (data: Partial<AnswerlatticeEntity> & { id: string }) => Promise<boolean>;
    deprecate: (entityId: string) => Promise<boolean>;
    updateAliases: (entityId: string, aliases: string[]) => Promise<boolean>;
    merge: (survivorId: string, mergedId: string) => Promise<boolean>;
    addRelation: (data: Omit<AnswerlatticeEntityRelation, 'id'>) => Promise<boolean>;
    removeRelation: (relationId: string) => Promise<boolean>;
    upsertSearchEntry: (data: Omit<AnswerlatticeEntitySearchIndex, 'id'> & { id?: string }) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export type AnswerlatticeEntityLoadMode = 'full' | 'entities_and_search_index' | 'entities_only';

export function useEntities(
    tId: number,
    sId: number,
    loadMode: AnswerlatticeEntityLoadMode = 'full',
): UseEntitiesReturn {
    const [entities, setEntities] = useState<AnswerlatticeEntity[]>([]);
    const [relations, setRelations] = useState<AnswerlatticeEntityRelation[]>([]);
    const [searchIndex, setSearchIndex] = useState<AnswerlatticeEntitySearchIndex[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<AnswerlatticeEntity | null>(null);
    const shouldLoadRelations = loadMode === 'full';
    const shouldLoadSearchIndex = loadMode !== 'entities_only';

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const [entitiesResult, relationsResult, indexResult] = await Promise.all([
                getEntities(tId, sId),
                shouldLoadRelations ? getEntityRelations(tId, sId) : Promise.resolve([]),
                shouldLoadSearchIndex ? getEntitySearchIndex(tId, sId) : Promise.resolve([]),
            ]);
            setEntities(entitiesResult || []);
            setRelations(relationsResult || []);
            setSearchIndex(indexResult || []);
        } catch {
            setError(ANSWERLATTICE_ENTITIES_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [tId, sId, shouldLoadRelations, shouldLoadSearchIndex]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<AnswerlatticeEntity, 'id'>): Promise<AnswerlatticeEntity | null> => {
        try {
            const result = await addEntity(data);
            if (result) {
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
            const result = await updateEntity(data);
            if (!result) throw new Error('Entity update returned no result');
            message.success('Entity updated');
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_UPDATE_FAILED);
            return false;
        }
    }, [tId, sId, refresh]);

    const deprecateEntity_ = useCallback(async (entityId: string) => {
        try {
            const result = await deprecateEntity(entityId);
            if (!result) throw new Error('Entity deprecation returned no result');
            message.success('Entity deprecated');
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_DEPRECATE_FAILED);
            return false;
        }
    }, [refresh]);

    const updateAliases_ = useCallback(async (entityId: string, aliases: string[]) => {
        try {
            const cleaned = aliases
                .map(a => a.toLowerCase().trim())
                .filter(a => a.length >= 2);
            const unique = Array.from(new Set(cleaned)).slice(0, 20);
            const result = await updateEntity({ id: entityId, aliases: unique });
            if (!result) throw new Error('Alias update returned no result');
            message.success('Aliases updated');
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_ALIASES_UPDATE_FAILED);
            return false;
        }
    }, [tId, sId, refresh]);

    const merge_ = useCallback(async (survivorId: string, mergedId: string) => {
        try {
            const result = await mergeEntities(survivorId, mergedId, tId, sId);
            if (result?.success) {
                const transferred = Number(result.transferredAnswers || 0)
                    + Number(result.transferredArticles || 0)
                    + Number(result.transferredFaqs || 0)
                    + Number(result.transferredSurfaces || 0)
                    + Number(result.transferredRelations || 0);
                message.success(`Entities merged. ${transferred} reference(s) transferred.`);
                await refresh();
                return true;
            }
            return false;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_MERGE_FAILED);
            return false;
        }
    }, [tId, sId, refresh]);

    const addRelation_ = useCallback(async (data: Omit<AnswerlatticeEntityRelation, 'id'>) => {
        try {
            const result = await addEntityRelation(data);
            if (!result) throw new Error('Relation create returned no result');
            message.success('Relation added');
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_RELATION_ADD_FAILED);
            return false;
        }
    }, [refresh]);

    const removeRelation = useCallback(async (relationId: string) => {
        try {
            const result = await deleteEntityRelation(relationId);
            if (!result) throw new Error('Relation removal returned no result');
            message.success('Relation removed');
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_RELATION_REMOVE_FAILED);
            return false;
        }
    }, [refresh]);

    const upsertSearchEntry = useCallback(async (data: Omit<AnswerlatticeEntitySearchIndex, 'id'> & { id?: string }) => {
        try {
            const result = await upsertEntitySearchIndex(data);
            if (!result) throw new Error('Search index update returned no result');
            message.success('Search index updated');
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_ENTITY_SEARCH_INDEX_UPDATE_FAILED);
            return false;
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
