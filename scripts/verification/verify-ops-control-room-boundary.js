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
    const index = source.indexOf(token);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

function verifySafeModeRoute(route) {
  [
    "withAuth(async (request, session) =>",
    "requiredPlatformRole: 'PLATFORM'",
    'const OPS_SAFE_MODE_MAX_BODY_BYTES = 2 * 1024;',
    "action: z.enum(['activate', 'deactivate'])",
    'reason: z.string().trim().max(500).optional()',
    'hashPublicRateLimitValue(operatorId)',
    'key: `ops-safe-mode:${operatorRateLimitHash}`',
    'limit: 10',
    'window: 60 * 60',
    'failClosedOnProviderError: true',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
    'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
    "firestoreAdmin.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
    'const changed = await firestoreAdmin.runTransaction(async (transaction) =>',
    'transaction.set(opsRef, targetSafeMode',
    'if (!changed) {',
    'changed: false',
    'alertRecorded: Boolean(alertId)',
    'SAFE_MODE: true',
    'SAFE_MODE: false',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_ACTIVATED',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_DEACTIVATED',
    "logger.security(targetSafeMode ? 'SAFE_MODE Activated' : 'SAFE_MODE Deactivated'",
    "logOpsFailure('ops_safe_mode_alert_write_failed'",
    "logOpsFailure('ops_safe_mode_route_failed'",
    "getBoundedOpsStringContext('reason'",
    'getBoundedSecurityRouteContext(session, request)',
  ].forEach((token) => assertIncludes(route, token, 'Ops SAFE_MODE route'));

  assertOrder(route, [
    'const rateLimit = await checkRateLimit({',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
    'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
    "firestoreAdmin.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
    'const changed = await firestoreAdmin.runTransaction(async (transaction) =>',
  ], 'Ops SAFE_MODE route admission order');

  [
    'request.json()',
    "logger.error('[API /ops/safe-mode]",
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(route, token, 'Ops SAFE_MODE route boundary'));
}

function verifyMuteAlertsRoute(route) {
  [
    "withAuth(async (request, session) =>",
    "requiredPlatformRole: 'PLATFORM'",
    'const OPS_MUTE_ALERTS_MAX_BODY_BYTES = 1024;',
    'durationMinutes: z.number().int().min(1).max(120)',
    'hashPublicRateLimitValue(operatorId)',
    'key: `ops-mute-alerts:${operatorRateLimitHash}`',
    'limit: 10',
    'window: 60 * 60',
    'failClosedOnProviderError: true',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES',
    'MuteAlertsRequestSchema.safeParse(bodyResult.data)',
    'getSafeZodValidationDetails(validation.error)',
    "db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
    'alertsMutedUntil: mutedUntil',
    'alertsMutedAt: Timestamp.now()',
    'alertsMutedBy: currentPlatformUser.documentId',
    "logOpsFailure('ops_mute_alerts_route_failed'",
    'getBoundedSecurityRouteContext(session, request)',
  ].forEach((token) => assertIncludes(route, token, 'Ops mute-alerts route'));

  assertOrder(route, [
    'const rateLimit = await checkRateLimit({',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES',
    'MuteAlertsRequestSchema.safeParse(bodyResult.data)',
    "db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
  ], 'Ops mute-alerts route admission order');

  [
    'request.json()',
    "logger.error('[API /ops/mute-alerts]",
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(route, token, 'Ops mute-alerts route boundary'));
}

function verifyResponseHelper(helper) {
  [
    'OPS_CONTROL_ROOM_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
    "cache: 'no-store' as RequestCache",
    "credentials: 'same-origin' as RequestCredentials",
    "redirect: 'manual' as RequestRedirect",
    "type OpsControlRoomResponseKind = 'safeMode' | 'muteAlerts'",
    'value.success === true',
    "typeof value.SAFE_MODE === 'boolean'",
    "typeof value.mutedUntil === 'string'",
    'isFiniteNumber(value.durationMinutes)',
    "typeof value.success === 'boolean'",
    'Number.isSafeInteger(value.projectCount)',
    'Number(value.projectCount) >= 1',
    'Number(value.projectCount) <= 100',
    "typeof value.projectId === 'string'",
    'value.projectId.trim().length > 0',
    "typeof value.verification === 'string'",
    'value.verification.trim().length > 0',
    "logOpsFailure(",
    "'ops_control_room_force_republish_response_invalid'",
    'readJsonResponseWithLimit<unknown>',
    'OPS_CONTROL_ROOM_RESPONSE_REJECTED',
    'OPS_CONTROL_ROOM_RESPONSE_PARSE_FAILED',
    'OPS_CONTROL_ROOM_RESPONSE_INVALID',
  ].forEach((token) => assertIncludes(helper, token, 'Ops Control Room response helper'));

  [
    'response.json()',
    '.json().catch',
    'await navigator.clipboard.writeText',
  ].forEach((token) => assertNotIncludes(helper, token, 'Ops Control Room response helper boundary'));
}

