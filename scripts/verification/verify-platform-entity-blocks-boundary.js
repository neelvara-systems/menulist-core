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
    'const PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES = 64 * 1024;',
    'const TENANT_STORE_BLOCK_BATCH_LIMIT = 450;',
    "entityType: z.enum(['tenant', 'store', 'user'])",
    'reason: z.string().trim().min(1).max(500)',
    'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
    'EntityBlockRequestSchema.safeParse(bodyResult.data)',
    'getSafeZodValidationDetails(validation.error)',
    'buildPlatformBlockDetails({',
    'actorEmail: session?.user?.email',
    'actorUserId: session?.uId || session?.user?.id',
    'syncTenantStoreBlockState(db, tenantId, true)',
    'syncTenantStoreBlockState(db, tenantId, false)',
    'TENANT_STORE_SCOPE_FIELDS',
    'TENANT_STORE_BLOCK_BATCH_LIMIT',
    "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary')",
    'await syncTenantBlockedToStoreDocs(db, directStoreIds, tenantBlocked)',
    'summaryRef.set({',
    'revalidateTag(`menu-store-${storeId}`)',
    'revalidateTag(`store-${storeId}`)',
    "revalidateTag('client-stores')",
    "revalidateTag('screen-data')",
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'platformEntityBlocks')",
    'invalidateOwnerBusinessAssistantPacketCache({',
    'await authAdmin.updateUser(firebaseUser.uid, { disabled: shouldDisable })',
    'await authAdmin.revokeRefreshTokens(firebaseUser.uid)',
    'platform_entity_block_auth_user_missing',
    'authTokensRevokedAt',
    'sessionRevokedAt',
    'sessionRevokedReason = "platform_user_block"',
  ].forEach((token) => assertIncludes(route, token, 'Platform entity-block route'));

  assertOrder(route, [
    'readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES',
    'EntityBlockRequestSchema.safeParse(bodyResult.data)',
    'const docRef = getEntityDocRef(db, entityType, entityId);',
    'const entitySnap = await docRef.get();',
    'buildPlatformBlockDetails({',
  ], 'Platform entity-block route validation order');

  assertOrder(route, [
    "if (entityType === 'store') {",
    'await docRef.update({',
    'modifiedOn,',
    '});',
    'await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(\'storesSummary\').set({',
    '[storeId]: {',
    'await revalidateStorePublicCache(storeId, existingEntity.tenantId);',
  ], 'Store block public-summary/cache update order');

  [
    'request.json()',
    "logger.error('[API /platform/entity-blocks]",
    'console.error',
    'error.message',
    'revalidatePath(',
  ].forEach((token) => assertNotIncludes(route, token, 'Platform entity-block route boundary'));
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

function verifyDocsAndPackage(packageJson, opsDoc, auditDoc) {
  assertIncludes(
    packageJson,
    '"verify:platform-entity-blocks-boundary": "node scripts/verification/verify-platform-entity-blocks-boundary.js"',
    'package.json entity-block verifier',
  );

  [
    'Entity Blocks keeps the same platform-only mutation route',
    'route body cap',
    'Firebase Auth disable/token-revoke handling',
    'public cache invalidation',
    'Business Health packet invalidation',
    'caps response JSON at 64KB',
    'requires `success: true`, a returned entity object, the requested entity ID, and the requested blocked state',
    'Source gate: `npm run verify:platform-entity-blocks-boundary`',
  ].forEach((token) => assertIncludes(opsDoc, token, 'Ops docs entity-block source gate'));

  [
    'Platform entity-block boundary source gate: `npm run verify:platform-entity-blocks-boundary`',
    'source-only tenant/store/user block route, auth sync, public cache invalidation, desktop/mobile, and docs gate',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit entity-block checkpoint'));
}

function verifyPlatformEntityBlocksBoundary() {
  const files = {
    packageJson: read('package.json'),
    route: read('src/app/api/platform/entity-blocks/route.ts'),
    client: read('src/database/platformEntityBlocks/index.ts'),
    helper: read('src/lib/platform/entityBlock.ts'),
    desktop: read('src/components/templates/platform/settings/EntityBlockSettings.tsx'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    mobilePlatformInternal: read('src/components/mobile/screens/MobilePlatformInternalScreen.tsx'),
    opsDoc: read('__docs__/ops-control-room/ops-control-room_impl.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
  };

  verifyRoute(files.route);
  verifyClient(files.client);
  verifySharedBlockHelper(files.helper);
  verifyDesktopSurface(files.desktop);
  verifyMobileSurface(files.mobileShell, files.mobileMore, files.mobilePlatformInternal);
  verifyDocsAndPackage(files.packageJson, files.opsDoc, files.auditDoc);

  console.log('Platform entity-blocks boundary verifier passed');
}

verifyPlatformEntityBlocksBoundary();
