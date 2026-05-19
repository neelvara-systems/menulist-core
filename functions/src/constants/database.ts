/**
 * FIREBASE COLLECTIONS & DOCUMENT PATTERNS
 * ═══════════════════════════════════════════════════════════════
 * 
 * Centralized constants for all Firestore collection names and document patterns.
 * Mirrors frontend: src/constants/database.ts
 * 
 * IMPORTANT: Keep in sync with frontend constants when adding new collections.
 */

// ═══════════════════════════════════════════════════════════════
// COLLECTION NAMES
// ═══════════════════════════════════════════════════════════════

export const DB_COLLECTIONS = {
    // Platform & System
    PLATFORM_SUMMARY: 'platformSummary',
    SYSTEM: '_system',              // System locks, scheduler state
    HEALTH: '_health',              // Health check documents

    // Core Entities
    TENANTS: 'tenants',
    STORES: 'stores',
    USERS: 'users',
    PROJECTS: 'projects',

    // Analytics Collections
    ANALYTICS: 'analytics',                     // Customer-facing analytics (menu views, clicks)
    CHAT_ANALYTICS: 'chatAnalytics',            // Chat aggregated daily stats
    CHAT_SESSIONS: 'chatSessions',              // Individual chat sessions
    DECISION_BLOCKS: 'decisionBlocks',          // Precomputed decision block candidates

    // AI & Intelligence
    MENULIST_AI_EXTRACTION_OPERATIONS: 'MENULIST_AI_OPERATIONS', // Gemini extraction audit collection
    INSIGHTS: 'insights',                       // AI-generated insights (feedback, weekly narrative)
    AI: 'ai',                                   // Nested AI insight subcollection
    AI_SEARCH_HISTORY: 'aiSearchHistory',       // AI search query history
    QUERY_EMBEDDINGS: 'queryEmbeddings',        // Cached vector embeddings
    MENU_INTELLIGENCE: 'menuIntelligence',      // Continuous Menu Intelligence state (per-project)
    OWNER_CONTROL_USAGE: 'ownerControlUsage',   // Authority Maturation tracking (owner control usage)
    MENU_IMAGE_PROCESSING_JOBS: 'menuImageProcessingJobs',

    // Knowledge Base
    KNOWLEDGE_BASE: 'knowledgeBase',
    KB_CATEGORIES: 'kb_categories',
    KB_ARTICLES: 'kb_articles',
    KB_SECTIONS: 'kb_sections',
    KB_GENERATION_JOBS: 'kb_generation_jobs',
    KB_STAGING_SECTIONS: 'kb_staging_sections',
    KB_STAGING_CHUNKS: 'kb_staging_chunks',

    // Monitoring & Telemetry
    SYSTEM_TELEMETRY: 'systemTelemetry',        // System performance logs
    SYSTEM_ERRORS: 'systemErrors',              // Error tracking
    SYSTEM_ALERTS: 'systemAlerts',              // Alert notifications
    NEGATIVE_FEEDBACK_ALERTS: 'negativeFeedbackAlerts',

    // Menu Observation Layer (MOL v0)
    MENU_CHANGE_LOG: 'menuChangeLog',           // Immutable menu change history
    MENU_ITEM_STATE: 'menuItemState',           // Denormalized item state + drift metrics
    METRICS: 'metrics',                         // Nested menu item metrics subcollection

    // Canonical Truth Infrastructure — Menu Snapshots
    // Immutable point-in-time menu state on every publish
    // Path: menuSnapshots/{tId}/{sId}/{snapshotId}
    // @see __docs__/canonical-truth-infrastructure/
    MENU_SNAPSHOTS: 'menuSnapshots',

    // Subscriptions & Payments
    SUBSCRIPTIONS: 'subscriptions',
    SUBSCRIPTION_PAYMENTS: 'subscription_payments',
    PAYMENT_TRANSACTIONS: 'payment_transactions',

    // Support
    SUPPORT_TICKETS: 'supportTickets',
    FEEDBACK: 'feedback',

    // Guest Feedback (Internal Feedback System)
    GUEST_FEEDBACK: 'guestFeedback',

    // Messaging Onboarding (Zero-Friction SMB Acquisition Engine)
    // @see __docs__/messaging-onboarding/
    MESSAGING_ONBOARDING_SESSIONS: 'messagingOnboardingSessions',
    MESSAGING_ONBOARDING_INBOUND_MESSAGES: 'messagingOnboardingInboundMessages',
    MESSAGING_ONBOARDING_RATE_LIMITS: 'messagingOnboardingRateLimits',
    MESSAGING_ONBOARDING_EVENTS: 'messagingOnboardingEvents',

    // Reviews & Reputation (Pillar 3 — Reputation Protection)
    // @see __docs__/reviews-reputation/reviews-reputation_impl.md
    REVIEWS: 'reviews',
    REVIEWS_STATE: 'reviewsState',

    // Compliance Pages (Domain Activation Infrastructure)
    // @see __docs__/compliance-pages/
    COMPLIANCE_PAGES: 'compliancePages',

    // Operational Infrastructure (System Strengthening)
    // @see __docs__/cost-self-protection/
    // @see __docs__/ops-alerting-delivery/
    OPS_CONFIG: 'ops_config',              // System config (SAFE_MODE, deploy mute)

    // Lifecycle Messaging (Operational Messaging Infrastructure)
    // @see __docs__/lifecycle-messaging/
    MESSAGE_LOGS: 'messageLogs',            // Message send logs (idempotency + debugging)

    // Scheduler Monitoring (Nightly Scheduler Run Logs)
    // @see __docs__/decision-intelligence/
    SCHEDULER_RUN_LOGS: 'schedulerRunLogs', // Persisted run results for dashboard monitoring

    // System Health (Health check reports)
    SYSTEM_HEALTH: 'systemHealth',          // Health check snapshots per store per day

    // Auth Security
    AUTH_SECURITY_EVENTS: 'authSecurityEvents', // Login/auth security event log

    // Logging
    APPLICATION_LOGS: 'applicationLogs',    // Client-side application logs
    ERROR_LOGS: 'errorLogs',               // Client-side error logs

    // Reseller Dashboard (Assisted Onboarding Portal)
    // @see __docs__/reseller-dashboard/
    RESELLER_TRANSACTIONS: 'resellerTransactions',   // Immutable transaction log per reseller action
    RESELLER_PROFILES: 'resellerProfiles',           // Reseller profile with caps, counts, status

    // Public Menu Entry (No-Auth Menu Creation Pipeline)
    // @see __docs__/public-menu-entry/
    PUBLIC_MENU_DRAFTS: 'publicMenuDrafts',

    // ═══════════════════════════════════════════════════════════════
    // CANONICA — Support Knowledge Control Plane
    // @see __docs__/canonica/doctrine/05-architecture-evolution.md
    // ═══════════════════════════════════════════════════════════════
    CANONICA_ENTITIES: 'canonica_entities',
    CANONICA_ENTITY_RELATIONS: 'canonica_entityRelations',
    CANONICA_CANONICAL_ANSWERS: 'canonica_canonicalAnswers',
    CANONICA_RELEASES: 'canonica_releases',
    CANONICA_MUTATION_PROPOSALS: 'canonica_mutationProposals',
    CANONICA_SIGNAL_EVENTS: 'canonica_signalEvents',
    CANONICA_AUDIT_LOGS: 'canonica_auditLogs',
    CANONICA_ENTITY_SEARCH_INDEX: 'canonica_entitySearchIndex',
    CANONICA_ENTITY_CANDIDATES: 'canonica_entityCandidates',
    CANONICA_SCHEDULER_RUN_LOGS: 'canonica_schedulerRunLogs',

    // ═══════════════════════════════════════════════════════════════
    // INFRASTRUCTURE LAYER (AI Discovery & Machine Readability)
    // Cross-business discovery index — contains ONLY public business data.
    // Feature-flagged: ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX
    // @see __docs__/discovery-infrastructure/business-entity-index.md
    // ═══════════════════════════════════════════════════════════════
    BUSINESS_ENTITY_INDEX: 'businessEntityIndex',
} as const;

