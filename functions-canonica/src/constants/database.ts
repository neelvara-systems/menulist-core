/**
 * Canonica Firebase Collections
 * 
 * Self-contained collection constants for Canonica Cloud Functions.
 * Only includes collections that Canonica CF actually reads/writes.
 * 
 * Copy-Paste As-Is Rule: Keep in sync with src/constants/database.ts (Canonica section)
 * and functions/src/constants/database.ts (Canonica section).
 * 
 * @see __docs__/canonica/doctrine/08-product-separation-playbook.md
 */

export const DB_COLLECTIONS = {
    // Shared infrastructure (read by Canonica nightly for KPI aggregation)
    PLATFORM_SUMMARY: 'platformSummary',
    AI_SEARCH_HISTORY: 'aiSearchHistory',
    STORES: 'stores',

    // Knowledge Base collections (live in Canonica Firestore)
    // Required by Founder Onboarding Bootstrap (Step 12)
    KB_CATEGORIES: 'kb_categories',
    KB_ARTICLES: 'kb_articles',
    KB_GENERATION_JOBS: 'kb_generation_jobs',
    MENU_IMAGE_PROCESSING_JOBS: 'menuImageProcessingJobs',
    CHANGELOG: 'changelog',

    // Canonica — Support Knowledge Control Plane
    // These collections live in CANONICA Firestore (separate project)
    CANONICA_ENTITIES: 'canonica_entities',
    CANONICA_ENTITY_RELATIONS: 'canonica_entityRelations',
    CANONICA_CANONICAL_ANSWERS: 'canonica_canonicalAnswers',
    CANONICA_RELEASES: 'canonica_releases',
    CANONICA_MUTATION_PROPOSALS: 'canonica_mutationProposals',
    CANONICA_SIGNAL_EVENTS: 'canonica_signalEvents',
    CANONICA_AUDIT_LOGS: 'canonica_auditLogs',
    CANONICA_ENTITY_SEARCH_INDEX: 'canonica_entitySearchIndex',
    CANONICA_ENTITY_CANDIDATES: 'canonica_entityCandidates',
    CANONICA_FRICTION_DAILY_STATS: 'canonica_frictionDailyStats',
    CANONICA_SCHEDULER_RUN_LOGS: 'canonica_schedulerRunLogs',
    CANONICA_CACHE_VERSIONS: 'canonica_cacheVersions',
    CANONICA_NOTIFICATION_LOGS: 'canonica_notificationLogs',
    CANONICA_CONTACT_ENQUIRIES: 'canonica_contactEnquiries',
    CANONICA_SUPPORT_BOARD_CARDS: 'canonica_supportBoardCards',

    // External Workflow Integrations (Expansion Item #7)
    // Append-only event log + delivery attempt logs
    // Feature-flagged: ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
    // @see __docs__/canonica/workflow-integrations/
    CANONICA_INTEGRATION_EVENTS: 'canonica_integrationEvents',
    CANONICA_INTEGRATION_DELIVERY_LOGS: 'canonica_integrationDeliveryLogs',
    CANONICA_INTEGRATION_RATE_LIMITS: 'canonica_integrationRateLimits',

    // Predictive Support (Expansion Item #12)
    // Rule-based proactive help triggers
    // Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
    // @see __docs__/canonica/predictive-support/
    CANONICA_PREDICTIVE_TRIGGERS: 'canonica_predictiveTriggers',

    // Product Surface Contexts
    // Owner-managed route/page/workflow map for context-aware retrieval.
    // @see __docs__/canonica/product-surface-contexts/
    CANONICA_PRODUCT_SURFACES: 'canonica_productSurfaces',

    // FAQ Management
    // Owner-reviewed short answers linked to articles, product surfaces, and entities.
    // @see __docs__/canonica/faq-management/
    CANONICA_FAQS: 'canonica_faqs',
} as const;
