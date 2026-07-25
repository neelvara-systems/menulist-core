const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, tokens, label) {
  for (const token of tokens) {
    assert(source.includes(token), `${label} must include ${token}`);
  }
}

function assertNotIncludes(source, tokens, label) {
  for (const token of tokens) {
    assert(!source.includes(token), `${label} must not include ${token}`);
  }
}

function assertOrder(source, tokens, label) {
  let previous = -1;
  for (const token of tokens) {
    const index = source.indexOf(token);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > previous, `${label} must keep ${token} after the previous checkpoint`);
    previous = index;
  }
}

function handlerSource(route, method) {
  const startToken = `export const ${method} = withAuth`;
  const start = route.indexOf(startToken);
  assert(start >= 0, `Route must include ${startToken}`);
  const nextMethod = route.indexOf('export const ', start + startToken.length);
  return route.slice(start, nextMethod >= 0 ? nextMethod : undefined);
}

const muteRoute = read('src/app/api/ops/mute-alerts/route.ts');
const safeModeRoute = read('src/app/api/ops/safe-mode/route.ts');
const platformRoute = read('src/app/api/ops/platform-notifications/route.ts');
const ownerRoute = read('src/app/api/ops/owner-notifications/route.ts');
const platformTypes = read('src/lib/ops/platformNotificationTypes.ts');
const platformClient = read('src/lib/ops/platformNotificationClientResponse.ts');
const ownerTypes = read('src/lib/ops/ownerNotificationTypes.ts');
const ownerClient = read('src/lib/ops/ownerNotificationClientResponse.ts');
const snapshotBoundary = read('src/lib/ops/notificationOpsSnapshotBoundary.ts');
const alerts = read('src/lib/ops/alerts.ts');
const recipientResolver = read('src/lib/owner-notifications/recipientResolver.ts');
const currentPlatformUser = read('src/lib/auth/currentPlatformUser.ts');
const currentPlatformUserTest = read('scripts/verification/test-current-platform-user.ts');
const firestoreIndexes = read('firestore.indexes.json');
const answerlatticeFirestoreIndexes = read('firestore-answerlattice.indexes.json');
const authGuide = read('__docs__/security/authentication/complete-guide.md');
const opsDoc = read('__docs__/ops-control-room/ops-control-room_impl.md');
const ownerImpl = read('__docs__/owner-notifications/owner-notifications_impl.md');
const ownerFirebase = read('__docs__/owner-notifications/owner-notifications_firebase.md');
const costImpl = read('__docs__/cost-self-protection/cost-self-protection_impl.md');
const packageJson = read('package.json');

for (const [label, source] of [
  ['mute alerts route', muteRoute],
  ['SAFE_MODE route', safeModeRoute],
  ['platform notification route', platformRoute],
  ['owner notification route', ownerRoute],
]) {
  assertIncludes(source, [
    "import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';",
    "requiredPlatformRole: 'PLATFORM'",
    'failClosedOnProviderError: true',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    "return NextResponse.json({ error: 'Forbidden' }, { status: 403 });",
  ], label);
}

assertOrder(muteRoute, [
  'const rateLimit = await checkRateLimit({',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  'readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES',
  'MuteAlertsRequestSchema.safeParse(bodyResult.data)',
  'await opsRef.set(',
], 'mute alerts admission');
assertIncludes(muteRoute, [
  'alertsMutedAt: Timestamp.now()',
  'alertsMutedBy: currentPlatformUser.documentId',
  "status: rateLimit.reason === 'provider_unavailable' ? 503 : 429",
], 'mute alerts current audit fields');

