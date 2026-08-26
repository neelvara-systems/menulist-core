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

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function verifyRegistryMirror(appRegistry, functionsRegistry) {
  assert(
    normalizeLineEndings(appRegistry) === normalizeLineEndings(functionsRegistry),
    'Platform notification registry must be copied byte-for-byte to functions/src/sharedData',
  );

  [
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES',
    'PLATFORM_NOTIFICATION_REGISTRY',
    'getPlatformNotificationRegistryEntry',
    'defaultChannels',
    'cooldownMinutes',
    'immediate',
    'runbook',
  ].forEach((token) => assertIncludes(appRegistry, token, 'Platform notification registry'));
}

function verifyFirestoreDocumentIdHelper(helper) {
  [
    'RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/',
    'export function isValidFirestoreDocumentId(value: unknown): value is string',
    "id !== '.'",
    "id !== '..'",
    "!id.includes('/')",
    'FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES = 1_500',
    'new TextEncoder().encode(id).byteLength <= FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES',
    '!RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(id)',
  ].forEach((token) => assertIncludes(helper, token, 'Firestore document ID helper'));
}

function verifyOpsRoute(route) {
  [
    "withAuth(async (request, session) =>",
    "requiredPlatformRole: 'PLATFORM'",
    '!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD',
    'const PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES = 8 * 1024;',
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'const STATUS_FILTERS: PlatformNotificationStatusFilter[]',
    'const SEVERITY_FILTERS: PlatformNotificationSeverityFilter[]',
    'const PlatformNotificationEventIdSchema = z.string()',
    ".refine(isValidFirestoreDocumentId, 'Invalid event ID')",
    'eventId: PlatformNotificationEventIdSchema.optional()',
    'z.enum(CATEGORY_VALUES)',
    'limit: z.coerce.number().int().min(5).max(100).default(50)',
    "action: z.literal('acknowledge')",
    'eventId: PlatformNotificationEventIdSchema',
    "action: z.literal('manualHandoff')",
    "action: z.literal('createManualAlert')",
    'async function acknowledgeExistingAlert(',
    'async function recordPlatformManualHandoff(params:',
    'const PlatformNotificationActionIdSchema = z.string()',
    'actionId: PlatformNotificationActionIdSchema',
    "return NextResponse.json({ error: 'Alert not found' }, { status: 404 });",
    'transaction.update(ref, {',
    'Math.min(Math.max(limit * 3, 75), 150)',
    'authReads: 1',
    'countQueries: 0',
    'Manual refresh only. One current-user authorization read and one bounded recent-alert scan.',
    'Counts and filters describe that same recent window',
    "headers: { 'Cache-Control': 'no-store' }",
    'hashPublicRateLimitValue(sessionOperatorId)',
    'key: `platform-notification-ops:${operatorRateLimitHash}`',
    'key: `platform-notification-ops-read:${operatorRateLimitHash}`',
    'failClosedOnProviderError: true',
    'getCurrentPlatformUser(session)',
    "accessModel: 'current_persisted_platform_user'",
    'readBoundedJsonBody(request, PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(PostActionSchema, body)',
    'safeMetadataPreview(data.metadata)',
    'buildPlatformAlertDisplayMessage(classified.entry.description, data)',
    'manualHandoffDestinationMasked',
    'createAlert({',
    'documentId: safeActionDocumentId(`manual-alert|${operatorId}|${validation.data.actionId}`)',
    'manualHandoffActionIdHash: actionIdHash',
    "if (snapshot.data()?.acknowledged === true) return 'replayed';",
    'if (currentData.manualHandoffActionIdHash === actionIdHash)',
    ": 'conflict';",
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT',
    "logOpsFailure('platform_notifications_route_failed'",
    "logOpsFailure('platform_notifications_action_failed'",
    "logger.security('Platform Notification Ops Action Validation Failed'",
    'getBoundedSecurityRouteContext(session, request)',
  ].forEach((token) => assertIncludes(route, token, 'Platform notification ops API route'));

  assertOrder(route, [
    'const rateLimit = await checkRateLimit({',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'readBoundedJsonBody(request, PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(PostActionSchema, body)',
  ], 'Platform notification POST admission order');

  assertOrder(route, [
    '.collection(DB_COLLECTIONS.SYSTEM_ALERTS)',
    ".orderBy('timestamp', 'desc')",
    '.limit(params.scanLimit)',
  ], 'Platform notification list query boundary');

  [
    'request.json()',
    '.doc(validation.data.eventId).set({',
    'title: String(data.title || classified.entry.title)',
    'message: String(data.message || classified.entry.description)',
    "logger.error('[API /ops/platform-notifications]",
    "metadata: data.metadata",
  ].forEach((token) => assertNotIncludes(route, token, 'Platform notification ops API route'));
}

