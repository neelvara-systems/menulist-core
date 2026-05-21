/**
 * Canonica — AI Failure Escalation Evaluator
 * 
 * Pure function that evaluates whether a search result should trigger escalation.
 * Called at the END of coreSearch() pipeline (after answer generation).
 * 
 * 5 Escalation Signals:
 * S1 — Low canonical confidence (canonical miss or confidence='low')
 * S2 — Entity resolution failure (no entity match + no/poor RAG)
 * S3 — Repeated failure (2+ low-confidence answers in session)
 * S4 — Explicit user request (handled in frontend, not here)
 * S5 — RAG low similarity (best vector result < threshold)
 * 
 * Feature-flagged: ENABLE_CANONICA_AI_ESCALATION
 * Non-blocking: errors return NO_ESCALATION
 * 
 * @see __docs__/canonica/ai-failure-escalation/
 */

import type { CanonicalRetrievalResult } from '@lib/canonica/canonicalRetrieval';
import type { CanonicaContextPayload } from '@type/canonica';
import {
    EscalationContext,
    EscalationMetadata,
    EscalationTriggerType,
    EscalationType,
    NO_ESCALATION,
    RAG_LOW_SIMILARITY_THRESHOLD,
    REPEATED_FAILURE_THRESHOLD,
} from './escalationTypes';

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

    /** Number of previous low-confidence results in this chat session */
    sessionFailureCount?: number;

    /** Product context at time of query */
    productContext?: CanonicaContextPayload;

    /** The effective query used for embedding (may differ if image was processed) */
    effectiveQuery?: string;

    /** Whether the final answer was empty/generic */
    answerWasEmpty?: boolean;
}

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
        const triggers: EscalationTriggerType[] = [];

        // ── S1: Low Canonical Confidence ──
        if (
            !input.canonicalResult.found &&
            (input.canonicalResult.confidence === 'low' || input.canonicalResult.confidence === 'none') &&
            input.canonicalResult.fallbackReason
        ) {
            triggers.push('low_canonical_confidence');
        }

        // ── S2: Entity Resolution Failure ──
        if (input.canonicalResult.matchedEntityIds.length === 0) {
            if (input.ragDocuments.length === 0 || input.answerWasEmpty) {
                // No entity match AND no RAG results → hard escalation candidate
                triggers.push('entity_resolution_failure');
            } else if (input.ragDocuments.length > 0 && input.ragDocuments[0].similarityScore < RAG_LOW_SIMILARITY_THRESHOLD) {
                // No entity match AND weak RAG → soft escalation
                triggers.push('entity_resolution_failure');
            }
        }

        // ── S3: Repeated Failure ──
        if (
            input.sessionFailureCount !== undefined &&
            input.sessionFailureCount >= REPEATED_FAILURE_THRESHOLD
        ) {
            triggers.push('repeated_failure');
        }

        // ── S4: Explicit User Request ──
        // Handled in frontend (useChatHandlers.ts) BEFORE calling coreSearch.
        // Not evaluated here.

        // ── S5: RAG Low Similarity ──
        if (
            !input.canonicalResult.found &&
            input.ragDocuments.length > 0 &&
            input.ragDocuments[0].similarityScore < RAG_LOW_SIMILARITY_THRESHOLD
        ) {
            triggers.push('rag_low_similarity');
        }

        // No triggers → no escalation
        if (triggers.length === 0) {
            return NO_ESCALATION;
        }

        // ── Determine escalation type (highest urgency wins) ──
        const escalationType = resolveEscalationType(triggers, input);

        // ── Build escalation context ──
        const escalationContext = buildEscalationContext(input, triggers);

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
 * Priority: S3 (repeated) > S2 (entity fail + no RAG) > S1/S5 (soft)
 */
function resolveEscalationType(
    triggers: EscalationTriggerType[],
    input: EscalationEvaluatorInput
): EscalationType {
    // S3: Repeated failure → always HARD
    if (triggers.includes('repeated_failure')) {
        return 'hard';
    }

    // S2: Entity failure with no useful RAG → HARD
    if (
        triggers.includes('entity_resolution_failure') &&
        (input.ragDocuments.length === 0 || input.answerWasEmpty)
    ) {
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
    input: EscalationEvaluatorInput,
    triggers: EscalationTriggerType[]
): EscalationContext {
    return {
        triggerTypes: triggers,
        query: input.searchQuery,
        productContext: input.productContext ? {
            contextKey: input.productContext.contextKey,
            page: input.productContext.page,
            feature: input.productContext.feature,
            workflow: input.productContext.workflow,
            plan: input.productContext.plan,
            userRole: input.productContext.userRole,
        } : undefined,
        retrievalDebug: {
            canonicalResult: {
                found: input.canonicalResult.found,
                confidence: input.canonicalResult.confidence,
                fallbackReason: input.canonicalResult.fallbackReason,
                matchedEntityIds: input.canonicalResult.matchedEntityIds,
            },
            ragResults: input.ragDocuments.slice(0, 5).map(d => ({
                docId: d.id,
                title: d.title || 'Untitled',
                similarityScore: Math.round(d.similarityScore * 1000) / 1000,
            })),
            effectiveQuery: input.effectiveQuery,
        },
        entityDebug: input.canonicalResult.entityDebug ? {
            queryTokens: input.canonicalResult.entityDebug.queryTokens,
            candidates: input.canonicalResult.entityDebug.candidates.slice(0, 3),
            resolvedEntityId: input.canonicalResult.entityDebug.resolvedEntityId,
            confidence: input.canonicalResult.entityDebug.confidence,
        } : undefined,
        escalatedAt: new Date().toISOString(),
    };
}
