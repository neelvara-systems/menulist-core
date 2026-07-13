import { AI_MENU_MANAGER_ACTION_TYPES } from './actionTypes';
import { stableStringify } from './idempotency';
import { isAiMenuManagerPatchAllowedForAction } from './patchPolicy';
import {
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerProposalId,
    normalizeAiMenuManagerScopeDocumentId,
    normalizeAiMenuManagerSessionId,
} from './routeIds';
import {
    normalizeAiMenuManagerCardSnapshot,
    normalizeAiMenuManagerPatchSnapshot,
    normalizeAiMenuManagerReceiptSnapshot,
} from './sessionIntegrity';
import type {
    AiMenuManagerActionType,
    AiMenuManagerExecutionDirective,
    AiMenuManagerExecutionMode,
    AiMenuManagerExecutionStatus,
    AiMenuManagerProposalDoc,
    AiMenuManagerProposalStatus,
} from '@type/aiMenuManager';

type UnknownRecord = Record<string, unknown>;

const ACTION_TYPES = new Set<string>(Object.values(AI_MENU_MANAGER_ACTION_TYPES));
const EXECUTION_MODES = new Set<AiMenuManagerExecutionMode>([
    'client_project_mutation', 'existing_api_job', 'server_project_mutation',
    'existing_client_dal', 'existing_server_api', 'browser_local_export',
    'manual_task_card', 'manual_task', 'read_only_card',
]);
const EXECUTION_STATUSES = new Set<AiMenuManagerExecutionStatus>([
    'not_started', 'locked', 'executed', 'failed',
]);
const PROPOSAL_STATUSES = new Set<AiMenuManagerProposalStatus>([
    'pending_approval', 'approved', 'executing', 'executed', 'failed', 'cancelled',
    'rejected', 'answered', 'manual_task',
]);
const APPROVAL_ACTIONS = new Set(['approve', 'cancelled', 'rejected', 'manual_task']);
const EXECUTION_ID_PATTERN = /^amm_exec_[a-f0-9]{28}$/;
const HASH_PATTERN = /^[a-f0-9]{32}$/;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | null {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= maxLength
        && value === value.trim()
        ? value
        : null;
}

function optionalBoundedString(value: unknown, maxLength: number): string | undefined | null {
    return value === undefined ? undefined : boundedString(value, maxLength);
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>): T | null {
    return typeof value === 'string' && allowed.has(value as T) ? value as T : null;
}

function timestampIsValid(value: unknown): boolean {
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    if (typeof value === 'string') return !Number.isNaN(new Date(value).getTime());
    if (!isRecord(value)) return false;
    if (typeof value.toDate === 'function') {
        try {
            const date = value.toDate();
            return date instanceof Date && !Number.isNaN(date.getTime());
        } catch {
            return false;
        }
    }
    return typeof value.seconds === 'number'
        && Number.isFinite(value.seconds)
        && (value.nanoseconds === undefined
            || (typeof value.nanoseconds === 'number'
                && Number.isInteger(value.nanoseconds)
                && value.nanoseconds >= 0
                && value.nanoseconds < 1_000_000_000));
}

function normalizeIdempotencyKeys(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length === 0 || value.length > 10) return null;
    const keys = value.map((entry) => boundedString(entry, 160));
    if (keys.some((entry) => !entry)) return null;
    return Array.from(new Set(keys as string[]));
}

function scopeMatchesCanonical(
    value: unknown,
    canonical: AiMenuManagerProposalDoc['scope'],
): boolean {
    if (!isRecord(value)) return false;
    return value.type === canonical.type
        && String(value.tId) === String(canonical.tId)
        && String(value.sId) === String(canonical.sId)
        && String(value.projectId || '') === String(canonical.projectId || '')
        && String(value.outletId || '') === String(canonical.outletId || '')
        && value.label === canonical.label;
}

function cardStatusMatchesProposal(
    kind: AiMenuManagerProposalDoc['cardPayload']['kind'],
    cardStatus: AiMenuManagerProposalStatus,
    proposalStatus: AiMenuManagerProposalStatus,
): boolean {
    if (proposalStatus === 'executing') return kind === 'proposal' && cardStatus === 'approved';
    if (cardStatus !== proposalStatus) return false;
    if (kind === 'proposal') {
        return ['pending_approval', 'approved', 'executed', 'failed', 'cancelled', 'rejected'].includes(proposalStatus);
    }
    if (kind === 'answer') return proposalStatus === 'answered';
    if (kind === 'clarification') return ['pending_approval', 'cancelled', 'rejected'].includes(proposalStatus);
    if (kind === 'manual_task' || kind === 'unsupported') {
        return ['manual_task', 'cancelled', 'rejected'].includes(proposalStatus);
    }
    return false;
}

