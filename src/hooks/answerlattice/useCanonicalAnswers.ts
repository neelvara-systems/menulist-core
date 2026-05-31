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
    addCanonicalAnswer,
    updateCanonicalAnswer,
    getDriftedAnswers,
} from '@database/answerlattice/canonicalAnswers';
import { addAuditLog } from '@database/answerlattice/auditLogs';
import { getAnswerlatticeUiErrorMessage } from '@lib/answerlattice/uiErrors';
import { AnswerlatticeCanonicalAnswer } from '@type/answerlattice';
import { message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

interface UseCanonicalAnswersReturn {
    answers: AnswerlatticeCanonicalAnswer[];
    driftedAnswers: AnswerlatticeCanonicalAnswer[];
    loading: boolean;
    error: string | null;
    selectedAnswer: AnswerlatticeCanonicalAnswer | null;
    setSelectedAnswer: (answer: AnswerlatticeCanonicalAnswer | null) => void;
    create: (data: Omit<AnswerlatticeCanonicalAnswer, 'id'>) => Promise<AnswerlatticeCanonicalAnswer | null>;
    update: (data: Partial<AnswerlatticeCanonicalAnswer> & { id: string }) => Promise<void>;
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
        } catch (err) {
            setError(getAnswerlatticeUiErrorMessage(err, 'Could not load canonical answers'));
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<AnswerlatticeCanonicalAnswer, 'id'>): Promise<AnswerlatticeCanonicalAnswer | null> => {
        try {
            const result = await addCanonicalAnswer(data);
            if (result) {
                await addAuditLog({
                    tId, sId,
                    action: 'canonical_answer_created',
                    entityType: 'canonicalAnswer',
                    entityId: result.id,
                    previousState: undefined,
                    newState: { title: data.title, entityIds: data.scope?.entityIds },
                    performedBy: 'admin',
                    timestamp: Timestamp.now(),
                });
                message.success('Canonical answer created');
                await refresh();
            }
            return result;
        } catch (err) {
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not create answer'));
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<AnswerlatticeCanonicalAnswer> & { id: string }) => {
        try {
            await updateCanonicalAnswer(data);
            await addAuditLog({
                tId, sId,
                action: 'canonical_answer_updated',
                entityType: 'canonicalAnswer',
                entityId: data.id,
                previousState: undefined,
                newState: { fields: Object.keys(data).filter(k => k !== 'id') },
                performedBy: 'admin',
                timestamp: Timestamp.now(),
            });
            message.success('Answer updated');
            await refresh();
        } catch (err) {
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not update answer'));
        }
    }, [tId, sId, refresh]);

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
