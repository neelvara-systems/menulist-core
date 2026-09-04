const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, token, label) {
  assert(source.includes(token), `${label} must include ${token}`);
}

function assertNotIncludes(source, token, label) {
  assert(!source.includes(token), `${label} must not include ${token}`);
}

function assertOrder(source, tokens, label) {
  let lastIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, lastIndex + 1);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

function verifySchedulerDal(dal) {
  [
    'Read-only DAL for scheduler monitoring dashboard.',
    'getSchedulerRunHistory(',
    'getSchedulerHealthSummary()',
    'getSchedulerRunsLast7Days()',
    'getSchedulerRunDetails(runId: string)',
    'getSchedulerSettlementSummary(',
    'storeIds: readonly string[]',
    'getSchedulerDashboardSnapshot(',
    'collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS)',
    "orderBy('startedAt', 'desc')",
    "where('startedAt', '>=', sevenDaysAgo)",
    'getCountFromServer(',
    'constraints.push(limit(historyLimit))',
    'SCHEDULER_HISTORY_LIMIT = 30',
    'query(logsRef, orderBy(\'startedAt\', \'desc\'), limit(10))',
    'Array.from(new Set(storeIds',
    'getDoc(doc(',
    '`nightlyState_${storeId}`',
    'SCHEDULER_SETTLEMENT_LIMIT = 100',
    'await assertCurrentPlatformAccess();',
    "throw new Error('ops_scheduler_run_history_unavailable')",
    "throw new Error('ops_scheduler_settlement_summary_unavailable')",
    'buildSchedulerHealthSummaryFromRuns(runHistory.slice(0, 10), runsLast7Days)',
    "logOpsFailure('ops_scheduler_run_history_load_failed'",
    "logOpsFailure('ops_scheduler_health_summary_load_failed'",
    "logOpsFailure('ops_scheduler_run_details_load_failed'",
    "logOpsFailure('ops_scheduler_settlement_summary_load_failed'",
    "getBoundedOpsStringContext('runId', runId)",
  ].forEach((token) => assertIncludes(dal, token, 'Scheduler Monitor DAL'));

  [
    'onSnapshot',
    'setDoc(',
    'addDoc(',
    'updateDoc(',
    'deleteDoc(',
    'writeBatch(',
    'runTransaction(',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(dal, token, 'Scheduler Monitor DAL read-only boundary'));
}

function verifyStoreSummaryHook(hook) {
  [
    'usePlatformStoreSummaryOptions(enabled = true)',
    "doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary')",
    'buildPlatformStoreSummaryOptions(summary)',
    'let latestPlatformStoreSummaryRequestId = 0;',
    'const accessIdentityRef = useRef<string | null>(null);',
    'const [admittedAccessIdentity, setAdmittedAccessIdentity] = useState<string | null>(null);',
    'const hasCurrentAccessAdmission = Boolean(',
    '&& admittedAccessIdentity === requestAccessIdentity',
    'if (!force && platformStoreSummaryLoadedAt) {',
    'await assertCurrentPlatformAccess();',
    'setAdmittedAccessIdentity(requestAccessIdentity);',
    'stores: hasCurrentAccessAdmission ? platformStoreSummaryOptions : []',
    "const platformRole = session?.platformRole || session?.user.platformRole;",
    "const sessionUserId = session?.uId || session?.user.id;",
    'accessIdentityRef.current !== requestAccessIdentity',
    'latestPlatformStoreSummaryRequestId !== requestId',
    'value: store.sId',
    'selectedStore',
    'selectedStoreId',
  ].forEach((token) => assertIncludes(hook, token, 'Platform store summary selector hook'));

  [
    'projectId',
    'projectsSummary',
    'setDoc(',
    'addDoc(',
    'updateDoc(',
    'deleteDoc(',
    'writeBatch(',
    'runTransaction(',
  ].forEach((token) => assertNotIncludes(hook, token, 'Platform store summary selector boundary'));
}

