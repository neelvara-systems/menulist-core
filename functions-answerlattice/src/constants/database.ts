/**
 * Answerlattice Firebase Collections
 * 
 * Self-contained collection constants for Answerlattice Cloud Functions.
 * Only includes collections that Answerlattice CF actually reads/writes.
 * 
 * Copy-Paste As-Is Rule: Keep in sync with src/constants/database.ts (Answerlattice section)
 * and functions/src/constants/database.ts (Answerlattice section).
 * 
 * @see __docs__/answerlattice/doctrine/08-product-separation-playbook.md
 */

export const DB_COLLECTIONS = {
    // Shared infrastructure (read by Answerlattice nightly for KPI aggregation)
    PLATFORM_SUMMARY: 'platformSummary',
    AI_SEARCH_HISTORY: 'aiSearchHistory',
    QUERY_EMBEDDINGS: 'queryEmbeddings',
    STORES: 'stores',

    // Knowledge Base collections (live in Answerlattice Firestore)
    // Required by Founder Onboarding Bootstrap (Step 12)
    KB_CATEGORIES: 'kb_categories',
    KB_ARTICLES: 'kb_articles',
    KB_GENERATION_JOBS: 'kb_generation_jobs',
    MENU_IMAGE_PROCESSING_JOBS: 'menuImageProcessingJobs',
    CHANGELOG: 'changelog',

    // Answerlattice — Governed Answer Infrastructure
    // These collections live in ANSWERLATTICE Firestore (separate project)
    ANSWERLATTICE_ENTITIES: 'answerlattice_entities',
    ANSWERLATTICE_ENTITY_RELATIONS: 'answerlattice_entityRelations',
    ANSWERLATTICE_CANONICAL_ANSWERS: 'answerlattice_canonicalAnswers',
    ANSWERLATTICE_RELEASES: 'answerlattice_releases',
    ANSWERLATTICE_MUTATION_PROPOSALS: 'answerlattice_mutationProposals',
    ANSWERLATTICE_SIGNAL_EVENTS: 'answerlattice_signalEvents',
    ANSWERLATTICE_AUDIT_LOGS: 'answerlattice_auditLogs',
    ANSWERLATTICE_ENTITY_SEARCH_INDEX: 'answerlattice_entitySearchIndex',
    ANSWERLATTICE_ENTITY_CANDIDATES: 'answerlattice_entityCandidates',
    ANSWERLATTICE_FRICTION_DAILY_STATS: 'answerlattice_frictionDailyStats',
    ANSWERLATTICE_SCHEDULER_RUN_LOGS: 'answerlattice_schedulerRunLogs',
    ANSWERLATTICE_CACHE_VERSIONS: 'answerlattice_cacheVersions',
    ANSWERLATTICE_NOTIFICATION_LOGS: 'answerlattice_notificationLogs',
    OWNER_NOTIFICATION_EVENTS: 'ownerNotificationEvents',
    OWNER_NOTIFICATION_DELIVERIES: 'ownerNotificationDeliveries',
    OWNER_NOTIFICATION_RATE_LIMITS: 'ownerNotificationRateLimits',
    ANSWERLATTICE_CONTACT_ENQUIRIES: 'answerlattice_contactEnquiries',
    ANSWERLATTICE_SUPPORT_BOARD_CARDS: 'answerlattice_supportBoardCards',
    ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS: 'answerlattice_knowledgeIntakeJobs',
    ANSWERLATTICE_KNOWLEDGE_SOURCES: 'answerlattice_knowledgeSources',
    ANSWERLATTICE_INTAKE_REVIEW_ITEMS: 'answerlattice_intakeReviewItems',
    ANSWERLATTICE_INTAKE_USAGE_LEDGER: 'answerlattice_intakeUsageLedger',

    // External Workflow Integrations (Expansion Item #7)
    // Append-only event log + delivery attempt logs
    // Feature-flagged: ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
    // @see __docs__/answerlattice/workflow-integrations/
    ANSWERLATTICE_INTEGRATION_EVENTS: 'answerlattice_integrationEvents',
    ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS: 'answerlattice_integrationDeliveryLogs',
    ANSWERLATTICE_INTEGRATION_RATE_LIMITS: 'answerlattice_integrationRateLimits',

    // Predictive Support (Expansion Item #12)
    // Rule-based proactive help triggers
    // Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
    // @see __docs__/answerlattice/predictive-support/
    ANSWERLATTICE_PREDICTIVE_TRIGGERS: 'answerlattice_predictiveTriggers',

    // Product Surface Contexts
    // Owner-managed route/page/workflow map for context-aware retrieval.
    // @see __docs__/answerlattice/product-surface-contexts/
    ANSWERLATTICE_PRODUCT_SURFACES: 'answerlattice_productSurfaces',

    // FAQ Management
    // Owner-reviewed short answers linked to articles, product surfaces, and entities.
    // @see __docs__/answerlattice/faq-management/
    ANSWERLATTICE_FAQS: 'answerlattice_faqs',
} as const;