function executionStatusMatchesProposal(
    executionStatus: AiMenuManagerExecutionStatus | undefined,
    proposalStatus: AiMenuManagerProposalStatus,
): boolean {
    if (proposalStatus === 'executing') return executionStatus === 'locked';
    if (proposalStatus === 'executed') return executionStatus === 'executed';
    if (proposalStatus === 'failed') return executionStatus === 'failed';
    return executionStatus === undefined || executionStatus === 'not_started';
}

function normalizeApprovalRecord(value: unknown): AiMenuManagerProposalDoc['approvalRecord'] | undefined | null {
    if (value === undefined) return undefined;
    if (!isRecord(value) || !timestampIsValid(value.approvedAt)) return null;
    const approvedBy = typeof value.approvedBy === 'string'
        ? boundedString(value.approvedBy, 160)
        : Number.isSafeInteger(value.approvedBy) ? value.approvedBy as number : null;
    const action = boundedString(value.action, 40);
    if (approvedBy === null || !action || !APPROVAL_ACTIONS.has(action)) return null;
    return { approvedBy, approvedAt: value.approvedAt, action };
}

function normalizeExecutionDirective(params: {
    value: unknown;
    proposalId: string;
    actionType: AiMenuManagerActionType;
    tId: string;
    sId: string;
    projectId: string;
    patchHash: string | undefined;
    patch: AiMenuManagerProposalDoc['patch'];
    baseProjectUpdatedAt: string | undefined;
    baseProjectHash: string | undefined;
    beforeAfterSummary: AiMenuManagerProposalDoc['beforeAfterSummary'];
    scope: AiMenuManagerProposalDoc['scope'];
}): AiMenuManagerExecutionDirective | undefined | null {
    const { value } = params;
    if (value === undefined) return undefined;
    if (!isRecord(value)) return null;
    const executionId = boundedString(value.executionId, 64);
    const expiresAt = boundedString(value.expiresAt, 40);
    const directivePatch = normalizeAiMenuManagerPatchSnapshot(value.patch);
    if (
        value.proposalId !== params.proposalId
        || value.actionType !== params.actionType
        || !executionId
        || !EXECUTION_ID_PATTERN.test(executionId)
        || !expiresAt
        || Number.isNaN(new Date(expiresAt).getTime())
        || new Date(expiresAt).toISOString() !== expiresAt
        || !params.patch
        || !params.patchHash
        || !directivePatch
        || value.patchHash !== params.patchHash
        || stableStringify(directivePatch) !== stableStringify(params.patch)
        || stableStringify(value.patchSummary) !== stableStringify(params.beforeAfterSummary)
        || !scopeMatchesCanonical(value.scope, params.scope)
        || !isRecord(value.scope)
        || String(value.scope.tId) !== params.tId
        || String(value.scope.sId) !== params.sId
        || String(value.scope.projectId || '') !== params.projectId
    ) return null;
    const baseProjectUpdatedAt = optionalBoundedString(value.baseProjectUpdatedAt, 100);
    const baseProjectHash = optionalBoundedString(value.baseProjectHash, 128);
    if (
        baseProjectUpdatedAt === null
        || baseProjectHash === null
        || baseProjectUpdatedAt !== params.baseProjectUpdatedAt
        || baseProjectHash !== params.baseProjectHash
    ) return null;
    return {
        proposalId: params.proposalId,
        executionId,
        actionType: params.actionType,
        scope: params.scope,
        ...(baseProjectUpdatedAt ? { baseProjectUpdatedAt } : {}),
        ...(baseProjectHash ? { baseProjectHash } : {}),
        patchHash: params.patchHash,
        patch: params.patch,
        patchSummary: params.beforeAfterSummary,
        expiresAt,
    };
}

/**
 * Converts an untrusted Admin/Firestore proposal snapshot into canonical truth.
 * Any invalid identity, state transition, duplicated contract, or executable
 * payload rejects the whole proposal because proposal rows authorize mutations.
 */
