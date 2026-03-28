/**
 * Canonica — Canonical Answers Hook
 * 
 * Provides data fetching and CRUD actions for the canonical answer editor.
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (Pillar 2)
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    getCanonicalAnswers,
    getCanonicalAnswerById,
    addCanonicalAnswer,
    updateCanonicalAnswer,
    getDriftedAnswers,
} from '@database/canonica/canonicalAnswers';
import { addAuditLog } from '@database/canonica/auditLogs';
import { CanonicaCanonicalAnswer } from '@type/canonica';
import { message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

interface UseCanonicalAnswersReturn {
    answers: CanonicaCanonicalAnswer[];
    driftedAnswers: CanonicaCanonicalAnswer[];
    loading: boolean;
    error: string | null;
    selectedAnswer: CanonicaCanonicalAnswer | null;
    setSelectedAnswer: (answer: CanonicaCanonicalAnswer | null) => void;
    create: (data: Omit<CanonicaCanonicalAnswer, 'id'>) => Promise<CanonicaCanonicalAnswer | null>;
    update: (data: Partial<CanonicaCanonicalAnswer> & { id: string }) => Promise<void>;
    refresh: () => Promise<void>;
    loadAnswer: (answerId: string) => Promise<CanonicaCanonicalAnswer | null>;
}

export function useCanonicalAnswers(tId: number, sId: number): UseCanonicalAnswersReturn {
    const [answers, setAnswers] = useState<CanonicaCanonicalAnswer[]>([]);
    const [driftedAnswers, setDriftedAnswers] = useState<CanonicaCanonicalAnswer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<CanonicaCanonicalAnswer | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI || !tId || !sId) return;

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
            setError(err instanceof Error ? err.message : 'Failed to load canonical answers');
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const create = useCallback(async (data: Omit<CanonicaCanonicalAnswer, 'id'>): Promise<CanonicaCanonicalAnswer | null> => {
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
            message.error(err instanceof Error ? err.message : 'Failed to create answer');
            return null;
        }
    }, [tId, sId, refresh]);

    const update = useCallback(async (data: Partial<CanonicaCanonicalAnswer> & { id: string }) => {
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
            message.error(err instanceof Error ? err.message : 'Failed to update answer');
        }
    }, [tId, sId, refresh]);

    const loadAnswer = useCallback(async (answerId: string): Promise<CanonicaCanonicalAnswer | null> => {
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
