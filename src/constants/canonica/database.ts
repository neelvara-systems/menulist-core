/**
 * Canonica Firestore collection names.
 *
 * Canonica runs on a dedicated Firebase project. These names are re-exported
 * through the root DB collection map for shared helper compatibility, but this
 * file is the product-local source for Canonica-specific collection constants.
 */

export const CANONICA_DB_COLLECTIONS = {
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
    CANONICA_AI_OPERATIONS: 'canonica_aiOperations',
    CANONICA_CACHE_VERSIONS: 'canonica_cacheVersions',
    CANONICA_NOTIFICATION_LOGS: 'canonica_notificationLogs',
    CANONICA_CONTACT_ENQUIRIES: 'canonica_contactEnquiries',
    CANONICA_INTEGRATION_EVENTS: 'canonica_integrationEvents',
    CANONICA_INTEGRATION_DELIVERY_LOGS: 'canonica_integrationDeliveryLogs',
    CANONICA_INTEGRATION_RATE_LIMITS: 'canonica_integrationRateLimits',
    CANONICA_PREDICTIVE_TRIGGERS: 'canonica_predictiveTriggers',
    CANONICA_PRODUCT_SURFACES: 'canonica_productSurfaces',
    CANONICA_FAQS: 'canonica_faqs',
    CANONICA_SUPPORT_BOARD_CARDS: 'canonica_supportBoardCards',
    CANONICA_KNOWLEDGE_INTAKE_JOBS: 'canonica_knowledgeIntakeJobs',
    CANONICA_KNOWLEDGE_SOURCES: 'canonica_knowledgeSources',
    CANONICA_INTAKE_REVIEW_ITEMS: 'canonica_intakeReviewItems',
    CANONICA_INTAKE_USAGE_LEDGER: 'canonica_intakeUsageLedger',
    CANONICA_PUBLIC_HELP_SITES: 'canonica_publicHelpSites',
} as const;