function verifyDesktopMonitor(component) {
  [
    "platformRole === 'PLATFORM'",
    "redirect('/dashboard')",
    'usePlatformStoreSummaryOptions(isPlatform)',
    'getSchedulerDashboardSnapshot(filter, stores.map((store) => store.sId), 50)',
    'aria-label="Store for nightly recovery"',
    'aria-label="Run status"',
    'aria-label="Run trigger"',
    "modalRender: labelConfirmDialog('Run Store Nightly Recovery')",
    "messageApi.error('Failed to load scheduler data')",
    'function formatDetailKey(key: string, index: number): string',
    'return /^[a-zA-Z0-9_.:-]{1,48}$/.test(normalized) ? normalized : `detail_${index + 1}`;',
    "if (value === undefined || value === null) return '[empty]'",
    'return `[text:length=${value.length}]`',
    'return `[array:length=${value.length}]`',
    'return `[object:keys=${Object.keys(value as Record<string, unknown>).length}]`',
    'function formatStoredSchedulerError(value: unknown): string',
    'function formatTaskError(value: unknown): string',
    'function flattenDetails(details: Record<string, unknown> | undefined): string',
    'formatTaskError(task.error) || flattenDetails(task.details)',
    'formatStoredSchedulerError(state.error) || \'failed\'',
    'formatStoredSchedulerError(err.error) || \'failed\'',
    'Details: {flattenDetails(err.details)}',
    "httpsCallable(fns, 'triggerStoreNightlyScheduler', { timeout: 600000 })",
    'triggerFn({ tId: recoveryStore.tId, sId: recoveryStore.sId })',
    'normalizeSchedulerRecoveryResponse(result?.data)',
    'normalizeSchedulerRecoveryRunLogId(',
    'Scheduler state unavailable',
    "logOpsFailure('ops_scheduler_manual_recovery_failed'",
    "getBoundedOpsStringContext('storeId', recoveryStore.sId)",
    "getBoundedOpsStringContext('tenantId', recoveryStore.tId)",
    "getBoundedOpsStringContext('runLogId', runLogId)",
    'const latestLoadRequestRef = useRef(0);',
    'const recoveryInFlightRef = useRef(false);',
    'latestLoadRequestRef.current !== requestId',
    'if (!selectedStore || recoveryInFlightRef.current)',
    'recoveryInFlightRef.current = true;',
    'onCancel: () => {',
    'Select a store from storesSummary. Recovery runs for all active projects under that store; no project ID is needed.',
    'Runs hourly — processes stores at their local 2:30 AM (timezone-aware)',
  ].forEach((token) => assertIncludes(component, token, 'Desktop Scheduler Monitor'));

  assertOrder(component, [
    'if (!selectedStore) {',
    'Modal.confirm({',
    "httpsCallable(fns, 'triggerStoreNightlyScheduler', { timeout: 600000 })",
    'triggerFn({ tId: recoveryStore.tId, sId: recoveryStore.sId })',
    'normalizeSchedulerRecoveryResponse(result?.data)',
    'normalizeSchedulerRecoveryRunLogId(',
    "logOpsFailure('ops_scheduler_manual_recovery_failed'",
  ], 'Desktop Scheduler Monitor manual recovery order');

  [
    'JSON.stringify',
    'console.error',
    'error.message',
    'selectedStore.projectId',
    'projectId: selectedStore',
    "httpsCallable(fns, 'triggerSchedulerManually'",
    'triggerFn({ projectId',
  ].forEach((token) => assertNotIncludes(component, token, 'Desktop Scheduler Monitor boundary'));
}

function verifyMobileMonitor(screen) {
  [
    "platformRole === 'PLATFORM'",
    'This screen is available only to platform admins.',
    'usePlatformStoreSummaryOptions(isPlatform)',
    'getSchedulerDashboardSnapshot({ limit: 10 }, stores.map((store) => store.sId), 50)',
    'function formatDetailKey(key: string, index: number): string',
    'return /^[a-zA-Z0-9_.:-]{1,48}$/.test(normalized) ? normalized : `detail_${index + 1}`;',
    "if (value === undefined || value === null) return '[empty]'",
    'return `[text:length=${value.length}]`',
    'return `[array:length=${value.length}]`',
    'return `[object:keys=${Object.keys(value as Record<string, unknown>).length}]`',
    'function formatTaskError(value: unknown): string',
    'function flattenDetails(details: Record<string, unknown> | undefined, limit = 2): string',
    'formatTaskError(task.error) || flattenDetails(task.details)',
    "Dialog.confirm({",
    "httpsCallable(getFunctions(), 'triggerStoreNightlyScheduler', { timeout: 600000 })",
    'triggerFn({ tId: recoveryStore.tId, sId: recoveryStore.sId })',
    'normalizeSchedulerRecoveryResponse(result?.data)',
    'normalizeSchedulerRecoveryRunLogId(',
    'Scheduler state unavailable',
    "logOpsFailure('mobile_scheduler_recovery_trigger_failed'",
    "getBoundedOpsStringContext('selectedStoreId', recoveryStore.sId)",
    "getBoundedOpsStringContext('selectedTenantId', recoveryStore.tId)",
    "getBoundedOpsStringContext('runLogId', runLogId)",
    'const latestLoadRequestRef = useRef(0);',
    'const recoveryInFlightRef = useRef(false);',
    'latestLoadRequestRef.current !== requestId',
    'if (!selectedStore || recoveryInFlightRef.current)',
    'recoveryInFlightRef.current = true;',
    'Select a store from storesSummary. Recovery runs all active projects under that store.',
    'Nightly jobs, settlement state, and recovery controls.',
  ].forEach((token) => assertIncludes(screen, token, 'Mobile Scheduler Monitor'));

  assertOrder(screen, [
    'if (!selectedStore) {',
    'Dialog.confirm({',
    "httpsCallable(getFunctions(), 'triggerStoreNightlyScheduler', { timeout: 600000 })",
    'triggerFn({ tId: recoveryStore.tId, sId: recoveryStore.sId })',
    'normalizeSchedulerRecoveryResponse(result?.data)',
    'normalizeSchedulerRecoveryRunLogId(',
    "logOpsFailure('mobile_scheduler_recovery_trigger_failed'",
  ], 'Mobile Scheduler Monitor manual recovery order');

  [
    'JSON.stringify',
    'console.error',
    'error.message',
    'selectedStore.projectId',
    'projectId: selectedStore',
    "httpsCallable(getFunctions(), 'triggerSchedulerManually'",
    'triggerFn({ projectId',
  ].forEach((token) => assertNotIncludes(screen, token, 'Mobile Scheduler Monitor boundary'));
}

