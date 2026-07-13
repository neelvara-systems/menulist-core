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

import {
    type DeploymentProductId,
    getDeploymentStage,
    getExpectedFirebaseProjectId,
    getProductDeploymentTarget,
} from '@constant/deploymentTargets';
import {
    CAMPAIGNCUE_ADMIN_CREDENTIAL_ENV_KEYS,
    CAMPAIGNCUE_FIREBASE_ENV,
    CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS,
} from '@constant/campaigncue/firebase';
import { SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS } from '@constant/signaldesk/firebase';
import { FEATURE_FLAGS } from '@config/features';
import { logEnvValidationDiagnostic, logEnvValidationFailure } from './envDiagnostics';

interface EnvValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
}

type EnvRequirement = string | readonly string[];

/** Required for app to function at all */
const REQUIRED_VARS: readonly EnvRequirement[] = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    ['GEMINI_AI_KEY', 'GEMINI_API_KEY'],
] as const;

/** Required for payments — app starts without them but billing breaks */
const PAYMENT_VARS: readonly string[] = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
] as const;

/** Required for Firebase Admin SDK (server-side operations) */
const ADMIN_VARS: readonly string[] = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
] as const;

/** Optional — feature-flagged, app works without them */
const OPTIONAL_VARS: readonly string[] = [
    'UPSTASH_REDIS_REST_URL',       // Rate limiting (ENABLE_RATE_LIMITING)
    'UPSTASH_REDIS_REST_TOKEN',     // Rate limiting
    'SMTP_HOST',                     // Lifecycle messaging (ENABLE_LIFECYCLE_MESSAGING)
    'SMTP_PORT',                     // Lifecycle messaging
    'SMTP_USER',                     // Lifecycle messaging
    'SMTP_PASS',                     // Lifecycle messaging
    'INTERNAL_NOTIFICATION_EMAIL',   // Internal/platform email recipient
    'PLATFORM_ALERT_EMAIL_TO',       // Platform alert email recipient override
    'PLATFORM_ALERT_WHATSAPP_TO',    // Platform alert WhatsApp recipient
    'PLATFORM_ALERT_WHATSAPP_TEMPLATE_NAME', // Platform alert WhatsApp template
    'WHATSAPP_PHONE_NUMBER_ID',       // WhatsApp provider phone number id
    'WHATSAPP_ACCESS_TOKEN',          // WhatsApp provider Graph API token
    'WHATSAPP_APP_SECRET',            // WhatsApp webhook signature verification
    'WHATSAPP_VERIFY_TOKEN',          // WhatsApp webhook registration challenge
    'TELEGRAM_BOT_TOKEN',           // Ops alerts (ENABLE_OPS_ALERTS)
    'TELEGRAM_CHAT_ID',             // Ops alerts
    'GA_CLIENT_EMAIL',              // Analytics
    'GA_PRIVATE_KEY',               // Analytics
    'BATCH_IMAGE_GENERATION_QUEUE_ID',      // Batch menu image generation
    'BATCH_IMAGE_GENERATION_WORKER_SECRET', // Batch menu image generation worker auth
    'BATCH_IMAGE_GENERATION_WORKER_URL',    // Batch menu image generation worker
    'FIREBASE_PROJECT_LOCATION',            // Google Cloud Tasks queue location
    'FIREBASE_API_KEY',                    // Firebase Auth REST/API calls should use server-side key (not NEXT_PUBLIC)
    'MENULIST_OWNER_REFERRAL_TOKEN_SECRET', // Owner referral token encryption when acquisition is enabled
    'ANSWERLATTICE_WIDGET_RUNTIME_SECRET',  // Short-lived host-to-iframe widget authorization
] as const;

const isValidOwnerReferralTokenSecret = (value: string | undefined): boolean => {
    const encoded = String(value || '').trim();
    if (!encoded || encoded.includes('=')) return false;
    try {
        const decoded = Buffer.from(encoded, 'base64url');
        return decoded.length === 32 && decoded.toString('base64url') === encoded;
    } catch {
        return false;
    }
};

const PRODUCT_PROJECT_VARS: Record<DeploymentProductId, readonly string[]> = {
    menulist: [
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'FIREBASE_PROJECT_ID',
    ],
    neelvara: [],
    answerlattice: [
        'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID',
        'ANSWERLATTICE_FIREBASE_PROJECT_ID',
    ],
    campaigncue: CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS,
    signaldesk: SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS,
    mycodex: [],
} as const;

const PLATFORM_ALIAS_VAR = 'NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES';
const MYCODEX_AUTH_VARS = [
    'MYCODEX_BASIC_AUTH_USER',
    'MYCODEX_BASIC_AUTH_PASSWORD',
    'MYCODEX_SESSION_SECRET',
] as const;

const describeProduct = (productId: DeploymentProductId) => {
    if (productId === 'menulist') return 'MenuList';
    if (productId === 'neelvara') return 'Neelvara';
    if (productId === 'answerlattice') return 'Answerlattice';
    if (productId === 'campaigncue') return 'CampaignCue';
    if (productId === 'signaldesk') return 'MenuList SignalDesk';
    return 'MyCodex';
};

const getEnvValue = (varName: string) => process.env[varName]?.trim();

/**
 * Validate all environment variables.
 * Returns validation result with missing vars and warnings.
 */
