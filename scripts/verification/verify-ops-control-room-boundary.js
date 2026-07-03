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
    'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
    'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
    "db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
    'SAFE_MODE: true',
    'SAFE_MODE: false',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_ACTIVATED',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_DEACTIVATED',
    "logger.security('SAFE_MODE Activated'",
    "logger.security('SAFE_MODE Deactivated'",
    "logOpsFailure('ops_safe_mode_route_failed'",
    "getBoundedOpsStringContext('reason'",
    'getBoundedSecurityRouteContext(session, request)',
  ].forEach((token) => assertIncludes(route, token, 'Ops SAFE_MODE route'));

  assertOrder(route, [
    'const rateLimit = await checkRateLimit({',
    'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
    'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
    "db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
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
    'readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES',
    'MuteAlertsRequestSchema.safeParse(bodyResult.data)',
    'getSafeZodValidationDetails(validation.error)',
    "db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system')",
    '{ alertsMutedUntil: mutedUntil }',
    "logOpsFailure('ops_mute_alerts_route_failed'",
    'getBoundedSecurityRouteContext(session, request)',
  ].forEach((token) => assertIncludes(route, token, 'Ops mute-alerts route'));

  assertOrder(route, [
    'const rateLimit = await checkRateLimit({',
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
    'limit(maxResults)',
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
    'getSystemState()',
    'getAdoptionPulse()',
    'getIntegritySignals()',
    'getRecentAlerts(10)',
    "fetch('/api/ops/safe-mode'",
    "fetch('/api/ops/mute-alerts'",
    '...OPS_CONTROL_ROOM_REQUEST_POLICY',
    'readOpsControlRoomSafeModeResponse(res',
    'readOpsControlRoomMuteAlertsResponse(res',
    "message.error('Failed to toggle SAFE_MODE')",
    "message.error('Failed to mute alerts')",
    "message.error('Force republish failed')",
    "httpsCallable(fns, 'forceRepublish')",
    'isOpsControlRoomForceRepublishResponse(result.data)',
    'logInvalidOpsControlRoomForceRepublishResponse(result.data',
    "logOpsFailure('ops_control_room_safe_mode_toggle_failed'",
    "logOpsFailure('ops_control_room_mute_alerts_failed'",
    "logOpsFailure('ops_control_room_force_republish_failed'",
    'SAFE_MODE blocks AI generation and bulk operations. Public menus remain unaffected.',
  ].forEach((token) => assertIncludes(component, token, 'Desktop Ops Control Room'));

  [
    'res.json()',
    'response.json()',
    '.json().catch',
    'error.message',
    "throw new Error('Request failed')",
  ].forEach((token) => assertNotIncludes(component, token, 'Desktop Ops Control Room boundary'));
}

function verifyMobileSurface(screen, mobileShell, mobileMore) {
  [
    "platformRole === 'PLATFORM'",
    'This screen is available only to platform admins.',
    'getSystemState()',
    'getAdoptionPulse()',
    'getIntegritySignals()',
    'getRecentAlerts(10)',
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
    "logOpsFailure('mobile_ops_safe_mode_toggle_failed'",
    "logOpsFailure('mobile_ops_mute_alerts_failed'",
    "logOpsFailure('mobile_ops_force_republish_failed'",
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
}

function verifyDocsAndPackage(packageJson, opsDoc, mobileDoc, auditDoc) {
  assertIncludes(
    packageJson,
    '"verify:ops-control-room-boundary": "node scripts/verification/verify-ops-control-room-boundary.js"',
    'package.json ops control room verifier',
  );

  [
    '/ops` keeps the same platform-only route',
    'SAFE_MODE toggle',
    'alert-mute button',
    'force-republish callable behavior',
    'OPS_CONTROL_ROOM_REQUEST_POLICY',
    'caps browser JSON parsing at 16KB',
    'desktop and mobile force-republish callable results now require `success` boolean',
    'bounded `ops_control_room_response_*` diagnostics',
    'Source gate: `npm run verify:ops-control-room-boundary`',
    'does not run Firestore reads/writes, callable invocations, provider calls, browser smoke, Firebase deploy, or Vercel deploy',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops Control Room implementation docs'));

  [
    'platform-only emergency surface',
    'SAFE_MODE confirmation',
    'alert-mute action',
    'force-republish confirmation pattern',
    'Source gate: `npm run verify:ops-control-room-boundary`',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Ops Control Room mobile docs'));

  [
    'Ops Control Room boundary source gate: `npm run verify:ops-control-room-boundary`',
    'source-only SAFE_MODE/mute-alerts/force-republish route, desktop, mobile, and docs gate',
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
  };

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
