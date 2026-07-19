/**
 * Answerlattice — Canonical-First Retrieval Service
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
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { normalizeAnswerlatticeScopeDocumentId } from "@lib/answerlattice/sessionScope";
import { answerlatticeFirestoreAdmin } from "@lib/firebase/answerlatticeFirebaseAdmin";
import { normalizeAnswerlatticeResolvedEntityId } from "@lib/answerlattice/governanceIdBoundary";
import {
    parseAnswerlatticeRetrievalCanonicalAnswer,
    parseAnswerlatticeRetrievalEntity,
    parseAnswerlatticeRetrievalRelease,
    parseAnswerlatticeRetrievalSearchIndex,
} from '@lib/answerlattice/retrievalContracts';
import { normalizeAnswerlatticePublicCitations } from '@lib/answerlattice/publicAnswerContracts';
import { answerlatticeTokenize } from "@lib/answerlattice/tokenizer";
import { AnswerlatticeAnswerType, AnswerlatticeCanonicalAnswer, AnswerlatticeContextPayload, AnswerlatticeEntity, AnswerlatticeEntityGraphIndex, AnswerlatticeEntitySearchIndex, AnswerlatticeGraphExpansionResult, AnswerlatticePublicCitation, AnswerlatticeRelease, AnswerlatticeScopeClarification } from "@type/answerlattice";

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
    answer?: AnswerlatticeCanonicalAnswer;
    matchedEntityIds: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
    fallbackReason?: string;
    answerType?: AnswerlatticeAnswerType;  // Guided Workflows (Item #2) — exposed for widget/API response
    citations?: AnswerlatticePublicCitation[];
    evidenceReferenceIds?: string[];
    clarification?: AnswerlatticeScopeClarification;

    /** Entity resolution debug (AI Failure Escalation — Item #8) */
    entityDebug?: {
        queryTokens: string[];
        candidates: Array<{ entityId: string; entityName?: string; score: number }>;
        resolvedEntityId?: string;
        confidence: number;
    };

    /** Knowledge Graph Exploitation (Expansion Item #11) — graph expansion metadata */
    graphExpansion?: AnswerlatticeGraphExpansionResult;
}

export interface RetrievalContext {
    tId: number;
    sId: number;
    currentVersion?: number;
    planId?: string;
    roleId?: string;
    stateId?: string;
    context?: AnswerlatticeContextPayload;
    preloadedSearchIndex?: AnswerlatticeEntitySearchIndex[];
    preloadedLatestRelease?: AnswerlatticeRelease | null;
    /** Request-local cache used by bounded answer-test runs to avoid repeated entity-answer queries. */
    activeAnswerCache?: Map<string, AnswerlatticeCanonicalAnswer[]>;
}

export const getAnswerlatticeCanonicalAnswerCacheKey = (
    tId: number,
    sId: number,
    entityId: string,
) => `${Number(tId)}:${Number(sId)}:${entityId}`;

export type CanonicalScopeDimension = 'plan' | 'role' | 'state';

export interface CanonicalScopeMatch {
    applicable: boolean;
    missingContext: CanonicalScopeDimension[];
    mismatchedContext: CanonicalScopeDimension[];
}

export const CANONICAL_GOVERNED_FALLBACK_MESSAGES = {
    canonical_retrieval_unavailable: 'Confirmed support answers are temporarily unavailable. Please open the relevant help page or contact support instead of relying on an unverified answer.',
    canonical_answer_review_required: 'This answer is being reviewed after a product change. Open the relevant help page or contact support for a confirmed answer.',
    canonical_scope_context_required: 'A confirmed answer needs product context that is not available in this support session. Open the relevant help page or contact support.',
    canonical_scope_not_covered: 'A confirmed answer is not available for your current plan, role, or product state. Open the relevant help page or contact support.',
} as const;

export type CanonicalGovernedFallbackReason = keyof typeof CANONICAL_GOVERNED_FALLBACK_MESSAGES;

export const isCanonicalGovernedFallbackReason = (
    reason?: string,
): reason is CanonicalGovernedFallbackReason => Boolean(
    reason && Object.prototype.hasOwnProperty.call(CANONICAL_GOVERNED_FALLBACK_MESSAGES, reason),
);

const normalizeScopeValue = (value: unknown): string => String(value || '').trim().toLowerCase();

const normalizeScopeIds = (values: unknown): string[] => (
    Array.isArray(values)
        ? Array.from(new Set(values.map(normalizeScopeValue).filter(Boolean)))
        : []
);

