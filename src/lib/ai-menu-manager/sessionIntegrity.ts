import { AI_MENU_MANAGER_ACTION_TYPES } from './actionTypes';
import { isDailySessionIdForScope, normalizeAiMenuManagerSessionDate } from './idempotency';
import {
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerScopeDocumentId,
    normalizeAiMenuManagerSessionId,
} from './routeIds';
import type {
    AiMenuManagerActionType,
    AiMenuManagerApprovalLevel,
    AiMenuManagerBeforeAfterSummary,
    AiMenuManagerCardKind,
    AiMenuManagerCardPayload,
    AiMenuManagerCardSummary,
    AiMenuManagerCommandContextTarget,
    AiMenuManagerCompactMessage,
    AiMenuManagerEntityRef,
    AiMenuManagerExecutionMode,
    AiMenuManagerLocalAction,
    AiMenuManagerPendingOperation,
    AiMenuManagerProjectPatch,
    AiMenuManagerProposalStatus,
    AiMenuManagerReceipt,
    AiMenuManagerRisk,
    AiMenuManagerScope,
    AiMenuManagerSessionDoc,
    AiMenuManagerSuggestedReply,
} from '@type/aiMenuManager';

const MAX_COMPACT_MESSAGES = 20;
const MAX_PENDING_SUMMARIES = 25;
const MAX_PENDING_OPERATIONS = 25;
const MAX_RECEIPTS = 20;
const MAX_ARTIFACT_REFS = 20;
const MAX_COUNTER_VALUE = 1_000_000_000;
export const AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES = 700 * 1024;
const SESSION_TOO_LARGE_MESSAGE = 'Finish or cancel an existing Menu Manager card before preparing another update';

const ACTION_TYPES = new Set<string>(Object.values(AI_MENU_MANAGER_ACTION_TYPES));
const APPROVAL_LEVELS = new Set<AiMenuManagerApprovalLevel>([
    'none', 'confirm', 'high_confirm', 'bulk_confirm', 'destructive_confirm', 'external_confirm',
]);
const CARD_KINDS = new Set<AiMenuManagerCardKind>([
    'proposal', 'receipt', 'answer', 'manual_task', 'clarification', 'unsupported',
]);
const CARD_STATUSES = new Set<AiMenuManagerProposalStatus>([
    'pending_approval', 'approved', 'executing', 'executed', 'failed', 'cancelled',
    'rejected', 'answered', 'manual_task',
]);
const CARD_ACTIONS = new Set([
    'approve', 'cancel', 'edit', 'open_existing_screen', 'mark_done', 'try_again',
]);
const EXECUTION_MODES = new Set<AiMenuManagerExecutionMode>([
    'client_project_mutation', 'existing_api_job', 'server_project_mutation',
    'existing_client_dal', 'existing_server_api', 'browser_local_export',
    'manual_task_card', 'manual_task', 'read_only_card',
]);
const PATCH_KINDS = new Set([
    'item_update', 'bulk_item_update', 'category_update', 'attribute_update',
    'menu_settings_update', 'decision_blocks_update', 'menu_design_preset_apply',
]);
const RISKS = new Set<AiMenuManagerRisk>(['low', 'medium', 'high']);
const SCOPE_TYPES = new Set<AiMenuManagerScope['type']>(['project', 'store', 'outlet', 'external']);
const ENTITY_KINDS = new Set<AiMenuManagerEntityRef['kind']>([
    'project', 'menu_item', 'category', 'store', 'preset', 'manual_task',
]);
const LOCAL_ACTION_TYPES = new Set<AiMenuManagerLocalAction['type']>([
    'copy_url', 'open_url', 'download_qr', 'copy_text', 'download_text',
]);
const COMPOSER_TARGETS = new Set<AiMenuManagerCommandContextTarget>([
    'item', 'category', 'menu_design', 'digital_menu', 'official_page',
    'digital_screens', 'feedback', 'store_settings',
]);
const COUNTER_KEYS = [
    'commands', 'proposalsCreated', 'approvals', 'executions', 'compoundCommands',
    'deterministicRoutes', 'plannerAttempts', 'plannerAccepted', 'plannerFallbacks',
    'clarifications',
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number, allowEmpty = false): string | null {
    if (typeof value !== 'string' || value !== value.trim() || value.length > maxLength) return null;
    return allowEmpty || value.length > 0 ? value : null;
}

