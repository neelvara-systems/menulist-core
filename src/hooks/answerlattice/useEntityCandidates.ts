/**
 * Answerlattice — Entity Candidate Review Hook
 * 
 * Provides data fetching and actions for the entity candidate review queue.
 * Feature-flagged: ENABLE_ANSWERLATTICE_ONTOLOGY
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §7
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    getPendingCandidates,
    rejectCandidateStatus,
    promoteCandidate,
    mergeCandidateStatus,
} from '@database/answerlattice/entityCandidates';
import { AnswerlatticeEntityCandidate } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const ANSWERLATTICE_ENTITY_CANDIDATES_LOAD_FAILED = 'Could not load candidates';
const ANSWERLATTICE_ENTITY_CANDIDATE_REJECT_FAILED = 'Could not reject candidate';
const ANSWERLATTICE_ENTITY_CANDIDATE_PROMOTE_FAILED = 'Could not promote candidate';
const ANSWERLATTICE_ENTITY_CANDIDATE_MERGE_FAILED = 'Could not merge candidate';

interface UseEntityCandidatesReturn {
    candidates: AnswerlatticeEntityCandidate[];
    loading: boolean;
    error: string | null;
    reject: (candidateId: string) => Promise<void>;
    promote: (candidateId: string) => Promise<void>;
    merge: (candidateId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useEntityCandidates(tId: number, sId: number): UseEntityCandidatesReturn {
    const [candidates, setCandidates] = useState<AnswerlatticeEntityCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getPendingCandidates(tId, sId);
            setCandidates(result || []);
        } catch {
            setError(ANSWERLATTICE_ENTITY_CANDIDATES_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const reject = useCallback(async (candidateId: string) => {
        try {
            await rejectCandidateStatus(candidateId);
            message.success('Candidate rejected');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_CANDIDATE_REJECT_FAILED);
        }
    }, [refresh]);

    const promote = useCallback(async (candidateId: string) => {
        try {
            await promoteCandidate(candidateId, tId, sId);
            message.success('Candidate promoted to entity');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_CANDIDATE_PROMOTE_FAILED);
        }
    }, [tId, sId, refresh]);

    const merge = useCallback(async (candidateId: string) => {
        try {
            await mergeCandidateStatus(candidateId);
            message.success('Candidate marked as merged');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_ENTITY_CANDIDATE_MERGE_FAILED);
        }
    }, [refresh]);

    return { candidates, loading, error, reject, promote, merge, refresh };
}