/**
 * Canonical scope is an eligibility filter, not a relevance bonus. A restricted
 * dimension fails closed when its matching runtime context is absent or differs.
 */
export function evaluateCanonicalAnswerScope(
    answer: Partial<AnswerlatticeCanonicalAnswer>,
    context: Partial<RetrievalContext>,
): CanonicalScopeMatch {
    const effectiveValues: Record<CanonicalScopeDimension, string> = {
        plan: normalizeScopeValue(context.planId || context.context?.plan),
        role: normalizeScopeValue(context.roleId || context.context?.userRole),
        state: normalizeScopeValue(context.stateId || context.context?.state),
    };
    const restrictions: Record<CanonicalScopeDimension, string[]> = {
        plan: normalizeScopeIds(answer.scope?.planIds),
        role: normalizeScopeIds(answer.scope?.roleIds),
        state: normalizeScopeIds(answer.scope?.stateIds),
    };
    const missingContext: CanonicalScopeDimension[] = [];
    const mismatchedContext: CanonicalScopeDimension[] = [];

    (Object.keys(restrictions) as CanonicalScopeDimension[]).forEach((dimension) => {
        const allowed = restrictions[dimension];
        if (allowed.length === 0) return;
        const actual = effectiveValues[dimension];
        if (!actual) {
            missingContext.push(dimension);
        } else if (!allowed.includes(actual)) {
            mismatchedContext.push(dimension);
        }
    });

    return {
        applicable: missingContext.length === 0 && mismatchedContext.length === 0,
        missingContext,
        mismatchedContext,
    };
}

const getAnswerlatticeAdminDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
};

const getEntitySearchIndexServer = async (tId: number, sId: number): Promise<AnswerlatticeEntitySearchIndex[]> => {
    const snapshot = await getAnswerlatticeAdminDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(501)
        .get();

    if (snapshot.size > 500) {
        throw new Error('Answerlattice entity search index exceeds the supported retrieval boundary.');
    }

    return snapshot.docs.map((doc) => parseAnswerlatticeRetrievalSearchIndex(
        { ...doc.data(), id: doc.id },
        { tId, sId },
    ));
};

const getActiveAnswersForEntitiesServer = async (
    tId: number,
    sId: number,
    entityIds: string[],
): Promise<AnswerlatticeCanonicalAnswer[]> => {
    const normalizedEntityIds = Array.from(new Set(entityIds.map(normalizeAnswerlatticeResolvedEntityId).filter((id): id is string => Boolean(id))))
        .slice(0, 10);
    if (normalizedEntityIds.length === 0) return [];
    const snapshot = await getAnswerlatticeAdminDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('scope.entityIds', 'array-contains-any', normalizedEntityIds)
        .where('status', '==', 'active')
        .limit(101)
        .get();

    if (snapshot.size > 100) {
        throw new Error('Answerlattice canonical answer lookup exceeds the supported retrieval boundary.');
    }

    return snapshot.docs.map((doc) => parseAnswerlatticeRetrievalCanonicalAnswer(
        { ...doc.data(), id: doc.id },
        { tId, sId },
    ));
};

const getLatestReleaseServer = async (tId: number, sId: number): Promise<AnswerlatticeRelease | null> => {
    const snapshot = await getAnswerlatticeAdminDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .orderBy('versionNormalized', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return parseAnswerlatticeRetrievalRelease({ ...doc.data(), id: doc.id }, { tId, sId });
};

const getEntityByIdServer = async (entityId: string, tId: number, sId: number): Promise<AnswerlatticeEntity | null> => {
    const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);
    if (!normalizedEntityId) return null;

    const doc = await getAnswerlatticeAdminDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .doc(normalizedEntityId)
        .get();

    if (!doc.exists) return null;
    try {
        return parseAnswerlatticeRetrievalEntity({ ...doc.data(), id: doc.id }, { tId, sId });
    } catch {
        return null;
    }
};

const getApplicableVersionWindow = (answer: Partial<AnswerlatticeCanonicalAnswer>): { from: number; to: number | null } | null => {
    const rawWindow = answer.productBinding?.applicableVersions;
    const from = Number(rawWindow?.from);
    const rawTo = rawWindow?.to as unknown;
    const to = rawTo === null || rawTo === undefined || rawTo === '' ? null : Number(rawTo);
    if (!Number.isFinite(from) || from <= 0) return null;
    if (to !== null && (!Number.isFinite(to) || to < from)) return null;
    return { from, to };
};

