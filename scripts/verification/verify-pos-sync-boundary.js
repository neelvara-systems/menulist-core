#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertNotMatches(content, pattern, label) {
  assert(!pattern.test(content), `${label} must not match ${pattern}`);
}

function assertOrder(content, orderedTokens, label) {
  let previousIndex = -1;
  for (const token of orderedTokens) {
    const index = content.indexOf(token, previousIndex + 1);
    assert(index !== -1, `${label} missing token ${token}`);
    assert(index > previousIndex, `${label} must keep token order at ${token}`);
    previousIndex = index;
  }
}

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

function verifyWebhookUrlGuard(webhookUrl, serverWebhookTarget) {
  [
    "const BLOCKED_HOSTNAMES = new Set([",
    "'localhost'",
    "'localhost.localdomain'",
    "'0.0.0.0'",
    "if (url.protocol !== 'https:')",
    'if (url.username || url.password)',
    'if (url.hash)',
    'isBlockedHostname(hostname) || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)',
    "hostname.endsWith('.localhost')",
    "hostname.endsWith('.local')",
    'if (first === 0) return true;',
    'if (first === 10) return true;',
    'if (first === 100 && second >= 64 && second <= 127) return true;',
    'if (first === 127) return true;',
    'if (first === 169 && second === 254) return true;',
    'if (first === 172 && second >= 16 && second <= 31) return true;',
    'if (first === 192 && second === 168) return true;',
    'if (first === 198 && (second === 18 || second === 19)) return true;',
    'if (first >= 224) return true;',
    "if (normalized === '::1' || normalized === '::') return true;",
    "if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;",
    "if (normalized.startsWith('fe80:')) return true;",
    "if (normalized.startsWith('::ffff:'))",
    'export function isBlockedPosSyncNetworkTarget',
  ].forEach((token) => assertIncludes(webhookUrl, token, 'POS webhook URL guard'));

  [
    "import { lookup } from 'dns/promises';",
    'validatePosSyncWebhookNetworkTarget',
    'lookup(hostname, { all: true, verbatim: true })',
    'isBlockedPosSyncNetworkTarget(hostname)',
    'isBlockedPosSyncNetworkTarget(address.address)',
    "error: 'blocked_hostname'",
    "error: 'blocked_resolved_address'",
    "error: 'dns_lookup_failed'",
  ].forEach((token) => assertIncludes(serverWebhookTarget, token, 'POS server DNS target guard'));
}

function verifyProtectedPosRoute(content, label, expectedRateLimitKey) {
  [
    'export const POST = withAuth(async (request, session) => {',
    'FEATURE_FLAGS.ENABLE_POS_SYNC',
    'requireAnyStorePermission(',
    'readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(schema, body)',
    'const tenantScope = normalizePosSyncNumericDocumentId(tenantId);',
    'const storeScope = normalizePosSyncNumericDocumentId(storeId);',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    'hashPublicRateLimitValue(storeDocumentId)',
    expectedRateLimitKey,
    'checkRateLimit({ key:',
    'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);',
    'const storeDoc = await storeRef.get();',
    'requireAnyStorePermissionForStoreData(',
    'validatePosSyncWebhookUrl(String(posSync.webhookUrl))',
    'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
    'fetch(webhookValidation.normalizedUrl, {',
    "redirect: 'manual'",
    'POS_SYNC_CONNECTION_ISSUE_MESSAGE',
    'logSecurityDiagnostic(',
    'logSecurityFailure(',
    'getBoundedSecurityStringContext',
  ].forEach((token) => assertIncludes(content, token, label));

  assertOrder(
    content,
    [
      'readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES',
      'validateAPIInput(schema, body)',
      'const tenantScope = normalizePosSyncNumericDocumentId(tenantId);',
      'const storeScope = normalizePosSyncNumericDocumentId(storeId);',
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'hashPublicRateLimitValue(storeDocumentId)',
      'checkRateLimit({ key:',
      'admin.firestore()',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);',
      'const storeDoc = await storeRef.get();',
      'requireAnyStorePermissionForStoreData(',
      'validatePosSyncWebhookUrl(String(posSync.webhookUrl))',
      'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
      'fetch(webhookValidation.normalizedUrl, {',
      "redirect: 'manual'",
    ],
    `${label} security order`,
  );

  [
    'secureLog(',
    'secureError(',
    'console.log(',
    'console.error(',
    'message: data.error',
    'webhookValidation.error ||',
  ].forEach((token) => assertNotIncludes(content, token, `${label} raw diagnostics boundary`));
}

