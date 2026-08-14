#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} missing token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
  }
}

function requireOccurrenceAtLeast(source, token, count, label) {
  const actual = (source.match(new RegExp(escapeRegExp(token), 'g')) || []).length;
  if (actual < count) {
    failures.push(`${label} expected at least ${count} occurrences of ${token}, found ${actual}`);
  }
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    if (index <= previousIndex) {
      failures.push(`${label} token out of order: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const packageJson = read('package.json');
const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
const features = read('src/config/features.ts');
const route = read('src/app/api/store/temp-status/route.ts');
const serverMutationScope = read('src/lib/tempStatus/serverMutationScope.ts');
const postCommitHelper = read('src/lib/cache/storePublicTruthPostCommit.ts');
const statusBoundary = read('src/lib/tempStatus/statusBoundary.ts');
const activeStatusHook = read('src/hooks/useActiveTempStatus.ts');
const publicBusinessApi = read('src/app/api/public/v1/business/route.ts');
const publicBusinessProjection = read('src/lib/publicApi/businessProjection.ts');
const clientResponse = read('src/lib/tempStatus/clientResponse.ts');
const desktopCard = read('src/components/templates/main-app/businessSettings/TempStatusCard.tsx');
const mobileTempStatus = read('src/components/mobile/screens/MobileTempStatusScreen.tsx');
const mobileHours = read('src/components/mobile/screens/MobileHoursScreen.tsx');
const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
const tempStatusBanner = read('src/components/atoms/TempStatusBanner/index.tsx');
const menuPage = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
const feedbackPage = read('src/app/feedback/[projectId]/page.tsx');
const obpResolvedSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
const obpSchema = read('src/app/client/obp/schema.ts');
const clientMenuPage = read('src/app/client/[[...slug]]/page.tsx');
const schema = read('src/lib/schema/index.ts');
const specialMenuLifecycle = read('src/database/projects/specialMenuLifecycle.ts');
const scheduledSpecialMenuLifecycle = read('functions/src/schedulers/specialMenuLifecycle.ts');
const readme = read('__docs__/temp-status-layer/README.md');
const impl = read('__docs__/temp-status-layer/temp-status-layer_impl.md');
const firebaseDoc = read('__docs__/temp-status-layer/temp-status-layer_firebase.md');
const mobileDoc = read('__docs__/temp-status-layer/temp-status-layer_mobile-support.md');
const mobileScreensSpec = read('__docs__/mobile-operational-support/03-mobile-screens-spec.md');
const validationDoc = read('__docs__/temp-status-layer/temp-status-layer_validation.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

requireToken(
  packageJson,
  'scripts/verification/test-temporary-status-boundary.ts',
  'package scripts',
);
requireToken(features, 'ENABLE_TEMP_STATUS: true', 'Temporary Status feature flag');
if (!(firestoreIndexes.fieldOverrides || []).some((entry) => (
  entry.collectionGroup === 'stores'
  && entry.fieldPath === 'tempStatus'
  && Array.isArray(entry.indexes)
  && entry.indexes.length === 0
))) {
  failures.push('stores.tempStatus must stay exempt from unused automatic single-field indexes');
}

[
  "export const dynamic = 'force-dynamic';",
  'export const POST = withAuth(async (request: NextRequest, session) =>',
  'if (!FEATURE_FLAGS.ENABLE_TEMP_STATUS)',
  'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
  'const TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH = 160;',
  'function normalizeSessionDocumentId(value: unknown): string | null',
  'documentId.length <= TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH',
  'isValidFirestoreDocumentId(documentId)',
  'const { tId: rawTenantId, sId: rawStoreId } = session',
  'resolveCurrentSessionUserDocumentId(session)',
  'const tenantId = normalizeSessionDocumentId(rawTenantId);',
  'const storeId = normalizeSessionDocumentId(rawStoreId);',
  'const userId = normalizeSessionDocumentId(resolveCurrentSessionUserDocumentId(session));',
  'const sessionScope = resolveStorePermissionSessionScope(session);',
  'sessionScope.tenantScope.documentId !== tenantId',
  'sessionScope.storeScope.documentId !== storeId',
  'requireAnyStorePermissionForStoreData(',
  'PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_PUBLIC_PRESENCE',
  "getRateLimitForFeature('DATA_WRITE')",
  'failClosedOnProviderError: true',
  'hashPublicRateLimitValue(userId)',
  'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
  'key: `temp-status:${userRateLimitHash}:${storeRateLimitHash}`',
  'const TEMP_STATUS_ACTION_MAX_BODY_BYTES = 4 * 1024;',
  'readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES',
  'RequestSchema.safeParse(body)',
  'expectedStoreId: z.string().trim().min(1).max(TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH)',
  'expectedTenantId: z.string().trim().min(1).max(TEMP_STATUS_SESSION_DOCUMENT_ID_MAX_LENGTH)',
  'const expectedStoreId = normalizeSessionDocumentId(validation.data.expectedStoreId);',
  'const expectedTenantId = normalizeSessionDocumentId(validation.data.expectedTenantId);',
  'if (expectedStoreId !== storeId || expectedTenantId !== tenantId)',
  'new Date(expiresAt).getTime() <= Date.now()',
  'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
  'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);',
  'const transactionPermissionError = await db.runTransaction(async (transaction) => {',
  'transaction.get(storeRef)',
  'transaction.get(tenantRef)',
  'isTempStatusMutationScopeCurrent({',
  'transaction.update(storeRef, storeUpdate);',
  'if (transactionPermissionError) return transactionPermissionError;',
  'createdBy: userId',
  'admin.firestore.FieldValue.delete()',
  'runStorePublicTruthPostCommitEffects({',
  "touchDigitalScreenContentVersionForStoreServer(targetStoreId, 'storeTempStatus')",
  'invalidateOwnerBusinessAssistantPacketCache',
  "logRuntimeFailure('store_temp_status_post_commit_failed'",
  'effectsPending: postCommit.effectsPending, success: true',
  'logRuntimeFailure("store_temp_status_update_failed"',
  '{ error: "Failed to update status" }',
].forEach((token) => requireToken(route, token, 'Temporary Status route'));

requireOrder(
  route,
    [
      'if (!FEATURE_FLAGS.ENABLE_TEMP_STATUS)',
      'const tenantId = normalizeSessionDocumentId(rawTenantId);',
      'const storeId = normalizeSessionDocumentId(rawStoreId);',
      "getRateLimitForFeature('DATA_WRITE')",
    'readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES',
    'RequestSchema.safeParse(body)',
    'if (expectedStoreId !== storeId || expectedTenantId !== tenantId)',
    'db.runTransaction(async (transaction) =>',
    'requireAnyStorePermissionForStoreData(',
    'transaction.update(storeRef, storeUpdate)',
    'runStorePublicTruthPostCommitEffects({',
  ],
  'Temporary Status route admission and cache order',
);
forbidToken(route, 'key: `temp-status:${userId || session.user?.id}:${storeId}`', 'Temporary Status route raw limiter key');
forbidToken(route, "hashPublicRateLimitValue(userId || session.user?.id || 'unknown')", 'Temporary Status route raw actor limiter key');
forbidToken(route, 'doc(String(storeId))', 'Temporary Status route raw store ref');
forbidToken(route, 'await storeRef.update', 'Temporary Status route stale-authority direct write');
forbidToken(route, 'console.error', 'Temporary Status route diagnostics');

[
  'resolveStorePermissionScopeDocumentIdAliases([',
  'store.tenantId,',
  'store.tId,',
  'persistedTenantScope?.documentId === params.tenantDocumentId',
  '!isUnavailableEntity(store)',
  '!isUnavailableEntity(tenant)',
  'isPlatformEntityBlocked(entity)',
  '!hasValidLifecycleState(entity)',
  '!isOptionalBoolean(entity.active)',
  '!isOptionalBoolean(entity.deleted)',
  '!isOptionalBoolean(entity.blocked)',
  '!isOptionalBoolean(entity.tenantBlocked)',
].forEach((token) => requireToken(serverMutationScope, token, 'Temporary Status transaction-current scope helper'));

[
  'params.deps.revalidate(`menu-store-${storeId}`)',
  'params.deps.revalidate(`store-${storeId}`)',
  "params.deps.revalidate('client-stores')",
  "params.deps.touchScreen(storeId)",
  'Promise.allSettled',
].forEach((token) => requireToken(postCommitHelper, token, 'Temporary Status post-commit helper'));

[
  'TEMP_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
  'readJsonResponseWithLimit<unknown>',
  'isTempStatusSuccessResponse',
  'value.success === true',
  "typeof value.effectsPending === 'boolean'",
  'temp_status_response_parse_failed',
  'temp_status_response_invalid',
  "new Error('Temporary status request failed')",
  'error.code = code.slice(0, 64)',
  'error.status = response.status',
].forEach((token) => requireToken(clientResponse, token, 'Temporary Status client response parser'));
forbidToken(clientResponse, 'response.json()', 'Temporary Status client response parser');
forbidToken(clientResponse, '.json().catch', 'Temporary Status client response parser');

[
  'AUTH_BROWSER_REQUEST_POLICY',
  "readTempStatusResponse(res, 'set'",
  "readTempStatusResponse(res, 'clear'",
  'desktop_temp_status_set_failed',
  'desktop_temp_status_clear_failed',
  'actionInFlightRef.current',
  'isExpectedScope(expectedTenantId, expectedStoreId)',
  'const timeZone = useTimeZone();',
  'toNativeDateTimeInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone)',
  "fromNativeDateTimeInputValue(value.format('YYYY-MM-DDTHH:mm'), timeZone)",
  'const expiryInstant = resolveExpiryInstant(expiresAt);',
  'expiresAt: expiryInstant',
  "formatDateTime(previewExpiryInstant, 'datetime', formatter)",
  'setPendingSetConfirmation({',
  'open={Boolean(pendingSetConfirmation)}',
  'onOk={confirmSetStatus}',
  'setPendingClearConfirmation({',
  'open={Boolean(pendingClearConfirmation)}',
  'onOk={confirmClearStatus}',
  'String(prev.tenantId) === String(expectedTenantId)',
  'String(prev.storeId) === String(expectedStoreId)',
  "setError('Failed to set status')",
  "setError('Failed to clear status')",
].forEach((token) => requireToken(desktopCard, token, 'Desktop Temporary Status card'));
requireOccurrenceAtLeast(desktopCard, "fetch('/api/store/temp-status'", 2, 'Desktop Temporary Status route calls');
requireOccurrenceAtLeast(desktopCard, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Desktop Temporary Status request policy');
requireOccurrenceAtLeast(desktopCard, 'expectedStoreId: String(expectedStoreId)', 2, 'Desktop Temporary Status initiating-store corroboration');
requireOccurrenceAtLeast(desktopCard, 'expectedTenantId: String(expectedTenantId)', 2, 'Desktop Temporary Status initiating-tenant corroboration');
requireOrder(
  desktopCard,
  ["readTempStatusResponse(res, 'set'", "antdMessage.success('Temporary status is live.')"],
  'Desktop Temporary Status set acknowledgement before success copy',
);
requireOrder(
  desktopCard,
  ["readTempStatusResponse(res, 'clear'", "antdMessage.success('Temporary status cleared.')"],
  'Desktop Temporary Status clear acknowledgement before success copy',
);
forbidToken(desktopCard, 'res.json()', 'Desktop Temporary Status card');
forbidToken(desktopCard, '.json().catch', 'Desktop Temporary Status card');
forbidToken(desktopCard, 'data.error ||', 'Desktop Temporary Status card');
forbidToken(desktopCard, 'err.message ||', 'Desktop Temporary Status card');
forbidToken(desktopCard, 'expiresAt.toISOString()', 'Desktop Temporary Status browser-timezone expiry conversion');
forbidToken(desktopCard, 'Modal.confirm({', 'Desktop Temporary Status static confirmation');

[
  'getMobileTempStatusFailureCode',
  'mobile_temp_status_set_failed',
  'mobile_temp_status_set_rejected',
  'mobile_temp_status_clear_failed',
  'mobile_temp_status_clear_rejected',
  'AUTH_BROWSER_REQUEST_POLICY',
  "readTempStatusResponse(res, 'set'",
  "readTempStatusResponse(res, 'clear'",
  'hasPreviousStatus: Boolean(prevStatus)',
  'return <MobileTempStatusScreenContent key={scopeKey} {...props} />;',
  'tempStatusActionInFlightRef.current',
  'isExpectedStoreScope(expectedTenantId, expectedStoreId)',
  "String(prev?.tenantId ?? '') !== String(expectedTenantId)",
  "String(prev?.storeId ?? '') !== String(expectedStoreId)",
  'prev === optimisticStoreDetails',
].forEach((token) => requireToken(mobileTempStatus, token, 'Mobile Temporary Status screen'));
requireOccurrenceAtLeast(mobileTempStatus, 'prev === optimisticStoreDetails', 2, 'Mobile Temporary Status attempt-owned rollback');
requireOccurrenceAtLeast(mobileTempStatus, "fetch('/api/store/temp-status'", 2, 'Mobile Temporary Status route calls');
requireOccurrenceAtLeast(mobileTempStatus, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Mobile Temporary Status request policy');
requireOccurrenceAtLeast(mobileTempStatus, 'expectedStoreId: String(expectedStoreId)', 2, 'Mobile Temporary Status initiating-store corroboration');
requireOccurrenceAtLeast(mobileTempStatus, 'expectedTenantId: String(expectedTenantId)', 2, 'Mobile Temporary Status initiating-tenant corroboration');
requireOrder(
  mobileTempStatus,
  ["readTempStatusResponse(res, 'set'", 'Toast.show({'],
  'Mobile Temporary Status set acknowledgement before success copy',
);
requireOrder(
  mobileTempStatus.slice(mobileTempStatus.indexOf("readTempStatusResponse(res, 'clear'")),
  ["readTempStatusResponse(res, 'clear'", 'Toast.show({'],
  'Mobile Temporary Status clear acknowledgement before success copy',
);
forbidToken(mobileTempStatus, 'res.json()', 'Mobile Temporary Status screen');
forbidToken(mobileTempStatus, '.json().catch', 'Mobile Temporary Status screen');
forbidToken(mobileTempStatus, "throw new Error('Failed to set status')", 'Mobile Temporary Status screen');
forbidToken(mobileTempStatus, "throw new Error('Failed to clear status')", 'Mobile Temporary Status screen');

[
  'const handleCloseToday = useCallback(async () =>',
  'const handleSetTempStatus = async () =>',
  'const handleClearTempStatus = async () =>',
  'AUTH_BROWSER_REQUEST_POLICY',
  'mobile_today_close_today_failed',
  'mobile_today_temp_status_set_failed',
  'mobile_today_temp_status_clear_failed',
  "surface: 'mobile_today_hours'",
  'tempStatusActionInFlightRef.current',
  'isExpectedTempStatusScope(expectedTenantId, expectedStoreId)',
  "readTempStatusResponse(res, 'set'",
  "readTempStatusResponse(res, 'clear'",
].forEach((token) => requireToken(mobileHours, token, 'Mobile Today Temporary Status shortcuts'));
requireOccurrenceAtLeast(mobileHours, "fetch('/api/store/temp-status'", 3, 'Mobile Today Temporary Status route calls');
requireOccurrenceAtLeast(mobileHours, '...AUTH_BROWSER_REQUEST_POLICY', 3, 'Mobile Today Temporary Status request policy');
requireOccurrenceAtLeast(mobileHours, 'expectedStoreId: String(expectedStoreId)', 3, 'Mobile Today Temporary Status initiating-store corroboration');
requireOccurrenceAtLeast(mobileHours, 'expectedTenantId: String(expectedTenantId)', 3, 'Mobile Today Temporary Status initiating-tenant corroboration');
[
  "readTempStatusResponse(res, 'set'",
  "readTempStatusResponse(res, 'clear'",
].forEach((token) => requireToken(mobileHours, token, 'Mobile Today acknowledgement boundary'));
const firstTodaySetAck = mobileHours.indexOf("readTempStatusResponse(res, 'set'");
const secondTodaySetAck = mobileHours.indexOf("readTempStatusResponse(res, 'set'", firstTodaySetAck + 1);
const todayClearAck = mobileHours.indexOf("readTempStatusResponse(res, 'clear'");
[
  ['close-today', firstTodaySetAck],
  ['set-status', secondTodaySetAck],
  ['clear-status', todayClearAck],
].forEach(([label, acknowledgementIndex]) => {
  const successIndex = mobileHours.indexOf('Toast.show({', acknowledgementIndex);
  if (acknowledgementIndex === -1 || successIndex === -1) {
    failures.push(`Mobile Today ${label} missing acknowledgement-before-success boundary`);
  }
});
forbidToken(mobileHours, 'res.json()', 'Mobile Today Temporary Status shortcuts');
forbidToken(mobileHours, '.json().catch', 'Mobile Today Temporary Status shortcuts');
forbidToken(mobileHours, 'if (!res.ok) throw new Error();', 'Mobile Today Temporary Status shortcuts');

[
  "key: 'tempStatus'",
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && canManageStore',
  "openSubScreen('tempStatus')",
  "'tempStatus', 'businessAttributes'",
  "subScreen === 'tempStatus'",
  '<MobileTempStatusScreen',
].forEach((token) => requireToken(mobileMore, token, 'Mobile More Temporary Status route'));

[
  "'use client';",
  'const activeStatus = useActiveTempStatus(tempStatus);',
  'if (!activeStatus) return null;',
  'activeStatus.message',
].forEach((token) => requireToken(tempStatusBanner, token, 'Temporary Status banner'));

[
  'export function getActiveTempStatus(',
  'if (!Number.isFinite(nowMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;',
  "normalizeTempStatusMessage(type, readOwnValue(value, 'message'))",
  'TEMP_STATUS_MESSAGE_MAX_LENGTH = 100',
].forEach((token) => requireToken(statusBoundary, token, 'Canonical Temporary Status boundary'));
[
  'MAX_TIMEOUT_MS = 2_147_000_000',
  'const activeStatus = useMemo(() => getActiveTempStatus(value, nowMs)',
  'window.setTimeout(() => setNowMs(Date.now()), delay)',
].forEach((token) => requireToken(activeStatusHook, token, 'Temporary Status live-expiry hook'));

[
  'getActiveTempStatus(storeDetails?.tempStatus)',
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && activeTempStatus',
  'activeLanguage={activeLanguage}',
  'tempStatus={activeTempStatus as any}',
  'variant="pill"',
].forEach((token) => requireToken(menuPage, token, 'Digital menu Temporary Status output'));

[
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && storeInfo.tempStatus',
  'activeLanguage={storeInfo.contentLanguage}',
  'tempStatus={storeInfo.tempStatus}',
].forEach((token) => requireToken(feedbackPage, token, 'Feedback page Temporary Status output'));

[
  'import TempStatusBanner from "@atoms/TempStatusBanner";',
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && store?.tempStatus',
  'activeLanguage={contentLanguage}',
  'tempStatus={store.tempStatus}',
  'variant="pill"',
].forEach((token) => requireToken(obpResolvedSurface, token, 'OBP Temporary Status output'));

[
  'getActivePublicTempStatus,',
  'normalizePublicBusinessAttributes,',
  "} from '@lib/publicApi/businessProjection';",
  'const activeTempStatus = FEATURE_FLAGS.ENABLE_TEMP_STATUS',
  '? getActivePublicTempStatus(storeData.tempStatus)',
  'tempStatus: activeTempStatus',
].forEach((token) => requireToken(publicBusinessApi, token, 'Public business API active Temporary Status output'));
forbidToken(publicBusinessApi, 'tempStatus: storeData.tempStatus ? {', 'Public business API expired Temporary Status leak');

[
  'export function getActivePublicTempStatus(',
  'value: unknown,',
  'return getActiveTempStatus(value, nowMs);',
].forEach((token) => requireToken(publicBusinessProjection, token, 'Public business Temporary Status projection'));

[
  'buildEffectiveSpecialOpeningHours(storeData)',
  'specialOpeningHoursSpecification: specialOpeningHours',
].forEach((token) => {
  requireToken(obpSchema, token, 'OBP schema Temporary Status output');
  requireToken(clientMenuPage, token, 'Client menu schema Temporary Status output');
});
forbidToken(obpSchema, 'specialOpeningHoursSpecification: tempStatusHours', 'OBP schema destructive Temporary Status overwrite');
forbidToken(clientMenuPage, 'specialOpeningHoursSpecification: tempStatusHours', 'Client menu schema destructive Temporary Status overwrite');

[
  'export function buildEffectiveSpecialOpeningHours(',
  '...specialHours.filter((entry) => entry.validFrom !== temporaryClosure.validFrom)',
  "activeStatus.type !== 'closed_today'",
  'validThrough: today',
  'description: activeStatus.message',
].forEach((token) => requireToken(schema, token, 'Temporary Status structured-data boundary'));

[
  "type: 'special_menu'",
  'expiresAt: currentMetadata.endsAt',
  'sourceProjectId: scope.project.projectId',
  'storeUpdate.tempStatus = deleteField();',
].forEach((token) => requireToken(specialMenuLifecycle, token, 'Browser Special Menu Temporary Status ownership'));
[
  "storeData.tempStatus?.type !== 'special_menu'",
  'sourceProjectId === projectId',
  "type: 'special_menu'",
  'expiresAt: metadata.endsAt',
  'sourceProjectId: projectId',
  'storeUpdate.tempStatus = FieldValue.delete();',
].forEach((token) => requireToken(scheduledSpecialMenuLifecycle, token, 'Scheduled Special Menu Temporary Status ownership'));

[
  '## Source Gate',
  '`npm run verify:temporary-status-boundary`',
  'ENABLE_TEMP_STATUS: true',
  'affected Digital Screen hashed token cache tag',
  'Owner Business Assistant',
  'public pull API hides expired temporary status values',
].forEach((token) => requireToken(readme, token, 'Temporary Status README'));
forbidToken(readme, 'ENABLE_TEMP_STATUS: false', 'Temporary Status README stale flag');

[
  '## Source Gate',
  '`npm run verify:temporary-status-boundary`',
  'src/app/client/obp/OBPResolvedSurface.tsx',
  'Session tenant/store IDs pass through the shared Firestore document-ID guard',
  'public pull API hides expired temporary status values',
  'hashed token cache tag',
  'Owner Business Assistant',
  'A Firestore transaction re-reads the current store and tenant',
  'transaction-current store',
].forEach((token) => requireToken(impl, token, 'Temporary Status implementation doc'));
forbidToken(impl, 'src/app/_client/obp/OBPContent.tsx', 'Temporary Status implementation stale OBP path');

[
  '## Source Gate',
  '`npm run verify:temporary-status-boundary`',
  'validates compact/nested session tenant/store aliases through the shared exact permission-scope guard',
  '4KB bounded JSON',
  '8KB',
  'hashed token cache tag',
  'Owner Business Assistant',
  'public pull API returns `null` for expired temporary statuses',
  'Two transaction reads (current store + tenant)',
  'current persisted permission',
].forEach((token) => requireToken(firebaseDoc, token, 'Temporary Status Firebase doc'));

[
  '## Source Gate',
  '`npm run verify:temporary-status-boundary`',
  'MobileTempStatusScreen',
  'MobileHoursScreen',
  'AUTH_BROWSER_REQUEST_POLICY',
].forEach((token) => requireToken(mobileDoc, token, 'Temporary Status mobile doc'));

[
  'Owner UI closes immediately; Temporary Status syncs and customer output refreshes through supported paths',
  'Owner UI reopens immediately; Temporary Status clears and customer output refreshes through supported paths',
  'storeDetails.tempStatus → active Temporary Status from the store document',
  'POST /api/store/temp-status with action set/clear.',
  'Optimistic state remains only after { success: true }; failure rolls back.',
  'interface StoreTemporaryStatus',
].forEach((token) => requireToken(mobileScreensSpec, token, 'Mobile Screens Hours/Status Temporary Status boundary'));
[
  'Instant close + auto-publish to all surfaces',
  'Instant reopen + auto-publish',
  'auto-publish to all surfaces',
  'todayOverride?:',
  'tempCloseUntil?:',
  'interface StoreHoursOverride',
].forEach((token) => forbidToken(mobileScreensSpec, token, 'Mobile Screens Hours/Status stale Temporary Status boundary'));

[
  'Current Source Boundary',
  'src/app/client/obp/OBPResolvedSurface.tsx',
  'default `true`',
  'exact Digital Screen hashed-token invalidation',
  'Transaction-current store and tenant state',
].forEach((token) => requireToken(validationDoc, token, 'Temporary Status validation doc'));
forbidToken(validationDoc, 'default `false`', 'Temporary Status validation stale flag');
forbidToken(validationDoc, 'src/app/_client/obp/OBPContent.tsx', 'Temporary Status validation stale OBP path');

requireToken(inventory, 'temporary-status boundary source gate passed; browser/manual mutation pending', 'feature sweep inventory');
[
  '## Temporary Status Boundary',
  '`npm run verify:temporary-status-boundary`',
  'source/docs verification only',
].forEach((token) => requireToken(report, token, 'feature sweep report'));
[
  'Owner store session document-ID boundary checkpoint',
  'Temporary Status boundary checkpoint',
  'Temporary Status strict session document-ID boundary checkpoint',
  '`npm run verify:temporary-status-boundary`',
  'raw `doc(String(storeId))` exclusions',
  'public pull API expired-status hiding',
  'Temporary Status Transaction-Current Authority',
  're-evaluates persisted store permission',
].forEach((token) => requireToken(audit, token, 'production readiness audit'));
[
  'Mobile Hours/Status Temporary Status docs checkpoint',
  '`npm run verify:temporary-status-boundary` now rejects the stale all-surface auto-publish wording',
  'store `tempStatus` field and `/api/store/temp-status` response-confirmation boundary',
].forEach((token) => requireToken(audit, token, 'production readiness audit mobile Hours/Status boundary'));
[
  'Owner Store Session Document ID Boundary',
  'Temporary Status Strict Session Document ID Boundary',
  'July 2, 2026 - Temporary Status Boundary',
  '`/api/store/temp-status` validates session tenant/store IDs',
  'raw `doc(String(storeId))` exclusions',
  'verify:temporary-status-boundary',
  'public pull API expired-status hiding',
  'Temporary Status Transaction-Current Authority',
].forEach((token) => requireToken(changelog, token, 'changelog'));
[
  'Mobile Hours/Status Temporary Status Docs Boundary',
  '`npm run verify:temporary-status-boundary` now rejects the stale all-surface auto-publish wording',
].forEach((token) => requireToken(changelog, token, 'changelog mobile Hours/Status boundary'));

if (failures.length > 0) {
  console.error('FAIL verify-temporary-status-boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS verify-temporary-status-boundary');
console.log('Validated Temporary Status route admission, desktop/mobile acknowledgement, public output expiry guards, cache invalidation, and docs parity.');
