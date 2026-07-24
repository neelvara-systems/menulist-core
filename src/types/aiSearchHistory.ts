import type { AnswerlatticeCacheSourceVersions } from '@lib/answerlattice/cacheVersionManifest';
import type {
    AnswerlatticeAnswerType,
    AnswerlatticeProcedure,
    AnswerlatticePublicCitation,
    AnswerlatticeScopeClarification,
} from '@type/answerlattice';

export interface AiSearchHistoryReference {
    id: string;
    title: string;
    url?: string;
    categoryId?: string;
    sectionId?: string;
    categoryTitle?: string;
    sectionTitle?: string;
    similarityScore?: number;
}

export interface AiSearchHistory {
    id?: string;
    pId?: 'AL';
    query: string;
    cacheKey: string; // Unique cache key (text-only: normalized query, with image: normalized + hash)
    generatedQueryFromImage?: string; // AI-generated query from image
    craftedAnswer: string;
    references: AiSearchHistoryReference[];
    citations?: AnswerlatticePublicCitation[];
    suggestedQuestions?: string[];
    responseCacheVersion?: 2;
    imageUrl?: string; // Firebase Storage URL of uploaded image
    // Session-related fields that will be added by the DAL
    uId?: string;
    tId?: number;
    sId?: number;
    createdOn?: unknown; // Firestore Timestamp on persisted documents; Date before serialization
    modifiedOn?: unknown; // Firestore Timestamp on persisted documents; Date before serialization
    // Feedback fields
    isGood?: boolean;
    resolutionOutcome?: 'resolved' | 'not_resolved';
    reasonsToImprove?: Array<{ value: string; label: string; }>;
    comments?: string;
    submittedAt?: unknown; // Timestamp when feedback was submitted
    // Answerlattice — Canonical retrieval fields
    // @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
    canonical?: boolean;              // true if resolved via canonical answer (not RAG)
    canonicalAnswerId?: string;       // ID of the canonical answer used
    guidedProcedure?: AnswerlatticeProcedure; // Exact validated procedure snapshot served with a guided canonical result
    answerSource?: 'canonical' | 'faq' | 'rag' | 'cache' | 'empty'; // Final answer source for audit/analytics
    answerType?: AnswerlatticeAnswerType | 'faq';
    drifted?: boolean;
    faqAnswerId?: string;             // Published owner FAQ/custom answer used, when applicable
    matchedEntityIds?: string[];      // Entity IDs matched during retrieval
    fallbackReason?: string;          // Canonical miss reason captured before FAQ/RAG fallback
    clarification?: AnswerlatticeScopeClarification;
    confidence?: 'high' | 'medium' | 'low' | 'none';
    sourceVersions?: AnswerlatticeCacheSourceVersions; // Source freshness manifest captured when cached
    mountContext?: 'help_center' | 'widget' | 'api'; // Surface that initiated the search
    contextKey?: string; // Compact Answerlattice product surface key, not the full transient context payload
    surfaceFeature?: string;
    surfacePage?: string;
    surfaceWorkflow?: string;
    visitorId?: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorVerified?: boolean;
    widgetSessionId?: string;
    requestOrigin?: string;
    requestPath?: string;
    userAgentFamily?: string;
    debugEvidenceLinks?: Array<{ url: string; label?: string }>;
    escalationTicketId?: string;
    escalationStatus?: 'ticket_created';
    escalatedAt?: unknown;
    expiresAt?: unknown;
    retentionDays?: number;
}
