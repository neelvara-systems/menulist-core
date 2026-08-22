#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, token, label) => {
  assert(content.includes(token), `${label} must include ${token}`);
};
const environmentKeys = (content) => new Set(
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('='))),
);

const appFlags = read('src/config/features.ts');
const functionFlags = read('functions/src/constants/features.ts');
const modelRegistry = read('src/lib/campaigncue/cue-layers/modelRegistry.ts');
const envValidation = read('src/lib/env/validateEnv.ts');
const deploymentTargets = read('src/constants/deploymentTargets.ts');
const instrumentation = read('src/instrumentation.ts');
const productionTemplate = read('.env.production.example');
const stagingTemplate = read('.env.staging.example');
const setupGuide = read('__docs__/deployment/three-product-environment-setup.md');
const environmentGuide = read('__docs__/production-readiness/dev-prod-environment-guide.md');

includes(appFlags, '} as const;', 'app feature registry');
includes(appFlags, 'typeof value === "boolean" ? value : false', 'typed boolean feature lookup');
includes(functionFlags, 'parseFunctionFeatureOverride', 'Functions override parser');
includes(functionFlags, "['1', 'true', 'yes', 'on']", 'Functions true override allowlist');
includes(functionFlags, "['0', 'false', 'no', 'off']", 'Functions false override allowlist');
includes(functionFlags, 'parseFunctionFeatureOverride(envValue) ?? false', 'invalid Functions override fail-closed behavior');

assert(
  !modelRegistry.includes('Boolean(process.env.CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL)'),
  'CampaignCue premium model flag must not use presence-based Boolean parsing',
);
includes(modelRegistry, 'readBooleanEnvironmentValue', 'CampaignCue boolean parsing');
includes(modelRegistry, 'readConfiguredModelId', 'CampaignCue model-id parsing');
includes(modelRegistry, 'Math.min(100, Math.max(0, parsed))', 'CampaignCue rollout bounds');
includes(modelRegistry, 'rolloutBucket < entry.rolloutPercent', 'CampaignCue partial rollout admission');

includes(envValidation, 'CAMPAIGNCUE_BOOLEAN_VARS', 'runtime boolean configuration validation');
includes(envValidation, 'CAMPAIGNCUE_ROLLOUT_VARS', 'runtime rollout configuration validation');
includes(envValidation, 'Deployment stage configuration is invalid', 'runtime stage validation');
includes(envValidation, "throw new Error('Required production environment variables are missing.')", 'non-Vercel production required-variable fail-fast');
includes(instrumentation, 'runEnvValidation()', 'server-start environment validation wiring');
for (const token of [
  'INVALID_PUBLIC_DEPLOYMENT_STAGE',
  'INVALID_PUBLIC_VERCEL_STAGE',
  'INVALID_SERVER_VERCEL_STAGE',
  'MISSING_SERVER_VERCEL_STAGE',
  'PUBLIC_DEPLOYMENT_STAGE_CONFLICT',
  'SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT',
]) {
  includes(deploymentTargets, token, 'deployment stage fail-closed matrix');
}

for (const [label, template, stage] of [
  ['production env template', productionTemplate, 'production'],
  ['staging env template', stagingTemplate, 'preview'],
]) {
  includes(template, `NEXT_PUBLIC_ENV=${stage}`, label);
  includes(template, `NEXT_PUBLIC_VERCEL_ENV=${stage}`, label);
  includes(template, 'CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL=false', label);
  assert(
    !/^(?:AL|CC|MC|NEXT_PUBLIC_AL|NEXT_PUBLIC_CC|NEXT_PUBLIC_MC)_[A-Z0-9_]*=/m.test(template),
    `${label} must not introduce shorthand product env prefixes`,
  );
  assert(
    !/^NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|PASSWORD|CLIENT_SECRET)[A-Z0-9_]*=/m.test(template),
    `${label} must not expose private credentials through NEXT_PUBLIC variables`,
  );
}
const stagingKeys = environmentKeys(stagingTemplate);
const productionKeys = environmentKeys(productionTemplate);
const productionOnlyKeys = new Set([
  'MENULIST_EMAIL_OS_FROM',
  'MENULIST_EMAIL_OS_FROM_DOMAIN',
  'MENULIST_EMAIL_OS_REPLY_TO',
  'MENULIST_RESEND_API_KEY',
]);
const stagingSharedKeys = [...stagingKeys]
  .sort();
const productionSharedKeys = [...productionKeys]
  .filter((key) => !productionOnlyKeys.has(key))
  .sort();
assert(
  JSON.stringify(stagingSharedKeys) === JSON.stringify(productionSharedKeys),
  'staging and production env templates may differ only by approved production-only keys',
);
for (const key of productionOnlyKeys) {
  assert(productionKeys.has(key) && !stagingKeys.has(key), `${key} must remain production-only`);
}
for (const [label, template] of [
  ['staging', stagingTemplate],
  ['production', productionTemplate],
]) {
  includes(template, 'MENULIST_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc', `${label} MenuList Admin identity mode`);
  includes(template, 'ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE=vercel_oidc', `${label} Answerlattice Admin identity mode`);
  for (const forbiddenName of [
    'MENULIST_FIREBASE_CLIENT_EMAIL=',
    'MENULIST_FIREBASE_PRIVATE_KEY=',
    'ANSWERLATTICE_FIREBASE_CLIENT_EMAIL=',
    'ANSWERLATTICE_FIREBASE_PRIVATE_KEY=',
    'ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS=',
  ]) {
    assert(!template.includes(forbiddenName), `${label} must not retain ${forbiddenName}`);
  }
}

includes(setupGuide, '`NEXT_PUBLIC_VERCEL_ENV`', 'deployment setup runtime identity');
includes(environmentGuide, 'source-controlled build/runtime constants', 'feature flag deployment truth');
assert(
  !environmentGuide.includes('Feature flags for instant disable'),
  'environment guide must not claim source flags are instant remote kill switches',
);

[
  '__docs__/configuration-safety/README.md',
  '__docs__/configuration-safety/configuration-safety_spec.md',
  '__docs__/configuration-safety/configuration-safety_impl.md',
  '__docs__/configuration-safety/configuration-safety_marketing.md',
  '__docs__/configuration-safety/configuration-safety_website.md',
  '__docs__/configuration-safety/configuration-safety_helpdoc.md',
  '__docs__/configuration-safety/configuration-safety_firebase.md',
  '__docs__/configuration-safety/configuration-safety_mobile-support.md',
  '__docs__/configuration-safety/configuration-safety_test-cases.md',
  '__docs__/configuration-safety/configuration-safety_verification.md',
].forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Configuration safety source boundary passed.');
