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
const features = read('src/config/features.ts');
const route = read('src/app/api/store/temp-status/route.ts');
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
  '"verify:temporary-status-boundary": "node scripts/verification/verify-temporary-status-boundary.js"',
  'package scripts',
);
requireToken(features, 'ENABLE_TEMP_STATUS: true', 'Temporary Status feature flag');

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
  'const rawUserId = session.uId || session.user?.id;',
  'const tenantId = normalizeSessionDocumentId(rawTenantId);',
  'const storeId = normalizeSessionDocumentId(rawStoreId);',
  'const userId = normalizeSessionDocumentId(rawUserId);',
  'requireAnyStorePermission(',
  'PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_PUBLIC_PRESENCE',
  "getRateLimitForFeature('DATA_WRITE')",
  "hashPublicRateLimitValue(userId || 'unknown')",
  'const storeRateLimitHash = hashPublicRateLimitValue(storeId);',
  'key: `temp-status:${userRateLimitHash}:${storeRateLimitHash}`',
  'const TEMP_STATUS_ACTION_MAX_BODY_BYTES = 4 * 1024;',
  'readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES',
  'RequestSchema.safeParse(body)',
  'new Date(expiresAt).getTime() <= Date.now()',
  'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);',
  'createdBy: userId || null',
  'admin.firestore.FieldValue.delete()',
  'revalidateTag(`menu-store-${storeId}`)',
  'revalidateTag(`store-${storeId}`)',
  "revalidateTag('client-stores')",
  "revalidateTag('screen-data')",
  "touchDigitalScreenContentVersionForStoreServer(storeId, 'storeTempStatus')",
  'invalidateOwnerBusinessAssistantPacketCache',
  'logRuntimeFailure("store_temp_status_update_failed"',
  '{ error: "Failed to update status" }',
].forEach((token) => requireToken(route, token, 'Temporary Status route'));

requireOrder(
  route,
    [
      'if (!FEATURE_FLAGS.ENABLE_TEMP_STATUS)',
      'const tenantId = normalizeSessionDocumentId(rawTenantId);',
      'const storeId = normalizeSessionDocumentId(rawStoreId);',
      'requireAnyStorePermission(',
      "getRateLimitForFeature('DATA_WRITE')",
    'readBoundedJsonBody(request, TEMP_STATUS_ACTION_MAX_BODY_BYTES',
    'RequestSchema.safeParse(body)',
    'await storeRef.update',
    'revalidateTag(`menu-store-${storeId}`)',
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'storeTempStatus')",
    'invalidateOwnerBusinessAssistantPacketCache',
  ],
  'Temporary Status route admission and cache order',
);
forbidToken(route, 'key: `temp-status:${userId || session.user?.id}:${storeId}`', 'Temporary Status route raw limiter key');
forbidToken(route, "hashPublicRateLimitValue(userId || session.user?.id || 'unknown')", 'Temporary Status route raw actor limiter key');
forbidToken(route, 'doc(String(storeId))', 'Temporary Status route raw store ref');
forbidToken(route, 'console.error', 'Temporary Status route diagnostics');