function verifyMobileRouteMap(mobileShell, mobileMore) {
  [
    "'/platform/scheduler-monitor': 'schedulerMonitor'",
    "'/ops/scheduler': 'schedulerMonitor'",
    "'schedulerMonitor'",
  ].forEach((token) => assertIncludes(mobileShell, token, 'Mobile shell scheduler route map'));

  [
    "key: 'schedulerMonitor'",
    "label: 'Scheduler Monitor'",
    "description: 'Nightly jobs, analytics settlement, and scheduler recovery controls.'",
    "onClick: () => openSubScreen('schedulerMonitor')",
    "['platformHub', 'answerlatticeHub', 'opsControlRoom', 'extractionMonitor', 'schedulerMonitor'].includes(screen)",
    "subScreen === 'schedulerMonitor'",
    '<MobileSchedulerMonitorScreen',
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More scheduler monitor surface'));
}

function verifyRoutes(opsRoute, platformRoute) {
  [
    'SchedulerMonitor',
    '@template/main-app/platform/schedulerMonitor',
  ].forEach((token) => {
    assertIncludes(opsRoute, token, 'Ops scheduler route');
    assertIncludes(platformRoute, token, 'Platform scheduler route alias');
  });
}

function verifyTypes(types) {
  [
    'export type SchedulerTaskName',
    "export type SchedulerRunStatus = 'success' | 'partial' | 'failed' | 'skipped' | 'running';",
    "export type SchedulerTrigger = 'scheduled' | 'manual';",
    'export interface SchedulerTaskResult',
    'export interface SchedulerRunLog',
    'manualScope?: { tId?: string; sId?: string };',
    'errors: Array<{',
    'details?: Record<string, unknown>;',
    'export interface SchedulerSettlementSummary',
    'export interface SchedulerDashboardSnapshot',
    'Historical MenuList run logs may contain this task. New Answerlattice runs',
    'are owned by functions-answerlattice and should not be written here.',
    "| 'owner_business_health'",
    "| 'messaging_intake'",
    "| 'system_alert_retention_cleanup'",
  ].forEach((token) => assertIncludes(types, token, 'Scheduler Monitor types'));
}

function verifyDocsAndPackage(packageJson, opsDoc, readme, mobileDoc, auditDoc) {
  assertIncludes(
    packageJson,
    '"verify:scheduler-monitor-boundary": "node scripts/verification/verify-scheduler-monitor-boundary.js && npm run test:store-nightly-scheduler-lease"',
    'package.json scheduler monitor verifier',
  );

  [
    'Source gate: `npm run verify:scheduler-monitor-boundary`',
    'locks the read-only scheduler DAL',
    'bounded desktop/mobile scheduler detail rendering',
    'store-scoped `triggerStoreNightlyScheduler` manual recovery',
    'MobileShell route mapping',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops Control Room scheduler source gate docs'));

  [
    'Scheduler run logs retain their existing 90-day boundary.',
    'Recovery callable responses require a valid status/count/run-log envelope',
    'npm run verify:scheduler-monitor-boundary',
    '/ops/scheduler',
  ].forEach((token) => assertIncludes(readme, token, 'Ops Control Room README scheduler docs'));

  [
    'Ops Control Room, Scheduler Monitor and Extraction Monitor use dedicated touch-sized mobile screens.',
    "The signed `platformRole === 'PLATFORM'` check controls visibility",
    'Source gate: `npm run verify:scheduler-monitor-boundary`',
    'Scheduler recovery uses the shared validated callable response',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Ops Control Room mobile scheduler docs'));

  [
    '## Internal Ops Control Room And Platform Monitoring - July 16, 2026',
    'store-nightly callable acknowledgements are normalized and capped',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit scheduler monitor checkpoint'));
}

function verifySchedulerMonitorBoundary() {
  const files = {
    packageJson: read('package.json'),
    dal: read('src/database/ops/scheduler.ts'),
    hook: read('src/hooks/usePlatformStoreSummaryOptions.ts'),
    desktop: read('src/components/templates/main-app/platform/schedulerMonitor/index.tsx'),
    mobile: read('src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    opsRoute: read('src/app/(main)/ops/scheduler/page.tsx'),
    platformRoute: read('src/app/(main)/platform/scheduler-monitor/page.tsx'),
    types: read('src/lib/ops/schedulerTypes.ts'),
    opsDoc: read('__docs__/ops-control-room/ops-control-room_impl.md'),
    readme: read('__docs__/ops-control-room/README.md'),
    mobileDoc: read('__docs__/ops-control-room/ops-control-room_mobile-support.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    recoveryResponse: read('src/lib/ops/schedulerRecoveryResponse.ts'),
    schedulerFunction: read('functions/src/decisionBlocksScoring.ts'),
    maintenanceScheduler: read('functions/src/schedulers/menulistMaintenanceScheduler.ts'),
    sessionProvider: read('src/providers/sessionProvider.tsx'),
    sessionScopeBoundary: read('src/lib/multiOutlet/sessionProviderScopeBoundary.ts'),
  };

  [
    'normalizeSchedulerRecoveryResponse',
    'normalizeSchedulerRecoveryRunLogId',
    "success !== (status !== 'failed')",
    'totalStores !== 1',
    "readOwnValue(value, 'failedCount')",
    'isValidFirestoreDocumentId(value)',
  ].forEach((token) => assertIncludes(files.recoveryResponse, token, 'Scheduler recovery response boundary'));

  [
    'acquireStoreNightlySchedulerLease(',
    'completeStoreNightlySchedulerLease(',
    'STORE_NIGHTLY_SCHEDULER_LEASE_MS',
    "status === 'running' && leaseExpiresAtMs > nowMs",
    "'A nightly recovery is already running for this store.'",
    'recoveryLeaseStatus = \'completed\';',
    'completeStoreNightlySchedulerLease(recoveryLease, recoveryLeaseStatus)',
    'SCHEDULER_STORE_LEASE_FINALIZE_FAILED',
    '`scheduled_store_${runStartTime}_${tId}_${sId}`',
    '`scheduled_store_${runStartTime}_${tId}_${sId}`,\n                new Date(),',
    'skip_concurrent_store_scheduler',
    'storeSchedulerLeaseStatus = \'completed\';',
    'completeStoreNightlySchedulerLease(',
    'storeSchedulerLeaseStatus,',
  ].forEach((token) => assertIncludes(files.schedulerFunction, token, 'Manual store recovery server lease'));
  [
    "import { getMaintenanceRunStatus } from './maintenanceRunLogBoundary';",
    'status: getMaintenanceRunStatus(params.summaries),',
  ].forEach((token) => assertIncludes(files.maintenanceScheduler, token, 'Maintenance scheduler run-log status'));
  assertNotIncludes(
    files.schedulerFunction,
    '`scheduled_store_${runStartTime}_${tId}_${sId}`,\n                new Date(runStartTime),',
    'Scheduled store lease must not inherit the whole-run start time',
  );
  [
    "JSON.stringify([identity.productId, identity.userId, 'platform', identity.platformRole])",
    "return platformRole ? { productId, userId, tenantId: null, storeId: null, platformRole } : null;",
  ].forEach((token) => assertIncludes(files.sessionScopeBoundary, token, 'Storeless platform provider identity'));
  [
    'platformStoreSummaryOptions: providerStateMatchesCurrentSession ? platformStoreSummaryOptions : []',
    'platformStoreSummaryLoadedAt: providerStateMatchesCurrentSession ? platformStoreSummaryLoadedAt : null',
    'platformStoreSummaryLoading: providerStateMatchesCurrentSession ? platformStoreSummaryLoading : false',
  ].forEach((token) => assertIncludes(files.sessionProvider, token, 'Platform store summary transition mask'));

  verifySchedulerDal(files.dal);
  verifyStoreSummaryHook(files.hook);
  verifyDesktopMonitor(files.desktop);
  verifyMobileMonitor(files.mobile);
  verifyMobileRouteMap(files.mobileShell, files.mobileMore);
  verifyRoutes(files.opsRoute, files.platformRoute);
  verifyTypes(files.types);
  verifyDocsAndPackage(files.packageJson, files.opsDoc, files.readme, files.mobileDoc, files.auditDoc);

  console.log('Scheduler monitor boundary verifier passed');
}

verifySchedulerMonitorBoundary();