function verifyOpsDal(dal) {
  [
    'NO real-time listeners',
    'manual refresh',
    'getDoc(opsConfigRef)',
    'orderBy(\'timestamp\', \'desc\')',
    'limit(1)',
    'getCountFromServer(newStoresQuery)',
    'getCountFromServer(activeQuery)',
    'getCountFromServer(staleQuery)',
    'limit(boundedMaxResults)',
    'Math.min(Math.max(maxResults, 1), 30)',
    'await assertCurrentPlatformAccess();',
    'getOpsControlRoomSnapshot()',
    "throw new Error('ops_system_state_unavailable')",
    "throw new Error('ops_adoption_pulse_unavailable')",
    "throw new Error('ops_integrity_signals_unavailable')",
    "throw new Error('ops_recent_alerts_unavailable')",
    'buildOpsStoredTextSummary',
    "logOpsFailure('ops_system_state_load_failed'",
    "logOpsFailure('ops_adoption_pulse_load_failed'",
    "logOpsFailure('ops_integrity_signals_load_failed'",
    "logOpsFailure('ops_recent_alerts_load_failed'",
  ].forEach((token) => assertIncludes(dal, token, 'Ops Control Room DAL'));

  [
    'onSnapshot',
    'setDoc(',
    'addDoc(',
    'updateDoc(',
    'deleteDoc(',
    'writeBatch(',
    'runTransaction(',
    'result.safeModeReason = data.reason || null',
    'result.lastAlertTitle = lastAlert.title || null',
  ].forEach((token) => assertNotIncludes(dal, token, 'Ops Control Room DAL read-only boundary'));
}

function verifyDesktopSurface(component) {
  [
    "platformRole === 'PLATFORM'",
    "redirect('/dashboard')",
    'getOpsControlRoomSnapshot()',
    "fetch('/api/ops/safe-mode'",
    "fetch('/api/ops/mute-alerts'",
    '...OPS_CONTROL_ROOM_REQUEST_POLICY',
    'readOpsControlRoomSafeModeResponse(res',
    'readOpsControlRoomMuteAlertsResponse(res',
    "messageApi.error('Failed to toggle SAFE_MODE')",
    "messageApi.error('Failed to mute alerts')",
    "messageApi.error('Force republish failed')",
    "httpsCallable(fns, 'forceRepublish')",
    'isOpsControlRoomForceRepublishResponse(result.data)',
    'logInvalidOpsControlRoomForceRepublishResponse(result.data',
    'all active menu projects',
    'const projectCount = result.data.projectCount;',
    "logOpsFailure('ops_control_room_safe_mode_toggle_failed'",
    "logOpsFailure('ops_control_room_mute_alerts_failed'",
    "logOpsFailure('ops_control_room_force_republish_failed'",
    'const latestLoadRequestRef = useRef(0);',
    'const safeModeInFlightRef = useRef(false);',
    'const muteInFlightRef = useRef(false);',
    'const republishInFlightRef = useRef(false);',
    'latestLoadRequestRef.current !== requestId',
    'if (safeModeInFlightRef.current) return;',
    'if (muteInFlightRef.current) return;',
    'if (!selectedStore || republishInFlightRef.current)',
    'const republishStore = selectedStore;',
    'if (!isMountedRef.current || !isPlatformRef.current) return;',
    'SAFE_MODE stops guarded AI generation and provider-upload paths.',
    'Ops state unavailable',
  ].forEach((token) => assertIncludes(component, token, 'Desktop Ops Control Room'));

  [
    'res.json()',
    'response.json()',
    '.json().catch',
    'error.message',
    "throw new Error('Request failed')",
  ].forEach((token) => assertNotIncludes(component, token, 'Desktop Ops Control Room boundary'));
  [
    'forceRepublishFn({ storeId: selectedStore.sId',
    "getBoundedOpsStringContext('storeId', selectedStore.sId)",
  ].forEach((token) => assertNotIncludes(component, token, 'Desktop Ops Control Room captured action scope'));
}

