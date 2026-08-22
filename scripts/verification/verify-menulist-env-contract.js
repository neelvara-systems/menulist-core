const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  throw new Error(`[verify-menulist-env-contract] ${message}`);
};

const LEGACY_PRODUCT_ENV_NAMES = new Set([
  'BATCH_IMAGE_GENERATION_QUEUE_ID',
  'BATCH_IMAGE_GENERATION_WORKER_SECRET',
  'BATCH_IMAGE_GENERATION_WORKER_URL',
  'FIREBASE_API_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PROJECT_LOCATION',
  'FIREBASE_STORAGE_BUCKET',
  'GEMINI_AI_KEY',
  'GEMINI_AI_KEY_2',
  'GEMINI_AI_KEY_3',
  'GEMINI_AI_KEY_4',
  'GEMINI_API_KEY',
  'MENULIST_GEMINI_AI_KEY_4',
  'NEXT_PUBLIC_FB_DATABASE_URL',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'REVALIDATION_SECRET',
  'SENTRY_DEV_DSN',
  'SENTRY_DSN',
  'SMTP_HOST',
  'SMTP_PASS',
  'SMTP_PORT',
  'SMTP_USER',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'NEXT_PUBLIC_SENTRY_DEV_DSN',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_OTP_ALLOW_TEXT_FALLBACK',
  'WHATSAPP_OTP_TEMPLATE_LANGUAGE',
  'WHATSAPP_OTP_TEMPLATE_NAME',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
]);

const REDUNDANT_SERVER_PUBLIC_ALIASES = new Set([
  'MENULIST_FIREBASE_API_KEY',
  'MENULIST_FIREBASE_PROJECT_ID',
  'MENULIST_FIREBASE_STORAGE_BUCKET',
  'MENULIST_RAZORPAY_KEY_ID',
  'ANSWERLATTICE_FIREBASE_MODE',
  'ANSWERLATTICE_FIREBASE_PROJECT_ID',
  'ANSWERLATTICE_FIREBASE_STORAGE_BUCKET',
  'ANSWERLATTICE_FIRESTORE_DATABASE_ID',
  'CAMPAIGNCUE_FIREBASE_MODE',
  'CAMPAIGNCUE_FIREBASE_PROJECT_ID',
  'CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET',
  'CAMPAIGNCUE_FIRESTORE_DATABASE_ID',
]);

const ROOT_FUNCTION_ONLY_ENV_NAMES = new Set([
  'MENULIST_WHATSAPP_APP_SECRET',
  'MENULIST_WHATSAPP_VERIFY_TOKEN',
  'ENABLE_MESSAGING_ONBOARDING',
  'MESSAGING_ONBOARDING_PROVIDERS',
  'ENABLE_MESSAGING_ONBOARDING_TRACKING',
  'MENULIST_GEMINI_TEXT_AI_KEY',
]);

const REQUIRED_CANONICAL_NAMES = [
  'MENULIST_BATCH_IMAGE_GENERATION_QUEUE_ID',
  'MENULIST_BATCH_IMAGE_GENERATION_WORKER_SECRET',
  'MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL',
  'MENULIST_FIREBASE_ADMIN_AUTH_MODE',
  'ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE',
  'MENULIST_GCP_PROJECT_NUMBER',
  'MENULIST_GCP_SERVICE_ACCOUNT_EMAIL',
  'MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID',
  'MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID',
  'ANSWERLATTICE_GCP_PROJECT_NUMBER',
  'ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL',
  'ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID',
  'ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID',
  'MENULIST_FIREBASE_PROJECT_LOCATION',
  'MENULIST_GEMINI_AI_KEY',
  'MENULIST_RAZORPAY_KEY_SECRET',
  'MENULIST_RAZORPAY_WEBHOOK_SECRET',
  'MENULIST_REVALIDATION_SECRET',
  'MENULIST_UPSTASH_REDIS_REST_TOKEN',
  'MENULIST_UPSTASH_REDIS_REST_URL',
  'NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY',
  'NEXT_PUBLIC_MENULIST_FIREBASE_APP_ID',
  'NEXT_PUBLIC_MENULIST_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_MENULIST_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE',
  'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID',
  'NEXT_PUBLIC_USE_EMULATORS',
  'NEXT_PUBLIC_USE_FIREBASE_EMULATORS',
  'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_MODE',
  'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_CAMPAIGNCUE_FIRESTORE_DATABASE_ID',
];

