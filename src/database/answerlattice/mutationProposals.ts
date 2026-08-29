/**
 * Answerlattice — Mutation Proposals DAL (Signal Mutation Engine)
 * 
 * Pillar 4 of 5 — Governed mutation queue.
 * Signals propose mutations. Humans approve. System enforces consistency.
 * 
 * RULES:
 * - Proposals do NOT auto-modify CanonicalAnswer
 * - All mutations require human approval
 * - Cannot bypass entity binding
 * - Cannot create overlapping version windows
 * - All mutations logged to audit trail
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from '@constant/product';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { runAnswerlatticeGovernanceAction } from '@lib/answerlattice/governanceClient';
import { AnswerlatticeStoredMutationProposalSchema } from '@lib/answerlattice/governanceContracts';
import { normalizeAnswerlatticeMutationProposalId } from '@lib/answerlattice/governanceIdBoundary';
import { buildAnswerlatticeManualMutationProposalId } from '@lib/answerlattice/mutationProposalIdentity';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { createRuntimeId } from '@lib/runtime/randomId';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { AnswerlatticeMutationProposal } from "@type/answerlattice";

const ANSWERLATTICE_DRAFT_REGENERATION_FAILED = 'Draft generation failed';
const ANSWERLATTICE_DRAFT_REGENERATION_RESPONSE_MAX_BYTES = 16 * 1024;
const ANSWERLATTICE_DRAFT_REGENERATION_REQUEST_POLICY: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS;
const MAX_PENDING_DRAFT_RETRY_KEYS = 50;
const pendingDraftRequestIds = new Map<string, string>();

const getDraftRetryRequestId = (proposalId: string): string => {
    const existing = pendingDraftRequestIds.get(proposalId);
    if (existing) return existing;
    if (pendingDraftRequestIds.size >= MAX_PENDING_DRAFT_RETRY_KEYS) {
        const oldest = pendingDraftRequestIds.keys().next().value;
        if (oldest) pendingDraftRequestIds.delete(oldest);
    }
    const requestId = createRuntimeId('al_draft');
    pendingDraftRequestIds.set(proposalId, requestId);
    return requestId;
};

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getActiveScope = async (expected?: { tId?: unknown; sId?: unknown }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('Answerlattice workspace scope is required');
    if (expected?.tId !== undefined && expected.tId !== scope.tenantId) throw new Error('Answerlattice tenant scope mismatch');
    if (expected?.sId !== undefined && expected.sId !== scope.storeId) throw new Error('Answerlattice workspace scope mismatch');
    return { tId: scope.tenantId, sId: scope.storeId };
};
const getDocRef = (docId: string) => {
    const normalizedDocId = normalizeAnswerlatticeMutationProposalId(docId);
    if (!normalizedDocId) throw new Error('Invalid mutation proposal id');
    return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);
};

const isStoredMutationProposal = (value: unknown): value is AnswerlatticeMutationProposal => (
    AnswerlatticeStoredMutationProposalSchema.safeParse(value).success
);

const parseStoredProposal = (documentId: string, value: unknown): AnswerlatticeMutationProposal | null => {
    const parsed = AnswerlatticeStoredMutationProposalSchema.safeParse({
        ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}),
        id: documentId,
    });
    if (parsed.success && isStoredMutationProposal(parsed.data)) return parsed.data;

    logRuntimeFailure('answerlattice_mutation_proposal_document_invalid', undefined, {
        surface: 'answerlattice_mutation_proposals',
        ...getBoundedRuntimeStringContext('proposalId', documentId),
    });
    return null;
};

type DraftRegenerationResponse = {
    ok?: boolean;
    success: true;
};

const isDraftRegenerationResponse = (value: unknown): value is DraftRegenerationResponse => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as { success?: unknown }).success === true
);

const getDraftRegenerationResponseLogContext = (response: Response, proposalId: string) => ({
    surface: 'answerlattice_mutation_proposals',
    ...getBoundedRuntimeStringContext('proposalId', proposalId),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readDraftRegenerationResponse = async (
    response: Response,
    proposalId: string,
): Promise<DraftRegenerationResponse> => {
    const context = getDraftRegenerationResponseLogContext(response, proposalId);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_DRAFT_REGENERATION_RESPONSE_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('answerlattice_draft_regeneration_response_parse_failed', error, context);
        throw new Error(ANSWERLATTICE_DRAFT_REGENERATION_FAILED);
    }

    if (!response.ok) {
        logRuntimeFailure('answerlattice_draft_regeneration_response_rejected', undefined, context);
        throw new Error(ANSWERLATTICE_DRAFT_REGENERATION_FAILED);
    }

    if (!isDraftRegenerationResponse(payload)) {
        logRuntimeFailure('answerlattice_draft_regeneration_response_invalid', undefined, context);
        throw new Error(ANSWERLATTICE_DRAFT_REGENERATION_FAILED);
    }

    return payload;
};

/**
 * Get all mutation proposals for a tenant+store
 */
