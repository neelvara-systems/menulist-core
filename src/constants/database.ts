import { ANSWERLATTICE_DB_COLLECTIONS } from './answerlattice/database';

export const DB_COLLECTIONS = {
    PLATFORM_SUMMARY: "platformSummary",
    LANDING_PAGE_ENQUIRIES: "landingPageEnquiries",

    TENANTS: "tenants",
    STORES: "stores",
    APPLICATION_LOGS: "applicationLogs",
    ERROR_LOGS: "errorLogs",
    MENULIST_AI_OPERATIONS: "menulistAiOperations",
    MENULIST_AI_EXTRACTION_OPERATIONS: "MENULIST_AI_OPERATIONS", // Cloud Functions extraction audit collection
    COMMON: "common", //contains shared MenuList and craftbuilder data
    BLOGS: "blogs",
    PRICING_PLANS: "pricingPlans",
    SUBSCRIPTIONS: "subscriptions",
    SUBSCRIPTION_PAYMENTS: "subscription_payments",
    PAYMENT_TRANSACTIONS: "payment_transactions",
    FOUNDER_REVENUE_MOVEMENTS: "founderRevenueMovements",
    FOUNDER_ONBOARDING_TRANSITIONS: "founderOnboardingTransitions",
    RAZORPAY_WEBHOOK_EVENTS: "razorpayWebhookEvents",
    TOPUPS: "topups",
    ANALYTICS: "analytics",
    INSIGHTS: "insights",
    AI: "ai",
    //users collections
    USERS: "users",
    STAFF_STORE_ACCESS_STATE: "staffStoreAccessState",
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
    MENU_INTELLIGENCE: "menuIntelligence", // Continuous Menu Intelligence state (per-project, nightly)
    ASSETS: "assets",
    AI_IMAGE_PROMPT_CACHE: "aiImagePromptCache",
    IMAGE_BATCH_PROCESSING_JOBS: "imageBatchProcessingJobs",
    MENU_IMAGE_PROCESSING_JOBS: "menuImageProcessingJobs", // AI menu extraction job queue
    MENU_LINK_IMPORT_ARTIFACTS: "menuLinkImportArtifacts", // Owner-provided URL import source artifacts

    // Social Content / Campaigns
    CAMPAIGNS: "campaigns",
    CAMPAIGN_EXPORTS: "campaignExports",

    // Creative Editor Template Registry
    // Platform path: platformAssetTemplates/{businessCategory}
    // Store path: storeAssetTemplates/{tId}/{sId}/default
    CREATIVE_EDITOR_PLATFORM_ASSET_TEMPLATES: "platformAssetTemplates",
    STORE_ASSET_TEMPLATES: "storeAssetTemplates",

    // GrowthOS Add-on / Growth Kits
    GROWTHOS_KITS: "growthosKits",
    GROWTHOS_EXPORTS: "growthosExports",

    // Owner Control Usage (Authority Maturation Tracking)
    OWNER_CONTROL_USAGE: "ownerControlUsage",

    // Owner Business Assistant / Business Health workflow docs
    // Core health and analytics read models live in PLATFORM_SUMMARY.
    OWNER_BUSINESS_ASSISTANT_THREADS: "ownerBusinessAssistantThreads",
    OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS: "ownerBusinessAssistantAnswerEvents",
    OWNER_BUSINESS_ASSISTANT_FEEDBACK: "ownerBusinessAssistantFeedback",

    // Owner-to-owner referral attribution and reward issue state.
    OWNER_REFERRALS: "ownerReferrals",

    // AI Menu Manager / Menu Manager
    // Compact proposal-driven owner operation layer.
    // Path: aiMenuManagerSessions/{sessionId}
    // Path: aiMenuManagerProposals/{proposalId}
    // Path: aiMenuManagerRules/{ruleId}
    AI_MENU_MANAGER_SESSIONS: "aiMenuManagerSessions",
    AI_MENU_MANAGER_PROPOSALS: "aiMenuManagerProposals",
    AI_MENU_MANAGER_RULES: "aiMenuManagerRules",

    // Menu Observation Layer (MOL v0) - Silent infrastructure
    // @see __docs__/mol-v0-implementation-plan.md
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
    FEEDBACK_EVENTS: "feedbackEvents", // Internal MOL-style feedback event log

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
    POS_DELIVERY_LOGS: "posDeliveryLogs",

    // Messaging Onboarding (Zero-Friction SMB Acquisition Engine)
    // @see __docs__/messaging-onboarding/
    MESSAGING_ONBOARDING_SESSIONS: "messagingOnboardingSessions",
    MESSAGING_ONBOARDING_INBOUND_MESSAGES: "messagingOnboardingInboundMessages",
    MESSAGING_ONBOARDING_RATE_LIMITS: "messagingOnboardingRateLimits",
    MESSAGING_ONBOARDING_EVENTS: "messagingOnboardingEvents",

    // Reviews & Reputation (Pillar 3 — Reputation Protection)
    // Path: reviews/{tId}/{sId}/{reviewId} (raw GBP review data, immutable)
    // Path: reviewsState/{reviewId}; tId/sId fields own classification + block/escalation state
    // @see __docs__/reviews-reputation/reviews-reputation_impl.md
    REVIEWS: "reviews",
    REVIEWS_STATE: "reviewsState",

    // Compliance Pages (Domain Activation Infrastructure)
    // Doc ID: {sId} — one doc per store
    // @see __docs__/compliance-pages/
    COMPLIANCE_PAGES: "compliancePages",

    // Public routing admin audit
    // @see __docs__/client-menu/public-routing-doctrine.md
    SUBDOMAIN_RENAME_LOG: "subdomainRenameLog",

    // Operational Infrastructure (System Strengthening)
    // @see __docs__/cost-self-protection/
    // @see __docs__/ops-alerting-delivery/
    OPS_CONFIG: "ops_config",              // System config (SAFE_MODE, deploy mute)
    SYSTEM_ALERTS: "systemAlerts",         // Alert notifications
    SYSTEM_HEALTH: "systemHealth",         // Hourly subsystem health snapshots

    // Lifecycle Messaging (Operational Messaging Infrastructure)
    // @see __docs__/lifecycle-messaging/
    MESSAGE_LOGS: "messageLogs",            // Message send logs (idempotency + debugging)

    // Owner Notifications (Owner/account-critical email + WhatsApp notices)
    // @see __docs__/owner-notifications/
    OWNER_NOTIFICATION_EVENTS: "ownerNotificationEvents",
    OWNER_NOTIFICATION_DELIVERIES: "ownerNotificationDeliveries",
    OWNER_NOTIFICATION_RATE_LIMITS: "ownerNotificationRateLimits",

    // Phone OTP Auth (WhatsApp-first owner authentication)
    // Server-only collections used by /api/auth/phone-otp/* and NextAuth.
    AUTH_PHONE_OTP_CHALLENGES: "authPhoneOtpChallenges",
    AUTH_PHONE_OTP_LOGIN_TOKENS: "authPhoneOtpLoginTokens",

    // Scheduler Monitoring (Nightly Scheduler Run Logs)
    // @see __docs__/decision-intelligence/
    SCHEDULER_RUN_LOGS: "schedulerRunLogs", // Persisted run results for dashboard monitoring

    // Reseller Dashboard (Assisted Onboarding Portal)
    // @see __docs__/reseller-dashboard/
    RESELLER_TRANSACTIONS: "resellerTransactions",   // Immutable transaction log per reseller action
    RESELLER_PROFILES: "resellerProfiles",           // Reseller profile with caps, counts, status

    // ═══════════════════════════════════════════════════════════════
    // ANSWERLATTICE — Governed Answer Infrastructure
    // These collections live in ANSWERLATTICE Firestore (separate project), NOT MenuList.
    // DAL files use answerlatticeFirebaseClient, not firebaseClient.
    // @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md
    // ═══════════════════════════════════════════════════════════════
    ...ANSWERLATTICE_DB_COLLECTIONS,

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
