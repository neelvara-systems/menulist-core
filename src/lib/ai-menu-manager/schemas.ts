import { z } from 'zod';
import { AI_MENU_MANAGER_ACTION_TYPES } from './actionTypes';
import type {
    AiMenuManagerActionType,
    AiMenuManagerCardPayload,
    AiMenuManagerCommandResponse,
    AiMenuManagerExecutionDirective,
    AiMenuManagerInboxResponse,
    AiMenuManagerReceipt,
} from '@type/aiMenuManager';
import { AI_MENU_MANAGER_CLOUD_PLANNER_OUTCOMES } from './modelRouter/providerResultPolicy';
import {
    AI_MENU_MANAGER_ROUTER_OUTCOMES,
    AI_MENU_MANAGER_SAFE_MODEL_TOOLS,
    type AiMenuManagerModelRouteResult,
} from './modelRouter/routerOutcomeSchema';
import {
    AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH,
    normalizeAiMenuManagerProposalId,
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerSessionId,
    normalizeAiMenuManagerScopeDocumentId,
} from './routeIds';
import { isDailySessionIdForScope, normalizeAiMenuManagerSessionDate } from './idempotency';
import {
    normalizeAiMenuManagerCardSnapshot,
    normalizeAiMenuManagerPatchSnapshot,
    normalizeAiMenuManagerReceiptSnapshot,
    normalizeAiMenuManagerSessionSnapshot,
} from './sessionIntegrity';
import { isAiMenuManagerPatchAllowedForAction } from './patchPolicy';

const idSchema = z.string().trim().min(1).max(160);
const projectIdSchema = z.string()
    .min(1)
    .max(AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH)
    .refine((value) => normalizeAiMenuManagerProjectId(value) === value);
const sessionIdSchema = z.string()
    .refine((value) => normalizeAiMenuManagerSessionId(value) === value);
const sessionDateSchema = z.string()
    .trim()
    .refine((value) => normalizeAiMenuManagerSessionDate(value) === value);
const knownActionTypes = new Set<string>(Object.values(AI_MENU_MANAGER_ACTION_TYPES));
const isKnownActionType = (value: string): value is AiMenuManagerActionType => knownActionTypes.has(value);
const actionTypeSchema = z.string()
    .trim()
    .min(1)
    .max(120)
    .refine(isKnownActionType);
const commandContextTargetSchema = z.enum([
    'item',
    'category',
    'menu_design',
    'digital_menu',
    'official_page',
    'digital_screens',
    'feedback',
    'store_settings',
]);
const commandContextSchema = z.object({
    target: commandContextTargetSchema.nullable(),
    selectedEntityIds: z.array(idSchema).max(50).optional(),
});

export const AiMenuManagerCommandRequestSchema = z.object({
    sessionId: sessionIdSchema.optional(),
    sessionDate: sessionDateSchema.optional(),
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema,
    inputType: z.enum(['text', 'voice_transcript', 'upload', 'suggested_action']),
    text: z.string().trim().max(1000).optional(),
    uploadRefs: z.array(z.object({
        storagePath: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().min(1).max(120),
        size: z.number().int().nonnegative().max(30_000_000),
    })).max(5).optional(),
    composerContext: commandContextSchema.optional(),
    clientContextVersion: z.string().trim().max(80).optional(),
    replaceOperationId: idSchema.optional(),
    idempotencyKey: idSchema,
});

export const AiMenuManagerInboxRequestSchema = z.object({
    sessionId: sessionIdSchema.optional(),
    storeId: z.union([z.string(), z.number()]).optional().transform((value) => value === undefined ? undefined : String(value)),
    projectId: projectIdSchema,
    sessionDate: sessionDateSchema.optional(),
});

export const AiMenuManagerProposalActionSchema = z.object({
    action: z.enum(['approve', 'cancel', 'reject', 'mark_done']),
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema.optional(),
    actionType: actionTypeSchema.optional(),
    idempotencyKey: idSchema,
});

