import { KnowledgeBaseArticleType } from "./knowledgeBase";
import type { CanonicaCacheSourceVersions } from '@lib/canonica/cacheVersionManifest';

export interface AiSearchHistory {
    id?: string;
    query: string;
    cacheKey: string; // Unique cache key (text-only: normalized query, with image: normalized + hash)
    generatedQueryFromImage?: string; // AI-generated query from image
    craftedAnswer: string;
    references: KnowledgeBaseArticleType[]; // Now includes similarity scores
    imageUrl?: string; // Firebase Storage URL of uploaded image
    // Session-related fields that will be added by the DAL
    uId?: string;
    tId?: number;
    sId?: number;
    createdOn?: any; // Should be a server timestamp
    modifiedOn?: any; // Should be a server timestamp
    // Feedback fields
    isGood?: boolean;
    reasonsToImprove?: Array<{ value: string; label: string; }>;
    comments?: string;
    submittedAt?: any; // Timestamp when feedback was submitted
    // Canonica — Canonical retrieval fields
    // @see __docs__/canonica/doctrine/05-architecture-evolution.md
    canonical?: boolean;              // true if resolved via canonical answer (not RAG)
    canonicalAnswerId?: string;       // ID of the canonical answer used
    matchedEntityIds?: string[];      // Entity IDs matched during retrieval
    confidence?: string;              // 'high' | 'medium' | 'low' | 'none'
    sourceVersions?: CanonicaCacheSourceVersions; // Source freshness manifest captured when cached
    mountContext?: 'help_center' | 'widget' | 'api' | string; // Surface that initiated the search
}
