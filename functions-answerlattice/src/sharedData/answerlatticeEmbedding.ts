export const ANSWERLATTICE_EMBEDDING_VERSION = 'v1' as const;
export type AnswerlatticeEmbeddingVersion = typeof ANSWERLATTICE_EMBEDDING_VERSION;

export type AnswerlatticeEmbeddingPurpose = 'query' | 'document';

export const ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG = {
    cacheVersion: 'gemini-embedding-2:768:v1',
    model: 'gemini-embedding-2',
    outputDimensionality: 768,
    vectorField: 'embedding',
    version: ANSWERLATTICE_EMBEDDING_VERSION,
} as const;

export function formatAnswerlatticeEmbeddingContent(params: {
    content: string;
    purpose: AnswerlatticeEmbeddingPurpose;
    title?: string;
}): string {
    const content = String(params.content || '').replace(/\s+/g, ' ').trim();
    if (params.purpose === 'query') return `task: question answering | query: ${content}`;
    const title = String(params.title || '').replace(/\s+/g, ' ').trim() || 'none';
    return `title: ${title} | text: ${content}`;
}

export function buildAnswerlatticeEmbeddingRequest(params: {
    content: string;
    purpose: AnswerlatticeEmbeddingPurpose;
    title?: string;
}) {
    return {
        model: ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.model,
        contents: formatAnswerlatticeEmbeddingContent(params),
        config: {
            outputDimensionality: ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.outputDimensionality,
        },
    };
}
