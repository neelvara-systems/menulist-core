#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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

function assertOrder(content, first, second, label) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  assert(
    firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex,
    `${label} must include ${first} before ${second}`,
  );
}

function verifyPackageScript() {
  const packageJson = JSON.parse(read('package.json'));
  assert(
    packageJson.scripts['verify:digital-screens-boundary'] === 'node scripts/verification/verify-digital-screens-boundary.js',
    'package.json must expose verify:digital-screens-boundary',
  );
}

function verifyPublicScreenRoute() {
  const page = read('src/app/screen/[token]/page.tsx');
  const serverDal = read('src/database/campaigns/serverScreen.ts');
  const content = read('src/lib/screen/screenContent.ts');

  assertIncludes(page, 'unstable_cache', 'Digital Screens public route SSR cache');
  assertIncludes(page, "tags: ['screen-data']", 'Digital Screens public route screen cache tag');
  assertIncludes(page, 'getScreenDataByTokenServer', 'Digital Screens public route token resolver');
  assertIncludes(page, 'getUsableScreenMenuProjection', 'Digital Screens public route projection guard');
  assertIncludes(page, 'projectedMenuItems || await getCachedMenuItems', 'Digital Screens public route project fallback');
  assertIncludes(page, 'if (!token || token.length < 6 || token.length > 24)', 'Digital Screens public route token length guard');
  assertIncludes(page, 'if (mode === "menu_board")', 'Digital Screens public route menu board branch');
  assertIncludes(page, 'storeId: screenData.storeId', 'Digital Screens public route store id propagation');
  assertNotIncludes(page, 'dangerouslySetInnerHTML', 'Digital Screens public route raw HTML rendering');

  assertIncludes(serverDal, '.where("screen.screenToken", "==", token)', 'Digital Screens server DAL token lookup');
  assertIncludes(serverDal, 'if (!data.screen?.enabled) return null;', 'Digital Screens server DAL enabled-screen gate');
  assertIncludes(serverDal, 'if (storeData && (storeData.active === false || storeData.blocked === true)) return null;', 'Digital Screens server DAL public store gate');
  assertIncludes(serverDal, 'getUsableScreenProjectionContext', 'Digital Screens server DAL projection context guard');
  assertIncludes(serverDal, 'parseSummaryProjects', 'Digital Screens server DAL base menu fallback');
  assertIncludes(serverDal, 'logServerScreenFailure', 'Digital Screens server DAL bounded diagnostics');
  assertIncludes(serverDal, 'tokenLength: token.length', 'Digital Screens server DAL bounded token context');
  assertNotIncludes(serverDal, 'Token not found: ${token}', 'Digital Screens server DAL raw token diagnostics');

  assertIncludes(content, 'const SCREEN_MENU_PROJECTION_ITEM_LIMIT = 200', 'Digital Screens content projection item cap');
  assertIncludes(content, '.replace(/<[^>]*>/g, " ")', 'Digital Screens content HTML-like text stripping');
  assertIncludes(content, '.replace(/[\\u0000-\\u001F\\u007F]/g, " ")', 'Digital Screens content control character stripping');
  assertIncludes(content, 'TECHNICAL_CATEGORY_PATTERN.test(text)', 'Digital Screens category technical-id guard');
  assertIncludes(content, 'UUID_LIKE_PATTERN.test(text)', 'Digital Screens category UUID guard');
  assertIncludes(content, 'parseScreenPrice(item?.price)', 'Digital Screens price parser use');
  assertIncludes(content, 'normalizeScreenTags(item?.tags)', 'Digital Screens tag normalization');
  assertIncludes(content, 'dedupeScreenMenuItems', 'Digital Screens menu item dedupe');
}

