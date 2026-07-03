const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
    'Owner notification registry must be copied byte-for-byte to functions/src/sharedData',
  );

  [
    'OWNER_NOTIFICATION_COLLECTIONS',
    'OWNER_NOTIFICATION_TRIGGER_TYPES',
    'OWNER_NOTIFICATION_REGISTRY',
    'getOwnerNotificationRegistryEntry',
    'defaultChannels',
    'requiresWhatsAppConsent',
  ].forEach((token) => assertIncludes(appRegistry, token, 'Owner notification registry'));
}

function verifyOpsRoute(route) {
  [
    "withAuth(async (request, session) =>",
    "requiredPlatformRole: 'PLATFORM'",
    '!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS || !FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD',
    'const OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES = 8 * 1024;',
    'const DELIVERY_DETAIL_LIMIT = 12;',
    'const STATUS_FILTERS: OwnerNotificationOpsStatusFilter[] =',
    'z.enum(PRODUCT_IDS_FOR_OPS',
    'limit: z.coerce.number().int().min(5).max(50).default(30)',
    "action: z.literal('retry')",
    "action: z.literal('manualSend')",
    "action: z.literal('manualHandoff')",
    'Math.min(Math.max(limit * 3, 40), 90)',
    'countQueries: EVENT_STATUSES.length',
    'Manual refresh only. No realtime listener.',
    'Detail recipient resolution runs only after selecting one event.',
    "headers: { 'Cache-Control': 'no-store' }",
    'hashPublicRateLimitValue(userId)',
    'key: `owner-notification-ops:${userRateLimitHash}`',
    'readBoundedJsonBody(request, OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(PostActionSchema, body)',
    'manualRecipientOverride: true',
    'normalizeDestinationForAudit',
    'recipientMasked',
    'manualHandoffAt',
    "logOpsFailure('owner_notifications_route_failed'",
    "logOpsFailure('owner_notifications_action_failed'",
    "logger.security('Owner Notification Ops Action Validation Failed'",
    'getBoundedSecurityRouteContext(session, request)',
  ].forEach((token) => assertIncludes(route, token, 'Owner notification ops API route'));

  assertOrder(route, [
    'const rateLimitResult = await checkRateLimit({',
    'readBoundedJsonBody(request, OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(PostActionSchema, body)',
    'const db = getDbForProduct(validation.data.productId);',
  ], 'Owner notification ops POST admission order');

  assertOrder(route, [
    'const deliveriesSnap = await params.db',
    '.where(\'eventId\', \'==\', params.eventId)',
    '.limit(DELIVERY_DETAIL_LIMIT)',
  ], 'Owner notification detail delivery query boundary');

  [
    'request.json()',
    "error: data.error || null",
    "subject: data.subject || null",
    "providerMessageId: data.providerMessageId || null",
    "logger.error('[API /ops/owner-notifications]",
  ].forEach((token) => assertNotIncludes(route, token, 'Owner notification ops API route'));
}

function verifyCore(core, recipientResolver, whatsappChannel) {
  [
    'if (!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS)',
    'ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION',
    'ENABLE_OWNER_NOTIFICATION_ANSWERLATTICE_MIGRATION',
    'getOwnerNotificationRegistryEntry(input.productId, input.triggerType)',
    'const dedupeKey = getDedupeKey(input);',
    'const eventId = safeId(dedupeKey);',
    'const existing = await ref.get();',
    'if (!existing.exists) {',
    'processImmediately',
    "if (event.status === 'delivered')",
    'MAX_PER_RECIPIENT_PER_DAY = 20',
    'MAX_PER_STORE_PER_DAY = 10',
    'incrementRateLimit',
    'recipientHash',
    'recipientMasked',
    'sanitizeForFirestore',
    'sendOwnerNotificationEmail',
    'sendOwnerNotificationWhatsApp',
    'getAnswerlatticeRetentionFields',
    "logNotificationFailure('owner_notification_processing_failed'",
  ].forEach((token) => assertIncludes(core, token, 'Owner notification app core'));

  [
    'db.collection(DB_COLLECTIONS.STORES).doc(String(event.storeId)).get();',
    'DB_COLLECTIONS.TENANTS',
    'manualRecipientOverride === true',
    'forceHintRecipient ? hintEmail || email : email',
    'forceHintRecipient ? hintWhatsappNumber || whatsappNumber : whatsappNumber',
    'hasWhatsAppConsent(settings)',
  ].forEach((token) => assertIncludes(recipientResolver, token, 'Owner notification recipient resolver'));

  assertOrder(recipientResolver, [
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(event.storeId)).get();',
    'if (storeSnap.exists) {',
    'const legacyStoreSnap = await db',
  ], 'MenuList owner notification recipient lookup order');

  [
    'encodeURIComponent(phoneNumberId)',
    "redirect: 'manual'",
    'readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES)',
    'OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    'MAX_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH = 200',
    "error: 'whatsapp_send_failed'",
  ].forEach((token) => assertIncludes(whatsappChannel, token, 'Owner notification app WhatsApp channel'));

  [
    'response.text()',
    'console.log',
    'console.warn',
    'console.error',
  ].forEach((token) => assertNotIncludes(core + recipientResolver + whatsappChannel, token, 'Owner notification app notification stack'));
}

