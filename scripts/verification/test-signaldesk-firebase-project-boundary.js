const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { generateKeyPairSync } = require("node:crypto");

const TEST_PREFIX = "SIGNALDESK_FIREBASE_BOUNDARY_TEST_";

const loadFreshBootstrapState = () => {
  require("ts-node").register({
    compilerOptions: { module: "CommonJS", target: "ES2022" },
    transpileOnly: true,
  });
  require("tsconfig-paths/register");

  const firebaseAdmin = require("firebase-admin");
  const firebaseApp = require("firebase/app");
  const preinitializeAdminProject = process.env[`${TEST_PREFIX}PREINITIALIZE_ADMIN_PROJECT`];
  const preinitializeAdminBucket = process.env[`${TEST_PREFIX}PREINITIALIZE_ADMIN_BUCKET`];
  const preinitializeDefaultAdminProject = process.env[`${TEST_PREFIX}PREINITIALIZE_DEFAULT_ADMIN_PROJECT`];
  if (preinitializeDefaultAdminProject) {
    firebaseAdmin.initializeApp({ projectId: preinitializeDefaultAdminProject });
  }
  if (preinitializeAdminProject) {
    firebaseAdmin.initializeApp({
      projectId: preinitializeAdminProject,
      ...(preinitializeAdminBucket ? { storageBucket: preinitializeAdminBucket } : {}),
    }, "menulist-signaldesk-admin");
  }

  const preinitializeClientProject = process.env[`${TEST_PREFIX}PREINITIALIZE_CLIENT_PROJECT`];
  const preinitializeDefaultClientProject = process.env[`${TEST_PREFIX}PREINITIALIZE_DEFAULT_CLIENT_PROJECT`];
  if (preinitializeDefaultClientProject) {
    firebaseApp.initializeApp({
      apiKey: "default-test-api-key",
      appId: "default-test-app-id",
      projectId: preinitializeDefaultClientProject,
    });
  }
  if (preinitializeClientProject) {
    firebaseApp.initializeApp({
      apiKey: process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_API_KEY || "existing-test-api-key",
      appId: process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_APP_ID || "existing-test-app-id",
      authDomain: process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_AUTH_DOMAIN,
      messagingSenderId: process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MESSAGING_SENDER_ID,
      projectId: preinitializeClientProject,
      storageBucket: process.env[`${TEST_PREFIX}PREINITIALIZE_CLIENT_BUCKET`]
        || process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET,
    }, "menulist-signaldesk");
  }

  const config = require("../../src/lib/firebase/signaldeskConfig");
  const adminModulePath = require.resolve("../../src/lib/firebase/signaldeskFirebaseAdmin");
  const clientModulePath = require.resolve("../../src/lib/firebase/signaldeskFirebaseClient");
  const adminBootstrap = require(adminModulePath);
  const clientBootstrap = require(clientModulePath);
  let reloadedAdminBootstrap = null;
  let reloadedClientBootstrap = null;

  if (process.env[`${TEST_PREFIX}RELOAD_BOOTSTRAPS`] === "1") {
    delete require.cache[adminModulePath];
    delete require.cache[clientModulePath];
    reloadedAdminBootstrap = require(adminModulePath);
    reloadedClientBootstrap = require(clientModulePath);
  }

  return {
    adminAppName: adminBootstrap.signaldeskAdminApp?.name || null,
    adminAppProjectId: adminBootstrap.signaldeskAdminApp?.options.projectId || null,
    adminAppStorageBucket: adminBootstrap.signaldeskAdminApp?.options.storageBucket || null,
    adminFirestoreInitialized: Boolean(adminBootstrap.signaldeskFirestoreAdmin),
    allAdminApps: firebaseAdmin.apps.map((app) => ({
      name: app?.name || null,
      projectId: app?.options.projectId || null,
      storageBucket: app?.options.storageBucket || null,
    })),
    allClientApps: firebaseApp.getApps().map((app) => ({
      name: app.name,
      projectId: app.options.projectId || null,
      storageBucket: app.options.storageBucket || null,
    })),
    boundary: config.signaldeskFirebaseBoundary,
    clientAppName: clientBootstrap.signaldeskApp?.name || null,
    clientAppProjectId: clientBootstrap.signaldeskApp?.options.projectId || null,
    clientAppStorageBucket: clientBootstrap.signaldeskApp?.options.storageBucket || null,
    clientFirestoreInitialized: Boolean(clientBootstrap.signaldeskFirebaseClient),
    configStorageBucket: config.default.storageBucket || null,
    isAdminConfigured: config.isSignalDeskFirebaseAdminConfigured,
    isClientConfigured: config.isSignalDeskFirebaseClientConfigured,
    isConfigured: config.isSignalDeskFirebaseConfigured,
    reloadReusedAdminApp: reloadedAdminBootstrap
      ? reloadedAdminBootstrap.signaldeskAdminApp === adminBootstrap.signaldeskAdminApp
      : null,
    reloadReusedClientApp: reloadedClientBootstrap
      ? reloadedClientBootstrap.signaldeskApp === clientBootstrap.signaldeskApp
      : null,
  };
};

