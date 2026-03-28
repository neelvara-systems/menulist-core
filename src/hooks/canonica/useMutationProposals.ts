/**
 * Canonica — Mutation Proposal Review Hook
 * 
 * Provides data fetching and actions for the mutation proposal review queue.
 * Feature-flagged: ENABLE_CANONICA_SIGNAL_MUTATION
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    approveMutationProposal,
    getPendingMutationProposals,
    rejectMutationProposal,
    markMutationImplemented,
} from '@database/canonica/mutationProposals';
import { CanonicaMutationProposal } from '@type/canonica';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

interface UseMutationProposalsReturn {
    proposals: CanonicaMutationProposal[];
    loading: boolean;
    error: string | null;
    approve: (proposalId: string) => Promise<void>;
    reject: (proposalId: string) => Promise<void>;
    implement: (proposalId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useMutationProposals(tId: number, sId: number): UseMutationProposalsReturn {
    const [proposals, setProposals] = useState<CanonicaMutationProposal[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getPendingMutationProposals(tId, sId);
            setProposals(result || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load proposals');
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const approve = useCallback(async (proposalId: string) => {
        try {
            await approveMutationProposal(proposalId);
            message.success('Proposal approved');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to approve');
        }
    }, [refresh]);

    const reject = useCallback(async (proposalId: string) => {
        try {
            await rejectMutationProposal(proposalId);
            message.success('Proposal rejected');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to reject');
        }
    }, [refresh]);

    const implement = useCallback(async (proposalId: string) => {
        try {
            await markMutationImplemented(proposalId);
            message.success('Proposal marked as implemented');
            await refresh();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to mark implemented');
        }
    }, [refresh]);

    return { proposals, loading, error, approve, reject, implement, refresh };
}