export const AiMenuManagerProposalCompleteSchema = z.object({
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema,
    actionType: actionTypeSchema,
    executionId: idSchema,
    patchHash: z.string().trim().min(16).max(128),
    result: z.enum(['executed', 'failed']),
    message: z.string().trim().max(500).optional(),
    idempotencyKey: idSchema,
});

const plannerItemSchema = z.object({
    active: z.boolean(),
    aliases: z.array(z.string().trim().min(1).max(80)).max(4),
    available: z.boolean(),
    categoryId: idSchema,
    categoryName: z.string().trim().max(120),
    hasDescription: z.boolean(),
    hasImage: z.boolean(),
    id: idSchema,
    isBestSeller: z.boolean().optional(),
    name: z.string().trim().min(1).max(120),
    price: z.string().trim().max(32).optional(),
});

const plannerCategorySchema = z.object({
    active: z.boolean(),
    aliases: z.array(z.string().trim().min(1).max(80)).max(3),
    id: idSchema,
    name: z.string().trim().min(1).max(120),
});

export const AiMenuManagerPlannerRequestSchema = z.object({
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema,
    ownerMessage: z.string().trim().min(1).max(1000),
    composerContext: commandContextSchema.optional(),
    allowedActions: z.array(actionTypeSchema).min(1).max(40),
    context: z.object({
        project: z.object({
            id: projectIdSchema,
            name: z.string().trim().min(1).max(120),
            updatedAt: z.string().trim().max(80).optional(),
        }),
        store: z.object({
            businessType: z.string().trim().max(80).optional(),
            name: z.string().trim().min(1).max(120),
        }),
        summary: z.object({
            categoryCount: z.number().int().nonnegative().max(10_000),
            hiddenCategoryCount: z.number().int().nonnegative().max(10_000),
            hiddenItemCount: z.number().int().nonnegative().max(100_000),
            itemCount: z.number().int().nonnegative().max(100_000),
            missingDescriptionCount: z.number().int().nonnegative().max(100_000),
            missingImageCount: z.number().int().nonnegative().max(100_000),
            missingPriceCount: z.number().int().nonnegative().max(100_000),
            soldOutItemCount: z.number().int().nonnegative().max(100_000),
        }),
        menuDesign: z.record(z.string(), z.unknown()),
        decisionBlocks: z.record(z.string(), z.unknown()),
        items: z.array(plannerItemSchema).max(32),
        categories: z.array(plannerCategorySchema).max(18),
        pendingCards: z.array(z.object({
            actionType: actionTypeSchema,
            entityIds: z.array(idSchema).max(8),
            title: z.string().trim().min(1).max(140),
        })).max(5),
    }),
});

export const AiMenuManagerPlannerProviderResultSchema = z.object({
    outcome: z.enum(AI_MENU_MANAGER_CLOUD_PLANNER_OUTCOMES),
    ownerReply: z.string().trim().min(1).max(600),
    actionType: actionTypeSchema.optional(),
    targets: z.array(z.object({
        displayName: z.string().trim().max(120).optional(),
        entityId: idSchema.optional(),
        entityType: z.enum(['item', 'category', 'project', 'design', 'store', 'surface']),
    })).max(50).optional(),
    values: z.record(z.string().max(80), z.union([
        z.string().max(500),
        z.number().finite(),
        z.boolean(),
    ])).optional(),
    clarification: z.object({
        question: z.string().trim().min(1).max(300),
        options: z.array(z.object({
            entityId: idSchema.optional(),
            label: z.string().trim().min(1).max(120),
            prompt: z.string().trim().min(1).max(300).optional(),
        })).min(1).max(5),
    }).optional(),
    suggestedReplies: z.array(z.object({
        helper: z.string().trim().max(140).optional(),
        label: z.string().trim().min(1).max(120),
        prompt: z.string().trim().min(1).max(300),
    })).max(4).optional(),
});

