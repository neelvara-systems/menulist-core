import { PRODUCT_IDS } from '@constant/product';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    normalizeCompiledSourceVersions,
} from '@lib/answerlattice/compiledContext';
import {
    getAnswerlatticePredictiveTimestampMillis,
    isAnswerlatticePredictiveTriggerWithinWindow,
    normalizeAnswerlatticePredictiveTrigger,
    projectAnswerlatticePredictiveTriggerForRuntime,
} from '@lib/answerlattice/predictiveSupportContracts';
import type {
    AnswerlatticeEntityGraphIndex,
    AnswerlatticeEntityGraphSourceVersions,
    AnswerlatticeInteractionType,
    AnswerlatticePredictiveTriggerIndex,
} from '@type/answerlattice';
import {
    ANSWERLATTICE_ENTITY_TYPES,
    ANSWERLATTICE_INTERACTION_TYPES,
    ANSWERLATTICE_PREDICTIVE_CONSTRAINTS,
    ANSWERLATTICE_RELATION_TYPES,
} from '@type/answerlattice';

const isExactScope = (value: unknown, expected: number): boolean => (
    typeof value === 'number' && Number.isSafeInteger(value) && value === expected
);

const ANSWERLATTICE_GRAPH_LIMITS = {
    answersPerEntity: 1_000,
    entities: 1_000,
    interactionRules: 100,
    relatedPerNode: 20,
    relations: 2_000,
} as const;

const answerlatticeEntityTypes = new Set<string>(Object.values(ANSWERLATTICE_ENTITY_TYPES));
const answerlatticeInteractionTypes = new Set<string>(Object.values(ANSWERLATTICE_INTERACTION_TYPES));
const answerlatticeRelationTypes = new Set<string>(Object.values(ANSWERLATTICE_RELATION_TYPES));
const isAnswerlatticeInteractionType = (value: unknown): value is AnswerlatticeInteractionType => (
    typeof value === 'string' && answerlatticeInteractionTypes.has(value)
);

export type AnswerlatticeEntityGraphFreshness = 'current' | 'stale' | 'unverified';

const parseAnswerlatticeEntityGraphSourceVersions = (
    value: unknown,
): AnswerlatticeEntityGraphSourceVersions | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    const versions = {
        entities: data.entities,
        entityRelations: data.entityRelations,
        canonical: data.canonical,
    };
    if (Object.values(versions).some(version => (
        typeof version !== 'number'
        || !Number.isSafeInteger(version)
        || version < 0
    ))) return null;
    return versions as AnswerlatticeEntityGraphSourceVersions;
};

export function parseAnswerlatticeCurrentGraphSourceVersions(
    value: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeEntityGraphSourceVersions | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, any>;
    if (
        data.pId !== PRODUCT_IDS.ANSWERLATTICE
        || !isExactScope(data.tId, scope.tId)
        || !isExactScope(data.sId, scope.sId)
        || !areAnswerlatticeCompiledSourceVersionsValid(data)
    ) return null;
    const normalized = normalizeCompiledSourceVersions(data);
    return {
        entities: normalized.entities || 0,
        entityRelations: normalized.entityRelations || 0,
        canonical: normalized.canonical || 0,
    };
}