export function normalizeAiMenuManagerProposalSnapshot(
    value: unknown,
    expectedProposalId?: string,
): AiMenuManagerProposalDoc | null {
    if (!isRecord(value)) return null;
    const proposalId = normalizeAiMenuManagerProposalId(value.proposalId);
    const expectedId = expectedProposalId === undefined
        ? proposalId
        : normalizeAiMenuManagerProposalId(expectedProposalId);
    const sessionId = normalizeAiMenuManagerSessionId(value.sessionId);
    const tenant = normalizeAiMenuManagerScopeDocumentId(value.tId);
    const store = normalizeAiMenuManagerScopeDocumentId(value.sId);
    const projectId = normalizeAiMenuManagerProjectId(value.projectId);
    const actionType = enumValue(value.actionType, ACTION_TYPES) as AiMenuManagerActionType | null;
    const status = enumValue(value.status, PROPOSAL_STATUSES);
    const executionMode = enumValue(value.executionMode, EXECUTION_MODES);
    const executionStatus = value.executionStatus === undefined
        ? undefined
        : enumValue(value.executionStatus, EXECUTION_STATUSES);
    if (
        !proposalId || proposalId !== expectedId || !sessionId || !tenant || !store || !projectId
        || !actionType || !status || !executionMode || executionStatus === null
        || !timestampIsValid(value.createdAt) || !timestampIsValid(value.updatedAt)
        || (value.expiresAt !== undefined && !timestampIsValid(value.expiresAt))
    ) return null;

    const cardPayload = normalizeAiMenuManagerCardSnapshot({
        value: value.cardPayload,
        cardId: proposalId,
        tId: tenant.documentId,
        sId: store.documentId,
        projectId,
        enforceInitialStatus: false,
    });
    if (!cardPayload || !cardStatusMatchesProposal(cardPayload.kind, cardPayload.status, status)) return null;
    if (
        cardPayload.actionType !== actionType
        || value.risk !== cardPayload.risk
        || stableStringify(value.approvalPolicy) !== stableStringify(cardPayload.approvalPolicy)
        || stableStringify(value.entityRefs) !== stableStringify(cardPayload.entityRefs)
        || !scopeMatchesCanonical(value.scope, cardPayload.scope)
        || stableStringify(value.beforeAfterSummary) !== stableStringify(cardPayload.beforeAfterSummary)
    ) return null;

    const patch = normalizeAiMenuManagerPatchSnapshot(value.patch);
    const patchHash = optionalBoundedString(value.patchHash, 128);
    const baseProjectUpdatedAt = optionalBoundedString(value.baseProjectUpdatedAt, 100);
    const baseProjectHash = optionalBoundedString(value.baseProjectHash, 128);
    const idempotencyKeys = normalizeIdempotencyKeys(value.idempotencyKeys);
    if (
        patch === null || patchHash === null || baseProjectUpdatedAt === null || baseProjectHash === null
        || !idempotencyKeys || !executionStatusMatchesProposal(executionStatus, status)
        || Boolean(patch) !== Boolean(patchHash)
        || (patchHash !== undefined && !HASH_PATTERN.test(patchHash))
        || (baseProjectHash !== undefined && !HASH_PATTERN.test(baseProjectHash))
        || (patch && !isAiMenuManagerPatchAllowedForAction({ actionType, patch, patchHash }))
        || (executionMode === 'client_project_mutation' && (!patch || !patchHash))
    ) return null;

    const approvalRecord = normalizeApprovalRecord(value.approvalRecord);
    const receipt = value.receipt === undefined
        ? undefined
        : normalizeAiMenuManagerReceiptSnapshot(value.receipt, projectId);
    if (approvalRecord === null || (value.receipt !== undefined && !receipt)) return null;
    if (
        ['executing', 'executed', 'failed'].includes(status)
        && (!approvalRecord || approvalRecord.action !== 'approve')
    ) return null;
    if (receipt && (
        receipt.proposalId !== proposalId
        || receipt.actionType !== actionType
        || receipt.projectId !== projectId
        || (status === 'executed' && receipt.status !== 'executed')
        || (status === 'failed' && receipt.status !== 'failed')
        || (status === 'manual_task' && receipt.status !== 'manual_task')
    )) return null;
    if (['executed', 'failed'].includes(status) && !receipt) return null;

    const executionDirective = normalizeExecutionDirective({
        value: value.executionDirective,
        proposalId,
        actionType,
        tId: tenant.documentId,
        sId: store.documentId,
        projectId,
        patchHash,
        patch,
        baseProjectUpdatedAt,
        baseProjectHash,
        beforeAfterSummary: cardPayload.beforeAfterSummary,
        scope: cardPayload.scope,
    });
    if (executionDirective === null) return null;
    if (['executing', 'executed', 'failed'].includes(status) && !executionDirective) return null;

    return {
        proposalId,
        sessionId,
        tId: tenant.documentId,
        sId: store.documentId,
        projectId,
        actionType,
        status,
        risk: cardPayload.risk,
        approvalPolicy: cardPayload.approvalPolicy,
        entityRefs: cardPayload.entityRefs,
        scope: cardPayload.scope,
        beforeAfterSummary: cardPayload.beforeAfterSummary,
        cardPayload,
        executionMode,
        ...(executionStatus ? { executionStatus } : {}),
        ...(approvalRecord ? { approvalRecord } : {}),
        ...(receipt ? { receipt } : {}),
        ...(patch ? { patch } : {}),
        ...(patchHash ? { patchHash } : {}),
        ...(executionDirective ? { executionDirective } : {}),
        ...(baseProjectUpdatedAt ? { baseProjectUpdatedAt } : {}),
        ...(baseProjectHash ? { baseProjectHash } : {}),
        idempotencyKeys,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        ...(value.expiresAt !== undefined ? { expiresAt: value.expiresAt } : {}),
    };
}
