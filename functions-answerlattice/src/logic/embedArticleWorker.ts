import { FieldValue, Timestamp } from "firebase-admin/firestore"; // ← Direct imports
import * as functions from 'firebase-functions';
import { bumpAnswerlatticeCacheVersion, ANSWERLATTICE_CACHE_SOURCES } from "../answerlattice/cacheVersionManifest";
import { firestoreAdmin } from "../firebaseAdmin";
import { ARTICLE_STATUS, EmbedArticleType, INGESTION_JOB_COLLECTION, KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType } from "../types";
import { genrateEmbedding } from "../utils/aiUtils";


export const embedArticleWorkerLogic = async (articleData: EmbedArticleType, jobId: string) => {
    const logger = functions.logger;
    const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleData.id);
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    logger.info(`[embedArticleWorkerLogic] Regenerating embedding.with job id ${jobId} and article id ${articleData.id}`);

    try {
        const articleDoc = await articleRef.get();
        if (!articleDoc.exists) {
            logger.error(`[embedArticleWorkerLogic] Article ${articleData.id} not found in worker. Cannot embed.`);
            await jobRef.update({ articlesEmbeddedCount: FieldValue.increment(1) });
            return;
        }
        const article = articleDoc.data() as KnowledgeBaseArticleType;
        const tenantId = Number(article.tId);
        const storeId = Number(article.sId);
        if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) {
            throw new Error(`Article ${articleData.id} is missing tenant/store scope.`);
        }
        await bumpAnswerlatticeCacheVersion(firestoreAdmin, ANSWERLATTICE_CACHE_SOURCES.KB, tenantId, storeId, {
            reason: "article_embedding_update",
            sourceId: articleData.id,
            sourceType: "kb_article",
        });

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
            embedding: FieldValue.vector(embeddingVector),
            status: ARTICLE_STATUS.PUBLISHED,
            active: true,
            lastReviewedOn: Timestamp.now(),
            modifiedOn: Timestamp.now()
        });

        await jobRef.update({ articlesEmbeddedCount: FieldValue.increment(1) });
        logger.info(`[embedArticleWorkerLogic] Worker successfully re-embedded article ${articleData.id}.`);

    } catch (error: any) {
        logger.error(`[embedArticleWorkerLogic] Worker failed to re-embed article ${articleData.id}:`, error);
        await jobRef.update({ articlesEmbeddedCount: FieldValue.increment(1) });
    }
};