function verifyMobileSurface(screen, mobileShell, mobileMore) {
  [
    "platformRole === 'PLATFORM'",
    'This screen is available only to platform admins.',
    'getOpsControlRoomSnapshot()',
    'Ops state unavailable',
    "fetch('/api/ops/safe-mode'",
    "fetch('/api/ops/mute-alerts'",
    '...OPS_CONTROL_ROOM_REQUEST_POLICY',
    'readOpsControlRoomSafeModeResponse(response',
    'readOpsControlRoomMuteAlertsResponse(response',
    "Toast.show({ content: 'Could not update SAFE_MODE'",
    "Toast.show({ content: 'Could not mute alerts'",
    "Toast.show({ content: 'Republish failed'",
    "httpsCallable(getFunctions(), 'forceRepublish')",
    'isOpsControlRoomForceRepublishResponse(result.data)',
    'logInvalidOpsControlRoomForceRepublishResponse(result.data',
    'all active menu projects',
    'const projectCount = result.data.projectCount;',
    "logOpsFailure('mobile_ops_safe_mode_toggle_failed'",
    "logOpsFailure('mobile_ops_mute_alerts_failed'",
    "logOpsFailure('mobile_ops_force_republish_failed'",
    'const latestLoadRequestRef = useRef(0);',
    'const safeModeInFlightRef = useRef(false);',
    'const muteInFlightRef = useRef(false);',
    'const republishInFlightRef = useRef(false);',
    'latestLoadRequestRef.current !== requestId',
    'if (safeModeInFlightRef.current) return;',
    'if (muteInFlightRef.current) return;',
    'if (!selectedStore || republishInFlightRef.current)',
    'const republishStore = selectedStore;',
    'if (!isMountedRef.current || !isPlatformRef.current) return;',
  ].forEach((token) => assertIncludes(screen, token, 'Mobile Ops Control Room'));

  [
    "'/platform/ops-control-room': 'opsControlRoom'",
    "'/ops': 'opsControlRoom'",
    "'/ops/extraction': 'extractionMonitor'",
    "'/ops/scheduler': 'schedulerMonitor'",
  ].forEach((token) => assertIncludes(mobileShell, token, 'Mobile shell ops route map'));

  [
    "key: 'opsControlRoom'",
    "label: 'Ops Control Room'",
    "description: 'SAFE_MODE, alerts, adoption pulse, integrity, and recovery controls.'",
    "['platformHub', 'opsControlRoom', 'extractionMonitor', 'schedulerMonitor'].includes(screen)",
    "subScreen === 'opsControlRoom'",
    '<MobileOpsControlRoomScreen',
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More ops surface'));

  [
    'response.json()',
    '.json().catch',
    'error.message',
    "throw new Error('Request failed')",
  ].forEach((token) => assertNotIncludes(screen, token, 'Mobile Ops Control Room boundary'));
  [
    'forceRepublishFn({ storeId: selectedStore.sId',
    "getBoundedOpsStringContext('selectedStoreId', selectedStore.sId)",
  ].forEach((token) => assertNotIncludes(screen, token, 'Mobile Ops Control Room captured action scope'));
}

function verifyDocsAndPackage(packageJson, opsDoc, mobileDoc, auditDoc) {
  assertIncludes(
    packageJson,
    '"verify:ops-control-room-boundary": "node scripts/verification/verify-ops-control-room-boundary.js && npm run test:force-republish-lease"',
    'package.json ops control room verifier',
  );

  [
    '`/api/platform/current-access` exists for direct browser Firestore monitors',
    '`src/database/ops/index.ts::getOpsControlRoomSnapshot()`',
    'Any source error is logged with bounded `ops_*` diagnostics and rejects the snapshot.',
    'SAFE_MODE wording follows the actual boundary',
    'Desktop and mobile force-republish callable results require `success`, a bounded `projectCount` from 1 to 100',
    'Source gate: `npm run verify:ops-control-room-boundary`',
    'It runs a local Firestore emulator for lease concurrency, partitioning, expiry and revoked-role no-write behavior.',
    'It does not invoke a deployed callable, provider, browser, Firebase deploy, or Vercel deploy.',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops Control Room implementation docs'));

  [
    'platform-only MobileShell layer',
    '`/api/platform/current-access` boundary',
    'SAFE_MODE confirmation',
    'alert-mute action',
    'captured force-republish scope',
    'Source gate: `npm run verify:ops-control-room-boundary`',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Ops Control Room mobile docs'));

  [
    '## Internal Ops Control Room And Platform Monitoring - July 16, 2026',
    'Control Room, Scheduler and Extraction failures now reject snapshots',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit ops control room checkpoint'));
}

function verifyOpsControlRoomBoundary() {
  const files = {
    packageJson: read('package.json'),
    safeModeRoute: read('src/app/api/ops/safe-mode/route.ts'),
    muteAlertsRoute: read('src/app/api/ops/mute-alerts/route.ts'),
    responseHelper: read('src/lib/ops/opsControlRoomClientResponse.ts'),
    opsDal: read('src/database/ops/index.ts'),
    desktop: read('src/components/templates/main-app/platform/opsControlRoom/index.tsx'),
    mobile: read('src/components/mobile/screens/MobileOpsControlRoomScreen.tsx'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    opsDoc: read('__docs__/ops-control-room/ops-control-room_impl.md'),
    mobileDoc: read('__docs__/ops-control-room/ops-control-room_mobile-support.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    currentAccessRoute: read('src/app/api/platform/current-access/route.ts'),
    currentAccessClient: read('src/lib/auth/currentPlatformAccessClient.ts'),
    platformRouteGuard: read('src/lib/auth/platformRouteGuard.ts'),
    operationsFunction: read('functions/src/triggers/operations.ts'),
    publishVerificationFunction: read('functions/src/monitoring/publishVerification.ts'),
  };

  [
    'failClosedOnProviderError: true',
    "const operatorId = resolveCurrentSessionUserDocumentId(session) || 'invalid-platform-session';",
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    "accessModel: 'current_persisted_platform_user'",
    "const PLATFORM_ACCESS_PRIVATE_RESPONSE_HEADERS = {",
    "'Cache-Control': 'private, no-store, max-age=0'",
    "'X-Content-Type-Options': 'nosniff'",
    "const headers = new Headers(init.headers);",
  ].forEach((token) => assertIncludes(files.currentAccessRoute, token, 'Platform current-access route'));
  [
    "fetch('/api/platform/current-access'",
    'readJsonResponseWithLimit(response, CURRENT_PLATFORM_ACCESS_MAX_BYTES)',
    "accessModel === 'current_persisted_platform_user'",
  ].forEach((token) => assertIncludes(files.currentAccessClient, token, 'Platform current-access client'));
  assertIncludes(files.platformRouteGuard, 'const currentUser = await getCurrentUser(session);', 'Platform route current authorization');
  assertIncludes(files.platformRouteGuard, 'currentUser.userData.platformRole !== sessionPlatformRole', 'Platform route current role equality');
  [
    'acquireForceRepublishLease(',
    'completeForceRepublishLease(',
    'FORCE_REPUBLISH_LEASE_MS',
    "state.status === 'running' && leaseExpiresAtMs > nowMs",
    'transaction.get(tenantRef)',
    'transaction.get(storeRef)',
    'transaction.get(userRef)',
    '{ requirePlatformAuthority: true }',
  ].forEach((token) => assertIncludes(files.publishVerificationFunction, token, 'Force republish server lease'));
  [
    'acquireForceRepublishLease(',
    'completeForceRepublishLease(republishLease)',
    'OPERATIONS_FORCE_REPUBLISH_LEASE_FINALIZE_FAILED',
    "'Force republish is already running for this store.'",
    "leaseError.message === PUBLISH_VERIFICATION_SCOPE_INVALID",
    "throw new HttpsError('permission-denied', 'You do not have access to this store.')",
  ].forEach((token) => assertIncludes(files.operationsFunction, token, 'Force republish callable lease'));

  verifySafeModeRoute(files.safeModeRoute);
  verifyMuteAlertsRoute(files.muteAlertsRoute);
  verifyResponseHelper(files.responseHelper);
  verifyOpsDal(files.opsDal);
  verifyDesktopSurface(files.desktop);
  verifyMobileSurface(files.mobile, files.mobileShell, files.mobileMore);
  verifyDocsAndPackage(files.packageJson, files.opsDoc, files.mobileDoc, files.auditDoc);

  console.log('Ops Control Room boundary verifier passed');
}

verifyOpsControlRoomBoundary();