const aiMenuManagerModelRouteResultSchema = z.object({
    actionType: actionTypeSchema.optional(),
    clarification: z.object({
        options: z.array(z.object({
            entityId: idSchema.optional(),
            entityType: z.enum(['item', 'category']).optional(),
            label: z.string().trim().min(1).max(120),
            prompt: z.string().trim().min(1).max(300).optional(),
        })).min(1).max(5),
        question: z.string().trim().min(1).max(300),
    }).optional(),
    outcome: z.enum(AI_MENU_MANAGER_ROUTER_OUTCOMES),
    ownerReply: z.string().trim().min(1).max(600),
    provider: z.enum(['deterministic', 'cloud_planner', 'local_assist']),
    safety: z.object({
        mutatesTruth: z.boolean(),
        reason: z.string().trim().min(1).max(300),
        requiresApproval: z.boolean(),
    }),
    suggestedReplies: z.array(z.object({
        helper: z.string().trim().max(140).optional(),
        label: z.string().trim().min(1).max(120),
        prompt: z.string().trim().min(1).max(300),
    })).max(4).optional(),
    targets: z.array(z.object({
        displayName: z.string().trim().max(120).optional(),
        entityId: idSchema.optional(),
        entityType: z.enum(['item', 'category', 'project', 'design', 'store', 'surface']),
    })).max(50).optional(),
    toolName: z.enum(AI_MENU_MANAGER_SAFE_MODEL_TOOLS).optional(),
    values: z.record(z.string().max(80), z.union([
        z.string().max(500),
        z.number().finite(),
        z.boolean(),
    ])).optional(),
}).superRefine((route, context) => {
    const isPreparedAction = route.outcome === 'prepare_action';
    if (
        route.safety.mutatesTruth !== isPreparedAction
        || route.safety.requiresApproval !== isPreparedAction
        || Boolean(route.actionType) !== isPreparedAction
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Model route safety fields do not match its outcome',
        });
    }
});

export const AiMenuManagerPlannerResponseSchema = z.object({
    route: aiMenuManagerModelRouteResultSchema.nullable(),
});

export function isAiMenuManagerPlannerResponse(
    value: unknown,
): value is { route: AiMenuManagerModelRouteResult | null } {
    return AiMenuManagerPlannerResponseSchema.safeParse(value).success;
}

type AiMenuManagerResponseScope = {
    tId: string;
    sId: string;
    projectId: string;
};

type UnknownRecord = Record<string, unknown>;

const responseNextActionSchema = z.enum(['none', 'owner_approval', 'clarification']);
const responseStatusSchema = z.enum(['executed', 'failed', 'manual_task', 'cancelled', 'rejected']);
const responseScopeSchema = z.object({
    type: z.enum(['project', 'store', 'outlet', 'external']),
    tId: z.union([z.string(), z.number()]),
    sId: z.union([z.string(), z.number()]),
    projectId: projectIdSchema.optional(),
    outletId: idSchema.optional(),
    label: z.string().trim().min(1).max(200),
});
const responseSummarySchema = z.object({
    title: z.string().trim().min(1).max(200),
    beforeLabel: z.string().trim().max(200).optional(),
    afterLabel: z.string().trim().max(200).optional(),
    beforeValue: z.string().trim().max(500).optional(),
    afterValue: z.string().trim().max(500).optional(),
    rows: z.array(z.object({
        label: z.string().trim().min(1).max(200),
        before: z.string().trim().max(500).optional(),
        after: z.string().trim().max(500).optional(),
    })).max(40).optional(),
    warnings: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
});
const executionIdSchema = z.string().regex(/^amm_exec_[a-f0-9]{28}$/);
const responseHashSchema = z.string().regex(/^[a-f0-9]{32}$/);
const responseIsoDateSchema = z.string().datetime({ offset: false });

function isUnknownRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseString(value: unknown, maxLength: number): string | null {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= maxLength
        && value === value.trim()
        ? value
        : null;
}