assertOrder(safeModeRoute, [
  'const rateLimit = await checkRateLimit({',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  'readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES',
  'validateAPIInput(SafeModeRequestSchema, bodyResult.data)',
  'await firestoreAdmin.runTransaction(async (transaction) =>',
], 'SAFE_MODE admission and transaction');
assertIncludes(safeModeRoute, [
  'if (currentSafeMode === targetSafeMode) return false;',
  "return NextResponse.json({ success: true, SAFE_MODE: targetSafeMode, changed: false });",
  "logOpsFailure('ops_safe_mode_alert_write_failed'",
  'alertRecorded: Boolean(alertId)',
  'activatedBy: operatorUserId',
  'deactivatedBy: operatorUserId',
], 'SAFE_MODE idempotent transition');
assertNotIncludes(safeModeRoute, [
  "activatedBy: session.user?.email",
], 'SAFE_MODE stored operator PII boundary');

const platformGet = handlerSource(platformRoute, 'GET');
const platformPost = handlerSource(platformRoute, 'POST');
assertOrder(platformGet, [
  'key: `platform-notification-ops-read:${operatorRateLimitHash}`',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  'const recentRows = await getRecentRows({ scanLimit, cost });',
  'buildPlatformNotificationWindow({',
], 'platform notification GET admission');
assertOrder(platformPost, [
  'key: `platform-notification-ops:${operatorRateLimitHash}`',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  'readBoundedJsonBody(request, PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
  "if (validation.data.action === 'acknowledge')",
], 'platform notification POST admission');
assertIncludes(platformRoute, [
  'authReads: 1',
  'countQueries: 0',
  "accessModel: 'current_persisted_platform_user'",
  '.orderBy(\'timestamp\', \'desc\')',
  '.limit(params.scanLimit)',
  'getPlatformAlertScopeValue',
  'actionId: PlatformNotificationActionIdSchema',
  "if (snapshot.data()?.acknowledged === true) return 'replayed';",
  'if (currentData.manualHandoffActionIdHash === actionIdHash)',
  ": 'conflict';",
  'manualHandoffActionIdHash: actionIdHash',
  'documentId: safeActionDocumentId(`manual-alert|${operatorId}|${validation.data.actionId}`)',
], 'platform notification bounded read/DTO boundary');
assertNotIncludes(platformRoute, [
  '.count().get()',
  'acknowledgedBy: data.acknowledgedBy',
], 'platform notification unbounded/private output boundary');
assertIncludes(alerts, [
  'interface CreateAlertOptions',
  'options.documentId',
  'await docRef.create(alertData);',
  'isAlreadyExistsError(error)',
  'return docRef.id;',
], 'platform manual alert idempotent create boundary');

const ownerGet = handlerSource(ownerRoute, 'GET');
const ownerPost = handlerSource(ownerRoute, 'POST');
assertOrder(ownerGet, [
  'key: `owner-notification-ops-read:${operatorRateLimitHash}`',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  'const db = getDbForProduct(productId);',
  'const recentRows = await getRecentEventRows({ db, productId, scanLimit, cost });',
  'buildOwnerNotificationWindow({',
], 'owner notification GET admission');
assertOrder(ownerPost, [
  'key: `owner-notification-ops:${userRateLimitHash}`',
  'const currentPlatformUser = await getCurrentPlatformUser(session);',
  'readBoundedJsonBody(request, OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
  'const db = getDbForProduct(validation.data.productId);',
  "if (validation.data.action === 'retry')",
], 'owner notification POST admission');
assertIncludes(ownerRoute, [
  'authReads: 1',
  'countQueries: 0',
  "accessModel: 'current_persisted_platform_user'",
  '.orderBy(\'updatedAt\', \'desc\')',
  '.limit(params.scanLimit)',
  'params.cost.scopeReads += 1;',
  'if (data.productId !== expectedProductId) return null;',
  'await params.db.runTransaction(async (transaction) =>',
  'transaction.create(deliveryRef',
  'transaction.update(eventRef',
  ".orderBy('createdAt', 'desc')",
  'actionId: OwnerNotificationActionIdSchema',
  "status: notFound ? 404 : 409",
  "status: EVENT_STATUSES.includes(data.status) ? data.status : 'invalid'",
  "const deliveryId = safeId(`manual|${eventId}|${params.actionId}`);",
  'if (!result)',
  "return NextResponse.json({ error: 'Owner notification event not found' }, { status: 404 });",
], 'owner notification bounded/product/atomic boundary');
assertNotIncludes(ownerRoute, [
  '.count().get()',
  'await params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES).doc(deliveryId).set',
], 'owner notification unbounded/partial-write boundary');

