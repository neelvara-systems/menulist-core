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

function verifyWebhookUrlGuard(webhookUrl, serverWebhookTarget, pinnedWebhookRequest) {
  [
    "const BLOCKED_HOSTNAMES = new Set([",
    "'localhost'",
    "'localhost.localdomain'",
    "'0.0.0.0'",
    "if (url.protocol !== 'https:')",
    'if (url.username || url.password)',
    'if (url.hash)',
    'isBlockedHostname(hostname) || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)',
    'BLOCKED_HOSTNAME_SUFFIXES.some',
    'if (first === 0) return true;',
    'if (first === 10) return true;',
    'if (first === 100 && second >= 64 && second <= 127) return true;',
    'if (first === 127) return true;',
    'if (first === 169 && second === 254) return true;',
    'if (first === 172 && second >= 16 && second <= 31) return true;',
    'if (first === 192 && second === 168) return true;',
    'if (first === 192 && second === 0 && octets[2] === 2) return true;',
    'if (first === 198 && second === 51 && octets[2] === 100) return true;',
    'if (first === 203 && second === 0 && octets[2] === 113) return true;',
    'if (first === 198 && (second === 18 || second === 19)) return true;',
    'if (first >= 224) return true;',
    'const segments = parseIpv6Segments(normalized);',
    '(first & 0xfe00) === 0xfc00',
    '(first & 0xffc0) === 0xfe80',
    '(first & 0xff00) === 0xff00',
    'firstSixZero || ipv4Mapped',
    'first === 0x2001 && segments[1] <= 0x01ff',
    'first === 0x2002',
    'first === 0x3fff && segments[1] <= 0x0fff',
    '(first & 0xe000) !== 0x2000',
    'export function isBlockedPosSyncNetworkTarget',
  ].forEach((token) => assertIncludes(webhookUrl, token, 'POS webhook URL guard'));

  [
    "import { lookup } from 'dns/promises';",
    'validatePosSyncWebhookNetworkTarget',
    'lookup(hostname, { all: true, verbatim: true })',
    'isBlockedPosSyncNetworkTarget(hostname)',
    'isBlockedPosSyncNetworkTarget(address.address)',
    'approvedAddresses',
    "error: 'blocked_hostname'",
    "error: 'blocked_resolved_address'",
    "error: 'dns_lookup_failed'",
  ].forEach((token) => assertIncludes(serverWebhookTarget, token, 'POS server DNS target guard'));

  [
    "import { request as httpsRequest } from 'node:https';",
    'createPosSyncPinnedLookup',
    'hostname.toLowerCase()',
    'isBlockedPosSyncNetworkTarget(entry.address)',
    'isIP(entry.address) === entry.family',
    "'Content-Length': String(Buffer.byteLength(params.body, 'utf8'))",
    'lookup: createPosSyncPinnedLookup(hostname, params.approvedAddresses)',
    'agent: false',
    'maxHeaderSize: 16 * 1024',
    'request.setTimeout(params.timeoutMs',
    'response.resume()',
  ].forEach((token) => assertIncludes(pinnedWebhookRequest, token, 'POS pinned HTTPS request boundary'));

  ['fetch(', "redirect: 'follow'"].forEach((token) => (
    assertNotIncludes(pinnedWebhookRequest, token, 'POS pinned HTTPS request boundary')
  ));
}

