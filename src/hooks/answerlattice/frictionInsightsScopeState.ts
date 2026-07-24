import type {
    AnswerlatticeFrictionInsight,
    AnswerlatticeFrictionSnapshot,
} from '@type/answerlattice';

export interface AnswerlatticeFrictionInsightsLoadState {
    scopeKey: string | null;
    snapshot: AnswerlatticeFrictionSnapshot | null;
    insight: AnswerlatticeFrictionInsight | null;
    loading: boolean;
    error: string | null;
}

export type AnswerlatticeFrictionInsightsVisibleState = Omit<
    AnswerlatticeFrictionInsightsLoadState,
    'scopeKey'
>;

export const EMPTY_ANSWERLATTICE_FRICTION_INSIGHTS_STATE: AnswerlatticeFrictionInsightsLoadState = {
    scopeKey: null,
    snapshot: null,
    insight: null,
    loading: false,
    error: null,
};

export function getAnswerlatticeFrictionScopeKey(tId: number, sId: number): string | null {
    return Number.isSafeInteger(tId) && tId > 0 && Number.isSafeInteger(sId) && sId > 0
        ? `${tId}:${sId}`
        : null;
}

export function projectFrictionInsightsStateForScope(
    state: AnswerlatticeFrictionInsightsLoadState,
    tId: number,
    sId: number,
): AnswerlatticeFrictionInsightsVisibleState {
    const requestedScopeKey = getAnswerlatticeFrictionScopeKey(tId, sId);
    if (!requestedScopeKey) {
        return { snapshot: null, insight: null, loading: false, error: null };
    }
    if (state.scopeKey !== requestedScopeKey) {
        return { snapshot: null, insight: null, loading: true, error: null };
    }
    return {
        snapshot: state.snapshot,
        insight: state.insight,
        loading: state.loading,
        error: state.error,
    };
}
