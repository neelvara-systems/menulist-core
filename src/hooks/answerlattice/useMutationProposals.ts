/**
 * Answerlattice — Mutation Proposal Review Hook
 * 
 * Provides data fetching and actions for the mutation proposal review queue.
 * Feature-flagged: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §6
 */

import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { buildAnswerlatticeHookScopeKey } from '@lib/answerlattice/hookScopeBoundary';
import {
    approveDraftAsCanonicalAnswer,
    approveMutationProposal,
    getPendingMutationProposals,
    markMutationImplemented,
    regenerateMutationProposalDraft,
    rejectMutationProposal,
} from '@database/answerlattice/mutationProposals';
import type { AnswerlatticeGovernanceEditedContent } from '@lib/answerlattice/governanceContracts';
import { AnswerlatticeGovernanceClientError } from '@lib/answerlattice/governanceClient';
import { checkAnswerlatticeProposalImpact } from '@lib/answerlattice/proposalImpactClient';
import type { AnswerlatticeProposalImpactResponse } from '@lib/answerlattice/proposalImpactContracts';
import { AnswerlatticeMutationProposal } from '@type/answerlattice';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

const ANSWERLATTICE_MUTATION_PROPOSALS_LOAD_FAILED = 'Could not load proposals';
const ANSWERLATTICE_MUTATION_PROPOSAL_APPROVE_FAILED = 'Could not approve proposal';
const ANSWERLATTICE_MUTATION_PROPOSAL_REJECT_FAILED = 'Could not reject proposal';
const ANSWERLATTICE_MUTATION_PROPOSAL_IMPLEMENT_FAILED = 'Could not mark proposal as implemented';
const ANSWERLATTICE_MUTATION_DRAFT_PUBLISH_FAILED = 'Could not publish canonical answer';
const ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED = 'Could not generate draft';
const ANSWERLATTICE_MUTATION_PROPOSAL_IMPACT_FAILED = 'Could not check proposed answer';
const ANSWERLATTICE_WORKSPACE_SCOPE_MISSING = 'Answerlattice workspace scope is missing';

const getGovernanceActionMessage = (error: unknown, fallback: string) => (
    error instanceof AnswerlatticeGovernanceClientError ? error.message : fallback
);

type DraftApprovalContent = AnswerlatticeGovernanceEditedContent;

interface UseMutationProposalsReturn {
    proposals: AnswerlatticeMutationProposal[];
    loading: boolean;
    error: string | null;
    approve: (proposalId: string) => Promise<void>;
    reject: (proposalId: string) => Promise<void>;
    implement: (proposalId: string) => Promise<void>;
    approveDraft: (proposalId: string, editedContent: DraftApprovalContent, approvedBy: string) => Promise<void>;
    regenerateDraft: (proposalId: string) => Promise<void>;
    previewImpact: (
        proposalId: string,
        editedContent?: DraftApprovalContent,
    ) => Promise<AnswerlatticeProposalImpactResponse>;
    refresh: () => Promise<void>;
}

export function useMutationProposals(tId: number, sId: number): UseMutationProposalsReturn {
    const session = useClientAuthSession();
    const [proposals, setProposals] = useState<AnswerlatticeMutationProposal[]>([]);
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
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION || !requestScopeKey) {
            setProposals([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await getPendingMutationProposals(tId, sId);
            if (scopeKeyRef.current !== requestScopeKey || latestRefreshRef.current !== requestId) return;
            setProposals(result || []);
        } catch {
            if (scopeKeyRef.current !== requestScopeKey || latestRefreshRef.current !== requestId) return;
            setError(ANSWERLATTICE_MUTATION_PROPOSALS_LOAD_FAILED);
        } finally {
            if (scopeKeyRef.current === requestScopeKey && latestRefreshRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [scopeKey, tId, sId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const approve = useCallback(async (proposalId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        try {
            const result = await approveMutationProposal(proposalId);
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.success(result?.status === 'implemented'
                ? 'Proposal approved and answer updated'
                : 'Proposal approved');
            await refresh();
        } catch (error) {
            if (scopeKeyRef.current === operationScopeKey) {
                message.error(getGovernanceActionMessage(error, ANSWERLATTICE_MUTATION_PROPOSAL_APPROVE_FAILED));
            }
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh]);

    const reject = useCallback(async (proposalId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        try {
            await rejectMutationProposal(proposalId);
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.success('Proposal rejected');
            await refresh();
        } catch (error) {
            if (scopeKeyRef.current === operationScopeKey) {
                message.error(getGovernanceActionMessage(error, ANSWERLATTICE_MUTATION_PROPOSAL_REJECT_FAILED));
            }
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh]);

    const implement = useCallback(async (proposalId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) return;
        mutationInFlightRef.current = true;
        try {
            await markMutationImplemented(proposalId);
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.success('Proposal marked as implemented');
            await refresh();
        } catch (error) {
            if (scopeKeyRef.current === operationScopeKey) {
                message.error(getGovernanceActionMessage(error, ANSWERLATTICE_MUTATION_PROPOSAL_IMPLEMENT_FAILED));
            }
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh]);

    const approveDraft = useCallback(async (proposalId: string, editedContent: DraftApprovalContent, approvedBy: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) {
            throw new Error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
        }
        mutationInFlightRef.current = true;
        try {
            await approveDraftAsCanonicalAnswer(proposalId, editedContent, tId, sId, approvedBy);
            if (scopeKeyRef.current !== operationScopeKey) {
                throw new Error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
            }
            message.success('Canonical answer published');
            await refresh();
        } catch (error) {
            if (scopeKeyRef.current !== operationScopeKey) {
                throw new Error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
            }
            const errorMessage = getGovernanceActionMessage(error, ANSWERLATTICE_MUTATION_DRAFT_PUBLISH_FAILED);
            message.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh, sId, tId]);

    const regenerateDraft = useCallback(async (proposalId: string) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) {
            message.error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
            return;
        }

        mutationInFlightRef.current = true;
        try {
            const result = await regenerateMutationProposalDraft(proposalId);
            if (scopeKeyRef.current !== operationScopeKey) return;

            if (!result.success) {
                throw new Error(ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED);
            }

            message.success('Draft generated');
            await refresh();
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) return;
            message.error(ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED);
            throw new Error(ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED);
        } finally {
            mutationInFlightRef.current = false;
        }
    }, [refresh, sId, tId]);

    const previewImpact = useCallback(async (
        proposalId: string,
        editedContent?: DraftApprovalContent,
    ) => {
        const operationScopeKey = scopeKeyRef.current;
        if (!operationScopeKey || mutationInFlightRef.current) {
            throw new Error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
        }
        mutationInFlightRef.current = true;
        try {
            const result = await checkAnswerlatticeProposalImpact(proposalId, editedContent);
            if (scopeKeyRef.current !== operationScopeKey) {
                throw new Error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
            }
            return result;
        } catch {
            if (scopeKeyRef.current !== operationScopeKey) {
                throw new Error(ANSWERLATTICE_WORKSPACE_SCOPE_MISSING);
            }
            message.error(ANSWERLATTICE_MUTATION_PROPOSAL_IMPACT_FAILED);
            throw new Error(ANSWERLATTICE_MUTATION_PROPOSAL_IMPACT_FAILED);
        } finally {
            mutationInFlightRef.current = false;
        }
    }, []);

    return {
        proposals,
        loading,
        error,
        approve,
        reject,
        implement,
        approveDraft,
        regenerateDraft,
        previewImpact,
        refresh,
    };
}
