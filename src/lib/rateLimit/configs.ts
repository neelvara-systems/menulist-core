/**
 * Rate Limit Configurations by Feature/Endpoint
 * 
 * Centralized rate limit configs organized by feature type.
 * This makes it easy to adjust limits for different endpoints.
 */

export interface RateLimitConfig {
    limit: number;      // Max requests allowed
    window: number;     // Time window in seconds
    description: string;
}

/**
 * Rate limit configurations by feature/endpoint type
 */
export const RATE_LIMIT_CONFIGS = {
    /**
     * AI Operations - Fast operations (text-based AI)
     * Used by: Descriptions, translations, metadata generation, chat, embeddings
     */
    AI_OPERATION: {
        limit: 20,
        window: 60,
        description: 'Fast AI operations - 20 requests per minute'
    },

    /**
     * AI Operations - Expensive/slow operations
     * Used by: Image processing, image generation, file uploads
     * These operations take 20-40 seconds each
     */
    AI_EXPENSIVE: {
        limit: 5,
        window: 60,
        description: 'Expensive AI operations - 5 requests per minute'
    },

    /**
     * Batch Operations - Very expensive
     * Used by: Batch image generation triggers
     * Can spawn multiple Cloud Tasks
     */
    BATCH_OPERATION: {
        limit: 3,
        window: 300, // 5 minutes
        description: 'Batch operations - 3 per 5 minutes'
    },

    /**
     * Knowledge Base Search - Moderate cost
     * Used by: Regular search endpoints without AI
     */
    KB_SEARCH: {
        limit: 60,
        window: 60,
        description: 'KB search - 60 requests per minute'
    },

    /**
     * Authentication - Security critical
     * Used by: Login, signup, password reset
     */
    AUTH_LOGIN: {
        limit: 5,
        window: 300,  // 5 minutes
        description: 'Login attempts - 5 per 5 minutes'
    },

    AUTH_PASSWORD_RESET: {
        limit: 3,
        window: 3600,  // 1 hour
        description: 'Password reset - 3 per hour'
    },

    AUTH_EMAIL_VERIFY: {
        limit: 3,
        window: 600,  // 10 minutes
        description: 'Email verification - 3 per 10 minutes'
    },

    /**
     * Phone OTP Auth - WhatsApp code delivery.
     * Used by: POST /api/auth/phone-otp/start
     *
     * Why 3/15min:
     * - WhatsApp OTP is a paid outbound operation.
     * - Normal owners need one send and sometimes one resend.
     * - IP and phone-hash keys are both applied by the route.
     */
    AUTH_PHONE_OTP_SEND: {
        limit: 3,
        window: 900,
        description: 'Phone OTP send - 3 per 15 minutes per IP/phone'
    },

    /**
     * Phone OTP Auth - code verification attempts.
     * Used by: POST /api/auth/phone-otp/verify
     *
     * Why 5/10min:
     * - A six-digit OTP has enough entropy only when attempts stay bounded.
     * - Challenge documents also enforce per-challenge maxAttempts.
     */
    AUTH_PHONE_OTP_VERIFY: {
        limit: 5,
        window: 600,
        description: 'Phone OTP verify - 5 per 10 minutes per IP/challenge'
    },

    /**
     * File Operations - Expensive
     * Used by: File upload, image processing
     */
    FILE_UPLOAD: {
        limit: 10,
        window: 60,
        description: 'File upload - 10 per minute'
    },

    /**
     * Data Mutations - Write operations
     * Used by: Create, update, delete operations
     */
    DATA_WRITE: {
        limit: 50,
        window: 60,
        description: 'Data write operations - 50 per minute'
    },

    /**
     * Data Reads - Cheap operations
     * Used by: Get, list, read operations
     */
    DATA_READ: {
        limit: 200,
        window: 60,
        description: 'Data read operations - 200 per minute'
    },

    /**
     * Webhooks - External integrations
     * Used by: Webhook endpoints
     */
    WEBHOOK: {
        limit: 1000,
        window: 60,
        description: 'Webhooks - 1000 per minute'
    },

    /**
     * Public API - Rate limit for public/external access
     * Used by: Public API endpoints
     */
    PUBLIC_API: {
        limit: 100,
        window: 60,
        description: 'Public API - 100 per minute'
    },

    /**
     * Answerlattice Contact Form - anonymous public write endpoint
     * Used by: POST /api/answerlattice/public/contact
     *
     * Why 5/10min:
     * - Normal buyer/contact flow is one submission, rarely a retry.
     * - Each accepted request creates an Answerlattice Firestore write.
     * - Keeps public website spam bounded before it reaches Answerlattice Firebase.
     */
    ANSWERLATTICE_CONTACT_FORM: {
        limit: 5,
        window: 600,
        description: 'Answerlattice contact form - 5 submissions per 10 minutes per IP'
    },

    /**
     * Answerlattice Hosted Help Center - anonymous read-only pages.
     * Used by: help.example.com hosted KB/FAQ/changelog pages.
     *
     * Why 240/min:
     * - Page data is cached and read-only, so normal browsing should not feel capped.
     * - Still creates a bot-cost brake before repeated anonymous page requests
     *   can force server rendering or cache misses.
     */
    ANSWERLATTICE_HOSTED_HELP: {
        limit: 240,
        window: 60,
        description: 'Answerlattice hosted help - 240 page/API reads per minute per IP/domain'
    },

    /**
     * Answerlattice Public Context Bundles - anonymous Storage-backed JSON reads.
     * Used by: GET /api/answerlattice/bundles/public/[...path]
     *
     * Why 180/min:
     * - A normal widget boot reads a small fixed set of JSON bundle files.
     * - In-memory proxy caching absorbs hot paths.
     * - Cache misses still need a bot-cost brake before repeated random paths
     *   can force Storage existence checks/download attempts.
     */
    ANSWERLATTICE_PUBLIC_BUNDLE: {
        limit: 180,
        window: 60,
        description: 'Answerlattice public context bundles - 180 cache-miss reads per minute per IP'
    },

    /**
     * Public Analytics - Anonymous customer analytics flushes
     * Used by: POST /api/public/analytics/track
     *
     * Why 120/min:
     * - Public menu/OBP/customer-app events are client-coalesced before flush.
     * - Allows normal customer bursts from a shared network.
     * - Still blocks abusive anonymous write loops before they reach Firestore.
     */
    PUBLIC_ANALYTICS: {
        limit: 120,
        window: 60,
        description: 'Public analytics - 120 coalesced flushes per minute per IP'
    },

    /**
     * Screen Seen Signal - anonymous daily liveness signal.
     * Used by: POST /api/screen/seen
     *
     * Why 120/hour per IP:
     * - Screens should normally send at most one useful signal per day.
     * - Shared networks may host several displays.
     * - Token/store-level limiting is stricter in the route; this IP cap blocks
     *   random-token read loops before Firestore lookup.
     */
    SCREEN_SEEN_SIGNAL: {
        limit: 120,
        window: 3600,
        description: 'Screen seen signal - 120 per hour per IP'
    },

    /**
     * Public Dynamic Assets - anonymous PWA icon/screenshot generation.
     * Used by: GET /api/app-icons/* and /api/app-screenshots/*
     *
     * Why 60/min:
     * - Legitimate install flows request a small fixed set of cached URLs.
     * - Random storeId probes can otherwise force Firestore reads plus image
     *   rendering before CDN cache can help.
     */
    PUBLIC_DYNAMIC_ASSET: {
        limit: 60,
        window: 60,
        description: 'Public dynamic assets - 60 uncached renders per minute per IP'
    },

    /**
     * CSP Reports - anonymous browser violation telemetry.
     * Used by: POST /api/csp-report
     *
     * Why 60/min:
     * - A broken page can emit several reports quickly.
     * - Abuse should not create unbounded security-log volume.
     */
    CSP_REPORT: {
        limit: 60,
        window: 60,
        description: 'CSP reports - 60 per minute per IP'
    },

    /**
     * Custom Domain Management - authenticated external provider calls.
     * Used by: /api/domain
     *
     * Why 10/hour:
     * - Domain add/verify/remove is an infrequent owner workflow.
     * - Each request can call Vercel APIs, so retries should stay bounded.
     */
    DOMAIN_MANAGEMENT: {
        limit: 10,
        window: 3600,
        description: 'Domain management - 10 provider calls per hour per owner/store'
    },

    /**
     * Payment Operations - Security critical
     * Used by: Onboarding, subscription creation, topup orders
     */
    PAYMENT_ONBOARDING: {
        limit: 3,
        window: 3600,  // 1 hour
        description: 'Onboarding - 3 per hour (one-time process)'
    },

    PAYMENT_SUBSCRIPTION: {
        limit: 5,
        window: 3600,  // 1 hour
        description: 'Subscription creation - 5 per hour (allows retries)'
    },

    PAYMENT_TOPUP: {
        limit: 10,
        window: 3600,  // 1 hour
        description: 'Topup orders - 10 per hour (frequent purchases)'
    },

    // ─────────────────────────────────────────────────────────────
    // GUEST FEEDBACK (Internal Feedback System)
    // @see __docs__/projects/internal-feedback-system/
    // ─────────────────────────────────────────────────────────────

    /**
     * Guest Feedback Submission - Public endpoint, IP-based
     * Used by: POST /api/public/feedback/submit
     * 
     * Why 10/10min:
     * - Prevents spam from single IP
     * - Allows legitimate table turnover (10 guests per table per hour)
     * - Rate limit is per IP, not per user (public endpoint)
     */
    FEEDBACK_SUBMISSION: {
        limit: 10,
        window: 600,  // 10 minutes
        description: 'Guest feedback - 10 per 10 minutes per IP'
    },

    // ─────────────────────────────────────────────────────────────
    // PUBLISH THROTTLE (Operational Infrastructure)
    // @see __docs__/system-strengthening/_archive/chatgpt-review-launch-infra.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Publish Operations - Prevents rapid-fire publishes per store.
     * Used by: POST /api/msg-preview/[sessionId]/approve (messaging onboarding publish)
     * 
     * Why 5/10min per IP:
     * - Prevents abuse of the publish pipeline
     * - Normal usage: 1 publish per session, rarely more than 2
     * - Uses IP-based key since approve route uses token auth (no NextAuth)
     */
    PUBLISH_OPERATION: {
        limit: 5,
        window: 600,  // 10 minutes
        description: 'Publish operations - 5 per 10 minutes per IP'
    },

    // ─────────────────────────────────────────────────────────────
    // AUTH SENSITIVE OPERATIONS (Deep Review — Feb 20, 2026)
    // Prevents brute force on account-claiming, staff creation, password changes
    // ─────────────────────────────────────────────────────────────

    /**
     * Auth Sensitive Operations - Prevents brute force on account mutations.
     * Used by: claim-account, create-staff, change-password, validate-claim
     * 
     * Why 5/15min per IP:
     * - claim-account: one-time operation, 5 retries is generous
     * - create-staff: owner rarely creates >5 staff in 15 min
     * - change-password: 5 attempts is generous for legitimate use
     */
    AUTH_SENSITIVE: {
        limit: 5,
        window: 900,  // 15 minutes
        description: 'Auth sensitive ops - 5 per 15 minutes per IP'
    },

    // ─────────────────────────────────────────────────────────────
    // SUBSCRIPTION MUTATION (Deep Review — Feb 20, 2026)
    // Prevents rapid-fire billing mutations. Pause/resume remain behind
    // ENABLE_SUBSCRIPTION_PAUSE and return before mutation while disabled.
    // ─────────────────────────────────────────────────────────────

    /**
     * Subscription Mutations - Prevents abuse of billing state changes.
     * Used by: cancel-subscription, upgrade, and feature-gated pause/resume
     * 
     * Why 5/hour per user:
     * - These are rare operations (once per billing cycle at most)
     * - 5 per hour allows retries but prevents abuse
     */
    SUBSCRIPTION_MUTATION: {
        limit: 5,
        window: 3600,  // 1 hour
        description: 'Subscription mutations - 5 per hour per user'
    },

    // ─────────────────────────────────────────────────────────────
    // PUBLIC MENU ENTRY (Authenticated Menu Creation Pipeline)
    // @see __docs__/public-menu-entry/public-menu-entry_firebase.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Public Menu Entry — legacy anonymous menu upload + AI extraction.
     *
     * Kept for backward compatibility with older public API helpers, but the
     * active /create-menu extraction route now requires auth and uses
     * PUBLIC_MENU_ENTRY_AUTH instead.
     */
    PUBLIC_MENU_ENTRY: {
        limit: 3,
        window: 86400,  // 24 hours
        description: 'Public menu entry - 3 per 24 hours per IP'
    },

    /**
     * Public Menu Entry — signed-in owner menu upload/link import + AI extraction.
     * Used by: POST /api/public/create-menu
     *
     * Why 5/24h per user:
     * - Extraction remains initially free to the owner, so MenuList pays for it.
     * - Auth first prevents anonymous refresh/upload loops and bot traffic.
     * - Draft reuse/dedupe avoids charging attempts for the same active source.
     * - User-keyed limits avoid punishing owners on shared public networks.
     */
    PUBLIC_MENU_ENTRY_AUTH: {
        limit: 5,
        window: 86400,  // 24 hours
        description: 'Authenticated public menu entry - 5 per 24 hours per user'
    },

    // ─────────────────────────────────────────────────────────────
    // MENU LINK IMPORT (Authenticated owner source acquisition)
    // @see __docs__/menu-link-import/
    // ─────────────────────────────────────────────────────────────

    /**
     * Menu Link Import — authenticated owner-provided URL acquisition.
     * Used by: POST /api/menu-link-imports
     *
     * Why 5/10min per user/store:
     * - Each accepted request triggers source fetch, Storage write, and AI job.
     * - Authenticated owners may retry bad links, but repeated attempts need a
     *   cost and SSRF-abuse ceiling.
     */
    MENU_LINK_IMPORT: {
        limit: 5,
        window: 600,
        description: 'Menu link import - 5 per 10 minutes per user/store'
    }
} as const;

/**
 * Get rate limit config for a specific feature
 * 
 * @example
 * ```typescript
 * const config = getRateLimitForFeature('AI_CHAT');
 * await checkRateLimit({
 *     key: `chat:${userId}`,
 *     ...config
 * });
 * ```
 */
export function getRateLimitForFeature(feature: keyof typeof RATE_LIMIT_CONFIGS): RateLimitConfig {
    return RATE_LIMIT_CONFIGS[feature];
}

/**
 * Type-safe feature names
 */
export type RateLimitFeature = keyof typeof RATE_LIMIT_CONFIGS;