function optionalBoundedString(value: unknown, maxLength: number): string | undefined | null {
    if (value === undefined) return undefined;
    return boundedString(value, maxLength);
}

function isoString(value: unknown): string | null {
    const text = boundedString(value, 40);
    if (!text) return null;
    const parsed = new Date(text);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === text ? text : null;
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
    return typeof value === 'string' && allowed.has(value as T) ? value as T : null;
}

function uniqueStrings(value: unknown, maxItems: number, maxLength: number): string[] | null {
    if (!Array.isArray(value) || value.length > maxItems) return null;
    const entries = value.map((entry) => boundedString(entry, maxLength));
    if (entries.some((entry) => !entry)) return null;
    return Array.from(new Set(entries as string[]));
}

function safeJsonValue(value: unknown, depth = 0): unknown {
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') return value.length <= 2_048 ? value : undefined;
    if (depth >= 4) return undefined;
    if (Array.isArray(value)) {
        if (value.length > 40) return undefined;
        const entries = value.map((entry) => safeJsonValue(entry, depth + 1));
        return entries.some((entry) => entry === undefined) ? undefined : entries;
    }
    if (!isRecord(value) || Object.keys(value).length > 40) return undefined;
    const result: UnknownRecord = {};
    for (const [key, entry] of Object.entries(value)) {
        if (!boundedString(key, 80) || ['__proto__', 'constructor', 'prototype'].includes(key)) return undefined;
        const safeEntry = safeJsonValue(entry, depth + 1);
        if (safeEntry === undefined) return undefined;
        result[key] = safeEntry;
    }
    return result;
}

function parseCompactMessage(value: unknown): AiMenuManagerCompactMessage | null {
    if (!isRecord(value)) return null;
    const messageId = boundedString(value.messageId, 200);
    const role = enumValue(value.role, new Set(['owner', 'menu_manager', 'system'] as const));
    const kind = value.kind === undefined
        ? undefined
        : enumValue(value.kind, new Set(['reply', 'receipt', 'status'] as const));
    const text = boundedString(value.text, 2_000, true);
    const createdAt = isoString(value.createdAt);
    if (!messageId || !role || kind === null || text === null || !createdAt) return null;
    return { messageId, role, ...(kind ? { kind } : {}), text, createdAt };
}

function parseCardSummary(value: unknown, projectId: string): AiMenuManagerCardSummary | null {
    if (!isRecord(value)) return null;
    const proposalId = boundedString(value.proposalId, 200);
    const actionType = enumValue(value.actionType, ACTION_TYPES) as AiMenuManagerActionType | null;
    const title = boundedString(value.title, 160);
    const status = enumValue(value.status, CARD_STATUSES);
    const risk = enumValue(value.risk, RISKS);
    const entryProjectId = value.projectId === undefined
        ? undefined
        : normalizeAiMenuManagerProjectId(value.projectId);
    const updatedAt = isoString(value.updatedAt);
    if (!proposalId || !actionType || !title || !status || !risk || !updatedAt) return null;
    if (value.projectId !== undefined && entryProjectId !== projectId) return null;
    return {
        proposalId,
        actionType,
        title,
        status,
        risk,
        ...(entryProjectId ? { projectId: entryProjectId } : {}),
        updatedAt,
    };
}

function parseScope(value: unknown, tId: string, sId: string, projectId: string): AiMenuManagerScope | null {
    if (!isRecord(value)) return null;
    const type = enumValue(value.type, SCOPE_TYPES);
    const tenant = normalizeAiMenuManagerScopeDocumentId(value.tId);
    const store = normalizeAiMenuManagerScopeDocumentId(value.sId);
    const scopeProjectId = value.projectId === undefined
        ? undefined
        : normalizeAiMenuManagerProjectId(value.projectId);
    const outletId = optionalBoundedString(value.outletId, 160);
    const label = boundedString(value.label, 160);
    if (!type || !tenant || !store || !label || outletId === null) return null;
    if (tenant.documentId !== tId || store.documentId !== sId) return null;
    if (value.projectId !== undefined && scopeProjectId !== projectId) return null;
    return {
        type,
        tId,
        sId,
        ...(scopeProjectId ? { projectId: scopeProjectId } : {}),
        ...(outletId ? { outletId } : {}),
        label,
    };
}

