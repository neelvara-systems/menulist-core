import * as functions from 'firebase-functions';
import { extractGeminiUsageMetadata, recordEmbeddingOperation } from '../answerlattice/aiOperationAccounting';
import { ANSWERLATTICE_EMBEDDING_MODEL, ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY } from '../constants/ai';
import { vertexAIClient } from '../firebaseAdmin';
import { tiptapToText } from './tiptapUtils';

const EMBEDDING_MODEL = ANSWERLATTICE_EMBEDDING_MODEL;
const EMBEDDING_OUTPUT_DIMENSIONALITY = ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY;

const normalizeVector = (input: unknown): number[] => {
    if (!Array.isArray(input)) return [];
    return input.map((value) => Number(value)).filter((value) => Number.isFinite(value));
};

async function callVertexEmbedding(textToEmbed: string): Promise<any> {
    const project = (vertexAIClient as any).project;
    const location = (vertexAIClient as any).location || 'us-central1';
    const googleAuth = (vertexAIClient as any).googleAuth;

    if (!project || !googleAuth || typeof googleAuth.getAccessToken !== 'function') {
        throw new Error('Vertex AI embedding client is missing project or auth context.');
    }

    const accessToken = await googleAuth.getAccessToken();
    if (!accessToken) {
        throw new Error('Could not obtain Vertex AI access token for embedding request.');
    }

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${EMBEDDING_MODEL}:predict`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instances: [{
                content: textToEmbed,
                task_type: 'RETRIEVAL_DOCUMENT',
            }],
            parameters: {
                outputDimensionality: EMBEDDING_OUTPUT_DIMENSIONALITY,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Vertex AI embedding request failed with ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Answerlattice KB embedding helper.
 *
 * Uses Vertex AI from the Answerlattice Firebase project so KB regeneration and
 * publish jobs stay inside Answerlattice's cost/accounting boundary.
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
        const response = await callVertexEmbedding(textToEmbed);
        const embeddingValues = normalizeVector(
            response?.predictions?.[0]?.embeddings?.values
            || response?.predictions?.[0]?.values
            || response?.embeddings?.[0]?.values,
        );

        if (!embeddingValues.length) {
            throw new Error('Vertex AI returned an empty embedding.');
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
            articleId: article.id,
            error: error?.message || error,
        });
        throw new Error(`Embedding generation failed for article ${article.id}. message: ${error?.message || 'Unknown error'}`);
    }
};
