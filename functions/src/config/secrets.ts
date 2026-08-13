/**
 * Centralized Secrets & Environment Configuration
 * ═══════════════════════════════════════════════════════════════
 * 
 * Single source of truth for ALL secret names and environment variables
 * used across Firebase Functions.
 * 
 * HOW SECRETS WORK:
 * ─────────────────
 * - Production: Secrets are stored in Google Secret Manager.
 *   Set via: `firebase functions:secrets:set SECRET_NAME`
 *   Functions only receive secrets declared in their `secrets:` option.
 * 
 * - Local (Emulator): Secrets come from `functions/.env.local` file.
 *   The emulator does NOT access Secret Manager.
 *   dotenv loads .env.local at startup (see firebaseAdmin.ts).
 * 
 * ADDING A NEW SECRET:
 * ─────────────────────
 * 1. Add the name to SECRETS below
 * 2. Add to the appropriate SECRET_GROUPS
 * 3. Store in Secret Manager: `firebase functions:secrets:set NEW_SECRET`
 * 4. Add to `functions/.env.local` for local dev
 * 5. Declare `secrets: SECRET_GROUPS.xxx` on the function that needs it
 * 
 * @see functions/src/envSetup.md for detailed setup guide
 */

// ═══════════════════════════════════════════════════════════════
// SECRET NAMES — All secret names in one place
// ═══════════════════════════════════════════════════════════════

export const SECRETS = {
    // AI / Extraction (multi-key rotation — KeyManager auto-discovers available keys)
    GEMINI_AI_KEY: 'GEMINI_AI_KEY',
    GEMINI_AI_KEY_2: 'GEMINI_AI_KEY_2',
    GEMINI_AI_KEY_3: 'GEMINI_AI_KEY_3',
    GEMINI_AI_KEY_4: 'GEMINI_AI_KEY_4',
    MENULIST_GEMINI_TEXT_AI_KEY: 'MENULIST_GEMINI_TEXT_AI_KEY',

    // Rate Limiting (Upstash Redis)
    UPSTASH_REDIS_REST_URL: 'UPSTASH_REDIS_REST_URL',
    UPSTASH_REDIS_REST_TOKEN: 'UPSTASH_REDIS_REST_TOKEN',

    // WhatsApp (Messaging Onboarding)
    WHATSAPP_PHONE_NUMBER_ID: 'WHATSAPP_PHONE_NUMBER_ID',
    WHATSAPP_ACCESS_TOKEN: 'WHATSAPP_ACCESS_TOKEN',
    WHATSAPP_APP_SECRET: 'WHATSAPP_APP_SECRET',
    WHATSAPP_VERIFY_TOKEN: 'WHATSAPP_VERIFY_TOKEN',

    // Email (SMTP via Resend/Nodemailer)
    SMTP_HOST: 'SMTP_HOST',
    SMTP_PORT: 'SMTP_PORT',
    SMTP_USER: 'SMTP_USER',
    SMTP_PASS: 'SMTP_PASS',

    // Payments (Razorpay)
    RAZORPAY_KEY_ID: 'RAZORPAY_KEY_ID',
    RAZORPAY_KEY_SECRET: 'RAZORPAY_KEY_SECRET',

    // Monitoring
    SENTRY_DSN: 'SENTRY_DSN',
    TELEGRAM_BOT_TOKEN: 'TELEGRAM_BOT_TOKEN',
    TELEGRAM_CHAT_ID: 'TELEGRAM_CHAT_ID',
    GCP_BUDGET_WEBHOOK_SECRET: 'GCP_BUDGET_WEBHOOK_SECRET',

    // Public cache invalidation
    REVALIDATION_SECRET: 'REVALIDATION_SECRET',
} as const;

// ═══════════════════════════════════════════════════════════════
// SECRET GROUPS — Pre-built arrays for function `secrets:` option
// ═══════════════════════════════════════════════════════════════