function verifyProtectedPosRoute(content, label, expectedRateLimitKey) {
  [
    'export const POST = withAuth(async (request, session) => {',
    'FEATURE_FLAGS.ENABLE_POS_SYNC',
    'readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(schema, bodyResult.data)',
    'const tenantScope = normalizePosSyncNumericDocumentId(tenantId);',
    'const storeScope = normalizePosSyncNumericDocumentId(storeId);',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    'hashPublicRateLimitValue(`${tenantDocumentId}:${storeDocumentId}`)',
    expectedRateLimitKey,
    'checkRateLimit({',
    'failClosedOnProviderError: true',
    "rlResult.reason === 'provider_unavailable'",
    'status: providerUnavailable ? 503 : 429',
    "'Retry-After': String(Math.max(Math.ceil((rlResult.resetAt - Date.now()) / 1000), 1))",
    'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);',
    'const storeDoc = await storeRef.get();',
    'requireAnyStorePermissionForStoreData(',
    'validatePosSyncWebhookUrl(String(posSync.webhookUrl))',
    'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
    'networkValidation.approvedAddresses',
    'postPosSyncWebhook({',
    'POS_SYNC_CONNECTION_ISSUE_MESSAGE',
    'logSecurityDiagnostic(',
    'logSecurityFailure(',
    'getBoundedSecurityStringContext',
  ].forEach((token) => assertIncludes(content, token, label));
  assertNotIncludes(content, 'const permissionError = await requireAnyStorePermission(', `${label} redundant pre-limiter permission read`);
  assertNotIncludes(content, 'bodyResult.data as any', `${label} bounded JSON validation boundary`);

  assertOrder(
    content,
    [
      'readBoundedJsonBody(request, POS_SYNC_ACTION_MAX_BODY_BYTES',
      'validateAPIInput(schema, bodyResult.data)',
      'const tenantScope = normalizePosSyncNumericDocumentId(tenantId);',
      'const storeScope = normalizePosSyncNumericDocumentId(storeId);',
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'hashPublicRateLimitValue(`${tenantDocumentId}:${storeDocumentId}`)',
      'checkRateLimit({',
      'admin.firestore()',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);',
      'const storeDoc = await storeRef.get();',
      'requireAnyStorePermissionForStoreData(',
      'validatePosSyncWebhookUrl(String(posSync.webhookUrl))',
      'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
      'postPosSyncWebhook({',
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
    "projectId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/).refine(isValidFirestoreDocumentId, 'Invalid project ID'),",
    'PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.PUBLISH_MENU',
    'const projectRef = db',
    'transaction.get(projectRef)',
    'transaction.get(secretRef)',
    'projectId: projectDoc.id',
    "const deliveryClaim = await db.runTransaction(async (transaction) => {",
    'getNextPosSyncMenuVersion(currentPosSync.menuVersion)',
    'resolvePosSyncSecretInTransaction({',
    'secretVersion: secret.version',
    'normalizePosSyncSecretVersion(currentPosSync.secretVersion) !== deliveryClaim.secretVersion',
    'Buffer.byteLength(rawBody, \'utf8\')',
    "createHash('sha256').update(rawBody).digest('hex')",
    'payloadHash,',
    'resolvePosSyncDeliveryOutcome({',
    "'posSync.lastCompletedMenuVersion': outcome.lastCompletedMenuVersion",
    "collection(DB_COLLECTIONS.POS_DELIVERY_LOGS)",
    'const deliveryLogRef = deliveryLogsRef.doc(deliveryId);',
    'transaction.set(deliveryLogRef, logEntry);',
    "orderBy('sentAt', 'desc')",
    '.limit(POS_SYNC_DELIVERY_LOG_RETENTION_SCAN_LIMIT)',
    'logsSnapshot.docs.slice(POS_SYNC_DELIVERY_LOG_RETENTION_LIMIT)',
    'POS_SYNC_DELIVERY_LOG_RETENTION_FAILED',
    'getPosSyncDeliveryHttpStatus',
    "{ status: getPosSyncDeliveryHttpStatus(success ? 'success' : deliveryStatus) }",
  ].forEach((token) => assertIncludes(deliverRoute, token, 'POS delivery route boundary'));
  assertNotIncludes(deliverRoute, '.offset(20)', 'POS delivery retention unbounded offset query');
  assertNotIncludes(deliverRoute, '.add(logEntry)', 'POS delivery non-atomic log write');
  assertNotIncludes(deliverRoute, 'as Project', 'POS delivery persisted project input must remain runtime-projected rather than cast');
  assertNotIncludes(deliverRoute, 'return NextResponse.json({\n            success,', 'POS delivery must not return an unconditional 200 after an upstream failure');

  assertOrder(
    deliverRoute,
    [
      'validatePosSyncWebhookNetworkTarget(webhookValidation.normalizedUrl)',
      'const projectRef = db',
      'const deliveryClaim = await db.runTransaction(async (transaction) => {',
      'transaction.get(projectRef)',
      'buildMenuSnapshot(',
      'postPosSyncWebhook({',
    ],
    'POS delivery outbound order',
  );

  assertNotIncludes(
    deliverRoute,
    'projectId: z.string().trim()',
    'POS delivery route must not trim project IDs before validation',
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
    'const connectionClaim = await db.runTransaction(async (transaction) => {',
    'transaction.get(secretRef)',
    'resolvePosSyncSecretInTransaction({',
    'buildTestPayload(storeId, tenantId, connectionClaim.currency)',
    'signPayload(rawBody, connectionClaim.secret, timestamp)',
    'postPosSyncWebhook({',
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
      'const connectionClaim = await db.runTransaction(async (transaction) => {',
      'const testPayload = buildTestPayload(storeId, tenantId, connectionClaim.currency);',
      'postPosSyncWebhook({',
    ],
    'POS test outbound order',
  );
}