export function validateEnvironment(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];
    const stage = getDeploymentStage();
    const isVercel = process.env.VERCEL === '1';
    const isEnvAliasGroup = (requirement: EnvRequirement): requirement is readonly string[] =>
        typeof requirement !== 'string';
    const hasAnyEnvVar = (requirement: EnvRequirement) =>
        isEnvAliasGroup(requirement)
            ? requirement.some((varName: string) => Boolean(process.env[varName]))
            : Boolean(process.env[requirement]);
    const describeRequirement = (requirement: EnvRequirement) =>
        isEnvAliasGroup(requirement) ? requirement.join(' or ') : requirement;

    // Check required vars
    for (const requirement of REQUIRED_VARS) {
        if (!hasAnyEnvVar(requirement)) {
            missing.push(describeRequirement(requirement));
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

    if (!process.env.FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        warnings.push('FIREBASE_API_KEY is recommended for server-side Firebase REST calls. NEXT_PUBLIC_FIREBASE_API_KEY is public and should not be used for server-auth operations.');
    }

    if (FEATURE_FLAGS.ENABLE_OWNER_REFERRAL && !FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING) {
        const message = 'ENABLE_OWNER_REFERRAL requires ENABLE_OWNER_REFERRAL_REWARD_PROCESSING so every accepted paid referral can settle';
        if (isVercel) missing.push(message);
        else warnings.push(message);
    }

    if (FEATURE_FLAGS.ENABLE_OWNER_REFERRAL && FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING) {
        const secretReady = isValidOwnerReferralTokenSecret(process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET);
        if (!secretReady) {
            const message = 'MENULIST_OWNER_REFERRAL_TOKEN_SECRET must be an unpadded base64url value that decodes to exactly 32 bytes when owner referrals are enabled';
            if (isVercel) missing.push(message);
            else warnings.push(message);
        }
    }

    (['menulist', 'answerlattice', 'campaigncue'] as DeploymentProductId[]).forEach((productId) => {
        const expectedProjectId = getExpectedFirebaseProjectId(productId, stage);
        PRODUCT_PROJECT_VARS[productId].forEach((varName) => {
            const actualProjectId = getEnvValue(varName);
            const message = `${varName} must be ${expectedProjectId} for ${stage} ${describeProduct(productId)}`;

            if (!actualProjectId) {
                if (productId === 'answerlattice' || productId === 'campaigncue') {
                    const missingMessage = `${message} — ${describeProduct(productId)} will not use the required ${stage} Firebase project`;
                    if (isVercel) missing.push(missingMessage);
                    else warnings.push(missingMessage);
                }
                return;
            }

            if (actualProjectId !== expectedProjectId) {
                if (isVercel) {
                    missing.push(`${message} (currently ${actualProjectId})`);
                } else {
                    warnings.push(`${message} (currently ${actualProjectId})`);
                }
            }
        });
    });

    const campaignCueAdminCredentialReady = Boolean(
        getEnvValue(CAMPAIGNCUE_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS)
        || CAMPAIGNCUE_ADMIN_CREDENTIAL_ENV_KEYS.every((key) => getEnvValue(key))
    );
    if (!campaignCueAdminCredentialReady) {
        const message = 'CampaignCue Admin SDK credentials are missing — CampaignCue APIs cannot access the dedicated Firebase project';
        if (isVercel) missing.push(message);
        else warnings.push(message);
    }

    const platformDomain = getEnvValue('NEXT_PUBLIC_PLATFORM_DOMAIN');
    const expectedPlatformDomain = getProductDeploymentTarget('menulist', stage).domains[0];
    if (stage !== 'local' && platformDomain && expectedPlatformDomain && platformDomain !== expectedPlatformDomain) {
        const message = `NEXT_PUBLIC_PLATFORM_DOMAIN must be ${expectedPlatformDomain} for ${stage} MenuList (currently ${platformDomain})`;
        if (isVercel) missing.push(message);
        else warnings.push(message);
    }

    const aliasValue = getEnvValue(PLATFORM_ALIAS_VAR);
    if (aliasValue && stage !== 'local') {
        const expectedAliases = new Set(getProductDeploymentTarget('menulist', stage).domains);
        const configuredAliases = aliasValue
            .split(',')
            .map((alias) => alias.trim().toLowerCase())
            .filter(Boolean);
        const unexpectedAliases = configuredAliases.filter((alias) => !expectedAliases.has(alias));

        if (unexpectedAliases.length > 0) {
            const message = `${PLATFORM_ALIAS_VAR} contains non-${stage} MenuList domains: ${unexpectedAliases.join(', ')}`;
            if (isVercel) missing.push(message);
            else warnings.push(message);
        }
    }

    if (isVercel && stage !== 'local') {
        const missingMyCodexAuth = MYCODEX_AUTH_VARS.filter((varName) => !getEnvValue(varName));
        if (missingMyCodexAuth.length > 0) {
            missing.push(`${missingMyCodexAuth.join(', ')} required for MyCodex access protection on Vercel`);
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
    const validationContext = {
        isProduction: isProd,
        isVercel,
        missingCount: result.missing.length,
        warningCount: result.warnings.length,
    };

    if (!result.valid) {
        if (isProd && isVercel) {
            // In production on Vercel: log error but don't crash
            // (Vercel builds run without all env vars during static generation)
            logEnvValidationFailure('env_required_variables_missing_vercel', validationContext);
        } else if (isProd) {
            // In production locally: hard error
            logEnvValidationFailure('env_required_variables_missing_production', validationContext);
        } else {
            // In development: warn only
            logEnvValidationDiagnostic('env_required_variables_missing_development', validationContext);
        }
    }

    // Log payment warnings in dev only (too noisy for prod)
    if (!isProd && result.warnings.length > 0) {
        const paymentWarnings = result.warnings.filter(w => w.includes('RAZORPAY'));
        if (paymentWarnings.length > 0) {
            logEnvValidationDiagnostic('env_payment_variables_missing_development', {
                isProduction: isProd,
                isVercel,
                paymentWarningCount: paymentWarnings.length,
            });
        }
    }
}
