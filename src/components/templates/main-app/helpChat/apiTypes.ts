import { KnowledgeBaseArticleType } from "@type/knowledgeBase";

/**
 * API Response from /api/helpCenter/search-kb
 * Backend returns full article objects with all necessary fields:
 * - id, title, categoryTitle, sectionTitle, content, etc.
 * 
 * No frontend enrichment needed - use as-is!
 */
export type SearchAPIResponseType = {
    id: string; // Search history ID from aiSearchHistory collection
    craftedAnswer: string; // AI-generated answer
    references: KnowledgeBaseArticleType[]; // Full article objects with similarityScore
    relatedContent?: import('@type/canonica').CanonicaSurfaceContentItem; // Product-surface contextual help links
    suggestedQuestions?: string[]; // AI-generated follow-up questions (3 contextual questions)
    imageProcessed?: boolean; // Flag indicating if image was successfully processed

    // AI Failure Escalation (Item #8) — only present when ENABLE_CANONICA_AI_ESCALATION is ON
    escalation?: {
        suggested: boolean;
        type: 'soft' | 'hard' | 'none';
        triggers: string[];
        context?: import('@lib/canonica/escalationTypes').EscalationContext;
    };
};