function verifyDesktopAndMobileParity(desktopPosSync, mobilePosSync, testResponse, secretResponse) {
  [
    'export const POS_SYNC_TEST_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'export const POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES = 16 * 1024;',
    'isSuccessfulPosSyncTestResponse',
  ].forEach((token) => assertIncludes(testResponse, token, 'POS shared test response policy'));

  [
    'export const POS_SYNC_SECRET_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'POS_SYNC_SECRET_RESPONSE_JSON_MAX_BYTES = 4 * 1024',
    "action: 'ensure' | 'read' | 'rotate'",
    'readJsonResponseWithLimit<unknown>',
  ].forEach((token) => assertIncludes(secretResponse, token, 'POS shared secret response boundary'));

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
    "requestPosSyncSecret({ action: 'read', storeId, tenantId })",
    "requestPosSyncSecret({ action: 'ensure', storeId, tenantId })",
    "requestPosSyncSecret({ action: 'rotate', storeId, tenantId })",
    'disabled={!webhookUrl.trim() || !webhookSecret || secretLoading}',
  ].forEach((token) => assertIncludes(desktopPosSync, token, 'Desktop POS sync boundary'));
  assertNotIncludes(desktopPosSync, "updates['posSync.webhookSecret']", 'Desktop POS sync client secret persistence');

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
    "action: 'read'",
    "action: 'ensure'",
    "action: 'rotate'",
    'disabled={!enabled || !webhookUrl.trim() || !webhookSecret || secretLoading}',
  ].forEach((token) => assertIncludes(mobilePosSync, token, 'Mobile POS sync boundary'));
  assertNotIncludes(mobilePosSync, 'webhookSecret: storeDetails?.posSync?.webhookSecret', 'Mobile POS sync client secret hydration');
  assertNotIncludes(mobilePosSync, 'webhookSecret,\n            consecutiveFailures', 'Mobile POS sync client secret persistence');

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

