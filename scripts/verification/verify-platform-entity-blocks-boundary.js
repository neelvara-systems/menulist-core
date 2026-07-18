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

function verifyRoute(route) {
  [
    'withPlatformAuth(async (request: NextRequest, session) =>',
    '!FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS',
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'import { logger } from "@lib/monitoring/logger";',
    'import { checkRateLimit } from "@lib/rateLimit";',
    'import { getRateLimitForFeature } from "@lib/rateLimit/configs";',
    'import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";',
    'import { hashPublicRateLimitValue } from "src/middleware/publicApi";',
    'const PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES = 64 * 1024;',
    "const PLATFORM_ENTITY_BLOCK_RATE_LIMIT_KEY = 'platform-entity-block';",
    'const MAX_TENANT_BLOCK_STORES = 200;',
    'const TENANT_BLOCK_EFFECT_CHUNK_SIZE = 20;',
    "const PLATFORM_ENTITY_BLOCK_SCOPE_CONFLICT = 'platform_entity_block_scope_conflict';",
    'type PlatformEntityBlockDocumentScope = {',
    'function normalizePlatformEntityBlockDocumentId(value: string | number | undefined | null): PlatformEntityBlockDocumentScope | null {',
    'value === value.trim() && isValidFirestoreDocumentId(value)',
    'typeof value !== \'number\' || !Number.isSafeInteger(value) || value <= 0',
    'function normalizePlatformEntityBlockNumericDocumentId(value: string | number | undefined | null): PlatformEntityBlockDocumentScope | null {',
    'String(numericId) !== scope.documentId',
    'function normalizePlatformEntityBlockTargetDocumentId(',
    "if (entityType === 'tenant' || entityType === 'store')",
    'function getPlatformEntityBlockOperatorId(session: any): string {',
    'z.string().min(1).max(160),',
    'z.number().finite(),',
    "entityType: z.enum(['tenant', 'store', 'user'])",
    'reason: z.string().trim().min(1).max(500)',
    '}).superRefine((value, ctx) => {',
    "message: 'Invalid entity ID'",
    'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
    "getRateLimitForFeature('PLATFORM_ENTITY_BLOCK_MUTATION')",
    'hashPublicRateLimitValue(getPlatformEntityBlockOperatorId(session))',
    'key: `${PLATFORM_ENTITY_BLOCK_RATE_LIMIT_KEY}:${operatorRateLimitHash}`',
    'failClosedOnProviderError: true',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    "Authorization Failed - Platform Entity Blocks Current Role",
    "logger.security('Rate Limit Exceeded - Platform Entity Blocks'",
    'getBoundedSecurityRouteContext(session, request)',
    "'X-RateLimit-Limit'",
    'EntityBlockRequestSchema.safeParse(bodyResult.data)',
    'const entityScope = normalizePlatformEntityBlockTargetDocumentId(entityType, entityId);',
    'const docRef = getEntityDocRef(db, entityType, entityScope.documentId);',
    'getSafeZodValidationDetails(validation.error)',
    'buildPlatformBlockDetails({',
    'actorEmail: session?.user?.email',
    'actorUserId: session?.uId || session?.user?.id',
    'const tenantScope = entityScope;',
    'async function updateTenantBlockStateAtomically({',
    'return db.runTransaction(async (transaction) => {',
    'transaction.get(docRef)',
    'transaction.get(summaryRef)',
    '...storeQueries.map((query) => transaction.get(query))',
    'TENANT_STORE_SCOPE_FIELDS',
    'MAX_TENANT_BLOCK_STORES',
    'hasExactStoredEntityIdentity(tenant, \'tenantId\', tenantScope)',
    'hasExactTenantOwnership(storeData, tenantScope)',
    'normalizePlatformEntityBlockTargetDocumentId(\'store\', store.id)',
    "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary')",
    'transaction.update(docRef, { blocked, blockDetails });',
    'transaction.update(store.ref, {',
    'tenantBlocked: blocked,',
    'transaction.set(summaryRef, {',
    'affectedStoreIds.length > MAX_TENANT_BLOCK_STORES',
    'const result = await updateTenantBlockStateAtomically({',
    'runStorePublicTruthPostCommitEffects({',
    'chunkSize: TENANT_BLOCK_EFFECT_CHUNK_SIZE',
    'storeIds: result.affectedStoreIds.map(String)',
    'revalidate: (tag) => revalidateTag(tag)',
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'platformEntityBlocks')",
    'platform_entity_block_tenant_post_commit_effect_failed',
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
    'const storeScope = entityScope;',
    'const freshStoreSnap = await transaction.get(docRef);',
    "hasExactStoredEntityIdentity(freshStore, 'storeId', storeScope)",
    'transaction.set(summaryRef, {',
    'storeIds: [storeScope.documentId]',
    'platform_entity_block_store_post_commit_effect_failed',
    'const USER_AUTH_RECONCILIATION_MAX_ATTEMPTS = 5;',
    'const USER_AUTH_SYNC_LEASE_MS = 2 * 60 * 1000;',
    'await authAdmin.updateUser(firebaseUser.uid, { disabled: desiredDisabled })',
    'await authAdmin.revokeRefreshTokens(firebaseUser.uid)',
    'platform_entity_block_auth_user_missing',
    'async function reconcileUserBlockAuthState({',
    'const revision = typeof user.authSyncRevision === \'string\' ? user.authSyncRevision : \'\';',
    'const authSync = await syncUserBlockAuthState({',
    'freshUser.authSyncRevision !== revision',
    'authSyncPending: admin.firestore.FieldValue.delete()',
    'authSyncStatus: authSync.status',
    'superseded: revision !== requestedOperationId',
    'const operationId = randomUUID();',
    'hasActiveUserAuthSyncLease(freshUser, now.toMillis())',
    'authSyncPending: {',
    'leaseExpiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + USER_AUTH_SYNC_LEASE_MS)',
    'authSyncRevision: operationId',
    "authSyncStatus: 'pending'",
    'const reconciled = await reconcileUserBlockAuthState({',
    'platform_entity_block_user_update_superseded',
    'await markUserAuthSyncFailed(db, docRef, operationId);',
    "authSyncStatus: 'failed'",
    'authTokensRevokedAt',
    'sessionRevokedAt',
    "updateData.sessionRevokedReason = 'platform_user_block'",
    'prepareStaffAccessStateScope(db, entitySnap.data() || {})',
    'readStaffAccessStateInTransaction(transaction, db, staffAccessScope)',
    'writeStaffBlockedAccessStateInTransaction(',
  ].forEach((token) => assertIncludes(route, token, 'Platform entity-block route'));

  assertOrder(route, [
    '!FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS',
    "const rateLimitConfig = getRateLimitForFeature('PLATFORM_ENTITY_BLOCK_MUTATION');",
    'const operatorRateLimitHash = hashPublicRateLimitValue(getPlatformEntityBlockOperatorId(session));',
    'const rateLimit = await checkRateLimit({',
    'if (!rateLimit.allowed) {',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
  ], 'Platform entity-block route rate-limit before body order');

  assertOrder(route, [
    'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
    'EntityBlockRequestSchema.safeParse(bodyResult.data)',
    'const entityScope = normalizePlatformEntityBlockTargetDocumentId(entityType, entityId);',
    'const docRef = getEntityDocRef(db, entityType, entityScope.documentId);',
    'const entitySnap = await docRef.get();',
    'buildPlatformBlockDetails({',
  ], 'Platform entity-block route validation order');

  assertOrder(route, [
    "if (entityType === 'store') {",
    'const result = await db.runTransaction(async (transaction) => {',
    'const freshStoreSnap = await transaction.get(docRef);',
    'transaction.update(docRef, { blocked, blockDetails, modifiedOn });',
    'transaction.set(summaryRef, {',
    'committed = true;',
    'storeIds: [storeScope.documentId]',
  ], 'Store block public-summary/cache update order');

  assertOrder(route, [
    'const operationId = randomUUID();',
    'const started = await db.runTransaction(async (transaction) => {',
    'readStaffAccessStateInTransaction(transaction, db, staffAccessScope)',
    'const freshUserSnap = await transaction.get(docRef);',
    'if (hasActiveUserAuthSyncLease(freshUser, now.toMillis())) {',
    'authSyncRevision: operationId,',
    'writeStaffBlockedAccessStateInTransaction(',
    'transaction.update(docRef, updateData);',
    'committed = true;',
    'const reconciled = await reconcileUserBlockAuthState({',
    'if (reconciled.superseded) {',
  ], 'User block Firestore authority before provider reconciliation order');

  [
    'request.json()',
    "logger.error('[API /platform/entity-blocks]",
    'console.error',
    'error.message',
    'revalidatePath(',
    "z.string().trim().min(1).max(160).refine((value) => !value.includes('/'))",
    "z.string().trim().min(1).max(160).refine(isValidFirestoreDocumentId, 'Invalid entity ID')",
    'getEntityDocRef(db, entityType, entityId)',
    'syncTenantStoreBlockState(db, tenantId',
    'db.batch()',
    'batch.update(',
    "normalizePlatformEntityBlockTargetDocumentId('tenant', existingEntity.tenantId) || entityScope",
    "normalizePlatformEntityBlockTargetDocumentId('store', existingEntity.storeId) || entityScope",
    'await docRef.update(updateData)',
    'const authSync = await syncUserBlockAuthState({\n        blocked,',
    'key: `platform-entity-block:${getPlatformEntityBlockOperatorId(session)}`',
    'key: `platform-entity-block:${session',
  ].forEach((token) => assertNotIncludes(route, token, 'Platform entity-block route boundary'));
}

