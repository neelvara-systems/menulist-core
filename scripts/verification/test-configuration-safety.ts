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

const {
    runEnvValidation,
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

console.log('Configuration safety behavior tests passed.');
