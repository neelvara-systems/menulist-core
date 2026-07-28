import type { AnswerlatticeCanonicalAnswer } from '@type/answerlattice';

export interface AnswerlatticeCanonicalAnswersLoadState {
    scopeKey: string | null;
    answers: AnswerlatticeCanonicalAnswer[];
    loading: boolean;
    error: string | null;
}

export type AnswerlatticeCanonicalAnswersVisibleState = Omit<
    AnswerlatticeCanonicalAnswersLoadState,
    'scopeKey'
>;

export const EMPTY_ANSWERLATTICE_CANONICAL_ANSWERS_STATE: AnswerlatticeCanonicalAnswersLoadState = {
    scopeKey: null,
    answers: [],
    loading: false,
    error: null,
};

export function getAnswerlatticeCanonicalAnswersScopeKey(
    tId: number,
    sId: number,
): string | null {
    return Number.isSafeInteger(tId) && tId > 0 && Number.isSafeInteger(sId) && sId > 0
        ? `${tId}:${sId}`
        : null;
}

export function projectCanonicalAnswersStateForScope(
    state: AnswerlatticeCanonicalAnswersLoadState,
    tId: number,
    sId: number,
): AnswerlatticeCanonicalAnswersVisibleState {
    const requestedScopeKey = getAnswerlatticeCanonicalAnswersScopeKey(tId, sId);
    if (!requestedScopeKey) {
        return { answers: [], loading: false, error: null };
    }
    if (state.scopeKey !== requestedScopeKey) {
        return { answers: [], loading: true, error: null };
    }
    return {
        answers: state.answers,
        loading: state.loading,
        error: state.error,
    };
}
