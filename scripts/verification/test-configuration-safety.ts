import assert from 'node:assert/strict';

const MODEL_ENV_KEYS = [
    'CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL',
    'CAMPAIGNCUE_CUE_LAYERS_LOW_COST_IMAGE_MODEL',
    'CAMPAIGNCUE_CUE_LAYERS_PREMIUM_IMAGE_MODEL',
    'CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT',
    'CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL',
    'CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT',
] as const;

const withEnvironment = <T>(
    overrides: Partial<Record<(typeof MODEL_ENV_KEYS)[number], string>>,
    callback: () => T,
): T => {
    const previous = Object.fromEntries(MODEL_ENV_KEYS.map((key) => [key, process.env[key]]));
    try {
        MODEL_ENV_KEYS.forEach((key) => delete process.env[key]);
        Object.entries(overrides).forEach(([key, value]) => {
            if (value !== undefined) process.env[key] = value;
        });
        return callback();
    } finally {
        MODEL_ENV_KEYS.forEach((key) => {
            const value = previous[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        });
    }
};

const loadModelRegistry = (
    overrides: Partial<Record<(typeof MODEL_ENV_KEYS)[number], string>>,
) => withEnvironment(overrides, () => {
    const modulePath = require.resolve('../../src/lib/campaigncue/cue-layers/modelRegistry');
    delete require.cache[modulePath];
    return require(modulePath) as typeof import(
        '../../src/lib/campaigncue/cue-layers/modelRegistry'
    );
});

const falsePremium = loadModelRegistry({
    CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL: 'false',
    CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT: '100',
});
assert.equal(falsePremium.CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY[1].enabled, false);

const falseSegmentation = loadModelRegistry({
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL: 'false',
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT: '100',
});
assert.equal(falseSegmentation.CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY[2].enabled, false);
assert.equal(
    falseSegmentation.CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY[2].modelId,
    'registry:segmentation-adapter',
);

const zeroRollout = loadModelRegistry({
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL: 'segmentation-v1',
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT: '0',
});
assert.equal(zeroRollout.pickCampaignCueCueLayerModel({
    capability: 'segmentation_masks',
    maxCostTier: 'medium',
    rolloutBucket: 0,
}), null);

const partialRollout = loadModelRegistry({
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL: 'segmentation-v1',
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT: '25',
});
assert.equal(partialRollout.pickCampaignCueCueLayerModel({
    capability: 'segmentation_masks',
    maxCostTier: 'medium',
}), null);
assert.equal(partialRollout.pickCampaignCueCueLayerModel({
    capability: 'segmentation_masks',
    maxCostTier: 'medium',
    rolloutBucket: 24,
})?.modelId, 'segmentation-v1');
assert.equal(partialRollout.pickCampaignCueCueLayerModel({
    capability: 'segmentation_masks',
    maxCostTier: 'medium',
    rolloutBucket: 25,
}), null);

const clampedRollout = loadModelRegistry({
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL: 'segmentation-v1',
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT: '125',
});
assert.equal(clampedRollout.CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY[2].rolloutPercent, 100);
assert.equal(clampedRollout.pickCampaignCueCueLayerModel({
    capability: 'segmentation_masks',
    maxCostTier: 'medium',
})?.modelId, 'segmentation-v1');

const invalidRollout = loadModelRegistry({
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL: 'segmentation-v1',
    CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT: 'not-a-number',
});
assert.equal(invalidRollout.CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY[2].rolloutPercent, 0);

const {
    isFunctionFeatureEnabled,
    isWhatsAppProviderRuntimeEnabled,
    parseFunctionFeatureOverride,
} = require('../../functions/src/constants/features') as typeof import(
    '../../functions/src/constants/features'
);
assert.equal(parseFunctionFeatureOverride(undefined), null);
assert.equal(parseFunctionFeatureOverride(' true '), true);
assert.equal(parseFunctionFeatureOverride('YES'), true);
assert.equal(parseFunctionFeatureOverride('0'), false);
assert.equal(parseFunctionFeatureOverride('off'), false);
assert.equal(parseFunctionFeatureOverride('flase'), null);
assert.equal(parseFunctionFeatureOverride(''), null);

const previousWhatsAppEnvironment = {
    ENABLE_MESSAGING_ONBOARDING: process.env.ENABLE_MESSAGING_ONBOARDING,
    WHATSAPP_OS_ENABLED: process.env.WHATSAPP_OS_ENABLED,
    PLATFORM_ALERT_WHATSAPP_ENABLED: process.env.PLATFORM_ALERT_WHATSAPP_ENABLED,
};
try {
    process.env.ENABLE_MESSAGING_ONBOARDING = 'false';
    process.env.WHATSAPP_OS_ENABLED = 'false';
    process.env.PLATFORM_ALERT_WHATSAPP_ENABLED = 'false';
    assert.equal(isWhatsAppProviderRuntimeEnabled(), false);
    assert.equal(isFunctionFeatureEnabled('ENABLE_PLATFORM_ALERT_WHATSAPP'), false);

    const functionsSecretsPath = require.resolve('../../functions/src/config/secrets');
    delete require.cache[functionsSecretsPath];
    const disabledWhatsAppSecrets = require(functionsSecretsPath) as typeof import(
        '../../functions/src/config/secrets'
    );
    assert.deepEqual(disabledWhatsAppSecrets.SECRET_GROUPS.WHATSAPP, []);
    assert.deepEqual(disabledWhatsAppSecrets.SECRET_GROUPS.WHATSAPP_OUTBOUND, []);
    assert.deepEqual(disabledWhatsAppSecrets.SECRET_GROUPS.PLATFORM_ALERT_DELIVERY, []);

    process.env.ENABLE_MESSAGING_ONBOARDING = 'true';
    process.env.PLATFORM_ALERT_WHATSAPP_ENABLED = 'true';
    assert.equal(isWhatsAppProviderRuntimeEnabled(), true);
    delete require.cache[functionsSecretsPath];
    const enabledWhatsAppSecrets = require(functionsSecretsPath) as typeof import(
        '../../functions/src/config/secrets'
    );
    assert.deepEqual(enabledWhatsAppSecrets.SECRET_GROUPS.WHATSAPP, [
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_PHONE_NUMBER_ID,
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_ACCESS_TOKEN,
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_APP_SECRET,
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_VERIFY_TOKEN,
    ]);
    assert.deepEqual(enabledWhatsAppSecrets.SECRET_GROUPS.PLATFORM_ALERT_DELIVERY, [
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_PHONE_NUMBER_ID,
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_ACCESS_TOKEN,
        enabledWhatsAppSecrets.SECRETS.WHATSAPP_APP_SECRET,
    ]);
} finally {
    Object.entries(previousWhatsAppEnvironment).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    });
}

