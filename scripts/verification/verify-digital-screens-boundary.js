#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function verifyPackageScripts() {
  const scripts = JSON.parse(read('package.json')).scripts || {};
  assertIncludes(scripts['verify:digital-screens-boundary'] || '', 'test:digital-screens:lifecycle', 'Digital Screens verifier');
  assertIncludes(scripts['verify:digital-screens-boundary'] || '', 'test:digital-screens:rules', 'Digital Screens verifier');
  assertIncludes(scripts['backfill:digital-screen-public-mirrors'] || '', 'backfill-digital-screen-public-mirrors.ts', 'Public mirror backfill');
  assertIncludes(scripts['backfill:digital-screen-private-controls'] || '', 'backfill-digital-screen-private-controls.ts', 'Private control backfill');
}

function verifyManagementAuthority() {
  const route = read('src/app/api/digital-screens/route.ts');
  const server = read('src/lib/screen/screenManagementServer.ts');
  const contracts = read('src/lib/screen/screenManagementContracts.ts');
  const client = read('src/database/campaigns/index.ts');
  const rules = read('firestore.rules');

  assertIncludes(route, 'withAuth(', 'Digital Screens management API auth');
  assertIncludes(route, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens management API permission');
  assertIncludes(route, 'requireAnyStorePermission(', 'Digital Screens management API store authorization');
  assertIncludes(route, 'readBoundedJsonBody(request, MAX_BODY_BYTES', 'Digital Screens management API bounded body');
  assertIncludes(route, 'z.discriminatedUnion("action"', 'Digital Screens management API mutation schema');
  assertIncludes(route, 'getRateLimitForFeature("DATA_WRITE")', 'Digital Screens management API rate limit');

  assertIncludes(contracts, '| { action: "initialize" }', 'Digital Screens explicit initialization');
  assertIncludes(contracts, 'screen: DigitalScreenOwnerStateTransport | null;', 'Digital Screens non-creating owner read');
  assertIncludes(server, 'mutation?.action !== "initialize"', 'Digital Screens read does not initialize');
  assertIncludes(server, 'digital_screen_control_scope_invalid', 'Digital Screens private control scope guard');
  assertIncludes(server, 'digital_screen_control_missing', 'Digital Screens partial-state fail closed');
  assertIncludes(server, 'firestoreAdmin.runTransaction', 'Digital Screens canonical transaction');
  assertIncludes(server, 'transaction.set(summaryRef, { screen: nextScreen }', 'Digital Screens canonical write');
  assertIncludes(server, 'transaction.set(controlRef,', 'Digital Screens private token write');
  assertIncludes(server, 'transaction.set(publicRef,', 'Digital Screens listener mirror write');
  assertIncludes(server, 'const { screenToken: _legacyToken, ...screenWithoutToken }', 'Digital Screens token removal');
  assertIncludes(server, 'if (!needsPersistence)', 'Digital Screens no-op read write suppression');
  assertIncludes(server, 'expiredSlidesPruned', 'Digital Screens expired custom-slide pruning');

  assertIncludes(client, 'fetch("/api/digital-screens"', 'Digital Screens client uses protected API');
  assertIncludes(client, 'callDigitalScreenManagementApi({ action: "initialize" })', 'Digital Screens explicit setup call');
  assertNotIncludes(client, 'transaction.set(getCampaignsSummaryDocRef(session), { screen }', 'Digital Screens client canonical write');

  assertIncludes(rules, "document.matches('^screenControl_[^_]+$')", 'Digital Screens private control rules');
  assertIncludes(rules, '&& !isPrivateScreenControlDoc(document)', 'Digital Screens private control read/write denial');
  assertIncludes(rules, 'preservesServerManagedScreenState(document)', 'Digital Screens canonical screen write protection');
  assertNotIncludes(rules, 'canWriteCurrentStorePublicScreenDoc', 'Digital Screens public mirror client writer');
}

function verifyPublicReadAndRefresh() {
  const page = read('src/app/screen/[token]/page.tsx');
  const server = read('src/database/campaigns/serverScreen.ts');
  const seen = read('src/app/api/screen/seen/route.ts');
  const invalidation = read('src/lib/screen/serverScreenInvalidation.ts');
  const revalidation = read('src/app/api/revalidate/menu/route.ts');
  const publicClientCache = read('src/lib/cache/publicClientCache.ts');
  const functionsInvalidation = read('functions/src/logic/publicCacheRevalidation.ts');

  assertIncludes(page, 'getPrivateScreenTokenCacheTag(token)', 'Digital Screens token-hashed cache tag');
  assertIncludes(page, "tags: [tokenTag]", 'Digital Screens token-scoped screen cache');
  assertIncludes(page, 'tags: [`menu-store-${storeId}`]', 'Digital Screens store-scoped menu cache');
  assertNotIncludes(page, "tags: ['screen-data']", 'Digital Screens global screen cache fan-out');
  assertIncludes(page, 'if (!isValidScreenToken(token))', 'Digital Screens route token validation');

  assertIncludes(server, '.where("screenToken", "==", token)', 'Digital Screens private token lookup');
  assertIncludes(server, '.where("screen.screenToken", "==", token)', 'Digital Screens legacy compatibility lookup');
  assertIncludes(server, 'getPrivateScreenControlDocId(storeId)', 'Digital Screens exact private control identity');
  assertIncludes(server, 'privateControlTenantId !== tenantId', 'Digital Screens public tenant reconciliation');
  assertIncludes(server, 'resolveScreenNumberLocale', 'Digital Screens locale resolution');
  assertIncludes(server, 'getPublicStoreById(storeId)', 'Digital Screens public store eligibility');

  assertIncludes(seen, 'transaction.get(params.controlRef)', 'Digital Screens seen private control read');
  assertIncludes(seen, 'privateTokenMatches', 'Digital Screens seen private token binding');
  assertIncludes(seen, "where('screenToken', '==', token)", 'Digital Screens seen private lookup');
  assertIncludes(seen, "where('screen.screenToken', '==', token)", 'Digital Screens seen legacy lookup');
  assertIncludes(seen, "control?.tenantId || \"\") !== tenantScope.documentId", 'Digital Screens seen tenant reconciliation');
  assertIncludes(seen, "'screen.screenLastSeenAt': FieldValue.serverTimestamp()", 'Digital Screens seen server timestamp');

  assertIncludes(invalidation, 'getPrivateScreenTokenCacheTag(screenToken)', 'Digital Screens invalidation token cache tag');
  assertIncludes(invalidation, 'revalidateTag(result.tokenCacheTag', 'Digital Screens token cache invalidation');
  assertIncludes(invalidation, 'if (!screen || typeof screen.enabled !== "boolean")', 'Digital Screens non-initializing screen guard');
  assertNotIncludes(invalidation, 'if (!screen?.screenToken)', 'Digital Screens invalidation legacy token authority');
  assertIncludes(revalidation, 'body.touchScreen === true', 'Digital Screens explicit route touch');
  assertIncludes(revalidation, 'touchDigitalScreenContentVersionForStoreServer(', 'Digital Screens route server touch');
  assertIncludes(publicClientCache, 'touchScreen: true', 'Digital Screens menu mutation refresh');
  assertNotIncludes(publicClientCache, '@lib/screen/screenInvalidation', 'Digital Screens browser Firestore invalidation');
  assert(!exists('src/lib/screen/screenInvalidation.ts'), 'Digital Screens browser Firestore invalidation file must stay removed');
  assertIncludes(functionsInvalidation, "touchScreen: options.touchDigitalScreen === true", 'Digital Screens Functions routed token-cache refresh');
  assertIncludes(functionsInvalidation, "if (!screen || typeof screen.enabled !== 'boolean')", 'Digital Screens Functions fallback screen guard');
}

function verifyDisplayTruthAndQuality() {
  const menuBoard = read('src/app/screen/[token]/MenuBoardDisplay.tsx');
  const highlights = read('src/app/screen/[token]/ScreenDisplay.tsx');
  const runtime = read('src/lib/screen/screenRuntime.ts');
  const content = read('src/lib/screen/screenContent.ts');
  const adjust = read('src/components/shared/media/MediaImageAdjustModal.tsx');

  [menuBoard, highlights].forEach((display, index) => {
    const label = index === 0 ? 'Menu Board' : 'Highlights';
    assertIncludes(display, 'shouldUseDigitalScreenOfflineCache', `${label} cache truth guard`);
    assertIncludes(display, 'getPublicScreenStateDocId(storeId)', `${label} listener`);
    assertIncludes(display, "body: JSON.stringify({ token, storeId })", `${label} seen signal`);
    assertIncludes(display, 'if (!response.ok)', `${label} seen acknowledgement`);
    assertNotIncludes(display, 'console.', `${label} raw diagnostics`);
  });
  assertIncludes(runtime, 'input.online === false', 'Digital Screens offline-only cache');
  assertIncludes(runtime, 'cachedContentVersion', 'Digital Screens cache version equality');
  assertIncludes(runtime, 'safeHeight <= 800', 'Digital Screens 720p layout');
  assertIncludes(menuBoard, 'const MAX_TOTAL_ITEMS = 500;', 'Digital Screens fallback render cap');
  assertIncludes(menuBoard, 'const PAGE_DURATION_MS = 12000;', 'Digital Screens bounded page duration');
  assertIncludes(menuBoard, 'grid-template-columns: repeat(${layout.columnCount}', 'Digital Screens responsive columns');
  assertIncludes(menuBoard, '@media (max-height: 800px)', 'Digital Screens short-TV CSS');
  assertIncludes(menuBoard, 'storeInfo.locale', 'Digital Screens Menu Board locale');
  assertIncludes(highlights, 'storeInfo.locale', 'Digital Screens Highlights locale');
  assertIncludes(highlights, 'object-fit: contain;', 'Digital Screens owner artwork fit');
  assertIncludes(highlights, 'left: 24px;', 'Digital Screens store watermark attribution separation');
  assertIncludes(highlights, 'screenTimestampToMillis(slide.validUntil)', 'Digital Screens owner slide expiry refresh');
  assertIncludes(content, 'SCREEN_MENU_RENDER_ITEM_LIMIT = 500', 'Digital Screens render item cap');
  assertIncludes(content, 'normalized.toLocaleString(locale)', 'Digital Screens locale-aware number format');
  assertIncludes(adjust, "imageType === 'digitalScreenSlide'", 'Digital Screens upload safe-area preview');
  assertIncludes(adjust, '<LuQrCode', 'Digital Screens reserved QR preview');
}

function verifyOwnerExperience() {
  const health = read('src/lib/screen/screenHealth.ts');
  const desktop = read('src/components/templates/main-app/settings/DigitalScreenSettings/index.tsx');
  const desktopLink = read('src/components/templates/main-app/settings/DigitalScreenSettings/ScreenLink.tsx');
  const mobile = read('src/components/mobile/screens/MobileDigitalScreensScreen.tsx');
  const output = read('src/components/templates/main-app/useMenuList/index.tsx');
  const desktopAi = read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx');
  const mobileAi = read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx');

  assertIncludes(health, 'summary: "Link ready"', 'Digital Screens unobserved health');
  assertIncludes(health, 'summary: "Seen recently"', 'Digital Screens recent health');
  assertIncludes(health, 'summary: "Check TV"', 'Digital Screens stale health');
  [desktop, desktopLink, mobile, output].forEach((surface, index) => {
    assertIncludes(surface, 'getDigitalScreenHealth', `Digital Screens health surface ${index + 1}`);
  });
  assertNotIncludes(desktop, 'Running', 'Digital Screens desktop overclaim');
  assertNotIncludes(mobile, "'Connected'", 'Digital Screens mobile overclaim');
  assertIncludes(output, 'href="/business-settings?section=digital-screens"', 'Digital Screens setup deep link');
  assert(!exists('src/components/templates/main-app/settings/DigitalScreenSettings/CurrentSlides.tsx'), 'Digital Screens duplicate slide list must stay removed');
  assertIncludes(desktopAi, 'getScreenState()', 'Digital Screens desktop AI manager authorized token read');
  assertIncludes(mobileAi, 'getScreenState()', 'Digital Screens mobile AI manager authorized token read');
  assertNotIncludes(desktopAi, '(storeDetails as any)?.screen?.screenToken', 'Digital Screens desktop stale store token');
  assertNotIncludes(mobileAi, '(storeDetails as any)?.screen?.screenToken', 'Digital Screens mobile stale store token');
}

function verifyMigrationAndDocs() {
  const migration = read('scripts/backfill-digital-screen-private-controls.ts');
  const rulesTest = read('scripts/verification/test-digital-screens-rules.ts');
  assertIncludes(migration, "const confirmedProjectId = getArg('--confirm-project');", 'Digital Screens private migration confirmation');
  assertIncludes(migration, "if (!storeId && !allScreens)", 'Digital Screens private migration explicit scope');
  assertIncludes(migration, "'screen.screenToken': FieldValue.delete()", 'Digital Screens legacy token deletion');
  assertIncludes(migration, 'screenControl_${resolvedStoreId}', 'Digital Screens private control creation');
  assertIncludes(migration, 'digital_screen_private_control_backfill_failed', 'Digital Screens migration diagnostics');
  assertIncludes(rulesTest, 'await assertFails(getDoc(doc(ownerDb, PRIVATE_CONTROL_PATH)))', 'Digital Screens private control rule test');
  assertIncludes(rulesTest, "'screen.contentVersion': 2", 'Digital Screens canonical mutation rule test');
  assertIncludes(rulesTest, 'await assertFails(setDoc(doc(ownerDb, SAFE_SCREEN_PATH)', 'Digital Screens mirror mutation rule test');

  [
    '__docs__/digital-screens/README.md',
    '__docs__/digital-screens/digital-screens_spec.md',
    '__docs__/digital-screens/digital-screens_impl.md',
    '__docs__/digital-screens/digital-screens_firebase.md',
    '__docs__/digital-screens/digital-screens_mobile-support.md',
    '__docs__/digital-screens/digital-screens_helpdoc.md',
  ].forEach((docPath) => {
    const doc = read(docPath);
    assertIncludes(doc, 'npm run verify:digital-screens-boundary', `${docPath} verifier`);
    assertIncludes(doc, 'private control', `${docPath} private token contract`);
  });
  assertIncludes(read('__docs__/digital-screens/digital-screens_improvements.md'), 'July 29, 2026', 'Digital Screens improvement log');
  assertIncludes(read('__docs__/changelog.md'), 'Digital Screens Truth and TV Output Hardening', 'Digital Screens changelog');
}

const checks = [
  ['package scripts', verifyPackageScripts],
  ['management authority', verifyManagementAuthority],
  ['public read and refresh', verifyPublicReadAndRefresh],
  ['display truth and quality', verifyDisplayTruthAndQuality],
  ['owner experience', verifyOwnerExperience],
  ['migration and docs', verifyMigrationAndDocs],
];

for (const [label, check] of checks) {
  check();
  console.log(`✓ ${label}`);
}

console.log('Digital Screens boundary verification passed.');