function normalizeResponseCards(
    value: unknown,
    scope: AiMenuManagerResponseScope,
): AiMenuManagerCardPayload[] | null {
    if (!Array.isArray(value) || value.length > 25) return null;
    const cards = value.map((entry) => {
        if (!isUnknownRecord(entry)) return null;
        const cardId = responseString(entry.cardId, 200);
        return cardId
            ? normalizeAiMenuManagerCardSnapshot({
                value: entry,
                cardId,
                ...scope,
                enforceInitialStatus: true,
            })
            : null;
    });
    return cards.some((card) => !card) ? null : cards as AiMenuManagerCardPayload[];
}

export function normalizeAiMenuManagerCommandResponse(
    value: unknown,
    params: AiMenuManagerResponseScope & { expectedSessionId: string },
): AiMenuManagerCommandResponse | null {
    if (!isUnknownRecord(value)) return null;
    const sessionId = normalizeAiMenuManagerSessionId(value.sessionId);
    const messageId = responseString(value.messageId, 200);
    const nextRequiredAction = responseNextActionSchema.safeParse(value.nextRequiredAction);
    const cards = normalizeResponseCards(value.cards, params);
    if (
        sessionId !== params.expectedSessionId
        || !messageId
        || !nextRequiredAction.success
        || !cards
        || cards.length === 0
    ) return null;
    const expectedNextAction = cards.some((card) => card.kind === 'clarification')
        ? 'clarification'
        : cards.some((card) => card.status === 'pending_approval')
            ? 'owner_approval'
            : 'none';
    if (nextRequiredAction.data !== expectedNextAction) return null;
    return {
        sessionId,
        messageId,
        cards,
        nextRequiredAction: nextRequiredAction.data,
    };
}

export function normalizeAiMenuManagerInboxResponse(
    value: unknown,
    params: AiMenuManagerResponseScope & { expectedSessionId: string },
): (AiMenuManagerInboxResponse & { sessionId: string }) | null {
    if (!isUnknownRecord(value)) return null;
    const sessionId = normalizeAiMenuManagerSessionId(value.sessionId);
    if (!sessionId) return null;
    const session = value.session === null
        ? null
        : normalizeAiMenuManagerSessionSnapshot(value.session);
    if (
        value.session !== null
        && (
            !session
            || session.sessionId !== sessionId
            || String(session.tId) !== params.tId
            || String(session.sId) !== params.sId
            || session.projectId !== params.projectId
        )
    ) return null;
    const isRequestedSession = sessionId === params.expectedSessionId;
    const isRecoveredPendingSession = Boolean(
        session
        && session.hasPendingOperations
        && session.sessionId === sessionId
        && isDailySessionIdForScope({
            sessionId,
            tId: params.tId,
            sId: params.sId,
            projectId: params.projectId,
            sessionDate: session.sessionDate,
        }),
    );
    if (!isRequestedSession && !isRecoveredPendingSession) return null;
    const cards = normalizeResponseCards(value.cards, params);
    if (!cards || !Array.isArray(value.receipts) || value.receipts.length > 20) return null;
    const receipts = value.receipts.map((entry) => normalizeAiMenuManagerReceiptSnapshot(entry, params.projectId));
    if (receipts.some((receipt) => !receipt)) return null;
    return {
        session,
        sessionId,
        cards,
        receipts: receipts as AiMenuManagerReceipt[],
    };
}

