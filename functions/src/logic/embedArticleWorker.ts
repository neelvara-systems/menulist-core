import { FieldValue, Timestamp } from "firebase-admin/firestore"; // ← Direct imports
import * as functions from 'firebase-functions';
import { firestoreAdmin } from "../firebaseAdmin";
import { ARTICLE_STATUS, EmbedArticleType, INGESTION_JOB_COLLECTION, KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType } from "../types";
import { genrateEmbedding } from "../utils/aiUtils";

const EMBED_ARTICLE_WORKER_FAILED_CODE = 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_FAILED';
const EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND_CODE = 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND';

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getEmbedArticleWorkerErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

function getEmbedArticleWorkerContext(articleData: EmbedArticleType, jobId: string): Record<string, string | number | boolean> {
    return {
        jobIdLength: jobId.length,
        articleIdLength: articleData.id.length,
        categoryTitleLength: articleData.categoryTitle?.length || 0,
        hasSectionTitle: Boolean(articleData.sectionTitle),
    };
}

export const embedArticleWorkerLogic = async (articleData: EmbedArticleType, jobId: string) => {
    const logger = functions.logger;
    const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleData.id);
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    logger.info('[embedArticleWorkerLogic] Regenerating embedding', getEmbedArticleWorkerContext(articleData, jobId));

    try {
        const articleDoc = await articleRef.get();
        if (!articleDoc.exists) {
            logger.error('[embedArticleWorkerLogic] Article not found in worker. Cannot embed.', {
                failureCode: EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND_CODE,
                ...getEmbedArticleWorkerContext(articleData, jobId),
            });
            await jobRef.update({ articlesEmbeddedCount: FieldValue.increment(1) });
            return;
        }
        const article = articleDoc.data() as KnowledgeBaseArticleType;

        //here we used updated category and section titles because this call is trigger due to change in category/section title changes 
        const articleToEmbed = {
            id: articleData.id,
            categoryTitle: articleData.categoryTitle,
            sectionTitle: articleData.sectionTitle ?? "",
            title: article.title,
            content: article.content
        }
        const embeddingVector = await genrateEmbedding(articleToEmbed);

        await articleRef.update({
            ...articleToEmbed,
            embedding: embeddingVector,
            status: ARTICLE_STATUS.PUBLISHED,
            active: true,
            lastReviewedOn: Timestamp.now(),
            modifiedOn: Timestamp.now()
        });

        await jobRef.update({ articlesEmbeddedCount: FieldValue.increment(1) });
        logger.info('[embedArticleWorkerLogic] Worker successfully re-embedded article.', getEmbedArticleWorkerContext(articleData, jobId));

    } catch (error: any) {
        logger.error('[embedArticleWorkerLogic] Worker failed to re-embed article', {
            failureCode: EMBED_ARTICLE_WORKER_FAILED_CODE,
            ...getEmbedArticleWorkerContext(articleData, jobId),
            ...getEmbedArticleWorkerErrorContext(error),
        });
        await jobRef.update({ articlesEmbeddedCount: FieldValue.increment(1) });
    }
};