function verifyPublicListenerMirror() {
  const publicState = read('src/lib/screen/publicScreenState.ts');
  const rules = read('firestore.rules');

  assertIncludes(publicState, 'getPublicScreenStateDocId', 'Digital Screens public state doc id helper');
  assertIncludes(publicState, '`screen_${storeId}`', 'Digital Screens public state mirror doc id');
  assertIncludes(publicState, 'Pick<DigitalScreenState, "contentVersion" | "enabled" | "lastContentChangeAt" | "screenToken">', 'Digital Screens public state field pick');
  assertIncludes(publicState, 'contentVersion,', 'Digital Screens public state content version field');
  assertIncludes(publicState, 'enabled: screen.enabled === true', 'Digital Screens public state enabled mirror');
  assertIncludes(publicState, 'screenToken,', 'Digital Screens public state token mirror');
  assertIncludes(publicState, 'storeId: normalizedStoreId', 'Digital Screens public state store mirror');
  assertIncludes(publicState, 'updatedAt: Timestamp.now()', 'Digital Screens public state update timestamp');
  assertIncludes(publicState, 'setDoc(getPublicScreenStateDocRef(storeId), publicState, { merge: false })', 'Digital Screens public state replace write');
  assertNotIncludes(publicState, 'pinnedSlides', 'Digital Screens public state owner slide data');
  assertNotIncludes(publicState, 'staffPrompt', 'Digital Screens public state staff prompt data');

  assertIncludes(rules, 'allow read: if isPublicScreenStateDoc(document)', 'Digital Screens Firestore public read rule');
  assertIncludes(rules, "document.matches('^screen_[^_]+$')", 'Digital Screens Firestore public doc id pattern');
  assertIncludes(rules, "'contentVersion',\n          'enabled',\n          'lastContentChangeAt',\n          'screenToken',\n          'storeId',\n          'updatedAt'", 'Digital Screens Firestore public field allowlist');
  assertIncludes(rules, "data.screenToken.matches('^[A-Za-z0-9_-]{6,24}$')", 'Digital Screens Firestore token shape');
  assertIncludes(rules, 'data.contentVersion >= 1', 'Digital Screens Firestore content version floor');
  assertIncludes(rules, '&& isTenantAdmin(string(request.auth.token.tenantId), summaryDocStoreId(document));', 'Digital Screens Firestore public mirror tenant write gate');
  assertNotIncludes(rules, 'match /platformSummary/{document} {\n      allow read: if true;', 'Digital Screens Firestore rules must not use blanket public platformSummary reads');
}

function verifyDisplayClients() {
  const highlights = read('src/app/screen/[token]/ScreenDisplay.tsx');
  const menuBoard = read('src/app/screen/[token]/MenuBoardDisplay.tsx');

  [
    [highlights, 'Highlights display', 'digital_screen_display', 'screen'],
    [menuBoard, 'Menu Board display', 'digital_screen_menuboard', 'menuboard'],
  ].forEach(([content, label, failurePrefix, reloadKey]) => {
    assertIncludes(content, 'SCREEN_SEEN_REQUEST_POLICY', `${label} seen-signal browser policy`);
    assertIncludes(content, "cache: 'no-store' as RequestCache", `${label} seen-signal no-store policy`);
    assertIncludes(content, "credentials: 'same-origin' as RequestCredentials", `${label} seen-signal same-origin policy`);
    assertIncludes(content, "redirect: 'manual' as RequestRedirect", `${label} seen-signal manual redirect policy`);
    assertIncludes(content, "fetch('/api/screen/seen'", `${label} seen-signal endpoint`);
    assertIncludes(content, '...SCREEN_SEEN_REQUEST_POLICY', `${label} seen-signal shared policy spread`);
    assertIncludes(content, "body: JSON.stringify({ token, storeId })", `${label} seen-signal token/store body`);
    assertIncludes(content, 'if (!response.ok)', `${label} rejected seen-signal branch`);
    assertIncludes(content, "localStorage.setItem(todayKey, '1');", `${label} seen marker after OK`);
    assertIncludes(content, `${failurePrefix}_seen_signal_failed`, `${label} seen-signal failure diagnostic`);
    assertIncludes(content, `${failurePrefix}_seen_signal_rejected`, `${label} seen-signal rejection diagnostic`);
    assertIncludes(content, 'getPublicScreenStateDocId(storeId)', `${label} public mirror listener`);
    assertIncludes(content, 'onSnapshot(docRef', `${label} direct document listener`);
    assertIncludes(content, 'getBoundedScreenStringContext', `${label} bounded diagnostics`);
    assertIncludes(content, `${failurePrefix}_listener_failed`, `${label} listener failure diagnostic`);
    assertIncludes(content, `_guardedReload('${reloadKey}')`, `${label} guarded reload identity`);
    assertIncludes(content, `_guardedReloadWithJitter('${reloadKey}')`, `${label} jittered reload identity`);
    assertNotIncludes(content, 'doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `campaigns_', `${label} internal campaign summary listener`);
    assertNotIncludes(content, 'console.', `${label} direct console diagnostics`);
    assertNotIncludes(content, 'requestFullscreen?.().catch(() => { })', `${label} swallowed fullscreen failure`);
  });
}