function verifyRateLimitConfig(configs) {
  [
    'PLATFORM_ENTITY_BLOCK_MUTATION: {',
    'limit: 20,',
    'window: 3600,',
    "description: 'Platform entity block mutation - 20 per hour per platform operator'",
    'POST /api/platform/entity-blocks',
    'Firebase Auth',
    'public cache invalidation',
  ].forEach((token) => assertIncludes(configs, token, 'Platform entity-block rate limit config'));
}

function verifyClient(client) {
  [
    'PLATFORM_ENTITY_BLOCK_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'const PLATFORM_ENTITY_BLOCK_FAILED_MESSAGE = \'Could not update block status\'',
    'readJsonResponseWithLimit<unknown>',
    'PLATFORM_ENTITY_BLOCK_RESPONSE_JSON_MAX_BYTES',
    "fetch('/api/platform/entity-blocks'",
    '...PLATFORM_ENTITY_BLOCK_REQUEST_POLICY',
    'value.success !== true',
    'value.entity.blocked === expected.blocked',
    'String(getResponseEntityId(expected.entityType, value.entity)) === String(expected.entityId)',
    'platform_entity_block_response_parse_failed',
    'platform_entity_block_response_rejected',
    'platform_entity_block_response_invalid',
    'getBoundedRuntimeStringContext(\'entityId\', entityId)',
    'error.code = code.slice(0, 64)',
    'error.status = response.status',
  ].forEach((token) => assertIncludes(client, token, 'Platform entity-block client'));

  assertOrder(client, [
    "const response = await fetch('/api/platform/entity-blocks'",
    'const payload = await readPlatformEntityBlockResponseJson(response, responseContext);',
    'if (!response.ok) {',
    'if (!isPlatformEntityBlockResponse(payload, responseContext)) {',
    'return payload.entity;',
  ], 'Platform entity-block client response order');

  [
    'response.json()',
    '.json().catch',
    'error.message',
    'await navigator.clipboard.writeText',
  ].forEach((token) => assertNotIncludes(client, token, 'Platform entity-block client boundary'));
}

