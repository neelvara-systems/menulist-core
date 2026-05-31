/**
 * Answerlattice — AI Failure Escalation Types
 * 
 * Type definitions for the escalation detection and context capture system.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_AI_ESCALATION
 * @see __docs__/answerlattice/ai-failure-escalation/
 */

// ═══════════════════════════════════════════════════════════════
// ESCALATION TRIGGER TYPES
// ═══════════════════════════════════════════════════════════════

export type EscalationTriggerType =
    | 'low_canonical_confidence'   // S1: canonical miss or confidence='low'
    | 'entity_resolution_failure'  // S2: no entity match
    | 'repeated_failure'           // S3: 2+ failures in session
    | 'explicit_user_request'      // S4: user typed escalation intent
    | 'rag_low_similarity';        // S5: best vector result < 0.5

export type EscalationType = 'soft' | 'hard' | 'none';

// ═══════════════════════════════════════════════════════════════
// ESCALATION METADATA (returned in CoreSearchResult)
// ═══════════════════════════════════════════════════════════════

export interface EscalationMetadata {
    /** Whether escalation should be suggested to the user */
    escalationSuggested: boolean;

    /** Escalation urgency level */
    escalationType: EscalationType;

    /** Which signal(s) triggered the escalation */
    triggerTypes: EscalationTriggerType[];

    /** Pre-built debug context for ticket creation (only populated when escalationSuggested=true) */
    escalationContext?: EscalationContext;
}

// ═══════════════════════════════════════════════════════════════
// ESCALATION CONTEXT (attached to ticket)
// ═══════════════════════════════════════════════════════════════

export interface EscalationContext {
    /** Which signal(s) triggered escalation */
    triggerTypes: EscalationTriggerType[];

    /** The exact query that failed */
    query: string;

    /** Reference to the chat session (not a copy — just the ID) */
    conversationId?: string;

    /** Product context at time of failure */
    productContext?: {
        contextKey?: string;
        page?: string;
        feature?: string;
        workflow?: string;
        plan?: string;
        userRole?: string;
    };

    /** Retrieval debug — what AI searched and found */
    retrievalDebug?: RetrievalDebugInfo;

    /** Entity resolution debug — how resolver interpreted the query */
    entityDebug?: EntityDebugInfo;

    /** Timestamp of the escalation */
    escalatedAt: string; // ISO string
}

// ═══════════════════════════════════════════════════════════════
// RETRIEVAL DEBUG INFO
// ═══════════════════════════════════════════════════════════════

export interface RetrievalDebugInfo {
    /** Canonical retrieval result */
    canonicalResult: {
        found: boolean;
        confidence: 'high' | 'medium' | 'low' | 'none';
        fallbackReason?: string;
        matchedEntityIds: string[];
    };
    /** Top-5 RAG results (doc ID + similarity score only) */
    ragResults?: Array<{
        docId: string;
        title: string;
        similarityScore: number;
    }>;
    /** Query used for embedding (may differ from user query if image was processed) */
    effectiveQuery?: string;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY DEBUG INFO
// ═══════════════════════════════════════════════════════════════

export interface EntityDebugInfo {
    /** Tokens extracted from query */
    queryTokens: string[];
    /** Top-3 entity candidates with scores */
    candidates: Array<{
        entityId: string;
        entityName?: string;
        score: number;
    }>;
    /** Final resolved entity (if any) */
    resolvedEntityId?: string;
    /** Confidence of entity resolution */
    confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Explicit escalation intent phrases (English) */
export const ESCALATION_INTENT_PATTERNS = [
    /\btalk\s+to\s+(a\s+)?human\b/i,
    /\bspeak\s+to\s+(an?\s+)?agent\b/i,
    /\bcreate\s+(a\s+)?ticket\b/i,
    /\bcontact\s+support\b/i,
    /\bneed\s+(more\s+)?help\b/i,
    /\bthis\s+(isn't|is\s+not|didn't|does\s+not)\s+help/i,
    /\bnot\s+help(ful|ing)\b/i,
    /\breal\s+person\b/i,
    /\bhuman\s+support\b/i,
];

/** Default escalation metadata (no escalation) */
export const NO_ESCALATION: EscalationMetadata = {
    escalationSuggested: false,
    escalationType: 'none',
    triggerTypes: [],
};

/** Max escalations per tenant per day (in-memory cap) */
export const MAX_ESCALATIONS_PER_TENANT_PER_DAY = 10;

/** RAG similarity threshold below which soft escalation triggers */
export const RAG_LOW_SIMILARITY_THRESHOLD = 0.5;

/** Minimum session failures before hard escalation */
export const REPEATED_FAILURE_THRESHOLD = 2;
