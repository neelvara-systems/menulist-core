/**
 * Canonica — Entity Management Hook
 * 
 * Provides data fetching and CRUD actions for the entity management dashboard.
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (Pillar 1)
 */

import { FEATURE_FLAGS } from '@config/features';
import { addAuditLog } from '@database/canonica/auditLogs';
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
} from '@database/canonica/entities';
import { CanonicaEntity, CanonicaEntityRelation, CanonicaEntitySearchIndex } from '@type/canonica';
import { message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

interface UseEntitiesReturn {
    entities: CanonicaEntity[];
    relations: CanonicaEntityRelation[];
    searchIndex: CanonicaEntitySearchIndex[];
    loading: boolean;
    error: string | null;
    selectedEntity: CanonicaEntity | null;
    setSelectedEntity: (entity: CanonicaEntity | null) => void;
    create: (data: Omit<CanonicaEntity, 'id'>) => Promise<CanonicaEntity | null>;
    update: (data: Partial<CanonicaEntity> & { id: string }) => Promise<void>;
    deprecate: (entityId: string) => Promise<void>;
    updateAliases: (entityId: string, aliases: string[]) => Promise<void>;
    merge: (survivorId: string, mergedId: string) => Promise<void>;
    addRelation: (data: Omit<CanonicaEntityRelation, 'id'>) => Promise<void>;
    removeRelation: (relationId: string) => Promise<void>;
    upsertSearchEntry: (data: Omit<CanonicaEntitySearchIndex, 'id'> & { id?: string }) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useEntities(tId: number, sId: number): UseEntitiesReturn {
    const [entities, setEntities] = useState<CanonicaEntity[]>([]);
    const [relations, setRelations] = useState<CanonicaEntityRelation[]>([]);
    const [searchIndex, setSearchIndex] = useState<CanonicaEntitySearchIndex[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<CanonicaEntity | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI || !tId || !sId) return;

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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load entities');
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<CanonicaEntity, 'id'>): Promise<CanonicaEntity | null> => {
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
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to create entity');
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<CanonicaEntity> & { id: string }) => {
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
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to update entity');
        }
    }, [tId, sId, refresh]);

    const deprecateEntity_ = useCallback(async (entityId: string) => {
        try {
            await deprecateEntity(entityId);
            message.success('Entity deprecated');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to deprecate entity');
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
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to update aliases');
        }
    }, [tId, sId, refresh]);

    const merge_ = useCallback(async (survivorId: string, mergedId: string) => {
        try {
            const result = await mergeEntities(survivorId, mergedId, tId, sId);
            if (result?.success) {
                message.success(`Entities merged. ${result.transferredRefs} reference(s) transferred.`);
                await refresh();
            }
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Merge failed');
        }
    }, [tId, sId, refresh]);

    const addRelation_ = useCallback(async (data: Omit<CanonicaEntityRelation, 'id'>) => {
        try {
            await addEntityRelation(data);
            message.success('Relation added');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to add relation');
        }
    }, [refresh]);

    const removeRelation = useCallback(async (relationId: string) => {
        try {
            await deleteEntityRelation(relationId);
            message.success('Relation removed');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to remove relation');
        }
    }, [refresh]);

    const upsertSearchEntry = useCallback(async (data: Omit<CanonicaEntitySearchIndex, 'id'> & { id?: string }) => {
        try {
            await upsertEntitySearchIndex(data);
            message.success('Search index updated');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to update search index');
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
