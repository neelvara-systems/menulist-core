import { KnowledgeBaseArticleType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import type { AnswerlatticePublicCitation } from '@type/answerlattice';

/** @deprecated Use SearchAPIResponseType instead (typo preserved for backward compat) */
export type SerachAPIResponseType = SearchAPIResponseType;

export type SearchAPIResponseType = {
    id?: string;
    craftedAnswer: string;
    references: KnowledgeBaseArticleType[]; // Includes similarityScore for quality calculation
    citations?: AnswerlatticePublicCitation[];
    suggestedQuestions?: string[]; // AI-generated follow-up questions
    imageProcessed?: boolean;
};

export type SearchDisplayResultReferenceType = {
    articleId: string;
    categoryId: string;
    sectionId?: string;
    category: KnowledgeBaseCategory;
    section?: KnowledgeBaseSection;
    article: KnowledgeBaseArticleType;
};

export type SearchDisplayResultDataType = {
    craftedAnswer: string;
    searchHistoryId?: string;
    references: SearchDisplayResultReferenceType[];
    citations?: AnswerlatticePublicCitation[];
};