export const getMutationProposals = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const scope = await getActiveScope({ tId, sId });
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                orderBy('createdOn', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeMutationProposal[] = [];
            snapshot.forEach((d) => {
                const proposal = parseStoredProposal(d.id, d.data());
                if (proposal) list.push(proposal);
            });
            return list;
        },
        "getMutationProposals"
    );
};

/**
 * Get pending mutation proposals (awaiting review)
 */
export const getPendingMutationProposals = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const scope = await getActiveScope({ tId, sId });
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('status', '==', 'pending_review'),
                orderBy('createdOn', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeMutationProposal[] = [];
            snapshot.forEach((d) => {
                const proposal = parseStoredProposal(d.id, d.data());
                if (proposal) list.push(proposal);
            });
            return list;
        },
        "getPendingMutationProposals"
    );
};

/**
 * Get a single mutation proposal by ID
 */
export const getMutationProposalById = async (proposalId: string) => {
    return await apiCallComposer(
        async () => {
            const scope = await getActiveScope();
            const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);
            if (!normalizedProposalId) return null;
            const docSnap = await getDoc(getDocRef(normalizedProposalId));
            if (docSnap.exists()) {
                const proposal = parseStoredProposal(docSnap.id, docSnap.data());
                return proposal
                    && proposal.pId === PRODUCT_IDS.ANSWERLATTICE
                    && proposal.tId === scope.tId
                    && proposal.sId === scope.sId
                    ? proposal
                    : null;
            }
            return null;
        },
        "getMutationProposalById"
    );
};

export const regenerateMutationProposalDraft = async (proposalId: string) => {
    return apiCallComposer(
        async () => {
            const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);
            if (!normalizedProposalId) {
                throw new Error(ANSWERLATTICE_DRAFT_REGENERATION_FAILED);
            }
            const requestId = getDraftRetryRequestId(normalizedProposalId);
            const response = await fetch('/api/answerlattice/mutation-proposals/regenerate-draft', {
                ...ANSWERLATTICE_DRAFT_REGENERATION_REQUEST_POLICY,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ proposalId: normalizedProposalId, requestId }),
            });

            const result = await readDraftRegenerationResponse(response, normalizedProposalId);
            pendingDraftRequestIds.delete(normalizedProposalId);
            return result;
        },
        { proposalId },
        'regenerateMutationProposalDraft',
    );
};

/**
 * Create a new mutation proposal
 */
export const addMutationProposal = async (data: Omit<AnswerlatticeMutationProposal, 'id' | 'pId'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                status: 'pending_review',
            }, { isNew: true });
            const validation = AnswerlatticeStoredMutationProposalSchema.safeParse({
                ...submitData,
                id: 'proposal_validation',
            });
            if (!validation.success) throw new Error('Invalid mutation proposal data');
            const deterministicId = buildAnswerlatticeManualMutationProposalId({
                tId: submitData.tId,
                sId: submitData.sId,
                requestId: submitData.requestId,
            });
            const proposalRef = deterministicId ? getDocRef(deterministicId) : doc(getCollectionRef());
            const auditRef = doc(
                answerlatticeFirebaseClient,
                DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS,
                `manual_created_${proposalRef.id}`,
            );
            const batch = writeBatch(answerlatticeFirebaseClient);
            batch.set(proposalRef, submitData);
            batch.set(auditRef, {
                pId: submitData.pId,
                tId: submitData.tId,
                sId: submitData.sId,
                action: 'mutation_proposal_created_manual',
                entityType: 'mutationProposal',
                entityId: proposalRef.id,
                previousState: null,
                newState: {
                    mutationType: submitData.mutationType,
                    relatedEntityIds: submitData.relatedEntityIds,
                    source: submitData.suggestedChange?.draftSource || 'manual_authoring',
                },
                uId: submitData.uId,
                performedBy: String(submitData.uId),
                timestamp: serverTimestamp(),
            });
            try {
                await batch.commit();
            } catch (writeError) {
                if (!deterministicId) throw writeError;
                const existingSnapshot = await getDoc(proposalRef);
                const existing = existingSnapshot.exists()
                    ? parseStoredProposal(existingSnapshot.id, existingSnapshot.data())
                    : null;
                if (
                    existing
                    && existing.requestId === submitData.requestId
                    && existing.tId === submitData.tId
                    && existing.sId === submitData.sId
                    && existing.targetAnswerId === submitData.targetAnswerId
                    && existing.mutationType === submitData.mutationType
                    && existing.relatedEntityIds.length === submitData.relatedEntityIds.length
                    && existing.relatedEntityIds.every((entityId, index) => entityId === submitData.relatedEntityIds[index])
                ) return existing;
                if (existing) throw new Error('answerlattice_mutation_proposal_replay_conflict');
                throw writeError;
            }
            const stored = parseStoredProposal(proposalRef.id, submitData);
            if (!stored) throw new Error('Invalid stored mutation proposal data');
            return stored;
        },
        data,
        "addMutationProposal"
    );
};

