/**
 * Answerlattice — Canonical Answers Hook
 * 
 * Provides data fetching and CRUD actions for the canonical answer editor.
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (Pillar 2)
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    getCanonicalAnswers,
    getCanonicalAnswerById,
    proposeCanonicalAnswerCreate,
    proposeCanonicalAnswerUpdate,
} from '@database/answerlattice/canonicalAnswers';
import { AnswerlatticeGovernanceClientError } from '@lib/answerlattice/governanceClient';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { AnswerlatticeCanonicalAnswer } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AnswerlatticeCanonicalAnswersLoadState,
    EMPTY_ANSWERLATTICE_CANONICAL_ANSWERS_STATE,
    getAnswerlatticeCanonicalAnswersScopeKey,
    projectCanonicalAnswersStateForScope,
} from './canonicalAnswersScopeState';

const ANSWERLATTICE_CANONICAL_ANSWERS_LOAD_FAILED = 'Could not load canonical answers';
const ANSWERLATTICE_CANONICAL_ANSWER_CREATE_FAILED = 'Could not create answer';
const ANSWERLATTICE_CANONICAL_ANSWER_UPDATE_FAILED = 'Could not update answer';

const getGovernanceActionMessage = (error: unknown, fallback: string) => (
    error instanceof AnswerlatticeGovernanceClientError ? error.message : fallback
);

interface UseCanonicalAnswersReturn {
    answers: AnswerlatticeCanonicalAnswer[];
    driftedAnswers: AnswerlatticeCanonicalAnswer[];
    loading: boolean;
    error: string | null;
    selectedAnswer: AnswerlatticeCanonicalAnswer | null;
    setSelectedAnswer: (answer: AnswerlatticeCanonicalAnswer | null) => void;
    create: (data: Omit<AnswerlatticeCanonicalAnswer, 'id'>) => Promise<boolean>;
    update: (data: Partial<AnswerlatticeCanonicalAnswer> & { id: string }) => Promise<boolean>;
    refresh: () => Promise<void>;
    loadAnswer: (answerId: string) => Promise<AnswerlatticeCanonicalAnswer | null>;
}

export function useCanonicalAnswers(tId: number, sId: number): UseCanonicalAnswersReturn {
    const [state, setState] = useState<AnswerlatticeCanonicalAnswersLoadState>(
        EMPTY_ANSWERLATTICE_CANONICAL_ANSWERS_STATE,
    );
    const [selectedState, setSelectedState] = useState<{
        scopeKey: string | null;
        answer: AnswerlatticeCanonicalAnswer | null;
    }>({ scopeKey: null, answer: null });
    const requestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!requestGuardRef.current) requestGuardRef.current = createLatestRequestGuard();

    const refresh = useCallback(async () => {
        const scopeKey = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI
            ? getAnswerlatticeCanonicalAnswersScopeKey(tId, sId)
            : null;
        const requestGuard = requestGuardRef.current;
        if (!requestGuard || !scopeKey) {
            requestGuard?.invalidate();
            setState(EMPTY_ANSWERLATTICE_CANONICAL_ANSWERS_STATE);
            return;
        }

        const requestId = requestGuard.begin();
        setState({ scopeKey, answers: [], loading: true, error: null });
        try {
            const allAnswers = await getCanonicalAnswers(tId, sId);
            if (!requestGuard.isCurrent(requestId)) return;
            setState({
                scopeKey,
                answers: allAnswers || [],
                loading: false,
                error: null,
            });
        } catch {
            if (!requestGuard.isCurrent(requestId)) return;
            setState({
                scopeKey,
                answers: [],
                loading: false,
                error: ANSWERLATTICE_CANONICAL_ANSWERS_LOAD_FAILED,
            });
        }
    }, [tId, sId]);

    useEffect(() => {
        setSelectedState({ scopeKey: null, answer: null });
        void refresh();
        return () => requestGuardRef.current?.invalidate();
    }, [refresh]);

    const setSelectedAnswer = useCallback((answer: AnswerlatticeCanonicalAnswer | null) => {
        const scopeKey = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI
            ? getAnswerlatticeCanonicalAnswersScopeKey(tId, sId)
            : null;
        setSelectedState({ scopeKey, answer: scopeKey ? answer : null });
    }, [tId, sId]);

    const create = useCallback(async (data: Omit<AnswerlatticeCanonicalAnswer, 'id'>): Promise<boolean> => {
        try {
            await proposeCanonicalAnswerCreate(data);
            message.success('New answer sent to Governance review');
            return true;
        } catch (error) {
            message.error(getGovernanceActionMessage(error, ANSWERLATTICE_CANONICAL_ANSWER_CREATE_FAILED));
            return false;
        }
    }, []);

    const update = useCallback(async (data: Partial<AnswerlatticeCanonicalAnswer> & { id: string }) => {
        try {
            const previous = await getCanonicalAnswerById(data.id);
            if (!previous || previous.tId !== tId || previous.sId !== sId) {
                throw new Error('Canonical answer is not available in this workspace.');
            }
            await proposeCanonicalAnswerUpdate({
                ...previous,
                ...data,
                answerType: data.answerType ?? previous.answerType,
                content: data.content ?? previous.content,
                scope: data.scope ?? previous.scope,
                productBinding: data.productBinding ?? previous.productBinding,
            });
            message.success('Answer update sent to Governance review');
            return true;
        } catch (error) {
            message.error(getGovernanceActionMessage(error, ANSWERLATTICE_CANONICAL_ANSWER_UPDATE_FAILED));
            return false;
        }
    }, [tId, sId]);

    const loadAnswer = useCallback(async (answerId: string): Promise<AnswerlatticeCanonicalAnswer | null> => {
        try {
            const result = await getCanonicalAnswerById(answerId);
            return result;
        } catch {
            return null;
        }
    }, []);

    const visibleState = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI
        ? projectCanonicalAnswersStateForScope(state, tId, sId)
        : { answers: [], loading: false, error: null };
    const currentScopeKey = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI
        ? getAnswerlatticeCanonicalAnswersScopeKey(tId, sId)
        : null;
    const selectedAnswer = selectedState.scopeKey === currentScopeKey
        ? selectedState.answer
        : null;

    return {
        ...visibleState,
        driftedAnswers: visibleState.answers.filter(
            answer => answer.governance?.driftFlag === true,
        ),
        selectedAnswer,
        setSelectedAnswer,
        create, update, refresh, loadAnswer,
    };
}