function parseEntityRef(value: unknown): AiMenuManagerEntityRef | null {
    if (!isRecord(value)) return null;
    const kind = enumValue(value.kind, ENTITY_KINDS);
    const id = boundedString(value.id, 160);
    const label = boundedString(value.label, 160);
    return kind && id && label ? { kind, id, label } : null;
}

function parseBeforeAfterSummary(value: unknown): AiMenuManagerBeforeAfterSummary | null {
    if (!isRecord(value)) return null;
    const title = boundedString(value.title, 200);
    if (!title) return null;
    const optionalFields = ['beforeLabel', 'afterLabel', 'beforeValue', 'afterValue'] as const;
    const result: AiMenuManagerBeforeAfterSummary = { title };
    for (const field of optionalFields) {
        const entry = optionalBoundedString(value[field], 500);
        if (entry === null) return null;
        if (entry !== undefined) result[field] = entry;
    }
    if (value.rows !== undefined) {
        if (!Array.isArray(value.rows) || value.rows.length > 20) return null;
        const rows = value.rows.map((row) => {
            if (!isRecord(row)) return null;
            const label = boundedString(row.label, 160);
            const before = optionalBoundedString(row.before, 500);
            const after = optionalBoundedString(row.after, 500);
            return label && before !== null && after !== null
                ? { label, ...(before !== undefined ? { before } : {}), ...(after !== undefined ? { after } : {}) }
                : null;
        });
        if (rows.some((row) => !row)) return null;
        result.rows = rows as NonNullable<AiMenuManagerBeforeAfterSummary['rows']>;
    }
    if (value.warnings !== undefined) {
        const warnings = uniqueStrings(value.warnings, 10, 500);
        if (!warnings) return null;
        result.warnings = warnings;
    }
    return result;
}

function parseSuggestedReply(value: unknown): AiMenuManagerSuggestedReply | null {
    if (!isRecord(value)) return null;
    const helper = optionalBoundedString(value.helper, 140);
    const label = boundedString(value.label, 120);
    const prompt = boundedString(value.prompt, 300);
    if (helper === null || !label || !prompt) return null;
    let composerContext: AiMenuManagerSuggestedReply['composerContext'];
    if (value.composerContext !== undefined) {
        if (!isRecord(value.composerContext)) return null;
        const target = value.composerContext.target === null
            ? null
            : enumValue(value.composerContext.target, COMPOSER_TARGETS);
        const selectedEntityIds = uniqueStrings(value.composerContext.selectedEntityIds || [], 50, 160);
        if (target === null && value.composerContext.target !== null) return null;
        if (!selectedEntityIds) return null;
        composerContext = { target, selectedEntityIds };
    }
    return {
        ...(composerContext ? { composerContext } : {}),
        ...(helper !== undefined ? { helper } : {}),
        label,
        prompt,
    };
}

function parseLocalAction(value: unknown): AiMenuManagerLocalAction | null {
    if (!isRecord(value)) return null;
    const type = enumValue(value.type, LOCAL_ACTION_TYPES);
    const label = boundedString(value.label, 120);
    const actionValue = boundedString(value.value, 2_048);
    if (!type || !label || !actionValue) return null;
    const result: AiMenuManagerLocalAction = { type, label, value: actionValue };
    for (const [field, maxLength] of [
        ['filename', 200], ['helper', 200], ['mimeType', 120], ['qrFooter', 200],
        ['qrStoreName', 160], ['qrSubtitle', 200], ['qrTitle', 200],
    ] as const) {
        const entry = optionalBoundedString(value[field], maxLength);
        if (entry === null) return null;
        if (entry !== undefined) result[field] = entry;
    }
    return result;
}

