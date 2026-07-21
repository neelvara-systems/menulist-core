/**
 * Answerlattice — AI Failure Escalation Types
 * 
 * Type definitions for the escalation detection and context capture system.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_AI_ESCALATION
 * @see __docs__/answerlattice/ai-failure-escalation/
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// ESCALATION TRIGGER TYPES
// ═══════════════════════════════════════════════════════════════

export type EscalationTriggerType =
    | 'insufficient_answer_evidence' // S1: no canonical answer and no usable final-answer evidence
    | 'entity_resolution_failure'  // S2: no entity match
    | 'explicit_user_request'      // S3: user explicitly submitted a trusted support handoff
    | 'rag_low_similarity';        // S4: best cited result < 0.5

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

const EscalationTriggerTypeSchema = z.enum([
    'insufficient_answer_evidence',
    'entity_resolution_failure',
    'explicit_user_request',
    'rag_low_similarity',
]);

const EscalationContextSchema = z.object({
    triggerTypes: z.array(EscalationTriggerTypeSchema).min(1).max(4),
    query: z.string().trim().min(1).max(500),
    conversationId: z.string().trim().min(1).max(180).optional(),
    productContext: z.object({
        contextKey: z.string().trim().min(1).max(180).optional(),
        page: z.string().trim().min(1).max(180).optional(),
        feature: z.string().trim().min(1).max(180).optional(),
        workflow: z.string().trim().min(1).max(180).optional(),
        plan: z.string().trim().min(1).max(180).optional(),
        userRole: z.string().trim().min(1).max(180).optional(),
    }).strict().optional(),
    retrievalDebug: z.object({
        canonicalResult: z.object({
            found: z.boolean(),
            confidence: z.enum(['high', 'medium', 'low', 'none']),
            fallbackReason: z.string().trim().min(1).max(180).optional(),
            matchedEntityIds: z.array(z.string().trim().min(1).max(180)).max(20),
        }).strict(),
        ragResults: z.array(z.object({
            docId: z.string().trim().min(1).max(180),
            title: z.string().trim().min(1).max(300),
            similarityScore: z.number().finite().min(0).max(1),
        }).strict()).max(5).optional(),
        effectiveQuery: z.string().trim().min(1).max(500).optional(),
    }).strict().optional(),
    entityDebug: z.object({
        queryTokens: z.array(z.string().trim().min(1).max(180)).max(20),
        candidates: z.array(z.object({
            entityId: z.string().trim().min(1).max(180),
            entityName: z.string().trim().min(1).max(180).optional(),
            score: z.number().finite(),
        }).strict()).max(3),
        resolvedEntityId: z.string().trim().min(1).max(180).optional(),
        confidence: z.number().finite().min(0).max(1),
    }).strict().optional(),
    escalatedAt: z.string().datetime({ offset: true }),
}).strict();

export const parseAnswerlatticeEscalationContext = (value: unknown): EscalationContext | null => {
    const parsed = EscalationContextSchema.safeParse(value);
    return parsed.success ? parsed.data as EscalationContext : null;
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Default escalation metadata (no escalation) */
export const NO_ESCALATION: EscalationMetadata = {
    escalationSuggested: false,
    escalationType: 'none',
    triggerTypes: [],
};

/** RAG similarity threshold below which soft escalation triggers */
export const RAG_LOW_SIMILARITY_THRESHOLD = 0.5;