const hasCanonicalAnswerRetrievalShape = (answer: Partial<AnswerlatticeCanonicalAnswer>): answer is AnswerlatticeCanonicalAnswer => {
    const entityIds = answer.scope?.entityIds;
    const structuredSummary = answer.content?.structuredSummary;
    return Boolean(answer.id)
        && answer.status === 'active'
        && Array.isArray(entityIds)
        && entityIds.length > 0
        && Boolean(getApplicableVersionWindow(answer))
        && typeof structuredSummary === 'string'
        && structuredSummary.trim().length > 0;
};

const isRetrievableCanonicalAnswer = (answer: Partial<AnswerlatticeCanonicalAnswer>): answer is AnswerlatticeCanonicalAnswer => (
    hasCanonicalAnswerRetrievalShape(answer)
    && answer.governance?.driftFlag !== true
    && answer.governance?.reviewRequired !== true
);

const canonicalAnswerBelongsToRetrievalScope = (
    answer: Partial<AnswerlatticeCanonicalAnswer>,
    context: RetrievalContext,
): boolean => {
    const productId = answer.pId;
    return normalizeAnswerlatticeScopeDocumentId(answer.tId) === normalizeAnswerlatticeScopeDocumentId(context.tId)
        && normalizeAnswerlatticeScopeDocumentId(answer.sId) === normalizeAnswerlatticeScopeDocumentId(context.sId)
        && productId === PRODUCT_IDS.ANSWERLATTICE;
};

const getAnswerConfidenceScore = (answer: Partial<AnswerlatticeCanonicalAnswer>): number => {
    const score = Number(answer.validation?.confidenceScore ?? 0);
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(score, 1));
};

// ═══════════════════════════════════════════════════════════════
// LAYER 1 — DETERMINISTIC ENTITY INDEX LOOKUP
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize and tokenize a query for deterministic entity matching.
 * No LLM involved. Fast O(n) where n = tokens in query.
 * 
 * IMPORTANT: Uses shared answerlatticeTokenize() to ensure identical normalization
 * at query-time and index-time. See tokenizer.ts for contract.
 */
