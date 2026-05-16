import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { HttpsError } from "firebase-functions/v2/https";
import { bumpCanonicaCacheVersion, CANONICA_CACHE_SOURCES } from "../canonica/cacheVersionManifest";
import { firestoreAdmin } from "../firebaseAdmin";
import { KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType } from "../types";
import { genrateEmbedding } from "../utils/aiUtils";

export const regenerateEmbeddingLogic = async (articleId: string) => {
    const logger = functions.logger;
    logger.info(`[regenerateEmbeddingLogic] Regenerating embedding. with article id ${articleId}`);

    try {
        const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
        const articleDoc = await articleRef.get();

        if (!articleDoc.exists) {
            throw new HttpsError('not-found', `Article with ID ${articleId} not found.`);
        }

        const article = articleDoc.data() as KnowledgeBaseArticleType;
        const tenantId = Number(article.tId);
        const storeId = Number(article.sId);
        if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) {
            throw new HttpsError('failed-precondition', `Article ${articleId} is missing tenant/store scope.`);
        }
        await bumpCanonicaCacheVersion(firestoreAdmin, CANONICA_CACHE_SOURCES.KB, tenantId, storeId, {
            reason: "article_embedding_regenerate",
            sourceId: articleId,
            sourceType: "kb_article",
        });
        const articleToEmbed = {
            id: article.id,
            categoryTitle: article.categoryTitle,
            sectionTitle: article.sectionTitle || "",
            title: article.title,
            content: article.content
        }
        const embeddingVector = await genrateEmbedding(articleToEmbed);

        await articleRef.update({ embedding: FieldValue.vector(embeddingVector), modifiedOn: Timestamp.now() });

        logger.info(`[regenerateEmbeddingLogic] Successfully regenerated embedding. with article id ${articleId}`);
        return { success: true, message: 'Embedding regenerated successfully.' };

    } catch (error: any) {
        logger.error(`[regenerateEmbeddingLogic] Error regenerating embedding: with article id ${articleId}`, error);
        throw new HttpsError('internal', `Failed to regenerate embedding for article ${articleId}.`, error.message);
    }
};
