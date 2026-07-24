const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertCheck(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function compositeKey(index) {
  return JSON.stringify({
    collectionGroup: index.collectionGroup,
    queryScope: index.queryScope,
    fields: index.fields,
  });
}

const scheduler = read('functions/src/decisionBlocksScoring.ts');
const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const packageJson = readJson('package.json');
const summaryPattern = read('__docs__/patterns/summary-document-pattern.md');
const closeoutReadme = read('__docs__/firebase-scale-cost-closeout/README.md');
const closeoutFirebase = read('__docs__/firebase-scale-cost-closeout/firebase-scale-cost-closeout_firebase.md');

[
  "const PLATFORM_DAILY_TASK_STATE_ID = 'decisionBlocksPlatformDaily';",
  'const PLATFORM_DAILY_TASK_LEASE_MS = 10 * 60 * 1000;',
  'const PLATFORM_DAILY_TASK_RETRY_MS = 55 * 60 * 1000;',
  'async function acquirePlatformDailyTaskLease(',
  'const acquired = await db.runTransaction(async (transaction) => {',
  "if (state.lastCompletedDayKey === dayKey) return null;",
  "if (state.status === 'running' && leaseExpiresAtMs > nowMs) return null;",
  "state.status === 'failed'",
  'platformDailyTaskLease = await acquirePlatformDailyTaskLease(db, now);',
  'const runPlatformDailyTasks = platformDailyTaskLease !== null;',
  'if (storeIds.length === 0 && !runPlatformDailyTasks) {',
  "details: { reason: 'daily_cadence' }",
  'PLATFORM_DAILY_TASK_NAMES.has(task.name)',
  'await completePlatformDailyTaskLease(',
  "if (snapshot.data()?.leaseOwner !== lease.leaseOwner)",
  'leaseOwner: FieldValue.delete()',
].forEach((token) => assertCheck(scheduler.includes(token), `Platform daily cadence keeps ${token}`));

[
  'const SCHEDULER_LEASE_LOST_CODE',
  'const lockSnapshot = await transaction.get(lockRef);',
  'lockSnapshot.data()?.leaseOwner !== params.leaseId',
  'Task outcome rejected after lease ownership changed',
].forEach((token) => assertCheck(
  maintenanceScheduler.includes(token),
  `Maintenance task lease finalization keeps ${token}`,
));

[
  'authority_maturation',
  'menu_drift',
  'guest_feedback_retention',
  'lifecycle_messaging',
  'extraction_learning',
  'store_truth_confidence',
  'staleness_check',
].forEach((taskName) => {
  assertCheck(
    new RegExp(`['"]${taskName}['"]`).test(scheduler),
    `Platform daily cadence records ${taskName}`,
  );
});
assertCheck(
  scheduler.includes('if (storeIds.length > 0 && FUNCTION_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING)')
    && scheduler.includes("name: 'special_menu_switching'")
    && scheduler.includes("? 'no_due_stores'"),
  'Special Menu recovery remains scoped to each due-store cohort instead of the platform daily lease',
);

assertCheck(
  packageJson.scripts['verify:firebase-scale-cost-closeout']
    === 'node scripts/verification/verify-firebase-scale-cost-closeout.js && npm run test:platform-daily-task-lease && npm run test:maintenance-task-lease',
  'Firebase scale closeout aggregate runs source and lease-emulator gates',
);

const indexFiles = [
  'firestore.indexes.json',
  'firestore-answerlattice.indexes.json',
  'firestore-campaigncue.indexes.json',
  'firestore-signaldesk.indexes.json',
];
for (const relativePath of indexFiles) {
  const manifest = readJson(relativePath);
  const compositeKeys = (manifest.indexes || []).map(compositeKey);
  const overrideKeys = (manifest.fieldOverrides || []).map((override) =>
    `${override.collectionGroup}:${override.fieldPath}`);
  assertCheck(
    new Set(compositeKeys).size === compositeKeys.length,
    `${relativePath} contains no duplicate composite index`,
  );
  assertCheck(
    new Set(overrideKeys).size === overrideKeys.length,
    `${relativePath} contains no duplicate field override`,
  );
  for (const override of manifest.fieldOverrides || []) {
    if (override.ttl !== true) continue;
    assertCheck(
      Array.isArray(override.indexes) && override.indexes.length === 0,
      `${relativePath} TTL field ${override.collectionGroup}.${override.fieldPath} is not indexed`,
    );
  }
}

const rootIndexes = readJson('firestore.indexes.json');
const rootOverrides = new Map(
  (rootIndexes.fieldOverrides || []).map((override) => [
    `${override.collectionGroup}:${override.fieldPath}`,
    override,
  ]),
);
[
  'platformSummary:stores',
  'platformSummary:projects',
  'analytics:hourlyClicksByItem',
  'analytics:itemNames',
  'analytics:searchTerms',
  'analytics:viewsByContent',
  'analytics:zeroResultSearchTerms',
  'supportTickets:messages',
  'supportTickets:documents',
  'supportTickets:logs',
].forEach((key) => {
  assertCheck(
    Array.isArray(rootOverrides.get(key)?.indexes) && rootOverrides.get(key).indexes.length === 0,
    `High-cardinality map remains exempt from automatic indexing: ${key}`,
  );
});

const usageMap = spawnSync(
  process.execPath,
  ['scripts/verification/firebase-cost-usage-map.mjs', '--json'],
  { cwd: ROOT, encoding: 'utf8' },
);
assertCheck(usageMap.status === 0, 'Firebase usage-map scanner completes');
const usage = JSON.parse(usageMap.stdout);
assertCheck(usage.rows.length > 0, 'Firebase usage-map scanner finds runtime files');
assertCheck((usage.byRisk['high-listener'] || 0) <= 9, 'Realtime-listener risk count does not grow silently');
assertCheck((usage.byRisk['medium-public-read'] || 0) <= 2, 'Public-read risk count does not grow silently');
assertCheck((usage.byRisk['medium-query-scope'] || 0) <= 5, 'Query-scope risk count does not grow silently');

assertCheck(
  summaryPattern.includes('1,500 canonical rows')
    && summaryPattern.includes('850,000 bytes')
    && !summaryPattern.includes('Savings: ~99% read reduction'),
  'Summary-document guidance uses enforced ceilings and avoids stale price arithmetic',
);
assertCheck(
  closeoutReadme.includes('481 runtime files')
    && closeoutReadme.includes('No schema migration was introduced'),
  'Closeout README records the current scanner result and bounded change',
);
assertCheck(
  closeoutFirebase.includes('At most one successful platform-wide suite per UTC day')
    && closeoutFirebase.includes('up to 24 platform-wide passes'),
  'Closeout Firebase doc records the daily-cadence cost effect',
);

console.log(`Firebase scale and cost closeout verified (${checks.length} checks).`);