function normalizeAiMenuManagerExecutionDirectiveResponse(
    value: unknown,
    params: AiMenuManagerResponseScope & {
        actionType: AiMenuManagerActionType;
        proposalId: string;
    },
): AiMenuManagerExecutionDirective | null {
    if (!isUnknownRecord(value)) return null;
    const proposalId = normalizeAiMenuManagerProposalId(value.proposalId);
    const scope = responseScopeSchema.safeParse(value.scope);
    const patchSummary = responseSummarySchema.safeParse(value.patchSummary);
    const executionId = executionIdSchema.safeParse(value.executionId);
    const patchHash = responseHashSchema.safeParse(value.patchHash);
    const expiresAt = responseIsoDateSchema.safeParse(value.expiresAt);
    const patch = normalizeAiMenuManagerPatchSnapshot(value.patch);
    const baseProjectUpdatedAt = value.baseProjectUpdatedAt === undefined
        ? undefined
        : responseString(value.baseProjectUpdatedAt, 100);
    const baseProjectHash = value.baseProjectHash === undefined
        ? undefined
        : responseHashSchema.safeParse(value.baseProjectHash);
    if (
        proposalId !== params.proposalId
        || value.actionType !== params.actionType
        || !scope.success
        || scope.data.type !== 'project'
        || String(scope.data.tId) !== params.tId
        || String(scope.data.sId) !== params.sId
        || scope.data.projectId !== params.projectId
        || !patchSummary.success
        || !executionId.success
        || !patchHash.success
        || !expiresAt.success
        || !patch
        || baseProjectUpdatedAt === null
        || (baseProjectHash !== undefined && !baseProjectHash.success)
        || !isAiMenuManagerPatchAllowedForAction({
            actionType: params.actionType,
            patch,
            patchHash: patchHash.data,
        })
    ) return null;
    return {
        proposalId,
        executionId: executionId.data,
        actionType: params.actionType,
        scope: scope.data,
        ...(baseProjectUpdatedAt ? { baseProjectUpdatedAt } : {}),
        ...(baseProjectHash?.success ? { baseProjectHash: baseProjectHash.data } : {}),
        patchHash: patchHash.data,
        patch,
        patchSummary: patchSummary.data,
        expiresAt: expiresAt.data,
    };
}

export function normalizeAiMenuManagerProposalActionResponse(
    value: unknown,
    params: AiMenuManagerResponseScope & {
        action: 'approve' | 'cancel' | 'reject' | 'mark_done';
        actionType?: AiMenuManagerActionType;
        proposalId: string;
    },
): {
    data: {
        directive?: AiMenuManagerExecutionDirective;
        proposal?: { proposalId: string; actionType: string; status: string };
        receipt?: AiMenuManagerReceipt;
        status?: string;
    };
} | null {
    if (!isUnknownRecord(value) || !isUnknownRecord(value.data)) return null;
    if (params.action === 'approve') {
        if (!params.actionType || !isUnknownRecord(value.data.proposal)) return null;
        const directive = normalizeAiMenuManagerExecutionDirectiveResponse(value.data.directive, {
            ...params,
            actionType: params.actionType,
        });
        if (
            !directive
            || value.data.proposal.proposalId !== params.proposalId
            || value.data.proposal.actionType !== params.actionType
            || value.data.proposal.status !== 'executing'
        ) return null;
        return {
            data: {
                directive,
                proposal: {
                    proposalId: params.proposalId,
                    actionType: params.actionType,
                    status: 'executing',
                },
            },
        };
    }
    const expectedStatus = params.action === 'mark_done'
        ? 'manual_task'
        : params.action === 'reject'
            ? 'rejected'
            : 'cancelled';
    return value.data.status === expectedStatus
        ? { data: { status: expectedStatus } }
        : null;
}

export function normalizeAiMenuManagerProposalCompleteResponse(
    value: unknown,
    params: {
        actionType: AiMenuManagerActionType;
        projectId: string;
        proposalId: string;
    },
): { data: { receipt: AiMenuManagerReceipt; status: 'executed' | 'failed'; verified: boolean } } | null {
    if (!isUnknownRecord(value) || !isUnknownRecord(value.data)) return null;
    const status = responseStatusSchema.safeParse(value.data.status);
    if (!status.success || (status.data !== 'executed' && status.data !== 'failed')) return null;
    const receipt = normalizeAiMenuManagerReceiptSnapshot(value.data.receipt, params.projectId);
    if (
        !receipt
        || receipt.proposalId !== params.proposalId
        || receipt.actionType !== params.actionType
        || receipt.status !== status.data
        || typeof value.data.verified !== 'boolean'
        || value.data.verified !== (status.data === 'executed')
    ) return null;
    return {
        data: {
            receipt,
            status: status.data,
            verified: value.data.verified,
        },
    };
}
