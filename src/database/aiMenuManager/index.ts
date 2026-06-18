import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { buildAiMenuManagerReceipt } from '@lib/ai-menu-manager/receiptBuilder';
import { sanitizeAiMenuManagerFirestoreValue } from '@lib/ai-menu-manager/firestoreSanitize';
import {
    buildAiMenuManagerContextBaseHash,
    buildAiMenuManagerContextPacket,
} from '@lib/ai-menu-manager/contextPacket';
import { resolveAiMenuManagerCommand } from '@lib/ai-menu-manager/commandResolver';
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import {
    buildDailySessionId,
    buildExecutionId,
    buildProposalId,
    todaySessionDate,
} from '@lib/ai-menu-manager/idempotency';
import getActiveSession from '@lib/auth/getActiveSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import type { Project } from '@template/main-app/projects/types';
import type {
    AiMenuManagerActionType,
    AiMenuManagerCommandContextSelection,
    AiMenuManagerCommandRequest,
    AiMenuManagerCommandResponse,
    AiMenuManagerExecutionDirective,
    AiMenuManagerInboxResponse,
    AiMenuManagerPendingOperation,
    AiMenuManagerProposalActionRequest,
    AiMenuManagerProposalCompleteRequest,
    AiMenuManagerReceipt,
    AiMenuManagerSessionDoc,
} from '@type/aiMenuManager';
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    Timestamp,
} from 'firebase/firestore';

const MAX_COMPACT_MESSAGES = 20;
const MAX_PENDING_SUMMARIES = 25;
const MAX_PENDING_OPERATIONS = 25;
const MAX_RECEIPTS = 20;
const SESSION_TTL_DAYS = 35;

type ClientScope = {
    tId: string | number;
    sId: string | number;
    userId?: string | number;
};

type AiMenuManagerClientCommandRequest = Omit<AiMenuManagerCommandRequest, 'idempotencyKey'> & {
    businessType?: string;
    composerContext?: AiMenuManagerCommandContextSelection;
    idempotencyKey?: string;
    project?: Project;
    sessionSnapshot?: AiMenuManagerSessionDoc | null;
    storePublicContext?: {
        customDomain?: string;
        screenToken?: string;
        subdomain?: string;
    };
    storeName?: string;
};

export type AiMenuManagerClientCommandResponse = AiMenuManagerCommandResponse & {
    operations: AiMenuManagerPendingOperation[];
    session?: AiMenuManagerSessionDoc;
};

export type AiMenuManagerClientInboxResponse = AiMenuManagerInboxResponse & {
    sessionId: string;
    operations: AiMenuManagerPendingOperation[];
};

async function readApiResponse<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.message || payload?.error || 'Menu Manager request failed';
        const error = new Error(message) as Error & { status?: number; payload?: any };
        error.status = response.status;
        error.payload = payload;
        throw error;
    }
    return payload as T;
}

function nowIso() {
    return new Date().toISOString();
}