function verifyFunctionsProcessor(processor, scheduler) {
  [
    'FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATIONS',
    'FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION',
    'isLifecycleMessagingEnabled',
    'db.collection(DB_COLLECTIONS.STORES).doc(event.storeId).get()',
    'DB_COLLECTIONS.TENANTS',
    'encodeURIComponent(phoneNumberId)',
    'OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    'readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES)',
    'providerResponseBodySkipped: true',
    'FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS',
    'FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS',
    'createAlert({',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.OWNER_NOTIFICATION_FAILURE',
    'retryFailedOwnerNotifications',
    'getOwnerNotificationDigest',
    'failureCode: OWNER_NOTIFICATION_PROCESSING_FAILED',
  ].forEach((token) => assertIncludes(processor, token, 'Functions owner notification processor'));

  assertOrder(processor, [
    'let storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(event.storeId).get();',
    'if (!storeDoc.exists) {',
    '.collection(DB_COLLECTIONS.TENANTS).doc(event.tenantId)',
  ], 'Functions MenuList owner notification store lookup order');

  [
    "name: 'owner_notification_retention_cleanup'",
    'run: runOwnerNotificationRetentionCleanup',
    'lockTtlMs: 10 * MINUTE_MS',
  ].forEach((token) => assertIncludes(scheduler, token, 'MenuList maintenance scheduler owner notification cleanup'));

  [
    'await response.text()',
    'response.json()',
    'console.log',
    'console.warn',
  ].forEach((token) => assertNotIncludes(processor, token, 'Functions owner notification processor'));
}

function verifyMonitor(monitor, responseHelper) {
  [
    "platformRole === 'PLATFORM'",
    'Access restricted to platform administrators.',
    '!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD',
    "fetch(`/api/ops/owner-notifications?",
    "fetch('/api/ops/owner-notifications'",
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'readOwnerNotificationSnapshotResponse(response',
    'readOwnerNotificationActionResponse(response',
    "message.error('Failed to load owner notifications')",
    "message.error('Owner notification action failed')",
    'formatMonitorError',
    'copyRuntimeTextToClipboard',
    'window.open(whatsappWebHref',
    'Record Manual',
    'Cost-bounded monitor',
    'No realtime listener.',
    'Read cost:',
  ].forEach((token) => assertIncludes(monitor, token, 'Owner notification monitor UI'));

  [
    'OWNER_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'readJsonResponseWithLimit<unknown>',
    "value.feature.accessModel === 'platform_role'",
    'value.feature.realtimeListeners === false',
    'isOwnerNotificationEventRow',
    'isOwnerNotificationDeliveryRow',
    'isOwnerNotificationOpsCost',
    "logRuntimeFailure(OWNER_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED",
    'OWNER_NOTIFICATION_MONITOR_RESPONSE_REJECTED',
    'OWNER_NOTIFICATION_MONITOR_RESPONSE_INVALID',
  ].forEach((token) => assertIncludes(responseHelper, token, 'Owner notification monitor response helper'));

  [
    'response.json()',
    '.json().catch',
    'error.message',
    'await navigator.clipboard.writeText',
  ].forEach((token) => assertNotIncludes(monitor + responseHelper, token, 'Owner notification monitor client boundary'));
}

