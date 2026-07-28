import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getBoundedErrorCode } from '@lib/monitoring/boundedLogContext';
import { buildAiMenuManagerReceipt } from '@lib/ai-menu-manager/receiptBuilder';
import { sanitizeAiMenuManagerFirestoreValue } from '@lib/ai-menu-manager/firestoreSanitize';
import { buildAiMenuManagerContextBaseHash, buildAiMenuManagerContextPacket } from '@lib/ai-menu-manager/contextPacket';
import {
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerProposalId,
    normalizeAiMenuManagerScopeDocumentId,
    normalizeAiMenuManagerSessionId,
} from '@lib/ai-menu-manager/routeIds';
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
import { buildExecutionId, isDailySessionIdForScope } from '@lib/ai-menu-manager/idempotency';
import { assertAiMenuManagerPatchAllowedForAction } from '@lib/ai-menu-manager/patchPolicy';
import {
    buildAiMenuManagerPendingState,
    normalizeAiMenuManagerSessionSnapshot,
    prepareAiMenuManagerSessionWrite,
} from '@lib/ai-menu-manager/sessionIntegrity';
import { normalizeAiMenuManagerProposalSnapshot } from '@lib/ai-menu-manager/proposalIntegrity';
import { normalizeAiMenuManagerProjectSnapshot } from '@lib/ai-menu-manager/projectIntegrity';
import { projectContainsAiMenuManagerPatch } from '@lib/ai-menu-manager/actions/projectPatches';
import { logger } from '@lib/monitoring/logger';
import type { Transaction } from 'firebase-admin/firestore';

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
    const documentId = normalizeAiMenuManagerSessionId(sessionId);
    return documentId
        ? firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS).doc(documentId)
        : null;
}

function getProposalRef(proposalId: string) {
    const documentId = normalizeAiMenuManagerProposalId(proposalId);
    return documentId
        ? firestoreAdmin.collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS).doc(documentId)
        : null;
}

function getAiMenuManagerScopeDocumentIds(params: { tId: string | number; sId: string | number }) {
    const tenantScope = normalizeAiMenuManagerScopeDocumentId(params.tId);
    const storeScope = normalizeAiMenuManagerScopeDocumentId(params.sId);
    return tenantScope && storeScope
        ? { tId: tenantScope.documentId, sId: storeScope.documentId }
        : null;
}

function requireAiMenuManagerScopeDocumentIds(params: { tId: string | number; sId: string | number }) {
    const scope = getAiMenuManagerScopeDocumentIds(params);
    if (!scope) throw new Error('Invalid scope');
    return scope;
}

function getProjectRef(params: { tId: string | number; sId: string | number; projectId: string }) {
    const documentId = normalizeAiMenuManagerProjectId(params.projectId);
    const scope = getAiMenuManagerScopeDocumentIds(params);
    return documentId && scope
        ? firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(scope.tId)
            .collection(scope.sId)
            .doc(documentId)
        : null;
}

function requireSessionRef(sessionId: string) {
    const ref = getSessionRef(sessionId);
    if (!ref) throw new Error('Invalid session ID');
    return ref;
}

function requireProposalRef(proposalId: string) {
    const ref = getProposalRef(proposalId);
    if (!ref) throw new Error('Invalid proposal ID');
    return ref;
}

function requireAiMenuManagerSessionData(value: unknown): AiMenuManagerSessionDoc {
    const session = normalizeAiMenuManagerSessionSnapshot(value);
    if (!session) throw new Error('Invalid session data');
    return session;
}