function verifyDebouncedDeliveryBoundary(eventBuilder, projectDal, platformProvider, editor) {
  [
    'POS_SYNC_DELIVERY_TRIGGER_FAILED',
    'POS_SYNC_DELIVERY_REQUEST_REJECTED',
    'if (!posSync?.enabled) return;',
    'if (!posSync?.webhookUrl) return;',
    'cache: \'no-store\'',
    'credentials: \'same-origin\'',
    'redirect: \'manual\'',
    'if (!response.ok)',
    'throw createPosSyncDeliveryError(POS_SYNC_DELIVERY_REQUEST_REJECTED, response.status)',
    'logSecurityFailure(',
    "getBoundedSecurityStringContext('storeId', storeId)",
    "getBoundedSecurityStringContext('tenantId', tenantId)",
    "getBoundedSecurityStringContext('projectId', projectId)",
    'const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();',
    'getPosSyncDebounceKey(storeId, tenantId, projectId)',
    'const registeredConfigs = new Map<string, PosSyncConfig>();',
    'export function registerPosSyncDeliveryConfig',
    'export function unregisterPosSyncDeliveryConfig',
    'export function triggerPosSyncForAcknowledgedProjectSave',
    'registeredConfigs.get(getPosSyncStoreKey(storeId, tenantId))',
    'debounceTimers.get(debounceKey)',
    'debounceTimers.set(debounceKey, timer)',
    'debounceTimers.clear()',
  ].forEach((token) => assertIncludes(eventBuilder, token, 'POS debounced delivery boundary'));
  assertNotIncludes(eventBuilder, 'if (!posSync?.webhookSecret) return;', 'POS debounced delivery client secret dependency');

  [
    'createDeliveryJob(storeId, tenantId, projectId).catch(() =>',
    '// Silent failure',
    '// Silent — POS sync failures never surface to the owner',
  ].forEach((token) => assertNotIncludes(eventBuilder, token, 'POS debounced delivery silent failure boundary'));

  [
    'registerPosSyncDeliveryConfig(storeId, tenantId, contextData.storeDetails?.posSync)',
    'return () => unregisterPosSyncDeliveryConfig(storeId, tenantId);',
  ].forEach((token) => assertIncludes(platformProvider, token, 'POS loaded-store integration registration'));
  assertIncludes(
    platformProvider,
    '<PlatformGlobalDataContext.Provider value={contextData} >',
    'Platform global context must expose the current session-scoped value without an effect-delayed mirror',
  );
  assertNotIncludes(
    platformProvider,
    'setContextState(contextData)',
    'Platform global context must not retain the previous tenant/store scope for one render',
  );
  assertIncludes(projectDal, 'import { triggerPosSyncForAcknowledgedProjectSave }', 'Project DAL POS trigger import');
  assert(
    countOccurrences(projectDal, 'triggerPosSyncForAcknowledgedProjectSave(') >= 2,
    'Project DAL must trigger POS sync after standalone and linked-outlet acknowledged saves',
  );
  assertNotIncludes(editor, 'triggerPosSyncDebounced(', 'Editor must not own the POS mutation trigger');
}