// ═══════════════════════════════════════════════════════════════
// DOCUMENT KEY PATTERNS
// ═══════════════════════════════════════════════════════════════

export const DOC_PATTERNS = {
    // Analytics document patterns
    ANALYTICS: {
        DAILY_PREFIX: 'daily',              // {tId}_{sId}_{projectId}_daily_{date}
        WEEKLY_PREFIX: 'weekly',            // {tId}_{sId}_{projectId}_weekly_{year-Wxx}
        MONTHLY_PREFIX: 'monthly',          // {tId}_{sId}_{projectId}_monthly_{year-mm}
        SUMMARY_SUFFIX: 'overall_summary',  // {tId}_{sId}_{projectId}_overall_summary
    },

    // Chat Analytics document patterns
    CHAT_ANALYTICS: {
        // Document ID: {tId}_{sId}_{date}
    },

    // Decision Blocks document patterns
    DECISION_BLOCKS: {
        // Document ID: {tId}_{sId}_{projectId}
    },
} as const;

// ═══════════════════════════════════════════════════════════════
// SYSTEM DOCUMENTS
// ═══════════════════════════════════════════════════════════════

export const SYSTEM_DOCS = {
    SCHEDULER_LOCK: 'schedulerLock',        // _system/schedulerLock
    STORES_SUMMARY: 'storesSummary',         // platformSummary/storesSummary
    PLATFORM_SUMMARY: 'summary',             // platformSummary/summary
} as const;