function requireAiMenuManagerProposalData(value: unknown, proposalId: string): AiMenuManagerProposalDoc {
    const proposal = normalizeAiMenuManagerProposalSnapshot(value, proposalId);
    if (!proposal) throw new Error('Invalid proposal data');
    return proposal;
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
    const scope = getAiMenuManagerScopeDocumentIds(params);
    const projectId = normalizeAiMenuManagerProjectId(params.projectId);
    if (!scope || !projectId) return false;

    const data = project as any;
    const tenantCandidates = [data.tId, data.tenantId, data.tenantID]
        .filter((value) => value !== undefined && value !== null)
        .map(String);
    const storeCandidates = [data.sId, data.storeId, data.storeID]
        .filter((value) => value !== undefined && value !== null)
        .map(String);

    if (tenantCandidates.length && !tenantCandidates.includes(scope.tId)) return false;
    if (storeCandidates.length && !storeCandidates.includes(scope.sId)) return false;
    if (tenantCandidates.length || storeCandidates.length) return true;

    return projectId.startsWith(`${scope.tId}-`) && projectId.endsWith(`-${scope.sId}`);
}

function isTerminalProposalStatus(status: AiMenuManagerProposalStatus) {
    return ['executed', 'failed', 'cancelled', 'rejected', 'manual_task'].includes(status);
}

function isProposalApprovalExpired(proposal: AiMenuManagerProposalDoc) {
    const createdAt = timestampToDate(proposal.createdAt);
    return createdAt ? Date.now() - createdAt.getTime() > PROPOSAL_APPROVAL_TTL_MS : false;
}

function assertAiMenuManagerProposalIdentity(params: {
    proposal: AiMenuManagerProposalDoc;
    proposalId: string;
    scope: { tId: string; sId: string };
}) {
    const { proposal, proposalId, scope } = params;
    if (
        proposal.proposalId !== proposalId
        || proposal.cardPayload?.cardId !== proposalId
        || String(proposal.tId) !== scope.tId
        || String(proposal.sId) !== scope.sId
        || String(proposal.scope?.tId) !== scope.tId
        || String(proposal.scope?.sId) !== scope.sId
        || String(proposal.cardPayload?.scope?.tId) !== scope.tId
        || String(proposal.cardPayload?.scope?.sId) !== scope.sId
        || String(proposal.scope?.projectId || '') !== String(proposal.projectId || '')
        || String(proposal.cardPayload?.scope?.projectId || '') !== String(proposal.projectId || '')
    ) {
        throw new Error('Proposal identity mismatch');
    }
}

export function assertAiMenuManagerCommandProposalIdentity(params: {
    existing: AiMenuManagerProposalDoc;
    expected: AiMenuManagerProposalDoc;
}) {
    const scope = requireAiMenuManagerScopeDocumentIds(params.expected);
    const projectId = normalizeAiMenuManagerProjectId(params.expected.projectId);
    if (!projectId) throw new Error('Proposal identity mismatch');

    assertAiMenuManagerProposalIdentity({
        proposal: params.existing,
        proposalId: params.expected.proposalId,
        scope,
    });
    const expectedIdempotencyKey = params.expected.idempotencyKeys[0];
    if (
        params.existing.sessionId !== params.expected.sessionId
        || String(params.existing.projectId || '') !== projectId
        || params.existing.actionType !== params.expected.actionType
        || String(params.existing.patchHash || '') !== String(params.expected.patchHash || '')
        || !expectedIdempotencyKey
        || !params.existing.idempotencyKeys.includes(expectedIdempotencyKey)
        || params.existing.cardPayload?.actionType !== params.expected.cardPayload.actionType
    ) {
        throw new Error('Proposal identity mismatch');
    }
}

function assertAiMenuManagerSessionMatchesProposal(
    session: AiMenuManagerSessionDoc | null,
    proposal: AiMenuManagerProposalDoc,
) {
    if (!session) return;
    if (
        session.sessionId !== proposal.sessionId
        || String(session.tId) !== String(proposal.tId)
        || String(session.sId) !== String(proposal.sId)
        || String(session.projectId || '') !== String(proposal.projectId || '')
    ) {
        throw new Error('Session identity mismatch');
    }
}