function verifySeenSignalRoute() {
  const route = read('src/app/api/screen/seen/route.ts');

  assertIncludes(route, "export const dynamic = 'force-dynamic';", 'Digital Screens seen route dynamic boundary');
  assertIncludes(route, 'SCREEN_SEEN_MAX_BODY_BYTES = 1024', 'Digital Screens seen route body cap');
  assertIncludes(route, 'rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES', 'Digital Screens seen route declared-size guard');
  assertIncludes(route, "getRateLimitForFeature('SCREEN_SEEN_SIGNAL')", 'Digital Screens seen route IP rate limit config');
  assertIncludes(route, 'hashPublicRateLimitValue(getClientIp(request))', 'Digital Screens seen route hashed IP key');
  assertIncludes(route, 'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES', 'Digital Screens seen route bounded body reader');
  assertIncludes(route, 'SCREEN_TOKEN_PATTERN.test(token)', 'Digital Screens seen route token pattern guard');
  assertIncludes(route, 'STORE_ID_PATTERN.test(normalizedStoreId)', 'Digital Screens seen route store id pattern guard');
  assertIncludes(route, 'hashPublicRateLimitValue(token)', 'Digital Screens seen route hashed token key');
  assertIncludes(route, 'key: `screen-seen:token:${storeHashSegment}:${screenTokenHash}`', 'Digital Screens seen route token limiter key');
  assertIncludes(route, 'limit: 1', 'Digital Screens seen route one-per-window token limiter');
  assertIncludes(route, 'window: TOKEN_RATE_LIMIT_WINDOW_SECONDS', 'Digital Screens seen route token limiter window');
  assertIncludes(route, 'screen?.screenToken !== token || screen?.enabled !== true', 'Digital Screens seen route direct token binding');
  assertIncludes(route, 'getEligiblePublicScreenStore(normalizedStoreId)', 'Digital Screens seen route direct public store gate');
  assertIncludes(route, 'CAMPAIGNS_SUMMARY_ID_PATTERN', 'Digital Screens seen route legacy summary id guard');
  assertIncludes(route, 'getEligiblePublicScreenStore(legacyStoreId)', 'Digital Screens seen route legacy public store gate');
  assertIncludes(route, 'lastSeenDate === todayDate', 'Digital Screens seen route daily write guard');
  assertIncludes(route, "'screen.screenLastSeenAt': FieldValue.serverTimestamp()", 'Digital Screens seen route liveness write');
  assertIncludes(route, "logScreenDisplayFailure('screen_seen_route_failed'", 'Digital Screens seen route bounded unexpected failure log');
  assertIncludes(route, "return NextResponse.json({ ok: true, error: 'logged' });", 'Digital Screens seen route fail-open display behavior');
  assertNotIncludes(route, 'key: `screen-seen:ip:${getClientIp', 'Digital Screens seen route raw IP limiter key');
  assertNotIncludes(route, 'key: `screen-seen:token:${normalizedStoreId}:${token}`', 'Digital Screens seen route raw token limiter key');
  assertOrder(route, 'rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES', "getRateLimitForFeature('SCREEN_SEEN_SIGNAL')", 'Digital Screens seen route declared-size before IP limiter');
  assertOrder(route, "getRateLimitForFeature('SCREEN_SEEN_SIGNAL')", 'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES', 'Digital Screens seen route IP limiter before body parse');
  assertOrder(route, 'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES', 'SCREEN_TOKEN_PATTERN.test(token)', 'Digital Screens seen route bounded parse before token validation');
  assertOrder(route, 'SCREEN_TOKEN_PATTERN.test(token)', 'hashPublicRateLimitValue(token)', 'Digital Screens seen route token validation before token hash limiter');
  assertOrder(route, 'hashPublicRateLimitValue(token)', 'firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)', 'Digital Screens seen route limiter before Firestore lookup');
}

