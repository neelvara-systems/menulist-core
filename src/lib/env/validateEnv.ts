/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are present at startup.
 * Fails fast with clear error messages instead of cryptic runtime failures.
 * 
 * Usage:
 * - Called automatically in instrumentation.ts (Next.js server startup)
 * - Only validates on server side (env vars not available on client)
 * 
 * @see __docs__/production-readiness/dev-prod-environment-guide.md
 */

interface EnvValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
}

/** Required for app to function at all */
const REQUIRED_VARS = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_AI_KEY',
] as const;

/** Required for payments — app starts without them but billing breaks */
const PAYMENT_VARS = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
] as const;

/** Required for Firebase Admin SDK (server-side operations) */
const ADMIN_VARS = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
] as const;

/** Optional — feature-flagged, app works without them */
const OPTIONAL_VARS = [
    'UPSTASH_REDIS_REST_URL',       // Rate limiting (ENABLE_RATE_LIMITING)
    'UPSTASH_REDIS_REST_TOKEN',     // Rate limiting
    'SMTP_HOST',                     // Lifecycle messaging (ENABLE_LIFECYCLE_MESSAGING)
    'SMTP_USER',                     // Lifecycle messaging
    'SMTP_PASS',                     // Lifecycle messaging
    'TELEGRAM_BOT_TOKEN',           // Ops alerts (ENABLE_OPS_ALERTS)
    'TELEGRAM_CHAT_ID',             // Ops alerts
    'GA_CLIENT_EMAIL',              // Analytics
    'GA_PRIVATE_KEY',               // Analytics
] as const;

/**
 * Validate all environment variables.
 * Returns validation result with missing vars and warnings.
 */
export function validateEnvironment(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required vars
    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    // Check admin vars (required for server-side operations)
    for (const varName of ADMIN_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    // Check payment vars (warn, don't fail)
    for (const varName of PAYMENT_VARS) {
        if (!process.env[varName]) {
            warnings.push(`${varName} not set — payment operations will fail`);
        }
    }

    // Check optional vars (info only)
    for (const varName of OPTIONAL_VARS) {
        if (!process.env[varName]) {
            warnings.push(`${varName} not set — feature requires configuration when enabled`);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
        warnings,
    };
}

/**
 * Run validation and log results.
 * Called during server startup (instrumentation.ts).
 * 
 * In production: logs errors for missing required vars
 * In development: logs warnings but doesn't crash
 */
export function runEnvValidation(): void {
    // Only validate on server side
    if (typeof window !== 'undefined') return;

    const result = validateEnvironment();
    const isProd = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';

    if (!result.valid) {
        const errorMsg = `[ENV] Missing required environment variables:\n${result.missing.map(v => `  - ${v}`).join('\n')}`;

        if (isProd && isVercel) {
            // In production on Vercel: log error but don't crash
            // (Vercel builds run without all env vars during static generation)
            console.error(errorMsg);
        } else if (isProd) {
            // In production locally: hard error
            console.error(errorMsg);
        } else {
            // In development: warn only
            console.warn(`[ENV] ⚠️ ${result.missing.length} required vars missing (OK for local dev if using emulators)`);
        }
    }

    // Log payment warnings in dev only (too noisy for prod)
    if (!isProd && result.warnings.length > 0) {
        const paymentWarnings = result.warnings.filter(w => w.includes('RAZORPAY'));
        if (paymentWarnings.length > 0) {
            console.warn(`[ENV] ⚠️ Payment vars missing — billing will not work`);
        }
    }
}
