import type { AnswerlatticePredictiveTrigger } from '@type/answerlattice';

export interface AnswerlatticePredictiveTriggersLoadState {
    scopeKey: string | null;
    triggers: AnswerlatticePredictiveTrigger[];
    loading: boolean;
    error: string | null;
}

export type AnswerlatticePredictiveTriggersVisibleState = Omit<
    AnswerlatticePredictiveTriggersLoadState,
    'scopeKey'
>;

export const EMPTY_ANSWERLATTICE_PREDICTIVE_TRIGGERS_STATE: AnswerlatticePredictiveTriggersLoadState = {
    scopeKey: null,
    triggers: [],
    loading: false,
    error: null,
};

export function getAnswerlatticePredictiveTriggersScopeKey(tId: number, sId: number): string | null {
    return Number.isSafeInteger(tId) && tId > 0 && Number.isSafeInteger(sId) && sId > 0
        ? `${tId}:${sId}`
        : null;
}

export function projectPredictiveTriggersStateForScope(
    state: AnswerlatticePredictiveTriggersLoadState,
    tId: number,
    sId: number,
): AnswerlatticePredictiveTriggersVisibleState {
    const requestedScopeKey = getAnswerlatticePredictiveTriggersScopeKey(tId, sId);
    if (!requestedScopeKey) return { triggers: [], loading: false, error: null };
    if (state.scopeKey !== requestedScopeKey) return { triggers: [], loading: true, error: null };
    return {
        triggers: state.triggers,
        loading: state.loading,
        error: state.error,
    };
}
