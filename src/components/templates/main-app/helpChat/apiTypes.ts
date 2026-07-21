import { KnowledgeBaseArticleType } from "@type/knowledgeBase";
import type { AnswerlatticePublicCitation, AnswerlatticeScopeClarification } from '@type/answerlattice';
import type { AnswerlatticePublicFallbackReason } from '@lib/answerlattice/publicAnswerContracts';

/**
 * API Response from /api/helpCenter/search-kb
 * Backend returns full article objects with all necessary fields:
 * - id, title, categoryTitle, sectionTitle, content, etc.
 * 
 * No frontend enrichment needed - use as-is!
 */
export type SearchAPIResponseType = {
    id?: string; // Search history ID when analytics persistence succeeds
    craftedAnswer: string; // AI-generated answer
    references: KnowledgeBaseArticleType[]; // Full article objects with similarityScore
    citations?: AnswerlatticePublicCitation[];
    relatedContent?: import('@type/answerlattice').AnswerlatticeSurfaceContentItem; // Product-surface contextual help links
    suggestedQuestions?: string[]; // AI-generated follow-up questions (3 contextual questions)
    imageProcessed?: boolean; // Flag indicating if image was successfully processed
    answerSource?: 'canonical' | 'faq' | 'rag' | 'cache' | 'empty' | string;
    confidence?: 'high' | 'medium' | 'low' | 'none';
    fallbackReason?: AnswerlatticePublicFallbackReason;
    clarification?: AnswerlatticeScopeClarification;

    // AI Failure Escalation (Item #8) — only present when ENABLE_ANSWERLATTICE_AI_ESCALATION is ON
    escalation?: {
        suggested: boolean;
        type: 'soft' | 'hard' | 'none';
        triggers: string[];
    };
};