export function getAnswerlatticeEntityGraphFreshness(
    builtFrom: AnswerlatticeEntityGraphSourceVersions | undefined,
    current: AnswerlatticeEntityGraphSourceVersions | null,
): AnswerlatticeEntityGraphFreshness {
    if (!builtFrom || !current) return 'unverified';
    const keys = ['entities', 'entityRelations', 'canonical'] as const;
    if (keys.some(key => current[key] < builtFrom[key])) return 'unverified';
    return keys.some(key => current[key] > builtFrom[key]) ? 'stale' : 'current';
}

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
    if (
        getAnswerlatticePredictiveTimestampMillis(data.lastRebuiltAt) === null
        || typeof data.version !== 'number'
        || !Number.isSafeInteger(data.version)
        || data.version <= 0
        || typeof data.entityCount !== 'number'
        || !Number.isSafeInteger(data.entityCount)
        || data.entityCount < 0
        || data.entityCount > ANSWERLATTICE_GRAPH_LIMITS.entities
        || typeof data.relationCount !== 'number'
        || !Number.isSafeInteger(data.relationCount)
        || data.relationCount < 0
        || data.relationCount > ANSWERLATTICE_GRAPH_LIMITS.relations
    ) return null;

    const entries = Object.entries(data.graph);
    if (entries.length !== data.entityCount || entries.length > ANSWERLATTICE_GRAPH_LIMITS.entities) return null;

    const graph: AnswerlatticeEntityGraphIndex['graph'] = {};
    for (const [entityId, raw] of entries) {
        if (!entityId || entityId.length > 180 || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        const node = raw as Record<string, any>;
        if (typeof node.name !== 'string' || !node.name.trim() || node.name.length > 240) return null;
        if (typeof node.type !== 'string' || !answerlatticeEntityTypes.has(node.type)) return null;
        if (
            node.currentVersion !== undefined
            && (!Number.isSafeInteger(node.currentVersion) || node.currentVersion <= 0)
        ) return null;
        if (!Array.isArray(node.related) || node.related.length > ANSWERLATTICE_GRAPH_LIMITS.entities) return null;
        if (!node.related.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 180)) return null;

        const related = Array.from(new Set<string>(node.related))
            .slice(0, ANSWERLATTICE_GRAPH_LIMITS.relatedPerNode);
        const relatedSet = new Set(related);
        const parseRelationMap = (value: unknown): Record<string, string[]> | null => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            const parsed: Record<string, string[]> = {};
            for (const [relationType, ids] of Object.entries(value)) {
                if (!answerlatticeRelationTypes.has(relationType) || !Array.isArray(ids)) return null;
                if (!ids.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 180)) return null;
                parsed[relationType] = Array.from(new Set<string>(ids))
                    .filter(id => relatedSet.has(id))
                    .slice(0, ANSWERLATTICE_GRAPH_LIMITS.relatedPerNode);
            }
            return parsed;
        };
        const relationTypes = parseRelationMap(node.relationTypes);
        if (!relationTypes) return null;
        const hasOutgoingRelations = node.outgoingRelationTypes !== undefined;
        const hasIncomingRelations = node.incomingRelationTypes !== undefined;
        if (hasOutgoingRelations !== hasIncomingRelations) return null;
        const outgoingRelationTypes = hasOutgoingRelations
            ? parseRelationMap(node.outgoingRelationTypes)
            : undefined;
        const incomingRelationTypes = hasIncomingRelations
            ? parseRelationMap(node.incomingRelationTypes)
            : undefined;
        if (
            (hasOutgoingRelations && !outgoingRelationTypes)
            || (hasIncomingRelations && !incomingRelationTypes)
        ) return null;
        if (outgoingRelationTypes && incomingRelationTypes) {
            for (const [relationType, ids] of Object.entries(relationTypes)) {
                const outgoingIds = new Set(outgoingRelationTypes[relationType] || []);
                const incomingIds = new Set(incomingRelationTypes[relationType] || []);
                if (ids.some(id => !outgoingIds.has(id) && !incomingIds.has(id))) return null;
            }
            for (const relationMap of [outgoingRelationTypes, incomingRelationTypes]) {
                for (const [relationType, ids] of Object.entries(relationMap)) {
                    const allTypedIds = new Set(relationTypes[relationType] || []);
                    if (ids.some(id => !allTypedIds.has(id))) return null;
                }
            }
        }

        const answerCount = node.answerCount;
        const driftedAnswerCount = node.driftedAnswerCount ?? 0;
        const reviewRequiredAnswerCount = node.reviewRequiredAnswerCount ?? 0;
        if (
            !Number.isSafeInteger(answerCount)
            || answerCount < 0
            || answerCount > ANSWERLATTICE_GRAPH_LIMITS.answersPerEntity
            || !Number.isSafeInteger(driftedAnswerCount)
            || driftedAnswerCount < 0
            || driftedAnswerCount > answerCount
            || !Number.isSafeInteger(reviewRequiredAnswerCount)
            || reviewRequiredAnswerCount < 0
            || reviewRequiredAnswerCount > answerCount
        ) return null;

        graph[entityId] = {
            name: node.name.trim(),
            type: node.type,
            currentVersion: node.currentVersion,
            related,
            relationTypes,
            ...(outgoingRelationTypes ? { outgoingRelationTypes } : {}),
            ...(incomingRelationTypes ? { incomingRelationTypes } : {}),
            answerCount,
            driftedAnswerCount,
            reviewRequiredAnswerCount,
        };
    }

    for (const node of Object.values(graph)) {
        if (node.related.some(id => !graph[id])) return null;
        if (Object.values(node.relationTypes).some(ids => ids.some(id => !graph[id]))) return null;
        if (node.outgoingRelationTypes && Object.values(node.outgoingRelationTypes).some(ids => ids.some(id => !graph[id]))) return null;
        if (node.incomingRelationTypes && Object.values(node.incomingRelationTypes).some(ids => ids.some(id => !graph[id]))) return null;
    }

    const sourceVersions = data.sourceVersions === undefined
        ? undefined
        : parseAnswerlatticeEntityGraphSourceVersions(data.sourceVersions);
    if (data.sourceVersions !== undefined && !sourceVersions) return null;

    let interactionRules: AnswerlatticeEntityGraphIndex['interactionRules'];
    if (data.interactionRules !== undefined) {
        if (
            !Array.isArray(data.interactionRules)
            || data.interactionRules.length > ANSWERLATTICE_GRAPH_LIMITS.interactionRules
        ) return null;
        interactionRules = [];
        for (const value of data.interactionRules) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            const rule = value as Record<string, any>;
            const uniqueEntities = Array.isArray(rule.entities)
                ? Array.from(new Set<string>(rule.entities))
                : [];
            if (
                typeof rule.id !== 'string' || !rule.id || rule.id.length > 180
                || !Array.isArray(rule.entities) || rule.entities.length < 2 || rule.entities.length > 10
                || uniqueEntities.length < 2
                || !rule.entities.every((id: unknown) => typeof id === 'string' && Boolean(graph[id]))
                || !isAnswerlatticeInteractionType(rule.interactionType)
                || typeof rule.explanation !== 'string' || !rule.explanation || rule.explanation.length > 300
                || typeof rule.confidence !== 'number' || !Number.isFinite(rule.confidence)
                || rule.confidence < 0 || rule.confidence > 1
                || typeof rule.active !== 'boolean'
                || (
                    rule.relatedAnswerIds !== undefined
                    && (
                        !Array.isArray(rule.relatedAnswerIds)
                        || rule.relatedAnswerIds.length > ANSWERLATTICE_GRAPH_LIMITS.answersPerEntity
                        || !rule.relatedAnswerIds.every((id: unknown) => (
                            typeof id === 'string' && id.length > 0 && id.length <= 180
                        ))
                    )
                )
            ) return null;
            interactionRules.push({
                id: rule.id,
                entities: uniqueEntities,
                interactionType: rule.interactionType,
                explanation: rule.explanation,
                ...(rule.relatedAnswerIds
                    ? { relatedAnswerIds: Array.from(new Set<string>(rule.relatedAnswerIds)) }
                    : {}),
                confidence: rule.confidence,
                active: rule.active,
            });
        }
    }

    return {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        lastRebuiltAt: data.lastRebuiltAt,
        version: data.version,
        entityCount: data.entityCount,
        relationCount: data.relationCount,
        graph,
        sourceVersions,
        interactionRules,
    } as AnswerlatticeEntityGraphIndex;
}
