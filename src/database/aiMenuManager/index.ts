import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { buildAiMenuManagerReceipt } from '@lib/ai-menu-manager/receiptBuilder';
import { sanitizeAiMenuManagerFirestoreValue } from '@lib/ai-menu-manager/firestoreSanitize';
import {
    buildAiMenuManagerContextBaseHash,
    buildAiMenuManagerContextPacket,
} from '@lib/ai-menu-manager/contextPacket';
import { resolveAiMenuManagerCommand } from '@lib/ai-menu-manager/commandResolver';
import {
    aiMenuManagerPatchesConflict,
    resolveAiMenuManagerCompoundCommand,
} from '@lib/ai-menu-manager/compoundCommand';
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { createRuntimeId } from '@lib/runtime/randomId';
import {
    buildDailySessionId,
    buildExecutionId,
    buildProposalId,
    hashStableValue,
    todaySessionDate,
} from '@lib/ai-menu-manager/idempotency';
import { assertAiMenuManagerPatchAllowedForAction } from '@lib/ai-menu-manager/patchPolicy';
import { applyAiMenuManagerProjectPatch } from '@lib/ai-menu-manager/actions/projectPatches';
import { listAiMenuManagerExecutableActions } from '@lib/ai-menu-manager/actionRegistry';
import {
    buildAiMenuManagerModelRouteCard,
    buildAiMenuManagerPlannerContext,
    doesAiMenuManagerModelRouteMatchResolvedEntities,
    isAiMenuManagerModelResolutionCompatible,
    materializeAiMenuManagerModelRoute,
    type AiMenuManagerModelRouteResult,
} from '@lib/ai-menu-manager/modelRouter';
import getActiveSession from '@lib/auth/getActiveSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
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
const AI_MENU_MANAGER_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const DUPLICATE_COMMAND_WINDOW_MS = 10_000;
const AI_MENU_MANAGER_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type AiMenuManagerApiPhase = 'command' | 'inbox' | 'plan' | 'proposal_action' | 'proposal_complete';

type AiMenuManagerApiErrorPayload = {
    code?: unknown;
};

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
    replaceOperationId?: string;
    sessionSnapshot?: AiMenuManagerSessionDoc | null;
    storePublicContext?: {
        customDomain?: string;
        screenToken?: string;
        subdomain?: string;
    };
    storeName?: string;
};

type AiMenuManagerServerBackedResponse = AiMenuManagerCommandResponse & {
    operations: AiMenuManagerPendingOperation[];
    session?: undefined;
};

type AiMenuManagerPlannerResponse = {
    route: AiMenuManagerModelRouteResult | null;
};

export type AiMenuManagerClientCommandResponse = AiMenuManagerCommandResponse & {
    operations: AiMenuManagerPendingOperation[];
    session?: AiMenuManagerSessionDoc;
};

export type AiMenuManagerClientInboxResponse = AiMenuManagerInboxResponse & {
    sessionId: string;
    operations: AiMenuManagerPendingOperation[];
};

function createAiMenuManagerApiError(params: {
    code?: string;
    message?: string;
    status?: number;
}) {
    const error = new Error(params.message || 'Menu Manager request failed') as Error & {
        code?: string;
        status?: number;
    };
    if (params.code) {
        error.code = params.code.slice(0, 64);
    }
    if (params.status !== undefined) {
        error.status = params.status;
    }
    return error;
}

