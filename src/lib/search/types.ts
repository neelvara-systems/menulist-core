/**
 * Answerlattice Unified Search — Shared Types
 *
 * Single source of truth for all search pipeline types.
 * Used by both Help Center (authenticated) and Widget (API key) surfaces.
 *
 * @see __docs__/answerlattice/help-widget/
 * @see __docs__/answerlattice/help-center/
 */

import type { ValidatedContextPayload } from '@lib/validation/contextSchema';
import type {
    AnswerlatticeAnswerType,
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeEntitySearchIndex,
    AnswerlatticePublicCitation,
    AnswerlatticeProcedure,
    AnswerlatticeRelease,
    AnswerlatticeScopeClarification,
    AnswerlatticeContextPayload,
} from '@type/answerlattice';
import type { AiSearchHistoryReference } from '@type/aiSearchHistory';

// ===== MOUNT CONTEXT =====

/** Where the search request originated from — used for analytics + behavior tuning */
export type SearchMountContext = 'help_center' | 'widget';

/**
 * Production requests may update search history and runtime caches. Answer-test
 * requests exercise the same retrieval pipeline without creating customer-facing
 * history, feedback targets, analytics inputs, or instant-cache writes.
 */
export type SearchExecutionContext = 'production' | 'answer_test';

// ===== CORE SEARCH INPUT =====

export interface CoreSearchInput {
    /** The user's search query */
    query: string;

    /** Where the search is mounted (for analytics, logging, future behavior tuning) */
    mountContext: SearchMountContext;

    /** Defaults to production. Tests must explicitly opt into the non-persistent path. */
    executionContext?: SearchExecutionContext;

    /** Server-only request-local preload for bounded QA runs. Never accepted from public clients. */
    retrievalPreload?: {
        searchIndex?: AnswerlatticeEntitySearchIndex[];
        latestRelease?: AnswerlatticeRelease | null;
        activeAnswerCache?: Map<string, AnswerlatticeCanonicalAnswer[]>;
    };

    /** Server-only cost gate invoked immediately before the first provider call. */
    beforeAiProviderCall?: () => Promise<void>;

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

    /** Tenant/store-scoped chat image URL (Firebase Storage only) — authenticated help center uploads */
    imageUrl?: string;

    /** Inline image payload — public widget uses this to avoid temporary storage writes */
    imageBuffer?: {
        imageBase64: string;
        mimeType: string;
    };

    /** Validated product context (page, feature, workflow, etc.) */
    productContext?: ValidatedContextPayload & Pick<AnswerlatticeContextPayload, 'surfaceEntityIds'>;

    /** Optional requester metadata from public surfaces such as the widget. */
    requestMetadata?: {
        visitorId?: string | null;
        visitorName?: string | null;
        visitorEmail?: string | null;
        widgetSessionId?: string | null;
        requestOrigin?: string | null;
        requestPath?: string | null;
        userAgentFamily?: string | null;
        visitorVerified?: boolean;
        evidenceLinks?: Array<{ url: string; label?: string }>;
    };

}

// ===== CORE SEARCH OUTPUT =====

export type CoreSearchReference = AiSearchHistoryReference & {
    /** Public article content used by authenticated help-center rendering. */
    content?: unknown;
    tags?: string[];
    sourceType?: 'faq';
};

export interface CoreSearchResult {
    /** AI-crafted answer text */
    craftedAnswer: string;

    /** KB article references (full objects with similarityScore) */
    references: CoreSearchReference[];

    /** Reviewer-approved public citations attached to a canonical answer. */
    citations?: AnswerlatticePublicCitation[];

    /** Context-aware related content resolved from Answerlattice Product Surfaces */
    relatedContent?: import('@type/answerlattice').AnswerlatticeSurfaceContentItem;

    /** AI-generated follow-up questions */
    suggestedQuestions: string[];

    /** Search history document ID (for feedback linking) */
    searchHistoryId?: string;

    /** Whether this request reached an AI provider instead of cache/canonical-only retrieval */
    aiProviderUsed?: boolean;

    /** Provider-backed steps used by this request, for audit-only operation logging */
    aiProviderOperations?: string[];

    /** Aggregated token usage for provider-backed search steps. */
    aiProviderTokenUsage?: {
        candidatesTokenCount: number;
        promptTokenCount: number;
        tokenCountSource: 'provider' | 'estimated' | 'mixed' | 'none';
        totalTokenCount: number;
    };

    /** Whether the answer came from canonical retrieval (not RAG) */
    canonical: boolean;

    /** Deterministic source used for the final answer */
    answerSource?: 'canonical' | 'faq' | 'rag' | 'cache' | 'empty';

    /** Canonical answer ID (if canonical hit) */
    canonicalAnswerId?: string;

    /** Owner FAQ/custom Q&A ID (if a published FAQ answered the question) */
    faqAnswerId?: string;

    /** Confidence level (canonical hits only) */
    confidence?: 'high' | 'medium' | 'low' | 'none';

    /** Safe deterministic reason when the final result abstains. */
    fallbackReason?: string;

    /** Structured context request when a scoped answer cannot be selected safely. */
    clarification?: AnswerlatticeScopeClarification;

    /** Answer type: explanation, procedure, etc. */
    answerType?: AnswerlatticeAnswerType | 'faq';

    /** Whether canonical answer has drift flag */
    drifted?: boolean;

    /** Procedure steps (for guided workflow answers) */
    procedure?: AnswerlatticeProcedure;

    /** Whether an image was successfully processed */
    imageProcessed: boolean;

    /** Escalation metadata (only present when ENABLE_ANSWERLATTICE_AI_ESCALATION is ON) */
    escalation?: import('@lib/answerlattice/escalationTypes').EscalationMetadata;

    /** Knowledge Graph expansion metadata (only present when ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH is ON) */
    graphExpansion?: import('@type/answerlattice').AnswerlatticeGraphExpansionResult;
}

// ===== PERFORMANCE METRICS =====

export interface SearchPerfMetrics {
    total?: number;
    imageProcessing?: number;
    cacheLookup?: number;
    canonicalRetrieval?: number;
    faqRetrieval?: number;
    embeddingGeneration?: number;
    vectorSearch?: number;
    entityEvidenceRetrieval?: number;
    answerGeneration?: number;
}
