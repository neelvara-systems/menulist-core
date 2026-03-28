/**
 * Canonica — Mutation Proposals DAL (Signal Mutation Engine)
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
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, Timestamp, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaMutationProposal } from "@type/canonica";

const COLLECTION = DB_COLLECTIONS.CANONICA_MUTATION_PROPOSALS;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);

/**
 * Get all mutation proposals for a tenant+store
 */
export const getMutationProposals = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('createdOn', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaMutationProposal[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaMutationProposal);
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
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('status', '==', 'pending_review'),
                orderBy('createdOn', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaMutationProposal[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaMutationProposal);
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
            const docSnap = await getDoc(getDocRef(proposalId));
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as CanonicaMutationProposal;
            }
            return null;
        },
        "getMutationProposalById"
    );
};

/**
 * Create a new mutation proposal
 */
export const addMutationProposal = async (data: Omit<CanonicaMutationProposal, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await requestBodyComposer({
                ...data,
                status: 'pending_review',
            });
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as CanonicaMutationProposal;
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
    return await apiCallComposer(
        async () => {
            const composedData = await requestBodyComposer({ status: 'approved' });
            await runTransaction(canonicaFirebaseClient, async (transaction) => {
                const docSnap = await transaction.get(getDocRef(proposalId));
                if (!docSnap.exists()) throw new Error(`Proposal ${proposalId} not found`);
                const current = docSnap.data() as CanonicaMutationProposal;
                if (current.status !== 'pending_review') {
                    throw new Error(`Cannot approve proposal in '${current.status}' state — must be 'pending_review'`);
                }
                transaction.set(getDocRef(proposalId), composedData, { merge: true });
            });
            return composedData;
        },
        { proposalId },
        "approveMutationProposal"
    );
};

/**
 * Reject a mutation proposal
 * Guard: Only pending_review proposals can be rejected.
 */
export const rejectMutationProposal = async (proposalId: string) => {
    return await apiCallComposer(
        async () => {
            const composedData = await requestBodyComposer({ status: 'rejected' });
            await runTransaction(canonicaFirebaseClient, async (transaction) => {
                const docSnap = await transaction.get(getDocRef(proposalId));
                if (!docSnap.exists()) throw new Error(`Proposal ${proposalId} not found`);
                const current = docSnap.data() as CanonicaMutationProposal;
                if (current.status !== 'pending_review') {
                    throw new Error(`Cannot reject proposal in '${current.status}' state — must be 'pending_review'`);
                }
                transaction.set(getDocRef(proposalId), composedData, { merge: true });
            });
            return composedData;
        },
        { proposalId },
        "rejectMutationProposal"
    );
};

/**
 * Mark a mutation proposal as implemented
 * Guard: Only approved proposals can be marked implemented.
 */
export const markMutationImplemented = async (proposalId: string) => {
    return await apiCallComposer(
        async () => {
            const composedData = await requestBodyComposer({ status: 'implemented' });
            await runTransaction(canonicaFirebaseClient, async (transaction) => {
                const docSnap = await transaction.get(getDocRef(proposalId));
                if (!docSnap.exists()) throw new Error(`Proposal ${proposalId} not found`);
                const current = docSnap.data() as CanonicaMutationProposal;
                if (current.status !== 'approved') {
                    throw new Error(`Cannot implement proposal in '${current.status}' state — must be 'approved'`);
                }
                transaction.set(getDocRef(proposalId), composedData, { merge: true });
            });
            return composedData;
        },
        { proposalId },
        "markMutationImplemented"
    );
};