function verifySharedBlockHelper(helper) {
  [
    'entity?.blocked === true',
    'entity?.tenantBlocked === true',
    'entity?.blockDetails?.blocked === true',
    'reason.trim()',
    "source: 'platform_settings' as const",
    'blockedAt: now',
    'blockedByEmail: actorEmail',
    'blockedByUserId: actorUserId',
    'unblockedReason: trimmedReason',
    'unblockedAt: now',
  ].forEach((token) => assertIncludes(helper, token, 'Platform entity-block helper'));
}

function verifyDesktopSurface(component) {
  [
    'FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS',
    'session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE',
    'getAllTenants().then',
    'getStoresSummary().then',
    'getUserByTenantId(String(tenantId)).then',
    'getStoreById(Number(entityId)).then',
    'return entity?.blocked === true || entity?.blockDetails?.blocked === true;',
    "return <Tag color=\"warning\">Blocked by tenant</Tag>",
    'const trimmedReason = reason.trim();',
    "message.warning('Add a reason before saving')",
    'updatePlatformEntityBlockState({',
    'blocked: nextBlockedState',
    'entity: selectedEntity',
    'entityId: selectedEntityId',
    'entityType,',
    'reason: trimmedReason',
    "message.success(nextBlockedState ? 'Entity blocked' : 'Entity unblocked')",
    "message.error('Could not update block status')",
    'Only platform administrators can manage entity blocks.',
  ].forEach((token) => assertIncludes(component, token, 'Entity Blocks desktop settings'));

  [
    "fetch('/api/platform/entity-blocks'",
    'response.json()',
    '.json().catch',
    'error.message',
  ].forEach((token) => assertNotIncludes(component, token, 'Entity Blocks desktop settings boundary'));
}

