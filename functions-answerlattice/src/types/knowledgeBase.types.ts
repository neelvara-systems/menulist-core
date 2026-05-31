/**
 * Knowledge Base Types
 * 
 * Types for KB ingestion jobs, articles, categories, and sections.
 */

import { Timestamp } from "firebase-admin/firestore";
import { SourceFileType } from "./constants";

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const INGESTION_JOB_STATUS: Record<string, string> = {
    PENDING: "pending",
    PROCESSING: "processing",
    NEEDS_REVIEW: "needs_review",
    PUBLISHING: "publishing",
    PUBLISHED: "published",
    FAILED: "failed",
    CANCELLED: "cancelled",
}

export const ARTICLE_RECONCILIATION_STATUS: Record<string, string> = {
    UNRESOLVED: "unresolved",
    REPLACE: "replace",
    DISCARD: "discard",
    KEEP_BOTH: "keep_both",
}

export const ARTICLE_STATUS: Record<string, string> = {
    DRAFT: "draft",
    NEEDS_REVIEW: "needs_review",
    PUBLISHED: "published",
    ARCHIVED: "archived",
}

// ═══════════════════════════════════════════════════════════════════════════
// INGESTION JOB TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface IngestionJobSection {
    id: string;
    title: string;
    description: string;
    active: boolean;
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
    content: any; // tiptap json with provenance
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
    sections?: IngestionJobSection[];
    articles?: IngestionJobArticle[];
}

export interface IngestionJobCategoriesMap {
    [key: string]: IngestionJobCategory;
}

export interface IngestionJobSourceFile {
    storagePath: string;
    fileName: string;
    type: SourceFileType;
    gsUri: string;
    downloadURL: string;
}

export interface IngestionJobArticleToReview {
    id: string;
    title: string;
    status: typeof ARTICLE_RECONCILIATION_STATUS[keyof typeof ARTICLE_RECONCILIATION_STATUS];
    similarArticles: KnowledgeBaseArticleType[];
}

export interface IngestionJob {
    id: string;
    title: string;
    status: typeof INGESTION_JOB_STATUS[keyof typeof INGESTION_JOB_STATUS];
    sourceFiles: IngestionJobSourceFile[];

    articleIds?: string[];
    categories?: IngestionJobCategoriesMap;
    articlesToReview?: IngestionJobArticleToReview[];

    // Task queue keys
    articlesEmbeddedCount?: number;
    articlesToEmbedCount?: number;

    // Runtime fields
    publishedOn?: Timestamp;
    createdOn: Timestamp;
    modifiedOn: Timestamp;

    sId: string;
    tId: string;
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
    page?: any;
}

export interface KnowledgeBaseArticleType {
    id: string;
    active: boolean;
    categoryId: string;
    sectionId: string;
    categoryTitle: string;
    sectionTitle?: string;
    title: string;
    index: number;
    url: string;
    content: any; // JSON (Tiptap editor format)
    embedding: any;
    tags: string[];
    createdOn: Timestamp;
    modifiedOn: Timestamp;
    status: typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS];
    jobId: string;
    sources: KnowledgeBaseArticleSource[] | null;
    faqIds?: string[];
    generatedFaqs?: KnowledgeBaseGeneratedFaq[];
    tId?: number; // Tenant ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc.
    sId?: number; // Store ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc.
}

export interface KnowledgeBaseArticleEmbeddingPayload {
    articleId: string;
    content: any;
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
    content: any; // tiptap JSON
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
