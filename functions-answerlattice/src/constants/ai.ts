export const ANSWERLATTICE_TEXT_MODEL = 'gemini-2.5-flash';

// Keep this model until existing article/query vectors are re-embedded.
export const ANSWERLATTICE_EMBEDDING_MODEL = 'gemini-embedding-001';
export const ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY = 768;
export const ANSWERLATTICE_EMBEDDING_CACHE_VERSION =
    `${ANSWERLATTICE_EMBEDDING_MODEL}:${ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY}:v1`;