function verifyDocsAndPackage(packageJson, specDoc, implDoc, firebaseDoc, mobileDoc, helpDoc, auditDoc, changelogDoc) {
  [
    '"verify:owner-notifications-boundary": "node scripts/verification/verify-owner-notifications-boundary.js"',
  ].forEach((token) => assertIncludes(packageJson, token, 'package.json owner notification verifier'));

  [
    'Implemented source evidence; not current launch certification',
    'Current release boundary (July 2, 2026)',
    '`npm run verify:owner-notifications-boundary`',
    'scoped provider smoke for SMTP/WhatsApp where enabled',
    'platform recovery monitor browser QA',
    'target Firebase deploy evidence where Functions logic changes',
    'target Vercel deploy evidence where app routes change',
  ].forEach((token) => assertIncludes(specDoc, token, 'Owner notification spec docs'));

  [
    'Queue-first',
    'copied byte-for-byte to `functions/src/sharedData/ownerNotificationRegistry.ts`',
    'platformRole === \'PLATFORM\'',
    'no realtime listener',
    'reject bodies above 8KB before event reads',
    'Dashboard load/action responses are parsed by the shared owner-notification client response helper',
    'Source gate: `npm run verify:owner-notifications-boundary`',
  ].forEach((token) => assertIncludes(implDoc, token, 'Owner notification implementation docs'));

  [
    'canonical top-level `stores/{storeId}` first',
    'No composite index was added',
    'The platform dashboard at `/ops/owner-notifications` is intentionally manual and bounded',
    'POST recovery actions keep the platform-role gate',
    'does not run Firestore reads/writes, SMTP, WhatsApp, browser smoke, Firebase deploy, or Vercel deploy',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Owner notification Firebase docs'));

  [
    'Source-bounded mobile boundary; not current launch certification',
    'Current release boundary (July 2, 2026)',
    'Full delivery log table.',
    'Detailed delivery logs belong in platform/admin views.',
    '`npm run verify:owner-notifications-boundary`',
    'authenticated mobile settings/status QA for any owner-facing setup surface in release scope',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Owner notification mobile docs'));

  [
    'Source-bounded help draft; not current support-publication approval',
    'Current publication boundary (July 2, 2026)',
    '`npm run verify:owner-notifications-boundary`',
    'SMTP/WhatsApp provider smoke where enabled',
    'authenticated owner settings/status QA for the target surface',
    'When notification settings are exposed in the target owner surface:',
  ].forEach((token) => assertIncludes(helpDoc, token, 'Owner notification help docs'));

  [
    [specDoc, '**Status:** Ready for implementation planning', 'Owner notification spec stale planning status'],
    [mobileDoc, '**Status:** Ready for implementation planning', 'Owner notification mobile stale planning status'],
    [helpDoc, '**Status:** Help draft for future implementation', 'Owner notification help stale future-publication status'],
    [helpDoc, 'When the feature is available:', 'Owner notification help stale availability wording'],
  ].forEach(([source, token, label]) => assertNotIncludes(source, token, label));

  [
    'Owner notification boundary source gate: `npm run verify:owner-notifications-boundary`',
    'source-only owner-notification registry/API/processor/monitor/docs gate',
    'Owner Notifications doc-boundary checkpoint',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit owner notification checkpoint'));

  [
    'Owner Notifications Doc Boundary',
    '`npm run verify:owner-notifications-boundary`',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog owner notification checkpoint'));
}

function verifyOwnerNotificationsBoundary() {
  const files = {
    packageJson: read('package.json'),
    appRegistry: read('src/data/shared/ownerNotificationRegistry.ts'),
    functionsRegistry: read('functions/src/sharedData/ownerNotificationRegistry.ts'),
    route: read('src/app/api/ops/owner-notifications/route.ts'),
    core: read('src/lib/owner-notifications/index.ts'),
    recipientResolver: read('src/lib/owner-notifications/recipientResolver.ts'),
    whatsappChannel: read('src/lib/owner-notifications/channels/whatsapp.ts'),
    processor: read('functions/src/ownerNotifications/processor.ts'),
    scheduler: read('functions/src/schedulers/menulistMaintenanceScheduler.ts'),
    monitor: read('src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx'),
    responseHelper: read('src/lib/ops/ownerNotificationClientResponse.ts'),
    specDoc: read('__docs__/owner-notifications/owner-notifications_spec.md'),
    implDoc: read('__docs__/owner-notifications/owner-notifications_impl.md'),
    firebaseDoc: read('__docs__/owner-notifications/owner-notifications_firebase.md'),
    mobileDoc: read('__docs__/owner-notifications/owner-notifications_mobile-support.md'),
    helpDoc: read('__docs__/owner-notifications/owner-notifications_helpdoc.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelogDoc: read('__docs__/CHANGELOG.md'),
  };

  verifyRegistryMirror(files.appRegistry, files.functionsRegistry);
  verifyOpsRoute(files.route);
  verifyCore(files.core, files.recipientResolver, files.whatsappChannel);
  verifyFunctionsProcessor(files.processor, files.scheduler);
  verifyMonitor(files.monitor, files.responseHelper);
  verifyDocsAndPackage(
    files.packageJson,
    files.specDoc,
    files.implDoc,
    files.firebaseDoc,
    files.mobileDoc,
    files.helpDoc,
    files.auditDoc,
    files.changelogDoc,
  );

  console.log('Owner notifications boundary verifier passed');
}

verifyOwnerNotificationsBoundary();
