/**
 * Answerlattice Firestore collection names.
 *
 * Answerlattice runs on a dedicated Firebase project. These names are re-exported
 * through the root DB collection map for shared helper compatibility, but this
 * file is the product-local source for Answerlattice-specific collection constants.
 */

export const ANSWERLATTICE_DB_COLLECTIONS = {
    ANSWERLATTICE_ENTITIES: 'answerlattice_entities',
    ANSWERLATTICE_ENTITY_SLUG_INDEX: 'answerlattice_entitySlugIndex',
    ANSWERLATTICE_ENTITY_RELATIONS: 'answerlattice_entityRelations',
    ANSWERLATTICE_CANONICAL_ANSWERS: 'answerlattice_canonicalAnswers',
    ANSWERLATTICE_RELEASES: 'answerlattice_releases',
    ANSWERLATTICE_CHANGELOG_ENTRY_INDEX: 'answerlattice_changelogEntryIndex',
    ANSWERLATTICE_MUTATION_PROPOSALS: 'answerlattice_mutationProposals',
    ANSWERLATTICE_SIGNAL_EVENTS: 'answerlattice_signalEvents',
    ANSWERLATTICE_AUDIT_LOGS: 'answerlattice_auditLogs',
    ANSWERLATTICE_ENTITY_SEARCH_INDEX: 'answerlattice_entitySearchIndex',
    ANSWERLATTICE_ENTITY_CANDIDATES: 'answerlattice_entityCandidates',
    ANSWERLATTICE_FRICTION_DAILY_STATS: 'answerlattice_frictionDailyStats',
    ANSWERLATTICE_SCHEDULER_RUN_LOGS: 'answerlattice_schedulerRunLogs',
    ANSWERLATTICE_AI_OPERATIONS: 'answerlattice_aiOperations',
    ANSWERLATTICE_AI_CAPACITY_RESERVATIONS: 'answerlattice_aiCapacityReservations',
    ANSWERLATTICE_CACHE_VERSIONS: 'answerlattice_cacheVersions',
    ANSWERLATTICE_NOTIFICATION_LOGS: 'answerlattice_notificationLogs',
    OWNER_NOTIFICATION_EVENTS: 'ownerNotificationEvents',
    OWNER_NOTIFICATION_DELIVERIES: 'ownerNotificationDeliveries',
    OWNER_NOTIFICATION_RATE_LIMITS: 'ownerNotificationRateLimits',
    ANSWERLATTICE_CONTACT_ENQUIRIES: 'answerlattice_contactEnquiries',
    ANSWERLATTICE_INTEGRATION_EVENTS: 'answerlattice_integrationEvents',
    ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS: 'answerlattice_integrationDeliveryLogs',
    ANSWERLATTICE_INTEGRATION_RATE_LIMITS: 'answerlattice_integrationRateLimits',
    ANSWERLATTICE_PREDICTIVE_TRIGGERS: 'answerlattice_predictiveTriggers',
    ANSWERLATTICE_PRODUCT_SURFACES: 'answerlattice_productSurfaces',
    ANSWERLATTICE_FAQS: 'answerlattice_faqs',
    ANSWERLATTICE_SUPPORT_BOARD_CARDS: 'answerlattice_supportBoardCards',
    ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS: 'answerlattice_knowledgeIntakeJobs',
    ANSWERLATTICE_KNOWLEDGE_SOURCES: 'answerlattice_knowledgeSources',
    ANSWERLATTICE_INTAKE_REVIEW_ITEMS: 'answerlattice_intakeReviewItems',
    ANSWERLATTICE_INTAKE_USAGE_LEDGER: 'answerlattice_intakeUsageLedger',
    ANSWERLATTICE_PUBLIC_HELP_SITES: 'answerlattice_publicHelpSites',
} as const;