// ═══════════════════════════════════════════════════════════════
// AUTOMATIC KNOWLEDGE CREATION — Draft Approval (Expansion Item #4)
// One-click: approve draft → create canonical answer → create search index
// Feature-flagged: ENABLE_CANONICA_AUTO_KNOWLEDGE
// @see __docs__/canonica/automatic-knowledge-creation/
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
    tId: number,
    sId: number,
    approvedBy: string
) => {
    return await apiCallComposer(
        async () => {
            // 1. Fetch and validate proposal
            const proposalSnap = await getDoc(getDocRef(proposalId));
            if (!proposalSnap.exists()) {
                throw new Error(`Proposal ${proposalId} not found`);
            }
            const proposal = { ...proposalSnap.data(), id: proposalSnap.id } as CanonicaMutationProposal;

            if (proposal.status !== 'pending_review') {
                throw new Error(`Cannot approve draft in '${proposal.status}' state — must be 'pending_review'`);
            }

            const draft = proposal.suggestedChange;
            if (!draft?.draftStatus || draft.draftStatus !== 'generated') {
                throw new Error('Proposal does not have a generated draft to approve');
            }

            if (!draft.draftTitle) {
                throw new Error('Draft has no title — cannot create canonical answer');
            }

            // 2. Resolve entity for binding
            const entityId = proposal.relatedEntityIds?.[0];
            if (!entityId) {
                throw new Error('Proposal has no related entity ID');
            }

            // Check entity is not deprecated
            const { getEntityById } = await import('@database/canonica/entities');
            const entity = await getEntityById(entityId);
            if (!entity) {
                throw new Error(`Entity ${entityId} not found`);
            }
            if (entity.status === 'deprecated') {
                throw new Error(`Cannot create answer for deprecated entity "${entity.name}"`);
            }

            // 3. Get current version for product binding
            const { getLatestRelease } = await import('@database/canonica/releases');
            const latestRelease = await getLatestRelease(tId, sId);
            const currentVersion = latestRelease?.versionNormalized || 1000000; // Default v1.0.0

            // 4. Create canonical answer from draft (with optional edits overriding)
            const title = editedContent?.title || draft.draftTitle;
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();

            const { addCanonicalAnswer } = await import('@database/canonica/canonicalAnswers');
            const canonicalAnswer = await addCanonicalAnswer({
                tId,
                sId,
                title,
                slug,
                status: 'active',
                answerType: draft.procedure ? 'procedure' : 'explanation',
                scope: {
                    entityIds: proposal.relatedEntityIds,
                },
                productBinding: {
                    introducedInVersion: currentVersion,
                    lastValidatedInVersion: currentVersion,
                    applicableVersions: { from: currentVersion, to: null },
                },
                content: {
                    structuredSummary: editedContent?.structuredSummary || draft.structuredSummary || '',
                    detailedExplanation: editedContent?.detailedExplanation || draft.detailedExplanation || '',
                    edgeCases: editedContent?.edgeCases || draft.edgeCases,
                    constraints: editedContent?.constraints || draft.constraints,
                    procedure: draft.procedure,
                },
                validation: {
                    confidenceScore: proposal.confidenceScore,
                    validationSource: 'signal_cluster',
                    lastValidatedOn: Timestamp.now(),
                    validatedBy: approvedBy,
                },
                signalMetrics: {
                    linkedTicketCount: proposal.signalSummary?.ticketCount || 0,
                    linkedChatCount: proposal.signalSummary?.chatCount || 0,
                    negativeFeedbackCount: 0,
                },
                governance: {
                    driftFlag: false,
                    reviewRequired: false,
                },
            });

            if (!canonicalAnswer?.id) {
                throw new Error('Failed to create canonical answer from draft');
            }

            // 5. Create search index entry for the new answer's entities
            const { upsertEntitySearchIndex } = await import('@database/canonica/entities');
            const { buildSearchIndexEntry } = await import('@lib/canonica/entityExtraction');
            const indexData = buildSearchIndexEntry({
                name: entity.name,
                slug: entity.slug,
                description: entity.description,
                aliases: entity.aliases,
            });

            await upsertEntitySearchIndex({
                tId,
                sId,
                entityId: entity.id,
                ...indexData,
            });

            // 6. Mark proposal as implemented
            const implementData = await requestBodyComposer({ status: 'implemented' });
            await setDoc(getDocRef(proposalId), implementData, { merge: true });

            // 7. Audit log
            const { addAuditLog } = await import('@database/canonica/auditLogs');
            await addAuditLog({
                tId,
                sId,
                action: 'draft_approved_as_canonical_answer',
                entityType: 'canonicalAnswer',
                entityId: canonicalAnswer.id,
                previousState: {
                    proposalId,
                    draftTitle: draft.draftTitle,
                    draftSource: draft.draftSource,
                },
                newState: {
                    answerId: canonicalAnswer.id,
                    title,
                    entityIds: proposal.relatedEntityIds,
                    approvedBy,
                    wasEdited: !!editedContent,
                },
                performedBy: approvedBy,
                timestamp: Timestamp.now(),
            });

            return {
                canonicalAnswer,
                proposalId,
                entityId,
                approved: true,
            };
        },
        { proposalId, tId, sId, approvedBy },
        "approveDraftAsCanonicalAnswer"
    );
};