[
  'TEMP_STATUS_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
  'readJsonResponseWithLimit<unknown>',
  'isTempStatusSuccessResponse',
  'value.success === true',
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
  "setStoreDetails((prev: any) => ({ ...prev, tempStatus: currentStatus }))",
  "setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }))",
  "setError('Failed to set status')",
  "setError('Failed to clear status')",
].forEach((token) => requireToken(desktopCard, token, 'Desktop Temporary Status card'));
requireOccurrenceAtLeast(desktopCard, "fetch('/api/store/temp-status'", 2, 'Desktop Temporary Status route calls');
requireOccurrenceAtLeast(desktopCard, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Desktop Temporary Status request policy');
forbidToken(desktopCard, 'res.json()', 'Desktop Temporary Status card');
forbidToken(desktopCard, '.json().catch', 'Desktop Temporary Status card');
forbidToken(desktopCard, 'data.error ||', 'Desktop Temporary Status card');
forbidToken(desktopCard, 'err.message ||', 'Desktop Temporary Status card');

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
  "setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }))",
].forEach((token) => requireToken(mobileTempStatus, token, 'Mobile Temporary Status screen'));
requireOccurrenceAtLeast(mobileTempStatus, "fetch('/api/store/temp-status'", 2, 'Mobile Temporary Status route calls');
requireOccurrenceAtLeast(mobileTempStatus, '...AUTH_BROWSER_REQUEST_POLICY', 2, 'Mobile Temporary Status request policy');
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
  "readTempStatusResponse(res, 'set'",
  "readTempStatusResponse(res, 'clear'",
].forEach((token) => requireToken(mobileHours, token, 'Mobile Today Temporary Status shortcuts'));
requireOccurrenceAtLeast(mobileHours, "fetch('/api/store/temp-status'", 3, 'Mobile Today Temporary Status route calls');
requireOccurrenceAtLeast(mobileHours, '...AUTH_BROWSER_REQUEST_POLICY', 3, 'Mobile Today Temporary Status request policy');
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
  'if (!tempStatus) return null;',
  'const expiresAt = new Date(tempStatus.expiresAt);',
  'if (expiresAt.getTime() <= now.getTime()) return null;',
  "const message = tempStatus.message || 'Temporary notice';",
].forEach((token) => requireToken(tempStatusBanner, token, 'Temporary Status banner'));

[
  'const isActiveTempStatus = (tempStatus?: { expiresAt?: string } | null): boolean =>',
  'Number.isFinite(expiresAt) && expiresAt > Date.now()',
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && activeTempStatus',
  '<TempStatusBanner tempStatus={activeTempStatus as any} variant="pill" />',
].forEach((token) => requireToken(menuPage, token, 'Digital menu Temporary Status output'));

[
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && storeInfo.tempStatus',
  '<TempStatusBanner tempStatus={storeInfo.tempStatus} />',
].forEach((token) => requireToken(feedbackPage, token, 'Feedback page Temporary Status output'));

[
  'import TempStatusBanner from "@atoms/TempStatusBanner";',
  'FEATURE_FLAGS.ENABLE_TEMP_STATUS && store?.tempStatus',
  '<TempStatusBanner tempStatus={store.tempStatus} variant="pill" />',
].forEach((token) => requireToken(obpResolvedSurface, token, 'OBP Temporary Status output'));

[
  "import { getActivePublicTempStatus, normalizePublicBusinessAttributes } from '@lib/publicApi/businessProjection';",
  'const activeTempStatus = FEATURE_FLAGS.ENABLE_TEMP_STATUS',
  '? getActivePublicTempStatus(storeData.tempStatus)',
  'tempStatus: activeTempStatus',
].forEach((token) => requireToken(publicBusinessApi, token, 'Public business API active Temporary Status output'));
forbidToken(publicBusinessApi, 'tempStatus: storeData.tempStatus ? {', 'Public business API expired Temporary Status leak');

[
  'export function getActivePublicTempStatus(',
  'value: unknown,',
  'const expiresAtMs = Date.parse(status.expiresAt);',
  'if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;',
  "PUBLIC_TEMP_STATUS_TYPES.has(status.type as PublicTempStatus['type'])",
  "message.trim().slice(0, 100)",
].forEach((token) => requireToken(publicBusinessProjection, token, 'Public business Temporary Status projection'));

[
  'buildTempStatusSchema(storeData?.tempStatus)',
  'specialOpeningHoursSpecification: tempStatusHours',
].forEach((token) => {
  requireToken(obpSchema, token, 'OBP schema Temporary Status output');
  requireToken(clientMenuPage, token, 'Client menu schema Temporary Status output');
});

[
  '## Source Gate',
  '`npm run verify:temporary-status-boundary`',
  'ENABLE_TEMP_STATUS: true',
  'screen-data',
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
  'screen-data',
  'Owner Business Assistant',
].forEach((token) => requireToken(impl, token, 'Temporary Status implementation doc'));
forbidToken(impl, 'src/app/_client/obp/OBPContent.tsx', 'Temporary Status implementation stale OBP path');

[
  '## Source Gate',
  '`npm run verify:temporary-status-boundary`',
  'validates session tenant/store IDs through the shared Firestore document-ID guard',
  '4KB bounded JSON',
  '8KB',
  'screen-data',
  'Owner Business Assistant',
  'public pull API returns `null` for expired temporary statuses',
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
  'screen-data',
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