function parseCard(
    value: unknown,
    operationId: string,
    tId: string,
    sId: string,
    projectId: string,
    enforceInitialStatus = true,
): AiMenuManagerCardPayload | null {
    if (!isRecord(value)) return null;
    const cardId = boundedString(value.cardId, 200);
    const kind = enumValue(value.kind, CARD_KINDS);
    const actionType = enumValue(value.actionType, ACTION_TYPES) as AiMenuManagerActionType | null;
    const title = boundedString(value.title, 160);
    const message = boundedString(value.message, 1_000, true);
    const status = enumValue(value.status, CARD_STATUSES);
    const risk = enumValue(value.risk, RISKS);
    const scope = parseScope(value.scope, tId, sId, projectId);
    const beforeAfterSummary = parseBeforeAfterSummary(value.beforeAfterSummary);
    const createdAt = isoString(value.createdAt);
    if (
        cardId !== operationId || !kind || !actionType || !title || message === null
        || !status || !risk || !scope || !beforeAfterSummary || !createdAt
    ) return null;
    if (!isRecord(value.approvalPolicy)) return null;
    const level = enumValue(value.approvalPolicy.level, APPROVAL_LEVELS);
    const reason = boundedString(value.approvalPolicy.reason, 500);
    if (!level || typeof value.approvalPolicy.requiresApproval !== 'boolean' || !reason) return null;
    if (!Array.isArray(value.entityRefs) || value.entityRefs.length > 20) return null;
    const entityRefs = value.entityRefs.map(parseEntityRef);
    if (entityRefs.some((entry) => !entry)) return null;
    const actions = uniqueStrings(value.actions, 6, 40);
    if (!actions || actions.length === 0 || actions.some((action) => !CARD_ACTIONS.has(action))) return null;
    const expectedStatusByKind: Partial<Record<AiMenuManagerCardKind, AiMenuManagerProposalStatus>> = {
        proposal: 'pending_approval',
        answer: 'answered',
        manual_task: 'manual_task',
        clarification: 'pending_approval',
        unsupported: 'manual_task',
    };
    if (kind === 'receipt' || (enforceInitialStatus && expectedStatusByKind[kind] !== status)) return null;
    let suggestedReplies: AiMenuManagerSuggestedReply[] | undefined;
    if (value.suggestedReplies !== undefined) {
        if (!Array.isArray(value.suggestedReplies) || value.suggestedReplies.length > 5) return null;
        const entries = value.suggestedReplies.map(parseSuggestedReply);
        if (entries.some((entry) => !entry)) return null;
        suggestedReplies = entries as AiMenuManagerSuggestedReply[];
    }
    let localActions: AiMenuManagerLocalAction[] | undefined;
    if (value.localActions !== undefined) {
        if (!Array.isArray(value.localActions) || value.localActions.length > 10) return null;
        const entries = value.localActions.map(parseLocalAction);
        if (entries.some((entry) => !entry)) return null;
        localActions = entries as AiMenuManagerLocalAction[];
    }
    return {
        cardId,
        kind,
        actionType,
        title,
        message,
        status,
        risk,
        approvalPolicy: { level, requiresApproval: value.approvalPolicy.requiresApproval, reason },
        scope,
        entityRefs: entityRefs as AiMenuManagerEntityRef[],
        beforeAfterSummary,
        ...(suggestedReplies ? { suggestedReplies } : {}),
        ...(localActions ? { localActions } : {}),
        actions: actions as AiMenuManagerCardPayload['actions'],
        createdAt,
    };
}

export function normalizeAiMenuManagerCardSnapshot(params: {
    value: unknown;
    cardId: string;
    tId: string;
    sId: string;
    projectId: string;
    enforceInitialStatus?: boolean;
}): AiMenuManagerCardPayload | null {
    return parseCard(
        params.value,
        params.cardId,
        params.tId,
        params.sId,
        params.projectId,
        params.enforceInitialStatus ?? true,
    );
}

function parsePatch(value: unknown): AiMenuManagerProjectPatch | undefined | null {
    if (value === undefined) return undefined;
    if (!isRecord(value) || !PATCH_KINDS.has(String(value.kind))) return null;
    const safe = safeJsonValue(value);
    return isRecord(safe) ? safe as unknown as AiMenuManagerProjectPatch : null;
}

export function normalizeAiMenuManagerPatchSnapshot(value: unknown): AiMenuManagerProjectPatch | undefined | null {
    return parsePatch(value);
}

