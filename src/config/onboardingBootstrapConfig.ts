/**
 * Answerlattice — Founder Onboarding Bootstrap Configuration
 * 
 * Compatibility reference for the bounded knowledge bootstrap engine.
 * The active runtime copy lives in
 * functions-answerlattice/src/answerlattice/onboardingBootstrap.ts.
 * 
 * @see __docs__/answerlattice/founder-onboarding/founder-onboarding_impl.md §5
 */

export const ONBOARDING_BOOTSTRAP_CONFIG = {
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