function assertAiMenuManagerSessionIdentity(params: {
    session: AiMenuManagerSessionDoc;
    sessionId: string;
    sessionDate: string;
    scope: { tId: string; sId: string };
    projectId: string;
}) {
    if (
        params.session.sessionId !== params.sessionId
        || String(params.session.tId) !== params.scope.tId
        || String(params.session.sId) !== params.scope.sId
        || String(params.session.projectId || '') !== params.projectId
        || params.session.sessionDate !== params.sessionDate
        || !isDailySessionIdForScope({
            sessionId: params.sessionId,
            tId: params.scope.tId,
            sId: params.scope.sId,
            projectId: params.projectId,
            sessionDate: params.sessionDate,
        })
    ) {
        throw new Error('Session identity mismatch');
    }
}

export async function getAiMenuManagerProject(params: {
    tId: string | number;
    sId: string | number;
    projectId: string;
}): Promise<Project | null> {
    const projectId = normalizeAiMenuManagerProjectId(params.projectId);
    const scope = getAiMenuManagerScopeDocumentIds(params);
    const scopedRef = getProjectRef(params);
    if (!projectId || !scope || !scopedRef) return null;

    const scopedSnap = await scopedRef.get();
    if (scopedSnap.exists) {
        return normalizeAiMenuManagerProjectSnapshot(scopedSnap.data(), scopedSnap.id);
    }

    const legacySnap = await firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(projectId).get();
    if (legacySnap.exists) {
        const legacyProject = normalizeAiMenuManagerProjectSnapshot(legacySnap.data(), legacySnap.id);
        if (!legacyProject) return null;
        return legacyProjectMatchesScope(legacyProject, params) ? legacyProject : null;
    }

    return null;
}

async function getAiMenuManagerProjectInTransaction(
    transaction: Transaction,
    params: { tId: string | number; sId: string | number; projectId: string },
): Promise<Project | null> {
    const projectId = normalizeAiMenuManagerProjectId(params.projectId);
    const scope = getAiMenuManagerScopeDocumentIds(params);
    const scopedRef = getProjectRef(params);
    if (!projectId || !scope || !scopedRef) return null;

    const scopedSnap = await transaction.get(scopedRef);
    if (scopedSnap.exists) {
        return normalizeAiMenuManagerProjectSnapshot(scopedSnap.data(), scopedSnap.id);
    }

    const legacyRef = firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(projectId);
    const legacySnap = await transaction.get(legacyRef);
    if (!legacySnap.exists) return null;

    const legacyProject = normalizeAiMenuManagerProjectSnapshot(legacySnap.data(), legacySnap.id);
    if (!legacyProject) return null;
    return legacyProjectMatchesScope(legacyProject, params) ? legacyProject : null;
}

export async function getAiMenuManagerSession(sessionId: string) {
    const sessionRef = getSessionRef(sessionId);
    if (!sessionRef) return null;

    const snap = await sessionRef.get();
    return snap.exists ? normalizeAiMenuManagerSessionSnapshot(snap.data()) : null;
}

async function getLatestPendingAiMenuManagerSession(params: {
    tId: string;
    sId: string;
    projectId: string;
}) {
    try {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS)
            .where('tId', '==', params.tId)
            .where('sId', '==', params.sId)
            .where('projectId', '==', params.projectId)
            .where('hasPendingOperations', '==', true)
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        return normalizeAiMenuManagerSessionSnapshot(snapshot.docs[0].data());
    } catch (error) {
        const code = (getBoundedErrorCode(error) || '').toLowerCase();
        if (['9', 'failed-precondition', 'firestore/failed-precondition'].includes(code)) {
            logger.warn('AI Menu Manager pending recovery index is not ready');
            return null;
        }
        throw error;
    }
}

