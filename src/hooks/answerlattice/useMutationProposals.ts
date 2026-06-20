/**
 * Answerlattice — Mutation Proposal Review Hook
 * 
 * Provides data fetching and actions for the mutation proposal review queue.
 * Feature-flagged: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    approveDraftAsCanonicalAnswer,
    approveMutationProposal,
    getPendingMutationProposals,
    markMutationImplemented,
    regenerateMutationProposalDraft,
    rejectMutationProposal,
} from '@database/answerlattice/mutationProposals';
import { getAnswerlatticeUiErrorMessage } from '@lib/answerlattice/uiErrors';
import { AnswerlatticeMutationProposal } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

type DraftApprovalContent = {
    title?: string;
    structuredSummary?: string;
    detailedExplanation?: string;
    edgeCases?: string;
    constraints?: string;
};

interface UseMutationProposalsReturn {
    proposals: AnswerlatticeMutationProposal[];
    loading: boolean;
    error: string | null;
    approve: (proposalId: string) => Promise<void>;
    reject: (proposalId: string) => Promise<void>;
    implement: (proposalId: string) => Promise<void>;
    approveDraft: (proposalId: string, editedContent: DraftApprovalContent, approvedBy: string) => Promise<void>;
    regenerateDraft: (proposalId: string, regeneratedBy: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useMutationProposals(tId: number, sId: number): UseMutationProposalsReturn {
    const [proposals, setProposals] = useState<AnswerlatticeMutationProposal[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION || !tId || !sId) return;

        setLoading(true);
        setError(null);
        try {
            const result = await getPendingMutationProposals(tId, sId);
            setProposals(result || []);
        } catch (err) {
            setError(getAnswerlatticeUiErrorMessage(err, 'Could not load proposals'));
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
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not approve proposal'));
        }
    }, [refresh]);

    const reject = useCallback(async (proposalId: string) => {
        try {
            await rejectMutationProposal(proposalId);
            message.success('Proposal rejected');
            await refresh();
        } catch (err) {
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not reject proposal'));
        }
    }, [refresh]);

    const implement = useCallback(async (proposalId: string) => {
        try {
            await markMutationImplemented(proposalId);
            message.success('Proposal marked as implemented');
            await refresh();
        } catch (err) {
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not mark proposal as implemented'));
        }
    }, [refresh]);

    const approveDraft = useCallback(async (proposalId: string, editedContent: DraftApprovalContent, approvedBy: string) => {
        try {
            await approveDraftAsCanonicalAnswer(proposalId, editedContent, tId, sId, approvedBy);
            message.success('Canonical answer published');
            await refresh();
        } catch (err) {
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not publish canonical answer'));
            throw err;
        }
    }, [refresh, sId, tId]);

    const regenerateDraft = useCallback(async (proposalId: string, regeneratedBy: string) => {
        if (!tId || !sId) {
            message.error('Answerlattice workspace scope is missing');
            return;
        }

        try {
            const result = await regenerateMutationProposalDraft(proposalId, regeneratedBy);

            if (!result.success) {
                throw new Error(result.error || 'Draft generation failed');
            }

            message.success('Draft generated');
            await refresh();
        } catch (err) {
            message.error(getAnswerlatticeUiErrorMessage(err, 'Could not generate draft'));
            throw err;
        }
    }, [refresh, sId, tId]);

    return { proposals, loading, error, approve, reject, implement, approveDraft, regenerateDraft, refresh };
}
