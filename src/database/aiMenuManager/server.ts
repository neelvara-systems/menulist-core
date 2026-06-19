import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { buildAiMenuManagerReceipt } from '@lib/ai-menu-manager/receiptBuilder';
import { sanitizeAiMenuManagerFirestoreValue } from '@lib/ai-menu-manager/firestoreSanitize';
import type { Project } from '@template/main-app/projects/types';
import type {
    AiMenuManagerCardPayload,
    AiMenuManagerCompactMessage,
    AiMenuManagerExecutionDirective,
    AiMenuManagerProposalDoc,
    AiMenuManagerProposalStatus,
    AiMenuManagerReceipt,
    AiMenuManagerSessionDoc,
} from '@type/aiMenuManager';
import { buildExecutionId } from '@lib/ai-menu-manager/idempotency';
import { projectContainsAiMenuManagerPatch } from '@lib/ai-menu-manager/actions/projectPatches';

const MAX_COMPACT_MESSAGES = 20;
const MAX_PENDING_SUMMARIES = 25;
const MAX_RECEIPTS = 20;
const MAX_IDEMPOTENCY_KEYS = 10;
const SESSION_TTL_DAYS = 35;
const PROPOSAL_TTL_DAYS = 45;
const PROPOSAL_APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;

function nowIso() {
    return new Date().toISOString();
}

function ttlDate(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getSessionRef(sessionId: string) {
    return firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS).doc(sessionId);
}

function getProposalRef(proposalId: string) {
    return firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(proposalId);
}

