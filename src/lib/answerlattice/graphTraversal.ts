/**
 * Answerlattice — Knowledge Graph Exploitation (Expansion Item #11)
 * 
 * Graph-aware retrieval: 1-hop entity expansion, cross-feature
 * interaction detection, and related entity suggestions.
 * 
 * All operations are in-memory on a precomputed graph index document.
 * Zero LLM calls. Deterministic. Bounded by hard guardrails.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH
 * @see __docs__/answerlattice/knowledge-graph-exploitation/
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import type {
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeEntityGraphIndex,
    AnswerlatticeEntityGraphNode,
    AnswerlatticeGraphExpansionResult,
    AnswerlatticeInteractionRule,
} from '@type/answerlattice';

// ═══════════════════════════════════════════════════════════════
// GUARDRAILS (Hard-coded, non-configurable)
// ═══════════════════════════════════════════════════════════════

const MAX_ENTITIES_AFTER_EXPANSION = 10;
const MAX_RELATIONS_PER_ENTITY = 20;
const MAX_SUGGESTIONS = 3;
const MIN_INTERACTION_CONFIDENCE = 0.5;
const GRAPH_INDEX_CACHE_TTL_MS = 60_000;
const graphIndexCache = new Map<string, {
    expiresAt: number;
    value: AnswerlatticeEntityGraphIndex | null;
}>();

// ═══════════════════════════════════════════════════════════════
// GRAPH INDEX LOADING
// ═══════════════════════════════════════════════════════════════

/**
 * Load the precomputed entity graph index for a tenant.
 * Single Firestore read. Returns null if not available.
 * 
 * Doc path: platformSummary/entityGraphIndex_{tId}_{sId}
 */
export async function loadGraphIndex(
    tId: number,
    sId: number
): Promise<AnswerlatticeEntityGraphIndex | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) return null;

    try {
        if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
            return null;
        }

        const cacheKey = `${Number(tId)}:${Number(sId)}`;
        const cached = graphIndexCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        if (cached) {
            graphIndexCache.delete(cacheKey);
        }

        const snap = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`entityGraphIndex_${tId}_${sId}`)
            .get();
        const value = snap.exists ? snap.data() as AnswerlatticeEntityGraphIndex : null;
        graphIndexCache.set(cacheKey, {
            expiresAt: Date.now() + GRAPH_INDEX_CACHE_TTL_MS,
            value,
        });
        return value;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// GRAPH EXPANSION (1-hop, bounded, answer-aware)
// ═══════════════════════════════════════════════════════════════

/**
 * Expand matched entities via 1-hop graph traversal.
 * Only expands to entities that have active canonical answers (answerCount > 0).
 * 
 * Guardrails:
 * - maxDepth = 1 (NEVER deeper)
 * - maxEntities = 10 (after expansion)
 * - maxRelationsPerEntity = 20
 * 
 * @param matchedEntities — Entities from query matching (sorted by score)
 * @param graphIndex — Precomputed graph index document
 * @returns Expanded entity ID set (includes originals + graph neighbors)
 */
export function expandViaGraph(
    matchedEntities: { entityId: string; score: number }[],
    graphIndex: AnswerlatticeEntityGraphIndex
): string[] {
    const expanded = new Set<string>();

    // Add original matched entities (top 5 from query matching)
    for (const match of matchedEntities.slice(0, 5)) {
        expanded.add(match.entityId);
    }

    // 1-hop expansion — depth=1 only, NEVER deeper
    for (const match of matchedEntities.slice(0, 3)) {
        const node = graphIndex.graph[match.entityId];
        if (!node) continue;

        const related = node.related.slice(0, MAX_RELATIONS_PER_ENTITY);
        for (const relatedId of related) {
            if (expanded.size >= MAX_ENTITIES_AFTER_EXPANSION) break;

            // Only expand to entities that have canonical answers
            const relatedNode = graphIndex.graph[relatedId];
            if (relatedNode && relatedNode.answerCount > 0) {
                expanded.add(relatedId);
            }
        }
    }

    return Array.from(expanded);
}

// ═══════════════════════════════════════════════════════════════
// CROSS-FEATURE INTERACTION DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Find matching interaction rule for the expanded entity set.
 * Only triggers when 2+ entities are detected.
 * Rules are deterministic, human-authored (never LLM-generated).
 * 
 * @returns The first matching active rule, or null
 */