function verifyDeliveryFailureThreshold(deliverRoute, testRoute, deliveryState, posSyncTypes, storeTypes, desktopPosSync, mobilePosSync, secretRoute) {
  [
    'resolvePosSyncDeliveryOutcome({',
    'currentConsecutiveFailures: currentPosSync.consecutiveFailures',
    'currentLastCompletedMenuVersion: currentPosSync.lastCompletedMenuVersion',
    'if (!outcome) return;',
    "'posSync.consecutiveFailures': POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD",
    "'posSync.status': outcome.status",
    "'posSync.lastError': outcome.lastError",
    "'posSync.consecutiveFailures': outcome.consecutiveFailures",
    "'posSync.lastCompletedMenuVersion': outcome.lastCompletedMenuVersion",
  ].forEach((token) => assertIncludes(deliverRoute, token, 'POS delivery failure threshold'));

  [
    'export const POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD = 3;',
    'getNextPosSyncMenuVersion',
    'resolvePosSyncDeliveryOutcome',
    'params.menuVersion <= getNonnegativeSafeInteger(params.currentLastCompletedMenuVersion)',
    'Math.min(',
    "params.currentStatus === 'connection_issue'",
  ].forEach((token) => assertIncludes(deliveryState, token, 'POS delivery state boundary'));

  [
    'const POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD = 3;',
    "'posSync.consecutiveFailures': POS_SYNC_CONNECTION_ISSUE_FAILURE_THRESHOLD",
    "'posSync.consecutiveFailures': 0",
  ].forEach((token) => assertIncludes(testRoute, token, 'POS test failure counter reset'));

  [
    'consecutiveFailures?: number;',
    'lastCompletedMenuVersion?: number;',
  ].forEach((token) => {
    assertIncludes(posSyncTypes, token, 'POS shared type failure counter');
    assertIncludes(storeTypes, token, 'Store type failure counter');
  });

  assert(
    countOccurrences(desktopPosSync, "'posSync.consecutiveFailures': 0") >= 2,
    'Desktop POS sync must reset consecutiveFailures on toggle and URL save',
  );
  assertIncludes(secretRoute, "'posSync.consecutiveFailures': 0", 'POS secret rotation failure-counter reset');

  [
    'consecutiveFailures: storeDetails?.posSync?.consecutiveFailures ?? 0',
    'const connectionChanged = enabled !== currentPosSync.enabled',
    'consecutiveFailures: enabled && !connectionChanged ? currentPosSync.consecutiveFailures : 0',
    "status: enabled ? (connectionChanged || currentPosSync.status === 'disabled' ? 'healthy' : currentPosSync.status) : 'disabled'",
  ].forEach((token) => assertIncludes(mobilePosSync, token, 'Mobile POS sync failure counter reset'));
}

function verifyServerOwnedSecretBoundary(secretRoute, secretStore, firestoreRules, databaseConstants, posSyncTypes, storeTypes) {
  [
    "export const GET = withAuth(async (request: NextRequest, session) => {",
    "export const POST = withAuth(async (request: NextRequest, session) => {",
    "action: z.enum(['ensure', 'rotate'])",
    'verifyTenantAccess(session, tenantScope.numericId, storeScope.numericId, request)',
    'const sessionScope = resolveStorePermissionSessionScope(session);',
    'sessionScope.tenantScope.numericId !== tenantScope.numericId',
    'sessionScope.storeScope.numericId !== storeScope.numericId',
    'const actorId = resolveCurrentSessionUserDocumentId(session);',
    '`${actorId}:${tenantScope.documentId}:${storeScope.documentId}:${action}`',
    'failClosedOnProviderError: true',
    'requireAnyStorePermissionForStoreData(',
    '[PERMISSIONS.MANAGE_INTEGRATIONS]',
    'getPosSyncSecretRef(db, tenantScope.documentId, storeScope.documentId)',
    'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);',
    'transaction.get(tenantRef)',
    'isPosSyncSecretScopeCurrent({',
    'resolvePosSyncSecretInTransaction({',
    "migrate: action !== 'rotate'",
    "'posSync.webhookSecret': admin.firestore.FieldValue.delete()",
    "'posSync.secretVersion': nextVersion",
    'generateWebhookSecret()',
    "'Cache-Control': 'private, no-store'",
  ].forEach((token) => assertIncludes(secretRoute, token, 'POS protected secret route'));

  [
    'export function resolvePosSyncSecretInTransaction',
    'DB_COLLECTIONS.POS_SYNC_SECRETS',
    'projectPosSyncSecretDocument(',
    "migrationSource: serverSecret ? 'server' : 'store.posSync.webhookSecret'",
    "'posSync.webhookSecret': admin.firestore.FieldValue.delete()",
    "'posSync.secretVersion': version",
  ].forEach((token) => assertIncludes(secretStore, token, 'POS server secret store'));
  assertNotIncludes(secretStore, '}, { merge: true });', 'POS secret migration must exact-replace the private document');
  assertIncludes(secretRoute, 'projectPosSyncSecretDocument(', 'POS rotation must project current persisted secret metadata');
  assertNotIncludes(secretRoute, 'secretSnapshot.data()?.createdBy || actorId', 'POS rotation must not trust raw persisted actor metadata');

  [
    'match /posSyncSecrets/{docId}',
    'allow read, write: if false;',
    'preservesPosSyncWebhookSecret(resource.data, request.resource.data)',
    '!hasPosSyncWebhookSecret(request.resource.data)',
  ].forEach((token) => assertIncludes(firestoreRules, token, 'POS secret Firestore boundary'));
  [
    'match /stores/{storeId}/posDeliveryLogs/{deliveryId}',
    'belongsToTenantById(',
    'belongsToStoreById(storeId)',
    'allow write: if false;',
  ].forEach((token) => assertIncludes(firestoreRules, token, 'POS delivery history Firestore boundary'));
  assertIncludes(databaseConstants, 'POS_SYNC_SECRETS: "posSyncSecrets"', 'POS secret collection constant');
  assertIncludes(posSyncTypes, 'webhookSecret?: string;', 'POS legacy secret optional type');
  assertIncludes(posSyncTypes, 'secretVersion?: number;', 'POS secret version type');
  assertIncludes(storeTypes, 'webhookSecret?: string;', 'Store legacy secret optional type');
  assertIncludes(storeTypes, 'secretVersion?: number;', 'Store POS secret version type');
}