function verifyDeliveryRoute(deliverRoute) {
  [
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'import { normalizePosSyncNumericDocumentId } from "@lib/posSync/posSyncDocumentId";',
    'storeId: z.number().int().positive()',
    'tenantId: z.number().int().positive()',
    "projectId: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/).refine(isValidFirestoreDocumentId, 'Invalid project ID'),",
    'PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.PUBLISH_MENU',
    'getScopedProjectData(db, tenantDocumentId, storeDocumentId, projectId)',
    "const newVersion = await db.runTransaction(async (transaction) => {",
    "collection(DB_COLLECTIONS.POS_DELIVERY_LOGS)",
    "orderBy('sentAt', 'desc')",
    '.offset(20)',
  ].forEach((token) => assertIncludes(deliverRoute, token, 'POS delivery route boundary'));

  assertOrder(
    deliverRoute,
    [
      'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
      'const projectData = await getScopedProjectData(db, tenantDocumentId, storeDocumentId, projectId);',
      'const newVersion = await db.runTransaction(async (transaction) => {',
      'buildMenuSnapshot(',
      'fetch(webhookValidation.normalizedUrl, {',
    ],
    'POS delivery outbound order',
  );

  assertNotIncludes(
    deliverRoute,
    'projectId: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/),',
    'POS delivery route loose project ID schema',
  );
  [
    '.doc(String(tenantId))',
    '.collection(String(storeId))',
    '.doc(String(storeId))',
    'hashPublicRateLimitValue(storeId)',
    'storeId: z.number().positive()',
    'tenantId: z.number().positive()',
  ].forEach((token) => assertNotIncludes(deliverRoute, token, `POS delivery raw target ID boundary ${token}`));
}

function verifyTestRoute(testRoute) {
  [
    'import { normalizePosSyncNumericDocumentId } from "@lib/posSync/posSyncDocumentId";',
    'storeId: z.number().int().positive()',
    'tenantId: z.number().int().positive()',
    'PERMISSIONS.MANAGE_INTEGRATIONS',
    'buildTestPayload(storeId, tenantId, store?.currencyCode || store?.currency || \'INR\')',
    "'posSync.status': 'connection_issue'",
    "'posSync.lastStatus': 'failed'",
  ].forEach((token) => assertIncludes(testRoute, token, 'POS test route boundary'));
  [
    '.doc(String(storeId))',
    'hashPublicRateLimitValue(storeId)',
    'storeId: z.number().positive()',
    'tenantId: z.number().positive()',
  ].forEach((token) => assertNotIncludes(testRoute, token, `POS test raw target ID boundary ${token}`));

  assertOrder(
    testRoute,
    [
      'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
      'const testPayload = buildTestPayload(storeId, tenantId, store?.currencyCode || store?.currency || \'INR\');',
      'fetch(webhookValidation.normalizedUrl, {',
    ],
    'POS test outbound order',
  );
}