function verifyPlatformUserScopeReader(usersDal) {
  [
    'const PLATFORM_USER_SCOPE_QUERY_LIMIT = 500;',
    'const numericScopeId = normalizePlatformUserScopeId(scopeId, field === "tenantId");',
    'const pattern = allowZero ? /^(0|[1-9]\\d*)$/ : /^[1-9]\\d*$/;',
    'const values: Array<number | string> = [numericScopeId, String(numericScopeId)];',
    'limit(PLATFORM_USER_SCOPE_QUERY_LIMIT + 1)',
    'const users = new Map<string, PlatformUserRecord>();',
    'normalizePlatformUserScopeId(data.tenantId, true) === numericScopeId',
    'data.storeIds.some((storeId: unknown) => normalizeStoreSwitchStoreId(storeId) === numericScopeId)',
    'if (users.size > PLATFORM_USER_SCOPE_QUERY_LIMIT) throw new Error("PLATFORM_USER_SCOPE_LIMIT_EXCEEDED");',
    'users.set(userDoc.id, {',
    'throw new Error("INVALID_PLATFORM_USER_DOCUMENT_ID");',
  ].forEach((token) => assertIncludes(usersDal, token, 'Platform user scope reader'));
  assertNotIncludes(usersDal, 'users.set(userDoc.id, { ...data', 'Platform user scope reader private-field projection');
  assertNotIncludes(usersDal, 'where("tenantId", "==", tenantId)', 'Platform user numeric/string compatibility reader');
  ['export const addPlatformUser', 'export const addStoreToUser', 'export const getAllPlatformUsers', 'export const getUsersByStoreId']
    .forEach((token) => assertNotIncludes(usersDal, token, 'Unused unsafe platform user DAL surface'));
}

