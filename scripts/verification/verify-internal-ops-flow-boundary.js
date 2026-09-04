const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const includes = (source, tokens, label) => tokens.forEach((token) => {
  assert(source.includes(token), `${label} must include ${token}`);
});
const hasSingleFieldExemption = (indexConfig, collectionGroup, fieldPath) => (
  indexConfig.fieldOverrides?.some((entry) => (
    entry.collectionGroup === collectionGroup
    && entry.fieldPath === fieldPath
    && Array.isArray(entry.indexes)
    && entry.indexes.length === 0
  ))
);

const currentAccessRoute = read('src/app/api/platform/current-access/route.ts');
const currentAccessClient = read('src/lib/auth/currentPlatformAccessClient.ts');
const routeGuard = read('src/lib/auth/platformRouteGuard.ts');
const storeHook = read('src/hooks/usePlatformStoreSummaryOptions.ts');
const opsDal = read('src/database/ops/index.ts');
const opsTypes = read('src/lib/ops/types.ts');
const schedulerDal = read('src/database/ops/scheduler.ts');
const extractionDal = read('src/database/ops/extraction.ts');
const schedulerResponse = read('src/lib/ops/schedulerRecoveryResponse.ts');
const functionsScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const functionFlags = read('functions/src/constants/features.ts');
const appFlags = read('src/config/features.ts');
const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));

for (const fieldPath of ['stores', 'projects']) {
  assert(
    hasSingleFieldExemption(firestoreIndexes, 'platformSummary', fieldPath),
    `platformSummary.${fieldPath} index exemption is missing`,
  );
}

includes(currentAccessRoute, [
  "withPlatformAuth(async (request: NextRequest, session: any) =>",
  'failClosedOnProviderError: true',
  "const operatorId = resolveCurrentSessionUserDocumentId(session) || 'invalid-platform-session';",
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  "accessModel: 'current_persisted_platform_user'",
  "'Cache-Control': 'private, no-store, max-age=0'",
  "'X-Content-Type-Options': 'nosniff'",
  'const headers = new Headers(init.headers);',
], 'current platform-access route');
includes(currentAccessClient, [
  "fetch('/api/platform/current-access'",
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "redirect: 'manual'",
  'readJsonResponseWithLimit(response, CURRENT_PLATFORM_ACCESS_MAX_BYTES)',
  "accessModel === 'current_persisted_platform_user'",
], 'current platform-access client');
includes(routeGuard, [
  'const currentUser = await getCurrentUser(session);',
  'currentUser.userData.platformRole !== sessionPlatformRole',
], 'platform route guard');
includes(storeHook, [
  'await assertCurrentPlatformAccess();',
  "doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary')",
], 'platform store selector');

for (const [label, file] of [
  ['Cost Posture', 'src/app/api/platform/cost-posture/route.ts'],
  ['Founder Monitor', 'src/app/api/platform/founder-monitor/route.ts'],
  ['Entity Blocks', 'src/app/api/platform/entity-blocks/route.ts'],
  ['Business Health Monitor', 'src/app/api/platform/owner-business-assistant/monitor/route.ts'],
  ['Answerlattice Intake', 'src/app/api/platform/answerlattice-intake/route.ts'],
  ['Messaging Onboarding Monitor', 'src/app/api/ops/messaging-onboarding/route.ts'],
]) {
  const source = read(file);
  includes(source, [
    'failClosedOnProviderError: true',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    "{ error: 'Forbidden' }",
  ], label);
}

