import type {
    AiMenuManagerActionDefinition,
    AiMenuManagerActionType,
    AiMenuManagerBeforeAfterSummary,
    AiMenuManagerCardPayload,
    AiMenuManagerEntityRef,
    AiMenuManagerScope,
} from '@type/aiMenuManager';
import { buildApprovalPolicy } from './approvalPolicy';

export function buildProposalCard(params: {
    cardId: string;
    definition: AiMenuManagerActionDefinition;
    title: string;
    message: string;
    scope: AiMenuManagerScope;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    createdAt: string;
    suggestedReplies?: AiMenuManagerCardPayload['suggestedReplies'];
    localActions?: AiMenuManagerCardPayload['localActions'];
}): AiMenuManagerCardPayload {
    const approvalPolicy = buildApprovalPolicy(params.definition);
    const isManualTask = params.definition.executionMode === 'manual_task'
        || params.definition.executionMode === 'manual_task_card';

    return {
        cardId: params.cardId,
        kind: isManualTask ? 'manual_task' : 'proposal',
        actionType: params.definition.actionType,
        title: params.title,
        message: params.message,
        status: isManualTask ? 'manual_task' : 'pending_approval',
        risk: params.definition.risk,
        approvalPolicy,
        scope: params.scope,
        entityRefs: params.entityRefs,
        beforeAfterSummary: params.beforeAfterSummary,
        suggestedReplies: params.suggestedReplies,
        localActions: params.localActions,
        actions: isManualTask
            ? ['mark_done', 'cancel']
            : approvalPolicy.requiresApproval
                ? ['approve', 'edit', 'cancel']
                : ['approve', 'cancel'],
        createdAt: params.createdAt,
    };
}

export function buildManualTaskCard(params: {
    cardId: string;
    definition: AiMenuManagerActionDefinition;
    title: string;
    message: string;
    scope: AiMenuManagerScope;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    createdAt: string;
    actionType?: AiMenuManagerActionType;
    suggestedReplies?: AiMenuManagerCardPayload['suggestedReplies'];
    localActions?: AiMenuManagerCardPayload['localActions'];
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'manual_task',
        actionType: params.actionType || params.definition.actionType,
        title: params.title,
        message: params.message,
        status: 'manual_task',
        risk: params.definition.risk,
        approvalPolicy: {
            level: 'none',
            requiresApproval: false,
            reason: 'Use the existing MenuList flow for this task. No menu truth changes until that flow is completed.',
        },
        scope: params.scope,
        entityRefs: params.entityRefs,
        beforeAfterSummary: params.beforeAfterSummary,
        suggestedReplies: params.suggestedReplies,
        localActions: params.localActions,
        actions: ['mark_done', 'cancel'],
        createdAt: params.createdAt,
    };
}

export function buildLocalExportCard(params: {
    cardId: string;
    definition: AiMenuManagerActionDefinition;
    title: string;
    message: string;
    scope: AiMenuManagerScope;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    createdAt: string;
    localActions: AiMenuManagerCardPayload['localActions'];
    suggestedReplies?: AiMenuManagerCardPayload['suggestedReplies'];
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'manual_task',
        actionType: params.definition.actionType,
        title: params.title,
        message: params.message,
        status: 'manual_task',
        risk: params.definition.risk,
        approvalPolicy: {
            level: params.definition.approvalLevel,
            requiresApproval: false,
            reason: 'This card prepares a local copy or download only. Menu truth is unchanged.',
        },
        scope: params.scope,
        entityRefs: params.entityRefs,
        beforeAfterSummary: params.beforeAfterSummary,
        suggestedReplies: params.suggestedReplies,
        localActions: params.localActions,
        actions: ['mark_done', 'cancel'],
        createdAt: params.createdAt,
    };
}

export function buildAnswerCard(params: {
    cardId: string;
    definition: AiMenuManagerActionDefinition;
    title: string;
    message: string;
    scope: AiMenuManagerScope;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    createdAt: string;
    suggestedReplies?: AiMenuManagerCardPayload['suggestedReplies'];
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'answer',
        actionType: params.definition.actionType,
        title: params.title,
        message: params.message,
        status: 'answered',
        risk: params.definition.risk,
        approvalPolicy: {
            level: 'none',
            requiresApproval: false,
            reason: 'Answered from the loaded MenuList context. No menu truth changed.',
        },
        scope: params.scope,
        entityRefs: params.entityRefs,
        beforeAfterSummary: params.beforeAfterSummary,
        suggestedReplies: params.suggestedReplies,
        actions: ['cancel'],
        createdAt: params.createdAt,
    };
}

export function buildClarificationCard(params: {
    cardId: string;
    scope: AiMenuManagerScope;
    message: string;
    createdAt: string;
    suggestedReplies?: AiMenuManagerCardPayload['suggestedReplies'];
    title?: string;
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'clarification',
        actionType: 'system_clarification_request',
        title: params.title || 'Choose what you want to change',
        message: params.message,
        status: 'pending_approval',
        risk: 'low',
        approvalPolicy: {
            level: 'none',
            requiresApproval: false,
            reason: 'Clarification is needed before Menu Manager prepares a change.',
        },
        scope: params.scope,
        entityRefs: [],
        beforeAfterSummary: {
            title: 'More detail needed',
            rows: [{ label: 'Needed', after: params.message }],
        },
        suggestedReplies: params.suggestedReplies,
        actions: ['edit', 'cancel'],
        createdAt: params.createdAt,
    };
}

export function buildUnsupportedCard(params: {
    cardId: string;
    scope: AiMenuManagerScope;
    message: string;
    createdAt: string;
    beforeAfterSummary?: AiMenuManagerBeforeAfterSummary;
    entityRefs?: AiMenuManagerEntityRef[];
    suggestedReplies?: AiMenuManagerCardPayload['suggestedReplies'];
    title?: string;
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'unsupported',
        actionType: 'system_unsupported_action',
        title: params.title || 'Action not supported',
        message: params.message,
        status: 'manual_task',
        risk: 'high',
        approvalPolicy: {
            level: 'none',
            requiresApproval: false,
            reason: 'MenuList will not change that external or protected surface from this card.',
        },
        scope: params.scope,
        entityRefs: params.entityRefs || [],
        beforeAfterSummary: params.beforeAfterSummary || {
            title: 'External work',
            rows: [{ label: 'Action', after: params.message }],
        },
        suggestedReplies: params.suggestedReplies,
        actions: ['cancel'],
        createdAt: params.createdAt,
    };
}
