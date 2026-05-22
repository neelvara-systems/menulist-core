import { Timestamp } from "firebase/firestore";
import { LuBan, LuFile, LuFileCheck2, LuFileClock, LuFileCog, LuFileQuestion, LuFileX } from "react-icons/lu";

export const INGESTION_JOB_STATUS: Record<string, string> = {
    PENDING: "pending",//This is when batch job is scheduled and added to google task queue
    PROCESSING: "processing",//This is when batch job is processing
    NEEDS_REVIEW: "needs_review",//This is when batch job is needs review
    PUBLISHING: "publishing", //This is when batch job is publishing
    PUBLISHED: "published",//This is when batch job is published
    FAILED: "failed",//This is when batch job fails to generate images or naything wrong happens on server
    CANCELLED: "cancelled",//This is when user cancels the batch job which is in processing or queued
}

export const ARTICLE_RECONCILIATION_STATUS: Record<string, string> = {
    UNRESOLVED: "unresolved",//This is when article has duplicate data and needs review
    REPLACE: "replace",//This is when article duplication resolved and replaced means old darticle is not in archived state
    DISCARD: "discard",//This is when article duplication resolved and discarded
    KEEP_BOTH: "keep_both",//This is when article duplication resolved and both are kept
}

export const ARTICLE_STATUS: Record<string, string> = {
    DRAFT: "draft",//This is when article is in draft state
    NEEDS_REVIEW: "needs_review",//This is when article is in needs review state
    PUBLISHED: "published",//This is when article is in published state
    ARCHIVED: "archived",//This is when article is in archived state
}

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
    content: any;//tiptap json with provenance
    reEmbedding?: boolean;//when category or section title changes this field need to set as true
    qualityScore?: number;//0-1 confidence score based on content length, structure, source coverage
    entityIds?: string[];//Canonica entity IDs extracted during ingestion (max 10)
    generatedFaqs?: KnowledgeBaseGeneratedFaq[];//Reviewable FAQ suggestions generated from this article/import source
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

export const FILE_TYPE: Record<string, string> = {
    PDF: "pdf",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    DOCUMENT: "document",
    WEBSITE: "website",
    YOUTUBE: "youtube",
    GOOGLE_DRIVE: "google_drive",
    COPIED_TEXT: "copied_text",
}

export type SourceFileType = typeof FILE_TYPE[keyof typeof FILE_TYPE];

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
    categories?: IngestionJobCategoriesMap; // This will hold the proposed navigation structure
    articlesToReview?: IngestionJobArticleToReview[]; // Articles need to review

    //task queue keys
    articlesEmbeddedCount?: number;
    articlesToEmbedCount?: number;

    //runtime fields
    errorMessage?: string;//set when job fails, used for retry visibility
    publishedOn?: Timestamp;
    createdOn: Timestamp;//created at runtime via requestBodyComposer 
    modifiedOn: Timestamp;//created at runtime via requestBodyComposer

    sId: string;//created at runtime via requestBodyComposer
    tId: string;//created at runtime via requestBodyComposer
    uId: string;//created at runtime via requestBodyComposer

    // Founder Onboarding Bootstrap (additive, freeze-compliant)
    // Tracks automatic entity extraction + canonical answer draft generation after KB publish
    // Feature-flagged: ENABLE_CANONICA_FOUNDER_ONBOARDING
    // @see __docs__/canonica/founder-onboarding/
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
    page?: any;//if its pdf then its page number / document page number 
}

export interface KnowledgeBaseArticleType {
    id: string;
    active: boolean;
    categoryId: string;
    sectionId: string;
    categoryTitle: string;
    sectionTitle?: string;//optional
    title: string;
    index: number;
    url: string;
    content: any;//JSON (Tiptap editor format)
    embedding: any;
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
    reconciliation?: { status?: string; similarArticleIds?: string[]; similarArticles?: KnowledgeBaseArticleType[] }; // Reconciliation metadata from generation
    entityIds?: string[]; // Canonica entity IDs linked to this article (max 10) — powers entity-centric retrieval
    contextKeys?: string[]; // Canonica product surface keys linked to this article
    faqIds?: string[]; // Canonica FAQ IDs linked to this article
    generatedFaqs?: KnowledgeBaseGeneratedFaq[]; // Review-only FAQ suggestions, removed after publish
    tId?: number; // Tenant ID — multi-tenant isolation. Inherited from parent kb_generation_jobs doc. Required by CANONICA_RULES Rule 6.
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

export const getIngestionJobStatusData = (token: any = null) => {
    token = token || {};
    return {
        [INGESTION_JOB_STATUS.PENDING]: { title: 'Job is Pending', color: 'default', icon: LuFile, label: 'Pending', gradient: `linear-gradient(135deg, ${token.colorBgBase} 0%, ${token.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.PROCESSING]: { title: 'Job is Processing', color: 'blue', icon: LuFileCog, label: 'Processing', gradient: `linear-gradient(135deg, ${token.colorInfoBg} 0%, ${token.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.NEEDS_REVIEW]: { title: 'Job Processing completed, Need Review', color: 'orange', icon: LuFileQuestion, label: 'Needs Review', gradient: `linear-gradient(135deg, ${token.colorWarningBg} 0%, ${token.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.PUBLISHING]: { title: 'Job is Publishing', color: 'blue', icon: LuFileClock, label: 'Publishing', gradient: `linear-gradient(135deg, ${token.colorInfoBg} 0%, ${token.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.PUBLISHED]: { title: 'Job Published Successfully', color: 'green', icon: LuFileCheck2, label: 'Published', gradient: `linear-gradient(135deg, ${token.colorSuccessBg} 0%, ${token.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.FAILED]: { title: 'Job Failed', color: 'red', icon: LuFileX, label: 'Failed', gradient: `linear-gradient(135deg, ${token.colorErrorBg} 0%, ${token.colorBgBase} 100%)` },
        [INGESTION_JOB_STATUS.CANCELLED]: { title: 'Job Cancelled', color: 'gold', icon: LuBan, label: 'Cancelled', gradient: `linear-gradient(135deg, ${token.colorWarningBg} 0%, ${token.colorBgBase} 100%)` },
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
