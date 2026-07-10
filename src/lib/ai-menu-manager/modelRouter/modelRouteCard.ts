import type {
    AiMenuManagerCardPayload,
    AiMenuManagerEntityRef,
    AiMenuManagerScope,
} from '@type/aiMenuManager';
import { getAiMenuManagerActionDefinition } from '../actionRegistry';
import {
    buildAnswerCard,
    buildClarificationCard,
    buildUnsupportedCard,
} from '../cardBuilder';
import type { AiMenuManagerModelRouteResult } from './routerOutcomeSchema';

function getAnswerTitle(outcome: AiMenuManagerModelRouteResult['outcome']) {
    if (outcome === 'diagnostic') return 'Menu check';
    if (outcome === 'recommendation') return 'Suggested next step';
    if (outcome === 'receipt_status') return 'Current status';
    return 'Menu Manager answer';
}

function getGroundedEntityRefs(result: AiMenuManagerModelRouteResult): AiMenuManagerEntityRef[] {
    const kindByTarget = {
        category: 'category',
        design: 'preset',
        item: 'menu_item',
        project: 'project',
        store: 'store',
    } as const;

    return (result.targets || []).flatMap((target) => {
        const kind = target.entityType === 'surface' ? null : kindByTarget[target.entityType];
        if (!kind || !target.entityId || !target.displayName) return [];
        return [{ kind, id: target.entityId, label: target.displayName }];
    });
}

export function buildAiMenuManagerModelRouteCard(params: {
    cardId: string;
    createdAt: string;
    result: AiMenuManagerModelRouteResult;
    scope: AiMenuManagerScope;
}): AiMenuManagerCardPayload | null {
    const { result } = params;

    if (result.outcome === 'clarification') {
        return buildClarificationCard({
            cardId: params.cardId,
            createdAt: params.createdAt,
            message: result.clarification?.question || result.ownerReply,
            scope: params.scope,
            suggestedReplies: result.clarification?.options.map((option) => ({
                composerContext: option.entityId && option.entityType
                    ? {
                        target: option.entityType,
                        selectedEntityIds: [option.entityId],
                    }
                    : undefined,
                label: option.label,
                prompt: option.prompt || option.label,
                helper: 'Continue with this choice',
            })) || result.suggestedReplies,
            title: 'Choose one detail',
        });
    }

    if (result.outcome === 'unsupported') {
        return buildUnsupportedCard({
            cardId: params.cardId,
            createdAt: params.createdAt,
            message: result.ownerReply,
            scope: params.scope,
            suggestedReplies: result.suggestedReplies,
            title: 'Menu Manager handles MenuList work',
        });
    }

    if (['answer', 'diagnostic', 'recommendation', 'receipt_status'].includes(result.outcome)) {
        const definition = getAiMenuManagerActionDefinition('system_context_answer');
        const entityRefs = getGroundedEntityRefs(result);
        const groundedLabels = Array.from(new Set(entityRefs.map((entity) => entity.label)));
        return buildAnswerCard({
            cardId: params.cardId,
            createdAt: params.createdAt,
            definition,
            entityRefs,
            message: result.ownerReply,
            scope: params.scope,
            suggestedReplies: result.suggestedReplies,
            title: getAnswerTitle(result.outcome),
            beforeAfterSummary: {
                title: 'Selected menu context',
                rows: groundedLabels.length
                    ? [{ label: 'Based on', after: groundedLabels.join(', ') }]
                    : undefined,
            },
        });
    }

    return null;
}
