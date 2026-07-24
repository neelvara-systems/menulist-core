import * as functionsLogger from 'firebase-functions/logger';
import { extractGeminiUsageMetadata, recordEmbeddingOperation } from '../answerlattice/aiOperationAccounting';
import { answerlatticeGenAIClient } from '../genAiClient';
import {
    ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG,
    buildAnswerlatticeEmbeddingRequest,
} from '../sharedData/answerlatticeEmbedding';
import { tiptapToText } from './tiptapUtils';

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
type AnswerlatticeEmbeddingArticle = {
    id: string;
    categoryTitle: string;
    sectionTitle?: string;
    sId?: number;
    source?: string;
    tId?: number;
    title: string;
    content: any;
};

export const genrateEmbedding = async (
    article: AnswerlatticeEmbeddingArticle,
): Promise<number[]> => {
    const logger = functionsLogger;
    const rawTextToEmbed = [
        article.categoryTitle,
        article.sectionTitle,
        article.title,
        tiptapToText(article.content),
    ].filter(Boolean).join('\n\n');

    if (!rawTextToEmbed.trim()) {
        throw new Error('Article content is empty, cannot generate embedding.');
    }

    try {
        const embeddingConfig = ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG;
        const request = buildAnswerlatticeEmbeddingRequest({
            content: rawTextToEmbed,
            purpose: 'document',
            title: article.title,
        });
        const textToEmbed = request.contents;
        const startedAt = Date.now();
        const response: any = await answerlatticeGenAIClient.models.embedContent(request);
        const embeddingValues = normalizeVector(
            response?.embeddings?.[0]?.values
            || response?.predictions?.[0]?.embeddings?.values
            || response?.predictions?.[0]?.values,
        );

        if (
            embeddingValues.length !== embeddingConfig.outputDimensionality
            || !embeddingValues.some((value) => Number.isFinite(value) && value !== 0)
        ) {
            throw new Error('Google GenAI returned an invalid embedding.');
        }

        const tenantId = article.tId;
        const storeId = article.sId;
        if (
            typeof tenantId === 'number'
            && typeof storeId === 'number'
            && Number.isSafeInteger(tenantId)
            && Number.isSafeInteger(storeId)
            && tenantId > 0
            && storeId > 0
        ) {
            await recordEmbeddingOperation({
                articleId: article.id,
                dimensions: embeddingValues.length,
                processingTime: Date.now() - startedAt,
                sId: storeId,
                source: article.source || 'answerlattice_kb_embedding',
                textToEmbed,
                tId: tenantId,
                usageMetadata: extractGeminiUsageMetadata(response, textToEmbed),
                model: embeddingConfig.model,
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