export async function getAiMenuManagerProposal(proposalId: string) {
    const proposalRef = getProposalRef(proposalId);
    if (!proposalRef) return null;

    const snap = await proposalRef.get();
    return snap.exists ? normalizeAiMenuManagerProposalSnapshot(snap.data(), snap.id) : null;
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
            kind: 'reply' as const,
            text: params.managerText,
            createdAt,
        },
    ].slice(-MAX_COMPACT_MESSAGES);
}

function appendCompactReceipt(
    existing: AiMenuManagerCompactMessage[] | undefined,
    receipt: AiMenuManagerReceipt,
) {
    return [
        ...(existing || []),
        {
            messageId: `${receipt.receiptId}_manager`,
            role: 'menu_manager' as const,
            kind: 'receipt' as const,
            text: receipt.message,
            createdAt: receipt.executedAt,
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
    replaceOperationId?: string;
}): Promise<AiMenuManagerProposalDoc> {
    const projectId = normalizeAiMenuManagerProjectId(params.projectId);
    if (!projectId) throw new Error('Invalid project ID');
    const scope = requireAiMenuManagerScopeDocumentIds(params);
    if (!isDailySessionIdForScope({
        sessionId: params.sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId,
        sessionDate: params.sessionDate,
    })) {
        throw new Error('Session identity mismatch');
    }

    const sessionRef = requireSessionRef(params.sessionId);
    const proposalRef = requireProposalRef(params.proposal.proposalId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        const proposalSnap = await transaction.get(proposalRef);
        if (proposalSnap.exists) {
            const existingProposal = requireAiMenuManagerProposalData(proposalSnap.data(), proposalSnap.id);
            assertAiMenuManagerCommandProposalIdentity({
                existing: existingProposal,
                expected: params.proposal,
            });
            return existingProposal;
        }

        const existingSession = sessionSnap.exists ? requireAiMenuManagerSessionData(sessionSnap.data()) : null;
        if (existingSession) {
            assertAiMenuManagerSessionIdentity({
                session: existingSession,
                sessionId: params.sessionId,
                sessionDate: params.sessionDate,
                scope,
                projectId,
            });
        }
        const existingPending = (existingSession?.pendingCardSummaries || [])
            .filter((entry) => (
                entry.proposalId !== params.proposal.proposalId
                && (!params.replaceOperationId || entry.proposalId !== params.replaceOperationId)
            ));
        const pendingCardSummaries = [
            buildPendingSummary(params.card),
            ...existingPending,
        ].slice(0, MAX_PENDING_SUMMARIES);

        const sessionPayload: Partial<AiMenuManagerSessionDoc> = prepareAiMenuManagerSessionWrite(
            sanitizeAiMenuManagerFirestoreValue({
                ...(existingSession || {}),
                sessionId: params.sessionId,
                tId: scope.tId,
                sId: scope.sId,
                projectId,
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
                    ...(existingSession?.counters || {}),
                    commands: (existingSession?.counters?.commands || 0) + 1,
                    proposalsCreated: (existingSession?.counters?.proposalsCreated || 0) + 1,
                    approvals: existingSession?.counters?.approvals || 0,
                    executions: existingSession?.counters?.executions || 0,
                },
                expiresAt: admin.firestore.Timestamp.fromDate(ttlDate(SESSION_TTL_DAYS)),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ...(!existingSession ? { createdAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
            }),
            existingSession,
        );

        transaction.set(sessionRef, sessionPayload, { merge: true });
        transaction.set(proposalRef, sanitizeAiMenuManagerFirestoreValue({
            ...params.proposal,
            tId: scope.tId,
            sId: scope.sId,
            projectId,
            scope: {
                ...params.proposal.scope,
                tId: scope.tId,
                sId: scope.sId,
                projectId: params.proposal.scope.projectId ? projectId : params.proposal.scope.projectId,
            },
            cardPayload: {
                ...params.proposal.cardPayload,
                scope: {
                    ...params.proposal.cardPayload.scope,
                    tId: scope.tId,
                    sId: scope.sId,
                    projectId: params.proposal.cardPayload.scope.projectId ? projectId : params.proposal.cardPayload.scope.projectId,
                },
            },
            expiresAt: admin.firestore.Timestamp.fromDate(ttlDate(PROPOSAL_TTL_DAYS)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
        return params.proposal;
    });
}

export async function getAiMenuManagerInbox(params: {
    sessionId: string;
    tId: string | number;
    sId: string | number;
    projectId: string;
}) {
    const scope = getAiMenuManagerScopeDocumentIds(params);
    if (
        !normalizeAiMenuManagerSessionId(params.sessionId)
        || !normalizeAiMenuManagerProjectId(params.projectId)
        || !scope
    ) {
        return { session: null, cards: [], receipts: [], sessionId: params.sessionId };
    }

    const requestedSession = await getAiMenuManagerSession(params.sessionId);
    const session = requestedSession?.hasPendingOperations
        ? requestedSession
        : await getLatestPendingAiMenuManagerSession({
            tId: scope.tId,
            sId: scope.sId,
            projectId: params.projectId,
        }) || requestedSession;
    if (
        !session
        || String(session.tId) !== scope.tId
        || String(session.sId) !== scope.sId
        || String(session.projectId) !== String(params.projectId)
        || !isDailySessionIdForScope({
            sessionId: session.sessionId,
            tId: scope.tId,
            sId: scope.sId,
            projectId: params.projectId,
            sessionDate: session.sessionDate,
        })
    ) {
        return { session: null, cards: [], receipts: [], sessionId: params.sessionId };
    }

    const projectId = normalizeAiMenuManagerProjectId(params.projectId);
    if (!projectId) return { session: null, cards: [], receipts: [], sessionId: params.sessionId };

    const proposalIds = Array.from(new Set((session.pendingCardSummaries || [])
        .map((entry) => normalizeAiMenuManagerProposalId(entry.proposalId))
        .filter((proposalId): proposalId is string => Boolean(proposalId))
    )).slice(0, MAX_PENDING_SUMMARIES);
    const proposalRefs = proposalIds.map((proposalId) => requireProposalRef(proposalId));
    const proposalSnaps = proposalRefs.length ? await firestoreAdmin.getAll(...proposalRefs) : [];

    const cards = proposalSnaps
        .filter((snap) => snap.exists)
        .map((snap) => ({ proposal: normalizeAiMenuManagerProposalSnapshot(snap.data(), snap.id), proposalId: snap.id }))
        .filter((entry): entry is { proposal: AiMenuManagerProposalDoc; proposalId: string } => Boolean(entry.proposal))
        .filter(({ proposal, proposalId }) => (
            proposal.proposalId === proposalId
            && proposal.sessionId === session.sessionId
            && String(proposal.tId) === scope.tId
            && String(proposal.sId) === scope.sId
            && String(proposal.projectId) === projectId
            && proposal.cardPayload?.cardId === proposalId
            && String(proposal.cardPayload?.scope?.tId) === scope.tId
            && String(proposal.cardPayload?.scope?.sId) === scope.sId
            && String(proposal.cardPayload?.scope?.projectId) === projectId
        ))
        .map(({ proposal }) => proposal)
        .filter((proposal) => ['pending_approval', 'manual_task', 'answered'].includes(proposal.status))
        .map((proposal) => proposal.cardPayload);

    return {
        session,
        sessionId: session.sessionId,
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
    const scope = requireAiMenuManagerScopeDocumentIds(params);
    const proposalRef = requireProposalRef(params.proposalId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const proposalSnap = await transaction.get(proposalRef);
        if (!proposalSnap.exists) throw new Error('Proposal not found');
        const proposal = requireAiMenuManagerProposalData(proposalSnap.data(), proposalSnap.id);
        const sessionRef = getSessionRef(proposal.sessionId);
        const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;
        const session = sessionSnap && sessionSnap.exists ? requireAiMenuManagerSessionData(sessionSnap.data()) : null;
        assertAiMenuManagerProposalIdentity({ proposal, proposalId: params.proposalId, scope });
        assertAiMenuManagerSessionMatchesProposal(session, proposal);

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
        if (
            nextStatus === 'manual_task'
            && (
                proposal.cardPayload?.kind !== 'manual_task'
                || !proposal.cardPayload.actions?.includes('mark_done')
            )
        ) {
            throw new Error('Manual completion is not allowed for this card');
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

        if (session && sessionRef) {
            const pendingCardSummaries = (session.pendingCardSummaries || [])
                .filter((entry) => entry.proposalId !== params.proposalId);
            const nextSession = prepareAiMenuManagerSessionWrite({
                ...session,
                pendingCardSummaries,
                ...(receipt ? {
                    compactMessages: appendCompactReceipt(session.compactMessages, receipt),
                    recentReceiptSummaries: [
                        receipt,
                        ...(session.recentReceiptSummaries || []).filter((entry) => entry.proposalId !== params.proposalId),
                    ].slice(0, MAX_RECEIPTS),
                } : {}),
            }, session);
            transaction.set(sessionRef, sanitizeAiMenuManagerFirestoreValue({
                compactMessages: nextSession.compactMessages,
                pendingCardSummaries: nextSession.pendingCardSummaries,
                recentReceiptSummaries: nextSession.recentReceiptSummaries,
                ...buildAiMenuManagerPendingState(nextSession),
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
    const scope = requireAiMenuManagerScopeDocumentIds(params);
    const proposalRef = requireProposalRef(params.proposalId);
    const executionId = buildExecutionId(params.proposalId, params.idempotencyKey);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return firestoreAdmin.runTransaction(async (transaction) => {
        const proposalSnap = await transaction.get(proposalRef);
        if (!proposalSnap.exists) throw new Error('Proposal not found');
        const proposal = requireAiMenuManagerProposalData(proposalSnap.data(), proposalSnap.id);
        const sessionRef = getSessionRef(proposal.sessionId);
        const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;
        const session = sessionSnap && sessionSnap.exists ? requireAiMenuManagerSessionData(sessionSnap.data()) : null;
        assertAiMenuManagerProposalIdentity({ proposal, proposalId: params.proposalId, scope });
        assertAiMenuManagerSessionMatchesProposal(session, proposal);
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
        if (proposal.projectId && proposal.baseProjectHash) {
            const currentProject = await getAiMenuManagerProjectInTransaction(transaction, {
                tId: scope.tId,
                sId: scope.sId,
                projectId: proposal.projectId,
            });
            if (!currentProject) {
                throw new Error('Menu changed');
            }
            const currentContext = buildAiMenuManagerContextPacket({
                expectedProjectId: proposal.projectId,
                project: currentProject,
                storeName: proposal.scope.label,
            });
            if (buildAiMenuManagerContextBaseHash(currentContext) !== proposal.baseProjectHash) {
                throw new Error('Menu changed');
            }
        }
        assertAiMenuManagerPatchAllowedForAction({
            actionType: proposal.actionType,
            patch: proposal.patch,
            patchHash: proposal.patchHash,
        });

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

        if (session && sessionRef) {
            transaction.set(sessionRef, sanitizeAiMenuManagerFirestoreValue({
                counters: {
                    ...(session.counters || {}),
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
    projectId: string;
    actionType: string;
    executionId: string;
    patchHash: string;
    result: 'executed' | 'failed';
    message?: string;
    idempotencyKey: string;
}) {
    const scope = requireAiMenuManagerScopeDocumentIds(params);
    const proposalRef = requireProposalRef(params.proposalId);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const currentProposalSnap = await transaction.get(proposalRef);
        if (!currentProposalSnap.exists) throw new Error('Proposal not found');
        const proposal = requireAiMenuManagerProposalData(currentProposalSnap.data(), currentProposalSnap.id);
        assertAiMenuManagerProposalIdentity({ proposal, proposalId: params.proposalId, scope });
        if (String(proposal.projectId || '') !== params.projectId) {
            throw new Error('Scope mismatch');
        }
        if (proposal.actionType !== params.actionType) {
            throw new Error('Action type mismatch');
        }
        if (
            !proposal.executionDirective
            || proposal.executionDirective.proposalId !== proposal.proposalId
            || proposal.executionDirective.executionId !== params.executionId
            || proposal.executionDirective.actionType !== proposal.actionType
            || proposal.executionDirective.patchHash !== params.patchHash
            || proposal.patchHash !== params.patchHash
            || String(proposal.executionDirective.scope?.tId) !== scope.tId
            || String(proposal.executionDirective.scope?.sId) !== scope.sId
            || String(proposal.executionDirective.scope?.projectId || '') !== params.projectId
        ) {
            throw new Error('Execution directive mismatch');
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
        const directiveExpiry = timestampToDate(proposal.executionDirective.expiresAt);
        if (!directiveExpiry || directiveExpiry.getTime() < Date.now()) {
            throw new Error('Execution directive expired');
        }

        let verified = false;
        if (params.result === 'executed' && proposal.patch && proposal.projectId) {
            const project = await getAiMenuManagerProjectInTransaction(transaction, {
                tId: proposal.tId,
                sId: proposal.sId,
                projectId: proposal.projectId,
            });
            verified = project
                ? projectContainsAiMenuManagerPatch(project, proposal.patch, proposal.projectId)
                : false;
        }

        const sessionRef = getSessionRef(proposal.sessionId);
        const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;
        const session = sessionSnap && sessionSnap.exists ? requireAiMenuManagerSessionData(sessionSnap.data()) : null;
        assertAiMenuManagerSessionMatchesProposal(session, proposal);
        const nextStatus: AiMenuManagerProposalStatus = params.result === 'executed' && verified ? 'executed' : 'failed';
        const receipt: AiMenuManagerReceipt = buildAiMenuManagerReceipt({
            proposalId: proposal.proposalId,
            actionType: proposal.actionType,
            projectId: proposal.projectId,
            status: nextStatus === 'executed' ? 'executed' : 'failed',
            title: proposal.cardPayload?.title || proposal.beforeAfterSummary?.title || 'Menu Manager update',
            message: params.message || (nextStatus === 'executed' ? 'Change applied.' : 'The approved change could not be verified.'),
        });

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

        if (session && sessionRef) {
            const nextSession = prepareAiMenuManagerSessionWrite({
                ...session,
                pendingCardSummaries: (session.pendingCardSummaries || [])
                    .filter((entry) => entry.proposalId !== params.proposalId),
                recentReceiptSummaries: [
                    receipt,
                    ...(session.recentReceiptSummaries || []).filter((entry) => entry.proposalId !== params.proposalId),
                ].slice(0, MAX_RECEIPTS),
                compactMessages: appendCompactReceipt(session.compactMessages, receipt),
                counters: {
                    ...(session.counters || {}),
                    commands: session.counters?.commands || 0,
                    proposalsCreated: session.counters?.proposalsCreated || 0,
                    approvals: session.counters?.approvals || 0,
                    executions: (session.counters?.executions || 0) + (nextStatus === 'executed' ? 1 : 0),
                },
            }, session);
            transaction.set(sessionRef, sanitizeAiMenuManagerFirestoreValue({
                pendingCardSummaries: nextSession.pendingCardSummaries,
                recentReceiptSummaries: nextSession.recentReceiptSummaries,
                compactMessages: nextSession.compactMessages,
                counters: nextSession.counters,
                ...buildAiMenuManagerPendingState(nextSession),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }), { merge: true });
        }

        return { status: nextStatus, receipt, verified };
    });
}
