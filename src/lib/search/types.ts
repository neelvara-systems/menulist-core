/**
 * Canonica Unified Search — Shared Types
 *
 * Single source of truth for all search pipeline types.
 * Used by both Help Center (authenticated) and Widget (API key) surfaces.
 *
 * @see __docs__/canonica/help-widget/
 * @see __docs__/canonica/help-center/
 */

import type { ValidatedContextPayload } from '@lib/validation/contextSchema';

// ===== MOUNT CONTEXT =====

/** Where the search request originated from — used for analytics + behavior tuning */
export type SearchMountContext = 'help_center' | 'widget';

// ===== CORE SEARCH INPUT =====

export interface CoreSearchInput {
    /** The user's search query */
    query: string;

    /** Where the search is mounted (for analytics, logging, future behavior tuning) */
    mountContext: SearchMountContext;

    /** Tenant ID */
    tId: number;

    /** Store ID */
    sId: number;

    /** User ID (optional — widget users are anonymous) */
    uId?: string;

    /** Chat mode: qna (stateless) or assistant (contextual) */
    mode?: 'qna' | 'assistant';

    /** Conversation history for assistant mode (last 5 messages) */
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content?: string;
        craftedAnswer?: string;
    }>;

    /** Image URL (Firebase Storage only) — help center only */
    imageUrl?: string;

    /** Validated product context (page, feature, workflow, etc.) */
    productContext?: ValidatedContextPayload;

    /** Number of previous low-confidence results in this chat session (for S3 repeated failure trigger) */
    sessionFailureCount?: number;
}

// ===== CORE SEARCH OUTPUT =====

export interface CoreSearchResult {
    /** AI-crafted answer text */
    craftedAnswer: string;

    /** KB article references (full objects with similarityScore) */
    references: any[];

    /** AI-generated follow-up questions */
    suggestedQuestions: string[];

    /** Search history document ID (for feedback linking) */
    searchHistoryId?: string;

    /** Whether this request reached an AI provider instead of cache/canonical-only retrieval */
    aiProviderUsed?: boolean;

    /** Provider-backed steps used by this request, for audit-only operation logging */
    aiProviderOperations?: string[];

    /** Whether the answer came from canonical retrieval (not RAG) */
    canonical: boolean;

    /** Canonical answer ID (if canonical hit) */
    canonicalAnswerId?: string;

    /** Confidence level (canonical hits only) */
    confidence?: 'high' | 'medium' | 'low' | 'none';

    /** Answer type: explanation, procedure, etc. */
    answerType?: string;

    /** Whether canonical answer has drift flag */
    drifted?: boolean;

    /** Procedure steps (for guided workflow answers) */
    procedure?: any;

    /** Whether an image was successfully processed */
    imageProcessed: boolean;

    /** Escalation metadata (only present when ENABLE_CANONICA_AI_ESCALATION is ON) */
    escalation?: import('@lib/canonica/escalationTypes').EscalationMetadata;

    /** Knowledge Graph expansion metadata (only present when ENABLE_CANONICA_KNOWLEDGE_GRAPH is ON) */
    graphExpansion?: import('@type/canonica').CanonicaGraphExpansionResult;
}

// ===== PERFORMANCE METRICS =====

export interface SearchPerfMetrics {
    total?: number;
    imageProcessing?: number;
    cacheLookup?: number;
    canonicalRetrieval?: number;
    embeddingGeneration?: number;
    vectorSearch?: number;
    answerGeneration?: number;
}
