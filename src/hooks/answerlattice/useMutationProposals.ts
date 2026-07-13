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
import { AnswerlatticeMutationProposal } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const ANSWERLATTICE_MUTATION_PROPOSALS_LOAD_FAILED = 'Could not load proposals';
const ANSWERLATTICE_MUTATION_PROPOSAL_APPROVE_FAILED = 'Could not approve proposal';
const ANSWERLATTICE_MUTATION_PROPOSAL_REJECT_FAILED = 'Could not reject proposal';
const ANSWERLATTICE_MUTATION_PROPOSAL_IMPLEMENT_FAILED = 'Could not mark proposal as implemented';
const ANSWERLATTICE_MUTATION_DRAFT_PUBLISH_FAILED = 'Could not publish canonical answer';
const ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED = 'Could not generate draft';
const ANSWERLATTICE_WORKSPACE_SCOPE_MISSING = 'Answerlattice workspace scope is missing';

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
    regenerateDraft: (proposalId: string) => Promise<void>;
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
        } catch {
            setError(ANSWERLATTICE_MUTATION_PROPOSALS_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const approve = useCallback(async (proposalId: string) => {
        try {
            const result = await approveMutationProposal(proposalId);
            message.success(result?.status === 'implemented'
                ? 'Proposal approved and answer updated'
                : 'Proposal approved');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_MUTATION_PROPOSAL_APPROVE_FAILED);
        }
    }, [refresh]);

    const reject = useCallback(async (proposalId: string) => {
        try {
            await rejectMutationProposal(proposalId);
            message.success('Proposal rejected');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_MUTATION_PROPOSAL_REJECT_FAILED);
        }
    }, [refresh]);

    const implement = useCallback(async (proposalId: string) => {
        try {
            await markMutationImplemented(proposalId);
            message.success('Proposal marked as implemented');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_MUTATION_PROPOSAL_IMPLEMENT_FAILED);
        }
    }, [refresh]);

    const approveDraft = useCallback(async (proposalId: string, editedContent: DraftApprovalContent, approvedBy: string) => {
        try {
            await approveDraftAsCanonicalAnswer(proposalId, editedContent, tId, sId, approvedBy);
            message.success('Canonical answer published');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_MUTATION_DRAFT_PUBLISH_FAILED);
            throw new Error(ANSWERLATTICE_MUTATION_DRAFT_PUBLISH_FAILED);
        }
    }, [refresh, sId, tId]);

    const regenerateDraft = useCallback(async (proposalId: string) => {
        if (!tId || !sId) {
            message.error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
            return;
        }

        try {
            const result = await regenerateMutationProposalDraft(proposalId);

            if (!result.success) {
                throw new Error(ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED);
            }

            message.success('Draft generated');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED);
            throw new Error(ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED);
        }
    }, [refresh, sId, tId]);

    return { proposals, loading, error, approve, reject, implement, approveDraft, regenerateDraft, refresh };
}
