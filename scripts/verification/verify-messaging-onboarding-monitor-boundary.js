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

function assertNotMatches(source, pattern, label) {
  assert(!pattern.test(source), `${label} must not match ${pattern}`);
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

function verifyProviderRuntimeBoundary(providerRegistry, constants, stagingEnv, productionEnv) {
  [
    'const providerRegistry: Partial<Record<MessagingProvider, () => IMessagingProvider>> = {',
    'whatsapp: () => new WhatsAppAdapter(),',
    'if (candidate in providerRegistry && providerRegistry[candidate as MessagingProvider])',
  ].forEach((token) => assertIncludes(providerRegistry, token, 'Messaging onboarding provider registry'));

  [
    'telegram: () =>',
    'new TelegramAdapter',
    'line:',
    'viber:',
  ].forEach((token) => assertNotIncludes(providerRegistry, token, 'Messaging onboarding active provider registry boundary'));

  [
    'ENABLE_MESSAGING_ONBOARDING: readBooleanEnv("ENABLE_MESSAGING_ONBOARDING", false)',
    'if (!raw) return ["whatsapp"];',
    'MESSAGING_ONBOARDING_PROVIDERS: readProvidersEnv()',
  ].forEach((token) => assertIncludes(constants, token, 'Messaging onboarding Functions flag defaults'));

  [
    'ENABLE_MESSAGING_ONBOARDING=false',
    'MESSAGING_ONBOARDING_PROVIDERS=whatsapp',
  ].forEach((token) => {
    assertIncludes(stagingEnv, token, 'Messaging onboarding staging env defaults');
    assertIncludes(productionEnv, token, 'Messaging onboarding production env defaults');
  });
}

function verifyRoute(route) {
  [
    "withAuth(async (request, session) =>",
    "requiredPlatformRole: 'PLATFORM'",
    '!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD',
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    "const HEALTH_CONTROL_DOC = 'messaging_onboarding_control';",
    'const EVENT_WINDOW_HOURS = 24;',
    'const RECENT_EVENT_LIMIT = 12;',
    'const RECENT_SESSION_LIMIT = 8;',
    'const RECENT_ALERT_LIMIT = 8;',
    'const MAX_METADATA_KEYS = 40;',
    'const MAX_METADATA_STRING_LENGTH = 96;',
    "const MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY = 'messaging-onboarding-ops';",
    'SAFE_METADATA_KEYS',
    'BOUNDED_METADATA_KEYS',
    'buildMessagingOpsResponseId',
    "createHash('sha256')",
    'function normalizeMessagingHealthSnapshotId(value: unknown): string | null',
    'return isValidFirestoreDocumentId(snapshotId) ? snapshotId : null;',
    'sanitizeMetadata(data.metadata)',
    'maskDisplayId(data.providerDisplayId)',
    'buildMessagingAlertTitle(severity)',
    'buildMessagingAlertMessage(data)',
    "getRateLimitForFeature('DATA_READ')",
    'hashPublicRateLimitValue(userId)',
    'key: `${MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY}:${userRateLimitHash}`',
    "headers: {",
    "'Cache-Control': 'no-store'",
    "'Retry-After': String(waitSeconds)",
    'healthCollection.doc(HEALTH_CONTROL_DOC).get()',
    'const lastSnapshotId = normalizeMessagingHealthSnapshotId(control.data()?.lastSnapshotId);',
    'healthCollection.doc(lastSnapshotId).get()',
    'INBOUND_STATUSES.map',
    'WATCHED_STATES.map',
    'WEBHOOK_EVENT_COUNTS.map',
    ".where('timestamp', '>=', windowStart)",
    ".orderBy('timestamp', 'desc')",
    '.limit(RECENT_EVENT_LIMIT)',
    '.limit(RECENT_SESSION_LIMIT)',
    '.limit(30)',
    '.slice(0, RECENT_ALERT_LIMIT)',
    "providerMode: 'official_cloud_api'",
    "accessModel: 'platform_role'",
    "logOpsFailure('ops_messaging_onboarding_route_failed'",
    "getBoundedOpsStringContext('requestPath', request.nextUrl.pathname)",
  ].forEach((token) => assertIncludes(route, token, 'Messaging onboarding ops route'));

  assertOrder(route, [
    '!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD',
    'const rateLimitResponse = await checkMessagingOnboardingOpsRateLimit(session);',
    'getLatestHealthSnapshot(),',
    'getInboundQueueCounts(),',
    'getSessionStateCounts(),',
    'getWebhookWindow(),',
    'getRecentSessions(),',
    'getRecentAlerts(),',
    'return NextResponse.json(',
  ], 'Messaging onboarding route feature/rate/read order');

  assertOrder(route, [
    'const lastSnapshotId = normalizeMessagingHealthSnapshotId(control.data()?.lastSnapshotId);',
    'healthCollection.doc(lastSnapshotId).get()',
  ], 'Messaging onboarding health snapshot ID guard order');

  [
    'request.json()',
    '__name__',
    'const lastSnapshotId = control.data()?.lastSnapshotId;',
    "typeof lastSnapshotId === 'string' && lastSnapshotId.trim()",
    'id: doc.id,',
    "sessionId: String(data.sessionId || '-')",
    'alerts: Array.isArray(data.alerts) ? data.alerts : []',
    "title: data.title || 'Messaging onboarding alert'",
    "message: data.message || ''",
    'key: `${MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY}:${userId}`',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(route, token, 'Messaging onboarding ops route boundary'));
}

function verifyMonitor(monitor) {
  [
    "platformRole === 'PLATFORM'",
    "redirect('/dashboard')",
    '!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD',
    "fetch('/api/ops/messaging-onboarding'",
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'MESSAGING_ONBOARDING_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'readJsonResponseWithLimit<unknown>',
    'isMessagingOnboardingOpsSnapshotResponse(payload)',
    'function isMessagingOnboardingOpsHealth',
    'isMessagingOnboardingOpsHealth(value.health)',
    'function isWebhookWindow',
    'isWebhookWindow(value.webhookWindow)',
    'function isInboundQueue',
    'isInboundQueue(value.inboundQueue)',
    'function isOpsEvent',
    'value.recentEvents.every(isOpsEvent)',
    'function isOpsSession',
    'value.recentSessions.every(isOpsSession)',
    'function isOpsAlert',
    'value.recentAlerts.every(isOpsAlert)',
    'function isMessagingOnboardingOpsFeature',
    'isMessagingOnboardingOpsFeature(value.feature)',
    "value.providerMode === 'official_cloud_api'",
    "value.accessModel === 'platform_role'",
    'logRuntimeFailure(MESSAGING_ONBOARDING_MONITOR_RESPONSE_PARSE_FAILED',
    'MESSAGING_ONBOARDING_MONITOR_RESPONSE_REJECTED',
    'MESSAGING_ONBOARDING_MONITOR_RESPONSE_INVALID',
    'MESSAGING_ONBOARDING_MONITOR_REQUEST_FAILED',
    'MESSAGING_ONBOARDING_MONITOR_LOAD_FAILED',
    'getBoundedRuntimeStringContext(\'endpoint\', \'/api/ops/messaging-onboarding\')',
    "Text strong>Not used</Text>",
    'Generated {formatTimestamp(snapshot?.generatedAt, formatter)}',
    'messaging onboarding collections remain denied to client Firestore',
  ].forEach((token) => assertIncludes(monitor, token, 'Messaging onboarding monitor UI'));

  [
    'response.json()',
    '.json().catch',
    'error.message',
    'await navigator.clipboard.writeText',
  ].forEach((token) => assertNotIncludes(monitor, token, 'Messaging onboarding monitor UI boundary'));
}

function verifyTypes(types) {
  [
    "export type MessagingOnboardingOpsStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';",
    "providerMode: 'official_cloud_api';",
    "accessModel: 'platform_role';",
    'recentSessions: MessagingOnboardingOpsSession[];',
    'recentEvents: MessagingOnboardingOpsEvent[];',
    'recentAlerts: MessagingOnboardingOpsAlert[];',
    'userIdMasked: string;',
    'providerDisplayIdMasked: string;',
  ].forEach((token) => assertIncludes(types, token, 'Messaging onboarding ops types'));
}

function verifyMobileSurface(mobileShell, mobileMore, mobilePlatformInternal) {
  assertIncludes(
    mobileShell,
    "'/ops/messaging-onboarding': 'messagingOnboardingMonitor'",
    'Mobile shell messaging onboarding route map',
  );

  [
    "key: 'messagingOnboardingMonitor'",
    "label: 'Messaging Onboarding'",
    "description: 'Messaging onboarding sessions, preview fixes, and publish readiness.'",
    "onClick: () => openSubScreen('messagingOnboardingMonitor')",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More messaging onboarding entry'));

  [
    "const MessagingOnboardingMonitor = dynamic(() => import('@template/main-app/platform/messagingOnboardingMonitor')",
    'messagingOnboardingMonitor: {',
    'Component: MessagingOnboardingMonitor',
    "desktopPath: '/ops/messaging-onboarding'",
    "surface: 'Messaging Onboarding'",
    "title: 'Messaging Onboarding'",
  ].forEach((token) => assertIncludes(mobilePlatformInternal, token, 'Mobile platform internal messaging onboarding screen'));
}

function verifyDocsAndPackage(packageJson, opsDoc, auditDoc, docs, changelogDoc) {
  assertIncludes(
    packageJson,
    '"verify:messaging-onboarding-monitor-boundary": "node scripts/verification/verify-messaging-onboarding-monitor-boundary.js"',
    'package.json messaging onboarding monitor verifier',
  );

  [
    '/ops/messaging-onboarding` keeps the same platform-only route and manual refresh model',
    'caps `/api/ops/messaging-onboarding` response JSON at 256KB',
    'Rejected, oversized, malformed, or invalid responses use fixed platform failure copy',
    'DATA_READ limiter',
    'systemHealth/messaging_onboarding_control.lastSnapshotId',
    'avoiding document-id prefix scans or a `__name__` index dependency',
    'July 6 follow-up: `systemHealth/messaging_onboarding_control.lastSnapshotId` now passes through the shared Firestore document-ID guard',
    'existing unknown-health state',
    'Source gate: `npm run verify:messaging-onboarding-monitor-boundary`',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops docs messaging onboarding monitor source gate'));

  [
    'Messaging Onboarding Health Snapshot Document ID Boundary checkpoint',
    'Messaging onboarding monitor boundary source gate: `npm run verify:messaging-onboarding-monitor-boundary`',
    'source-only platform monitor route, bounded Admin SDK reads, masked event/session rows, desktop/mobile, and docs gate',
    'raw stored-ID fallback exclusion',
    'Messaging Onboarding active-provider source-contract checkpoint',
    'providerRegistry.ts` registers WhatsApp only',
    'reserved extension candidates only',
    'active Messaging Onboarding stale-label scan',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit messaging onboarding monitor checkpoint'));

  const staleProviderRoadmapPattern = /Phase 2|Phase 3|future|Future|deferred|Deferred|post-launch|ready for production|ready for testing|ship ready/i;
  Object.entries(docs).forEach(([label, content]) => {
    assertNotMatches(content, staleProviderRoadmapPattern, `Messaging onboarding ${label} active-provider docs`);
  });

  [
    'Do not reuse the older command shapes from those historical attempts.',
    'Current messaging-onboarding retry evidence must start with `npm run verify:functions-deploy-preflight`',
    'record the exact scoped `menulist-qa` target list and reason in the production-readiness audit before deploy retry',
    'Production deploys require QA evidence and explicit production deploy approval.',
  ].forEach((token) => assertIncludes(docs.firebase, token, 'Messaging onboarding Firebase deploy retry boundary'));

  [
    'July 6, 2026 ops health snapshot ID boundary note',
    '`/api/ops/messaging-onboarding` now validates `systemHealth/messaging_onboarding_control.lastSnapshotId` with the shared Firestore document-ID guard',
    'malformed, reserved, empty, or path-shaped values return the existing unknown health state',
  ].forEach((token) => assertIncludes(docs.firebase, token, 'Messaging onboarding Firebase health snapshot ID boundary'));

  [
    'Messaging Onboarding Health Snapshot Document ID Boundary',
    '`/api/ops/messaging-onboarding` validates `systemHealth/messaging_onboarding_control.lastSnapshotId` with the shared Firestore document-ID guard',
    'malformed, reserved, empty, or path-shaped `lastSnapshotId` values return the existing unknown-health state',
    '`npm run verify:messaging-onboarding-monitor-boundary` now guards the stored snapshot ID normalizer',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Messaging onboarding changelog health snapshot ID boundary'));

  [
    'firebase deploy --only functions:',
    'PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions',
    'triggerSchedulerManually --project menulist-qa',
  ].forEach((token) => assertNotIncludes(docs.firebase, token, 'Messaging onboarding Firebase stale deploy command'));

  [
    'WhatsApp as the only active registered provider',
    'Additional providers require a separate audited adapter',
    'providerRegistry` registers WhatsApp only',
  ].forEach((token) => {
    const found = docs.readme.includes(token) || docs.spec.includes(token) || docs.impl.includes(token);
    assert(found, `Messaging onboarding docs must include ${token}`);
  });

  [
    'Provider Boundary',
    'Telegram, LINE, Viber, or any other provider require a separate adapter',
    'Current source truth',
    'Provider Inventory',
    'Reserved candidate',
  ].forEach((token) => assertIncludes(docs.spec, token, 'Messaging onboarding spec active-provider boundary'));

  [
    'type MessagingProvider = "whatsapp";',
    'No non-WhatsApp adapter is registered in current source.',
    'Current source registers WhatsApp only.',
    'Runtime Area: Foundation',
    'Runtime Area: Intelligence Layer',
    'Runtime Area: Preview & Publish',
    'Runtime Area: Cleanup & Hardening',
    'Reserved Provider Secret Pattern',
    'Conditional Optimizations',
  ].forEach((token) => assertIncludes(docs.impl, token, 'Messaging onboarding implementation active-provider boundary'));

  [
    'Provider-agnostic core with WhatsApp-only registered runtime',
    'Runtime Area: Intelligence Layer',
    'Runtime Area: Preview & Publish',
  ].forEach((token) => assertIncludes(docs.validation, token, 'Messaging onboarding validation launch boundary'));
}

function verifyMessagingOnboardingMonitorBoundary() {
  const files = {
    packageJson: read('package.json'),
    route: read('src/app/api/ops/messaging-onboarding/route.ts'),
    providerRegistry: read('functions/src/messagingOnboarding/providers/providerRegistry.ts'),
    constants: read('functions/src/messagingOnboarding/constants.ts'),
    stagingEnv: read('.env.staging.example'),
    productionEnv: read('.env.production.example'),
    monitor: read('src/components/templates/main-app/platform/messagingOnboardingMonitor/index.tsx'),
    types: read('src/lib/ops/messagingOnboardingTypes.ts'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    mobilePlatformInternal: read('src/components/mobile/screens/MobilePlatformInternalScreen.tsx'),
    opsDoc: read('__docs__/ops-control-room/ops-control-room_impl.md'),
    readmeDoc: read('__docs__/messaging-onboarding/README.md'),
    specDoc: read('__docs__/messaging-onboarding/messaging-onboarding_spec.md'),
    implDoc: read('__docs__/messaging-onboarding/messaging-onboarding_impl.md'),
    firebaseDoc: read('__docs__/messaging-onboarding/messaging-onboarding_firebase.md'),
    validationDoc: read('__docs__/messaging-onboarding/messaging-onboarding_validation.md'),
    marketingDoc: read('__docs__/messaging-onboarding/messaging-onboarding_marketing.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelogDoc: read('__docs__/CHANGELOG.md'),
  };

  verifyProviderRuntimeBoundary(files.providerRegistry, files.constants, files.stagingEnv, files.productionEnv);
  verifyRoute(files.route);
  verifyMonitor(files.monitor);
  verifyTypes(files.types);
  verifyMobileSurface(files.mobileShell, files.mobileMore, files.mobilePlatformInternal);
  verifyDocsAndPackage(files.packageJson, files.opsDoc, files.auditDoc, {
    readme: files.readmeDoc,
    spec: files.specDoc,
    impl: files.implDoc,
    firebase: files.firebaseDoc,
    validation: files.validationDoc,
    marketing: files.marketingDoc,
  }, files.changelogDoc);

  console.log('Messaging onboarding monitor boundary verifier passed');
}

verifyMessagingOnboardingMonitorBoundary();
