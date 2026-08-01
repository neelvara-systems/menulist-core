import { Timestamp, type VectorValue } from "firebase/firestore";
import { LuBan, LuFile, LuFileCheck2, LuFileClock, LuFileCog, LuFileQuestion, LuFileX } from "react-icons/lu";
import type { AnswerlatticeArticleTranslation } from "@type/answerlattice";
import type { Content } from "@tiptap/core";

export const INGESTION_JOB_STATUS = {
    PENDING: "pending",//This is when batch job is scheduled and added to google task queue
    PROCESSING: "processing",//This is when batch job is processing
    NEEDS_REVIEW: "needs_review",//This is when batch job is needs review
    PUBLISHING: "publishing", //This is when batch job is publishing
    PUBLISHED: "published",//This is when batch job is published
    FAILED: "failed",//This is when batch job fails to generate images or naything wrong happens on server
    CANCELLED: "cancelled",//This is when user cancels the batch job which is in processing or queued
} as const;

export const ARTICLE_RECONCILIATION_STATUS = {
    UNRESOLVED: "unresolved",//This is when article has duplicate data and needs review
    REPLACE: "replace",//This is when article duplication resolved and replaced means old darticle is not in archived state
    DISCARD: "discard",//This is when article duplication resolved and discarded
    KEEP_BOTH: "keep_both",//This is when article duplication resolved and both are kept
} as const;

export const ARTICLE_STATUS = {
    DRAFT: "draft",//This is when article is in draft state
    NEEDS_REVIEW: "needs_review",//This is when article is in needs review state
    PUBLISHED: "published",//This is when article is in published state
    ARCHIVED: "archived",//This is when article is in archived state
} as const;

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
    content?: Content;//tiptap json with provenance; omitted from compact review navigation
    active?: boolean;
    index?: number;
    url?: string;
    reEmbedding?: boolean;//when category or section title changes this field need to set as true
    qualityScore?: number;//0-1 confidence score based on content length, structure, source coverage
    entityIds?: string[];//Answerlattice entity IDs extracted during ingestion (max 10)
    generatedFaqs?: KnowledgeBaseGeneratedFaq[];//Reviewable FAQ suggestions generated from this article/import source
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

export const FILE_TYPE = {
    PDF: "pdf",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
    WEBSITE: "website",
    YOUTUBE: "youtube",
    GOOGLE_DRIVE: "google_drive",
    COPIED_TEXT: "copied_text",
} as const;

export type SourceFileType = typeof FILE_TYPE[keyof typeof FILE_TYPE];

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
    pId: 'AL';
    title?: string;
    status: typeof INGESTION_JOB_STATUS[keyof typeof INGESTION_JOB_STATUS];
    sourceFiles: IngestionJobSourceFile[];

    articleIds?: string[];
    categories?: IngestionJobCategoriesMap | null; // null until generation proposes navigation
    articlesToReview?: IngestionJobArticleToReview[]; // Articles need to review

    //task queue keys
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

    //runtime fields
    errorMessage?: string | null;//set when job fails, used for retry visibility
    failureStage?: 'generation' | 'publishing_orchestration' | 'embedding' | null;
    publishedOn?: Timestamp;
    createdOn: Timestamp;//created at runtime via requestBodyComposer 
    modifiedOn: Timestamp;//created at runtime via requestBodyComposer

    sId: number;//created at runtime via requestBodyComposer
    tId: number;//created at runtime via requestBodyComposer
    uId: string | number;//created at runtime via requestBodyComposer

    // Founder Onboarding Bootstrap (additive, freeze-compliant)
    // Tracks automatic entity extraction + canonical answer draft generation after KB publish
    // Feature-flagged: ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING
    // @see __docs__/answerlattice/founder-onboarding/
    onboardingBootstrap?: {
        status: 'pending' | 'extracting' | 'promoting' | 'drafting' | 'completed' | 'failed';
        entitiesExtracted: number;
        entitiesAutoPromoted: number;
        candidatesForReview: number;
        draftsGenerated: number;
        draftsFailed: number;
        startedAt?: Timestamp;
        completedAt?: Timestamp;
        errorMessage?: string;
    };
}

// Collection: categories
// Doc ID: categoriesMeta
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

export interface KnowledgeBaseArticleMeta {
    id: string;
    active: boolean;
    title: string;
    index: number;
    url: string;
}

export interface KnowledgeBaseCategoriesType {
    categories: KbCategoriesMap;
}

export interface KnowledgeBaseArticleSource {
    type: SourceFileType;
    url: string; // The gs:// path
    name: string;
    timestamp?: string;
    page?: number;//if its pdf then its page number / document page number
}