function parsePendingOperation(params: {
    value: unknown;
    sessionId: string;
    tId: string;
    sId: string;
    projectId: string;
}): AiMenuManagerPendingOperation | null {
    const { value, sessionId, tId, sId, projectId } = params;
    if (!isRecord(value)) return null;
    const operationId = boundedString(value.operationId, 200);
    const operationSessionId = normalizeAiMenuManagerSessionId(value.sessionId);
    const tenant = normalizeAiMenuManagerScopeDocumentId(value.tId);
    const store = normalizeAiMenuManagerScopeDocumentId(value.sId);
    const operationProjectId = normalizeAiMenuManagerProjectId(value.projectId);
    const executionMode = enumValue(value.executionMode, EXECUTION_MODES);
    const createdAt = isoString(value.createdAt);
    const updatedAt = isoString(value.updatedAt);
    if (
        !operationId || operationSessionId !== sessionId || tenant?.documentId !== tId
        || store?.documentId !== sId || operationProjectId !== projectId || !executionMode
        || !createdAt || !updatedAt
    ) return null;
    const card = parseCard(value.card, operationId, tId, sId, projectId);
    const patch = parsePatch(value.patch);
    const idempotencyKeys = uniqueStrings(value.idempotencyKeys, 10, 160);
    if (!card || patch === null || !idempotencyKeys || idempotencyKeys.length === 0) return null;
    const commandGroupId = optionalBoundedString(value.commandGroupId, 200);
    const sourceFingerprint = optionalBoundedString(value.sourceFingerprint, 128);
    const patchHash = optionalBoundedString(value.patchHash, 128);
    const baseProjectUpdatedAt = optionalBoundedString(value.baseProjectUpdatedAt, 100);
    const baseProjectHash = optionalBoundedString(value.baseProjectHash, 128);
    if (
        commandGroupId === null || sourceFingerprint === null || patchHash === null
        || baseProjectUpdatedAt === null || baseProjectHash === null
    ) return null;
    const commandGroupSize = value.commandGroupSize === undefined || typeof value.commandGroupSize !== 'number'
        ? undefined
        : value.commandGroupSize;
    if (
        value.commandGroupSize !== undefined
        && commandGroupSize === undefined
    ) return null;
    if (
        commandGroupSize !== undefined
        && (!Number.isSafeInteger(commandGroupSize) || commandGroupSize < 1 || commandGroupSize > MAX_PENDING_OPERATIONS)
    ) return null;
    if (commandGroupId && (commandGroupSize === undefined || commandGroupSize < 2)) return null;
    if (!commandGroupId && commandGroupSize !== undefined && commandGroupSize !== 1) return null;
    if ((patch && !patchHash) || (!patch && patchHash)) return null;
    if (executionMode === 'client_project_mutation' && (!patch || !patchHash)) return null;
    return {
        operationId,
        ...(commandGroupId ? { commandGroupId, commandGroupSize } : {}),
        ...(sourceFingerprint ? { sourceFingerprint } : {}),
        sessionId,
        tId,
        sId,
        projectId,
        card,
        executionMode,
        ...(patch ? { patch } : {}),
        ...(patchHash ? { patchHash } : {}),
        ...(baseProjectUpdatedAt ? { baseProjectUpdatedAt } : {}),
        ...(baseProjectHash ? { baseProjectHash } : {}),
        idempotencyKeys,
        createdAt,
        updatedAt,
    };
}

function parseReceipt(value: unknown, projectId: string): AiMenuManagerReceipt | null {
    if (!isRecord(value)) return null;
    const receiptId = boundedString(value.receiptId, 300);
    const proposalId = boundedString(value.proposalId, 200);
    const actionType = enumValue(value.actionType, ACTION_TYPES) as AiMenuManagerActionType | null;
    const status = enumValue(value.status, new Set(['executed', 'failed', 'manual_task', 'cancelled'] as const));
    const title = boundedString(value.title, 160);
    const message = boundedString(value.message, 500, true);
    const receiptProjectId = value.projectId === undefined
        ? undefined
        : normalizeAiMenuManagerProjectId(value.projectId);
    const executedAt = isoString(value.executedAt);
    if (
        !receiptId || !proposalId || !actionType || !status || !title || message === null
        || !executedAt || typeof value.undoAvailable !== 'boolean'
    ) return null;
    if (receiptId !== `${proposalId}:${status}:${Date.parse(executedAt)}`) return null;
    if (value.projectId !== undefined && receiptProjectId !== projectId) return null;
    return {
        receiptId,
        proposalId,
        actionType,
        status,
        title,
        message,
        ...(receiptProjectId ? { projectId: receiptProjectId } : {}),
        executedAt,
        undoAvailable: value.undoAvailable,
    };
}

