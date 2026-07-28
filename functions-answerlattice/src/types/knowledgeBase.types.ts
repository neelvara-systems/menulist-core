/**
 * Knowledge Base Types
 * 
 * Types for KB ingestion jobs, articles, categories, and sections.
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { SourceFileType } from "./constants";

export type KnowledgeBaseTiptapContent = Record<string, unknown>;
export type KnowledgeBaseEmbedding = ReturnType<typeof FieldValue.vector>;

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const INGESTION_JOB_STATUS = {
    PENDING: "pending",
    PROCESSING: "processing",
    NEEDS_REVIEW: "needs_review",
    PUBLISHING: "publishing",
    PUBLISHED: "published",
    FAILED: "failed",
    CANCELLED: "cancelled",
} as const;

export const ARTICLE_RECONCILIATION_STATUS = {
    UNRESOLVED: "unresolved",
    REPLACE: "replace",
    DISCARD: "discard",
    KEEP_BOTH: "keep_both",
} as const;

export const ARTICLE_STATUS = {
    DRAFT: "draft",
    NEEDS_REVIEW: "needs_review",
    PUBLISHED: "published",
    ARCHIVED: "archived",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// INGESTION JOB TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IngestionJobSection {
    id: string;
    title: string;
    description: string;
    active: boolean;
    index?: number;
    url?: string;
    articles?: IngestionJobArticle[];
}

export interface KnowledgeBaseGeneratedFaq {
    id?: string;
    question: string;
    answer: string;
    tags?: string[];
    contextKeys?: string[];
    entityIds?: string[];
    sortOrder?: number;
}

export interface IngestionJobArticle {
    id: string;
    title: string;
    content?: KnowledgeBaseTiptapContent; // tiptap json with provenance; omitted from compact review navigation
    active?: boolean;
    index?: number;
    url?: string;
    reEmbedding?: boolean;
    qualityScore?: number;
    entityIds?: string[];
    generatedFaqs?: KnowledgeBaseGeneratedFaq[];
}

export interface IngestionJobCategory {
    id: string;
    title: string;
    description: string;
    active: boolean;
    icon?: string;
    index?: number;
    url?: string;
    sections?: IngestionJobSection[];
    articles?: IngestionJobArticle[];
}

export interface IngestionJobCategoriesMap {
    [key: string]: IngestionJobCategory;
}

export interface IngestionJobSourceFile {
    storagePath: string;
    fileName: string;
    /** Uploaded MIME type; semantic article provenance uses KnowledgeBaseArticleSource.type. */
    type: string;
    gsUri: string;
    downloadURL: string;
}

export interface KnowledgeBaseArticleSummary {
    id: string;
    title: string;
    categoryTitle: string;
    sectionTitle?: string;
    status: string;
    active: boolean;
    score?: number;
}

export interface IngestionJobArticleToReview {
    id: string;
    title: string;
    status: typeof ARTICLE_RECONCILIATION_STATUS[keyof typeof ARTICLE_RECONCILIATION_STATUS];
    similarArticles: KnowledgeBaseArticleSummary[];
}

export interface IngestionJob {
    id: string;
    pId?: 'AL';
    title?: string;
    status: typeof INGESTION_JOB_STATUS[keyof typeof INGESTION_JOB_STATUS];
    sourceFiles: IngestionJobSourceFile[];

    articleIds?: string[];
    categories?: IngestionJobCategoriesMap;
    articlesToReview?: IngestionJobArticleToReview[];

    // Task queue keys
    articlesEmbeddedCount?: number;
    articlesToEmbedCount?: number;
    embeddingPendingArticleIds?: string[];
    embeddingCompletedArticleIds?: string[];
    embeddingFailedArticleIds?: string[];
    embeddingEnqueueStatus?: 'pending' | 'queued' | 'failed';
    embeddingRunId?: string;
    replacementArticleIds?: string[];
    generationRun?: {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
    };
    deletionRun?: {
        id: string;
        status: 'processing' | 'failed';
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
        failedCount: number;
    };

