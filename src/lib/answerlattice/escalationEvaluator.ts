/**
 * Answerlattice — AI Failure Escalation Evaluator
 * 
 * Pure function that evaluates whether a search result should trigger escalation.
 * Called at the END of coreSearch() pipeline (after answer generation).
 * 
 * 4 Escalation Signals:
 * S1 — Insufficient answer evidence (no canonical answer and no usable final-answer evidence)
 * S2 — Entity resolution failure (no entity match + no useful final-answer evidence)
 * S3 — Explicit user request (handled by a separate server-authoritative handoff)
 * S4 — RAG low similarity (best cited result < threshold)
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_AI_ESCALATION
 * Non-blocking: errors return NO_ESCALATION
 * 
 * @see __docs__/answerlattice/ai-failure-escalation/
 */

import type { CanonicalRetrievalResult } from '@lib/answerlattice/canonicalRetrieval';
import type { AnswerlatticeContextPayload } from '@type/answerlattice';
import {
    EscalationContext,
    EscalationMetadata,
    EscalationTriggerType,
    EscalationType,
    NO_ESCALATION,
    RAG_LOW_SIMILARITY_THRESHOLD,
    parseAnswerlatticeEscalationContext,
} from './escalationTypes';

const ESCALATION_QUERY_MAX_CHARS = 500;
const ESCALATION_CONTEXT_VALUE_MAX_CHARS = 180;
const ESCALATION_DOCUMENT_ID_MAX_CHARS = 180;
const ESCALATION_DOCUMENT_TITLE_MAX_CHARS = 240;
const ESCALATION_RAG_DOCUMENT_LIMIT = 5;
const ESCALATION_RAG_INPUT_LIMIT = 50;
const ESCALATION_ENTITY_ID_LIMIT = 20;
const ESCALATION_ENTITY_ID_INPUT_LIMIT = 100;
const ESCALATION_ENTITY_TOKEN_LIMIT = 20;
const ESCALATION_ENTITY_CANDIDATE_LIMIT = 3;
const CANONICAL_CONFIDENCE_VALUES = new Set(['high', 'medium', 'low', 'none']);

// ═══════════════════════════════════════════════════════════════
// EVALUATOR INPUT
// ═══════════════════════════════════════════════════════════════

export interface EscalationEvaluatorInput {
    /** Canonical retrieval result from Stage 4 */
    canonicalResult: CanonicalRetrievalResult;

    /** Top RAG documents from Stage 5 (ID + title + score only) */
    ragDocuments: Array<{ id: string; title: string; similarityScore: number }>;

    /** The user's search query */
    searchQuery: string;

    /** Product context at time of query */
    productContext?: AnswerlatticeContextPayload;

    /** The effective query used for embedding (may differ if image was processed) */
    effectiveQuery?: string;

    /** Whether the final answer was empty/generic */
    answerWasEmpty?: boolean;
}

type NormalizedEscalationInput = Omit<EscalationEvaluatorInput, 'canonicalResult' | 'ragDocuments' | 'searchQuery' | 'effectiveQuery'> & {
    canonicalResult: CanonicalRetrievalResult;
    ragDocuments: Array<{ id: string; title: string; similarityScore: number }>;
    searchQuery: string;
    effectiveQuery?: string;
};

const cleanText = (value: unknown, maxChars: number): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, maxChars) : undefined;
};