const {
    runEnvValidation,
    validateEnvironment,
} = require('../../src/lib/env/validateEnv') as typeof import('../../src/lib/env/validateEnv');
const productionEnvKeys = ['NODE_ENV', 'VERCEL', 'VERCEL_ENV', 'NEXTAUTH_SECRET'] as const;
const previousProductionEnv = Object.fromEntries(
    productionEnvKeys.map((key) => [key, process.env[key]]),
);
try {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXTAUTH_SECRET;
    assert.throws(
        () => runEnvValidation(),
        /Required production environment variables are missing/,
        'non-Vercel production startup must fail closed when required configuration is missing',
    );

    process.env.VERCEL_ENV = 'production';
    assert.doesNotThrow(
        () => runEnvValidation(),
        'Vercel build/runtime validation retains the deliberate log-only exception',
    );
} finally {
    productionEnvKeys.forEach((key) => {
        const value = previousProductionEnv[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    });
}

const withCleanEnvironment = <T>(
    overrides: Record<string, string>,
    callback: () => T,
): T => {
    const previousEnvironment = { ...process.env };
    try {
        Object.keys(process.env).forEach((key) => delete process.env[key]);
        Object.assign(process.env, overrides);
        return callback();
    } finally {
        Object.keys(process.env).forEach((key) => delete process.env[key]);
        Object.assign(process.env, previousEnvironment);
    }
};

withCleanEnvironment({
    NODE_ENV: 'production',
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    VERCEL_TARGET_ENV: 'qa',
    NEXT_PUBLIC_ENV: 'preview',
    NEXT_PUBLIC_VERCEL_ENV: 'preview',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'menu-list-qa-api-key',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'menulist-qa',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'menulist-qa.firebasestorage.app',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    GEMINI_AI_KEY: 'test-gemini-key',
    MENULIST_FIREBASE_ADMIN_AUTH_MODE: 'vercel_oidc',
    MENULIST_GCP_PROJECT_NUMBER: '100000000001',
    MENULIST_GCP_SERVICE_ACCOUNT_EMAIL: 'menulist-vercel-qa@menulist-qa.iam.gserviceaccount.com',
    MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID: 'menulist-vercel',
    MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'menulist-qa',
    NEXT_PUBLIC_PLATFORM_DOMAIN: 'menulist.digital',
    NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES: 'menulist.digital,www.menulist.digital,app.menulist.digital',
    NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN: 'menulist.digital',
}, () => {
    const menuListOnlyResult = validateEnvironment();
    assert.deepEqual(
        menuListOnlyResult.missing,
        [],
        `MenuList-only QA configuration must not require inactive sister-product or MyCodex values: ${menuListOnlyResult.missing.join('; ')}`,
    );

    process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID = 'menulist-signaldesk-qa';
    const partialSignalDeskResult = validateEnvironment();
    assert.ok(
        partialSignalDeskResult.missing.some((message) => message.includes('SignalDesk')),
        'Once any SignalDesk Firebase value is present, partial configuration must fail validation',
    );

    delete process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID;
    process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID = 'campaigncue-qa';
    const partialCampaignCueResult = validateEnvironment();
    assert.ok(
        partialCampaignCueResult.missing.some((message) => message.includes('CampaignCue')),
        'Once any CampaignCue Firebase value is present, partial configuration must fail validation',
    );

    delete process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID;
    process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID = 'answerlattice-qa';
    const partialAnswerlatticeResult = validateEnvironment();
    assert.ok(
        partialAnswerlatticeResult.missing.some((message) => message.includes('Answerlattice')),
        'Once any Answerlattice Firebase value is present, partial configuration must fail validation',
    );
});

console.log('Configuration safety behavior tests passed.');