    // Runtime fields
    errorMessage?: string;
    failureStage?: 'generation' | 'publishing_orchestration' | 'embedding';
    publishedOn?: Timestamp;
    createdOn: Timestamp;
    modifiedOn: Timestamp;

    sId: string | number;
    tId: string | number;
    uId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE STRUCTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface KnowledgeBaseArticleMeta {
    id: string;
    active: boolean;
    title: string;
    index: number;
    url: string;
}

export interface KnowledgeBaseSection {
    id: string;
    title: string;
    description: string;
    active: boolean;
    url: string;
    index: number;
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    articles?: KnowledgeBaseArticleMeta[];
}

export interface KnowledgeBaseCategory {
    id: string;
    title: string;
    description: string;
    icon: string;
    url: string;
    active: boolean;
    index: number;
    sections?: KnowledgeBaseSection[];
    articles?: KnowledgeBaseArticleMeta[];
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

export interface KbCategoriesMap {
    [key: string]: KnowledgeBaseCategory;
}

export interface KnowledgeBaseCategoriesType {
    categories: KbCategoriesMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTICLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface KnowledgeBaseArticleSource {
    type: SourceFileType;
    url: string; // The gs:// path
    name: string;
    timestamp?: string;
    page?: number;
}

export interface KnowledgeBaseArticleType {
    id: string;
    pId?: 'AL';
    active: boolean;
    categoryId: string;
    sectionId: string;
    categoryTitle: string;
    sectionTitle?: string;
    title: string;
    index: number;
    url: string;
    content: KnowledgeBaseTiptapContent; // JSON (Tiptap editor format)
    embedding?: KnowledgeBaseEmbedding | null;
    tags: string[];
    createdOn: Timestamp;
    modifiedOn: Timestamp;
    status: typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS];
    jobId: string;
    sources: KnowledgeBaseArticleSource[] | null;
    entityIds?: string[];
    contextKeys?: string[];
    faqIds?: string[];
    generatedFaqs?: KnowledgeBaseGeneratedFaq[];
    qualityScore?: number;
    reconciliation?: {
        status?: string;
        similarArticleIds?: string[];
        similarArticles?: KnowledgeBaseArticleSummary[];
    };
    tId?: number; // Tenant ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc.
    sId?: number; // Store ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc.
    embeddingStatus?: 'pending' | 'processing' | 'embedded' | 'failed';
    embeddingCacheVersion?: string;
    embeddingSourceHash?: string;
    embeddingRun?: {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        sourceHash: string;
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
    };
}

export interface KnowledgeBaseArticleEmbeddingPayload {
    articleId: string;
    content: KnowledgeBaseTiptapContent;
    categoryId: string;
    sectionId: string;
    articleTitle: string;
    categoryTitle: string;
    sectionTitle: string;
}

export interface EmbedArticleType {
    id: string;
    categoryTitle: string;
    sectionTitle?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCESSED KB TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ProcessedKBArticle = {
    id: string;
    title: string;
    content: KnowledgeBaseTiptapContent; // tiptap JSON
    sources: KnowledgeBaseArticleSource[];
    qualityScore?: number; // 0-1 deterministic score based on content length, structure, sources
    entityIds?: string[];
    generatedFaqs?: KnowledgeBaseGeneratedFaq[];
};

export type ProcessedKBSection = {
    id: string;
    title: string;
    description?: string;
    articles: ProcessedKBArticle[];
};

export type ProcessedKBCategory = {
    id: string;
    title: string;
    description?: string;
    sections?: ProcessedKBSection[];
    articles?: ProcessedKBArticle[];
};

export type ProcessedKBMap = Record<string, ProcessedKBCategory>;

export type ProcessedArticleToSave = KnowledgeBaseArticleType & {
    processedId: string;
};
