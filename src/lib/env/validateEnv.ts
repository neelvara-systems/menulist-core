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
    getDeploymentStageEnvSnapshot,
    getExpectedFirebaseProjectId,
    getProductDeploymentTarget,
    resolveDeploymentStage,
} from '@constant/deploymentTargets';
import {
    CAMPAIGNCUE_ADMIN_CREDENTIAL_ENV_KEYS,
    CAMPAIGNCUE_FIREBASE_ENV,
    CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS,
} from '@constant/campaigncue/firebase';
import {
    SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID,
    SIGNALDESK_FIREBASE_ENV,
    SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS,
    SIGNALDESK_REQUIRED_FIREBASE_MODE,
    isSignalDeskProjectStorageBucket,
    normalizeSignalDeskStorageBucket,
} from '@constant/signaldesk/firebase';
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
const MENULIST_TENANT_BASE_DOMAIN_VAR = 'NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN';
const MYCODEX_AUTH_VARS = [
    'MYCODEX_BASIC_AUTH_USER',
    'MYCODEX_BASIC_AUTH_PASSWORD',
    'MYCODEX_SESSION_SECRET',
] as const;

const OPTIONAL_PRODUCT_FIREBASE_ENV_PREFIXES: Partial<Record<DeploymentProductId, readonly string[]>> = {
    answerlattice: [
        'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_',
        'NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_',
        'ANSWERLATTICE_FIREBASE_',
        'ANSWERLATTICE_FIRESTORE_',
        'ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS',
    ],
    campaigncue: [
        'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_',
        'NEXT_PUBLIC_CAMPAIGNCUE_FIRESTORE_',
        'CAMPAIGNCUE_FIREBASE_',
        'CAMPAIGNCUE_FIRESTORE_',
        'CAMPAIGNCUE_GOOGLE_APPLICATION_CREDENTIALS',
    ],
    signaldesk: [
        'NEXT_PUBLIC_SIGNALDESK_FIREBASE_',
        'NEXT_PUBLIC_SIGNALDESK_FIRESTORE_',
        'SIGNALDESK_FIREBASE_',
        'SIGNALDESK_FIRESTORE_',
        'SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS',
    ],
} as const;

const describeProduct = (productId: DeploymentProductId) => {
    if (productId === 'menulist') return 'MenuList';
    if (productId === 'neelvara') return 'Neelvara';
    if (productId === 'answerlattice') return 'Answerlattice';
    if (productId === 'campaigncue') return 'CampaignCue';
    if (productId === 'signaldesk') return 'MenuList SignalDesk';
    return 'MyCodex';
};

const getEnvValue = (varName: string) => process.env[varName]?.trim();
const hasProductFirebaseConfiguration = (productId: DeploymentProductId): boolean => {
    if (productId === 'menulist') return true;
    const prefixes = OPTIONAL_PRODUCT_FIREBASE_ENV_PREFIXES[productId] || [];
    return Object.entries(process.env).some(([varName, value]) => (
        Boolean(value?.trim()) && prefixes.some((prefix) => varName.startsWith(prefix))
    ));
};
const BOOLEAN_ENV_VALUES = new Set(['0', '1', 'false', 'no', 'off', 'on', 'true', 'yes']);
const CAMPAIGNCUE_BOOLEAN_VARS = [
    'CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL',
] as const;
const CAMPAIGNCUE_ROLLOUT_VARS = [
    'CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT',
    'CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT',
] as const;

/**
 * Validate all environment variables.
 * Returns validation result with missing vars and warnings.
 */
