/**
 * Canonica — Entity Candidate Review Hook
 * 
 * Provides data fetching and actions for the entity candidate review queue.
 * Feature-flagged: ENABLE_CANONICA_ONTOLOGY
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md §7
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    getPendingCandidates,
    approveCandidateStatus,
    rejectCandidateStatus,
    promoteCandidate,
    mergeCandidateStatus,
} from '@database/canonica/entityCandidates';
import { CanonicaEntityCandidate } from '@type/canonica';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

interface UseEntityCandidatesReturn {
    candidates: CanonicaEntityCandidate[];
    loading: boolean;
    error: string | null;
    approve: (candidateId: string) => Promise<void>;
    reject: (candidateId: string) => Promise<void>;
    promote: (candidateId: string) => Promise<void>;
    merge: (candidateId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useEntityCandidates(tId: number, sId: number): UseEntityCandidatesReturn {
    const [candidates, setCandidates] = useState<CanonicaEntityCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_ONTOLOGY || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getPendingCandidates(tId, sId);
            setCandidates(result || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const approve = useCallback(async (candidateId: string) => {
        try {
            await approveCandidateStatus(candidateId);
            message.success('Candidate approved');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to approve');
        }
    }, [refresh]);

    const reject = useCallback(async (candidateId: string) => {
        try {
            await rejectCandidateStatus(candidateId);
            message.success('Candidate rejected');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to reject');
        }
    }, [refresh]);

    const promote = useCallback(async (candidateId: string) => {
        try {
            await promoteCandidate(candidateId, tId, sId);
            message.success('Candidate promoted to entity');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to promote');
        }
    }, [tId, sId, refresh]);

    const merge = useCallback(async (candidateId: string) => {
        try {
            await mergeCandidateStatus(candidateId);
            message.success('Candidate marked as merged');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to merge');
        }
    }, [refresh]);

    return { candidates, loading, error, approve, reject, promote, merge, refresh };
}