// ═══════════════════════════════════════════════════════════════
// TTL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const TTL_CONFIG = {
    ANALYTICS_DAILY_DAYS: 90,               // Keep daily analytics for 90 days
    CHAT_SESSIONS_DAYS: 365,                // Keep chat sessions for 1 year
    ERROR_LOGS_DAYS: 30,                    // Keep error logs for 30 days
    GUEST_FEEDBACK_DAYS: 90,                // Keep guest feedback for 90 days (privacy/cost)
} as const;

// ═══════════════════════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get ISO week number from date
 */
function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get week string (YYYY-Www) from date
 */
function getWeekStr(date: Date): string {
    const weekNum = getISOWeek(date);
    const year = date.getFullYear();
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Get month string (YYYY-MM) from date
 */
function getMonthStr(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get month date range from reference date
 * Returns the month string and first/last day of that month
 */
export function getMonthDateRange(referenceDate: Date): {
    monthStr: string;
    firstDay: Date;
    lastDay: Date;
} {
    const targetMonth = new Date(referenceDate);
    targetMonth.setDate(1); // Go to first of reference month
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    return {
        monthStr: getMonthStr(targetMonth),
        firstDay: new Date(year, month, 1),
        lastDay: new Date(year, month + 1, 0), // Last day = day 0 of next month
    };
}

/**
 * Get week date range from reference date
 * Returns the week string and start/end dates
 */
export function getWeekDateRange(referenceDate: Date): {
    weekStr: string;
    weekStart: Date;
    weekEnd: Date;
} {
    const weekEnd = new Date(referenceDate);
    const weekStart = new Date(referenceDate);
    weekStart.setDate(weekStart.getDate() - 6); // 7 days including end date

    return {
        weekStr: getWeekStr(referenceDate),
        weekStart,
        weekEnd,
    };
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ID HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate analytics document ID
 */
export const getAnalyticsDocId = {
    daily: (tId: string | number, sId: string | number, projectId: string, date: string) =>
        `${tId}_${sId}_${projectId}_${DOC_PATTERNS.ANALYTICS.DAILY_PREFIX}_${date}`,

    weekly: (tId: string | number, sId: string | number, projectId: string, referenceDate: Date) => {
        const weekStr = getWeekStr(referenceDate);
        return `${tId}_${sId}_${projectId}_${DOC_PATTERNS.ANALYTICS.WEEKLY_PREFIX}_${weekStr}`;
    },

    monthly: (tId: string | number, sId: string | number, projectId: string, referenceDate: Date) => {
        const monthStr = getMonthStr(referenceDate);
        return `${tId}_${sId}_${projectId}_${DOC_PATTERNS.ANALYTICS.MONTHLY_PREFIX}_${monthStr}`;
    },

    summary: (tId: string | number, sId: string | number, projectId: string) =>
        `${tId}_${sId}_${projectId}_${DOC_PATTERNS.ANALYTICS.SUMMARY_SUFFIX}`,

    // Prefix for querying daily documents (used in range queries)
    dailyPrefix: (tId: string | number, sId: string | number, projectId: string) =>
        `${tId}_${sId}_${projectId}_${DOC_PATTERNS.ANALYTICS.DAILY_PREFIX}_`,
};

/**
 * Generate chat analytics document ID
 */
export const getChatAnalyticsDocId = (tId: string | number, sId: string | number, date: string) =>
    `${tId}_${sId}_${date}`;

/**
 * Generate decision blocks document ID
 */
export const getDecisionBlocksDocId = (tId: string | number, sId: string | number, projectId: string) =>
    `${tId}_${sId}_${projectId}`;

/**
 * Generate menu intelligence document ID
 * Same pattern as Decision Blocks - project-level granularity
 */
export const getMenuIntelligenceDocId = (tId: string | number, sId: string | number, projectId: string) =>
    `${tId}_${sId}_${projectId}`;
