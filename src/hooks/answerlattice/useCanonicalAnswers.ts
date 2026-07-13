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
    getDriftedAnswers,
    proposeCanonicalAnswerCreate,
    proposeCanonicalAnswerUpdate,
} from '@database/answerlattice/canonicalAnswers';
import { AnswerlatticeCanonicalAnswer } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const ANSWERLATTICE_CANONICAL_ANSWERS_LOAD_FAILED = 'Could not load canonical answers';
const ANSWERLATTICE_CANONICAL_ANSWER_CREATE_FAILED = 'Could not create answer';
const ANSWERLATTICE_CANONICAL_ANSWER_UPDATE_FAILED = 'Could not update answer';

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
    const [answers, setAnswers] = useState<AnswerlatticeCanonicalAnswer[]>([]);
    const [driftedAnswers, setDriftedAnswers] = useState<AnswerlatticeCanonicalAnswer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<AnswerlatticeCanonicalAnswer | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const [allAnswers, drifted] = await Promise.all([
                getCanonicalAnswers(tId, sId),
                getDriftedAnswers(tId, sId),
            ]);
            setAnswers(allAnswers || []);
            setDriftedAnswers(drifted || []);
        } catch {
            setError(ANSWERLATTICE_CANONICAL_ANSWERS_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<AnswerlatticeCanonicalAnswer, 'id'>): Promise<boolean> => {
        try {
            await proposeCanonicalAnswerCreate(data);
            message.success('New answer sent to Governance review');
            return true;
        } catch {
            message.error(ANSWERLATTICE_CANONICAL_ANSWER_CREATE_FAILED);
            return false;
        }
    }, []);

    const update = useCallback(async (data: Partial<AnswerlatticeCanonicalAnswer> & { id: string }) => {
        try {
            const previous = await getCanonicalAnswerById(data.id);
            if (!previous || Number(previous.tId) !== Number(tId) || Number(previous.sId) !== Number(sId)) {
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
        } catch {
            message.error(ANSWERLATTICE_CANONICAL_ANSWER_UPDATE_FAILED);
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

    return {
        answers, driftedAnswers, loading, error,
        selectedAnswer, setSelectedAnswer,
        create, update, refresh, loadAnswer,
    };
}
