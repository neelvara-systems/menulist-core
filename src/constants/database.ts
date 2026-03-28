export const DB_COLLECTIONS = {
    PLATFORM_SUMMARY: "platformSummary",
    LANDING_PAGE_ENQUIRIES: "landingPageEnquiries",

    TENANTS: "tenants",
    STORES: "stores",
    APPLICATION_LOGS: "applicationLogs",
    ERROR_LOGS: "errorLogs",
    MENULIST_AI_OPERATIONS: "menulistAiOperations",
    COMMON: "common", //contains both ecomsai and craftbuilder data
    BLOGS: "blogs",
    PRICING_PLANS: "pricingPlans",
    SUBSCRIPTIONS: "subscriptions",
    SUBSCRIPTION_PAYMENTS: "subscription_payments",
    PAYMENT_TRANSACTIONS: "payment_transactions",
    TOPUPS: "topups",
    ANALYTICS: "analytics",
    //users collections
    USERS: "users",
    SHIFTS: "shifts",
    BREAKS: "breaks",
    USERS_SCHEDULES: "usersSchedules",

    SUPPORT_TICKETS: "supportTickets",
    FEEDBACK: "feedback",
    AI_HELP_CENTER_FEEDBACK: "aiHelpCenterFeedback",
    AI_SEARCH_HISTORY: "aiSearchHistory",
    CHAT_SESSIONS: "chatSessions",
    CHAT_ANALYTICS: "chatAnalytics", // Aggregated daily stats (cost-optimized)
    QUERY_EMBEDDINGS: "queryEmbeddings", // Cache for vector embeddings to avoid repeated API calls
    WEEKLY_DIGESTS: "weeklyDigests", // AI-generated weekly performance summaries

    //Knowledge Base Collections
    KB_CATEGORIES: "kb_categories",
    KB_ARTICLES: "kb_articles",
    KB_GENERATION_JOBS: "kb_generation_jobs",
    KB_STAGING_SECTIONS: "kb_staging_sections",
    KB_STAGING_CHUNKS: "kb_staging_chunks",
    KB_REVIEW_TASKS: "kb_review_tasks",
    KB_AI_RUNS: "kb_ai_runs",
    KB_SECTIONS: "kb_sections",

    CHANGELOG: "changelog",
    CHANGELOG_FEEDBACK: "changelog_feedback",
    ARTICLE_FEEDBACK: "article_feedback",

    //apps collections
    TODOS: "todos",
    TODOS_METADATA: "todosMetadata",
    NOTES: "notes",
    NOTES_METADATA: "notesMetadata",

    PROJECTS: "projects",
    FILES: "files",
    DECISION_BLOCKS: "decisionBlocks", // Precomputed Decision Block candidates (nightly scoring)
    MENU_INTELLIGENCE: "menuIntelligence", // Continuous Menu Intelligence state (per-project, nightly)
    ASSETS: "assets",
    IMAGE_BATCH_PROCESSING_JOBS: "imageBatchProcessingJobs",
    MENU_IMAGE_PROCESSING_JOBS: "menuImageProcessingJobs", // AI menu extraction job queue

    // Social Content / Campaigns
    CAMPAIGNS: "campaigns",
    CAMPAIGN_EXPORTS: "campaignExports",

    // Owner Control Usage (Authority Maturation Tracking)
    OWNER_CONTROL_USAGE: "ownerControlUsage",

    // Menu Observation Layer (MOL v0) - Silent infrastructure
    // @see __docs__/MOL-V0-IMPLEMENTATION-PLAN.md
    MENU_CHANGE_LOG: "menuChangeLog", // Immutable change history
    MENU_ITEM_STATE: "menuItemState", // Denormalized item state
    TELEMETRY: "telemetry", // Cost & performance tracking

    // Canonical Truth Infrastructure — Menu Snapshots
    // Immutable point-in-time menu state on every publish
    // Path: menuSnapshots/{tId}/{sId}/{snapshotId}
    // @see __docs__/canonical-truth-infrastructure/
    MENU_SNAPSHOTS: "menuSnapshots",

    // Guest Feedback (Internal Feedback System)
    // @see __docs__/projects/internal-feedback-system/
    GUEST_FEEDBACK: "guestFeedback", // Public guest feedback (anonymous)

    // Integrations (Feature #3: GBP Sync)
    // Path: tenants/{tId}/integrations/gbp/{sId}
    // @see __docs__/gbp-sync/GBP_SYNC_impl.md
    INTEGRATIONS: "integrations",

    // Master Updates Awareness Layer (Feature #4.1)
    // @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
    MASTER_OPERATIONAL_STATE: "masterOperationalState",

    // POS Webhook Sync (Menu Snapshot Broadcast)
    // @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md
    POS_DELIVERY_QUEUE: "posDeliveryQueue",

    // Messaging Onboarding (Zero-Friction SMB Acquisition Engine)
    // @see __docs__/messaging-onboarding/
    MESSAGING_ONBOARDING_SESSIONS: "messagingOnboardingSessions",
    MESSAGING_ONBOARDING_RATE_LIMITS: "messagingOnboardingRateLimits",
    MESSAGING_ONBOARDING_EVENTS: "messagingOnboardingEvents",

    // Reviews & Reputation (Pillar 3 — Reputation Protection)
    // Path: reviews/{tId}/{sId}/{reviewId} (raw GBP review data, immutable)
    // Path: reviewsState/{tId}/{sId}/{reviewId} (classification + block/escalation state)
    // @see __docs__/reviews-reputation/reviews-reputation_impl.md
    REVIEWS: "reviews",
    REVIEWS_STATE: "reviewsState",

    // Compliance Pages (Domain Activation Infrastructure)
    // Doc ID: {sId} — one doc per store
    // @see __docs__/compliance-pages/
    COMPLIANCE_PAGES: "compliancePages",

    // Operational Infrastructure (System Strengthening)
    // @see __docs__/cost-self-protection/
    // @see __docs__/ops-alerting-delivery/
    OPS_CONFIG: "ops_config",              // System config (SAFE_MODE, deploy mute)
    SYSTEM_ALERTS: "systemAlerts",         // Alert notifications

    // Lifecycle Messaging (Operational Messaging Infrastructure)
    // @see __docs__/lifecycle-messaging/
    MESSAGE_LOGS: "messageLogs",            // Message send logs (idempotency + debugging)

    // Scheduler Monitoring (Nightly Scheduler Run Logs)
    // @see __docs__/decision-intelligence/
    SCHEDULER_RUN_LOGS: "schedulerRunLogs", // Persisted run results for dashboard monitoring

    // Reseller Dashboard (Assisted Onboarding Portal)
    // @see __docs__/reseller-dashboard/
    RESELLER_TRANSACTIONS: "resellerTransactions",   // Immutable transaction log per reseller action
    RESELLER_PROFILES: "resellerProfiles",           // Reseller profile with caps, counts, status

    // ═══════════════════════════════════════════════════════════════
    // CANONICA — Support Knowledge Control Plane
    // ⚠️  These collections live in CANONICA Firestore (separate project), NOT ecomsai.
    // DAL files use canonicaFirebaseClient, not firebaseClient.
    // @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
    // ═══════════════════════════════════════════════════════════════
    CANONICA_ENTITIES: "canonica_entities",                       // Product ontology entities (features, plans, roles, workflows, states, integrations, errors)
    CANONICA_ENTITY_RELATIONS: "canonica_entityRelations",       // Explicit typed relationships between entities
    CANONICA_CANONICAL_ANSWERS: "canonica_canonicalAnswers",     // Governed, versioned, scoped knowledge assets
    CANONICA_RELEASES: "canonica_releases",                       // Append-only product release timeline
    CANONICA_MUTATION_PROPOSALS: "canonica_mutationProposals",   // Governed mutation queue (signal → knowledge)
    CANONICA_SIGNAL_EVENTS: "canonica_signalEvents",             // Raw friction events (tickets, chat negative, escalations)
    CANONICA_AUDIT_LOGS: "canonica_auditLogs",                   // Append-only audit trail for all governance actions
    CANONICA_ENTITY_SEARCH_INDEX: "canonica_entitySearchIndex",  // Deterministic entity lookup (inverted index + synonyms)
    CANONICA_ENTITY_CANDIDATES: "canonica_entityCandidates",     // Staging for AI-extracted entity candidates (pre-approval)
    CANONICA_FRICTION_DAILY_STATS: "canonica_frictionDailyStats", // Daily per-entity friction metrics (Expansion Item #5)

    // External Workflow Integrations (Expansion Item #7)
    // Append-only event log + delivery attempt logs
    // Feature-flagged: ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
    // @see __docs__/canonica/workflow-integrations/
    CANONICA_INTEGRATION_EVENTS: "canonica_integrationEvents",
    CANONICA_INTEGRATION_DELIVERY_LOGS: "canonica_integrationDeliveryLogs",

    // Predictive Support (Expansion Item #12)
    // Rule-based proactive help triggers
    // Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
    // @see __docs__/canonica/predictive-support/
    CANONICA_PREDICTIVE_TRIGGERS: "canonica_predictiveTriggers",

    // ═══════════════════════════════════════════════════════════════
    // INFRASTRUCTURE LAYER (AI Discovery & Machine Readability)
    // Cross-business discovery index — contains ONLY public business data.
    // Feature-flagged: ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX
    // @see __docs__/discovery-infrastructure/business-entity-index.md
    // ═══════════════════════════════════════════════════════════════
    BUSINESS_ENTITY_INDEX: "businessEntityIndex",

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC MENU ENTRY (No-Auth Menu Creation Pipeline)
    // @see __docs__/public-menu-entry/
    // ═══════════════════════════════════════════════════════════════
    PUBLIC_MENU_DRAFTS: "publicMenuDrafts",
};

export const FONT_PRESET_ASSET_COLLECTION = "fontPreset";

export const AI_OPERATIONS_COLLECTIONS = {
    BACKGROUND_REMOVAL: "backgroundRemovals",
    AI_CREDIT_TRANSACTIONS: "aiCreditTransactions",
    IMAGE_COMPRESSION: "imageCompression",
    IMAGE_GENERATION: "imageGeneration",
    TEXT_SUGGESTIONS: "textSuggestions",
    LANGUAGE_TRANSLATION: "languageTranslation",
    IMAGE_TRANSLATION: "imageTranslation",
};
