#!/usr/bin/env node

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_MANIFEST_FILES = [
  'functions/src/aggregateCustomerAnalytics.ts',
  'functions/src/config/secrets.ts',
  'functions/src/decisionBlocksScoring.ts',
  'functions/src/dev-triggers.ts',
  'functions/src/emailOs/http.ts',
  'functions/src/emailOs/webhook.ts',
  'functions/src/index.ts',
  'functions/src/messagingOnboarding/webhookHandler.ts',
  'functions/src/schedulers/masterScheduler.ts',
  'functions/src/schedulers/menulistMaintenanceScheduler.ts',
  'functions/src/triggers/messaging.ts',
  'functions/src/triggers/operations.ts',
  'functions/src/triggers/production.ts',
  'functions/src/triggers/shared.ts',
];

const EXPECTED_MENU_LIST_EXPORTS = [
  'backfillStoresSummary',
  'computeDecisionBlocksScores',
  'forceRepublish',
  'gcpBudgetAlertWebhook',
  'mapsPlaceCheck',
  'menulistEmailOsWebhook',
  'menulistMaintenanceScheduler',
  'messagingOnboarding',
  'msgExtractionWatcher',
  'processMenuImages',
  'triggerCustomerAnalyticsManually',
  'triggerDecisionBlocksScoring',
  'triggerSchedulerManually',
  'triggerStoreNightlyScheduler',
  'triggerWeeklyNarrativeManually',
  'verifyMenuPublish',
];

const EMULATOR_ONLY_EXPORTS = [
  'dev_triggerFinalizePublish',
  'dev_triggerProcessMenuImages',
  'dev_triggerStartGeneration',
];

const DEPLOYED_ONLY_EXPORTS = [
  'finalizePublish',
  'processMenuImagesJob',
  'retryGeneration',
  'startGeneration',
];

function requireIsolatedEmulator() {
  assert.equal(process.env.FUNCTIONS_EMULATOR, 'true');
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-menulist-function-runtime');
  assert.match(String(process.env.FIRESTORE_EMULATOR_HOST || ''), /^(?:127\.0\.0\.1|localhost):\d+$/);
  assert.match(String(process.env.FIREBASE_AUTH_EMULATOR_HOST || ''), /^(?:127\.0\.0\.1|localhost):\d+$/);
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
}