function tokenizeQuery(queryText: string): string[] {
    return answerlatticeTokenize(queryText);
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
    searchIndex: AnswerlatticeEntitySearchIndex[],
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
            const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);
            if (!entityId) continue;
            const current = entityScores.get(entityId) || 0;
            entityScores.set(entityId, current + matchScore);
        }
    }

    // Context-aware boost application with Guardrail 2 (query dominance)
    if (contextBoosts && contextBoosts.size > 0) {
        Array.from(contextBoosts.entries()).forEach(([rawEntityId, rawBoost]) => {
            const entityId = normalizeAnswerlatticeResolvedEntityId(rawEntityId);
            if (!entityId) return;
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
 * @see __docs__/answerlattice/context-aware-support/context-aware-support_impl.md §4.8
 */
function applyContextBoosts(
    context: AnswerlatticeContextPayload | undefined,
    searchIndex: AnswerlatticeEntitySearchIndex[]
): Map<string, number> {
    const boosts = new Map<string, number>();
    if (!context) return boosts;

    // Guardrail 1: Use exact normalizedTokens match for context boosts
    const boostFromString = (value: string | undefined, weight: number) => {
        if (!value) return;
        const tokens = answerlatticeTokenize(value);
        for (const entry of searchIndex) {
            let matched = false;
            for (const token of tokens) {
                // Exact match against normalizedTokens (not substring)
                if (entry.normalizedTokens.includes(token)) {
                    matched = true;
                    break;
                }
                // Also check exact match on lowercased canonical name tokens
                const nameTokens = answerlatticeTokenize(entry.canonicalName);
                if (nameTokens.includes(token)) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);
                if (!entityId) continue;
                const current = boosts.get(entityId) || 0;
                // Guardrail 3: Cap total boost per entity
                boosts.set(entityId, Math.min(current + weight, MAX_CONTEXT_BOOST));
            }
        }
    };

    // Apply entityHints (highest weight — explicit developer signal)
    if (context.entityHints) {
        for (const hint of context.entityHints) {
            boostFromString(hint, CONTEXT_WEIGHTS.entityHint);
        }
    }

    // Product Surface Contexts: trusted server-resolved entity IDs. External
    // client payloads cannot set this field because context validation strips
    // unknown fields before coreSearch().
    if (Array.isArray(context.surfaceEntityIds)) {
        for (const rawEntityId of context.surfaceEntityIds.slice(0, 10)) {
            const entityId = normalizeAnswerlatticeResolvedEntityId(rawEntityId);
            if (!entityId) continue;
            const current = boosts.get(entityId) || 0;
            boosts.set(entityId, Math.min(current + MAX_CONTEXT_BOOST, MAX_CONTEXT_BOOST));
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
    answers: AnswerlatticeCanonicalAnswer[],
    context: RetrievalContext,
    graphExpansionEntities?: string[]
): AnswerlatticeCanonicalAnswer[] {
    return answers
        .map(answer => {
            let score = 0;

            // Version window match (highest weight)
            if (context.currentVersion) {
                const versionWindow = getApplicableVersionWindow(answer);
                if (!versionWindow) return { answer, score: Number.NEGATIVE_INFINITY };
                const { from, to } = versionWindow;
                if (context.currentVersion >= from && (!to || context.currentVersion <= to)) {
                    score += 100;
                }
            }

            // Scope depth ranks answers only after strict scope eligibility.
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
            if (answer.validation?.lastValidatedOn && typeof answer.validation.lastValidatedOn.toMillis === 'function') {
                const daysSinceValidation = (Date.now() - answer.validation.lastValidatedOn.toMillis()) / (1000 * 60 * 60 * 24);
                score += Math.max(0, 10 - daysSinceValidation / 30); // Decay over months
            }

            // Confidence score
            score += getAnswerConfidenceScore(answer) * 5;

            // Knowledge Graph: multi-entity coverage boost (Item #11)
            // Answers spanning more expanded entities are inherently more relevant
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH && graphExpansionEntities) {
                const entityOverlap = answer.scope.entityIds.filter(
                    (id: string) => graphExpansionEntities!.includes(id)
                ).length;
                score += entityOverlap * 15;
            }

            // Guided Workflows: procedure affinity for how_to intent
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && answer.answerType === 'procedure') {
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
 * Feature-flagged via ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS.
 */
export async function attemptCanonicalRetrieval(
    query: string,
    context: RetrievalContext
): Promise<CanonicalRetrievalResult> {
    // Feature flag check
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS) {
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
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE && context.context) {
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
        // Feature-flagged: ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH
        // ═══════════════════════════════════════════════════════════════
        let graphExpansion: AnswerlatticeGraphExpansionResult | undefined;
        let graphIndexForSuggestions: AnswerlatticeEntityGraphIndex | undefined;
        let effectiveEntityIds = matchedEntities.slice(0, 3).map(m => m.entityId);

        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH && matchedEntities.length > 0) {
            try {
                const { runGraphExploitation } = await import('@lib/answerlattice/graphTraversal');
                const graphResult = await runGraphExploitation(
                    context.tId, context.sId,
                    matchedEntities,
                    undefined // bestAnswer not known yet — suggestions built post-answer
                );
                if (graphResult) {
                    effectiveEntityIds = graphResult.expandedEntityIds.slice(0, 5);
                    graphExpansion = graphResult.graphExpansion;
                    graphIndexForSuggestions = graphResult.graphIndex;
                }
            } catch {
                // Graceful degradation — graph failure never blocks retrieval
            }
        }

        // Fetch canonical answers for top matched entities (parallel for latency)
        const topEntityIds = effectiveEntityIds;
        const answerResults: AnswerlatticeCanonicalAnswer[][] = [];
        const uncachedEntityIds: string[] = [];
        topEntityIds.forEach((entityId) => {
            const cacheKey = getAnswerlatticeCanonicalAnswerCacheKey(context.tId, context.sId, entityId);
            const cached = context.activeAnswerCache?.get(cacheKey);
            if (cached) {
                answerResults.push(cached);
            } else {
                uncachedEntityIds.push(entityId);
            }
        });
        if (uncachedEntityIds.length > 0) {
            const fetchedAnswers = await getActiveAnswersForEntitiesServer(
                context.tId,
                context.sId,
                uncachedEntityIds,
            );
            uncachedEntityIds.forEach((entityId) => {
                const answersForEntity = fetchedAnswers.filter(answer => answer.scope?.entityIds?.includes(entityId));
                context.activeAnswerCache?.set(
                    getAnswerlatticeCanonicalAnswerCacheKey(context.tId, context.sId, entityId),
                    answersForEntity,
                );
                answerResults.push(answersForEntity);
            });
        }
        const allAnswersById = new Map<string, AnswerlatticeCanonicalAnswer>();
        for (const answers of answerResults) {
            for (const answer of answers || []) {
                if (answer?.id && canonicalAnswerBelongsToRetrievalScope(answer, context)) {
                    allAnswersById.set(answer.id, answer);
                }
            }
        }
        const allAnswers = Array.from(allAnswersById.values()).filter(hasCanonicalAnswerRetrievalShape);

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
                const versionWindow = getApplicableVersionWindow(a);
                if (!versionWindow) return false;
                const { from, to } = versionWindow;
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

        const scopeEvaluations = versionFiltered.map(answer => ({
            answer,
            match: evaluateCanonicalAnswerScope(answer, { ...context, currentVersion }),
        }));
        const scopeMatchedAnswers = scopeEvaluations
            .filter(item => item.match.applicable)
            .map(item => item.answer);

        if (scopeMatchedAnswers.length === 0) {
            const requiredContext = Array.from(new Set(
                scopeEvaluations.flatMap(item => item.match.missingContext),
            ));
            const missingContext = requiredContext.length > 0;
            return {
                found: false,
                canonical: false,
                matchedEntityIds: topEntityIds,
                confidence: 'low',
                fallbackReason: missingContext
                    ? 'canonical_scope_context_required'
                    : 'canonical_scope_not_covered',
                ...(missingContext ? {
                    clarification: {
                        type: 'scope_context' as const,
                        requiredContext,
                    },
                } : {}),
                entityDebug: buildEntityDebug(),
            };
        }

        // Direct entity matches outrank graph-neighbour answers. A drifted direct
        // answer cannot be bypassed by a weaker clean answer from graph expansion.
        const directlyMatchedEntityIds = new Set(matchedEntities.slice(0, 3).map(item => item.entityId));
        const directlyMatchedAnswers = scopeMatchedAnswers.filter(answer => (
            answer.scope.entityIds.some(entityId => directlyMatchedEntityIds.has(entityId))
        ));
        const governanceRelevantAnswers = directlyMatchedAnswers.length > 0
            ? directlyMatchedAnswers
            : scopeMatchedAnswers;
        const governanceReviewRequired = governanceRelevantAnswers.some(answer => (
            answer.governance?.driftFlag === true
            || answer.governance?.reviewRequired === true
        ));
        if (governanceReviewRequired) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: topEntityIds,
                confidence: 'low',
                fallbackReason: 'canonical_answer_review_required',
                entityDebug: buildEntityDebug(),
            };
        }

        const retrievableAnswers = scopeMatchedAnswers.filter(isRetrievableCanonicalAnswer);
        const directlyRetrievableAnswers = retrievableAnswers.filter(answer => (
            answer.scope.entityIds.some(entityId => directlyMatchedEntityIds.has(entityId))
        ));
        const rankableAnswers = directlyRetrievableAnswers.length > 0
            ? directlyRetrievableAnswers
            : retrievableAnswers;

        if (rankableAnswers.length === 0) {
            return {
                found: false,
                canonical: false,
                matchedEntityIds: topEntityIds,
                confidence: 'low',
                fallbackReason: 'no_canonical_answers_for_entities',
                entityDebug: buildEntityDebug(),
            };
        }

        // Specificity scoring (with graph expansion entities for multi-entity boost)
        const ranked = scoreBySpecificity(rankableAnswers, {
            ...context,
            currentVersion,
        }, graphExpansion?.expandedEntities);

        const bestAnswer = ranked[0];

        // Determine confidence based on entity match score and answer quality
        const topEntityScore = matchedEntities[0].score;
        const validationConfidence = getAnswerConfidenceScore(bestAnswer);
        let confidence: CanonicalRetrievalResult['confidence'] = 'high';
        if (validationConfidence < 0.5) confidence = 'low';
        else if (topEntityScore < 3 || validationConfidence < 0.8) confidence = 'medium';

        // Knowledge Graph: rebuild suggestions now that we have bestAnswer
        if (graphExpansion && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) {
            try {
                const { buildRelatedSuggestions } = await import('@lib/answerlattice/graphTraversal');
                if (graphIndexForSuggestions) {
                    const suggestions = buildRelatedSuggestions(
                        graphExpansion.expandedEntities,
                        graphIndexForSuggestions,
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
            citations: normalizeAnswerlatticePublicCitations(bestAnswer.evidence?.citations),
            evidenceReferenceIds: Array.from(new Set([
                ...(bestAnswer.evidence?.sourceIds || []),
                ...(bestAnswer.evidence?.citations || []).map(citation => citation.id),
            ])).slice(0, 20),
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
            fallbackReason: 'canonical_retrieval_unavailable',
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
