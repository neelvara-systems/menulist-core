import * as logger from 'firebase-functions/logger';
import { HttpsError } from 'firebase-functions/v2/https';
import { bumpAnswerlatticeCacheVersion, ANSWERLATTICE_CACHE_SOURCES } from '../answerlattice/cacheVersionManifest';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    ArticleEmbeddingInProgressError,
    embedStoredAnswerlatticeArticle,
    PermanentArticleEmbeddingError,
} from './articleEmbedding';

const REGENERATE_EMBEDDING_FAILED_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_FAILED';
const REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND';
const REGENERATE_EMBEDDING_IN_PROGRESS_CODE = 'ANSWERLATTICE_REGENERATE_EMBEDDING_IN_PROGRESS';

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') return value.slice(0, 120);
    return null;
}

function getRegenerateEmbeddingErrorContext(articleId: string, error: unknown) {
    const sourceError = error as { code?: unknown; status?: unknown };
    const sourceErrorCode = boundedDiagnosticValue(sourceError?.code);
    const sourceStatusCode = boundedDiagnosticValue(sourceError?.status);
    return {
        articleIdLength: articleId.length,
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        ...(sourceErrorCode ? { sourceErrorCode } : {}),
        ...(sourceStatusCode ? { sourceStatusCode } : {}),
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
