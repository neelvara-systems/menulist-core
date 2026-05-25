/**
 * Canonica — Predictive Trigger Management Hook
 * 
 * Provides data fetching and CRUD actions for the trigger management UI.
 * Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/canonica/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
import { addAuditLog } from '@database/canonica/auditLogs';
import {
    activateTrigger,
    addPredictiveTrigger,
    deletePredictiveTrigger,
    disableTrigger,
    getPredictiveTriggers,
    updatePredictiveTrigger,
} from '@database/canonica/predictiveTriggers';
import { getCanonicaUiErrorMessage } from '@lib/canonica/uiErrors';
import { CanonicaPredictiveTrigger } from '@type/canonica';
import { message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

interface UsePredictiveTriggersReturn {
    triggers: CanonicaPredictiveTrigger[];
    loading: boolean;
    error: string | null;
    create: (data: Omit<CanonicaPredictiveTrigger, 'id'>) => Promise<CanonicaPredictiveTrigger | null>;
    update: (data: Partial<CanonicaPredictiveTrigger> & { id: string }) => Promise<void>;
    activate: (triggerId: string) => Promise<void>;
    disable: (triggerId: string) => Promise<void>;
    remove: (triggerId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function usePredictiveTriggers(tId: number, sId: number): UsePredictiveTriggersReturn {
    const [triggers, setTriggers] = useState<CanonicaPredictiveTrigger[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getPredictiveTriggers(tId, sId);
            setTriggers(result || []);
        } catch (err) {
            setError(getCanonicaUiErrorMessage(err, 'Could not load triggers'));
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<CanonicaPredictiveTrigger, 'id'>): Promise<CanonicaPredictiveTrigger | null> => {
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
        } catch (err) {
            message.error(getCanonicaUiErrorMessage(err, 'Could not create trigger'));
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<CanonicaPredictiveTrigger> & { id: string }) => {
        try {
            await updatePredictiveTrigger(data);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_updated',
                entityType: 'predictiveTrigger',
                entityId: data.id,
                previousState: undefined,
                newState: { fields: Object.keys(data).filter(k => k !== 'id') },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger updated');
            await refresh();
        } catch (err) {
            message.error(getCanonicaUiErrorMessage(err, 'Could not update trigger'));
        }
    }, [tId, sId, refresh]);

    const activate = useCallback(async (triggerId: string) => {
        try {
            await activateTrigger(triggerId);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_activated',
                entityType: 'predictiveTrigger',
                entityId: triggerId,
                previousState: undefined,
                newState: { status: 'active' },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger activated');
            await refresh();
        } catch (err) {
            message.error(getCanonicaUiErrorMessage(err, 'Could not activate trigger'));
        }
    }, [tId, sId, refresh]);

    const disable = useCallback(async (triggerId: string) => {
        try {
            await disableTrigger(triggerId);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_disabled',
                entityType: 'predictiveTrigger',
                entityId: triggerId,
                previousState: undefined,
                newState: { status: 'disabled' },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger disabled');
            await refresh();
        } catch (err) {
            message.error(getCanonicaUiErrorMessage(err, 'Could not disable trigger'));
        }
    }, [tId, sId, refresh]);

    const remove = useCallback(async (triggerId: string) => {
        try {
            await deletePredictiveTrigger(triggerId);
            await addAuditLog({
                tId, sId,
                action: 'predictive_trigger_deleted',
                entityType: 'predictiveTrigger',
                entityId: triggerId,
                previousState: undefined,
                newState: { deleted: true },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Trigger deleted');
            await refresh();
        } catch (err) {
            message.error(getCanonicaUiErrorMessage(err, 'Could not delete trigger'));
        }
    }, [tId, sId, refresh]);

    return { triggers, loading, error, create, update, activate, disable, remove, refresh };
}