if (process.argv.includes("--child")) {
  process.stdout.write(`${JSON.stringify(loadFreshBootstrapState())}\n`);
  process.exit(0);
}

const testPrivateKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
}).privateKey;

const cleanEnvironment = () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("MENULIST_SIGNALDESK_")
      || key.startsWith("NEXT_PUBLIC_MENULIST_SIGNALDESK_")
      || key.startsWith(TEST_PREFIX)
      || [
        "FIRESTORE_EMULATOR_HOST",
        "GCLOUD_PROJECT",
        "GOOGLE_CLOUD_PROJECT",
        "NEXT_PUBLIC_ENV",
        "NEXT_PUBLIC_VERCEL_ENV",
        "NODE_ENV",
        "VERCEL",
        "VERCEL_ENV",
      ].includes(key)
    ) {
      delete env[key];
    }
  }
  env.NODE_ENV = "test";
  return env;
};

const runCase = (name, overrides) => {
  const child = spawnSync(process.execPath, [__filename, "--child"], {
    cwd: path.resolve(__dirname, "../.."),
    encoding: "utf8",
    env: { ...cleanEnvironment(), ...overrides },
  });

  assert.equal(child.status, 0, `${name} child failed:\n${child.stderr || child.stdout}`);
  const lines = child.stdout.trim().split("\n").filter(Boolean);
  assert.ok(lines.length > 0, `${name} child returned no bootstrap state`);
  return JSON.parse(lines.at(-1));
};

const withoutKeys = (value, keys) => Object.fromEntries(
  Object.entries(value).filter(([key]) => !keys.includes(key)),
);

const exactDedicatedEnvironment = {
  MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.firebasestorage.app",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_API_KEY: "signaldesk-test-api-key",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_APP_ID: "signaldesk-test-app-id",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_AUTH_DOMAIN: "menulist-signaldesk-qa.firebaseapp.com",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.firebasestorage.app",
};

const assertNoSignalDeskBootstrap = (state, expectedErrorCode) => {
  assert.equal(state.boundary.valid, false);
  assert.equal(state.boundary.errorCode, expectedErrorCode);
  assert.equal(state.isConfigured, false);
  assert.equal(state.isAdminConfigured, false);
  assert.equal(state.isClientConfigured, false);
  assert.equal(state.adminAppName, null);
  assert.equal(state.adminFirestoreInitialized, false);
  assert.equal(state.clientAppName, null);
  assert.equal(state.clientFirestoreInitialized, false);
};

assertNoSignalDeskBootstrap(runCase("missing configuration", {}), "MISSING_MODE");

const exactDedicated = runCase("exact dedicated configuration", exactDedicatedEnvironment);
assert.equal(exactDedicated.boundary.valid, true);
assert.equal(exactDedicated.boundary.mode, "separate");
assert.equal(exactDedicated.boundary.activeProjectId, "menulist-signaldesk-qa");
assert.equal(exactDedicated.boundary.activeStorageBucket, "menulist-signaldesk-qa.firebasestorage.app");
assert.equal(exactDedicated.isConfigured, false, "client-only configuration must not report server readiness");
assert.equal(exactDedicated.isClientConfigured, true);
assert.equal(exactDedicated.isAdminConfigured, false);
assert.equal(exactDedicated.clientAppName, "menulist-signaldesk");
assert.equal(exactDedicated.clientAppProjectId, "menulist-signaldesk-qa");
assert.equal(exactDedicated.clientAppStorageBucket, "menulist-signaldesk-qa.firebasestorage.app");
assert.equal(exactDedicated.clientFirestoreInitialized, true);
assert.equal(exactDedicated.adminAppName, null);
assert.equal(exactDedicated.adminFirestoreInitialized, false);