function verifyDesktopAndMobileParity(desktopPosSync, mobilePosSync, testResponse) {
  [
    'export const POS_SYNC_TEST_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'export const POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES = 16 * 1024;',
    'isSuccessfulPosSyncTestResponse',
  ].forEach((token) => assertIncludes(testResponse, token, 'POS shared test response policy'));

  [
    'validatePosSyncWebhookUrl(webhookUrl)',
    'await Promise.resolve(onStoreUpdate({',
    "'posSync.webhookUrl': validation.normalizedUrl",
    "'posSync.status': enabled ? 'healthy' : 'disabled'",
    "'posSync.lastError': ''",
    "'posSync.consecutiveFailures': 0",
    "fetch('/api/pos-sync/test'",
    '...POS_SYNC_TEST_REQUEST_POLICY',
    'readDesktopPosSyncTestResponse(res, storeId, tenantId)',
    'isSuccessfulPosSyncTestResponse(data)',
    'message: POS_SYNC_TEST_FAILED_MESSAGE',
    'readJsonResponseWithLimit<unknown>',
    'POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES',
  ].forEach((token) => assertIncludes(desktopPosSync, token, 'Desktop POS sync boundary'));

  assertOrder(
    desktopPosSync,
    [
      'validatePosSyncWebhookUrl(webhookUrl)',
      'await Promise.resolve(onStoreUpdate({',
      "'posSync.webhookUrl': validation.normalizedUrl",
      "'posSync.status': enabled ? 'healthy' : 'disabled'",
      "'posSync.lastError': ''",
      "'posSync.consecutiveFailures': 0",
    ],
    'Desktop POS URL save validation order',
  );

  [
    'validatePosSyncWebhookUrl(trimmedWebhookUrl)',
    'webhookUrl: normalizedWebhookUrl',
    "lastError: enabled && !connectionChanged && currentPosSync.lastError ? POS_SYNC_CONNECTION_ISSUE_MESSAGE : ''",
    'updateStore({',
    'assertStoreUpdateSucceeded(',
    "fetch('/api/pos-sync/test'",
    '...POS_SYNC_TEST_REQUEST_POLICY',
    'readMobilePosSyncTestResponse(response, storeDetails.storeId, storeDetails.tenantId)',
    'isSuccessfulPosSyncTestResponse(data)',
    'message: POS_SYNC_CONNECTION_ISSUE_MESSAGE',
    'readJsonResponseWithLimit<unknown>',
    'POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES',
  ].forEach((token) => assertIncludes(mobilePosSync, token, 'Mobile POS sync boundary'));

  assertOrder(
    mobilePosSync,
    [
      'validatePosSyncWebhookUrl(trimmedWebhookUrl)',
      'webhookUrl: normalizedWebhookUrl',
      'const saved = await persistPosSync(nextPosSync);',
    ],
    'Mobile POS URL save validation order',
  );

  [
    'message: data.error',
    'response.text()',
    'webhookUrlLength: webhookUrl.length',
    'providerResponse',
  ].forEach((token) => {
    assertNotIncludes(desktopPosSync, token, `Desktop POS sync raw detail boundary ${token}`);
    assertNotIncludes(mobilePosSync, token, `Mobile POS sync raw detail boundary ${token}`);
  });
}

function verifyDebouncedDeliveryBoundary(eventBuilder) {
  [
    'POS_SYNC_DELIVERY_TRIGGER_FAILED',
    'POS_SYNC_DELIVERY_REQUEST_REJECTED',
    'if (!posSync?.enabled) return;',
    'if (!posSync?.webhookUrl) return;',
    'if (!posSync?.webhookSecret) return;',
    'cache: \'no-store\'',
    'credentials: \'same-origin\'',
    'redirect: \'manual\'',
    'if (!response.ok)',
    'throw createPosSyncDeliveryError(POS_SYNC_DELIVERY_REQUEST_REJECTED, response.status)',
    'logSecurityFailure(',
    "getBoundedSecurityStringContext('storeId', storeId)",
    "getBoundedSecurityStringContext('tenantId', tenantId)",
    "getBoundedSecurityStringContext('projectId', projectId)",
  ].forEach((token) => assertIncludes(eventBuilder, token, 'POS debounced delivery boundary'));

  [
    'createDeliveryJob(storeId, tenantId, projectId).catch(() =>',
    '// Silent failure',
    '// Silent — POS sync failures never surface to the owner',
  ].forEach((token) => assertNotIncludes(eventBuilder, token, 'POS debounced delivery silent failure boundary'));
}