export function normalizeAiMenuManagerReceiptSnapshot(
    value: unknown,
    projectId: string,
): AiMenuManagerReceipt | null {
    return parseReceipt(value, projectId);
}

function uniqueById<T>(entries: T[], id: (entry: T) => string): T[] {
    const seen = new Set<string>();
    return entries.filter((entry) => {
        const key = id(entry);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function parseCounters(value: unknown): AiMenuManagerSessionDoc['counters'] {
    const source = isRecord(value) ? value : {};
    const parsed = Object.fromEntries(COUNTER_KEYS.map((key) => {
        const counter = source[key];
        return [key, Number.isSafeInteger(counter) && (counter as number) >= 0 && (counter as number) <= MAX_COUNTER_VALUE
            ? counter
            : 0];
    })) as Record<typeof COUNTER_KEYS[number], number>;
    return parsed;
}

function parseArtifactRefs(value: unknown): Array<Record<string, unknown>> | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_ARTIFACT_REFS)
        .map((entry) => safeJsonValue(entry))
        .filter(isRecord);
}

export function buildAiMenuManagerPendingState(params: {
    pendingCardSummaries?: Array<{ proposalId?: unknown }>;
    pendingOperations?: Array<{ operationId?: unknown }>;
}) {
    const pendingIds = new Set<string>();
    (params.pendingOperations || []).forEach((operation) => {
        if (typeof operation.operationId === 'string' && operation.operationId) {
            pendingIds.add(operation.operationId);
        }
    });
    (params.pendingCardSummaries || []).forEach((summary) => {
        if (typeof summary.proposalId === 'string' && summary.proposalId) {
            pendingIds.add(summary.proposalId);
        }
    });
    if (pendingIds.size > MAX_PENDING_OPERATIONS) {
        throw new Error(SESSION_TOO_LARGE_MESSAGE);
    }
    return {
        hasPendingOperations: pendingIds.size > 0,
        pendingCount: pendingIds.size,
    };
}

export function estimateAiMenuManagerSessionBytes(value: unknown): number {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).byteLength;
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

export function prepareAiMenuManagerSessionWrite<T extends Partial<AiMenuManagerSessionDoc>>(
    session: T,
    previousSession?: AiMenuManagerSessionDoc | null,
): T & { hasPendingOperations: boolean; pendingCount: number } {
    const compactMessages = [...(session.compactMessages || [])];
    const recentReceiptSummaries = [...(session.recentReceiptSummaries || [])];
    const next = {
        ...session,
        compactMessages,
        pendingCardSummaries: [...(session.pendingCardSummaries || [])],
        pendingOperations: [...(session.pendingOperations || [])],
        recentReceiptSummaries,
        ...(session.artifactRefs ? { artifactRefs: [...session.artifactRefs] } : {}),
        ...buildAiMenuManagerPendingState(session),
    } as T & { hasPendingOperations: boolean; pendingCount: number };

    while (
        estimateAiMenuManagerSessionBytes(next) > AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES
        && next.artifactRefs?.length
    ) {
        next.artifactRefs.pop();
    }
    while (
        estimateAiMenuManagerSessionBytes(next) > AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES
        && recentReceiptSummaries.length
    ) {
        recentReceiptSummaries.pop();
    }
    while (
        estimateAiMenuManagerSessionBytes(next) > AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES
        && compactMessages.length
    ) {
        compactMessages.shift();
    }

    const nextBytes = estimateAiMenuManagerSessionBytes(next);
    if (nextBytes <= AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES) return next;
    if (previousSession && nextBytes < estimateAiMenuManagerSessionBytes(previousSession)) return next;
    throw new Error(SESSION_TOO_LARGE_MESSAGE);
}

/**
 * Converts untrusted Firestore/session payloads into compact canonical truth.
 * Invalid top-level identity rejects the document; invalid nested entries are discarded.
 */
export function normalizeAiMenuManagerSessionSnapshot(value: unknown): AiMenuManagerSessionDoc | null {
    if (!isRecord(value)) return null;
    const sessionId = normalizeAiMenuManagerSessionId(value.sessionId);
    const tenant = normalizeAiMenuManagerScopeDocumentId(value.tId);
    const store = normalizeAiMenuManagerScopeDocumentId(value.sId);
    const projectId = normalizeAiMenuManagerProjectId(value.projectId);
    const sessionDate = normalizeAiMenuManagerSessionDate(value.sessionDate);
    if (!sessionId || !tenant || !store || !projectId || !sessionDate) return null;
    if (value.storageMode !== undefined && !['daily_compact', 'detailed'].includes(String(value.storageMode))) return null;
    if (value.status !== undefined && !['active', 'closed'].includes(String(value.status))) return null;
    if (!isDailySessionIdForScope({
        sessionId,
        tId: tenant.documentId,
        sId: store.documentId,
        projectId,
        sessionDate,
    })) return null;

    const compactMessages = uniqueById(
        (Array.isArray(value.compactMessages) ? value.compactMessages : [])
            .slice(-MAX_COMPACT_MESSAGES)
            .map(parseCompactMessage)
            .filter((entry): entry is AiMenuManagerCompactMessage => Boolean(entry)),
        (entry) => entry.messageId,
    );
    const pendingCardSummaries = uniqueById(
        (Array.isArray(value.pendingCardSummaries) ? value.pendingCardSummaries : [])
            .slice(0, MAX_PENDING_SUMMARIES)
            .map((entry) => parseCardSummary(entry, projectId))
            .filter((entry): entry is AiMenuManagerCardSummary => Boolean(entry)),
        (entry) => entry.proposalId,
    );
    const parsedOperations = (Array.isArray(value.pendingOperations) ? value.pendingOperations : [])
        .slice(0, MAX_PENDING_OPERATIONS)
        .map((entry) => parsePendingOperation({
            value: entry,
            sessionId,
            tId: tenant.documentId,
            sId: store.documentId,
            projectId,
        }))
        .filter((entry): entry is AiMenuManagerPendingOperation => Boolean(entry));
    const operationCounts = parsedOperations.reduce<Map<string, number>>((counts, operation) => {
        counts.set(operation.operationId, (counts.get(operation.operationId) || 0) + 1);
        return counts;
    }, new Map());
    const pendingOperations = parsedOperations.filter((operation) => operationCounts.get(operation.operationId) === 1);
    const recentReceiptSummaries = uniqueById(
        (Array.isArray(value.recentReceiptSummaries) ? value.recentReceiptSummaries : [])
            .slice(0, MAX_RECEIPTS)
            .map((entry) => parseReceipt(entry, projectId))
            .filter((entry): entry is AiMenuManagerReceipt => Boolean(entry)),
        (entry) => entry.receiptId,
    );
    const artifactRefs = parseArtifactRefs(value.artifactRefs);
    const pendingState = buildAiMenuManagerPendingState({ pendingCardSummaries, pendingOperations });
    if (
        (value.hasPendingOperations !== undefined && value.hasPendingOperations !== pendingState.hasPendingOperations)
        || (value.pendingCount !== undefined && value.pendingCount !== pendingState.pendingCount)
    ) return null;
    return {
        sessionId,
        tId: tenant.documentId,
        sId: store.documentId,
        projectId,
        sessionDate,
        storageMode: value.storageMode === 'detailed' ? 'detailed' : 'daily_compact',
        status: value.status === 'closed' ? 'closed' : 'active',
        compactMessages,
        pendingCardSummaries,
        pendingOperations,
        ...pendingState,
        recentReceiptSummaries,
        counters: parseCounters(value.counters),
        ...(artifactRefs !== undefined ? { artifactRefs } : {}),
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        ...(value.expiresAt !== undefined ? { expiresAt: value.expiresAt } : {}),
    };
}