for (const [label, source] of [
  ['platform response types', platformTypes],
  ['owner response types', ownerTypes],
]) {
  assertIncludes(source, ['authReads: number', "current_persisted_platform_user"], label);
}
for (const [label, source] of [
  ['platform client response validator', platformClient],
  ['owner client response validator', ownerClient],
]) {
  assertIncludes(source, ['isNonNegativeSafeInteger(value.authReads)', "current_persisted_platform_user"], label);
}
assertNotIncludes(platformTypes + platformClient, ['acknowledgedBy'], 'platform client DTO operator identity boundary');

assertIncludes(snapshotBoundary, [
  'export function buildPlatformNotificationWindow',
  'export function buildOwnerNotificationWindow',
  'counts[row.status] += 1;',
  ".filter((row) => row.productId === params.productId)",
  '.slice(0, params.limit)',
], 'notification ops snapshot behavior');
assertIncludes(recipientResolver, [
  'return { readCount: 0 }',
  '{ readCount: 1, workspaceData }',
  '{ readCount: 1, storeData }',
  '{ readCount: 2, storeData }',
  'email.length <= 254',
], 'owner recipient bounded read/output contract');
assertIncludes(recipientResolver, ['options.onRead?.()'], 'owner recipient partial-read cost accounting');
assertIncludes(currentPlatformUser, [
  'hasValidUnblockedLifecycleState',
  '!hasValidUnblockedLifecycleState(userData)',
  'export const resolveCurrentSessionUserDocumentId = (session: unknown): string | null => {',
  'normalized.every((documentId) => documentId === first)',
  'const sessionUserId = resolveCurrentSessionUserDocumentId(session);',
  'const userDocumentId = resolveCurrentSessionUserDocumentId(sessionRecord);',
], 'current platform malformed lifecycle fail-closed boundary');
assertIncludes(currentPlatformUserTest, [
  "authDisabled: 'true'",
  "deleted: 'true'",
  "blocked: 'true'",
  "blockDetails: { blocked: 'true' }",
  "user: { ...session.user, id: 'platform-user-2' }",
  'contradictory root and nested user aliases must fail closed',
], 'current platform malformed lifecycle regression coverage');
for (const [label, source] of [
  ['MenuList indexes', firestoreIndexes],
  ['Answerlattice indexes', answerlatticeFirestoreIndexes],
]) {
  assertIncludes(source, [
    '"collectionGroup": "ownerNotificationDeliveries"',
    '"fieldPath": "eventId"',
    '"fieldPath": "createdAt"',
    '"order": "DESCENDING"',
  ], `${label} owner detail index`);
}

for (const [label, source, tokens] of [
  ['global auth guide', authGuide, ['Current persisted platform authorization', 'Never fall back to an email query']],
  ['ops docs', opsDoc, ['Current-Authorization And Bounded-Monitor Audit', 'fail-closed per-operator limiter', 'SAFE_MODE transitions are transactional and idempotent']],
  ['owner implementation docs', ownerImpl, ['current persisted platform user', 'Manual handoff transactionally']],
  ['owner Firebase docs', ownerFirebase, ['Current platform-user authorization', '0; derived from the bounded product window']],
  ['cost protection docs', costImpl, ['transactionally reads `ops_config/system`', 'Secondary alert-write failure']],
]) {
  assertIncludes(source, tokens, label);
}
assertIncludes(packageJson, [
  '"verify:ops-current-authorization-boundary"',
  '"test:notification-ops-snapshot-boundary"',
], 'package ops authorization scripts');

console.log('Ops current authorization boundary verifier passed');