async function readApiResponse<T>(response: Response, phase: AiMenuManagerApiPhase): Promise<T> {
    let payload: T | null = null;
    try {
        payload = await readJsonResponseWithLimit<T>(
            response,
            AI_MENU_MANAGER_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('ai_menu_manager_response_parse_failed', error, {
            maxBytes: AI_MENU_MANAGER_RESPONSE_JSON_MAX_BYTES,
            phase,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        if (response.ok) {
            throw createAiMenuManagerApiError({
                code: 'response_parse_failed',
                message: 'Menu Manager response could not be read',
                status: response.status,
            });
        }
    }

    if (!response.ok) {
        const errorPayload = payload && typeof payload === 'object'
            ? payload as AiMenuManagerApiErrorPayload
            : null;
        throw createAiMenuManagerApiError({
            code: typeof errorPayload?.code === 'string' ? errorPayload.code : undefined,
            status: response.status,
        });
    }

    if (payload === null) {
        logRuntimeFailure('ai_menu_manager_response_parse_failed', new Error('empty_response'), {
            maxBytes: AI_MENU_MANAGER_RESPONSE_JSON_MAX_BYTES,
            phase,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw createAiMenuManagerApiError({
            code: 'empty_response',
            message: 'Menu Manager response could not be read',
            status: response.status,
        });
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

function isFirestorePermissionDenied(error: unknown) {
    const code = typeof (error as any)?.code === 'string' ? (error as any).code : '';
    const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
    return code === 'permission-denied' || message.toLowerCase().includes('permission');
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

    if (!session?.user || !tId || !requestedStoreId) {
        throw new Error('Menu Manager could not access this store');
    }

    if (allowedStoreIds.size > 0 && !allowedStoreIds.has(requestedStoreId)) {
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
            kind: 'reply' as const,
            text: params.managerText,
            createdAt,
        },
    ].slice(-MAX_COMPACT_MESSAGES);
}

function appendCompactReceipt(
    existing: AiMenuManagerSessionDoc['compactMessages'] | undefined,
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

function appendCompactReceipts(
    existing: AiMenuManagerSessionDoc['compactMessages'] | undefined,
    receipts: AiMenuManagerReceipt[],
) {
    return receipts.reduce<AiMenuManagerSessionDoc['compactMessages']>(
        (messages, receipt) => appendCompactReceipt(messages, receipt),
        existing || [],
    );
}

function normalizeOperations(session: AiMenuManagerSessionDoc | null, projectId: string) {
    return (session?.pendingOperations || [])
        .filter((operation) => (
            operation
            && operation.operationId
            && normalizeId(operation.projectId) === normalizeId(projectId)
            && ['pending_approval', 'manual_task', 'answered'].includes(operation.card?.status)
        ))
        .slice(0, MAX_PENDING_OPERATIONS);
}

function buildAiMenuManagerCommandFingerprint(params: {
    baseProjectHash: string;
    composerContext?: AiMenuManagerCommandContextSelection;
    text: string;
}) {
    return hashStableValue({
        baseProjectHash: params.baseProjectHash,
        composerContext: params.composerContext
            ? {
                target: params.composerContext.target,
                selectedEntityIds: [...params.composerContext.selectedEntityIds].sort(),
            }
            : null,
        text: params.text.toLowerCase().replace(/\s+/g, ' ').trim(),
    });
}

function getRecentDuplicateOperations(params: {
    operations: AiMenuManagerPendingOperation[];
    sourceFingerprint: string;
}) {
    const cutoff = Date.now() - DUPLICATE_COMMAND_WINDOW_MS;
    const recentMatches = params.operations.filter((operation) => (
        operation.sourceFingerprint === params.sourceFingerprint
        && Date.parse(operation.createdAt) >= cutoff
    ));
    const newestMatch = recentMatches[0];
    if (!newestMatch) return [];

    const matchingGroup = recentMatches.filter((operation) => (
        newestMatch.commandGroupId
            ? operation.commandGroupId === newestMatch.commandGroupId
            : operation.operationId === newestMatch.operationId
    ));
    return matchingGroup.length === (newestMatch.commandGroupSize || 1)
        ? matchingGroup
        : [];
}

function firstOperationEntityLabel(operation: AiMenuManagerPendingOperation, kind: string) {
    return operation.card.entityRefs.find((entity) => entity.kind === kind)?.label;
}

function buildAiMenuManagerFollowUpCommand(
    text: string,
    operations: AiMenuManagerPendingOperation[],
): { replaceOperationId: string; text: string } | null {
    const pendingProposals = operations.filter((operation) => (
        operation.card.kind === 'proposal'
        && operation.card.status === 'pending_approval'
    ));
    if (pendingProposals.length !== 1) return null;

    const operation = pendingProposals[0];
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    const itemName = firstOperationEntityLabel(operation, 'menu_item');
    const categoryName = firstOperationEntityLabel(operation, 'category');

    if (operation.card.actionType === 'item_price_update' && itemName) {
        const priceMatch = trimmed.match(/^(?:actually\s+|make\s+it\s+|change\s+(?:it\s+)?to\s+|set\s+(?:it\s+)?to\s+|to\s+)?(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees)?$/i);
        if (priceMatch?.[1]) {
            return {
                replaceOperationId: operation.operationId,
                text: `${itemName} ${priceMatch[1]}`,
            };
        }
    }

    if (operation.card.actionType === 'item_availability_update' && itemName) {
        if (/\b(sold\s*out|unavailable|not\s+available|khatam|over)\b/.test(lower)) {
            return {
                replaceOperationId: operation.operationId,
                text: `${itemName} sold out`,
            };
        }
        if (/\b(available|restore|back|in\s*stock)\b/.test(lower)) {
            return {
                replaceOperationId: operation.operationId,
                text: `${itemName} available`,
            };
        }
    }

    if (operation.card.actionType === 'item_visibility_update' && itemName) {
        if (/\b(hide|hidden|disable|deactivate|remove|turn\s+off)\b/.test(lower)) {
            return {
                replaceOperationId: operation.operationId,
                text: `Hide ${itemName}`,
            };
        }
        if (/\b(show|visible|restore|enable|activate|turn\s+on)\b/.test(lower)) {
            return {
                replaceOperationId: operation.operationId,
                text: `Show ${itemName}`,
            };
        }
    }

    if (operation.card.actionType === 'category_visibility_update' && categoryName) {
        if (/\b(hide|hidden|disable|deactivate|remove|turn\s+off)\b/.test(lower)) {
            return {
                replaceOperationId: operation.operationId,
                text: `Hide ${categoryName} category`,
            };
        }
        if (/\b(show|visible|restore|enable|activate|turn\s+on)\b/.test(lower)) {
            return {
                replaceOperationId: operation.operationId,
                text: `Show ${categoryName} category`,
            };
        }
    }

    if (operation.card.actionType === 'menu_special_note_update') {
        const noteMatch = trimmed.match(/^(?:actually\s+|change\s+(?:it\s+)?to\s+|set\s+(?:it\s+)?to\s+|note\s+to\s+|show\s+note\s*:?\s*)(.+)$/i);
        if (noteMatch?.[1]?.trim()) {
            return {
                replaceOperationId: operation.operationId,
                text: `Show note: ${noteMatch[1].trim()}`,
            };
        }
    }

    if (operation.card.actionType.startsWith('menu_design_')) {
        const designFollowUp: Array<[RegExp, string]> = [
            [/\b(warm|warmer|inviting)\b/, 'Make menu warm and inviting'],
            [/\b(premium|minimal|fine)\b/, 'Make menu premium'],
            [/\b(clean|calm|simple)\b/, 'Make menu clean and simple'],
            [/\b(bold|social|strong)\b/, 'Make menu bold for social sharing'],
            [/\b(fast|direct|quick)\b/, 'Make menu fast and direct'],
            [/\b(grid)\b/, 'Use grid layout'],
            [/\b(list)\b/, 'Use list layout'],
            [/\b(card|cards)\b/, 'Use card layout'],
            [/\b(hide|no)\s+(?:item\s+)?prices?\b/, 'Hide item prices'],
            [/\b(show)\s+(?:item\s+)?prices?\b/, 'Show item prices'],
            [/\b(hide|no)\s+(?:item\s+)?images?\b/, 'Hide item images'],
            [/\b(show)\s+(?:item\s+)?images?\b/, 'Show item images'],
        ];
        const match = designFollowUp.find(([pattern]) => pattern.test(lower));
        if (match) {
            return {
                replaceOperationId: operation.operationId,
                text: match[1],
            };
        }
    }

    return null;
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
    return createRuntimeId(prefix);
}

async function sendAiMenuManagerServerCommand(
    request: Omit<AiMenuManagerCommandRequest, 'idempotencyKey'> & { idempotencyKey?: string },
): Promise<AiMenuManagerCommandResponse> {
    const body: AiMenuManagerCommandRequest = {
        storeId: String(request.storeId),
        projectId: request.projectId,
        inputType: request.inputType,
        idempotencyKey: request.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_cmd'),
    };
    if (request.sessionId) body.sessionId = request.sessionId;
    if (request.text !== undefined) body.text = request.text;
    if (request.uploadRefs?.length) body.uploadRefs = request.uploadRefs;
    if (request.composerContext) body.composerContext = request.composerContext;
    if (request.clientContextVersion) body.clientContextVersion = request.clientContextVersion;
    if (request.replaceOperationId) body.replaceOperationId = request.replaceOperationId;

    const response = await fetch('/api/ai-menu-manager/command', {
        ...AI_MENU_MANAGER_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return readApiResponse<AiMenuManagerCommandResponse>(response, 'command');
}

async function sendAiMenuManagerPlannerRequest(params: {
    allowedActions: AiMenuManagerActionType[];
    composerContext?: AiMenuManagerCommandContextSelection;
    context: ReturnType<typeof buildAiMenuManagerPlannerContext>;
    ownerMessage: string;
    projectId: string;
    storeId: string | number;
}) {
    const response = await fetch('/api/ai-menu-manager/plan', {
        ...AI_MENU_MANAGER_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            allowedActions: params.allowedActions,
            composerContext: params.composerContext,
            context: params.context,
            ownerMessage: params.ownerMessage,
            projectId: params.projectId,
            storeId: String(params.storeId),
        }),
    });
    if (response.status === 404 || response.status === 503) return null;
    const payload = await readApiResponse<AiMenuManagerPlannerResponse>(response, 'plan');
    return payload.route;
}

async function getAiMenuManagerServerInbox(params: {
    projectId: string;
    sessionDate?: string;
    sessionId?: string;
    storeId: string | number;
}): Promise<AiMenuManagerInboxResponse & { sessionId: string }> {
    const query = new URLSearchParams({
        projectId: params.projectId,
        storeId: String(params.storeId),
    });
    if (params.sessionId) query.set('sessionId', params.sessionId);
    if (params.sessionDate) query.set('sessionDate', params.sessionDate);
    const response = await fetch(`/api/ai-menu-manager/inbox?${query.toString()}`, AI_MENU_MANAGER_REQUEST_POLICY);
    return readApiResponse<AiMenuManagerInboxResponse & { sessionId: string }>(response, 'inbox');
}

function buildServerBackedOperations(params: {
    cards: AiMenuManagerCommandResponse['cards'];
    projectId: string;
    scope: ClientScope;
    sessionId: string;
}): AiMenuManagerPendingOperation[] {
    const now = nowIso();
    return params.cards.map((card) => ({
        operationId: card.cardId,
        sessionId: params.sessionId,
        tId: params.scope.tId,
        sId: params.scope.sId,
        projectId: params.projectId,
        card,
        executionMode: 'existing_server_api',
        idempotencyKeys: [],
        createdAt: now,
        updatedAt: now,
    }));
}

async function sendAiMenuManagerServerBackedCommand(
    request: AiMenuManagerClientCommandRequest,
    scope: ClientScope,
): Promise<AiMenuManagerServerBackedResponse> {
    const response = await sendAiMenuManagerServerCommand(request);
    return {
        ...response,
        operations: buildServerBackedOperations({
            cards: response.cards,
            projectId: request.projectId,
            scope,
            sessionId: response.sessionId,
        }),
    };
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
    const sessionRef = getSessionDocRef(sessionId);
    const existingSession = getMatchingSessionSnapshot({
        sessionId,
        scope,
        projectId: request.projectId,
        snapshot: request.sessionSnapshot,
    });
    const existingOperations = normalizeOperations(existingSession, request.projectId);
    const sourceFingerprint = buildAiMenuManagerCommandFingerprint({
        baseProjectHash,
        composerContext: request.composerContext,
        text,
    });
    const duplicateOperations = getRecentDuplicateOperations({
        operations: existingOperations,
        sourceFingerprint,
    });
    if (existingSession && duplicateOperations.length > 0 && !request.replaceOperationId) {
        return {
            sessionId,
            messageId: duplicateOperations[0].commandGroupId || duplicateOperations[0].operationId,
            cards: duplicateOperations.map((operation) => operation.card),
            operations: existingOperations,
            session: existingSession,
            nextRequiredAction: duplicateOperations.some((operation) => operation.card.kind === 'clarification')
                ? 'clarification'
                : duplicateOperations.some((operation) => operation.card.status === 'pending_approval')
                    ? 'owner_approval'
                    : 'none',
        };
    }
    const followUp = request.replaceOperationId
        ? null
        : buildAiMenuManagerFollowUpCommand(text, existingOperations);
    let resolverText = followUp?.text || text;
    const replaceOperationId = request.replaceOperationId || followUp?.replaceOperationId;
    let resolverComposerContext = followUp ? undefined : request.composerContext;
    const compoundParts = !replaceOperationId
        ? resolveAiMenuManagerCompoundCommand({
            text: resolverText,
            tId: scope.tId,
            sId: scope.sId,
            projectId: request.projectId,
            context,
            composerContext: resolverComposerContext,
            createdAt,
        })
        : null;
    let draft = compoundParts
        ? { card: compoundParts[0].card, resolved: compoundParts[0].resolved }
        : resolveAiMenuManagerCommand({
            text: resolverText,
            tId: scope.tId,
            sId: scope.sId,
            projectId: request.projectId,
            context,
            composerContext: resolverComposerContext,
            cardId: `amm_draft_${idempotencyKey}`,
            createdAt,
        });
    const usedDeterministicRoute = Boolean(compoundParts || draft.resolved);
    let plannedRoute: AiMenuManagerModelRouteResult | null = null;
    let plannerAttempted = false;
    let plannerAccepted = false;
    if (
        !compoundParts
        && !draft.resolved
        && FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_MODEL_ROUTER
        && FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER
    ) {
        plannerAttempted = true;
        try {
            plannedRoute = await sendAiMenuManagerPlannerRequest({
                allowedActions: listAiMenuManagerExecutableActions(),
                composerContext: resolverComposerContext,
                context: buildAiMenuManagerPlannerContext({
                    composerContext: resolverComposerContext,
                    context,
                    ownerMessage: resolverText,
                    pendingOperations: existingOperations,
                }),
                ownerMessage: resolverText,
                projectId: request.projectId,
                storeId: request.storeId,
            });
        } catch (error) {
            logRuntimeFailure('ai_menu_manager_planner_request_failed', error, {
                ...getBoundedRuntimeStringContext('projectId', request.projectId),
                ...getBoundedRuntimeStringContext('storeId', request.storeId),
                inputLength: resolverText.length,
            });
        }

        if (plannedRoute?.outcome === 'prepare_action' && plannedRoute.actionType) {
            const materialized = materializeAiMenuManagerModelRoute({ context, result: plannedRoute });
            if (materialized) {
                const plannedDraft = resolveAiMenuManagerCommand({
                    text: materialized.text,
                    tId: scope.tId,
                    sId: scope.sId,
                    projectId: request.projectId,
                    context,
                    composerContext: materialized.composerContext,
                    cardId: `amm_draft_${idempotencyKey}`,
                    createdAt,
                });
                if (
                    plannedDraft.resolved
                    && isAiMenuManagerModelResolutionCompatible(
                        plannedRoute.actionType,
                        plannedDraft.resolved.actionType,
                    )
                    && doesAiMenuManagerModelRouteMatchResolvedEntities({
                        result: plannedRoute,
                        resolvedEntityRefs: plannedDraft.resolved.entityRefs,
                    })
                ) {
                    resolverText = materialized.text;
                    resolverComposerContext = materialized.composerContext;
                    draft = plannedDraft;
                    plannerAccepted = true;
                }
            }
        } else if (plannedRoute) {
            const modelCard = buildAiMenuManagerModelRouteCard({
                cardId: `amm_draft_${idempotencyKey}`,
                createdAt,
                result: plannedRoute,
                scope: {
                    type: 'project',
                    tId: scope.tId,
                    sId: scope.sId,
                    projectId: request.projectId,
                    label: `${context.storeName} / ${context.projectName}`,
                },
            });
            if (modelCard) {
                draft = { resolved: null, card: modelCard };
                plannerAccepted = true;
            }
        }
    }
    const commandGroupId = compoundParts
        ? `amm_group_${hashStableValue({ idempotencyKey, sessionId, sourceFingerprint }).slice(0, 32)}`
        : undefined;
    const resolvedEntries: Array<{
        commandIdempotencyKey: string;
        operationId: string;
        result: ReturnType<typeof resolveAiMenuManagerCommand>;
    }> = compoundParts
        ? compoundParts.map((part, index) => {
            const commandIdempotencyKey = `${idempotencyKey}:${index}`;
            const operationId = buildProposalId({
                tId: scope.tId,
                sId: scope.sId,
                projectId: request.projectId,
                idempotencyKey: commandIdempotencyKey,
                actionType: part.resolved.actionType,
                patchHash: part.resolved.patchHash,
            });
            const result = resolveAiMenuManagerCommand({
                text: part.text,
                tId: scope.tId,
                sId: scope.sId,
                projectId: request.projectId,
                context,
                composerContext: resolverComposerContext,
                cardId: operationId,
                createdAt,
            });
            if (
                !result.resolved?.patch
                || result.resolved.executionMode !== 'client_project_mutation'
                || result.card.kind !== 'proposal'
            ) {
                throw new Error('Menu Manager could not prepare all requested changes safely');
            }
            return { commandIdempotencyKey, operationId, result };
        })
        : (() => {
            const operationId = buildProposalId({
                tId: scope.tId,
                sId: scope.sId,
                projectId: request.projectId,
                idempotencyKey,
                actionType: draft.card.actionType,
                patchHash: draft.resolved?.patchHash,
            });
            const result = plannedRoute && plannedRoute.outcome !== 'prepare_action' && !draft.resolved
                ? {
                    resolved: null,
                    card: buildAiMenuManagerModelRouteCard({
                        cardId: operationId,
                        createdAt,
                        result: plannedRoute,
                        scope: {
                            type: 'project' as const,
                            tId: scope.tId,
                            sId: scope.sId,
                            projectId: request.projectId,
                            label: `${context.storeName} / ${context.projectName}`,
                        },
                    }) || draft.card,
                }
                : resolveAiMenuManagerCommand({
                    text: resolverText,
                    tId: scope.tId,
                    sId: scope.sId,
                    projectId: request.projectId,
                    context,
                    composerContext: resolverComposerContext,
                    cardId: operationId,
                    createdAt,
                });
            return [{ commandIdempotencyKey: idempotencyKey, operationId, result }];
        })();
    const newOperations: AiMenuManagerPendingOperation[] = resolvedEntries.map((entry) => ({
        operationId: entry.operationId,
        commandGroupId,
        commandGroupSize: resolvedEntries.length,
        sourceFingerprint,
        sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId: request.projectId,
        card: entry.result.card,
        executionMode: entry.result.resolved?.executionMode || 'read_only_card',
        patch: entry.result.resolved?.patch,
        patchHash: entry.result.resolved?.patchHash,
        baseProjectUpdatedAt: context.projectUpdatedAt,
        baseProjectHash,
        idempotencyKeys: [entry.commandIdempotencyKey],
        createdAt,
        updatedAt: createdAt,
    }));
    const newOperationIds = new Set(newOperations.map((operation) => operation.operationId));
    const retainedOperations = existingOperations.filter((entry) => (
        !newOperationIds.has(entry.operationId)
        && (!replaceOperationId || entry.operationId !== replaceOperationId)
    ));
    const pendingOperations = [
        ...newOperations,
        ...retainedOperations,
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
            managerText: newOperations.length > 1
                ? `Prepared ${newOperations.length} updates. Review them, then approve together.`
                : ['answer', 'clarification', 'unsupported'].includes(newOperations[0].card.kind)
                    ? newOperations[0].card.message
                    : newOperations[0].card.title,
            messageId: commandGroupId || newOperations[0].operationId,
        }),
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        pendingOperations,
        recentReceiptSummaries,
        counters: {
            ...(existingSession?.counters || {}),
            commands: (existingSession?.counters?.commands || 0) + 1,
            proposalsCreated: (existingSession?.counters?.proposalsCreated || 0)
                + newOperations.filter((operation) => operation.card.kind === 'proposal').length,
            approvals: existingSession?.counters?.approvals || 0,
            executions: existingSession?.counters?.executions || 0,
            compoundCommands: (existingSession?.counters?.compoundCommands || 0) + (compoundParts ? 1 : 0),
            deterministicRoutes: (existingSession?.counters?.deterministicRoutes || 0) + (usedDeterministicRoute ? 1 : 0),
            plannerAttempts: (existingSession?.counters?.plannerAttempts || 0) + (plannerAttempted ? 1 : 0),
            plannerAccepted: (existingSession?.counters?.plannerAccepted || 0) + (plannerAccepted ? 1 : 0),
            plannerFallbacks: (existingSession?.counters?.plannerFallbacks || 0)
                + (plannerAttempted && !plannerAccepted ? 1 : 0),
            clarifications: (existingSession?.counters?.clarifications || 0)
                + newOperations.filter((operation) => operation.card.kind === 'clarification').length,
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

    try {
        await setDoc(sessionRef, sessionPayload, { merge: true });
    } catch (error) {
        if (isFirestorePermissionDenied(error)) {
            return sendAiMenuManagerServerBackedCommand({
                ...request,
                idempotencyKey,
            }, scope);
        }
        throw error;
    }

    return {
        sessionId,
        messageId: commandGroupId || newOperations[0].operationId,
        cards: newOperations.map((operation) => operation.card),
        operations: pendingOperations,
        session: nextSession,
        nextRequiredAction: newOperations.some((operation) => operation.card.kind === 'clarification')
            ? 'clarification'
            : newOperations.some((operation) => operation.card.status === 'pending_approval')
                ? 'owner_approval'
                : 'none',
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
    let sessionSnap;
    try {
        sessionSnap = await getDoc(getSessionDocRef(sessionId));
    } catch (error) {
        if (isFirestorePermissionDenied(error)) {
            const inbox = await getAiMenuManagerServerInbox({
                projectId: params.projectId,
                sessionDate: params.sessionDate,
                sessionId,
                storeId: params.storeId,
            });
            return {
                ...inbox,
                operations: buildServerBackedOperations({
                    cards: inbox.cards,
                    projectId: params.projectId,
                    scope,
                    sessionId: inbox.sessionId,
                }),
            };
        }
        throw error;
    }
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
    assertAiMenuManagerPatchAllowedForAction({
        actionType: params.operation.card.actionType,
        patch: params.operation.patch!,
        patchHash: params.operation.patchHash,
    });

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

export function buildAiMenuManagerClientBatchExecution(params: {
    operations: AiMenuManagerPendingOperation[];
    project: Project;
    storeName?: string;
    businessType?: string;
}): { directives: AiMenuManagerExecutionDirective[]; patchedProject: Project } {
    if (params.operations.length < 2) {
        throw new Error('At least two prepared updates are needed');
    }

    const commandGroupId = params.operations[0].commandGroupId;
    if (
        !commandGroupId
        || params.operations.some((operation) => (
            operation.commandGroupId !== commandGroupId
            || operation.sessionId !== params.operations[0].sessionId
            || normalizeId(operation.projectId) !== normalizeId(params.operations[0].projectId)
        ))
    ) {
        throw new Error('Prepared updates no longer belong to the same request');
    }

    const patches = params.operations.map((operation) => operation.patch).filter(Boolean);
    if (
        patches.length !== params.operations.length
        || aiMenuManagerPatchesConflict(patches)
    ) {
        throw new Error('Prepared updates overlap. Review them separately.');
    }

    const directives = params.operations.map((operation) => buildAiMenuManagerClientExecutionDirective({
        operation,
        project: params.project,
        storeName: params.storeName,
        businessType: params.businessType,
    }));
    const patchedProject = directives.reduce(
        (project, directive) => applyAiMenuManagerProjectPatch(project, directive),
        params.project,
    );

    return { directives, patchedProject };
}

export async function completeAiMenuManagerClientOperations(params: {
    operations: AiMenuManagerPendingOperation[];
    result: 'executed' | 'failed';
    sessionSnapshot?: AiMenuManagerSessionDoc | null;
}): Promise<{ receipts: AiMenuManagerReceipt[]; session: AiMenuManagerSessionDoc }> {
    assertAiMenuManagerEnabled();
    if (params.operations.length < 2) {
        throw new Error('At least two prepared updates are needed');
    }

    const firstOperation = params.operations[0];
    const commandGroupId = firstOperation.commandGroupId;
    if (
        !commandGroupId
        || params.operations.some((operation) => (
            operation.commandGroupId !== commandGroupId
            || operation.sessionId !== firstOperation.sessionId
            || normalizeId(operation.projectId) !== normalizeId(firstOperation.projectId)
        ))
    ) {
        throw new Error('Prepared updates no longer belong to the same request');
    }

    const session = getMatchingOperationSessionSnapshot(firstOperation, params.sessionSnapshot);
    const pendingOperationIds = new Set(normalizeOperations(session, firstOperation.projectId)
        .map((operation) => operation.operationId));
    if (params.operations.some((operation) => !pendingOperationIds.has(operation.operationId))) {
        throw new Error('One or more cards no longer match the selected menu');
    }

    const receipts = params.operations.map((operation) => buildAiMenuManagerReceipt({
        proposalId: operation.operationId,
        actionType: operation.card.actionType,
        projectId: operation.projectId,
        status: params.result,
        title: operation.card.title,
        message: params.result === 'executed'
            ? `${operation.card.title} applied.`
            : `${operation.card.title} could not be applied.`,
    }));
    const completedIds = new Set(params.operations.map((operation) => operation.operationId));
    const pendingOperations = normalizeOperations(session, firstOperation.projectId)
        .filter((operation) => !completedIds.has(operation.operationId));
    const compactMessagesWithReceipts = appendCompactReceipts(session.compactMessages, receipts);
    const recentReceiptSummaries = [
        ...receipts,
        ...(session.recentReceiptSummaries || []).filter((receipt) => !completedIds.has(receipt.proposalId)),
    ].slice(0, MAX_RECEIPTS);
    const counters = {
        ...(session.counters || {}),
        commands: session.counters?.commands || 0,
        proposalsCreated: session.counters?.proposalsCreated || 0,
        approvals: (session.counters?.approvals || 0) + params.operations.length,
        executions: (session.counters?.executions || 0)
            + (params.result === 'executed' ? params.operations.length : 0),
    };

    await setDoc(getSessionDocRef(firstOperation.sessionId), sanitizeAiMenuManagerFirestoreValue({
        compactMessages: compactMessagesWithReceipts,
        pendingOperations,
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        recentReceiptSummaries,
        counters,
        updatedAt: serverTimestamp(),
    }), { merge: true });

    return {
        receipts,
        session: {
            ...session,
            compactMessages: compactMessagesWithReceipts,
            pendingOperations,
            pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
            recentReceiptSummaries,
            counters,
            updatedAt: nowIso(),
        } as AiMenuManagerSessionDoc,
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
    if (
        params.result === 'manual_task'
        && (
            params.operation.card.kind !== 'manual_task'
            || !params.operation.card.actions.includes('mark_done')
        )
    ) {
        throw new Error('This card cannot be marked done');
    }

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
        ...(session.counters || {}),
        commands: session.counters?.commands || 0,
        proposalsCreated: session.counters?.proposalsCreated || 0,
        approvals: (session.counters?.approvals || 0) + (params.result === 'manual_task' ? 0 : 1),
        executions: (session.counters?.executions || 0) + (params.result === 'executed' ? 1 : 0),
    };

    await setDoc(sessionRef, sanitizeAiMenuManagerFirestoreValue({
        compactMessages: appendCompactReceipt(session.compactMessages, receipt),
        pendingOperations,
        pendingCardSummaries: pendingOperations.map(buildPendingSummary).slice(0, MAX_PENDING_SUMMARIES),
        recentReceiptSummaries,
        counters,
        updatedAt: serverTimestamp(),
    }), { merge: true });

    const nextSession = {
        ...session,
        compactMessages: appendCompactReceipt(session.compactMessages, receipt),
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
}): Promise<{ data: { directive?: AiMenuManagerExecutionDirective; proposal?: { proposalId: string; actionType: string; status: string }; receipt?: AiMenuManagerReceipt; status?: string } }> {
    const response = await fetch(`/api/ai-menu-manager/proposals/${encodeURIComponent(params.proposalId)}/actions`, {
        ...AI_MENU_MANAGER_REQUEST_POLICY,
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
    return readApiResponse(response, 'proposal_action');
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
}): Promise<{ data: { receipt?: AiMenuManagerReceipt; status: string; verified?: boolean } }> {
    const response = await fetch(`/api/ai-menu-manager/proposals/${encodeURIComponent(params.proposalId)}/complete`, {
        ...AI_MENU_MANAGER_REQUEST_POLICY,
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
    return readApiResponse(response, 'proposal_complete');
}
