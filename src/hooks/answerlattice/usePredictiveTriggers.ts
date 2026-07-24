/**
 * Answerlattice — Predictive Trigger Management Hook
 * 
 * Provides data fetching and CRUD actions for the trigger management UI.
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AnswerlatticePredictiveTriggersLoadState,
    EMPTY_ANSWERLATTICE_PREDICTIVE_TRIGGERS_STATE,
    getAnswerlatticePredictiveTriggersScopeKey,
    projectPredictiveTriggersStateForScope,
} from './predictiveTriggersScopeState';

const ANSWERLATTICE_PREDICTIVE_TRIGGERS_LOAD_FAILED = 'Could not load triggers';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_CREATE_FAILED = 'Could not create trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_UPDATE_FAILED = 'Could not update trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_ACTIVATE_FAILED = 'Could not activate trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_DISABLE_FAILED = 'Could not disable trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_DELETE_FAILED = 'Could not delete trigger';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_SUMMARY_PENDING = 'Trigger saved. Public help is still updating.';

const warnIfPredictiveTriggerSummaryPending = (summarySynchronized: boolean) => {
    if (!summarySynchronized) message.warning(ANSWERLATTICE_PREDICTIVE_TRIGGER_SUMMARY_PENDING);
};

interface UsePredictiveTriggersReturn {
    triggers: AnswerlatticePredictiveTrigger[];
    loading: boolean;
    error: string | null;
    create: (data: Omit<AnswerlatticePredictiveTrigger, 'id'>) => Promise<AnswerlatticePredictiveTrigger | null>;
    update: (data: Partial<AnswerlatticePredictiveTrigger> & { id: string }) => Promise<boolean>;
    activate: (triggerId: string) => Promise<boolean>;
    disable: (triggerId: string) => Promise<void>;
    remove: (triggerId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function usePredictiveTriggers(tId: number, sId: number): UsePredictiveTriggersReturn {
    const [state, setState] = useState<AnswerlatticePredictiveTriggersLoadState>(
        EMPTY_ANSWERLATTICE_PREDICTIVE_TRIGGERS_STATE,
    );
    const requestIdRef = useRef(0);

    const refresh = useCallback(async () => {
        const scopeKey = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
            ? getAnswerlatticePredictiveTriggersScopeKey(tId, sId)
            : null;
        const requestId = ++requestIdRef.current;
        if (!scopeKey) {
            setState(EMPTY_ANSWERLATTICE_PREDICTIVE_TRIGGERS_STATE);
            return;
        }

        setState({ scopeKey, triggers: [], loading: true, error: null });
        try {
            const result = await getPredictiveTriggers(tId, sId);
            if (requestId !== requestIdRef.current) return;
            setState({ scopeKey, triggers: result || [], loading: false, error: null });
        } catch {
            if (requestId !== requestIdRef.current) return;
            setState({
                scopeKey,
                triggers: [],
                loading: false,
                error: ANSWERLATTICE_PREDICTIVE_TRIGGERS_LOAD_FAILED,
            });
        }
    }, [tId, sId]);

    useEffect(() => {
        void refresh();
        return () => { requestIdRef.current++; };
    }, [refresh]);

    const create = useCallback(async (data: Omit<AnswerlatticePredictiveTrigger, 'id'>): Promise<AnswerlatticePredictiveTrigger | null> => {
        try {
            const outcome = await addPredictiveTrigger(data, { tId, sId });
            if (outcome) {
                message.success(`Trigger "${data.name}" created`);
                warnIfPredictiveTriggerSummaryPending(outcome.summarySynchronized);
                await refresh();
            }
            return outcome?.value ?? null;
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_CREATE_FAILED);
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<AnswerlatticePredictiveTrigger> & { id: string }) => {
        try {
            const triggerId = normalizeAnswerlatticePredictiveTriggerId(data.id);
            if (!triggerId) throw new Error('Invalid predictive trigger id');

            const outcome = await updatePredictiveTrigger({ ...data, id: triggerId }, { tId, sId });
            message.success('Trigger updated');
            warnIfPredictiveTriggerSummaryPending(outcome.summarySynchronized);
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_UPDATE_FAILED);
            return false;
        }
    }, [tId, sId, refresh]);

    const activate = useCallback(async (triggerId: string) => {
        try {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const outcome = await activateTrigger(normalizedTriggerId, { tId, sId });
            message.success('Trigger activated');
            warnIfPredictiveTriggerSummaryPending(outcome.summarySynchronized);
            await refresh();
            return true;
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_ACTIVATE_FAILED);
            return false;
        }
    }, [tId, sId, refresh]);

    const disable = useCallback(async (triggerId: string) => {
        try {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const outcome = await disableTrigger(normalizedTriggerId, { tId, sId });
            message.success('Trigger disabled');
            warnIfPredictiveTriggerSummaryPending(outcome.summarySynchronized);
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_DISABLE_FAILED);
        }
    }, [tId, sId, refresh]);

    const remove = useCallback(async (triggerId: string) => {
        try {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const outcome = await deletePredictiveTrigger(normalizedTriggerId, { tId, sId });
            message.success('Trigger deleted');
            warnIfPredictiveTriggerSummaryPending(outcome.summarySynchronized);
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_PREDICTIVE_TRIGGER_DELETE_FAILED);
        }
    }, [tId, sId, refresh]);

    const visibleState = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
        ? projectPredictiveTriggersStateForScope(state, tId, sId)
        : { triggers: [], loading: false, error: null };

    return { ...visibleState, create, update, activate, disable, remove, refresh };
}