function verifyDeliveryFailureThreshold(deliverRoute, testRoute, posSyncTypes, storeTypes, desktopPosSync, mobilePosSync) {
  [
    'const POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD = 3;',
    'function getConsecutiveFailureCount(value: unknown): number',
    "'posSync.consecutiveFailures': POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD",
    "'posSync.consecutiveFailures': 0",
    'const nextConsecutiveFailures = getConsecutiveFailureCount(posSync?.consecutiveFailures) + 1;',
    'const reachedConnectionIssue = nextConsecutiveFailures >= POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD',
    "|| posSync?.status === 'connection_issue'",
    "'posSync.status': reachedConnectionIssue ? 'connection_issue' : 'healthy'",
    "'posSync.lastError': reachedConnectionIssue ? POS_SYNC_CONNECTION_ISSUE_MESSAGE : ''",
    "'posSync.consecutiveFailures': nextConsecutiveFailures",
  ].forEach((token) => assertIncludes(deliverRoute, token, 'POS delivery failure threshold'));

  assertOrder(
    deliverRoute,
    [
      'const nextConsecutiveFailures = getConsecutiveFailureCount(posSync?.consecutiveFailures) + 1;',
      'const reachedConnectionIssue = nextConsecutiveFailures >= POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD',
      "'posSync.status': reachedConnectionIssue ? 'connection_issue' : 'healthy'",
      "'posSync.lastError': reachedConnectionIssue ? POS_SYNC_CONNECTION_ISSUE_MESSAGE : ''",
      "'posSync.consecutiveFailures': nextConsecutiveFailures",
    ],
    'POS delivery failure threshold order',
  );

  [
    'const POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD = 3;',
    "'posSync.consecutiveFailures': POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD",
    "'posSync.consecutiveFailures': 0",
  ].forEach((token) => assertIncludes(testRoute, token, 'POS test failure counter reset'));

  [
    'consecutiveFailures?: number;',
  ].forEach((token) => {
    assertIncludes(posSyncTypes, token, 'POS shared type failure counter');
    assertIncludes(storeTypes, token, 'Store type failure counter');
  });

  assert(
    countOccurrences(desktopPosSync, "'posSync.consecutiveFailures': 0") >= 3,
    'Desktop POS sync must reset consecutiveFailures on toggle, URL save, and secret rotation',
  );

  [
    'consecutiveFailures: storeDetails?.posSync?.consecutiveFailures ?? 0',
    'const connectionChanged = enabled !== currentPosSync.enabled',
    'consecutiveFailures: enabled && !connectionChanged ? currentPosSync.consecutiveFailures : 0',
    "status: enabled ? (connectionChanged || currentPosSync.status === 'disabled' ? 'healthy' : currentPosSync.status) : 'disabled'",
  ].forEach((token) => assertIncludes(mobilePosSync, token, 'Mobile POS sync failure counter reset'));
}

function verifyMobileShellBoundary(mobileShell, mobileMore, mobileShare) {
  [
    'const handleOpenPosSync = useCallback(() => {',
    "setActiveTab('more');",
    "setMoreScreen('posSync');",
    'setIsMoreRootScreen(false);',
  ].forEach((token) => assertIncludes(mobileShell, token, 'MobileShell POS sync route handler'));

  [
    "const MobilePosSyncScreen = dynamic(() => import('./MobilePosSyncScreen'), { ssr: false });",
    "| 'posSync'",
    'FEATURE_FLAGS.ENABLE_POS_SYNC && canManageIntegrations',
    "onClick: () => openSubScreen('posSync')",
    "if (['integrations', 'posSync'].includes(screen)) return canManageIntegrations;",
    "else if (subScreen === 'posSync') subScreenContent = <MobilePosSyncScreen onBack={() => setSubScreen('main')} />;",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More POS sync shell boundary'));

  [
    "const openMobileMoreSubScreen = useCallback((screen: 'digitalScreens' | 'posSync') => {",
    'router.push(`/dashboard#mobile/more/${screen}`);',
    'if (onOpenPosSync) {',
    'onOpenPosSync();',
    "openMobileMoreSubScreen('posSync');",
  ].forEach((token) => assertIncludes(mobileShare, token, 'Mobile Share POS sync shell handoff'));

  assertNotIncludes(mobileShare, "window.location", 'Mobile Share POS sync must not bypass shell via window.location');
}

function verifyDocs(packageJson, readmeDoc, specDoc, implDoc, mobileDoc, firebaseDoc, auditDoc, changelogDoc, lowercaseChangelogDoc) {
  assert(
    packageJson.scripts?.['verify:pos-sync-boundary'] === 'node scripts/verification/verify-pos-sync-boundary.js',
    'package.json must expose verify:pos-sync-boundary',
  );

  const staleLaunchPattern = /Phase 2|Phase 3|post-launch|future|Future|DEFER|deferred|Deferred|placeholder|Current Phase|Cloud Function deferred|CF deferred|multi-retry/;
  [
    ['POS README', readmeDoc],
    ['POS spec', specDoc],
    ['POS implementation', implDoc],
    ['POS Firebase', firebaseDoc],
  ].forEach(([label, doc]) => assertNotMatches(doc, staleLaunchPattern, `${label} stale launch wording`));

  [
    '3 failed live deliveries in a row',
    'explicit connection-test/configuration failures mark the issue immediately',
  ].forEach((token) => assertIncludes(readmeDoc, token, 'POS README failure threshold docs'));

  [
    'Increment `posSync.consecutiveFailures`',
    'First and second failed live deliveries stay quiet for the owner',
    'Third consecutive failed live delivery',
    'No active retry worker',
  ].forEach((token) => assertIncludes(specDoc, token, 'POS spec failure threshold docs'));

  [
    'POS Sync boundary source gate: `npm run verify:pos-sync-boundary`',
    'source-only and does not call an external POS provider',
    'Target document-ID boundary',
    'normalizePosSyncNumericDocumentId',
    'POS delivery project ID boundary',
    'Delivery failure threshold',
    'First and second failed live deliveries stay owner-quiet',
    'Active docs no longer present Cloud Function delivery/retry workers or `pos_delivery_queue` as current runtime scope',
  ].forEach((token) => assertIncludes(implDoc, token, 'POS implementation boundary docs'));

  [
    'POS Sync boundary source gate: `npm run verify:pos-sync-boundary`',
    'MobileShell More routing',
    'shared URL validator and `/api/pos-sync/test` acknowledgement boundary',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'POS mobile boundary docs'));

  [
    'POS Sync boundary source gate: `npm run verify:pos-sync-boundary`',
    'performs no Firestore reads/writes/deletes',
    'does not call an external POS provider',
    'POS Sync target document-ID boundary',
    'normalizePosSyncNumericDocumentId',
    'POS delivery project ID boundary',
    'Delivery failure threshold',
    'posSync.consecutiveFailures',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'POS Firebase boundary docs'));

  [
    'POS Sync Target Document ID Boundary checkpoint',
    'normalizePosSyncNumericDocumentId',
    'POS Delivery Project ID Boundary checkpoint',
    'POS Sync live-delivery failure-threshold checkpoint',
    'Failed live deliveries one and two are logged',
    'third failed live delivery in a row marks `connection_issue`',
    'active-doc stale wording',
    'POS Sync boundary source gate',
    'verify:pos-sync-boundary',
    'source-only public-HTTPS/DNS/auth/tenant/mobile-shell gate',
    'Real external webhook provider smoke remains pending',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit POS source gate evidence'));

  [
    'POS Sync Target Document ID Boundary',
    'Malformed POS scope fails closed',
    'POS Delivery Project ID Boundary',
    'Malformed project IDs fail during request validation',
  ].forEach((token) => {
    assertIncludes(changelogDoc, token, 'POS changelog project ID boundary');
    assertIncludes(lowercaseChangelogDoc, token, 'POS lowercase changelog project ID boundary');
  });
}

