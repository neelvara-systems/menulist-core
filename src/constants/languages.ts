/**
 * Language Constants for Multi-Chain Language Governance
 * 
 * @see __docs__/projects/multi-language-translation/multi-language-translation_spec.md
 * @see __docs__/projects/multi-language-translation/multi-language-translation_impl.md
 */

export const LANGUAGE_CONSTANTS = {
    /**
     * Maximum languages per project to prevent Firestore doc size issues
     * 
     * Rationale:
     * - 120 items × 150 chars × 6 languages ≈ 108KB
     * - With JSON overhead + other data ≈ 200-300KB
     * - Safe for SMB ICP (2-10 stores, max 4-5 languages typically)
     * - Firestore limit: 1MB per document
     */
    MAX_LANGUAGES_PER_PROJECT: 6,

    /**
     * Internal monitoring threshold - warn admin at this size
     * Used for proactive monitoring before hitting hard limits
     */
    DOC_SIZE_WARNING_KB: 500,

    /**
     * Block new languages at this size
     * Safety margin before Firestore's 1MB hard limit
     */
    DOC_SIZE_BLOCK_KB: 900,

    /**
     * System fallback language
     * Used when:
     * 1. URL ?lang= not provided
     * 2. store.defaultLanguage not set
     * 3. Requested language not available in project
     */
    FALLBACK_LANGUAGE: 'en',
} as const;

/**
 * Type for language constants
 */
export type LanguageConstantsType = typeof LANGUAGE_CONSTANTS;
