/**
 * Answerlattice — Entity Candidate Review Hook
 * 
 * Provides data fetching and actions for the entity candidate review queue.
 * Feature-flagged: ENABLE_ANSWERLATTICE_ONTOLOGY
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §7
 */

import { FEATURE_FLAGS } from '@config/features';
import { buildAnswerlatticeHookScopeKey } from '@lib/answerlattice/hookScopeBoundary';
import {
    getPendingCandidates,
    rejectCandidateStatus,
    promoteCandidate,
    mergeCandidateStatus,
} from '@database/answerlattice/entityCandidates';
import { AnswerlatticeEntityCandidate } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useClientAuthSession } from '@hook/useClientAuthSession';

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
    const session = useClientAuthSession();
    const [candidates, setCandidates] = useState<AnswerlatticeEntityCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestedScopeKey = buildAnswerlatticeHookScopeKey(tId, sId);
    const sessionScopeKey = buildAnswerlatticeHookScopeKey(session?.tId, session?.sId);
    const scopeKey = requestedScopeKey === sessionScopeKey ? requestedScopeKey : null;
    const scopeKeyRef = useRef(scopeKey);
    const latestRefreshRef = useRef(0);
    const mutationInFlightRef = useRef(false);
    scopeKeyRef.current = scopeKey;

    const refresh = useCallback(async () => {
        const requestScopeKey = scopeKey;
        const requestId = latestRefreshRef.current + 1;
        latestRefreshRef.current = requestId;
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY || !requestScopeKey) {
            setCandidates([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await getPendingCandidates(tId, sId);
            if (scopeKeyRef.current !== requestScopeKey || latestRefreshRef.current !== requestId) return;
            setCandidates(result || []);
        } catch {
            if (scopeKeyRef.current !== requestScopeKey || latestRefreshRef.current !== requestId) return;
            setError(ANSWERLATTICE_ENTITY_CANDIDATES_LOAD_FAILED);
        } finally {
            if (scopeKeyRef.current === requestScopeKey && latestRefreshRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [scopeKey, tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const reject = useCallback(async (candidateId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        try {
            await rejectCandidateStatus(candidateId);
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.success('Candidate rejected');
            await refresh();
        } catch {
            if (scopeKeyRef.current === operationScopeKey) {
                message.error(ANSWERLATTICE_ENTITY_CANDIDATE_REJECT_FAILED);
            }
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh]);

    const promote = useCallback(async (candidateId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        try {
            await promoteCandidate(candidateId, tId, sId);
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.success('Candidate promoted to entity');
            await refresh();
        } catch {
            if (scopeKeyRef.current === operationScopeKey) {
                message.error(ANSWERLATTICE_ENTITY_CANDIDATE_PROMOTE_FAILED);
            }
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [tId, sId, refresh]);

    const merge = useCallback(async (candidateId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        try {
            await mergeCandidateStatus(candidateId);
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.success('Candidate marked as merged');
            await refresh();
        } catch {
            if (scopeKeyRef.current === operationScopeKey) {
                message.error(ANSWERLATTICE_ENTITY_CANDIDATE_MERGE_FAILED);
            }
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh]);

    return { candidates, loading, error, reject, promote, merge, refresh };
}
