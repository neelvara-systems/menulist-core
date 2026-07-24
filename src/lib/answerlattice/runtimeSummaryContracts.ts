import { PRODUCT_IDS } from '@constant/product';
import {
    getAnswerlatticePredictiveTimestampMillis,
    isAnswerlatticePredictiveTriggerWithinWindow,
    normalizeAnswerlatticePredictiveTrigger,
    projectAnswerlatticePredictiveTriggerForRuntime,
} from '@lib/answerlattice/predictiveSupportContracts';
import type {
    AnswerlatticeEntityGraphIndex,
    AnswerlatticePredictiveTriggerIndex,
} from '@type/answerlattice';
import { ANSWERLATTICE_PREDICTIVE_CONSTRAINTS } from '@type/answerlattice';

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
    if (
        getAnswerlatticePredictiveTimestampMillis(data.lastUpdated) === null
        || typeof data.version !== 'number'
        || !Number.isSafeInteger(data.version)
        || data.version <= 0
        || typeof data.triggerCount !== 'number'
        || !Number.isSafeInteger(data.triggerCount)
        || data.triggerCount < 0
        || typeof data.activeTriggerCount !== 'number'
        || !Number.isSafeInteger(data.activeTriggerCount)
        || data.activeTriggerCount < 0
        || data.activeTriggerCount > data.triggerCount
    ) return null;

    const entries = Object.entries(data.triggers);
    if (entries.length > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT) return null;

    const triggers: AnswerlatticePredictiveTriggerIndex['triggers'] = {};
    for (const [id, raw] of entries) {
        const trigger = normalizeAnswerlatticePredictiveTrigger({ id, value: raw, scope });
        if (!trigger) continue;
        triggers[trigger.id] = projectAnswerlatticePredictiveTriggerForRuntime(trigger);
    }

    const activeTriggerCount = Object.values(triggers).filter(trigger => (
        trigger.status === 'active' && isAnswerlatticePredictiveTriggerWithinWindow(trigger)
    )).length;
    if (data.triggerCount !== Object.keys(triggers).length) return null;
    return {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        lastUpdated: data.lastUpdated,
        version: data.version,
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