export function findMatchingInteraction(
    expandedEntities: string[],
    rules: AnswerlatticeInteractionRule[] | undefined
): AnswerlatticeInteractionRule | null {
    if (!rules || rules.length === 0) return null;
    if (expandedEntities.length < 2) return null;

    const entitySet = new Set(expandedEntities);

    for (const rule of rules) {
        if (!rule.active) continue;
        if (rule.confidence < MIN_INTERACTION_CONFIDENCE) continue;
        // All rule entities must be present in the expanded set
        const match = rule.entities.every(e => entitySet.has(e));
        if (match) return rule;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// RELATED ENTITY SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Build related entity suggestions from graph neighbors.
 * Suggests entities NOT already in the expanded set or answer scope.
 * Only suggests entities with active canonical answers (no dead-ends).
 * 
 * @returns Up to 3 related entities sorted by answerCount
 */
export function buildRelatedSuggestions(
    expandedEntities: string[],
    graphIndex: AnswerlatticeEntityGraphIndex,
    bestAnswer: AnswerlatticeCanonicalAnswer | undefined
): Array<{ entityId: string; entityName: string }> {
    const suggestions: Array<{ entityId: string; entityName: string; score: number }> = [];
    const answeredEntities = new Set(bestAnswer?.scope.entityIds || []);
    const expandedSet = new Set(expandedEntities);
    const seen = new Set<string>();

    for (const entityId of expandedEntities.slice(0, 3)) {
        const node = graphIndex.graph[entityId];
        if (!node) continue;

        for (const relatedId of node.related) {
            // Skip already expanded or answered entities
            if (expandedSet.has(relatedId)) continue;
            if (answeredEntities.has(relatedId)) continue;
            if (seen.has(relatedId)) continue;
            seen.add(relatedId);

            const relatedNode = graphIndex.graph[relatedId];
            if (!relatedNode || relatedNode.answerCount === 0) continue;

            suggestions.push({
                entityId: relatedId,
                entityName: relatedNode.name,
                score: relatedNode.answerCount,
            });
        }
    }

    return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SUGGESTIONS)
        .map(({ entityId, entityName }) => ({ entityId, entityName }));
}

// ═══════════════════════════════════════════════════════════════
// FULL GRAPH EXPLOITATION PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Run the complete Knowledge Graph Exploitation pipeline.
 * Called from attemptCanonicalRetrieval() after entity matching.
 * 
 * Steps:
 * 1. Load graph index (1 Firestore read)
 * 2. Expand entities via 1-hop traversal (in-memory)
 * 3. Detect cross-feature interactions (in-memory)
 * 4. Build related suggestions (in-memory)
 * 
 * Returns null if graph index unavailable or flag OFF.
 */
export async function runGraphExploitation(
    tId: number,
    sId: number,
    matchedEntities: { entityId: string; score: number }[],
    bestAnswer: AnswerlatticeCanonicalAnswer | undefined
): Promise<{
    expandedEntityIds: string[];
    graphExpansion: AnswerlatticeGraphExpansionResult;
    graphIndex: AnswerlatticeEntityGraphIndex;
} | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) return null;
    if (matchedEntities.length === 0) return null;

    const graphIndex = await loadGraphIndex(tId, sId);
    if (!graphIndex || !graphIndex.graph) return null;

    const originalEntityIds = matchedEntities.slice(0, 5).map(m => m.entityId);

    // 1. Graph expansion
    const expandedEntityIds = expandViaGraph(matchedEntities, graphIndex);

    // 2. Interaction detection
    const interactionRule = findMatchingInteraction(
        expandedEntityIds,
        graphIndex.interactionRules
    );

    // 3. Related suggestions
    const relatedSuggestions = buildRelatedSuggestions(
        expandedEntityIds,
        graphIndex,
        bestAnswer
    );

    const graphExpansion: AnswerlatticeGraphExpansionResult = {
        originalEntities: originalEntityIds,
        expandedEntities: expandedEntityIds,
        expansionSource: 'graph_index',
        interactionDetected: interactionRule ? {
            ruleId: interactionRule.id,
            interactionType: interactionRule.interactionType,
            explanation: interactionRule.explanation,
        } : undefined,
        relatedSuggestions: relatedSuggestions.length > 0 ? relatedSuggestions : undefined,
    };

    return {
        expandedEntityIds,
        graphExpansion,
        graphIndex,
    };
}