const normalizeEscalationInput = (input: EscalationEvaluatorInput): NormalizedEscalationInput | null => {
    if (
        !input
        || typeof input !== 'object'
        || !input.canonicalResult
        || typeof input.canonicalResult.found !== 'boolean'
        || !CANONICAL_CONFIDENCE_VALUES.has(input.canonicalResult.confidence)
        || !Array.isArray(input.canonicalResult.matchedEntityIds)
        || !Array.isArray(input.ragDocuments)
        || input.ragDocuments.length > ESCALATION_RAG_INPUT_LIMIT
        || input.canonicalResult.matchedEntityIds.length > ESCALATION_ENTITY_ID_INPUT_LIMIT
    ) {
        return null;
    }

    const searchQuery = cleanText(input.searchQuery, ESCALATION_QUERY_MAX_CHARS);
    if (!searchQuery) return null;

    const ragDocuments: NormalizedEscalationInput['ragDocuments'] = [];
    for (const document of input.ragDocuments) {
        const id = cleanText(document?.id, ESCALATION_DOCUMENT_ID_MAX_CHARS);
        const title = cleanText(document?.title, ESCALATION_DOCUMENT_TITLE_MAX_CHARS);
        const similarityScore = Number(document?.similarityScore);
        if (!id || !Number.isFinite(similarityScore) || similarityScore < 0 || similarityScore > 1) {
            return null;
        }
        ragDocuments.push({
            id,
            title: title || 'Untitled',
            similarityScore,
        });
    }
    ragDocuments.sort((left, right) => right.similarityScore - left.similarityScore);
    ragDocuments.splice(ESCALATION_RAG_DOCUMENT_LIMIT);

    const matchedEntityIds = Array.from(new Set(
        input.canonicalResult.matchedEntityIds
            .map((entityId) => cleanText(entityId, ESCALATION_DOCUMENT_ID_MAX_CHARS))
            .filter((entityId): entityId is string => Boolean(entityId)),
    )).slice(0, ESCALATION_ENTITY_ID_LIMIT);

    return {
        ...input,
        searchQuery,
        effectiveQuery: cleanText(input.effectiveQuery, ESCALATION_QUERY_MAX_CHARS),
        ragDocuments,
        canonicalResult: {
            ...input.canonicalResult,
            matchedEntityIds,
            fallbackReason: cleanText(
                input.canonicalResult.fallbackReason,
                ESCALATION_CONTEXT_VALUE_MAX_CHARS,
            ),
        },
        answerWasEmpty: input.answerWasEmpty === true,
    };
};

// ═══════════════════════════════════════════════════════════════
// MAIN EVALUATOR (Pure Function)
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate whether a search result should trigger escalation.
 * 
 * Returns EscalationMetadata to be included in CoreSearchResult.
 * All logic is deterministic and rule-based (no LLM).
 * Zero Firestore reads — uses only data already fetched by pipeline.
 */
export function evaluateEscalation(input: EscalationEvaluatorInput): EscalationMetadata {
    try {
        const normalizedInput = normalizeEscalationInput(input);
        if (!normalizedInput) return NO_ESCALATION;

        const triggers: EscalationTriggerType[] = [];

        const bestRagSimilarity = normalizedInput.ragDocuments[0]?.similarityScore;
        const hasUsableFinalAnswerEvidence = (
            normalizedInput.answerWasEmpty !== true
            && typeof bestRagSimilarity === 'number'
            && bestRagSimilarity >= RAG_LOW_SIMILARITY_THRESHOLD
        );

        // ── S1: Insufficient Answer Evidence ──
        // A canonical miss alone is not a failure when the final answer used strong RAG evidence.
        if (!normalizedInput.canonicalResult.found && !hasUsableFinalAnswerEvidence) {
            triggers.push('insufficient_answer_evidence');
        }

        // ── S2: Entity Resolution Failure ──
        if (
            !normalizedInput.canonicalResult.found
            && normalizedInput.canonicalResult.matchedEntityIds.length === 0
        ) {
            if (!hasUsableFinalAnswerEvidence) {
                // No entity match and no useful final-answer evidence.
                triggers.push('entity_resolution_failure');
            }
        }

        // ── S3: Explicit User Request ──
        // Handled by a separate server-authoritative handoff, not this evaluator.
        // Not evaluated here.

        // ── S4: RAG Low Similarity ──
        if (
            !normalizedInput.canonicalResult.found &&
            normalizedInput.ragDocuments.length > 0 &&
            bestRagSimilarity !== undefined &&
            bestRagSimilarity < RAG_LOW_SIMILARITY_THRESHOLD
        ) {
            triggers.push('rag_low_similarity');
        }

        // No triggers → no escalation
        if (triggers.length === 0) {
            return NO_ESCALATION;
        }

        // ── Determine escalation type (highest urgency wins) ──
        const escalationType = resolveEscalationType(normalizedInput);

        // ── Build escalation context ──
        const escalationContext = parseAnswerlatticeEscalationContext(
            buildEscalationContext(normalizedInput, triggers),
        );
        if (!escalationContext) return NO_ESCALATION;

        return {
            escalationSuggested: true,
            escalationType,
            triggerTypes: triggers,
            escalationContext,
        };
    } catch {
        // Graceful degradation — escalation failure never blocks search
        return NO_ESCALATION;
    }
}

