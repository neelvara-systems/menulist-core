import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';
import type {
    AnswerlatticeEntityGraphIndex,
    AnswerlatticePredictiveTrigger,
    AnswerlatticePredictiveTriggerIndex,
} from '@type/answerlattice';

const isExactScope = (value: unknown, expected: number): boolean => (
    typeof value === 'number' && Number.isSafeInteger(value) && value === expected
);

export function parseAnswerlatticePredictiveTriggerIndex(
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticePredictiveTriggerIndex | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Record<string, any>;
    if (data.pId !== PRODUCT_IDS.ANSWERLATTICE || !isExactScope(data.tId, scope.tId) || !isExactScope(data.sId, scope.sId)) {
        return null;
    }
    if (!data.triggers || typeof data.triggers !== 'object' || Array.isArray(data.triggers)) return null;

    const triggers: Record<string, AnswerlatticePredictiveTrigger> = {};
    for (const [id, raw] of Object.entries(data.triggers).slice(0, 500)) {
        const normalizedId = normalizeAnswerlatticePredictiveTriggerId(id);
        if (!normalizedId) continue;
        if (!raw || typeof raw !== 'object') continue;
        const trigger = raw as Record<string, any>;
        if (!isExactScope(trigger.tId, scope.tId) || !isExactScope(trigger.sId, scope.sId)) continue;
        if (trigger.pId !== PRODUCT_IDS.ANSWERLATTICE) continue;
        if (!trigger.conditions || typeof trigger.conditions !== 'object') continue;
        if (!trigger.action || typeof trigger.action !== 'object') continue;
        if (typeof trigger.name !== 'string' || !trigger.name.trim() || trigger.name.length > 180) continue;
        if (!['active', 'suggested', 'disabled', 'archived'].includes(trigger.status)) continue;
        if (!['manual', 'friction_auto', 'system'].includes(trigger.source)) continue;
        if (!['help_card', 'workflow_guide', 'link_article', 'known_issue'].includes(trigger.action.type)) continue;
        if (!Number.isSafeInteger(trigger.priority) || trigger.priority < 0 || trigger.priority > 100) continue;
        if (!Number.isSafeInteger(trigger.cooldownHours) || trigger.cooldownHours < 1 || trigger.cooldownHours > 720) continue;
        triggers[normalizedId] = {
            id: normalizedId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            name: trigger.name.trim().slice(0, 180),
            ...(typeof trigger.description === 'string' ? { description: trigger.description.slice(0, 300) } : {}),
            ...(trigger.kind === 'predictive_help' || trigger.kind === 'known_issue' ? { kind: trigger.kind } : {}),
            conditions: trigger.conditions,
            action: trigger.action,
            ...(trigger.resolvedSuggestion && typeof trigger.resolvedSuggestion === 'object'
                ? { resolvedSuggestion: trigger.resolvedSuggestion }
                : {}),
            priority: trigger.priority,
            cooldownHours: trigger.cooldownHours,
            ...(Number.isSafeInteger(trigger.maxImpressionsPerUser) && trigger.maxImpressionsPerUser > 0
                ? { maxImpressionsPerUser: trigger.maxImpressionsPerUser }
                : {}),
            status: trigger.status,
            source: trigger.source,
            ...(trigger.knownIssue && typeof trigger.knownIssue === 'object' ? { knownIssue: trigger.knownIssue } : {}),
        } as AnswerlatticePredictiveTrigger;
    }

    const activeTriggerCount = Object.values(triggers).filter(trigger => trigger.status === 'active').length;
    return {
        ...data,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        triggerCount: Object.keys(triggers).length,
        activeTriggerCount,
        triggers,
    } as AnswerlatticePredictiveTriggerIndex;
}

export function parseAnswerlatticeEntityGraphIndex(
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeEntityGraphIndex | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Record<string, any>;
    if (data.pId !== PRODUCT_IDS.ANSWERLATTICE || !isExactScope(data.tId, scope.tId) || !isExactScope(data.sId, scope.sId)) {
        return null;
    }
    if (!data.graph || typeof data.graph !== 'object' || Array.isArray(data.graph)) return null;

    const graph: AnswerlatticeEntityGraphIndex['graph'] = {};
    for (const [entityId, raw] of Object.entries(data.graph).slice(0, 1_000)) {
        if (!raw || typeof raw !== 'object') continue;
        const node = raw as Record<string, any>;
        if (typeof node.name !== 'string' || !node.name.trim() || node.name.length > 240) continue;
        if (typeof node.type !== 'string' || node.type.length > 80) continue;
        const related = Array.isArray(node.related)
            ? Array.from(new Set(node.related.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 180))).slice(0, 20)
            : [];
        const relationTypes: Record<string, string[]> = {};
        if (node.relationTypes && typeof node.relationTypes === 'object' && !Array.isArray(node.relationTypes)) {
            for (const [relationType, ids] of Object.entries(node.relationTypes).slice(0, 20)) {
                if (!Array.isArray(ids) || relationType.length > 80) continue;
                relationTypes[relationType] = Array.from(new Set(ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 180))).slice(0, 20);
            }
        }
        graph[entityId] = {
            name: node.name.trim(),
            type: node.type,
            related,
            relationTypes,
            answerCount: Number.isSafeInteger(node.answerCount) ? Math.max(0, Math.min(node.answerCount, 100_000)) : 0,
        };
    }

    const interactionRules = Array.isArray(data.interactionRules)
        ? data.interactionRules.filter((rule: any) => (
            rule && typeof rule === 'object'
            && typeof rule.id === 'string' && rule.id.length <= 180
            && Array.isArray(rule.entities) && rule.entities.length >= 2 && rule.entities.length <= 10
            && rule.entities.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 180)
            && typeof rule.explanation === 'string' && rule.explanation.length <= 300
            && typeof rule.confidence === 'number' && Number.isFinite(rule.confidence)
            && rule.confidence >= 0 && rule.confidence <= 1
            && typeof rule.active === 'boolean'
        )).slice(0, 100)
        : undefined;

    return {
        ...data,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        graph,
        interactionRules,
    } as AnswerlatticeEntityGraphIndex;
}
