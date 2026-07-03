import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { HttpsError } from "firebase-functions/v2/https";
import { bumpAnswerlatticeCacheVersion, ANSWERLATTICE_CACHE_SOURCES } from "../answerlattice/cacheVersionManifest";
import { firestoreAdmin } from "../firebaseAdmin";
import { KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType } from "../types";
import { genrateEmbedding } from "../utils/aiUtils";

const REGENERATE_EMBEDDING_FAILED_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_FAILED';
const REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND';
const REGENERATE_EMBEDDING_SCOPE_MISSING_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_SCOPE_MISSING';

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getRegenerateEmbeddingErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

export const regenerateEmbeddingLogic = async (articleId: string) => {
    const logger = functions.logger;
    logger.info('[regenerateEmbeddingLogic] Regenerating embedding', {
        articleIdLength: articleId.length,
    });

    try {
        const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
        const articleDoc = await articleRef.get();

        if (!articleDoc.exists) {
            throw new HttpsError('not-found', 'Article not found.', REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND_CODE);
        }

        const article = articleDoc.data() as KnowledgeBaseArticleType;
        const tenantId = Number(article.tId);
        const storeId = Number(article.sId);
        if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) {
            throw new HttpsError('failed-precondition', 'Article is missing tenant/store scope.', REGENERATE_EMBEDDING_SCOPE_MISSING_CODE);
        }
        await bumpAnswerlatticeCacheVersion(firestoreAdmin, ANSWERLATTICE_CACHE_SOURCES.KB, tenantId, storeId, {
            reason: "article_embedding_regenerate",
            sourceId: articleId,
            sourceType: "kb_article",
        });
        const articleToEmbed = {
            id: article.id,
            categoryTitle: article.categoryTitle,
            sectionTitle: article.sectionTitle || "",
            title: article.title,
            content: article.content,
            tId: tenantId,
            sId: storeId,
            source: "answerlattice_regenerate_embedding",
        }
        const embeddingVector = await genrateEmbedding(articleToEmbed);

        await articleRef.update({ embedding: FieldValue.vector(embeddingVector), modifiedOn: Timestamp.now() });

        logger.info('[regenerateEmbeddingLogic] Successfully regenerated embedding', {
            articleIdLength: articleId.length,
        });
        return { success: true, message: 'Embedding regenerated successfully.' };

    } catch (error: any) {
        logger.error('[regenerateEmbeddingLogic] Error regenerating embedding', {
            articleIdLength: articleId.length,
            failureCode: error instanceof HttpsError
                ? boundedDiagnosticValue(error.details) || REGENERATE_EMBEDDING_FAILED_CODE
                : REGENERATE_EMBEDDING_FAILED_CODE,
            ...getRegenerateEmbeddingErrorContext(error),
        });
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Could not regenerate embedding.', REGENERATE_EMBEDDING_FAILED_CODE);
    }
};