export function validateEnvironment(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];
    const stageResolution = resolveDeploymentStage(getDeploymentStageEnvSnapshot());
    const stage = stageResolution.stage;
    const isVercel = process.env.VERCEL === '1' || Boolean(getEnvValue('VERCEL_ENV'));
    const addEnvironmentIssue = (message: string) => {
        if (isVercel) missing.push(message);
        else warnings.push(message);
    };
    const isEnvAliasGroup = (requirement: EnvRequirement): requirement is readonly string[] =>
        typeof requirement !== 'string';
    const hasAnyEnvVar = (requirement: EnvRequirement) =>
        isEnvAliasGroup(requirement)
            ? requirement.some((varName: string) => Boolean(process.env[varName]))
            : Boolean(process.env[requirement]);
    const describeRequirement = (requirement: EnvRequirement) =>
        isEnvAliasGroup(requirement) ? requirement.join(' or ') : requirement;

    if (!stageResolution.valid || stageResolution.errorCode) {
        addEnvironmentIssue(`Deployment stage configuration is invalid (${stageResolution.errorCode || 'UNKNOWN_STAGE_ERROR'})`);
    }

    for (const varName of CAMPAIGNCUE_BOOLEAN_VARS) {
        const rawValue = getEnvValue(varName);
        if (rawValue && !BOOLEAN_ENV_VALUES.has(rawValue.toLowerCase())) {
            addEnvironmentIssue(`${varName} must be an explicit true/false boolean value`);
        }
    }

    for (const varName of CAMPAIGNCUE_ROLLOUT_VARS) {
        const rawValue = getEnvValue(varName);
        if (!rawValue) continue;
        const parsedValue = Number(rawValue);
        if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
            addEnvironmentIssue(`${varName} must be a number from 0 through 100`);
        }
    }

    const configuredSegmentationModel = getEnvValue('CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL');
    if (
        configuredSegmentationModel
        && BOOLEAN_ENV_VALUES.has(configuredSegmentationModel.toLowerCase())
    ) {
        addEnvironmentIssue('CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL must be a model identifier or left blank');
    }

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
        const pilotStoreIds = (FEATURE_FLAGS.OWNER_REFERRAL_PILOT_STORE_IDS || [])
            .map((value) => Number(value))
            .filter((value) => Number.isSafeInteger(value) && value > 0);
        if (pilotStoreIds.length === 0) {
            const message = 'ENABLE_OWNER_REFERRAL requires at least one valid OWNER_REFERRAL_PILOT_STORE_IDS entry';
            if (isVercel) missing.push(message);
            else warnings.push(message);
        }
        const secretReady = isValidOwnerReferralTokenSecret(process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET);
        if (!secretReady) {
            const message = 'MENULIST_OWNER_REFERRAL_TOKEN_SECRET must be an unpadded base64url value that decodes to exactly 32 bytes when owner referrals are enabled';
            if (isVercel) missing.push(message);
            else warnings.push(message);
        }
    }

    (['menulist', 'answerlattice', 'campaigncue', 'signaldesk'] as DeploymentProductId[]).forEach((productId) => {
        // This repository is provisioned product by product. An absent sister-product
        // configuration is valid; once any Firebase value is added, validate it fully.
        if (!hasProductFirebaseConfiguration(productId)) return;

        const expectedProjectId = getExpectedFirebaseProjectId(productId, stage);
        PRODUCT_PROJECT_VARS[productId].forEach((varName) => {
            const actualProjectId = getEnvValue(varName);
            const message = `${varName} must be ${expectedProjectId} for ${stage} ${describeProduct(productId)}`;

            if (!actualProjectId) {
                if (productId === 'answerlattice' || productId === 'campaigncue' || productId === 'signaldesk') {
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

    if (hasProductFirebaseConfiguration('signaldesk')) {
        const signalDeskDescription = describeProduct('signaldesk');
        const addSignalDeskIssue = (detail: string) => {
            addEnvironmentIssue(`${signalDeskDescription}: ${detail}`);
        };
        const signalDeskPrivateMode = getEnvValue(SIGNALDESK_FIREBASE_ENV.FIREBASE_MODE)?.toLowerCase();
        const signalDeskPublicMode = getEnvValue(SIGNALDESK_FIREBASE_ENV.PUBLIC_FIREBASE_MODE)?.toLowerCase();
        if (!signalDeskPrivateMode || !signalDeskPublicMode) {
            addSignalDeskIssue('private and public Firebase modes must both be set to separate');
        } else if (
            signalDeskPrivateMode !== SIGNALDESK_REQUIRED_FIREBASE_MODE
            || signalDeskPublicMode !== SIGNALDESK_REQUIRED_FIREBASE_MODE
            || signalDeskPrivateMode !== signalDeskPublicMode
        ) {
            addSignalDeskIssue('private and public Firebase modes must agree and equal separate');
        }

        const signalDeskPrivateDatabaseId = getEnvValue(SIGNALDESK_FIREBASE_ENV.FIRESTORE_DATABASE_ID);
        const signalDeskPublicDatabaseId = getEnvValue(SIGNALDESK_FIREBASE_ENV.PUBLIC_FIRESTORE_DATABASE_ID);
        if (
            signalDeskPrivateDatabaseId
            && signalDeskPublicDatabaseId
            && signalDeskPrivateDatabaseId !== signalDeskPublicDatabaseId
        ) {
            addSignalDeskIssue('private and public Firestore database IDs must agree');
        } else if (
            (signalDeskPrivateDatabaseId && signalDeskPrivateDatabaseId !== SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID)
            || (signalDeskPublicDatabaseId && signalDeskPublicDatabaseId !== SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID)
        ) {
            addSignalDeskIssue('Firestore database must be the default database');
        }

        const rawSignalDeskPrivateBucket = getEnvValue(SIGNALDESK_FIREBASE_ENV.STORAGE_BUCKET);
        const rawSignalDeskPublicBucket = getEnvValue(SIGNALDESK_FIREBASE_ENV.PUBLIC_STORAGE_BUCKET);
        const signalDeskPrivateBucket = normalizeSignalDeskStorageBucket(rawSignalDeskPrivateBucket);
        const signalDeskPublicBucket = normalizeSignalDeskStorageBucket(rawSignalDeskPublicBucket);
        if (!rawSignalDeskPrivateBucket || !rawSignalDeskPublicBucket) {
            addSignalDeskIssue('private and public Storage buckets are both required');
        } else if (!signalDeskPrivateBucket || !signalDeskPublicBucket) {
            addSignalDeskIssue('Storage buckets must be valid Firebase bucket names');
        } else if (signalDeskPrivateBucket !== signalDeskPublicBucket) {
            addSignalDeskIssue('private and public Storage buckets must agree');
        } else if (!isSignalDeskProjectStorageBucket(signalDeskPrivateBucket, getExpectedFirebaseProjectId('signaldesk', stage))) {
            addSignalDeskIssue('Storage bucket must be a project-owned default bucket for the active stage');
        }

        [
            SIGNALDESK_FIREBASE_ENV.API_KEY,
            SIGNALDESK_FIREBASE_ENV.APP_ID,
            SIGNALDESK_FIREBASE_ENV.AUTH_DOMAIN,
        ].forEach((varName) => {
            if (!getEnvValue(varName)) {
                addSignalDeskIssue(`${varName} is required for the dedicated Firebase client`);
            }
        });

        const signalDeskCredentialPath = getEnvValue(SIGNALDESK_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS);
        const signalDeskClientEmail = getEnvValue(SIGNALDESK_FIREBASE_ENV.CLIENT_EMAIL);
        const signalDeskPrivateKey = getEnvValue(SIGNALDESK_FIREBASE_ENV.PRIVATE_KEY);
        if (!signalDeskCredentialPath && (!signalDeskClientEmail || !signalDeskPrivateKey)) {
            addSignalDeskIssue('a complete Admin credential tuple or namespaced credential file is required');
        } else if (
            signalDeskCredentialPath
            && Boolean(signalDeskClientEmail) !== Boolean(signalDeskPrivateKey)
        ) {
            addSignalDeskIssue('partial Admin credential tuples are not allowed when a credential file is configured');
        }
    }

    if (hasProductFirebaseConfiguration('campaigncue')) {
        const campaignCueAdminCredentialReady = Boolean(
            getEnvValue(CAMPAIGNCUE_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS)
            || CAMPAIGNCUE_ADMIN_CREDENTIAL_ENV_KEYS.every((key) => getEnvValue(key))
        );
        if (!campaignCueAdminCredentialReady) {
            const message = 'CampaignCue Admin SDK credentials are missing — CampaignCue APIs cannot access the dedicated Firebase project';
            if (isVercel) missing.push(message);
            else warnings.push(message);
        }
    }

    const platformDomain = getEnvValue('NEXT_PUBLIC_PLATFORM_DOMAIN');
    const expectedPlatformDomain = getProductDeploymentTarget('menulist', stage).domains[0];
    if (stage !== 'local' && platformDomain && expectedPlatformDomain && platformDomain !== expectedPlatformDomain) {
        const message = `NEXT_PUBLIC_PLATFORM_DOMAIN must be ${expectedPlatformDomain} for ${stage} MenuList (currently ${platformDomain})`;
        if (isVercel) missing.push(message);
        else warnings.push(message);
    }

    const tenantBaseDomain = getEnvValue(MENULIST_TENANT_BASE_DOMAIN_VAR);
    const expectedTenantBaseDomain = getProductDeploymentTarget('menulist', stage).tenantDomains?.[0];
    if (stage !== 'local' && expectedTenantBaseDomain && tenantBaseDomain !== expectedTenantBaseDomain) {
        const message = `${MENULIST_TENANT_BASE_DOMAIN_VAR} must be ${expectedTenantBaseDomain} for ${stage} MenuList customer links`;
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

    const myCodexHasActiveDomain = getProductDeploymentTarget('mycodex', stage).domains.length > 0;
    if (isVercel && stage !== 'local' && myCodexHasActiveDomain) {
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
    const isVercel = process.env.VERCEL === '1' || Boolean(getEnvValue('VERCEL_ENV'));
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
            throw new Error('Required production environment variables are missing.');
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