includes(opsDal, [
  'await assertCurrentPlatformAccess();',
  'getOpsControlRoomSnapshot()',
  'limit(boundedMaxResults)',
  'normalizeOpsAlert(document.id, document.data())',
  "throw new Error('ops_system_state_unavailable')",
  "throw new Error('ops_recent_alerts_unavailable')",
], 'Ops Control Room snapshot');
for (const placeholderMetric of ['publishedToday', 'feedbackToday', 'noProject', 'unpublished48h', 'storeHealthSummary']) {
  assert(!opsDal.includes(placeholderMetric), `Ops DAL must not emit false placeholder metric ${placeholderMetric}`);
  assert(!opsTypes.includes(placeholderMetric), `Ops DTO must not declare false placeholder metric ${placeholderMetric}`);
}
includes(schedulerDal, [
  'SCHEDULER_HISTORY_LIMIT = 30',
  'SCHEDULER_SETTLEMENT_LIMIT = 100',
  'await assertCurrentPlatformAccess();',
  'normalizeSchedulerRunLog(document.id, document.data())',
  'normalizeSchedulerSettlementState(snapshot.id, snapshot.data())',
  "throw new Error('ops_scheduler_run_history_unavailable')",
  "throw new Error('ops_scheduler_settlement_summary_unavailable')",
], 'Scheduler monitor snapshot');
includes(extractionDal, [
  'await assertCurrentPlatformAccess();',
  'const normalizedJobId = normalizeMenuExtractionJobId(jobId);',
  ".filter((op) => op.action === 'IMAGE_PROCESSING' && getExtractionDateMs(op.createdAt) >= todayStartMs);",
  "throw new Error('extraction_dashboard_snapshot_unavailable')",
  "throw new Error('extraction_cost_metrics_unavailable')",
], 'Extraction monitor snapshot');
assert(
  !extractionDal.includes('.slice(0, 50);'),
  'Extraction cost metrics must account for every row returned by the bounded Firestore read',
);
includes(schedulerResponse, [
  'normalizeSchedulerRecoveryResponse',
  'normalizeSchedulerRecoveryRunLogId',
  "success !== (status !== 'failed')",
  'totalStores !== 1',
], 'Scheduler recovery response');

for (const source of [appFlags, functionFlags]) {
  includes(source, ['SYSTEM_ALERT_RETENTION_DAYS: 90'], 'system alert retention config');
}
includes(functionsScheduler, [
  'async function runSystemAlertRetentionCleanup()',
  '.collection(DB_COLLECTIONS.SYSTEM_ALERTS)',
  ".where('timestamp', '<=', cutoff)",
  '.limit(100)',
  "name: 'system_alert_retention_cleanup'",
  'run: runSystemAlertRetentionCleanup',
], 'consolidated system-alert retention');
assert(!functionsScheduler.includes('export const systemAlertRetention'), 'System-alert retention must not create another scheduled export');

const readme = read('__docs__/ops-control-room/README.md');
const firebaseDoc = read('__docs__/ops-control-room/ops-control-room_firebase.md');
const tracker = read('__docs__/audits/menulist-feature-flow-audit-tracker.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
includes(readme, [
  'Item 29 locally source complete',
  '/api/platform/current-access',
  'SAFE_MODE stops guarded app AI routes',
  '`systemAlerts` now has one daily, leased 90-day cleanup task',
  'Cloud Resource Manager HTTP 403',
], 'Ops Control Room README');
includes(firebaseDoc, [
  'No monitor uses a realtime listener.',
  'at most 100 deletes once daily after the 90-day cutoff',
  '`platformSummary.stores` and `platformSummary.projects`',
  'scoped Firestore index deployment',
], 'Ops Firebase docs');
includes(tracker, [
  '| 29 | Internal Ops Control Room and platform monitoring | Large | Local source complete |',
  '## Completed item 29 source boundary',
], 'strict tracker item 29');
includes(audit, ['## Internal Ops Control Room And Platform Monitoring - July 16, 2026'], 'production audit item 29');
includes(changelog, ['## July 16, 2026 - Internal Ops Control Room And Platform Monitoring Hardening'], 'changelog item 29');

const packageJson = read('package.json');
includes(packageJson, [
  '"test:internal-ops-runtime-boundaries"',
  '"verify:internal-ops-flow-boundary"',
], 'package internal ops scripts');

console.log('Internal Ops end-to-end boundary verifier passed');