function verifyPayloadBoundary(payloadFormatter, posSyncTypes, deliverRoute) {
  [
    'filter((category) => typeof category?.id === \'string\'',
    'filter((item) => (',
    'normalizeLocalizedText',
    'normalizeDecisionFacts',
    'result.icon = cat.icon',
    'result.decisionFacts = decisionFacts',
    'result.allergens = item.allergens.filter(isString)',
    'result.dietaryTags = item.dietaryTags.filter(isString)',
    'result.nutritionInfo = nutritionInfo',
    'result.materials = item.materials',
    'result.warranty = item.warranty',
  ].forEach((token) => assertIncludes(payloadFormatter, token, 'POS public payload boundary'));
  [
    'descriptionSource',
    'ownerBoost',
    'qualityReview',
    'extractionIdAliases',
  ].forEach((token) => assertNotIncludes(payloadFormatter, token, 'POS internal payload field exclusion'));
  [
    'payloadHash: string;',
    'lastCompletedMenuVersion?: number;',
    'decisionFacts?: Record<string, { value?: DecisionFactValue }>;',
    'allergens?: string[];',
    'nutritionInfo?: {',
  ].forEach((token) => assertIncludes(posSyncTypes, token, 'POS payload/log shared type boundary'));
  [
    "const payloadBytes = Buffer.byteLength(rawBody, 'utf8');",
    "const payloadHash = createHash('sha256').update(rawBody).digest('hex');",
    'payloadSize: payloadBytes',
    'payloadHash,',
    'projectId: projectDoc.id',
  ].forEach((token) => assertIncludes(deliverRoute, token, 'POS delivery payload/log boundary'));
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
  assert(
    typeof packageJson.scripts?.['test:pos-sync-boundaries'] === 'string',
    'package.json must expose POS sync behavioral boundaries',
  );

  [
    'the third marks `connection_issue`',
    'An explicit failed test or invalid target marks the issue immediately',
    'Signing secrets are server-owned',
    'Closing the app before the 25-second timer fires can prevent that attempt',
    'Background project writes that do not cross the client project DAL do not create a separate webhook attempt',
    'Provider smoke and coordinated deployment remain release-owner work',
  ].forEach((token) => assertIncludes(readmeDoc, token, 'POS README failure threshold docs'));

  [
    'failure one and two are logged but remain owner-quiet',
    'failure three sets `connection_issue`',
    'one destination per store',
    'Canonical storage: `posSyncSecrets/{tenantId}_{storeId}`',
    'Background server writes that do not cross the client project DAL are not separately emitted',
  ].forEach((token) => assertIncludes(specDoc, token, 'POS spec failure threshold docs'));

  [
    '`resolvePosSyncSecretInTransaction()`',
    '`triggerPosSyncForAcknowledgedProjectSave()`',
    'The editor no longer owns a separate trigger',
    'the current project snapshot, increments `posSync.menuVersion`',
    'Deploying rules before the app would break the previous client-side secret write flow',
    'No unused queue collection or queue type remains in active source',
    'persisted row carrying a contradictory product, tenant, or store identity is',
  ].forEach((token) => assertIncludes(implDoc, token, 'POS implementation boundary docs'));

  [
    'Mobile never hydrates a secret from `storeDetails.posSync.webhookSecret`',
    'Enabling without a secret calls `action: ensure`',
    'Rotation calls `action: rotate`',
    '`npm run test:pos-sync-secret:rules`',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'POS mobile boundary docs'));

  [
    '`posSyncSecrets/{tenantId}_{storeId}`',
    'clients cannot add/change/delete legacy `posSync.webhookSecret`',
    'Typical post-migration path',
    'No Storage bucket, Firestore index, Cloud Function, scheduler, or delivery queue is added',
    'The legacy secret boundary is not safe to deploy ahead of a compatible secret API/UI',
    'Admin readers do not trust the deterministic path alone',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'POS Firebase boundary docs'));

  [
    'POS Sync Target Document ID Boundary checkpoint',
    'normalizePosSyncNumericDocumentId',
    'POS Delivery Project ID Boundary checkpoint',
    'whitespace-mutated `projectId` values',
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
    'Whitespace-mutated POS project IDs fail closed',
  ].forEach((token) => {
    assertIncludes(changelogDoc, token, 'POS changelog project ID boundary');
    assertIncludes(lowercaseChangelogDoc, token, 'POS lowercase changelog project ID boundary');
  });
}