/**
 * Approve a mutation proposal
 * Guard: Only pending_review proposals can be approved.
 */
export const approveMutationProposal = async (proposalId: string) => {
    const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);
    return await apiCallComposer(
        () => {
            if (!normalizedProposalId) {
                throw new Error('Invalid proposal ID');
            }
            return runAnswerlatticeGovernanceAction({
                action: 'approve_proposal',
                proposalId: normalizedProposalId,
            });
        },
        { proposalId: normalizedProposalId },
        "approveMutationProposal"
    );
};

/**
 * Reject a mutation proposal
 * Guard: Only pending_review proposals can be rejected.
 */
export const rejectMutationProposal = async (proposalId: string) => {
    const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);
    return await apiCallComposer(
        () => {
            if (!normalizedProposalId) {
                throw new Error('Invalid proposal ID');
            }
            return runAnswerlatticeGovernanceAction({
                action: 'reject_proposal',
                proposalId: normalizedProposalId,
            });
        },
        { proposalId: normalizedProposalId },
        "rejectMutationProposal"
    );
};

/**
 * Mark a mutation proposal as implemented
 * Guard: Only approved proposals can be marked implemented.
 */
export const markMutationImplemented = async (proposalId: string) => {
    const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);
    return await apiCallComposer(
        () => {
            if (!normalizedProposalId) {
                throw new Error('Invalid proposal ID');
            }
            return runAnswerlatticeGovernanceAction({
                action: 'mark_implemented',
                proposalId: normalizedProposalId,
            });
        },
        { proposalId: normalizedProposalId },
        "markMutationImplemented"
    );
};

// ═══════════════════════════════════════════════════════════════
// AUTOMATIC KNOWLEDGE CREATION — Draft Approval (Expansion Item #4)
// One-click: approve draft → create canonical answer → create search index
// Feature-flagged: ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
// @see __docs__/answerlattice/automatic-knowledge-creation/
// ═══════════════════════════════════════════════════════════════

/**
 * Approve a draft proposal and create a canonical answer from it.
 * 
 * Flow:
 * 1. Validate proposal is pending_review with a generated draft
 * 2. Create canonical answer from draft content (with optional edits)
 * 3. Create search index entry for the new answer's entities
 * 4. Mark proposal as implemented
 * 5. Audit log
 * 
 * @param proposalId - The mutation proposal with a generated draft
 * @param editedContent - Optional founder edits to override draft fields
 * @param tId - Tenant ID
 * @param sId - Store ID
 * @param approvedBy - Who approved (user identifier)
 */
export const approveDraftAsCanonicalAnswer = async (
    proposalId: string,
    editedContent: {
        title?: string;
        structuredSummary?: string;
        detailedExplanation?: string;
        edgeCases?: string;
        constraints?: string;
    } | null,
    entityIds: string[],
    _tId: number,
    _sId: number,
    _approvedBy: string
) => {
    return await apiCallComposer(
        () => {
            const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);
            if (!normalizedProposalId) {
                throw new Error('Invalid proposal ID');
            }
            return runAnswerlatticeGovernanceAction({
                action: 'approve_proposal',
                proposalId: normalizedProposalId,
                ...(editedContent ? { editedContent } : {}),
                entityIds,
            });
        },
        { proposalId },
        "approveDraftAsCanonicalAnswer"
    );
};