export const SECRET_GROUPS = {
    /** AI keys for key rotation (KeyManager auto-discovers which are configured) */
    AI: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.GEMINI_AI_KEY_4,
    ] as string[],

    /** AI + rate limiting (most callable functions) */
    AI_WITH_RATE_LIMIT: [
        SECRETS.GEMINI_AI_KEY,
        SECRETS.GEMINI_AI_KEY_2,
        SECRETS.GEMINI_AI_KEY_3,
        SECRETS.GEMINI_AI_KEY_4,
        SECRETS.UPSTASH_REDIS_REST_URL,
        SECRETS.UPSTASH_REDIS_REST_TOKEN,
    ] as string[],

    /** Dedicated menu extraction key + rate limiting; never falls back to the shared AI pool. */
    MENU_EXTRACTION_AI_WITH_RATE_LIMIT: [
        SECRETS.MENULIST_GEMINI_TEXT_AI_KEY,
        SECRETS.UPSTASH_REDIS_REST_URL,
        SECRETS.UPSTASH_REDIS_REST_TOKEN,
    ] as string[],

    /** WhatsApp webhook + messaging */
    WHATSAPP: [
        SECRETS.WHATSAPP_PHONE_NUMBER_ID,
        SECRETS.WHATSAPP_ACCESS_TOKEN,
        SECRETS.WHATSAPP_APP_SECRET,
        SECRETS.WHATSAPP_VERIFY_TOKEN,
    ] as string[],

    /** WhatsApp without verify token (for outbound messages only) */
    WHATSAPP_OUTBOUND: [
        SECRETS.WHATSAPP_PHONE_NUMBER_ID,
        SECRETS.WHATSAPP_ACCESS_TOKEN,
        SECRETS.WHATSAPP_APP_SECRET,
    ] as string[],

    /** Email sending (lifecycle messaging) */
    SMTP: [
        SECRETS.SMTP_HOST,
        SECRETS.SMTP_PORT,
        SECRETS.SMTP_USER,
        SECRETS.SMTP_PASS,
    ] as string[],

    /** Payment processing */
    RAZORPAY: [
        SECRETS.RAZORPAY_KEY_ID,
        SECRETS.RAZORPAY_KEY_SECRET,
    ] as string[],

    /** Monitoring & alerting */
    MONITORING: [
        SECRETS.TELEGRAM_BOT_TOKEN,
        SECRETS.TELEGRAM_CHAT_ID,
    ] as string[],

    /**
     * Platform-owner alert delivery.
     *
     * Keep this group limited to configured deploy-safe secrets. SMTP and
     * Telegram stay runtime-gated until their Secret Manager values exist.
     */
    PLATFORM_ALERT_DELIVERY: [
        SECRETS.WHATSAPP_PHONE_NUMBER_ID,
        SECRETS.WHATSAPP_ACCESS_TOKEN,
        SECRETS.WHATSAPP_APP_SECRET,
    ] as string[],

    /** Inbound Google Cloud budget alert webhook authentication */
    BUDGET_ALERT: [
        SECRETS.GCP_BUDGET_WEBHOOK_SECRET,
    ] as string[],

    /** Server-to-server cache invalidation for public menu/OBP pages */
    PUBLIC_CACHE_REVALIDATION: [
        SECRETS.REVALIDATION_SECRET,
    ] as string[],
};

export const FUNCTION_MAX_INSTANCES = {
    base: 10,
    aiCallable: 5,
    aiEventTrigger: 5,
    aiParallel: 5,
    messagingWebhook: 20,
    scheduler: 1,
    callableLight: 10,
} as const;

// ═══════════════════════════════════════════════════════════════
// FUNCTION OPTIONS — Reusable base configs for function definitions
// ═══════════════════════════════════════════════════════════════

export const FUNCTION_OPTIONS = {
    /** Default options for most functions */
    base: {
        region: 'us-central1' as const,
        timeoutSeconds: 900,
        memory: '2GiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.base,
    },

    /** Callable functions that use Gemini AI */
    aiCallable: {
        region: 'us-central1' as const,
        timeoutSeconds: 900,
        memory: '2GiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.aiCallable,
        secrets: SECRET_GROUPS.AI,
    },

    /** Firestore event triggers that use Gemini AI */
    aiEventTrigger: {
        region: 'us-central1' as const,
        timeoutSeconds: 540,
        memory: '2GiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.aiEventTrigger,
        secrets: SECRET_GROUPS.AI,
    },

    /** Parallel processing (Gemini + Upstash rate limiting) */
    aiParallel: {
        region: 'us-central1' as const,
        timeoutSeconds: 540,
        memory: '2GiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.aiParallel,
        secrets: SECRET_GROUPS.AI_WITH_RATE_LIMIT,
    },

    /** WhatsApp webhook handler */
    messagingWebhook: {
        region: 'us-central1' as const,
        timeoutSeconds: 30,
        memory: '512MiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.messagingWebhook,
        secrets: SECRET_GROUPS.WHATSAPP,
    },

    /** Lightweight scheduled tasks */
    schedulerLight: {
        region: 'us-central1' as const,
        memory: '128MiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
    },

    /** Medium scheduled tasks */
    schedulerMedium: {
        region: 'us-central1' as const,
        memory: '512MiB' as const,
        timeoutSeconds: 300,
        maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
    },

    /** Lightweight callable (no secrets needed) */
    callableLight: {
        region: 'us-central1' as const,
        timeoutSeconds: 30,
        memory: '256MiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.callableLight,
    },
};

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT HELPERS
// ═══════════════════════════════════════════════════════════════

/** True when running in Firebase Emulator */
export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/** True when deployed to Firebase (not emulator) */
export const isDeployed = !isEmulator;
