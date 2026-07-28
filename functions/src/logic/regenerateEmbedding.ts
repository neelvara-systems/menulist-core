import * as logger from 'firebase-functions/logger';
import { HttpsError } from 'firebase-functions/v2/https';
import { bumpAnswerlatticeCacheVersion, ANSWERLATTICE_CACHE_SOURCES } from '../answerlattice/cacheVersionManifest';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    ArticleEmbeddingInProgressError,
    embedStoredAnswerlatticeArticle,
    PermanentArticleEmbeddingError,
} from './articleEmbedding';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

const REGENERATE_EMBEDDING_FAILED_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_FAILED';
const REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND';
const REGENERATE_EMBEDDING_IN_PROGRESS_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_IN_PROGRESS';

function getRegenerateEmbeddingErrorContext(articleId: string, error: unknown) {
    const context = getBoundedFunctionsErrorContext(error);
    return {
        articleIdLength: articleId.length,
        sourceErrorName: context.sourceErrorName || typeof error,
        ...(context.sourceErrorCode ? { sourceErrorCode: context.sourceErrorCode } : {}),
        ...(context.sourceStatusCode !== undefined ? { sourceStatusCode: context.sourceStatusCode } : {}),
    };
}

export async function regenerateEmbeddingLogic(articleId: string) {
    try {
        const result = await embedStoredAnswerlatticeArticle({
            articleId,
            force: true,
            source: 'answerlattice_regenerate_embedding',
        });
        await bumpAnswerlatticeCacheVersion(
            firestoreAdmin,
            ANSWERLATTICE_CACHE_SOURCES.KB,
            result.scope.tId,
            result.scope.sId,
            {
                reason: 'article_embedding_regenerate',
                sourceId: result.articleId,
                sourceType: 'kb_article',
            },
        );
        logger.info('[Answerlattice KB] Article embedding regenerated', {
            articleIdLength: result.articleId.length,
            vectorDimensions: result.vectorDimensions,
        });
        return {
            success: true,
            articleId: result.articleId,
            vectorDimensions: result.vectorDimensions,
        };
    } catch (error) {
        const failureCode = error instanceof PermanentArticleEmbeddingError
            ? REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND_CODE
            : error instanceof ArticleEmbeddingInProgressError
                ? REGENERATE_EMBEDDING_IN_PROGRESS_CODE
                : REGENERATE_EMBEDDING_FAILED_CODE;
        logger.error('[Answerlattice KB] Article embedding regeneration failed', {
            failureCode,
            ...getRegenerateEmbeddingErrorContext(articleId, error),
        });
        if (error instanceof PermanentArticleEmbeddingError) {
            throw new HttpsError('not-found', 'Article not found.', {
                code: REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND_CODE,
            });
        }
        if (error instanceof ArticleEmbeddingInProgressError) {
            throw new HttpsError('aborted', 'Article embedding is already running.', {
                code: REGENERATE_EMBEDDING_IN_PROGRESS_CODE,
            });
        }
        throw new HttpsError('internal', 'Could not regenerate embedding.', {
            code: REGENERATE_EMBEDDING_FAILED_CODE,
        });
    }
}
