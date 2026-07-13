export const ANSWERLATTICE_EMBEDDING_VERSIONS = {
    V1: 'v1',
    V2: 'v2',
} as const;

export type AnswerlatticeEmbeddingVersion =
    typeof ANSWERLATTICE_EMBEDDING_VERSIONS[keyof typeof ANSWERLATTICE_EMBEDDING_VERSIONS];

export type AnswerlatticeEmbeddingPurpose = 'query' | 'document';

export const ANSWERLATTICE_EMBEDDING_CONFIGS = {
    v1: {
        cacheVersion: 'gemini-embedding-001:768:v1',
        model: 'gemini-embedding-001',
        outputDimensionality: 768,
        vectorField: 'embedding',
        version: ANSWERLATTICE_EMBEDDING_VERSIONS.V1,
    },
    v2: {
        cacheVersion: 'gemini-embedding-2:768:v2',
        model: 'gemini-embedding-2',
        outputDimensionality: 768,
        vectorField: 'embeddingV2',
        version: ANSWERLATTICE_EMBEDDING_VERSIONS.V2,
    },
} as const;

export const ANSWERLATTICE_ACTIVE_EMBEDDING_VERSION = ANSWERLATTICE_EMBEDDING_VERSIONS.V2;
export const ANSWERLATTICE_LEGACY_EMBEDDING_VERSION = ANSWERLATTICE_EMBEDDING_VERSIONS.V1;
export const ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG =
    ANSWERLATTICE_EMBEDDING_CONFIGS[ANSWERLATTICE_ACTIVE_EMBEDDING_VERSION];
export const ANSWERLATTICE_LEGACY_EMBEDDING_CONFIG =
    ANSWERLATTICE_EMBEDDING_CONFIGS[ANSWERLATTICE_LEGACY_EMBEDDING_VERSION];

export function getAnswerlatticeEmbeddingConfig(version: AnswerlatticeEmbeddingVersion) {
    return ANSWERLATTICE_EMBEDDING_CONFIGS[version];
}

export function formatAnswerlatticeEmbeddingContent(params: {
    content: string;
    purpose: AnswerlatticeEmbeddingPurpose;
    title?: string;
    version: AnswerlatticeEmbeddingVersion;
}): string {
    const content = String(params.content || '').replace(/\s+/g, ' ').trim();
    if (params.version === ANSWERLATTICE_EMBEDDING_VERSIONS.V1) return content;
    if (params.purpose === 'query') return `task: question answering | query: ${content}`;
    const title = String(params.title || '').replace(/\s+/g, ' ').trim() || 'none';
    return `title: ${title} | text: ${content}`;
}

export function getAnswerlatticeLegacyTaskType(purpose: AnswerlatticeEmbeddingPurpose):
    'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' {
    return purpose === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY';
}

export function buildAnswerlatticeEmbeddingRequest(params: {
    content: string;
    purpose: AnswerlatticeEmbeddingPurpose;
    title?: string;
    version: AnswerlatticeEmbeddingVersion;
}) {
    const embeddingConfig = getAnswerlatticeEmbeddingConfig(params.version);
    return {
        model: embeddingConfig.model,
        contents: formatAnswerlatticeEmbeddingContent(params),
        config: {
            outputDimensionality: embeddingConfig.outputDimensionality,
            ...(params.version === ANSWERLATTICE_EMBEDDING_VERSIONS.V1 ? {
                taskType: getAnswerlatticeLegacyTaskType(params.purpose),
                ...(params.purpose === 'document' && params.title ? { title: params.title } : {}),
            } : {}),
        },
    };
}
