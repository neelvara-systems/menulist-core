/**
 * Answerlattice — Predictive Trigger Management Hook
 * 
 * Provides data fetching and CRUD actions for the trigger management UI.
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
import { addAuditLog } from '@database/answerlattice/auditLogs';
import {
    activateTrigger,
    addPredictiveTrigger,
    deletePredictiveTrigger,
    disableTrigger,
    getPredictiveTriggers,
    updatePredictiveTrigger,
} from '@database/answerlattice/predictiveTriggers';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';
import { AnswerlatticePredictiveTrigger } from '@type/answerlattice';
import { message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

const ANSWERLATTICE_PREDICTIVE_TRIGGERS_LOAD_FAILED = 'Could not load triggers';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_CREATE_FAILED = 'Could not create trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_UPDATE_FAILED = 'Could not update trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_ACTIVATE_FAILED = 'Could not activate trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_DISABLE_FAILED = 'Could not disable trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_DELETE_FAILED = 'Could not delete trigger';

interface UsePredictiveTriggersReturn {
    triggers: AnswerlatticePredictiveTrigger[];
    loading: boolean;
    error: string | null;
    create: (data: Omit<AnswerlatticePredictiveTrigger, 'id'>) => Promise<AnswerlatticePredictiveTrigger | null>;
    update: (data: Partial<AnswerlatticePredictiveTrigger> & { id: string }) => Promise<void>;
    activate: (triggerId: string) => Promise<void>;
    disable: (triggerId: string) => Promise<void>;
    remove: (triggerId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function usePredictiveTriggers(tId: number, sId: number): UsePredictiveTriggersReturn {
    const [triggers, setTriggers] = useState<AnswerlatticePredictiveTrigger[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getPredictiveTriggers(tId, sId);
            setTriggers(result || []);
        } catch {
            setError(ANSWERLATTICE_PREDICTIVE_TRIGGERS_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<AnswerlatticePredictiveTrigger, 'id'>): Promise<AnswerlatticePredictiveTrigger | null> => {
        try {
            const result = await addPredictiveTrigger(data);
            if (result) {
                await addAuditLog({
                    tId, sId,
                    action: 'predictive_trigger_created',
                    entityType: 'predictiveTrigger',
                    entityId: result.id,
                    previousState: undefined,
                    newState: { name: data.name, page: data.conditions?.page, source: data.source },
                    performedBy: 'admin',
                    timestamp: Timestamp.now(),
                });
                message.success(`Trigger "${data.name}" created`);
                await refresh();
            }
            return result;
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_CREATE_FAILED);
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<AnswerlatticePredictiveTrigger> & { id: string }) => {
        try {
            const triggerId = normalizeAnswerlatticePredictiveTriggerId(data.id);
            if (!triggerId) throw new Error('Invalid predictive trigger id');

            await updatePredictiveTrigger({ ...data, id: triggerId });
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_updated',
                entityType: 'predictiveTrigger',
                entityId: triggerId,
                previousState: undefined,
                newState: { fields: Object.keys(data).filter(k => k !== 'id') },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger updated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_UPDATE_FAILED);
        }
    }, [tId, sId, refresh]);

    const activate = useCallback(async (triggerId: string) => {
        try {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            await activateTrigger(normalizedTriggerId);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_activated',
                entityType: 'predictiveTrigger',
                entityId: normalizedTriggerId,
                previousState: undefined,
                newState: { status: 'active' },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger activated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_ACTIVATE_FAILED);
        }
    }, [tId, sId, refresh]);

    const disable = useCallback(async (triggerId: string) => {
        try {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            await disableTrigger(normalizedTriggerId);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_disabled',
                entityType: 'predictiveTrigger',
                entityId: normalizedTriggerId,
                previousState: undefined,
                newState: { status: 'disabled' },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger disabled');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_DISABLE_FAILED);
        }
    }, [tId, sId, refresh]);

    const remove = useCallback(async (triggerId: string) => {
        try {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            await deletePredictiveTrigger(normalizedTriggerId);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_deleted',
                entityType: 'predictiveTrigger',
                entityId: normalizedTriggerId,
                previousState: undefined,
                newState: { deleted: true },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger deleted');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_DELETE_FAILED);
        }
    }, [tId, sId, refresh]);

    return { triggers, loading, error, create, update, activate, disable, remove, refresh };
}