function verifyPosSyncBoundary() {
  const packageJson = JSON.parse(read('package.json'));
  const webhookUrl = read('src/lib/posSync/webhookUrl.ts');
  const serverWebhookTarget = read('src/lib/posSync/serverWebhookTarget.ts');
  const deliverRoute = read('src/app/api/pos-sync/deliver/route.ts');
  const testRoute = read('src/app/api/pos-sync/test/route.ts');
  const desktopPosSync = read('src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx');
  const mobilePosSync = read('src/components/mobile/screens/MobilePosSyncScreen.tsx');
  const testResponse = read('src/lib/posSync/testResponse.ts');
  const eventBuilder = read('src/lib/posSync/eventBuilder.ts');
  const posSyncTypes = read('src/lib/posSync/types.ts');
  const storeTypes = read('src/types/platform/store.ts');
  const mobileShell = read('src/components/mobile/MobileShell.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
  const readmeDoc = read('__docs__/pos-webhook-sync/README.md');
  const specDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_spec.md');
  const implDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_impl.md');
  const mobileDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_mobile-support.md');
  const firebaseDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_firebase.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelogDoc = read('__docs__/CHANGELOG.md');
  const lowercaseChangelogDoc = read('__docs__/changelog.md');

  verifyWebhookUrlGuard(webhookUrl, serverWebhookTarget);
  verifyProtectedPosRoute(deliverRoute, 'POS delivery route boundary', 'pos-deliver:${storeRateLimitHash}');
  verifyDeliveryRoute(deliverRoute);
  verifyProtectedPosRoute(testRoute, 'POS test route boundary', 'pos-test:${storeRateLimitHash}');
  verifyTestRoute(testRoute);
  verifyDesktopAndMobileParity(desktopPosSync, mobilePosSync, testResponse);
  verifyDebouncedDeliveryBoundary(eventBuilder);
  verifyDeliveryFailureThreshold(deliverRoute, testRoute, posSyncTypes, storeTypes, desktopPosSync, mobilePosSync);
  verifyMobileShellBoundary(mobileShell, mobileMore, mobileShare);
  verifyDocs(packageJson, readmeDoc, specDoc, implDoc, mobileDoc, firebaseDoc, auditDoc, changelogDoc, lowercaseChangelogDoc);
}

verifyPosSyncBoundary();
console.log('POS sync boundary verifier passed');
