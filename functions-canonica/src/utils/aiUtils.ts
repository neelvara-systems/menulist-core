import * as functions from 'firebase-functions';
import { vertexAIClient } from '../firebaseAdmin';
import { tiptapToText } from './tiptapUtils';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_OUTPUT_DIMENSIONALITY = 768;

const normalizeVector = (input: unknown): number[] => {
    if (!Array.isArray(input)) return [];
    return input.map((value) => Number(value)).filter((value) => Number.isFinite(value));
};

/**
 * Canonica KB embedding helper.
 *
 * Uses Vertex AI from the Canonica Firebase project so KB regeneration and
 * publish jobs stay inside Canonica's cost/accounting boundary.
 */
export const genrateEmbedding = async (article: {
    id: string;
    categoryTitle: string;
    sectionTitle?: string;
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
        const embeddingModel = vertexAIClient.getGenerativeModel({ model: EMBEDDING_MODEL });
        const request = {
            contents: [{ parts: [{ text: textToEmbed }] }],
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_OUTPUT_DIMENSIONALITY,
        };
        const response = await (embeddingModel as any).embedContents(request);
        const embeddingValues = normalizeVector(response?.embeddings?.[0]?.values);

        if (!embeddingValues.length) {
            throw new Error('Vertex AI returned an empty embedding.');
        }

        return embeddingValues;
    } catch (error: any) {
        logger.error('[Canonica KB] Embedding generation failed', {
            articleId: article.id,
            error: error?.message || error,
        });
        throw new Error(`Embedding generation failed for article ${article.id}. message: ${error?.message || 'Unknown error'}`);
    }
};
