/**
 * Canonica — Founder Onboarding Bootstrap Configuration
 * 
 * Thresholds, limits, and constants for the knowledge bootstrap engine.
 * Used by both frontend (progress display) and CF (engine logic via copy).
 * 
 * @see __docs__/canonica/founder-onboarding/founder-onboarding_impl.md §5
 */

export const ONBOARDING_BOOTSTRAP_CONFIG = {
    // Entity auto-promotion thresholds
    AUTO_PROMOTE_MIN_CONFIDENCE: 0.7,
    AUTO_PROMOTE_MIN_ARTICLE_REFS: 2,

    // Per-run caps (Firebase cost protection)
    MAX_ENTITIES_PER_RUN: 50,
    MAX_DRAFTS_PER_RUN: 50,
    MAX_ARTICLES_TO_PROCESS: 300,

    // Article batch size for extraction
    EXTRACTION_BATCH_SIZE: 5,

    // Minimum articles to trigger bootstrap
    MIN_ARTICLES_FOR_BOOTSTRAP: 5,

    // Skip bootstrap if entities already exist for tenant
    SKIP_IF_ENTITIES_EXIST: false,
} as const;

export type OnboardingBootstrapStatus = 'pending' | 'extracting' | 'promoting' | 'drafting' | 'completed' | 'failed';