const parseEnvNames = (source) => new Set(
  source
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
    .filter(Boolean),
);

for (const relativePath of ['.env.staging.example', '.env.production.example']) {
  const names = parseEnvNames(read(relativePath));
  const legacyNames = [
    ...LEGACY_PRODUCT_ENV_NAMES,
    ...REDUNDANT_SERVER_PUBLIC_ALIASES,
    ...ROOT_FUNCTION_ONLY_ENV_NAMES,
  ]
    .filter((name) => names.has(name));
  if (legacyNames.length > 0) fail(`${relativePath} contains legacy, redundant, or Functions-only names: ${legacyNames.join(', ')}`);
  const missingNames = REQUIRED_CANONICAL_NAMES.filter((name) => !names.has(name));
  if (missingNames.length > 0) fail(`${relativePath} is missing canonical names: ${missingNames.join(', ')}`);
  const forbiddenStaticKeyNames = [
    'MENULIST_FIREBASE_CLIENT_EMAIL',
    'MENULIST_FIREBASE_PRIVATE_KEY',
    'ANSWERLATTICE_FIREBASE_CLIENT_EMAIL',
    'ANSWERLATTICE_FIREBASE_PRIVATE_KEY',
    'ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS',
  ].filter((name) => names.has(name));
  if (forbiddenStaticKeyNames.length > 0) {
    fail(`${relativePath} must not contain managed Vercel static Firebase Admin credentials: ${forbiddenStaticKeyNames.join(', ')}`);
  }
  for (const retiredName of [
    'MENULIST_GEMINI_AI_KEY_2',
    'MENULIST_GEMINI_AI_KEY_3',
    'MENULIST_GEMINI_AI_KEY_4',
    'ANSWERLATTICE_GEMINI_AI_KEY_2',
    'ANSWERLATTICE_GEMINI_AI_KEY_3',
    'ANSWERLATTICE_GEMINI_AI_KEY_4',
  ]) {
    if (names.has(retiredName)) fail(`${relativePath} contains retired permanent Gemini credential ${retiredName}`);
  }
}

for (const relativePath of ['.env.staging.example', '.env.production.example']) {
  const template = read(relativePath);
  if (!template.includes('NEXT_PUBLIC_USE_EMULATORS=false')) {
    fail(`${relativePath} must keep general emulator behavior disabled in managed environments`);
  }
  if (!template.includes('NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false')) {
    fail(`${relativePath} must keep Firebase browser emulators explicitly disabled in managed environments`);
  }
}

for (const relativePath of ['.env', '.env.local', '.env.prod']) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) continue;
  const names = parseEnvNames(fs.readFileSync(fullPath, 'utf8'));
  const legacyNames = [
    ...LEGACY_PRODUCT_ENV_NAMES,
    ...REDUNDANT_SERVER_PUBLIC_ALIASES,
    ...ROOT_FUNCTION_ONLY_ENV_NAMES,
  ]
    .filter((name) => names.has(name));
  if (legacyNames.length > 0) fail(`${relativePath} contains legacy, redundant, or Functions-only names: ${legacyNames.join(', ')}`);
}

