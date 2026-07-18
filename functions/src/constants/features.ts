/**
 * Feature Flags Configuration for Firebase Functions
 * 
 * Toggle features on/off for testing, debugging, or gradual rollout.
 * Similar to client-side src/config/features.ts but for backend functions.
 */

export const FUNCTION_FLAGS = {
    /**
     * Enable Sentry error tracking for Firebase Functions
     * 
     * ✅ PRODUCTION-READY - Same Sentry project as frontend!
     * 
     * true: Enable Sentry tracking (errors, breadcrumbs, performance)
     * false: Disable Sentry completely (Firebase logger only)
     * 
     * How It Works:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * 🔧 WHEN ENABLED:
     *    - Errors → Sentry dashboard (with full context)
     *    - AI calls → Tracked as breadcrumbs
     *    - Processing → Performance transactions
     *    - All errors also go to Firebase Console logs
     * 
     * 🔇 WHEN DISABLED:
     *    - Errors → Firebase Console logs ONLY
     *    - No data sent to Sentry
     *    - Zero Sentry overhead
     *    - Logger still works (uses Firebase logger)
     * 
     * What Gets Tracked (when enabled):
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - ✅ Errors with full stack traces
     * - ✅ Processing context (projectId, fileId, action)
     * - ✅ AI call breadcrumbs (started, success, error)
     * - ✅ Milestones and performance metrics
     * - ✅ Circuit breaker state changes
     * 
     * Why Disable?
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Local development without Sentry noise
     * - Debugging specific issues with Firebase logs only
     * - Reducing Sentry quota usage during heavy testing
     * - Troubleshooting Sentry-related issues
     * 
     * Note: Firebase Console logs are ALWAYS captured regardless
     * of this flag. This only controls Sentry integration.
     * 
     * Production: ALWAYS keep this true
     * Development: Set to false for pure Firebase logging
     * 
     * Environment Override:
     * Set SENTRY_ENABLED=false in Firebase secrets to disable
     * without code changes.
     */
    ENABLE_SENTRY: true,

    /**
     * Enable Rate Limiting via Upstash Redis
     * 
     * true: Enforce rate limits (production)
     * false: Skip rate limiting checks (development)
     * 
     * Why Disable?
     * - Local development without Upstash setup
     * - Unlimited testing during development
     * - Debugging rate-limit related issues
     * 
     * Note: When disabled, checkExpensiveAIRateLimit() 
     * always returns { allowed: true }
     * 
     * Production: ALWAYS keep this true
     * Development: Set to false for easier testing
     */
    ENABLE_RATE_LIMITING: true,

    /**
     * Enable Circuit Breaker for AI calls
     * 
     * true: Use circuit breaker protection (production)
     * false: Direct AI calls without circuit breaker (debugging)
     * 
     * Why Disable?
     * - Testing AI error handling without circuit breaker
     * - Debugging specific AI-related issues
     * - Temporarily bypassing during known outages
     * 
     * WARNING: Disabling in production may cause cascade failures
     * if the AI service is experiencing issues.
     * 
     * Production: ALWAYS keep this true
     * Development: Keep true unless debugging circuit breaker
     */
    ENABLE_CIRCUIT_BREAKER: true,

    /**
     * Enable Guest Feedback Retention cleanup
     * 
     * Runs as part of nightly scheduler to delete expired guest feedback.
     * Feedback expires 90 days after creation (expiresOn field).
     * 
     * true: Delete expired guest feedback documents (production)
     * false: Skip retention cleanup (debugging/testing)
     * 
     * Why Disable?
     * - Testing feedback feature without auto-deletion
     * - Debugging retention logic
     * - Temporarily preserving data during investigation
     * 
     * @see __docs__/projects/internal-feedback-system/internal-feedback-system_spec.md
     */
    ENABLE_GUEST_FEEDBACK_RETENTION: true,

    /**
     * Enable Subscription Reconciliation in nightly scheduler
     * 
     * Runs as part of nightly scheduler to sync Firestore subscription
     * state with Razorpay's authoritative state. Safety net for webhook failures.
     * 
     * true: Fetch all active/past_due/paused subs and reconcile with Razorpay (production)
     * false: Skip reconciliation (development without Razorpay keys)
     * 
     * Requires: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as Firebase secrets
     * 
     * @see __docs__/razorpay/active-subscription-flow.md
     */
    ENABLE_SUBSCRIPTION_RECONCILIATION: true,

    /**
     * Enable OBP Analytics Aggregation in nightly scheduler
     * 
     * Aggregates OBP daily docs into weekly summaries per store.
     * Reads analytics/{tId}_{sId}_obp_daily_{date} docs.
     * 
     * true: Aggregate OBP analytics nightly (production)
     * false: Skip OBP aggregation (development)
     * 
     * @see __docs__/official-business-page/official-business-page_firebase.md
     */
    ENABLE_OBP_ANALYTICS: false,

    /**
     * Enable Special Menu Switching in nightly scheduler
     *
     * Checks all stores for special menus that need to activate or expire.
     * Activates scheduled menus whose startsAt has passed.
     * Deactivates active menus whose endsAt has passed.
     *
     * true: Process special menu transitions nightly (production)
     * false: Skip special menu check (development)
     *
     * @see __docs__/special-menu-switching/special-menu-switching_impl.md
     */
    ENABLE_SPECIAL_MENU_SWITCHING: true,

    /**
     * Enable Temp Status auto-set when special menu activates
     *
     * When a special menu is activated (by nightly scheduler or API),
     * automatically set a "special_menu" temp status banner on the store.
     *
     * @see __docs__/temp-status-layer/temp-status-layer_impl.md
     */
    ENABLE_TEMP_STATUS: true,

    // ═══════════════════════════════════════════════════════════════
    // INFRASTRUCTURE COMPOUNDING (MenuList Truth Engine)
    // @see __docs__/infrastructure-compounding/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extraction Learning Loop — Nightly aggregation of owner corrections
     *
     * Aggregates EXTRACTION_CORRECTION events from menuChangeLog into
     * platformSummary/extractionLearning for prompt improvement.
     *
     * true: Run nightly aggregation + inject patterns into extraction prompt
     * false: Skip aggregation (zero cost)
     *
     * @see __docs__/infrastructure-compounding/extraction-learning-loop_spec.md
     */
    ENABLE_EXTRACTION_LEARNING: true,

    /**
     * Store Truth Confidence Score — Nightly composite reliability score
     *
     * Computes 0-100 score per store from freshness, completeness,
     * stability, extraction confidence, and engagement signals.
     *
     * true: Compute and store scores nightly
     * false: Skip computation (zero cost)
     *
     * @see __docs__/infrastructure-compounding/store-truth-confidence_spec.md
     */
    ENABLE_STORE_TRUTH_CONFIDENCE: true,

    /**
     * Periodic Staleness Check — 90-day reconfirmation detection
     *
     * Identifies stores with staleFlag=true from storeTruthConfidence
     * and logs staleness events to messageLogs for lifecycle messaging.
     *
     * Requires: ENABLE_STORE_TRUTH_CONFIDENCE must be true
     *
     * true: Detect stale stores and log for messaging
     * false: Skip detection (zero cost)
     *
     * @see __docs__/infrastructure-compounding/periodic-staleness-check_spec.md
     */
    ENABLE_STALENESS_CHECK: true,

    /**
     * Owner Business Assistant / Business Health read-model builder.
     *
     * Enabled for owner testing. The existing store-local nightly scheduler
     * writes compact health and analytics read models into platformSummary. No
     * provider calls happen in the builder.
     *
     * @see __docs__/owner-business-assistant/
     */
    ENABLE_OWNER_BUSINESS_HEALTH: true,
    ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX: true,
    ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY: true,
    ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING: true,
    ENABLE_OWNER_BUSINESS_HEALTH_THREADS: true,

    /** Write the project-embedded customer-facing Decision Blocks projection. */
    ENABLE_DECISION_BLOCKS_SCORING: true,

    /** Write the private scheduler-owned Continuous Menu Intelligence state. */
    ENABLE_CONTINUOUS_MENU_INTELLIGENCE: true,

    // ═══════════════════════════════════════════════════════════════
    // RESELLER DASHBOARD (Assisted Onboarding Portal)
    // @see __docs__/reseller-dashboard/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Enable Reseller Dashboard license expiry check in nightly scheduler
     *
     * Checks all billingMode:'manual' subscriptions and expires
     * those past validUntil + 7-day grace period.
     *
     * true: Run expiry check in nightly scheduler
     * false: Skip expiry check
     *
     * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
     */
    ENABLE_RESELLER_DASHBOARD: true,

    // ═══════════════════════════════════════════════════════════════
    // INFRASTRUCTURE LAYER (AI Discovery & Machine Readability)
    // Mirror of src/config/features.ts infrastructure flags.
    // @see __docs__/discovery-infrastructure/README.md
    // ═══════════════════════════════════════════════════════════════

    /** Offering Taxonomy System — disabled builder utility (static data, zero cost) */
    ENABLE_INFRASTRUCTURE_TAXONOMY: false,

    /** Field-Level Provenance Metadata — disabled utility types */
    ENABLE_INFRASTRUCTURE_PROVENANCE: false,

    /** Semantic Attribute Registry — disabled builder utility (static data, zero cost) */
    ENABLE_INFRASTRUCTURE_SEMANTIC_ATTRIBUTES: false,

    /** Business Entity Discovery Index — disabled builder utility, PUBLIC data only */
    ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX: false,

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC MENU ENTRY (Controlled Free Preview Pipeline)
    // @see __docs__/public-menu-entry/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Public Menu Entry — Nightly cleanup of expired drafts
     *
     * Deletes expired publicMenuDrafts receipts. Unclaimed sources are deleted
     * with their Storage object; claimed project sources are preserved.
     *
     * true: Clean up expired drafts in nightly scheduler
     * false: Skip cleanup
     *
     * @see __docs__/public-menu-entry/public-menu-entry_impl.md
     */
    ENABLE_PUBLIC_MENU_ENTRY: true,

    /**
     * Maps Place Check — owner/admin-only public place evidence check.
     *
     * Uses Gemini with Google Maps grounding through the existing GenAI
     * Functions gateway. Defaults off because each grounded result can carry
     * provider cost and source-display obligations.
     *
     * @see __docs__/menulist-tools/maps-place-check/
     */
    ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK: false,

    /**
     * Menu Link Import — owner-provided public menu links.
     *
     * Function guard for jobs created through /api/menu-link-imports.
     * Keep in sync with src/config/features.ts for rollback symmetry.
     *
     * @see __docs__/menu-link-import/
     */
    ENABLE_MENU_LINK_IMPORT: true,

    /**
     * Owner Notifications
     *
     * Shared owner/account notification core for MenuList lifecycle messages.
     * Runs inside existing trigger/scheduler paths; no new standalone scheduled
     * Cloud Function is introduced.
     *
     * @see __docs__/owner-notifications/
     */
    ENABLE_OWNER_NOTIFICATIONS: true,
    ENABLE_OWNER_NOTIFICATION_EMAIL: true,
    ENABLE_OWNER_NOTIFICATION_WHATSAPP: false,
    ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION: true,

    /**
     * Platform-owner alert delivery.
     *
     * Uses systemAlerts as the event source. Email sends through SMTP when
     * PLATFORM_ALERT_EMAIL_TO or INTERNAL_NOTIFICATION_EMAIL is configured.
     * WhatsApp sends through Meta outbound config when PLATFORM_ALERT_WHATSAPP_TO
     * and either a template or active-session flag is configured.
     */
    ENABLE_PLATFORM_ALERT_EMAIL: true,
    ENABLE_PLATFORM_ALERT_WHATSAPP: true,

} as const;

