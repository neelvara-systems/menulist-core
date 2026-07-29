const assert = require("node:assert/strict");

require("ts-node").register({
  compilerOptions: { module: "CommonJS", target: "ES2022" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const { SIGNALDESK_FIREBASE_ENV } = require("../../src/constants/signaldesk/firebase");
const { validateEnvironment } = require("../../src/lib/env/validateEnv");

const CONTROLLED_KEYS = Array.from(new Set([
  ...Object.values(SIGNALDESK_FIREBASE_ENV),
  "FIRESTORE_EMULATOR_HOST",
  "GCLOUD_PROJECT",
  "NEXT_PUBLIC_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
]));

const runCase = (overrides) => {
  const previous = Object.fromEntries(CONTROLLED_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of CONTROLLED_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(overrides)) {
      process.env[key] = value;
    }

    const result = validateEnvironment();
    return {
      deploymentMissing: result.missing.filter((message) => message.includes("Deployment stage configuration")),
      deploymentWarnings: result.warnings.filter((message) => message.includes("Deployment stage configuration")),
      missing: result.missing.filter((message) => message.includes("MenuList SignalDesk")),
      warnings: result.warnings.filter((message) => message.includes("MenuList SignalDesk")),
    };
  } finally {
    for (const key of CONTROLLED_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const withoutKeys = (value, keys) => Object.fromEntries(
  Object.entries(value).filter(([key]) => !keys.includes(key)),
);

const exactLocalEnvironment = {
  SIGNALDESK_FIREBASE_CLIENT_EMAIL: "signaldesk-test@example.invalid",
  SIGNALDESK_FIREBASE_MODE: "separate",
  SIGNALDESK_FIREBASE_PRIVATE_KEY: "test-private-key",
  SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
  SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.firebasestorage.app",
  SIGNALDESK_FIRESTORE_DATABASE_ID: "(default)",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_API_KEY: "signaldesk-test-api-key",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_APP_ID: "signaldesk-test-app-id",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_AUTH_DOMAIN: "menulist-signaldesk-qa.firebaseapp.com",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_MODE: "separate",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.firebasestorage.app",
  NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID: "(default)",
  NODE_ENV: "development",
};

const exactProductionEnvironment = {
  ...exactLocalEnvironment,
  SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk",
  SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk.firebasestorage.app",
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_AUTH_DOMAIN: "menulist-signaldesk.firebaseapp.com",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk.firebasestorage.app",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
};

const exactLocal = runCase(exactLocalEnvironment);
assert.deepEqual(exactLocal, {
  deploymentMissing: [],
  deploymentWarnings: [],
  missing: [],
  warnings: [],
});

const normalizedLocal = runCase({
  ...exactLocalEnvironment,
  SIGNALDESK_FIREBASE_STORAGE_BUCKET: " gs://menulist-signaldesk-qa.firebasestorage.app/ ",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET: " gs://menulist-signaldesk-qa.firebasestorage.app/ ",
});
assert.deepEqual(normalizedLocal, {
  deploymentMissing: [],
  deploymentWarnings: [],
  missing: [],
  warnings: [],
});

const missingLocal = runCase({ NODE_ENV: "development" });
assert.equal(missingLocal.missing.length, 0);
assert.ok(missingLocal.warnings.length >= 8);
assert.ok(missingLocal.warnings.some((message) => message.includes("must be menulist-signaldesk-qa for local MenuList SignalDesk")));
assert.ok(missingLocal.warnings.some((message) => message.includes("private and public Firebase modes")));
assert.ok(missingLocal.warnings.some((message) => message.includes("private and public Storage buckets")));
assert.ok(missingLocal.warnings.some((message) => message.includes("complete Admin credential tuple")));

const wrongLocal = runCase({
  ...exactLocalEnvironment,
  SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-qa",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-qa",
});
assert.equal(wrongLocal.missing.length, 0);
assert.equal(wrongLocal.warnings.length, 2);
assert.ok(wrongLocal.warnings.every((message) => message.includes("(currently menulist-qa)")));

const exactProduction = runCase(exactProductionEnvironment);
assert.deepEqual(exactProduction, {
  deploymentMissing: [],
  deploymentWarnings: [],
  missing: [],
  warnings: [],
});

const missingProduction = runCase({
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
});
assert.equal(missingProduction.warnings.length, 0);
assert.ok(missingProduction.missing.length >= 8);
assert.ok(missingProduction.missing.some((message) => message.includes("must be menulist-signaldesk for production MenuList SignalDesk")));
assert.ok(missingProduction.missing.some((message) => message.includes("private and public Storage buckets")));

const wrongProduction = runCase({
  ...exactProductionEnvironment,
  SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
});
assert.equal(wrongProduction.warnings.length, 0);
assert.equal(wrongProduction.missing.length, 2);
assert.ok(wrongProduction.missing.every((message) => message.includes("(currently menulist-signaldesk-qa)")));

const modeConflict = runCase({
  ...exactLocalEnvironment,
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_MODE: "shared",
});
assert.ok(modeConflict.warnings.some((message) => message.includes("must agree and equal separate")));

const databaseConflict = runCase({
  ...exactLocalEnvironment,
  NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID: "signaldesk-db",
});
assert.ok(databaseConflict.warnings.some((message) => message.includes("database IDs must agree")));

const nonDefaultDatabase = runCase({
  ...exactLocalEnvironment,
  SIGNALDESK_FIRESTORE_DATABASE_ID: "signaldesk-db",
  NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID: "signaldesk-db",
});
assert.ok(nonDefaultDatabase.warnings.some((message) => message.includes("must be the default database")));

const missingBucket = runCase(withoutKeys(exactLocalEnvironment, [
  "SIGNALDESK_FIREBASE_STORAGE_BUCKET",
]));
assert.ok(missingBucket.warnings.some((message) => message.includes("both required")));

const invalidBucket = runCase({
  ...exactLocalEnvironment,
  SIGNALDESK_FIREBASE_STORAGE_BUCKET: "https://storage.example/bucket",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "https://storage.example/bucket",
});
assert.ok(invalidBucket.warnings.some((message) => message.includes("valid Firebase bucket names")));

const bucketConflict = runCase({
  ...exactLocalEnvironment,
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.appspot.com",
});
assert.ok(bucketConflict.warnings.some((message) => message.includes("Storage buckets must agree")));

const foreignBucket = runCase({
  ...exactLocalEnvironment,
  SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-qa.firebasestorage.app",
  NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-qa.firebasestorage.app",
});
assert.ok(foreignBucket.warnings.some((message) => message.includes("project-owned default bucket")));

const missingClientEssential = runCase(withoutKeys(exactLocalEnvironment, [
  "NEXT_PUBLIC_SIGNALDESK_FIREBASE_AUTH_DOMAIN",
]));
assert.ok(missingClientEssential.warnings.some((message) => message.includes("AUTH_DOMAIN is required")));

const missingAdminCredential = runCase(withoutKeys(exactLocalEnvironment, [
  "SIGNALDESK_FIREBASE_PRIVATE_KEY",
]));
assert.ok(missingAdminCredential.warnings.some((message) => message.includes("complete Admin credential tuple")));

const partialAdminCredentialWithFile = runCase({
  ...withoutKeys(exactLocalEnvironment, ["SIGNALDESK_FIREBASE_PRIVATE_KEY"]),
  SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS: "/tmp/signaldesk-service-account.json",
});
assert.ok(partialAdminCredentialWithFile.warnings.some((message) => message.includes("partial Admin credential tuples")));

const stageConflict = runCase({
  ...exactLocalEnvironment,
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
});
assert.deepEqual(stageConflict.deploymentWarnings, []);
assert.equal(stageConflict.deploymentMissing.length, 1);
assert.ok(stageConflict.deploymentMissing[0].includes("SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT"));

const missingServerVercelStage = runCase({
  ...exactProductionEnvironment,
  VERCEL_ENV: "",
});
assert.equal(missingServerVercelStage.deploymentMissing.length, 1);
assert.ok(missingServerVercelStage.deploymentMissing[0].includes("MISSING_SERVER_VERCEL_STAGE"));

process.stdout.write("SignalDesk environment project-validation tests passed.\n");
