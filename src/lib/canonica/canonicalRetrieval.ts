/**
 * Canonica — Canonical-First Retrieval Service
 * 
 * Sprint 2: Core retrieval logic.
 * 
 * 3-Layer Retrieval Stack:
 * Layer 1 — Deterministic Entity Index (primary, no LLM)
 * Layer 2 — Intent Classification (lightweight, rule-based)
 * Layer 3 — LLM Extraction (fallback assist only)
 * 
 * Retrieval Doctrine (FROZEN):
 * - Canonical-first: if matching canonical answer exists, return it
 * - RAG is fallback: marked as non_canonical, logged, triggers mutation if recurring
 * - Specificity scoring: rule-based, not LLM-based
 * - Deterministic: same query + same context = same answer
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { canonicaFirestoreAdmin } from "@lib/firebase/canonicaFirebaseAdmin";
import { canonicaTokenize } from "@lib/canonica/tokenizer";
import { CanonicaAnswerType, CanonicaCanonicalAnswer, CanonicaContextPayload, CanonicaEntity, CanonicaEntitySearchIndex, CanonicaGraphExpansionResult, CanonicaRelease } from "@type/canonica";

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE INTEGRITY GUARD (Phase 4 — ChatGPT Review Fix)
// If entity match confidence is below threshold, SKIP canonical
// and fall back to RAG. Prevents confidently wrong deterministic answers.
// ═══════════════════════════════════════════════════════════════

const ENTITY_MATCH_MIN_SCORE = 2.0;

// ═══════════════════════════════════════════════════════════════
// CONTEXT-AWARE SUPPORT CONSTANTS (Expansion Item #1)
// 3 guardrails from ChatGPT feedback review (2026-03-08)
// ═══════════════════════════════════════════════════════════════

// Guardrail 2: If query strongly matches an entity, dampen context boost by 50%
const STRONG_QUERY_THRESHOLD = 5.0;

// Guardrail 3: Maximum total context boost per entity
const MAX_CONTEXT_BOOST = 80;

// Context boost weights (deterministic, rule-based)
const CONTEXT_WEIGHTS = {
    entityHint: 50,   // Explicit developer signal (highest weight)
    page: 30,         // Strong location signal (80%+ of support Qs are page-specific)
    workflow: 25,     // Narrows to procedural domain
    feature: 15,      // Broad domain hint
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CanonicalRetrievalResult {
    found: boolean;
    canonical: boolean;
    answer?: CanonicaCanonicalAnswer;
    matchedEntityIds: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
    fallbackReason?: string;
    answerType?: CanonicaAnswerType;  // Guided Workflows (Item #2) — exposed for widget/API response

    /** Entity resolution debug (AI Failure Escalation — Item #8) */
    entityDebug?: {
        queryTokens: string[];
        candidates: Array<{ entityId: string; entityName?: string; score: number }>;
        resolvedEntityId?: string;
        confidence: number;
    };

    /** Knowledge Graph Exploitation (Expansion Item #11) — graph expansion metadata */
    graphExpansion?: CanonicaGraphExpansionResult;
}

export interface RetrievalContext {
    tId: number;
    sId: number;
    currentVersion?: number;
    planId?: string;
    roleId?: string;
    context?: CanonicaContextPayload;
    preloadedSearchIndex?: CanonicaEntitySearchIndex[];
    preloadedLatestRelease?: CanonicaRelease | null;
}

const getCanonicaAdminDb = () => {
    if (!canonicaFirestoreAdmin || typeof canonicaFirestoreAdmin.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
};

const getEntitySearchIndexServer = async (tId: number, sId: number): Promise<CanonicaEntitySearchIndex[]> => {
    const snapshot = await getCanonicaAdminDb()
        .collection(DB_COLLECTIONS.CANONICA_ENTITY_SEARCH_INDEX)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(500)
        .get();

    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as CanonicaEntitySearchIndex));
};

const getActiveAnswersForEntityServer = async (
    tId: number,
    sId: number,
    entityId: string,
): Promise<CanonicaCanonicalAnswer[]> => {
    const snapshot = await getCanonicaAdminDb()
        .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('scope.entityIds', 'array-contains', entityId)
        .where('status', '==', 'active')
        .limit(200)
        .get();

    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as CanonicaCanonicalAnswer));
};