function verifyInvalidationAndOwnerSettings() {
  const clientInvalidation = read('src/lib/screen/screenInvalidation.ts');
  const serverInvalidation = read('src/lib/screen/serverScreenInvalidation.ts');
  const publicClientCache = read('src/lib/cache/publicClientCache.ts');
  const storeDal = read('src/database/stores/index.tsx');
  const brandPropagation = read('src/database/multiOutlet/brandPropagation.ts');
  const campaignDal = read('src/database/campaigns/index.ts');
  const desktopSettings = read('src/components/templates/main-app/settings/DigitalScreenSettings/index.tsx');
  const desktopLink = read('src/components/templates/main-app/settings/DigitalScreenSettings/ScreenLink.tsx');
  const desktopUploads = read('src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx');
  const mobile = read('src/components/mobile/screens/MobileDigitalScreensScreen.tsx');

  assertIncludes(publicClientCache, 'await revalidatePublicClientCache(storeId, context);', 'Digital Screens public cache invalidation ordering');
  assertIncludes(publicClientCache, 'await touchDigitalScreenContentVersion(storeId, context, { projectId });', 'Digital Screens browser public cache screen touch');
  assertOrder(publicClientCache, 'await revalidatePublicClientCache(storeId, context);', 'await touchDigitalScreenContentVersion(storeId, context, { projectId });', 'Digital Screens browser screen touch after public cache request');

  assertIncludes(clientInvalidation, 'if (!screen?.screenToken)', 'Digital Screens browser invalidation no-partial-state guard');
  assertIncludes(clientInvalidation, 'buildScreenMenuProjection', 'Digital Screens browser invalidation projection refresh');
  assertIncludes(clientInvalidation, '"screen.contentVersion": increment(1)', 'Digital Screens browser invalidation canonical version bump');
  assertIncludes(clientInvalidation, 'await syncPublicScreenState(normalizedStoreId', 'Digital Screens browser invalidation public mirror sync');
  assertIncludes(clientInvalidation, 'digital_screen_content_version_touch_failed', 'Digital Screens browser invalidation bounded failure code');

  assertIncludes(serverInvalidation, 'if (!screen?.screenToken) return;', 'Digital Screens server invalidation no-partial-state guard');
  assertIncludes(serverInvalidation, 'const batch = firestoreAdmin.batch();', 'Digital Screens server invalidation batched write');
  assertIncludes(serverInvalidation, '.doc(`screen_${normalizedStoreId}`)', 'Digital Screens server invalidation public mirror doc');
  assertIncludes(serverInvalidation, '"screen.contentVersion": admin.firestore.FieldValue.increment(1)', 'Digital Screens server invalidation canonical version bump');
  assertIncludes(serverInvalidation, 'batch.set(publicScreenRef', 'Digital Screens server invalidation mirror write');
  assertIncludes(serverInvalidation, 'digital_screen_server_content_version_touch_failed', 'Digital Screens server invalidation bounded failure code');

  assertIncludes(storeDal, 'DIGITAL_SCREEN_STORE_OUTPUT_FIELDS', 'Digital Screens store-output field guard');
  assertIncludes(storeDal, 'await touchDigitalScreenContentVersion(data.storeId, "updateStore");', 'Digital Screens store-output refresh');
  assertIncludes(brandPropagation, 'hasDigitalScreenPropagatedOutputChanges(propagatedChanges)', 'Digital Screens multi-outlet field guard');
  assertIncludes(brandPropagation, 'await touchDigitalScreenContentVersion(outlet.storeId, "propagateMasterStoreChangesToOutlets");', 'Digital Screens multi-outlet refresh');

  assertIncludes(campaignDal, 'export function assertDigitalScreenMutationSucceeded', 'Digital Screens owner DAL mutation acknowledgement helper');
  assertIncludes(campaignDal, 'export function assertDigitalScreenSlideUploadSucceeded', 'Digital Screens owner DAL upload acknowledgement helper');
  assertIncludes(campaignDal, 'digital_screen_mutation_rejected', 'Digital Screens owner DAL default rejection code');

  [
    [desktopSettings, 'desktop settings'],
    [desktopUploads, 'desktop uploads'],
    [mobile, 'mobile settings'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'assertDigitalScreenMutationSucceeded(', `Digital Screens ${label} acknowledgement guard`);
    assertIncludes(content, 'logScreenSettingsFailure', `Digital Screens ${label} secure diagnostics`);
    assertNotIncludes(content, 'error?.message', `Digital Screens ${label} raw owner-visible exception text`);
  });

  [
    [desktopLink, 'desktop link', 'desktop_digital_screen'],
    [mobile, 'mobile link', 'mobile_digital_screen'],
  ].forEach(([content, label, prefix]) => {
    assertIncludes(content, 'copyScreenTextToClipboard(url)', `Digital Screens ${label} acknowledged copy helper`);
    assertIncludes(content, `${prefix}_link_open_failed`, `Digital Screens ${label} open failure diagnostic`);
    assertIncludes(content, `${prefix}_link_copy_failed`, `Digital Screens ${label} copy failure diagnostic`);
    assertIncludes(content, 'hasScreenClipboardWrite()', `Digital Screens ${label} clipboard support metadata`);
    assertIncludes(content, 'hasScreenCopyFallback()', `Digital Screens ${label} fallback support metadata`);
    assertIncludes(content, 'getBoundedScreenStringContext', `Digital Screens ${label} bounded URL diagnostics`);
    assertNotIncludes(content, 'await navigator.clipboard.writeText(url);', `Digital Screens ${label} unacknowledged Clipboard API success`);
    assertNotIncludes(content, 'document.execCommand("copy");\n            if', `Digital Screens ${label} unacknowledged textarea copy success`);
  });
}

