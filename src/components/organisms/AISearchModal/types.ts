import { KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import type { AnswerlatticePublicCitation } from '@type/answerlattice';
import type { CoreSearchReference } from '@lib/search/types';

/** @deprecated Use SearchAPIResponseType instead (typo preserved for backward compat) */
export type SerachAPIResponseType = SearchAPIResponseType;

export type SearchAPIResponseType = {
    id?: string;
    craftedAnswer: string;
    references: CoreSearchReference[];
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
    article: CoreSearchReference;
};

export type SearchDisplayResultDataType = {
    craftedAnswer: string;
    searchHistoryId?: string;
    references: SearchDisplayResultReferenceType[];
    citations?: AnswerlatticePublicCitation[];
};