const getLatestReleaseServer = async (tId: number, sId: number): Promise<CanonicaRelease | null> => {
    const snapshot = await getCanonicaAdminDb()
        .collection(DB_COLLECTIONS.CANONICA_RELEASES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .orderBy('versionNormalized', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { ...doc.data(), id: doc.id } as CanonicaRelease;
};

const getEntityByIdServer = async (entityId: string, tId: number, sId: number): Promise<CanonicaEntity | null> => {
    const doc = await getCanonicaAdminDb()
        .collection(DB_COLLECTIONS.CANONICA_ENTITIES)
        .doc(entityId)
        .get();

    if (!doc.exists) return null;
    const entity = { ...doc.data(), id: doc.id } as CanonicaEntity;
    if (Number(entity.tId) !== Number(tId) || Number(entity.sId) !== Number(sId)) return null;
    return entity;
};

// ═══════════════════════════════════════════════════════════════
// LAYER 1 — DETERMINISTIC ENTITY INDEX LOOKUP
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize and tokenize a query for deterministic entity matching.
 * No LLM involved. Fast O(n) where n = tokens in query.
 * 
 * IMPORTANT: Uses shared canonicaTokenize() to ensure identical normalization
 * at query-time and index-time. See tokenizer.ts for contract.
 */
function tokenizeQuery(queryText: string): string[] {
    return canonicaTokenize(queryText);
}

/**
 * Match query tokens against entity search index.
 * Returns matched entities sorted by weight (highest first).
 * 
 * When contextBoosts are provided (context-aware support), they are
 * added to entity scores with Guardrail 2 (query dominance dampening).
 */
function matchEntitiesFromIndex(
    queryTokens: string[],
    searchIndex: CanonicaEntitySearchIndex[],
    contextBoosts?: Map<string, number>
): { entityId: string; score: number }[] {
    const entityScores = new Map<string, number>();

    for (const entry of searchIndex) {
        let matchScore = 0;

        for (const token of queryTokens) {
            // Check canonical name
            if (entry.canonicalName.toLowerCase().includes(token)) {
                matchScore += entry.weight * 2;
            }
            // Check synonyms
            for (const synonym of entry.synonyms) {
                if (synonym.toLowerCase().includes(token)) {
                    matchScore += entry.weight;
                }
            }
            // Check normalized tokens
            for (const indexToken of entry.normalizedTokens) {
                if (indexToken === token) {
                    matchScore += entry.weight * 1.5;
                }
            }
        }

        if (matchScore > 0) {
            const current = entityScores.get(entry.entityId) || 0;
            entityScores.set(entry.entityId, current + matchScore);
        }
    }

    // Context-aware boost application with Guardrail 2 (query dominance)
    if (contextBoosts && contextBoosts.size > 0) {
        Array.from(contextBoosts.entries()).forEach(([entityId, rawBoost]) => {
            const queryScore = entityScores.get(entityId) || 0;
            // Guardrail 2: If query strongly matches this entity, dampen context boost
            const dampenedBoost = queryScore >= STRONG_QUERY_THRESHOLD
                ? rawBoost * 0.5
                : rawBoost;
            entityScores.set(entityId, queryScore + dampenedBoost);
        });
    }

    return Array.from(entityScores.entries())
        .map(([entityId, score]) => ({ entityId, score }))
        .sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════
// LAYER 2 — INTENT CLASSIFICATION (Rule-Based)
// ═══════════════════════════════════════════════════════════════

export type QueryIntent =
    | 'how_to'
    | 'why_error'
    | 'feature_availability'
    | 'permission_issue'
    | 'integration_problem'
    | 'state_transition'
    | 'general';

const INTENT_PATTERNS: { intent: QueryIntent; patterns: RegExp[] }[] = [
    {
        intent: 'how_to',
        patterns: [/how (do|can|to)/i, /steps to/i, /guide for/i, /tutorial/i, /setup/i, /configure/i]
    },
    {
        intent: 'why_error',
        patterns: [/err[_-]?\d+/i, /error/i, /fail/i, /broken/i, /not working/i, /issue with/i, /bug/i]
    },
    {
        intent: 'feature_availability',
        patterns: [/can i/i, /is there/i, /does .* support/i, /available/i, /possible to/i, /feature/i]
    },
    {
        intent: 'permission_issue',
        patterns: [/permission/i, /access/i, /role/i, /admin/i, /can't access/i, /unauthorized/i]
    },
    {
        intent: 'integration_problem',
        patterns: [/integrat/i, /connect/i, /sync/i, /api/i, /webhook/i, /third.?party/i]
    },
    {
        intent: 'state_transition',
        patterns: [/change .* status/i, /switch/i, /transition/i, /move .* to/i, /upgrade/i, /downgrade/i]
    },
];

function classifyIntent(query: string): QueryIntent {
    for (const { intent, patterns } of INTENT_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(query)) {
                return intent;
            }
        }
    }
    return 'general';
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT-AWARE BOOST GENERATION (Expansion Item #1)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate entity score boosts from context payload.
 * Returns a Map<entityId, bonusScore> added to entity match scores.
 * 
 * Uses EXACT normalizedTokens match (Guardrail 1 — not substring .includes())
 * to prevent broad context like "integrations" diluting signal across entities.
 * 
 * Guardrail 3: Total boost per entity capped at MAX_CONTEXT_BOOST.
 * 
 * @see __docs__/canonica/context-aware-support/context-aware-support_impl.md §4.8
 */
function applyContextBoosts(
    context: CanonicaContextPayload | undefined,
    searchIndex: CanonicaEntitySearchIndex[]
): Map<string, number> {
    const boosts = new Map<string, number>();
    if (!context) return boosts;

    // Guardrail 1: Use exact normalizedTokens match for context boosts
    const boostFromString = (value: string | undefined, weight: number) => {
        if (!value) return;
        const tokens = canonicaTokenize(value);
        for (const entry of searchIndex) {
            let matched = false;
            for (const token of tokens) {
                // Exact match against normalizedTokens (not substring)
                if (entry.normalizedTokens.includes(token)) {
                    matched = true;
                    break;
                }
                // Also check exact match on lowercased canonical name tokens
                const nameTokens = canonicaTokenize(entry.canonicalName);
                if (nameTokens.includes(token)) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                const current = boosts.get(entry.entityId) || 0;
                // Guardrail 3: Cap total boost per entity
                boosts.set(entry.entityId, Math.min(current + weight, MAX_CONTEXT_BOOST));
            }
        }
    };

    // Apply entityHints (highest weight — explicit developer signal)
    if (context.entityHints) {
        for (const hint of context.entityHints) {
            boostFromString(hint, CONTEXT_WEIGHTS.entityHint);
        }
    }

    // Apply page, workflow, feature context
    boostFromString(context.page, CONTEXT_WEIGHTS.page);
    boostFromString(context.workflow, CONTEXT_WEIGHTS.workflow);
    boostFromString(context.feature, CONTEXT_WEIGHTS.feature);

    return boosts;
}

// ═══════════════════════════════════════════════════════════════
// SPECIFICITY SCORING (Rule-Based — No LLM)
// ═══════════════════════════════════════════════════════════════

/**
 * Score canonical answers by specificity.
 * Order: version match → scope depth → validation recency → confidence
 * 
 * Context-aware enhancement: uses context.plan and context.userRole
 * as fallback when planId/roleId not provided via legacy path.
 */
function scoreBySpecificity(
    answers: CanonicaCanonicalAnswer[],
    context: RetrievalContext,
    graphExpansionEntities?: string[]
): CanonicaCanonicalAnswer[] {
    return answers
        .map(answer => {
            let score = 0;

            // Version window match (highest weight)
            if (context.currentVersion) {
                const { from, to } = answer.productBinding.applicableVersions;
                if (context.currentVersion >= from && (!to || context.currentVersion <= to)) {
                    score += 100;
                }
            }

            // Scope depth (more specific = higher score)
            const scopeDepth =
                (answer.scope.planIds?.length ? 10 : 0) +
                (answer.scope.roleIds?.length ? 10 : 0) +
                (answer.scope.stateIds?.length ? 10 : 0);
            score += scopeDepth;

            // Plan match — use planId or context.plan
            const effectivePlan = context.planId || context.context?.plan;
            if (effectivePlan && answer.scope.planIds?.includes(effectivePlan)) {
                score += 20;
            }

            // Role match — use roleId or context.userRole
            const effectiveRole = context.roleId || context.context?.userRole;
            if (effectiveRole && answer.scope.roleIds?.includes(effectiveRole)) {
                score += 20;
            }

            // Validation recency (newer = slightly higher)
            if (answer.validation.lastValidatedOn) {
                const daysSinceValidation = (Date.now() - answer.validation.lastValidatedOn.toMillis()) / (1000 * 60 * 60 * 24);
                score += Math.max(0, 10 - daysSinceValidation / 30); // Decay over months
            }

            // Confidence score
            score += answer.validation.confidenceScore * 5;

            // Drift penalty
            if (answer.governance.driftFlag) {
                score -= 50;
            }

            // Knowledge Graph: multi-entity coverage boost (Item #11)
            // Answers spanning more expanded entities are inherently more relevant
            if (FEATURE_FLAGS.ENABLE_CANONICA_KNOWLEDGE_GRAPH && graphExpansionEntities) {
                const entityOverlap = answer.scope.entityIds.filter(
                    (id: string) => graphExpansionEntities!.includes(id)
                ).length;
                score += entityOverlap * 15;
            }

            // Guided Workflows: procedure affinity for how_to intent
            if (FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && answer.answerType === 'procedure') {
                score += 15;
            }

            return { answer, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(item => item.answer);
}

// ═══════════════════════════════════════════════════════════════
// MAIN RETRIEVAL FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Attempt canonical-first retrieval for a query.
 * 
 * Returns:
 * - found=true, canonical=true → canonical answer found
 * - found=false, canonical=false → fallback to RAG
 * 
 * This function is called BEFORE the RAG pipeline in search-kb route.
 * Feature-flagged via ENABLE_CANONICA_CANONICAL_ANSWERS.
 */
export async function attemptCanonicalRetrieval(
    query: string,
    context: RetrievalContext
): Promise<CanonicalRetrievalResult> {
    // Feature flag check
    if (!FEATURE_FLAGS.ENABLE_CANONICA_CANONICAL_ANSWERS) {
        return {
            found: false,
            canonical: false,
            matchedEntityIds: [],
            confidence: 'none',
            fallbackReason: 'canonical_answers_disabled',
        };
    }

    try {
        // Layer 1: Deterministic entity index lookup
        const searchIndex = context.preloadedSearchIndex ?? await getEntitySearchIndexServer(context.tId, context.sId);
        if (!searchIndex || searchIndex.length === 0) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: [],
                confidence: 'none',
                fallbackReason: 'no_entity_index',
            };
        }

        const queryTokens = tokenizeQuery(query);

        // Context-aware boost generation (feature-flagged)
        let contextBoosts: Map<string, number> | undefined;
        if (FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_AWARE && context.context) {
            contextBoosts = applyContextBoosts(context.context, searchIndex);
        }

        const matchedEntities = matchEntitiesFromIndex(queryTokens, searchIndex, contextBoosts);

        // Build entity debug for escalation context (Item #8)
        // Uses already-computed data — zero additional Firestore reads
        const buildEntityDebug = () => ({
            queryTokens,
            candidates: matchedEntities.slice(0, 3).map(m => {
                const indexEntry = searchIndex.find(e => e.entityId === m.entityId);
                return {
                    entityId: m.entityId,
                    entityName: indexEntry?.canonicalName,
                    score: Math.round(m.score * 100) / 100,
                };
            }),
            resolvedEntityId: matchedEntities.length > 0 ? matchedEntities[0].entityId : undefined,
            confidence: matchedEntities.length > 0 ? Math.round(matchedEntities[0].score * 100) / 100 : 0,
        });

        if (matchedEntities.length === 0) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: [],
                confidence: 'low',
                fallbackReason: 'no_entity_match',
                entityDebug: { queryTokens, candidates: [], confidence: 0 },
            };
        }

        // Knowledge Integrity Guard: if best entity match is too weak,
        // bypass canonical layer and fall back to RAG.
        // Prevents confidently wrong deterministic answers.
        if (matchedEntities[0].score < ENTITY_MATCH_MIN_SCORE) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: matchedEntities.map(m => m.entityId),
                confidence: 'low',
                fallbackReason: `entity_match_below_threshold: best_score=${matchedEntities[0].score.toFixed(2)}, min=${ENTITY_MATCH_MIN_SCORE}`,
                entityDebug: buildEntityDebug(),
            };
        }

        // Layer 2: Intent classification (narrows context)
        const intent = classifyIntent(query);

        // Get current version for version window filtering
        let currentVersion = context.currentVersion;
        if (!currentVersion) {
            const latestRelease = context.preloadedLatestRelease !== undefined
                ? context.preloadedLatestRelease
                : await getLatestReleaseServer(context.tId, context.sId);
            if (latestRelease) {
                currentVersion = latestRelease.versionNormalized;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // Knowledge Graph Exploitation (Expansion Item #11)
        // Expand matched entities via 1-hop graph traversal before fetching answers.
        // Feature-flagged: ENABLE_CANONICA_KNOWLEDGE_GRAPH
        // ═══════════════════════════════════════════════════════════════
        let graphExpansion: CanonicaGraphExpansionResult | undefined;
        let effectiveEntityIds = matchedEntities.slice(0, 3).map(m => m.entityId);

        if (FEATURE_FLAGS.ENABLE_CANONICA_KNOWLEDGE_GRAPH && matchedEntities.length > 0) {
            try {
                const { runGraphExploitation } = await import('@lib/canonica/graphTraversal');
                const graphResult = await runGraphExploitation(
                    context.tId, context.sId,
                    matchedEntities,
                    undefined // bestAnswer not known yet — suggestions built post-answer
                );
                if (graphResult) {
                    effectiveEntityIds = graphResult.expandedEntityIds.slice(0, 5);
                    graphExpansion = graphResult.graphExpansion;
                }
            } catch {
                // Graceful degradation — graph failure never blocks retrieval
            }
        }

        // Fetch canonical answers for top matched entities (parallel for latency)
        const topEntityIds = effectiveEntityIds;
        const answerResults = await Promise.all(
            topEntityIds.map(entityId => getActiveAnswersForEntityServer(context.tId, context.sId, entityId))
        );
        const allAnswers: CanonicaCanonicalAnswer[] = [];
        for (const answers of answerResults) {
            if (answers) allAnswers.push(...answers);
        }

        if (allAnswers.length === 0) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: topEntityIds,
                confidence: 'low',
                fallbackReason: 'no_canonical_answers_for_entities',
                entityDebug: buildEntityDebug(),
            };
        }

        // Filter by version window
        const versionFiltered = currentVersion
            ? allAnswers.filter(a => {
                const { from, to } = a.productBinding.applicableVersions;
                return currentVersion! >= from && (!to || currentVersion! <= to);
            })
            : allAnswers;

        if (versionFiltered.length === 0) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: topEntityIds,
                confidence: 'low',
                fallbackReason: 'no_version_match',
                entityDebug: buildEntityDebug(),
            };
        }

        // Specificity scoring (with graph expansion entities for multi-entity boost)
        const ranked = scoreBySpecificity(versionFiltered, {
            ...context,
            currentVersion,
        }, graphExpansion?.expandedEntities);

        const bestAnswer = ranked[0];

        // Determine confidence based on entity match score and answer quality
        const topEntityScore = matchedEntities[0].score;
        let confidence: CanonicalRetrievalResult['confidence'] = 'high';
        if (topEntityScore < 3) confidence = 'medium';
        if (bestAnswer.governance.driftFlag) confidence = 'medium';

        // Knowledge Graph: rebuild suggestions now that we have bestAnswer
        if (graphExpansion && FEATURE_FLAGS.ENABLE_CANONICA_KNOWLEDGE_GRAPH) {
            try {
                const { buildRelatedSuggestions, loadGraphIndex } = await import('@lib/canonica/graphTraversal');
                const gIdx = await loadGraphIndex(context.tId, context.sId);
                if (gIdx) {
                    const suggestions = buildRelatedSuggestions(
                        graphExpansion.expandedEntities,
                        gIdx,
                        bestAnswer
                    );
                    if (suggestions.length > 0) {
                        graphExpansion = { ...graphExpansion, relatedSuggestions: suggestions };
                    }
                }
            } catch {
                // Non-blocking — suggestions are best-effort
            }
        }

        return {
            found: true,
            canonical: true,
            answer: bestAnswer,
            matchedEntityIds: topEntityIds,
            confidence,
            answerType: bestAnswer.answerType || 'explanation',
            entityDebug: buildEntityDebug(),
            graphExpansion,
        };

    } catch (error) {
        // Graceful degradation — fallback to RAG on any error
        return {
            found: false,
            canonical: false,
            matchedEntityIds: [],
            confidence: 'none',
            fallbackReason: `retrieval_error: ${(error as Error).message}`,
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// E6: ENTITY-ENRICHED RAG CONTEXT
// When canonical retrieval fails but entities were detected,
// include entity descriptions in the RAG prompt for better answers.
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch entity descriptions for detected entity IDs.
 * Used to enrich RAG fallback context with entity semantics.
 * Returns up to 5 entity descriptions (token budget).
 */
export async function getEntityDescriptions(
    entityIds: string[],
    tId: number,
    sId: number
): Promise<{ name: string; description: string }[]> {
    if (!entityIds || entityIds.length === 0) return [];

    try {
        const descriptions: { name: string; description: string }[] = [];

        for (const entityId of entityIds.slice(0, 5)) {
            const entity = await getEntityByIdServer(entityId, tId, sId);
            if (entity && entity.status === 'active' && entity.description) {
                descriptions.push({
                    name: entity.name,
                    description: entity.description.substring(0, 200),
                });
            }
        }

        return descriptions;
    } catch {
        return [];
    }
}

/**
 * Build a context block string from entity descriptions.
 * Prepended to RAG payload for semantic grounding.
 */
export function buildEntityContextBlock(
    entities: { name: string; description: string }[]
): string {
    if (!entities || entities.length === 0) return '';

    const block = entities
        .map(e => `- ${e.name}: ${e.description}`)
        .join('\n');

    return `\nRelevant Product Concepts:\n${block}\n`;
}