function verifyDocsParity() {
  const readme = read('__docs__/digital-screens/README.md');
  const spec = read('__docs__/digital-screens/digital-screens_spec.md');
  const impl = read('__docs__/digital-screens/digital-screens_impl.md');
  const firebase = read('__docs__/digital-screens/digital-screens_firebase.md');
  const mobile = read('__docs__/digital-screens/digital-screens_mobile-support.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  [
    [readme, 'Digital Screens README'],
    [spec, 'Digital Screens spec'],
    [impl, 'Digital Screens implementation doc'],
    [firebase, 'Digital Screens Firebase doc'],
    [mobile, 'Digital Screens mobile doc'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'npm run verify:digital-screens-boundary', `${label} dedicated verifier command`);
    assertIncludes(content, 'source gate', `${label} source-gate wording`);
  });

  assertIncludes(readme, 'public-safe `platformSummary/screen_{storeId}` mirror', 'Digital Screens README public listener boundary');
  assertIncludes(spec, 'source-bounded screen runtime evidence; not current launch certification', 'Digital Screens spec source-bounded status');
  assertIncludes(spec, 'Current Release Boundary (July 2, 2026)', 'Digital Screens spec current release boundary');
  assertIncludes(spec, 'External Certification Runbook', 'Digital Screens spec external certification gate');
  assertIncludes(spec, 'browser TV smoke for Menu Board and Highlights display modes', 'Digital Screens spec browser TV smoke gate');
  assertIncludes(spec, 'authenticated owner settings QA for desktop and mobile setup/copy/upload actions', 'Digital Screens spec owner settings QA gate');
  assertIncludes(spec, 'physical-device QA for the target TV/tablet/browser environment', 'Digital Screens spec physical-device QA gate');
  assertIncludes(spec, 'Firebase deploy evidence where Firestore rules, Storage rules, indexes, or Cloud Function logic change', 'Digital Screens spec Firebase deploy gate');
  assertIncludes(spec, 'Vercel deploy evidence where app routes or display clients change', 'Digital Screens spec Vercel deploy gate');
  assertIncludes(spec, 'production-host smoke for the target tenant and screen URL', 'Digital Screens spec production-host smoke gate');
  assertNotIncludes(spec, 'Production complete. Only readability/reliability/scale fixes allowed.', 'Digital Screens spec stale production-complete status');
  assertIncludes(impl, 'Seen-signal request boundary', 'Digital Screens implementation seen-signal boundary');
  assertIncludes(firebase, 'Seen signal cheap-fail ordering', 'Digital Screens Firebase cheap-fail optimization');
  assertIncludes(firebase, 'source-gate note', 'Digital Screens Firebase source-gate note');
  assertIncludes(mobile, 'acknowledged browser-local copy contract', 'Digital Screens mobile acknowledged copy contract');
  assertIncludes(audit, 'Digital Screens boundary source-gate checkpoint', 'Production readiness audit Digital Screens checkpoint');
  assertIncludes(audit, 'Digital Screens spec launch-boundary checkpoint', 'Production readiness audit Digital Screens spec checkpoint');
  assertIncludes(audit, '`npm run verify:digital-screens-boundary`', 'Production readiness audit Digital Screens verifier command');
  assertIncludes(changelog, 'Digital Screens Spec Launch Boundary', 'Changelog Digital Screens spec boundary entry');
  assertIncludes(changelog, '`npm run verify:digital-screens-boundary` passed.', 'Changelog Digital Screens verifier evidence');
}

const checks = [
  ['package script', verifyPackageScript],
  ['public screen route', verifyPublicScreenRoute],
  ['public listener mirror', verifyPublicListenerMirror],
  ['display clients', verifyDisplayClients],
  ['seen-signal route', verifySeenSignalRoute],
  ['invalidation and owner settings', verifyInvalidationAndOwnerSettings],
  ['docs parity', verifyDocsParity],
];

for (const [label, fn] of checks) {
  fn();
  console.log(`✓ ${label}`);
}

console.log('Digital Screens boundary verification passed.');