const publicEnvSource = read('src/lib/env/menulistPublicEnv.ts');
const serverEnvSource = read('src/lib/env/menulistServerEnv.ts');
const answerlatticeServerEnvSource = read('src/lib/env/answerlatticeServerEnv.ts');
const campaigncueConfigSource = read('src/lib/firebase/campaigncueConfig.ts');
const envValidationSource = read('src/lib/env/validateEnv.ts');
if (!publicEnvSource.includes('NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY')) {
  fail('MenuList public env reader does not prefer the canonical Firebase family');
}
if (!serverEnvSource.includes("'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID'")) {
  fail('MenuList server env reader lost canonical-first legacy migration behavior');
}
for (const name of [
  'MENULIST_FIREBASE_ADMIN_AUTH_MODE',
  'MENULIST_GCP_PROJECT_NUMBER',
  'MENULIST_GCP_SERVICE_ACCOUNT_EMAIL',
  'MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID',
  'MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID',
]) {
  if (!serverEnvSource.includes(`'${name}'`)) {
    fail(`MenuList server env reader is missing ${name}`);
  }
}
if (!answerlatticeServerEnvSource.includes('ANSWERLATTICE_UPSTASH_REDIS_REST_URL')) {
  fail('Answerlattice Redis does not have a product-scoped namespace');
}
if (!answerlatticeServerEnvSource.includes('NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY')) {
  fail('Answerlattice server Firebase auth does not reuse the canonical public API key');
}
for (const name of [
  'ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE',
  'ANSWERLATTICE_GCP_PROJECT_NUMBER',
  'ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL',
  'ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID',
  'ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID',
]) {
  if (!answerlatticeServerEnvSource.includes(`'${name}'`)) {
    fail(`Answerlattice server env reader is missing ${name}`);
  }
}
for (const name of [
  'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_API_KEY',
  'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET',
]) {
  if (!campaigncueConfigSource.includes(`process.env.${name}`)) {
    fail(`CampaignCue client config does not use a literal ${name} reference`);
  }
}
for (const name of ['MENULIST_WHATSAPP_APP_SECRET', 'MENULIST_WHATSAPP_VERIFY_TOKEN']) {
  if (envValidationSource.includes(`'${name}'`)) {
    fail(`root env validation must not advertise Functions-only ${name}`);
  }
}

const sourceFiles = [];
const collectSourceFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(fullPath);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(fullPath);
  }
};
collectSourceFiles(path.join(root, 'src'));

const allowedLegacyReaderFiles = new Set([
  path.join(root, 'src/lib/env/answerlatticeServerEnv.ts'),
  path.join(root, 'src/lib/env/menulistPublicEnv.ts'),
  path.join(root, 'src/lib/env/menulistServerEnv.ts'),
]);
const directLegacyReaderPattern = /process\.env\.(NEXT_PUBLIC_FIREBASE(?:_[A-Z0-9_]+)?|NEXT_PUBLIC_FB_DATABASE_URL|FIREBASE_(?:API_KEY|CLIENT_EMAIL|PRIVATE_KEY|PROJECT_ID|PROJECT_LOCATION|STORAGE_BUCKET)|NEXT_PUBLIC_RAZORPAY_KEY_ID|RAZORPAY_(?:KEY_ID|KEY_SECRET|WEBHOOK_SECRET)|UPSTASH_REDIS_REST_(?:URL|TOKEN)|WHATSAPP_(?:ACCESS_TOKEN|APP_SECRET|PHONE_NUMBER_ID|VERIFY_TOKEN)|REVALIDATION_SECRET|BATCH_IMAGE_GENERATION_(?:QUEUE_ID|WORKER_SECRET|WORKER_URL)|TELEGRAM_(?:BOT_TOKEN|CHAT_ID))/;
const directReaders = sourceFiles
  .filter((file) => !allowedLegacyReaderFiles.has(file))
  .filter((file) => directLegacyReaderPattern.test(fs.readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file));
if (directReaders.length > 0) fail(`runtime files bypass product-scoped readers: ${directReaders.join(', ')}`);

console.log('Managed MenuList and Answerlattice OIDC environment contracts plus shared product env naming verified.');