function verifyPosSyncBoundary() {
  const packageJson = JSON.parse(read('package.json'));
  const webhookUrl = read('src/lib/posSync/webhookUrl.ts');
  const serverWebhookTarget = read('src/lib/posSync/serverWebhookTarget.ts');
  const pinnedWebhookRequest = read('src/lib/posSync/pinnedWebhookRequest.ts');
  const deliveryState = read('src/lib/posSync/deliveryState.ts');
  const deliveryHistory = read('src/lib/posSync/deliveryHistory.ts');
  const deliverRoute = read('src/app/api/pos-sync/deliver/route.ts');
  const testRoute = read('src/app/api/pos-sync/test/route.ts');
  const desktopPosSync = read('src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx');
  const mobilePosSync = read('src/components/mobile/screens/MobilePosSyncScreen.tsx');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const testResponse = read('src/lib/posSync/testResponse.ts');
  const secretResponse = read('src/lib/posSync/secretResponse.ts');
  const secretStore = read('src/lib/posSync/serverSecretStore.ts');
  const secretScope = read('src/lib/posSync/secretScope.ts');
  const secretRoute = read('src/app/api/pos-sync/secret/route.ts');
  const firestoreRules = read('firestore.rules');
  const databaseConstants = read('src/constants/database.ts');
  const eventBuilder = read('src/lib/posSync/eventBuilder.ts');
  const payloadFormatter = read('src/lib/posSync/payloadFormatter.ts');
  const posSyncTypes = read('src/lib/posSync/types.ts');
  const storeTypes = read('src/types/platform/store.ts');
  const mobileShell = read('src/components/mobile/MobileShell.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
  const projectDal = read('src/database/projects/index.ts');
  const platformProvider = read('src/providers/platformProviders/platformGlobalDataProvider.tsx');
  const editor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
  const readmeDoc = read('__docs__/pos-webhook-sync/README.md');
  const specDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_spec.md');
  const implDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_impl.md');
  const mobileDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_mobile-support.md');
  const firebaseDoc = read('__docs__/pos-webhook-sync/pos-webhook-sync_firebase.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelogDoc = read('__docs__/changelog.md');
  const lowercaseChangelogDoc = read('__docs__/changelog.md');

  verifyWebhookUrlGuard(webhookUrl, serverWebhookTarget, pinnedWebhookRequest);
  verifyProtectedPosRoute(deliverRoute, 'POS delivery route boundary', 'pos-deliver:${storeRateLimitHash}');
  verifyDeliveryRoute(deliverRoute);
  verifyProtectedPosRoute(testRoute, 'POS test route boundary', 'pos-test:${storeRateLimitHash}');
  verifyTestRoute(testRoute);
  verifyDesktopAndMobileParity(desktopPosSync, mobilePosSync, testResponse, secretResponse);
  [
    [desktopPosSync, 'Desktop POS sync enable control'],
    [mobilePosSync, 'Mobile POS sync enable control'],
  ].forEach(([source, label]) => assertIncludes(source, "aria-label={t('enablePosSync')}", label));
  verifyDebouncedDeliveryBoundary(eventBuilder, projectDal, platformProvider, editor);
  verifyDeliveryFailureThreshold(deliverRoute, testRoute, deliveryState, posSyncTypes, storeTypes, desktopPosSync, mobilePosSync, secretRoute);
  verifyServerOwnedSecretBoundary(secretRoute, secretStore, firestoreRules, databaseConstants, posSyncTypes, storeTypes);
  [
    'resolvePosSyncNumericDocumentIdAliases([',
    'store.tenantId,',
    'store.tId,',
    'persistedTenant?.documentId === params.tenantDocumentId',
    '!isUnavailable(store)',
    '!isUnavailable(tenant)',
    'isPlatformEntityBlocked(entity)',
  ].forEach((token) => assertIncludes(secretScope, token, 'POS secret transaction-current tenant/store scope'));
  [
    'parsePosDeliveryHistoryEntry',
    'storedDeliveryId !== documentId',
    'DELIVERY_STATUSES.has',
    'payload hashes, payload sizes',
  ].forEach((token) => assertIncludes(deliveryHistory, token, 'POS delivery history public projection'));
  [
    'parsePosDeliveryHistoryEntry(document.id, document.data())',
    'desktop_pos_sync_delivery_history_invalid_rows',
    'createLatestRequestGuard',
    'deliveryHistoryRequestGuardRef.current!.isCurrent(requestId)',
    'posSyncScopeKeyRef.current !== requestScopeKey',
    'deliveryEntriesScopeKey === posSyncScopeKey',
    'dataSource={visibleDeliveryEntries}',
    'componentActiveRef.current',
  ].forEach((token) => assertIncludes(desktopPosSync, token, 'POS delivery history consumer'));
  [
    'connectionTestRequestGuardRef.current!.isCurrent(requestId)',
    'return <MobilePosSyncScreenContent key={scopeKey} {...props} />;',
    "String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')",
    "String(previous?.storeId ?? '') !== String(expectedStoreId)",
    'componentActiveRef.current',
  ].forEach((token) => assertIncludes(mobilePosSync, token, 'Mobile POS tenant/store settlement guard'));
  [
    'key={`${String(storeDetails?.tenantId ?? \'\')}:${String(storeDetails?.storeId ?? \'\')}`}',
    "String(previous?.tenantId ?? '') !== String(expectedTenantId ?? '')",
    "String(previous?.storeId ?? '') !== String(expectedStoreId ?? '')",
  ].forEach((token) => assertIncludes(businessSettings, token, 'Desktop POS tenant/store settlement guard'));
  verifyPayloadBoundary(payloadFormatter, posSyncTypes, deliverRoute);
  verifyMobileShellBoundary(mobileShell, mobileMore, mobileShare);
  verifyDocs(packageJson, readmeDoc, specDoc, implDoc, mobileDoc, firebaseDoc, auditDoc, changelogDoc, lowercaseChangelogDoc);
}

verifyPosSyncBoundary();
console.log('POS sync boundary verifier passed');