function verifyMobileSurface(mobileShell, mobileMore, mobilePlatformInternal) {
  [
    "'/platform/entity-blocks': 'entityBlocks'",
  ].forEach((token) => assertIncludes(mobileShell, token, 'Mobile shell entity-block route map'));

  [
    "FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS",
    "key: 'entityBlocks'",
    "label: 'Entity Blocks'",
    "description: 'Block or unblock tenants, stores, and users with audit details.'",
    "onClick: () => openSubScreen('entityBlocks')",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More entity-block entry'));

  [
    "const EntityBlockSettings = dynamic(() => import('@template/platform/settings/EntityBlockSettings')",
    'entityBlocks: {',
    'Component: EntityBlockSettings',
    "surface: 'Entity Blocks'",
    "title: 'Entity Blocks'",
    'minWidth: 0',
  ].forEach((token) => assertIncludes(mobilePlatformInternal, token, 'Mobile platform internal entity-block screen'));
}

function verifyDocsAndPackage(packageJson, opsDoc, auditDoc, changelog, lowercaseChangelog) {
  assertIncludes(
    packageJson,
    '"verify:platform-entity-blocks-boundary": "node scripts/verification/verify-platform-entity-blocks-boundary.js"',
    'package.json entity-block verifier',
  );

  [
    '`/api/platform/entity-blocks`',
    'The following now all re-prove current persisted platform authority',
    'Their privileged read/mutation limiters fail closed on provider outage.',
    'Entity block mutations revalidate tenant/store/user state transactionally',
    'Firebase Auth reconciliation',
    'public cache/screen and Business Health invalidation contracts',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops docs entity-block source gate'));

  [
    '## Internal Ops Control Room And Platform Monitoring - July 16, 2026',
    'Entity Blocks apply fail-closed limiter behavior plus exact current persisted platform-user reauthorization',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit entity-block checkpoint'));

  [
    'Platform Entity Blocks Rate-Limit Boundary',
    'Entity block mutations are rate-limited',
    'Platform Entity Blocks Strict Target Document ID Boundary',
    'Malformed tenant/store/user targets fail closed',
    'Atomic Platform Entity Block Scope',
    'Tenant blocks no longer partially update public block truth',
    'Drifted identity cannot redirect fanout',
    'User access state is durable before provider work',
    'Concurrent user block actions converge to the latest decision',
  ].forEach((token) => {
    assertIncludes(changelog, token, 'Changelog entity-block ID boundary');
    assertIncludes(lowercaseChangelog, token, 'Lowercase changelog entity-block ID boundary');
  });
}

function verifyPlatformEntityBlocksBoundary() {
  const files = {
    packageJson: read('package.json'),
    rateLimitConfigs: read('src/lib/rateLimit/configs.ts'),
    route: read('src/app/api/platform/entity-blocks/route.ts'),
    client: read('src/database/platformEntityBlocks/index.ts'),
    helper: read('src/lib/platform/entityBlock.ts'),
    desktop: read('src/components/templates/platform/settings/EntityBlockSettings.tsx'),
    usersDal: read('src/database/users/index.ts'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    mobilePlatformInternal: read('src/components/mobile/screens/MobilePlatformInternalScreen.tsx'),
    opsDoc: read('__docs__/ops-control-room/ops-control-room_impl.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelog: read('__docs__/changelog.md'),
    lowercaseChangelog: read('__docs__/changelog.md'),
  };

  verifyRoute(files.route);
  verifyRateLimitConfig(files.rateLimitConfigs);
  verifyClient(files.client);
  verifySharedBlockHelper(files.helper);
  verifyDesktopSurface(files.desktop);
  verifyPlatformUserScopeReader(files.usersDal);
  verifyMobileSurface(files.mobileShell, files.mobileMore, files.mobilePlatformInternal);
  verifyDocsAndPackage(files.packageJson, files.opsDoc, files.auditDoc, files.changelog, files.lowercaseChangelog);

  console.log('Platform entity-blocks boundary verifier passed');
}

verifyPlatformEntityBlocksBoundary();
