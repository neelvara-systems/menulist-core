import type { AnswerlatticeCacheSourceVersions } from '@lib/answerlattice/cacheVersionManifest';

export interface AiSearchHistoryReference {
    id: string;
    title?: string;
    url?: string;
    categoryId?: string;
    sectionId?: string;
    categoryTitle?: string;
    sectionTitle?: string;
    similarityScore?: number;
}

export interface AiSearchHistory {
    id?: string;
    query: string;
    cacheKey: string; // Unique cache key (text-only: normalized query, with image: normalized + hash)
    generatedQueryFromImage?: string; // AI-generated query from image
    craftedAnswer: string;
    references: AiSearchHistoryReference[];
    imageUrl?: string; // Firebase Storage URL of uploaded image
    // Session-related fields that will be added by the DAL
    uId?: string;
    tId?: number;
    sId?: number;
    createdOn?: any; // Should be a server timestamp
    modifiedOn?: any; // Should be a server timestamp
    // Feedback fields
    isGood?: boolean;
    resolutionOutcome?: 'resolved' | 'not_resolved';
    reasonsToImprove?: Array<{ value: string; label: string; }>;
    comments?: string;
    submittedAt?: any; // Timestamp when feedback was submitted
    // Answerlattice — Canonical retrieval fields
    // @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
    canonical?: boolean;              // true if resolved via canonical answer (not RAG)
    canonicalAnswerId?: string;       // ID of the canonical answer used
    answerSource?: 'canonical' | 'faq' | 'rag' | 'cache' | 'empty' | string; // Final answer source for audit/analytics
    faqAnswerId?: string;             // Published owner FAQ/custom answer used, when applicable
    matchedEntityIds?: string[];      // Entity IDs matched during retrieval
    fallbackReason?: string;          // Canonical miss reason captured before FAQ/RAG fallback
    confidence?: string;              // 'high' | 'medium' | 'low' | 'none'
    sourceVersions?: AnswerlatticeCacheSourceVersions; // Source freshness manifest captured when cached
    mountContext?: 'help_center' | 'widget' | 'api' | string; // Surface that initiated the search
    contextKey?: string; // Compact Answerlattice product surface key, not the full transient context payload
    surfaceFeature?: string;
    surfacePage?: string;
    surfaceWorkflow?: string;
    expiresAt?: any;
    retentionDays?: number;
}
