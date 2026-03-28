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
    // Prevents rapid-fire cancel/pause/resume/upgrade operations
    // ─────────────────────────────────────────────────────────────

    /**
     * Subscription Mutations - Prevents abuse of billing state changes.
     * Used by: cancel-subscription, pause, resume, upgrade
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
    // PUBLIC MENU ENTRY (No-Auth Menu Creation Pipeline)
    // @see __docs__/public-menu-entry/public-menu-entry_firebase.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Public Menu Entry — Anonymous menu upload + AI extraction
     * Used by: POST /api/public/create-menu
     *
     * Why 3/24h per IP:
     * - Each extraction costs ~₹0.50-1.00 (Gemini API)
     * - Prevents bot abuse on unauthenticated endpoint
     * - 3 attempts is generous for legitimate use (retry on bad photo)
     * - IP-based since no user auth available
     */
    PUBLIC_MENU_ENTRY: {
        limit: 3,
        window: 86400,  // 24 hours
        description: 'Public menu entry - 3 per 24 hours per IP'
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