const exactAdminEnvironment = {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_CLIENT_EMAIL: "signaldesk-test@example.invalid",
  MENULIST_SIGNALDESK_FIREBASE_PRIVATE_KEY: testPrivateKey,
};
const exactAdmin = runCase("exact dedicated Admin configuration", {
  ...exactAdminEnvironment,
  [`${TEST_PREFIX}RELOAD_BOOTSTRAPS`]: "1",
});
assert.equal(exactAdmin.boundary.valid, true);
assert.equal(exactAdmin.isConfigured, true);
assert.equal(exactAdmin.isAdminConfigured, true);
assert.equal(exactAdmin.adminAppName, "menulist-signaldesk-admin");
assert.equal(exactAdmin.adminAppProjectId, "menulist-signaldesk-qa");
assert.equal(exactAdmin.adminAppStorageBucket, "menulist-signaldesk-qa.firebasestorage.app");
assert.equal(exactAdmin.adminFirestoreInitialized, true);
assert.equal(exactAdmin.reloadReusedAdminApp, true);
assert.equal(exactAdmin.reloadReusedClientApp, true);

const adminCannotUsePublicBucket = runCase(
  "Admin cannot fall back to public Storage bucket",
  withoutKeys(exactAdminEnvironment, ["MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET"]),
);
assert.equal(adminCannotUsePublicBucket.boundary.valid, true);
assert.equal(adminCannotUsePublicBucket.isClientConfigured, true);
assert.equal(adminCannotUsePublicBucket.isAdminConfigured, false);
assert.equal(adminCannotUsePublicBucket.isConfigured, false);
assert.equal(adminCannotUsePublicBucket.adminAppName, null);
assert.equal(adminCannotUsePublicBucket.clientAppName, "menulist-signaldesk");

const exactProduction = runCase("exact production dedicated configuration", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk",
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk.firebasestorage.app",
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_AUTH_DOMAIN: "menulist-signaldesk.firebaseapp.com",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk.firebasestorage.app",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
});
assert.equal(exactProduction.boundary.valid, true);
assert.equal(exactProduction.boundary.expectedProjectId, "menulist-signaldesk");
assert.equal(exactProduction.clientAppProjectId, "menulist-signaldesk");
assert.equal(exactProduction.clientAppStorageBucket, "menulist-signaldesk.firebasestorage.app");

assertNoSignalDeskBootstrap(runCase("QA project in production", {
  ...exactDedicatedEnvironment,
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
}), "PROJECT_ID_MISMATCH");

assertNoSignalDeskBootstrap(runCase("public/private mode conflict", {
  ...exactDedicatedEnvironment,
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "shared",
}), "MODE_CONFLICT");

assertNoSignalDeskBootstrap(runCase("shared mode", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_MODE: "shared",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "shared",
}), "SHARED_MODE_NOT_ALLOWED");

assertNoSignalDeskBootstrap(runCase("invalid mode", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_MODE: "isolated",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "isolated",
}), "INVALID_MODE");

assertNoSignalDeskBootstrap(runCase("public/private project conflict", {
  ...exactDedicatedEnvironment,
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk",
}), "PROJECT_ID_CONFLICT");

assertNoSignalDeskBootstrap(runCase("wrong deployment project", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-qa",
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-qa.firebasestorage.app",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-qa",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-qa.firebasestorage.app",
}), "PROJECT_ID_MISMATCH");

assertNoSignalDeskBootstrap(runCase("non-default database", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID: "signaldesk-tenant-db",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID: "signaldesk-tenant-db",
}), "NON_DEFAULT_DATABASE_NOT_ALLOWED");

const explicitDefaultDatabase = runCase("explicit default database", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID: "(default)",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID: "(default)",
});
assert.equal(explicitDefaultDatabase.boundary.valid, true);
assert.equal(explicitDefaultDatabase.clientFirestoreInitialized, true);

assertNoSignalDeskBootstrap(runCase(
  "missing storage bucket",
  withoutKeys(exactDedicatedEnvironment, [
    "MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET",
  ]),
), "MISSING_STORAGE_BUCKET");

assertNoSignalDeskBootstrap(runCase("storage bucket conflict", {
  ...exactDedicatedEnvironment,
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.appspot.com",
}), "STORAGE_BUCKET_CONFLICT");

assertNoSignalDeskBootstrap(runCase("foreign project storage bucket", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-qa.firebasestorage.app",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-qa.firebasestorage.app",
}), "STORAGE_BUCKET_PROJECT_MISMATCH");

assertNoSignalDeskBootstrap(runCase("invalid storage bucket", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "https://storage.example/bucket",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "https://storage.example/bucket",
}), "INVALID_STORAGE_BUCKET");