function getProjectRef(params: { tId: string | number; sId: string | number; projectId: string }) {
    return firestoreAdmin.collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`).doc(params.projectId);
}

function timestampToDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof (value as any)?.toDate === 'function') return (value as any).toDate();
    if (typeof (value as any)?.seconds === 'number') return new Date((value as any).seconds * 1000);
    return null;
}

function legacyProjectMatchesScope(project: Partial<Project>, params: { tId: string | number; sId: string | number; projectId: string }) {
    const data = project as any;
    const tenantCandidates = [data.tId, data.tenantId, data.tenantID]
        .filter((value) => value !== undefined && value !== null)
        .map(String);
    const storeCandidates = [data.sId, data.storeId, data.storeID]
        .filter((value) => value !== undefined && value !== null)
        .map(String);

    if (tenantCandidates.length && !tenantCandidates.includes(String(params.tId))) return false;
    if (storeCandidates.length && !storeCandidates.includes(String(params.sId))) return false;
    if (tenantCandidates.length || storeCandidates.length) return true;

    const projectId = String(params.projectId);
    return projectId.startsWith(`${params.tId}-`) && projectId.endsWith(`-${params.sId}`);
}

function isTerminalProposalStatus(status: AiMenuManagerProposalStatus) {
    return ['executed', 'failed', 'cancelled', 'rejected', 'manual_task'].includes(status);
}

function isProposalApprovalExpired(proposal: AiMenuManagerProposalDoc) {
    const createdAt = timestampToDate(proposal.createdAt);
    return createdAt ? Date.now() - createdAt.getTime() > PROPOSAL_APPROVAL_TTL_MS : false;
}

export async function getAiMenuManagerProject(params: {
    tId: string | number;
    sId: string | number;
    projectId: string;
}): Promise<Project | null> {
    const scopedSnap = await getProjectRef(params).get();
    if (scopedSnap.exists) {
        return { ...(scopedSnap.data() as Project), projectId: scopedSnap.id };
    }

    const legacySnap = await firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(params.projectId).get();
    if (legacySnap.exists) {
        const legacyProject = { ...(legacySnap.data() as Project), projectId: legacySnap.id };
        return legacyProjectMatchesScope(legacyProject, params) ? legacyProject : null;
    }

    return null;
}

export async function getAiMenuManagerSession(sessionId: string) {
    const snap = await getSessionRef(sessionId).get();
    return snap.exists ? snap.data() as AiMenuManagerSessionDoc : null;
}

export async function getAiMenuManagerProposal(proposalId: string) {
    const snap = await getProposalRef(proposalId).get();
    return snap.exists ? snap.data() as AiMenuManagerProposalDoc : null;
}

function buildPendingSummary(card: AiMenuManagerCardPayload) {
    return {
        proposalId: card.cardId,
        actionType: card.actionType,
        title: card.title,
        status: card.status,
        risk: card.risk,
        projectId: card.scope.projectId,
        updatedAt: nowIso(),
    };
}

function compactMessages(params: {
    existing?: AiMenuManagerCompactMessage[];
    ownerText: string;
    managerText: string;
    messageId: string;
}) {
    const createdAt = nowIso();
    return [
        ...(params.existing || []),
        {
            messageId: `${params.messageId}_owner`,
            role: 'owner' as const,
            text: params.ownerText,
            createdAt,
        },
        {
            messageId: `${params.messageId}_manager`,
            role: 'menu_manager' as const,
            text: params.managerText,
            createdAt,
        },
    ].slice(-MAX_COMPACT_MESSAGES);
}

export async function persistAiMenuManagerCommand(params: {
    sessionId: string;
    sessionDate: string;
    storageMode: 'daily_compact' | 'detailed';
    tId: string | number;
    sId: string | number;
    projectId: string;
    ownerText: string;
    messageId: string;
    card: AiMenuManagerCardPayload;
    proposal: AiMenuManagerProposalDoc;
}) {
    const sessionRef = getSessionRef(params.sessionId);
    const proposalRef = getProposalRef(params.proposal.proposalId);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        const proposalSnap = await transaction.get(proposalRef);
        if (proposalSnap.exists) return;

        const existingSession = sessionSnap.exists ? sessionSnap.data() as AiMenuManagerSessionDoc : null;
        const existingPending = (existingSession?.pendingCardSummaries || [])
            .filter((entry) => entry.proposalId !== params.proposal.proposalId);
        const pendingCardSummaries = [
            buildPendingSummary(params.card),
            ...existingPending,
        ].slice(0, MAX_PENDING_SUMMARIES);

        const sessionPayload: Partial<AiMenuManagerSessionDoc> = sanitizeAiMenuManagerFirestoreValue({
            sessionId: params.sessionId,
            tId: params.tId,
            sId: params.sId,
            projectId: params.projectId,
            sessionDate: params.sessionDate,
            storageMode: params.storageMode,
            status: 'active',
            compactMessages: compactMessages({
                existing: existingSession?.compactMessages,
                ownerText: params.ownerText,
                managerText: params.card.title,
                messageId: params.messageId,
            }),
            pendingCardSummaries,
            recentReceiptSummaries: existingSession?.recentReceiptSummaries || [],
            counters: {
                commands: (existingSession?.counters?.commands || 0) + 1,
                proposalsCreated: (existingSession?.counters?.proposalsCreated || 0) + 1,
                approvals: existingSession?.counters?.approvals || 0,
                executions: existingSession?.counters?.executions || 0,
            },
            expiresAt: admin.firestore.Timestamp.fromDate(ttlDate(SESSION_TTL_DAYS)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(!existingSession ? { createdAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
        });

        transaction.set(sessionRef, sessionPayload, { merge: true });
        transaction.set(proposalRef, sanitizeAiMenuManagerFirestoreValue({
            ...params.proposal,
            expiresAt: admin.firestore.Timestamp.fromDate(ttlDate(PROPOSAL_TTL_DAYS)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
    });
}

export async function getAiMenuManagerInbox(params: {
    sessionId: string;
    tId: string | number;
    sId: string | number;
    projectId: string;
}) {
    const session = await getAiMenuManagerSession(params.sessionId);
    if (
        !session
        || String(session.tId) !== String(params.tId)
        || String(session.sId) !== String(params.sId)
        || String(session.projectId) !== String(params.projectId)
    ) {
        return { session: null, cards: [], receipts: [] };
    }

    const proposalIds = (session.pendingCardSummaries || [])
        .map((entry) => entry.proposalId)
        .filter(Boolean)
        .slice(0, MAX_PENDING_SUMMARIES);
    const proposalRefs = proposalIds.map((proposalId) => getProposalRef(proposalId));
    const proposalSnaps = proposalRefs.length ? await firestoreAdmin.getAll(...proposalRefs) : [];

    const cards = proposalSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as AiMenuManagerProposalDoc)
        .filter((proposal) => ['pending_approval', 'manual_task', 'answered'].includes(proposal.status))
        .map((proposal) => proposal.cardPayload);

    return {
        session,
        cards,
        receipts: session.recentReceiptSummaries || [],
    };
}

export async function updateAiMenuManagerProposalStatus(params: {
    proposalId: string;
    tId: string | number;
    sId: string | number;
    status: Extract<AiMenuManagerProposalStatus, 'cancelled' | 'rejected' | 'manual_task'>;
    idempotencyKey: string;
    userId: string | number;
}) {
    const proposalRef = getProposalRef(params.proposalId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const proposalSnap = await transaction.get(proposalRef);
        if (!proposalSnap.exists) throw new Error('Proposal not found');
        const proposal = proposalSnap.data() as AiMenuManagerProposalDoc;
        const sessionRef = getSessionRef(proposal.sessionId);
        const sessionSnap = await transaction.get(sessionRef);
        const session = sessionSnap.exists ? sessionSnap.data() as AiMenuManagerSessionDoc : null;
        if (String(proposal.tId) !== String(params.tId) || String(proposal.sId) !== String(params.sId)) {
            throw new Error('Forbidden');
        }

        const nextStatus = params.status;
        const isManualTaskClose = proposal.status === 'manual_task'
            && ['manual_task', 'cancelled', 'rejected'].includes(nextStatus);
        const alreadyHandledManualTask = proposal.status === 'manual_task'
            && nextStatus === 'manual_task'
            && Boolean(proposal.receipt);

        if (proposal.status === nextStatus && (nextStatus !== 'manual_task' || alreadyHandledManualTask)) {
            return { status: nextStatus };
        }
        if (isTerminalProposalStatus(proposal.status) && !isManualTaskClose) {
            throw new Error('Proposal is no longer pending');
        }

        const idempotencyKeys = [
            params.idempotencyKey,
            ...(proposal.idempotencyKeys || []).filter((key) => key !== params.idempotencyKey),
        ].slice(0, MAX_IDEMPOTENCY_KEYS);
        const receipt = nextStatus === 'manual_task'
            ? buildAiMenuManagerReceipt({
                proposalId: proposal.proposalId,
                actionType: proposal.actionType,
                projectId: proposal.projectId,
                status: 'manual_task',
                title: proposal.cardPayload?.title || 'Manual task',
                message: 'Manual task marked done. No MenuList menu truth was changed by this action.',
            })
            : undefined;

        transaction.set(proposalRef, sanitizeAiMenuManagerFirestoreValue({
            status: nextStatus,
            idempotencyKeys,
            approvalRecord: {
                approvedBy: params.userId,
                approvedAt: admin.firestore.FieldValue.serverTimestamp(),
                action: nextStatus,
            },
            receipt,
            cardPayload: {
                ...proposal.cardPayload,
                status: nextStatus,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }), { merge: true });

        if (session) {
            transaction.set(sessionRef, sanitizeAiMenuManagerFirestoreValue({
                pendingCardSummaries: (session.pendingCardSummaries || [])
                    .filter((entry) => entry.proposalId !== params.proposalId),
                ...(receipt ? {
                    recentReceiptSummaries: [
                        receipt,
                        ...(session.recentReceiptSummaries || []).filter((entry) => entry.proposalId !== params.proposalId),
                    ].slice(0, MAX_RECEIPTS),
                } : {}),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }), { merge: true });
        }

        return { status: nextStatus };
    });
}

export async function approveAiMenuManagerProposal(params: {
    proposalId: string;
    tId: string | number;
    sId: string | number;
    idempotencyKey: string;
    userId: string | number;
}) {
    const proposalRef = getProposalRef(params.proposalId);
    const executionId = buildExecutionId(params.proposalId, params.idempotencyKey);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const proposalSnap = await transaction.get(proposalRef);
        if (!proposalSnap.exists) throw new Error('Proposal not found');
        const proposal = proposalSnap.data() as AiMenuManagerProposalDoc;
        const sessionRef = getSessionRef(proposal.sessionId);
        const sessionSnap = await transaction.get(sessionRef);
        const session = sessionSnap.exists ? sessionSnap.data() as AiMenuManagerSessionDoc : null;
        if (String(proposal.tId) !== String(params.tId) || String(proposal.sId) !== String(params.sId)) {
            throw new Error('Forbidden');
        }
        if (proposal.executionDirective && ['approved', 'executing'].includes(proposal.status)) {
            const directiveExpiry = timestampToDate(proposal.executionDirective.expiresAt);
            if (directiveExpiry && directiveExpiry.getTime() < Date.now()) {
                throw new Error('Execution directive expired');
            }
            return { proposal, directive: proposal.executionDirective };
        }
        if (!proposal.patch || !proposal.patchHash) {
            throw new Error('Proposal does not have an executable patch');
        }
        if (!['pending_approval', 'approved', 'executing'].includes(proposal.status)) {
            throw new Error('Proposal is no longer pending');
        }
        if (isProposalApprovalExpired(proposal)) {
            throw new Error('Proposal expired');
        }

        const directive: AiMenuManagerExecutionDirective = {
            proposalId: proposal.proposalId,
            executionId,
            actionType: proposal.actionType,
            scope: proposal.scope,
            baseProjectUpdatedAt: proposal.baseProjectUpdatedAt,
            baseProjectHash: proposal.baseProjectHash,
            patchHash: proposal.patchHash,
            patch: proposal.patch,
            patchSummary: proposal.beforeAfterSummary,
            expiresAt,
        };

        const idempotencyKeys = [
            params.idempotencyKey,
            ...(proposal.idempotencyKeys || []).filter((key) => key !== params.idempotencyKey),
        ].slice(0, MAX_IDEMPOTENCY_KEYS);

        transaction.set(proposalRef, sanitizeAiMenuManagerFirestoreValue({
            status: 'executing',
            executionStatus: 'locked',
            idempotencyKeys,
            approvalRecord: {
                approvedBy: params.userId,
                approvedAt: admin.firestore.FieldValue.serverTimestamp(),
                action: 'approve',
            },
            cardPayload: {
                ...proposal.cardPayload,
                status: 'approved',
            },
            executionDirective: directive,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }), { merge: true });

        if (session) {
            transaction.set(sessionRef, sanitizeAiMenuManagerFirestoreValue({
                counters: {
                    commands: session.counters?.commands || 0,
                    proposalsCreated: session.counters?.proposalsCreated || 0,
                    approvals: (session.counters?.approvals || 0) + 1,
                    executions: session.counters?.executions || 0,
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }), { merge: true });
        }

        return { proposal, directive };
    });
}

export async function completeAiMenuManagerProposal(params: {
    proposalId: string;
    tId: string | number;
    sId: string | number;
    projectId?: string;
    actionType?: string;
    executionId: string;
    patchHash: string;
    result: 'executed' | 'failed';
    message?: string;
    idempotencyKey: string;
}) {
    const proposal = await getAiMenuManagerProposal(params.proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (String(proposal.tId) !== String(params.tId) || String(proposal.sId) !== String(params.sId)) {
        throw new Error('Forbidden');
    }
    if (proposal.projectId && String(proposal.projectId) !== String(params.projectId || '')) {
        throw new Error('Scope mismatch');
    }
    if (params.actionType && params.actionType !== proposal.actionType) {
        throw new Error('Action type mismatch');
    }
    if (proposal.executionDirective?.executionId && proposal.executionDirective.executionId !== params.executionId) {
        throw new Error('Execution id mismatch');
    }
    if (proposal.patchHash !== params.patchHash) {
        throw new Error('Patch hash mismatch');
    }
    if (proposal.receipt && ['executed', 'failed', 'manual_task'].includes(proposal.status)) {
        return {
            status: proposal.status,
            receipt: proposal.receipt,
            verified: proposal.status === 'executed',
        };
    }
    if (proposal.status !== 'executing') {
        throw new Error('Proposal is not executing');
    }
    const directiveExpiry = timestampToDate(proposal.executionDirective?.expiresAt);
    if (directiveExpiry && directiveExpiry.getTime() < Date.now()) {
        throw new Error('Execution directive expired');
    }

    let verified = false;
    if (params.result === 'executed' && proposal.patch && proposal.projectId) {
        const project = await getAiMenuManagerProject({
            tId: proposal.tId,
            sId: proposal.sId,
            projectId: proposal.projectId,
        });
        verified = project ? projectContainsAiMenuManagerPatch(project, proposal.patch) : false;
    }

    const nextStatus: AiMenuManagerProposalStatus = params.result === 'executed' && verified ? 'executed' : 'failed';
    const receipt: AiMenuManagerReceipt = buildAiMenuManagerReceipt({
        proposalId: proposal.proposalId,
        actionType: proposal.actionType,
        projectId: proposal.projectId,
        status: nextStatus === 'executed' ? 'executed' : 'failed',
        title: proposal.cardPayload?.title || proposal.beforeAfterSummary?.title || 'Menu Manager update',
        message: params.message || (nextStatus === 'executed' ? 'Change applied.' : 'The approved change could not be verified.'),
    });

    const proposalRef = getProposalRef(params.proposalId);
    const sessionRef = getSessionRef(proposal.sessionId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        const session = sessionSnap.exists ? sessionSnap.data() as AiMenuManagerSessionDoc : null;
        const currentProposalSnap = await transaction.get(proposalRef);
        const currentProposal = currentProposalSnap.exists ? currentProposalSnap.data() as AiMenuManagerProposalDoc : null;
        if (currentProposal?.receipt && ['executed', 'failed', 'manual_task'].includes(currentProposal.status)) return;

        const idempotencyKeys = [
            params.idempotencyKey,
            ...(proposal.idempotencyKeys || []).filter((key) => key !== params.idempotencyKey),
        ].slice(0, MAX_IDEMPOTENCY_KEYS);

        transaction.set(proposalRef, sanitizeAiMenuManagerFirestoreValue({
            status: nextStatus,
            executionStatus: nextStatus === 'executed' ? 'executed' : 'failed',
            receipt,
            idempotencyKeys,
            cardPayload: {
                ...proposal.cardPayload,
                status: nextStatus,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }), { merge: true });

        if (session) {
            transaction.set(sessionRef, sanitizeAiMenuManagerFirestoreValue({
                pendingCardSummaries: (session.pendingCardSummaries || [])
                    .filter((entry) => entry.proposalId !== params.proposalId),
                recentReceiptSummaries: [
                    receipt,
                    ...(session.recentReceiptSummaries || []).filter((entry) => entry.proposalId !== params.proposalId),
                ].slice(0, MAX_RECEIPTS),
                counters: {
                    commands: session.counters?.commands || 0,
                    proposalsCreated: session.counters?.proposalsCreated || 0,
                    approvals: session.counters?.approvals || 0,
                    executions: (session.counters?.executions || 0) + (nextStatus === 'executed' ? 1 : 0),
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }), { merge: true });
        }
    });

    return { status: nextStatus, receipt, verified };
}
