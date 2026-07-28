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
  if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
}

function forbidToken(source, token, label) {
  if (source.includes(token)) failures.push(`${label} must not include token: ${token}`);
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

const packageJson = read('package.json');
const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
const rateLimits = read('src/lib/rateLimit/configs.ts');
const createRoute = read('src/app/api/public/create-menu/route.ts');
const claimRoute = read('src/app/api/public/create-menu/claim/route.ts');
const priceTruth = read('src/lib/pricing/projectPriceTruth.ts');
const slugBoundary = read('src/lib/public-menu-entry/claimProjectSlug.ts');
const createClient = read('src/app/(website)/create-menu/CreateMenuClient.tsx');
const previewClient = read('src/app/(website)/create-menu/PreviewClient.tsx');
const successClient = read('src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx');
const maintenance = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const readme = read('__docs__/public-menu-entry/README.md');
const spec = read('__docs__/public-menu-entry/public-menu-entry_spec.md');
const impl = read('__docs__/public-menu-entry/public-menu-entry_impl.md');
const firebaseDoc = read('__docs__/public-menu-entry/public-menu-entry_firebase.md');
const mobileDoc = read('__docs__/public-menu-entry/public-menu-entry_mobile-support.md');
const verificationDoc = read('__docs__/public-menu-entry/public-menu-entry_verification.md');
const tracker = read('__docs__/audits/menulist-feature-flow-audit-tracker.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

[
  'verify:public-menu-entry-boundary',
  'test:public-menu-entry-boundary',
  'scripts/verification/test-public-menu-entry-boundary.ts',
].forEach((token) => requireToken(packageJson, token, 'package scripts'));

const publicDraftComposites = (firestoreIndexes.indexes || []).filter((entry) => (
  entry.collectionGroup === 'publicMenuDrafts'
));
if (publicDraftComposites.some((entry) => (
  (entry.fields || []).some((field) => field.fieldPath === 'claimed')
  && (entry.fields || []).some((field) => field.fieldPath === 'expiresAt')
))) {
  failures.push('Public Menu Entry must not retain the obsolete claimed + expiresAt composite index');
}
const publicDraftIndexExemptions = new Set(
  (firestoreIndexes.fieldOverrides || [])
    .filter((entry) => entry.collectionGroup === 'publicMenuDrafts' && Array.isArray(entry.indexes) && entry.indexes.length === 0)
    .map((entry) => entry.fieldPath),
);
for (const fieldPath of ['extractedData', 'extractedBusinessProfile', 'sourceMetadata', 'growthAcquisition']) {
  if (!publicDraftIndexExemptions.has(fieldPath)) {
    failures.push(`publicMenuDrafts.${fieldPath} must stay exempt from unused automatic single-field indexes`);
  }
}

[
  'PUBLIC_MENU_ENTRY_ADMISSION:',
  'limit: 30',
  'window: 300',
  'PUBLIC_MENU_ENTRY_AUTH:',
  'limit: 5',
  'window: 86400',
].forEach((token) => requireToken(rateLimits, token, 'Public Menu Entry rate-limit config'));

[
  "getRateLimitForFeature('PUBLIC_MENU_ENTRY_ADMISSION')",
  'key: `public-menu-entry-admission:${userRateLimitHash}`',
  'failClosedOnProviderError: true',
  'const sessionTenantPresent = hasSessionScopeValue(session?.user?.tenantId);',
  'if (sessionTenantPresent !== sessionStorePresent)',
  '[PERMISSIONS.USE_MENU_EXTRACTION]',
  'const safeModeResponse = await checkSafeMode();',
  "getRateLimitForFeature('PUBLIC_MENU_ENTRY_AUTH')",
  'const reusableDraft = await findReusableDraftForUser(userId, { contentHash });',
  'const reusableDraft = await findReusableDraftForUser(userId, { sourceInputHash });',
  'const statusOnly = searchParams.get(\'statusOnly\')',
  'key: `public-menu-entry-status:${userRateLimitHash}:${draftRateLimitHash}`',
  "status: providerUnavailable ? 503 : 429",
  'extractedData = normalizeExtractedMenuPriceTruth(extractedData);',
  "const responseStatus = draft.extractionStatus === 'completed' && !extractedData",
  "error: responseStatus === 'failed' ? PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE : null",
].forEach((token) => requireToken(createRoute, token, 'Public Menu Entry intake/poll route'));
requireOrder(createRoute, [
  'const admissionResponse = await checkAuthenticatedPublicMenuEntryAdmission(userId);',
  'const sessionTenantPresent = hasSessionScopeValue(session?.user?.tenantId);',
  '[PERMISSIONS.USE_MENU_EXTRACTION]',
  'const safeModeResponse = await checkSafeMode();',
  "req.headers.get('content-length')",
], 'Public Menu Entry cheap admission order');
requireOrder(createRoute, [
  'const contentHash = hashBuffer(buffer);',
  'const reusableDraft = await findReusableDraftForUser(userId, { contentHash });',
  'const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);',
], 'Public Menu Entry image dedupe before daily quota');
requireOrder(createRoute, [
  'const sourceInputHash = hashString(requestedSourceUrl);',
  'const reusableDraft = await findReusableDraftForUser(userId, { sourceInputHash });',
  'const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);',
], 'Public Menu Entry link dedupe before daily quota');

[
  'export function normalizeExtractedMenuPriceTruth',
  'if (Array.isArray(item.attributes))',
  'return menuData;',
].forEach((token) => requireToken(priceTruth, token, 'Extracted menu price boundary'));

[
  'if (sessionTenantPresent !== sessionStorePresent)',
  'const hasExistingAccount = sessionTenantPresent && sessionStorePresent;',
  'normalizePhoneNumberForStorage({ phoneNumber: phone })',
  'normalizedPhone.internationalDigits.length < 8',
  'normalizedPhone.internationalDigits.length > 15',
  'normalizeExtractedMenuPriceTruth(extractedData);',
  'getBusinessTypeConfig(',
  '[PERMISSIONS.PUBLISH_MENU]',
  'resolvePublicMenuEntryProjectSlug(',
  'projectId,',
  'deleted: false,',
  'slug: projectSlug,',
  'projectData._mce = toMCEMetadata(mceValidate({',
  'transaction.set(projectRef, projectData);',
  'const cacheResults = await Promise.allSettled',
  "revalidateTag(`menu-store-${result.storeId}`, { expire: 0 })",
  "revalidateTag(`store-${result.storeId}`, { expire: 0 })",
  "revalidateTag('client-stores', { expire: 0 })",
  "revalidateTag('screen-data', { expire: 0 })",
].forEach((token) => requireToken(claimRoute, token, 'Public Menu Entry claim route'));
requireOrder(claimRoute, [
  'const storeDoc = await transaction.get(storeRef);',
  'const storeData = storeDoc.data() || {};',
  'requireAnyStorePermissionForStoreData(',
  '[PERMISSIONS.PUBLISH_MENU]',
  'transaction.set(projectRef, projectData);',
], 'Public Menu Entry current publish permission and write order');
requireOrder(claimRoute, [
  'projectData._mce = toMCEMetadata(mceValidate({',
  'transaction.set(projectRef, projectData);',
], 'Public Menu Entry MCE stamp stays in project transaction');

[
  'isReservedProjectSlug(proposedSlug)',
  'proposedSlug = `${proposedSlug}-menu`',
  'resolveAvailableProjectSlug(projects, proposedSlug, projectId)',
].forEach((token) => requireToken(slugBoundary, token, 'Public Menu Entry project slug boundary'));

[
  'event.currentTarget.value = \'\';',
  'accept="image/jpeg,image/png,image/webp"',
].forEach((token) => requireToken(createClient, token, 'Public Menu Entry source chooser'));
forbidToken(createClient, 'capture="environment"', 'Public Menu Entry source chooser');

[
  'CREATE_MENU_PREVIEW_POLL_INTERVAL_MS = 5_000',
  'CREATE_MENU_PREVIEW_MAX_POLLS = 36',
  'CREATE_MENU_SESSION_REFRESH_TIMEOUT_MS = 3_000',
  'let attempts = 0;',
  'if (attempts >= CREATE_MENU_PREVIEW_MAX_POLLS)',
  'timer = setTimeout(poll, CREATE_MENU_PREVIEW_POLL_INTERVAL_MS);',
  '}, [fetchDraft, pollCycle, router, sessionStatus, signInUrl]);',
  'setPollCycle((cycle) => cycle + 1);',
  'const hasExistingAccount = Boolean(session?.user?.tenantId && session?.user?.storeId);',
  'if (!hasExistingAccount && (!city.trim()',
  'city: hasExistingAccount ? undefined : city.trim()',
  '{!hasExistingAccount ? <AnimateStaggerChild',
  'await Promise.race([',
  'public_create_menu_claim_session_refresh_failed',
].forEach((token) => requireToken(previewClient, token, 'Public Menu Entry preview/claim client'));
requireOrder(previewClient, [
  'if (attempts >= CREATE_MENU_PREVIEW_MAX_POLLS)',
  'attempts += 1;',
  'setPollCount(attempts);',
  'const status = await fetchDraft();',
], 'Public Menu Entry poll cap before each status read');
forbidToken(previewClient, '[fetchDraft, pollCount', 'Public Menu Entry preview polling');

[
  'CREATE_MENU_SUCCESS_SESSION_REFRESH_TIMEOUT_MS = 3_000',
  'await Promise.race([',
  'public_create_menu_success_session_refresh_failed',
  "window.location.assign('/use-menulist')",
].forEach((token) => requireToken(successClient, token, 'Public Menu Entry success handoff'));

[
  ".collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS)",
  ".where('expiresAt', '<', Timestamp.now())",
  'const claimed = data.claimed === true;',
  'if (claimed && imagePath)',
  'preservedClaimedFiles += 1;',
  'await bucket.file(imagePath).delete({ ignoreNotFound: true });',
  'Preserve the draft as the durable retry record.',
  'batch.delete(doc.ref);',
].forEach((token) => requireToken(maintenance, token, 'Public Menu Entry draft cleanup'));
const cleanupStart = maintenance.indexOf('async function runPublicMenuDraftCleanup');
const cleanupEnd = maintenance.indexOf('async function deleteExpiredDocs', cleanupStart);
const cleanupSource = maintenance.slice(cleanupStart, cleanupEnd);
forbidToken(cleanupSource, ".where('claimed', '==', false)", 'Public Menu Entry draft cleanup');

for (const [source, label] of [
  [readme, 'Public Menu Entry README'],
  [spec, 'Public Menu Entry spec'],
  [impl, 'Public Menu Entry implementation doc'],
  [firebaseDoc, 'Public Menu Entry Firebase doc'],
  [mobileDoc, 'Public Menu Entry mobile doc'],
  [verificationDoc, 'Public Menu Entry verification doc'],
]) {
  [
    'Local source complete',
    'signed-in',
    '5 seconds',
    '36',
    'claimed draft',
    'Approved app release',
  ].forEach((token) => requireToken(source, token, label));
}

[
  '| 23 | Public Menu Entry and create-menu claim flow | Large | Local source complete |',
  '## Completed item 23 source boundary',
].forEach((token) => requireToken(tracker, token, 'strict feature tracker'));
[
  'Public Menu Entry and Create-Menu Claim Boundary',
].forEach((token) => {
  requireToken(inventory, token, 'feature inventory');
  requireToken(report, token, 'feature report');
  requireToken(audit, token, 'production-readiness audit');
  requireToken(changelog, token, 'changelog');
});

if (failures.length > 0) {
  console.error(`Public Menu Entry boundary verification failed (${failures.length} issue(s)):`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log('Public Menu Entry boundary verification passed.');