const legacyDefaultBucket = runCase("appspot default bucket", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.appspot.com",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.appspot.com",
});
assert.equal(legacyDefaultBucket.boundary.valid, true);
assert.equal(legacyDefaultBucket.clientAppStorageBucket, "menulist-signaldesk-qa.appspot.com");

const canonicalizedBucket = runCase("canonicalized project bucket", {
  ...exactDedicatedEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "  menulist-signaldesk-qa  ",
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "  gs://menulist-signaldesk-qa.firebasestorage.app/  ",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "  menulist-signaldesk-qa  ",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "  gs://menulist-signaldesk-qa.firebasestorage.app/  ",
});
assert.equal(canonicalizedBucket.boundary.valid, true);
assert.equal(canonicalizedBucket.configStorageBucket, "menulist-signaldesk-qa.firebasestorage.app");
assert.equal(canonicalizedBucket.clientAppProjectId, "menulist-signaldesk-qa");
assert.equal(canonicalizedBucket.clientAppStorageBucket, "menulist-signaldesk-qa.firebasestorage.app");

const emulatorProjectId = "demo-signaldesk-firebase-boundary";
const emulatorEnvironment = {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  GCLOUD_PROJECT: emulatorProjectId,
  MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: emulatorProjectId,
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_API_KEY: "signaldesk-emulator-api-key",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_APP_ID: "signaldesk-emulator-app-id",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_AUTH_DOMAIN: "localhost",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: emulatorProjectId,
};
const emulator = runCase("dedicated emulator", {
  ...emulatorEnvironment,
  [`${TEST_PREFIX}PREINITIALIZE_DEFAULT_ADMIN_PROJECT`]: "menulist-qa",
  [`${TEST_PREFIX}PREINITIALIZE_DEFAULT_CLIENT_PROJECT`]: "menulist-qa",
  [`${TEST_PREFIX}RELOAD_BOOTSTRAPS`]: "1",
});
assert.equal(emulator.boundary.valid, true);
assert.equal(emulator.boundary.isEmulator, true);
assert.equal(emulator.boundary.activeStorageBucket, `${emulatorProjectId}.appspot.com`);
assert.equal(emulator.isConfigured, true);
assert.equal(emulator.adminAppName, "menulist-signaldesk-admin");
assert.equal(emulator.adminAppProjectId, emulatorProjectId);
assert.equal(emulator.adminAppStorageBucket, `${emulatorProjectId}.appspot.com`);
assert.equal(emulator.adminFirestoreInitialized, true);
assert.equal(emulator.clientAppName, "menulist-signaldesk");
assert.equal(emulator.clientAppProjectId, emulatorProjectId);
assert.equal(emulator.clientAppStorageBucket, `${emulatorProjectId}.appspot.com`);
assert.equal(emulator.clientFirestoreInitialized, true);
assert.equal(emulator.reloadReusedAdminApp, true);
assert.equal(emulator.reloadReusedClientApp, true);
assert.ok(emulator.allAdminApps.some((app) => app.name === "[DEFAULT]" && app.projectId === "menulist-qa"));
assert.ok(emulator.allClientApps.some((app) => app.name === "[DEFAULT]" && app.projectId === "menulist-qa"));

assertNoSignalDeskBootstrap(runCase("foreign emulator project", {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  GCLOUD_PROJECT: "demo-menulist",
  MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "demo-menulist",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "demo-menulist",
}), "EMULATOR_PROJECT_MISMATCH");

assertNoSignalDeskBootstrap(runCase("malformed SignalDesk emulator project", {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  GCLOUD_PROJECT: "demo-signaldesk-",
  MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "demo-signaldesk-",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "demo-signaldesk-",
}), "EMULATOR_PROJECT_MISMATCH");

assertNoSignalDeskBootstrap(runCase("foreign emulator storage bucket", {
  ...emulatorEnvironment,
  MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "demo-menulist.appspot.com",
  NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "demo-menulist.appspot.com",
}), "STORAGE_BUCKET_PROJECT_MISMATCH");

const staleAdminApp = runCase("stale named Admin app", {
  ...emulatorEnvironment,
  [`${TEST_PREFIX}PREINITIALIZE_ADMIN_PROJECT`]: "menulist-qa",
  [`${TEST_PREFIX}PREINITIALIZE_ADMIN_BUCKET`]: "menulist-qa.appspot.com",
});
assert.equal(staleAdminApp.boundary.valid, true);
assert.equal(staleAdminApp.isAdminConfigured, true);
assert.equal(staleAdminApp.adminAppName, null);
assert.equal(staleAdminApp.adminFirestoreInitialized, false);