export const FUNCTION_RETENTION_CONFIG = {
    AI_OPERATION_DETAIL_RETENTION_DAYS: 14,
    AI_OPERATION_LOG_MODE: 'accounting_only' as 'accounting_only' | 'detailed',
    IMAGE_BATCH_ITEMS_RETENTION_DAYS: 7,
    IMAGE_BATCH_JOB_RETENTION_DAYS: 30,
    IMAGE_BATCH_STATUS_HISTORY_LIMIT: 20,
    MENU_EXTRACTION_DETAIL_RETENTION_HOURS: 2,
    MENU_SNAPSHOT_RETENTION_DAYS: 90,
    OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS: 2,
    OWNER_NOTIFICATION_RETENTION_DAYS: 30,
    FEEDBACK_EVENT_RETENTION_DAYS: 180,
    SCHEDULER_RUN_LOG_RETENTION_DAYS: 90,
    SYSTEM_ALERT_RETENTION_DAYS: 90,
} as const;

/**
 * Helper to check if a function feature is enabled
 * Also checks for environment variable overrides
 */
export function parseFunctionFeatureOverride(value: string | undefined): boolean | null {
    if (value === undefined) return null;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return null;
}

export function isFunctionFeatureEnabled(feature: keyof typeof FUNCTION_FLAGS): boolean {
    // Check environment variable override first
    // Format: FEATURE_NAME=false (e.g., SENTRY_ENABLED=false). An invalid
    // configured override fails closed instead of silently enabling work.
    const envKey = feature.replace('ENABLE_', '') + '_ENABLED';
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
        return parseFunctionFeatureOverride(envValue) ?? false;
    }

    return FUNCTION_FLAGS[feature];
}