// ═══════════════════════════════════════════════════════════════
// ESCALATION TYPE RESOLUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve escalation type from triggers.
 * HARD > SOFT > NONE
 * Priority: empty/refusal outcomes > weak-evidence suggestions
 */
function resolveEscalationType(
    input: NormalizedEscalationInput
): EscalationType {
    if (input.answerWasEmpty || input.ragDocuments.length === 0) {
        return 'hard';
    }

    // Everything else → SOFT
    return 'soft';
}

// ═══════════════════════════════════════════════════════════════
// ESCALATION CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build the escalation context that will be attached to the ticket.
 * Uses only data already available — zero additional Firestore reads.
 */
function buildEscalationContext(
    input: NormalizedEscalationInput,
    triggers: EscalationTriggerType[]
): EscalationContext {
    const cleanContextValue = (value: unknown) => cleanText(value, ESCALATION_CONTEXT_VALUE_MAX_CHARS);
    const productContext = input.productContext ? {
        contextKey: cleanContextValue(input.productContext.contextKey),
        page: cleanContextValue(input.productContext.page),
        feature: cleanContextValue(input.productContext.feature),
        workflow: cleanContextValue(input.productContext.workflow),
        plan: cleanContextValue(input.productContext.plan),
        userRole: cleanContextValue(input.productContext.userRole),
    } : undefined;
    const entityDebug = input.canonicalResult.entityDebug;
    const candidates = entityDebug?.candidates
        .slice(0, ESCALATION_ENTITY_CANDIDATE_LIMIT)
        .flatMap((candidate) => {
            const entityId = cleanText(candidate.entityId, ESCALATION_DOCUMENT_ID_MAX_CHARS);
            const score = Number(candidate.score);
            if (!entityId || !Number.isFinite(score)) return [];
            return [{
                entityId,
                entityName: cleanText(candidate.entityName, ESCALATION_CONTEXT_VALUE_MAX_CHARS),
                score: Math.round(score * 1000) / 1000,
            }];
        });

    return {
        triggerTypes: triggers,
        query: input.searchQuery,
        ...(productContext ? { productContext } : {}),
        retrievalDebug: {
            canonicalResult: {
                found: input.canonicalResult.found,
                confidence: input.canonicalResult.confidence,
                fallbackReason: input.canonicalResult.fallbackReason,
                matchedEntityIds: input.canonicalResult.matchedEntityIds,
            },
            ragResults: input.ragDocuments.map(d => ({
                docId: d.id,
                title: d.title,
                similarityScore: Math.round(d.similarityScore * 1000) / 1000,
            })),
            effectiveQuery: input.effectiveQuery,
        },
        ...(entityDebug ? {
            entityDebug: {
                queryTokens: Array.from(new Set(
                    entityDebug.queryTokens
                        .slice(0, ESCALATION_ENTITY_TOKEN_LIMIT)
                        .map((token) => cleanText(token, ESCALATION_CONTEXT_VALUE_MAX_CHARS))
                        .filter((token): token is string => Boolean(token)),
                )).slice(0, ESCALATION_ENTITY_TOKEN_LIMIT),
                candidates: candidates || [],
                resolvedEntityId: cleanText(
                    entityDebug.resolvedEntityId,
                    ESCALATION_DOCUMENT_ID_MAX_CHARS,
                ),
                confidence: Number.isFinite(Number(entityDebug.confidence))
                    ? Math.max(0, Math.min(1, Number(entityDebug.confidence)))
                    : 0,
            },
        } : {}),
        escalatedAt: new Date().toISOString(),
    };
}