const unmarkedExactAdminApp = runCase("unmarked exact named Admin app", {
  ...emulatorEnvironment,
  [`${TEST_PREFIX}PREINITIALIZE_ADMIN_PROJECT`]: emulatorProjectId,
  [`${TEST_PREFIX}PREINITIALIZE_ADMIN_BUCKET`]: `${emulatorProjectId}.appspot.com`,
});
assert.equal(unmarkedExactAdminApp.boundary.valid, true);
assert.equal(unmarkedExactAdminApp.isAdminConfigured, true);
assert.equal(unmarkedExactAdminApp.adminAppName, null);
assert.equal(unmarkedExactAdminApp.adminFirestoreInitialized, false);

const staleClientApp = runCase("stale named client app", {
  ...exactDedicatedEnvironment,
  [`${TEST_PREFIX}PREINITIALIZE_CLIENT_PROJECT`]: "menulist-qa",
  [`${TEST_PREFIX}PREINITIALIZE_CLIENT_BUCKET`]: "menulist-qa.firebasestorage.app",
});
assert.equal(staleClientApp.boundary.valid, true);
assert.equal(staleClientApp.isClientConfigured, true);
assert.equal(staleClientApp.clientAppName, null);
assert.equal(staleClientApp.clientFirestoreInitialized, false);

const unmarkedExactClientApp = runCase("unmarked exact named client app", {
  ...exactDedicatedEnvironment,
  [`${TEST_PREFIX}PREINITIALIZE_CLIENT_PROJECT`]: "menulist-signaldesk-qa",
  [`${TEST_PREFIX}PREINITIALIZE_CLIENT_BUCKET`]: "menulist-signaldesk-qa.firebasestorage.app",
});
assert.equal(unmarkedExactClientApp.boundary.valid, true);
assert.equal(unmarkedExactClientApp.isClientConfigured, true);
assert.equal(unmarkedExactClientApp.clientAppName, null);
assert.equal(unmarkedExactClientApp.clientFirestoreInitialized, false);

const credentialDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "signaldesk-firebase-boundary-"));
const mismatchedCredentialPath = path.join(credentialDirectory, "service-account.json");
const matchingCredentialPath = path.join(credentialDirectory, "matching-service-account.json");
try {
  fs.writeFileSync(mismatchedCredentialPath, JSON.stringify({
    client_email: "signaldesk-test@example.invalid",
    private_key: "not-used-because-project-mismatch",
    project_id: "menulist-qa",
  }));
  const mismatchedCredential = runCase("service-account project mismatch", {
    MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
    MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
    MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.firebasestorage.app",
    MENULIST_SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS: mismatchedCredentialPath,
  });
  assert.equal(mismatchedCredential.boundary.valid, true);
  assert.equal(mismatchedCredential.adminAppName, null);
  assert.equal(mismatchedCredential.adminFirestoreInitialized, false);

  fs.writeFileSync(matchingCredentialPath, JSON.stringify({
    client_email: "signaldesk-test@example.invalid",
    private_key: testPrivateKey,
    project_id: "menulist-signaldesk-qa",
  }));
  const matchingCredential = runCase("service-account project match", {
    MENULIST_SIGNALDESK_FIREBASE_MODE: "separate",
    MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID: "menulist-signaldesk-qa",
    MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET: "menulist-signaldesk-qa.firebasestorage.app",
    MENULIST_SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS: matchingCredentialPath,
    [`${TEST_PREFIX}RELOAD_BOOTSTRAPS`]: "1",
  });
  assert.equal(matchingCredential.boundary.valid, true);
  assert.equal(matchingCredential.isConfigured, true);
  assert.equal(matchingCredential.isAdminConfigured, true);
  assert.equal(matchingCredential.isClientConfigured, false);
  assert.equal(matchingCredential.adminAppName, "menulist-signaldesk-admin");
  assert.equal(matchingCredential.adminAppStorageBucket, "menulist-signaldesk-qa.firebasestorage.app");
  assert.equal(matchingCredential.adminFirestoreInitialized, true);
  assert.equal(matchingCredential.reloadReusedAdminApp, true);
} finally {
  fs.rmSync(credentialDirectory, { force: true, recursive: true });
}

process.stdout.write("SignalDesk Firebase project-boundary tests passed.\n");