function getSourceManifestSha256() {
  const hash = createHash('sha256');
  for (const relativePath of SOURCE_MANIFEST_FILES) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function makeHttpBoundaryRequest(overrides = {}) {
  const headers = {};
  return {
    body: {},
    headers,
    ip: '127.0.0.1',
    method: 'GET',
    path: '/unsupported-provider',
    query: {},
    rawBody: Buffer.alloc(0),
    get(name) {
      return headers[String(name).toLowerCase()];
    },
    header(name) {
      return headers[String(name).toLowerCase()];
    },
    ...overrides,
  };
}

function makeHttpBoundaryResponse() {
  const record = { body: undefined, headers: {}, statusCode: 200 };
  const response = {
    end() {
      return response;
    },
    json(body) {
      record.body = body;
      return response;
    },
    send(body) {
      record.body = body;
      return response;
    },
    set(name, value) {
      record.headers[String(name).toLowerCase()] = String(value);
      return response;
    },
    status(statusCode) {
      record.statusCode = statusCode;
      return response;
    },
  };
  return { record, response };
}

async function expectCallableCode(runtime, name, expectedCode) {
  assert.equal(typeof runtime[name]?.run, 'function', `${name} must expose a runtime test hook.`);
  await assert.rejects(
    () => runtime[name].run({ auth: undefined, data: {}, rawRequest: {} }),
    (error) => error?.code === expectedCode,
    `${name} must reject with ${expectedCode}.`,
  );
}

async function expectCallableRequestCode(runtime, name, request, expectedCode) {
  assert.equal(typeof runtime[name]?.run, 'function', `${name} must expose a runtime test hook.`);
  await assert.rejects(
    () => runtime[name].run(request),
    (error) => error?.code === expectedCode,
    `${name} must reject the supplied request with ${expectedCode}.`,
  );
}

async function runHttpBoundary(runtime, name, request, expectedStatus) {
  assert.equal(typeof runtime[name], 'function', `${name} must be an HTTP handler.`);
  const { record, response } = makeHttpBoundaryResponse();
  await runtime[name](request, response);
  assert.equal(record.statusCode, expectedStatus, `${name} returned the wrong boundary status.`);
  return record;
}

function buildNoWorkMaintenanceState(now) {
  const dayKey = now.toISOString().slice(0, 10);
  const intervalTasks = {
    alert_escalation: 30,
    ai_image_prompt_cache_cleanup: 60,
    founder_monitor_snapshot: 30,
    menu_stuck_cleanup: 15,
    messaging_intake: 2,
    special_menu_lifecycle: 2,
    subscription_access_expiry: 60,
  };
  const dailyTasks = [
    'ai_operation_detail_cleanup',
    'ai_provider_health_check',
    'billing_health_snapshot',
    'chat_stats_aggregation',
    'feedback_event_retention_cleanup',
    'image_batch_job_retention_cleanup',
    'menu_old_cleanup',
    'menu_snapshot_cleanup',
    'messaging_session_cleanup',
    'owner_business_assistant_cleanup',
    'owner_notification_retention_cleanup',
    'public_menu_draft_cleanup',
    'reseller_license_expiry',
    'scheduler_run_log_retention_cleanup',
    'subscription_reconciliation',
    'system_alert_retention_cleanup',
  ];
  const tasks = {};
  for (const [name, minutes] of Object.entries(intervalTasks)) {
    tasks[name] = { lastAttemptBucket: Math.floor(now.getTime() / (minutes * 60_000)) };
  }
  for (const name of dailyTasks) tasks[name] = { lastCompletedDayKey: dayKey };
  return { tasks };
}

async function runDeployedOnlyBoundary() {
  assert.notEqual(process.env.FUNCTIONS_EMULATOR, 'true');
  const runtime = require('../../functions/lib/index.js');
  for (const name of DEPLOYED_ONLY_EXPORTS) {
    assert.equal(typeof runtime[name]?.run, 'function', `${name} must expose its deployed trigger hook.`);
  }
  for (const name of EMULATOR_ONLY_EXPORTS) assert.equal(runtime[name], undefined);

  const event = {
    data: undefined,
    id: 'deterministic-missing-event',
    params: { jobId: 'deterministic-missing-job' },
    source: 'menulist-rc-certification',
    specversion: '1.0',
    time: new Date(0).toISOString(),
    type: 'google.cloud.firestore.document.v1.written',
  };
  assert.equal(await runtime.startGeneration.run(event), undefined);
  assert.equal(await runtime.processMenuImagesJob.run(event), undefined);
  assert.equal(await runtime.retryGeneration.run(event), undefined);
  assert.equal(await runtime.finalizePublish.run(event), null);
}

async function runEmulatorBoundary() {
  requireIsolatedEmulator();
  const runtime = require('../../functions/lib/index.js');
  const { firestoreAdmin } = require('../../functions/lib/firebaseAdmin.js');
  const { DB_COLLECTIONS } = require('../../functions/lib/constants/database.js');
  const runtimeNames = new Set(Object.keys(runtime));
  for (const name of [...EXPECTED_MENU_LIST_EXPORTS, ...EMULATOR_ONLY_EXPORTS]) {
    assert.equal(runtimeNames.has(name), true, `Missing emulator MenuList export ${name}.`);
  }
  for (const name of DEPLOYED_ONLY_EXPORTS) assert.equal(runtime[name], undefined);

  const callableCodes = {
    backfillStoresSummary: 'unauthenticated',
    dev_triggerFinalizePublish: 'invalid-argument',
    dev_triggerProcessMenuImages: 'invalid-argument',
    dev_triggerStartGeneration: 'invalid-argument',
    forceRepublish: 'unauthenticated',
    mapsPlaceCheck: 'invalid-argument',
    processMenuImages: 'unauthenticated',
    triggerCustomerAnalyticsManually: 'unauthenticated',
    triggerDecisionBlocksScoring: 'unauthenticated',
    triggerSchedulerManually: 'unauthenticated',
    triggerStoreNightlyScheduler: 'unauthenticated',
    triggerWeeklyNarrativeManually: 'unauthenticated',
    verifyMenuPublish: 'unauthenticated',
  };
  for (const [name, code] of Object.entries(callableCodes)) {
    await expectCallableCode(runtime, name, code);
  }
  await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('runtime-platform-owner').set({
    active: true,
    authDisabled: false,
    blocked: false,
    deleted: false,
    isVerified: true,
    platformRole: 'PLATFORM',
  });
  const platformOwnerRequest = {
    auth: {
      token: { platformRole: 'PLATFORM', uId: 'runtime-platform-owner' },
      uid: 'runtime-platform-owner',
    },
    data: {},
    rawRequest: {},
  };
  await expectCallableRequestCode(
    runtime,
    'processMenuImages',
    platformOwnerRequest,
    'failed-precondition',
  );
  await expectCallableRequestCode(runtime, 'forceRepublish', platformOwnerRequest, 'invalid-argument');
  await expectCallableRequestCode(runtime, 'verifyMenuPublish', platformOwnerRequest, 'invalid-argument');
  await expectCallableRequestCode(runtime, 'triggerStoreNightlyScheduler', platformOwnerRequest, 'invalid-argument');
  await assert.rejects(
    () => runtime.triggerDecisionBlocksScoring.run(platformOwnerRequest),
    (error) => error?.code === 'failed-precondition' || error?.code === 'invalid-argument',
    'Decision Blocks manual scoring must fail closed before any unscoped work.',
  );

  const backfillResult = await runtime.backfillStoresSummary.run(platformOwnerRequest);
  assert.equal(backfillResult.status, 'success');
  assert.equal(backfillResult.storesCount, 0);
  await firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
    stores: {
      '1': {
        storeId: '1',
        tId: '1',
        timeZone: 'UTC',
      },
    },
  });
  const analyticsResult = await runtime.triggerCustomerAnalyticsManually.run({
    ...platformOwnerRequest,
    data: { projectId: 'runtime-project', sId: '1', tId: '1' },
  });
  assert.equal(analyticsResult.status, 'success');
  assert.equal(analyticsResult.summaryUpdated, false);
  await expectCallableRequestCode(
    runtime,
    'triggerSchedulerManually',
    platformOwnerRequest,
    'failed-precondition',
  );
  await expectCallableRequestCode(
    runtime,
    'triggerWeeklyNarrativeManually',
    platformOwnerRequest,
    'failed-precondition',
  );

  assert.equal(
    await runtime.msgExtractionWatcher.run({
      data: undefined,
      id: 'deterministic-no-data-event',
      params: { jobId: 'deterministic-no-data-job' },
      source: 'menulist-rc-certification',
      specversion: '1.0',
      time: new Date(0).toISOString(),
      type: 'google.cloud.firestore.document.v1.updated',
    }),
    undefined,
  );

  const emailResponse = await runHttpBoundary(
    runtime,
    'menulistEmailOsWebhook',
    makeHttpBoundaryRequest({ method: 'GET', path: '/menulistEmailOsWebhook' }),
    405,
  );
  assert.equal(emailResponse.headers.allow, 'POST');
  await runHttpBoundary(
    runtime,
    'gcpBudgetAlertWebhook',
    makeHttpBoundaryRequest({ method: 'GET', path: '/gcpBudgetAlertWebhook' }),
    405,
  );
  await runHttpBoundary(
    runtime,
    'messagingOnboarding',
    makeHttpBoundaryRequest({ method: 'POST', path: '/unsupported-provider' }),
    200,
  );

  const maintenanceModule = require('../../functions/lib/schedulers/menulistMaintenanceScheduler.js');
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const maintenanceState = buildNoWorkMaintenanceState(now);
  assert.deepEqual(maintenanceModule.getDueMaintenanceTaskNamesForTest(maintenanceState, now), []);
  await firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM).doc('menulistMaintenanceScheduler').set(maintenanceState);
  await firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM).doc('decisionBlocksPlatformDaily').set({
    lastCompletedDayKey: dayKey,
    status: 'completed',
  });

  const noStoreRunLogQuery = firestoreAdmin.collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS)
    .where('reason', '==', 'no_stores_for_hour');
  const runLogsBefore = await noStoreRunLogQuery.get();
  assert.equal(await runtime.menulistMaintenanceScheduler.run({ scheduleTime: now.toISOString() }), undefined);
  assert.equal(await runtime.computeDecisionBlocksScores.run({ scheduleTime: now.toISOString() }), undefined);
  const runLogsAfter = await noStoreRunLogQuery.get();
  assert.equal(
    runLogsAfter.size,
    runLogsBefore.size + 1,
    'The empty scheduler path must append exactly one bounded audit row.',
  );

  const child = spawnSync(process.execPath, [__filename, '--deployed-only'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      FUNCTIONS_EMULATOR: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(child.status, 0, `Deployed trigger boundary failed: ${child.stderr || child.stdout}`);

  process.stdout.write(JSON.stringify({
    callableFailureBoundaries: Object.keys(callableCodes).length,
    callableAuthorizedBoundaries: 9,
    callableSuccessBoundaries: 2,
    deployedTriggerBoundaries: DEPLOYED_ONLY_EXPORTS.length,
    emulatorTriggerBoundaries: EMULATOR_ONLY_EXPORTS.length,
    firestoreWatcherBoundaries: 1,
    httpHandlerBoundaries: 3,
    schedulerBoundaries: 2,
    sourceManifestSha256: getSourceManifestSha256(),
    status: 'PASS',
  }, null, 2) + '\n');
}

if (process.argv.includes('--deployed-only')) {
  runDeployedOnlyBoundary().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
} else {
  runEmulatorBoundary().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