function verifyClassifier(classifier) {
  [
    'metadata?: Record<string, unknown>;',
    'const PLATFORM_NOTIFICATION_PRODUCT_IDS = new Set<PlatformNotificationProductId>',
    'const PLATFORM_NOTIFICATION_CATEGORIES = new Set<PlatformNotificationCategory>',
    'normalizeProductId(alert.metadata?.productId, entry.productId)',
    'normalizeCategory(alert.metadata?.category, entry.category)',
    'normalizeSeverity(alert.severity, entry.severity)',
  ].forEach((token) => assertIncludes(classifier, token, 'Platform notification classifier'));

  [
    'metadata?: Record<string, any>;',
    "severity: normalizeSeverity(alert.severity || entry.severity)",
  ].forEach((token) => assertNotIncludes(classifier, token, 'Platform notification classifier'));
}

function verifyMonitor(monitor, responseHelper) {
  [
    "platformRole === 'PLATFORM'",
    'Access restricted to platform administrators.',
    '!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD',
    "fetch(`/api/ops/platform-notifications?",
    "fetch('/api/ops/platform-notifications'",
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'readPlatformNotificationSnapshotResponse(response',
    'readPlatformNotificationActionResponse(response',
    "messageApi.error('Failed to load platform notifications')",
    "messageApi.error('Platform notification action failed')",
    'copyRuntimeTextToClipboard',
    'openIsolatedBrowserUrl(whatsappWebHref',
    'setManualAlertOpen(true)',
    "createRuntimeId('platform_alert')",
    "createRuntimeId('platform_handoff')",
    'Cost-bounded monitor',
    'No realtime listener',
    'Read cost:',
    'scroll={{ x: 1526 }}',
    'width: 380',
  ].forEach((token) => assertIncludes(monitor, token, 'Platform notification monitor UI'));

  [
    'PLATFORM_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'readJsonResponseWithLimit<unknown>',
    "value.feature.accessModel === 'current_persisted_platform_user'",
    'isNonNegativeSafeInteger(value.authReads)',
    'value.feature.realtimeListeners === false',
    'isPlatformNotificationRow',
    'isPlatformNotificationRegistryEntry',
    'isPlatformNotificationOpsCost',
    'value.events.every(isPlatformNotificationRow)',
    'value.registry.every(isPlatformNotificationRegistryEntry)',
    "logRuntimeFailure(PLATFORM_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED",
    'PLATFORM_NOTIFICATION_MONITOR_RESPONSE_REJECTED',
    'PLATFORM_NOTIFICATION_MONITOR_RESPONSE_INVALID',
  ].forEach((token) => assertIncludes(responseHelper, token, 'Platform notification monitor response helper'));

  [
    'response.json()',
    '.json().catch',
    'error.message',
    'await navigator.clipboard.writeText',
  ].forEach((token) => assertNotIncludes(monitor + responseHelper, token, 'Platform notification monitor client boundary'));
}

function verifyDocsAndPackage(packageJson, opsDoc, auditDoc) {
  assertIncludes(
    packageJson,
    '"verify:platform-notifications-boundary": "node scripts/verification/verify-platform-notifications-boundary.js"',
    'package.json platform notification verifier',
  );

  [
    '/ops/platform-notifications',
    'manual refresh model',
    'bounded action body',
    'simple Firestore document ID',
    'Actions update only existing alert documents',
    'hashed per-operator action limiter',
    'current persisted platform authorization',
    'bounded, newest-first window',
    'Rejected, oversized, malformed, or invalid responses use fixed platform failure copy',
    'Source gate: `npm run verify:platform-notifications-boundary`',
    'does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops Control Room docs platform notification boundary'));

  [
    'Platform notification boundary source gate: `npm run verify:platform-notifications-boundary`',
    'Platform notification event-id/action boundary checkpoint',
    'source-only platform-notification registry/API/monitor/docs gate',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit platform notification checkpoint'));
}

function verifyPlatformNotificationsBoundary() {
  const files = {
    packageJson: read('package.json'),
    appRegistry: read('src/data/shared/platformNotificationRegistry.ts'),
    functionsRegistry: read('functions/src/sharedData/platformNotificationRegistry.ts'),
    firestoreDocumentId: read('src/lib/firebase/firestoreDocumentId.ts'),
    route: read('src/app/api/ops/platform-notifications/route.ts'),
    classifier: read('src/lib/ops/platformNotificationClassifier.ts'),
    monitor: read('src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx'),
    responseHelper: read('src/lib/ops/platformNotificationClientResponse.ts'),
    opsDoc: read('__docs__/ops-control-room/ops-control-room_impl.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
  };

  verifyRegistryMirror(files.appRegistry, files.functionsRegistry);
  verifyFirestoreDocumentIdHelper(files.firestoreDocumentId);
  verifyOpsRoute(files.route);
  verifyClassifier(files.classifier);
  verifyMonitor(files.monitor, files.responseHelper);
  verifyDocsAndPackage(files.packageJson, files.opsDoc, files.auditDoc);

  console.log('Platform notifications boundary verifier passed');
}

verifyPlatformNotificationsBoundary();