function ttlDate(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getSessionDocRef(sessionId: string) {
    return doc(firebaseClient, DB_COLLECTIONS.AI_MENU_MANAGER_SESSIONS, sessionId);
}

function normalizeId(value: unknown) {
    return value === undefined || value === null ? '' : String(value);
}

function getSessionStoreIds(session: any) {
    const storeIds = new Set<string>();
    [
        session?.sId,
        session?.storeId,
        session?.user?.storeId,
        ...(Array.isArray(session?.user?.stores) ? session.user.stores.map((store: any) => store?.storeId ?? store?.id) : []),
        ...(Array.isArray(session?.storeIds) ? session.storeIds : []),
    ].forEach((entry) => {
        const normalized = normalizeId(entry);
        if (normalized) storeIds.add(normalized);
    });
    return storeIds;
}

async function resolveClientScope(storeId: string | number): Promise<ClientScope> {
    const session = await getActiveSession();
    const tId = session?.tId ?? (session as any)?.tenantId ?? session?.user?.tenantId;
    const requestedStoreId = normalizeId(storeId);
    const allowedStoreIds = getSessionStoreIds(session);

    if (!session?.user || !tId || !requestedStoreId || !allowedStoreIds.has(requestedStoreId)) {
        throw new Error('Menu Manager could not access this store');
    }

    await ensureFirebaseAuthForSession(session);

    return {
        tId,
        sId: requestedStoreId,
        userId: session?.uId || session?.user?.id,
    };
}

function buildSessionId(params: {
    sessionId?: string;
    sessionDate?: string;
    scope: ClientScope;
    projectId: string;
}) {
    return params.sessionId || buildDailySessionId({
        tId: params.scope.tId,
        sId: params.scope.sId,
        projectId: params.projectId,
        sessionDate: params.sessionDate || todaySessionDate(),
    });
}

function buildPendingSummary(operation: AiMenuManagerPendingOperation) {
    return {
        proposalId: operation.operationId,
        actionType: operation.card.actionType,
        title: operation.card.title,
        status: operation.card.status,
        risk: operation.card.risk,
        projectId: operation.projectId,
        updatedAt: operation.updatedAt,
    };
}

function compactMessages(params: {
    existing?: AiMenuManagerSessionDoc['compactMessages'];
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

function normalizeOperations(session: AiMenuManagerSessionDoc | null, projectId: string) {
    return (session?.pendingOperations || [])
        .filter((operation) => (
            operation
            && operation.operationId
            && normalizeId(operation.projectId) === normalizeId(projectId)
            && ['pending_approval', 'manual_task'].includes(operation.card?.status)
        ))
        .slice(0, MAX_PENDING_OPERATIONS);
}

function getMatchingSessionSnapshot(params: {
    projectId: string;
    scope: ClientScope;
    sessionId: string;
    snapshot?: AiMenuManagerSessionDoc | null;
}) {
    const snapshot = params.snapshot || null;
    if (
        !snapshot
        || normalizeId(snapshot.sessionId) !== normalizeId(params.sessionId)
        || normalizeId(snapshot.tId) !== normalizeId(params.scope.tId)
        || normalizeId(snapshot.sId) !== normalizeId(params.scope.sId)
        || normalizeId(snapshot.projectId) !== normalizeId(params.projectId)
    ) {
        return null;
    }
    return snapshot;
}

function getMatchingOperationSessionSnapshot(
    operation: AiMenuManagerPendingOperation,
    snapshot?: AiMenuManagerSessionDoc | null,
) {
    const session = snapshot || null;
    if (
        !session
        || normalizeId(session.sessionId) !== normalizeId(operation.sessionId)
        || normalizeId(session.tId) !== normalizeId(operation.tId)
        || normalizeId(session.sId) !== normalizeId(operation.sId)
        || normalizeId(session.projectId) !== normalizeId(operation.projectId)
    ) {
        throw new Error('Card no longer matches the selected menu');
    }

    const operationStillPending = normalizeOperations(session, operation.projectId)
        .some((entry) => entry.operationId === operation.operationId);
    if (!operationStillPending) {
        throw new Error('Card no longer matches the selected menu');
    }

    return session;
}

function isClientExecutableOperation(operation: AiMenuManagerPendingOperation) {
    return operation.executionMode === 'client_project_mutation'
        && operation.card.kind === 'proposal'
        && Boolean(operation.patch && operation.patchHash);
}

function assertAiMenuManagerEnabled() {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        throw new Error('Menu Manager is disabled');
    }
}

export function createAiMenuManagerIdempotencyKey(prefix = 'amm') {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${random}`;
}

async function sendAiMenuManagerServerCommand(
    request: Omit<AiMenuManagerCommandRequest, 'idempotencyKey'> & { idempotencyKey?: string },
): Promise<AiMenuManagerCommandResponse> {
    const response = await fetch('/api/ai-menu-manager/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...request,
            idempotencyKey: request.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_cmd'),
        }),
    });
    return readApiResponse<AiMenuManagerCommandResponse>(response);
}

export async function sendAiMenuManagerCommand(
    request: AiMenuManagerClientCommandRequest,
): Promise<AiMenuManagerClientCommandResponse> {
    assertAiMenuManagerEnabled();

    if (!request.project) {
        const response = await sendAiMenuManagerServerCommand(request);
        return { ...response, operations: [] };
    }

    const text = (request.text || '').trim();
    if (!text) throw new Error('Tell Menu Manager what changed');

    const scope = await resolveClientScope(request.storeId);
    const sessionDate = todaySessionDate();
    const sessionId = buildSessionId({
        sessionId: request.sessionId,
        sessionDate,
        scope,
        projectId: request.projectId,
    });
    const idempotencyKey = request.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_cmd');
    const createdAt = nowIso();
    const context = buildAiMenuManagerContextPacket({
        project: request.project,
        storeName: request.storeName || 'Selected store',
        businessType: request.businessType,
        storePublicContext: request.storePublicContext,
    });
    const baseProjectHash = buildAiMenuManagerContextBaseHash(context);
    const draft = resolveAiMenuManagerCommand({
        text,
        tId: scope.tId,
        sId: scope.sId,
        projectId: request.projectId,
        context,
        composerContext: request.composerContext,
        cardId: `amm_draft_${idempotencyKey}`,
        createdAt,
    });
    const operationId = buildProposalId({
        tId: scope.tId,
        sId: scope.sId,
        projectId: request.projectId,
        idempotencyKey,
        actionType: draft.card.actionType,
        patchHash: draft.resolved?.patchHash,
    });
    const resolved = resolveAiMenuManagerCommand({
        text,
        tId: scope.tId,
        sId: scope.sId,
        projectId: request.projectId,
        context,
        composerContext: request.composerContext,
        cardId: operationId,
        createdAt,
    });
    const operation: AiMenuManagerPendingOperation = {
        operationId,
        sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId: request.projectId,
        card: resolved.card,
        executionMode: resolved.resolved?.executionMode || 'read_only_card',
        patch: resolved.resolved?.patch,
        patchHash: resolved.resolved?.patchHash,
        baseProjectUpdatedAt: context.projectUpdatedAt,
        baseProjectHash,
        idempotencyKeys: [idempotencyKey],
        createdAt,
        updatedAt: createdAt,
    };
    const sessionRef = getSessionDocRef(sessionId);
    const existingSession = getMatchingSessionSnapshot({
        sessionId,
        scope,
        projectId: request.projectId,
        snapshot: request.sessionSnapshot,
    });
    const existingOperations = normalizeOperations(existingSession, request.projectId)
        .filter((entry) => entry.operationId !== operation.operationId);
    const pendingOperations = [
        operation,
        ...existingOperations,
    ].slice(0, MAX_PENDING_OPERATIONS);
    const recentReceiptSummaries = (existingSession?.recentReceiptSummaries || []).slice(0, MAX_RECEIPTS);
    const nextSession: AiMenuManagerSessionDoc = sanitizeAiMenuManagerFirestoreValue({
        sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId: request.projectId,
        sessionDate,
        storageMode: FEATURE_FLAGS.AI_MENU_MANAGER_SESSION_STORAGE_MODE,
        status: 'active',
        compactMessages: compactMessages({
            existing: existingSession?.compactMessages,
            ownerText: text,
            managerText: operation.card.title,
            messageId: operationId,
        }),
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        pendingOperations,
        recentReceiptSummaries,
        counters: {
            commands: (existingSession?.counters?.commands || 0) + 1,
            proposalsCreated: (existingSession?.counters?.proposalsCreated || 0) + 1,
            approvals: existingSession?.counters?.approvals || 0,
            executions: existingSession?.counters?.executions || 0,
        },
        artifactRefs: (existingSession?.artifactRefs || []).slice(0, 20),
        createdAt: existingSession?.createdAt || createdAt,
        updatedAt: createdAt,
        expiresAt: Timestamp.fromDate(ttlDate(SESSION_TTL_DAYS)),
    });
    const sessionPayload: Partial<AiMenuManagerSessionDoc> = sanitizeAiMenuManagerFirestoreValue({
        ...nextSession,
        updatedAt: serverTimestamp(),
        ...(!existingSession ? { createdAt: serverTimestamp() } : {}),
    });

    await setDoc(sessionRef, sessionPayload, { merge: true });

    return {
        sessionId,
        messageId: operationId,
        cards: [operation.card],
        operations: pendingOperations,
        session: nextSession,
        nextRequiredAction: operation.card.kind === 'clarification' ? 'clarification' : 'owner_approval',
    };
}

export async function getAiMenuManagerClientInbox(params: {
    storeId: string | number;
    projectId: string;
    sessionId?: string;
    sessionDate?: string;
}): Promise<AiMenuManagerClientInboxResponse> {
    assertAiMenuManagerEnabled();

    const scope = await resolveClientScope(params.storeId);
    const sessionId = buildSessionId({
        sessionId: params.sessionId,
        sessionDate: params.sessionDate || todaySessionDate(),
        scope,
        projectId: params.projectId,
    });
    const sessionSnap = await getDoc(getSessionDocRef(sessionId));
    const session = sessionSnap.exists() ? sessionSnap.data() as AiMenuManagerSessionDoc : null;

    if (
        !session
        || normalizeId(session.tId) !== normalizeId(scope.tId)
        || normalizeId(session.sId) !== normalizeId(scope.sId)
        || normalizeId(session.projectId) !== normalizeId(params.projectId)
    ) {
        return { session: null, cards: [], receipts: [], operations: [], sessionId };
    }

    const operations = normalizeOperations(session, params.projectId);

    return {
        session,
        sessionId,
        operations,
        cards: operations.map((operation) => operation.card),
        receipts: (session.recentReceiptSummaries || []).slice(0, MAX_RECEIPTS),
    };
}

export function buildAiMenuManagerClientExecutionDirective(params: {
    idempotencyKey?: string;
    operation: AiMenuManagerPendingOperation;
    project: Project;
    storeName?: string;
    businessType?: string;
}): AiMenuManagerExecutionDirective {
    assertAiMenuManagerEnabled();

    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES) {
        throw new Error('Menu Manager writes are disabled');
    }
    if (!isClientExecutableOperation(params.operation)) {
        throw new Error('This card uses its existing manual flow');
    }

    const context = buildAiMenuManagerContextPacket({
        project: params.project,
        storeName: params.storeName || params.operation.card.scope.label,
        businessType: params.businessType,
    });
    if (
        params.operation.baseProjectHash
        && buildAiMenuManagerContextBaseHash(context) !== params.operation.baseProjectHash
    ) {
        throw new Error('Menu changed. Prepare a new card before approval.');
    }

    const idempotencyKey = params.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_action');

    return {
        proposalId: params.operation.operationId,
        executionId: buildExecutionId(params.operation.operationId, idempotencyKey),
        actionType: params.operation.card.actionType,
        scope: params.operation.card.scope,
        baseProjectUpdatedAt: params.operation.baseProjectUpdatedAt,
        baseProjectHash: params.operation.baseProjectHash,
        patchHash: params.operation.patchHash as string,
        patch: params.operation.patch!,
        patchSummary: params.operation.card.beforeAfterSummary,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
}

export async function completeAiMenuManagerClientOperation(params: {
    operation: AiMenuManagerPendingOperation;
    result: 'executed' | 'failed' | 'manual_task';
    message?: string;
    idempotencyKey?: string;
    sessionSnapshot?: AiMenuManagerSessionDoc | null;
}): Promise<{ receipt: AiMenuManagerReceipt; session: AiMenuManagerSessionDoc }> {
    assertAiMenuManagerEnabled();

    const receipt = buildAiMenuManagerReceipt({
        proposalId: params.operation.operationId,
        actionType: params.operation.card.actionType,
        projectId: params.operation.projectId,
        status: params.result,
        title: params.operation.card.title,
        message: params.message || (
            params.result === 'manual_task'
                ? 'Manual task marked done. No MenuList menu truth was changed by this action.'
                : params.result === 'executed'
                    ? `${params.operation.card.title} applied.`
                    : `${params.operation.card.title} could not be applied.`
        ),
    });
    const sessionRef = getSessionDocRef(params.operation.sessionId);
    const session = getMatchingOperationSessionSnapshot(params.operation, params.sessionSnapshot);
    const pendingOperations = normalizeOperations(session, params.operation.projectId)
        .filter((entry) => entry.operationId !== params.operation.operationId);
    const recentReceiptSummaries = [
        receipt,
        ...(session.recentReceiptSummaries || []).filter((entry) => entry.proposalId !== params.operation.operationId),
    ].slice(0, MAX_RECEIPTS);
    const counters = {
        commands: session.counters?.commands || 0,
        proposalsCreated: session.counters?.proposalsCreated || 0,
        approvals: (session.counters?.approvals || 0) + (params.result === 'manual_task' ? 0 : 1),
        executions: (session.counters?.executions || 0) + (params.result === 'executed' ? 1 : 0),
    };

    await setDoc(sessionRef, sanitizeAiMenuManagerFirestoreValue({
        pendingOperations,
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        recentReceiptSummaries,
        counters,
        updatedAt: serverTimestamp(),
    }), { merge: true });

    const nextSession = {
        ...session,
        pendingOperations,
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        recentReceiptSummaries,
        counters,
        updatedAt: nowIso(),
    } as AiMenuManagerSessionDoc;

    return { receipt, session: nextSession };
}

export async function cancelAiMenuManagerClientOperation(params: {
    operation: AiMenuManagerPendingOperation;
    idempotencyKey?: string;
    sessionSnapshot?: AiMenuManagerSessionDoc | null;
}): Promise<{ session: AiMenuManagerSessionDoc; status: 'cancelled' }> {
    assertAiMenuManagerEnabled();

    const sessionRef = getSessionDocRef(params.operation.sessionId);
    const session = getMatchingOperationSessionSnapshot(params.operation, params.sessionSnapshot);
    const pendingOperations = normalizeOperations(session, params.operation.projectId)
        .filter((entry) => entry.operationId !== params.operation.operationId);

    await setDoc(sessionRef, sanitizeAiMenuManagerFirestoreValue({
        pendingOperations,
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        updatedAt: serverTimestamp(),
    }), { merge: true });

    const nextSession = {
        ...session,
        pendingOperations,
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        updatedAt: nowIso(),
    } as AiMenuManagerSessionDoc;

    return { status: 'cancelled', session: nextSession };
}

export async function submitAiMenuManagerProposalAction(params: {
    proposalId: string;
    storeId: string | number;
    projectId?: string;
    actionType?: AiMenuManagerActionType;
    action: AiMenuManagerProposalActionRequest['action'];
    idempotencyKey?: string;
}): Promise<{ data: { directive?: AiMenuManagerExecutionDirective; proposal?: { proposalId: string; actionType: string; status: string }; status?: string } }> {
    const response = await fetch(`/api/ai-menu-manager/proposals/${encodeURIComponent(params.proposalId)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            storeId: params.storeId,
            projectId: params.projectId,
            actionType: params.actionType,
            action: params.action,
            idempotencyKey: params.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_action'),
        }),
    });
    return readApiResponse(response);
}

export async function completeAiMenuManagerClientProposal(params: {
    proposalId: string;
    storeId: string | number;
    projectId?: string;
    actionType?: AiMenuManagerActionType;
    executionId: string;
    patchHash: string;
    result: AiMenuManagerProposalCompleteRequest['result'];
    message?: string;
    idempotencyKey?: string;
}) {
    const response = await fetch(`/api/ai-menu-manager/proposals/${encodeURIComponent(params.proposalId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            storeId: params.storeId,
            projectId: params.projectId,
            actionType: params.actionType,
            executionId: params.executionId,
            patchHash: params.patchHash,
            result: params.result,
            message: params.message,
            idempotencyKey: params.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_complete'),
        }),
    });
    return readApiResponse(response);
}