export interface KnowledgeBaseArticleType {
    id: string;
    pId?: 'AL';
    active: boolean;
    categoryId: string;
    sectionId: string;
    categoryTitle: string;
    sectionTitle?: string;//optional
    title: string;
    index: number;
    url: string;
    content: Content;//JSON (Tiptap editor format)
    embedding?: VectorValue | null;
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
    tags: string[];
    createdOn: Timestamp;
    modifiedOn: Timestamp;
    status: typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS];
    jobId: string;
    sources: KnowledgeBaseArticleSource[] | null; // An array of source objects
    likes?: number;
    dislikes?: number;
    similarityScore?: number; // Cosine similarity (0-1), higher = more relevant
    lastReviewedOn?: Timestamp; // Content freshness tracking — when was this article last reviewed/validated
    reconciliation?: { status?: string; similarArticleIds?: string[]; similarArticles?: KnowledgeBaseArticleSummary[] }; // Reconciliation metadata from generation
    entityIds?: string[]; // Answerlattice entity IDs linked to this article (max 10) — powers entity-centric retrieval
    contextKeys?: string[]; // Answerlattice product surface keys linked to this article
    faqIds?: string[]; // Answerlattice FAQ IDs linked to this article
    generatedFaqs?: KnowledgeBaseGeneratedFaq[]; // Review-only FAQ suggestions, removed after publish
    translations?: Record<string, AnswerlatticeArticleTranslation>; // Locale-specific Answerlattice KB translations
    intakeJobId?: string | null;
    intakeReviewItemId?: string | null;
    intakeSourceIds?: string[];
    tId?: number; // Tenant ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc. Required by ANSWERLATTICE_RULES Rule 6.
    sId?: number; // Store ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc.
}

export interface KnowledgeBaseArticleEmbeddingPayload {
    articleId: string;
    content: Content;
    categoryId: string;
    sectionId: string;
    articleTitle: string;
    categoryTitle: string;
    sectionTitle: string;
}

type IngestionJobStatusColorToken = Partial<{
    colorBgBase: string;
    colorErrorBg: string;
    colorInfoBg: string;
    colorSuccessBg: string;
    colorWarningBg: string;
}>;

export const getIngestionJobStatusData = (token: IngestionJobStatusColorToken = {}) => {
    const colors = {
        colorBgBase: token.colorBgBase ?? 'transparent',
        colorErrorBg: token.colorErrorBg ?? 'transparent',
        colorInfoBg: token.colorInfoBg ?? 'transparent',
        colorSuccessBg: token.colorSuccessBg ?? 'transparent',
        colorWarningBg: token.colorWarningBg ?? 'transparent',
    };
    return {
        [INGESTION_JOB_STATUS.PENDING]: { title: 'Job is Pending', color: 'default', icon: LuFile, label: 'Pending', gradient: `linear-gradient(135deg, ${colors.colorBgBase} 0%, ${colors.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.PROCESSING]: { title: 'Job is Processing', color: 'blue', icon: LuFileCog, label: 'Processing', gradient: `linear-gradient(135deg, ${colors.colorInfoBg} 0%, ${colors.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.NEEDS_REVIEW]: { title: 'Job Processing completed, Need Review', color: 'orange', icon: LuFileQuestion, label: 'Needs Review', gradient: `linear-gradient(135deg, ${colors.colorWarningBg} 0%, ${colors.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.PUBLISHING]: { title: 'Job is Publishing', color: 'blue', icon: LuFileClock, label: 'Publishing', gradient: `linear-gradient(135deg, ${colors.colorInfoBg} 0%, ${colors.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.PUBLISHED]: { title: 'Job Published Successfully', color: 'green', icon: LuFileCheck2, label: 'Published', gradient: `linear-gradient(135deg, ${colors.colorSuccessBg} 0%, ${colors.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.FAILED]: { title: 'Job Failed', color: 'red', icon: LuFileX, label: 'Failed', gradient: `linear-gradient(135deg, ${colors.colorErrorBg} 0%, ${colors.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.CANCELLED]: { title: 'Job Cancelled', color: 'gold', icon: LuBan, label: 'Cancelled', gradient: `linear-gradient(135deg, ${colors.colorWarningBg} 0%, ${colors.colorBgBase} 100%)` },
    };
}



// {
//     // A map of the new/updated categories from this job.
//     // The key is a temporary ID generated by the AI.
//     [tempCategoryId: string]: {
//         id: string; // Temporary ID
//         title: string;
//         description: string;
//         // ... other category metadata
//         sections ?: {//if available
//             id: string; // Temporary ID
//             title: string;
//             description: string;
//             articles: {
//                 id: string;
//                 title: string;
//                 content: any;//tiptap json with provenance
//             }[];
//         }[];
//         articles: {//if sections available then not present 
//             id: string;
//             title: string;
//             content: any;//tiptap json with provenance
//         } [];
//     }
// };
