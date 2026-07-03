import * as functions from 'firebase-functions';
import { extractGeminiUsageMetadata, recordEmbeddingOperation } from '../answerlattice/aiOperationAccounting';
import { ANSWERLATTICE_EMBEDDING_MODEL, ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY } from '../constants/ai';
import { answerlatticeGenAIClient } from '../genAiClient';
import { tiptapToText } from './tiptapUtils';

const EMBEDDING_MODEL = ANSWERLATTICE_EMBEDDING_MODEL;
const EMBEDDING_OUTPUT_DIMENSIONALITY = ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY;
const ANSWERLATTICE_EMBEDDING_FAILED_CODE = 'ANSWERLATTICE_ARTICLE_EMBEDDING_FAILED';
const ANSWERLATTICE_EMBEDDING_FAILED_MESSAGE = 'Embedding generation failed';

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getEmbeddingErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

function getEmbeddingArticleContext(article: { id: string; categoryTitle: string; sectionTitle?: string; title: string; content: any; sId?: number; source?: string; tId?: number }): Record<string, string | number | boolean | null> {
    return {
        articleIdLength: article.id?.length || 0,
        categoryTitleLength: article.categoryTitle?.length || 0,
        sectionTitleLength: article.sectionTitle?.length || 0,
        titleLength: article.title?.length || 0,
        hasContent: Boolean(article.content),
        hasTenantScope: article.tId != null,
        hasStoreScope: article.sId != null,
        sourceLength: article.source?.length || 0,
    };
}

const normalizeVector = (input: unknown): number[] => {
    if (!Array.isArray(input)) return [];
    return input.map((value) => Number(value)).filter((value) => Number.isFinite(value));
};

/**
 * Answerlattice KB embedding helper.
 *
 * Uses the Answerlattice GenAI gateway so KB regeneration and publish jobs use
 * product-owned Gemini API credentials while keeping the embedding shape stable.
 */
export const genrateEmbedding = async (article: {
    id: string;
    categoryTitle: string;
    sectionTitle?: string;
    sId?: number;
    source?: string;
    tId?: number;
    title: string;
    content: any;
}): Promise<number[]> => {
    const logger = functions.logger;
    const textToEmbed = [
        article.categoryTitle,
        article.sectionTitle,
        article.title,
        tiptapToText(article.content),
    ].filter(Boolean).join('\n\n');

    if (!textToEmbed.trim()) {
        throw new Error('Article content is empty, cannot generate embedding.');
    }

    try {
        const startedAt = Date.now();
        const response: any = await answerlatticeGenAIClient.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: textToEmbed,
            config: {
                outputDimensionality: EMBEDDING_OUTPUT_DIMENSIONALITY,
                taskType: 'RETRIEVAL_DOCUMENT',
            },
        });
        const embeddingValues = normalizeVector(
            response?.embeddings?.[0]?.values
            || response?.predictions?.[0]?.embeddings?.values
            || response?.predictions?.[0]?.values,
        );

        if (!embeddingValues.length) {
            throw new Error('Google GenAI returned an empty embedding.');
        }

        const tenantId = Number(article.tId);
        const storeId = Number(article.sId);
        if (Number.isFinite(tenantId) && Number.isFinite(storeId)) {
            await recordEmbeddingOperation({
                articleId: article.id,
                dimensions: embeddingValues.length,
                processingTime: Date.now() - startedAt,
                sId: storeId,
                source: article.source || 'answerlattice_kb_embedding',
                textToEmbed,
                tId: tenantId,
                usageMetadata: extractGeminiUsageMetadata(response, textToEmbed),
            });
        }

        return embeddingValues;
    } catch (error: any) {
        logger.error('[Answerlattice KB] Embedding generation failed', {
            failureCode: ANSWERLATTICE_EMBEDDING_FAILED_CODE,
            ...getEmbeddingArticleContext(article),
            ...getEmbeddingErrorContext(error),
        });
        throw new Error(ANSWERLATTICE_EMBEDDING_FAILED_MESSAGE);
    }
};
