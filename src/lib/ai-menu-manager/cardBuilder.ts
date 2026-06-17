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
        actions: ['mark_done', 'cancel'],
        createdAt: params.createdAt,
    };
}

export function buildClarificationCard(params: {
    cardId: string;
    scope: AiMenuManagerScope;
    message: string;
    createdAt: string;
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'clarification',
        actionType: 'system_clarification_request',
        title: 'Choose what you want to change',
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
        actions: ['edit', 'cancel'],
        createdAt: params.createdAt,
    };
}

export function buildUnsupportedCard(params: {
    cardId: string;
    scope: AiMenuManagerScope;
    message: string;
    createdAt: string;
}): AiMenuManagerCardPayload {
    return {
        cardId: params.cardId,
        kind: 'unsupported',
        actionType: 'system_unsupported_action',
        title: 'Manual task needed',
        message: params.message,
        status: 'manual_task',
        risk: 'high',
        approvalPolicy: {
            level: 'none',
            requiresApproval: false,
            reason: 'MenuList will not post or change that external platform. Use this as a manual handoff.',
        },
        scope: params.scope,
        entityRefs: [],
        beforeAfterSummary: {
            title: 'External work',
            rows: [{ label: 'Action', after: params.message }],
        },
        actions: ['mark_done', 'cancel'],
        createdAt: params.createdAt,
    };
}
