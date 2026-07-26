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
  assertIncludes(packageJson.scripts['verify:digital-screens-boundary'] || '', 'node scripts/verification/verify-digital-screens-boundary.js', 'Digital Screens package verifier script');
  assertIncludes(packageJson.scripts['verify:digital-screens-boundary'] || '', 'npm run test:screen-seen-scope', 'Digital Screens current seen-scope behavior gate');
  assertIncludes(packageJson.scripts['verify:digital-screens-boundary'] || '', 'npm run test:screen-timestamp', 'Digital Screens timestamp behavior gate');
  assertIncludes(packageJson.scripts['verify:digital-screens-boundary'] || '', 'npm run test:digital-screens:lifecycle', 'Digital Screens package verifier lifecycle gate');
  assertIncludes(packageJson.scripts['verify:digital-screens-boundary'] || '', 'npm run test:digital-screens:rules', 'Digital Screens package verifier rules gate');
  assertIncludes(packageJson.scripts['test:digital-screens:rules'] || '', 'test-digital-screens-rules.ts', 'Digital Screens Firestore rules package script');
  assertIncludes(packageJson.scripts['backfill:digital-screen-public-mirrors'] || '', 'backfill-digital-screen-public-mirrors.ts', 'Digital Screens mirror backfill package script');
}

function verifyPublicScreenRoute() {
  const page = read('src/app/screen/[token]/page.tsx');
  const serverDal = read('src/database/campaigns/serverScreen.ts');
  const content = read('src/lib/screen/screenContent.ts');

  assertIncludes(page, 'unstable_cache', 'Digital Screens public route SSR cache');
  assertIncludes(page, "tags: ['screen-data']", 'Digital Screens public route screen cache tag');
  assertIncludes(page, 'getScreenDataByTokenServer', 'Digital Screens public route token resolver');
  assertIncludes(page, 'getUsableScreenMenuProjection', 'Digital Screens public route projection guard');
  assertIncludes(page, 'projectedMenuItems || (await getCachedMenuItems', 'Digital Screens public route project fallback');
  assertIncludes(page, 'if (!isValidScreenToken(token))', 'Digital Screens public route token format guard');
  assertIncludes(page, 'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED)', 'Digital Screens public route feature kill switch');
  assertIncludes(page, 'if (mode === "menu_board")', 'Digital Screens public route menu board branch');
  assertIncludes(page, 'storeId: screenData.storeId', 'Digital Screens public route store id propagation');
  assertNotIncludes(page, 'dangerouslySetInnerHTML', 'Digital Screens public route raw HTML rendering');

  assertIncludes(serverDal, '.where("screen.screenToken", "==", token)', 'Digital Screens server DAL token lookup');
  assertIncludes(serverDal, 'if (!isValidScreenToken(token)) return null;', 'Digital Screens server DAL token format gate');
  assertIncludes(serverDal, '.limit(2)', 'Digital Screens server DAL duplicate-token detection limit');
  assertIncludes(serverDal, 'if (snapshot.size !== 1) return null;', 'Digital Screens server DAL unique token binding');
  assertIncludes(serverDal, 'data.screen.screenToken !== token', 'Digital Screens server DAL exact token binding');
  assertIncludes(serverDal, 'CAMPAIGN_SUMMARY_ID_PATTERN', 'Digital Screens server DAL campaign summary id guard');
  assertIncludes(serverDal, 'const storeData = await getPublicStoreById(storeId);', 'Digital Screens server DAL shared public store gate');
  assertIncludes(serverDal, 'if (!storeData) return null;', 'Digital Screens server DAL missing/blocked/deleted store fail-closed gate');
  assertIncludes(serverDal, "String(storeData.tenantId ?? storeData.tId ?? '') !== tenantId", 'Digital Screens server menu tenant/store ownership gate');
  assertIncludes(serverDal, 'if (baseProjectId && !isValidFirestoreDocumentId(baseProjectId)) return [];', 'Digital Screens server base project id guard');
  assertIncludes(serverDal, 'if (!isValidFirestoreDocumentId(projectId)) return null;', 'Digital Screens server project id guard');
  assertIncludes(serverDal, 'specialProject?.isSpecialMenu === true', 'Digital Screens server special menu type gate');
  assertIncludes(serverDal, 'getUsableScreenProjectionContext', 'Digital Screens server DAL projection context guard');
  assertIncludes(serverDal, 'parseSummaryProjects', 'Digital Screens server DAL base menu fallback');
  assertIncludes(serverDal, 'logServerScreenFailure', 'Digital Screens server DAL bounded diagnostics');
  assertIncludes(serverDal, 'tokenLength: token.length', 'Digital Screens server DAL bounded token context');
  assertNotIncludes(serverDal, 'Token not found: ${token}', 'Digital Screens server DAL raw token diagnostics');
  assertNotIncludes(serverDal, '// Silent fallback', 'Digital Screens server DAL silent project-summary failure');

  assertIncludes(content, 'const SCREEN_MENU_PROJECTION_ITEM_LIMIT = 200', 'Digital Screens content projection item cap');
  assertIncludes(content, '.replace(/<[^>]*>/g, " ")', 'Digital Screens content HTML-like text stripping');
  assertIncludes(content, '.replace(/[\\u0000-\\u001F\\u007F]/g, " ")', 'Digital Screens content control character stripping');
  assertIncludes(content, 'TECHNICAL_CATEGORY_PATTERN.test(text)', 'Digital Screens category technical-id guard');
  assertIncludes(content, 'UUID_LIKE_PATTERN.test(text)', 'Digital Screens category UUID guard');
  assertIncludes(content, 'const parsedPrice = getScreenItemPrice(item);', 'Digital Screens item/option price projection use');
  assertIncludes(content, 'getActivePublicItemPriceAttributes(item)', 'Digital Screens active option price boundary');
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
  assertNotIncludes(publicState, 'screenToken: string;', 'Digital Screens public state must not expose bearer token');
  assertNotIncludes(publicState, '        screenToken,', 'Digital Screens public state payload must not mirror bearer token');
  assertIncludes(publicState, 'storeId: normalizedStoreId', 'Digital Screens public state store mirror');
  assertIncludes(publicState, 'updatedAt: Timestamp.now()', 'Digital Screens public state update timestamp');
  assertIncludes(publicState, 'setDoc(getPublicScreenStateDocRef(storeId), publicState, { merge: false })', 'Digital Screens public state replace write');
  assertNotIncludes(publicState, 'pinnedSlides', 'Digital Screens public state owner slide data');
  assertNotIncludes(publicState, 'staffPrompt', 'Digital Screens public state staff prompt data');

  assertIncludes(rules, 'allow get: if isPublicScreenStateDoc(document)', 'Digital Screens Firestore exact public get rule');
  assertIncludes(rules, "document.matches('^screen_[^_]+$')", 'Digital Screens Firestore public doc id pattern');
  assertIncludes(rules, "'contentVersion',\n          'enabled',\n          'lastContentChangeAt',\n          'storeId',\n          'updatedAt'", 'Digital Screens Firestore token-free public field allowlist');
  assertNotIncludes(rules, "data.screenToken.matches('^[A-Za-z0-9_-]{6,24}$')", 'Digital Screens Firestore public mirror token validation');
  assertNotIncludes(rules, 'allow read: if isPublicScreenStateDoc(document)', 'Digital Screens Firestore public collection-list permission');
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
    assertIncludes(content, 'enabled !== true', `${label} disabled-screen reload guard`);
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
  const scope = read('src/lib/screen/screenSeenScope.ts');

  assertIncludes(route, "export const dynamic = 'force-dynamic';", 'Digital Screens seen route dynamic boundary');
  assertIncludes(route, 'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED)', 'Digital Screens seen route feature kill switch');
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
  assertIncludes(route, 'const rateLimitedSeenResponse = () => NextResponse.json(', 'Digital Screens seen route non-success limiter response');
  assertIncludes(route, "status: 429", 'Digital Screens seen route limiter HTTP status');
  assertIncludes(route, "headers: { 'Retry-After': String(TOKEN_RATE_LIMIT_WINDOW_SECONDS) }", 'Digital Screens seen route retry-after contract');
  assert(/if \(!ipRateLimit\.allowed\) \{\s+return rateLimitedSeenResponse\(\);\s+\}/.test(route), 'Digital Screens seen route IP limiter must not acknowledge persistence');
  assert(/if \(!tokenRateLimit\.allowed\) \{\s+return rateLimitedSeenResponse\(\);\s+\}/.test(route), 'Digital Screens seen route token limiter must not acknowledge persistence');
  assertIncludes(route, 'firestoreAdmin.runTransaction', 'Digital Screens seen route authority transaction');
  assertIncludes(route, 'transaction.get(params.screenRef)', 'Digital Screens seen route current screen read');
  assertIncludes(route, 'transaction.get(storeRef)', 'Digital Screens seen route current store read');
  assertIncludes(route, 'transaction.get(tenantRef)', 'Digital Screens seen route current tenant read');
  assertIncludes(route, 'screen?.screenToken !== params.token', 'Digital Screens seen route current token binding');
  assertIncludes(route, 'screen?.enabled !== true', 'Digital Screens seen route current enabled-state gate');
  assertIncludes(route, 'isCurrentScreenSeenPublicScope', 'Digital Screens seen route current public-scope gate');
  assertIncludes(route, "summaryRef.where('screen.screenToken', '==', token).limit(2).get()", 'Digital Screens seen route duplicate-token detection');
  assertIncludes(route, 'resolveUniqueLegacyScreenSeenStoreId(', 'Digital Screens seen route unique legacy candidate gate');
  assertIncludes(route, 'storeId: targetStoreId', 'Digital Screens seen route direct and legacy transaction scope');
  assertIncludes(route, 'lastSeenDate === todayDate', 'Digital Screens seen route daily write guard');
  assertIncludes(route, 'transaction.update(params.screenRef', 'Digital Screens seen route transaction-bound liveness write');
  assertIncludes(route, "'screen.screenLastSeenAt': FieldValue.serverTimestamp()", 'Digital Screens seen route server timestamp');
  assertIncludes(route, "logScreenDisplayFailure('screen_seen_route_failed'", 'Digital Screens seen route bounded unexpected failure log');
  assertIncludes(route, "return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 503 });", 'Digital Screens seen route retryable unexpected failure');
  assertNotIncludes(route, "return NextResponse.json({ ok: true, error: 'logged' });", 'Digital Screens seen route must not cache failed writes as daily success');
  assertNotIncludes(route, 'key: `screen-seen:ip:${getClientIp', 'Digital Screens seen route raw IP limiter key');
  assertNotIncludes(route, 'key: `screen-seen:token:${normalizedStoreId}:${token}`', 'Digital Screens seen route raw token limiter key');
  assertOrder(route, 'rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES', "getRateLimitForFeature('SCREEN_SEEN_SIGNAL')", 'Digital Screens seen route declared-size before IP limiter');
  assertOrder(route, "getRateLimitForFeature('SCREEN_SEEN_SIGNAL')", 'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES', 'Digital Screens seen route IP limiter before body parse');
  assertOrder(route, 'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES', 'SCREEN_TOKEN_PATTERN.test(token)', 'Digital Screens seen route bounded parse before token validation');
  assertOrder(route, 'SCREEN_TOKEN_PATTERN.test(token)', 'hashPublicRateLimitValue(token)', 'Digital Screens seen route token validation before token hash limiter');
  assertOrder(route, 'hashPublicRateLimitValue(token)', 'firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)', 'Digital Screens seen route limiter before Firestore lookup');
  assertOrder(route, 'transaction.get(params.screenRef)', 'transaction.get(tenantRef)', 'Digital Screens seen route screen/store authority before tenant authority');
  assertOrder(route, 'transaction.get(tenantRef)', 'transaction.update(params.screenRef', 'Digital Screens seen route all authority reads before liveness write');
  assertIncludes(scope, 'if (summaryDocumentIds.length !== 1) return null;', 'Digital Screens legacy seen candidate uniqueness');
  assertIncludes(scope, 'CAMPAIGNS_SUMMARY_ID_PATTERN', 'Digital Screens legacy seen candidate summary-id guard');
}

function verifyInvalidationAndOwnerSettings() {
  const clientInvalidation = read('src/lib/screen/screenInvalidation.ts');
  const serverInvalidation = read('src/lib/screen/serverScreenInvalidation.ts');
  const publicClientCache = read('src/lib/cache/publicClientCache.ts');
  const storeDal = read('src/database/stores/index.tsx');
  const brandPropagation = read('src/database/multiOutlet/brandPropagation.ts');
  const brandPropagationRoute = read('src/app/api/outlets/brand-propagation/route.ts');
  const brandPropagationBoundary = read('src/lib/multiOutlet/brandPropagationBoundary.ts');
  const campaignDal = read('src/database/campaigns/index.ts');
  const preparedMediaUpload = read('src/database/storage/uploadPreparedMediaImage.ts');
  const desktopSettings = read('src/components/templates/main-app/settings/DigitalScreenSettings/index.tsx');
  const desktopLink = read('src/components/templates/main-app/settings/DigitalScreenSettings/ScreenLink.tsx');
  const useMenuListTypes = read('src/components/templates/main-app/useMenuList/types.ts');
  const screenTimestamp = read('src/lib/screen/screenTimestamp.ts');
  const screenUtils = read('src/lib/screen/utils.ts');
  const desktopUploads = read('src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx');
  const mobile = read('src/components/mobile/screens/MobileDigitalScreensScreen.tsx');
  const mobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
  const outputCenter = read('src/components/templates/main-app/useMenuList/index.tsx');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const desktopAiMenuManager = read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx');
  const mobileAiMenuManager = read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx');
  const aiMenuManagerExportUrls = read('src/lib/ai-menu-manager/localExportUrls.ts');
  const highlights = read('src/app/screen/[token]/ScreenDisplay.tsx');
  const functionsInvalidation = read('functions/src/logic/publicCacheRevalidation.ts');
  const mirrorBackfill = read('scripts/backfill-digital-screen-public-mirrors.ts');

  assertIncludes(publicClientCache, 'await revalidatePublicClientCache(storeId, context);', 'Digital Screens public cache invalidation ordering');
  assertIncludes(publicClientCache, 'await touchDigitalScreenContentVersion(storeId, context, { projectId });', 'Digital Screens browser public cache screen touch');
  assertOrder(publicClientCache, 'await revalidatePublicClientCache(storeId, context);', 'await touchDigitalScreenContentVersion(storeId, context, { projectId });', 'Digital Screens browser screen touch after public cache request');
  assertIncludes(publicClientCache, 'type PendingPublicCacheRevalidation', 'Digital Screens public cache pending entry contract');
  assertIncludes(publicClientCache, 'const pendingRevalidations = new Map<string, PendingPublicCacheRevalidation>();', 'Digital Screens public cache pending map keeps rerun state');
  assertIncludes(publicClientCache, 'pending.rerunRequested = true;', 'Digital Screens public cache same-store trailing revalidation marker');
  assertIncludes(publicClientCache, 'pending.context = context;', 'Digital Screens public cache same-store trailing context update');
  assertIncludes(publicClientCache, 'do {', 'Digital Screens public cache trailing revalidation loop');
  assertIncludes(publicClientCache, '} while (entry.rerunRequested);', 'Digital Screens public cache trailing revalidation loop condition');
  assertIncludes(publicClientCache, 'if (pendingRevalidations.get(normalizedStoreId) === entry)', 'Digital Screens public cache pending entry identity-safe cleanup');
  assertNotIncludes(publicClientCache, 'const pendingRevalidations = new Map<string, Promise<void>>();', 'Digital Screens public cache must not collapse later writes into a single promise');

  assertIncludes(clientInvalidation, 'if (!screen?.screenToken)', 'Digital Screens browser invalidation no-partial-state guard');
  assertIncludes(clientInvalidation, 'buildScreenMenuProjectionInTransaction', 'Digital Screens browser invalidation projection refresh');
  assertIncludes(clientInvalidation, 'await transaction.get(summaryRef)', 'Digital Screens projection summary transaction read');
  assertIncludes(clientInvalidation, 'await transaction.get(projectRef)', 'Digital Screens projection project transaction read');
  assertNotIncludes(clientInvalidation, 'getDoc(', 'Digital Screens projection must not escape its invalidation transaction');
  assertIncludes(clientInvalidation, 'await runTransaction(firebaseClient, async (transaction) => {', 'Digital Screens browser invalidation transaction boundary');
  assertIncludes(clientInvalidation, '"screen.contentVersion": nextContentVersion', 'Digital Screens browser invalidation exact transaction-local version bump');
  assertIncludes(clientInvalidation, 'transaction.set(publicScreenRef, publicState, { merge: false });', 'Digital Screens browser invalidation public mirror replacement');
  assertIncludes(clientInvalidation, 'digital_screen_content_version_touch_failed', 'Digital Screens browser invalidation bounded failure code');
  assertIncludes(clientInvalidation, 'type PendingScreenContentTouch', 'Digital Screens browser invalidation pending entry contract');
  assertIncludes(clientInvalidation, 'const pendingScreenTouches = new Map<string, PendingScreenContentTouch>();', 'Digital Screens browser invalidation pending map keeps rerun state');
  assertIncludes(clientInvalidation, 'pending.rerunRequested = true;', 'Digital Screens browser invalidation same-store trailing touch marker');
  assertIncludes(clientInvalidation, 'pending.context = context;', 'Digital Screens browser invalidation trailing context update');
  assertIncludes(clientInvalidation, 'pending.options = options;', 'Digital Screens browser invalidation trailing project options update');
  assertIncludes(clientInvalidation, 'do {', 'Digital Screens browser invalidation trailing touch loop');
  assertIncludes(clientInvalidation, '} while (entry.rerunRequested);', 'Digital Screens browser invalidation trailing touch loop condition');
  assertIncludes(clientInvalidation, 'if (pendingScreenTouches.get(normalizedStoreId) === entry)', 'Digital Screens browser invalidation pending entry identity-safe cleanup');
  assertNotIncludes(clientInvalidation, 'const pendingScreenTouches = new Map<string, Promise<void>>();', 'Digital Screens browser invalidation must not collapse later writes into a single promise');

  assertIncludes(serverInvalidation, 'if (!screen?.screenToken) return;', 'Digital Screens server invalidation no-partial-state guard');
  assertIncludes(serverInvalidation, 'await firestoreAdmin.runTransaction(async (transaction) => {', 'Digital Screens server invalidation transaction boundary');
  assertIncludes(serverInvalidation, '.doc(`screen_${normalizedStoreId}`)', 'Digital Screens server invalidation public mirror doc');
  assertIncludes(serverInvalidation, '"screen.contentVersion": nextContentVersion', 'Digital Screens server invalidation exact transaction-local version bump');
  assertIncludes(serverInvalidation, 'transaction.set(publicScreenRef', 'Digital Screens server invalidation mirror write');
  assertIncludes(serverInvalidation, '}, { merge: false });', 'Digital Screens server invalidation public mirror replacement');
  assertIncludes(serverInvalidation, 'digital_screen_server_content_version_touch_failed', 'Digital Screens server invalidation bounded failure code');
  assertNotIncludes(serverInvalidation, 'screenToken: screen.screenToken', 'Digital Screens server mirror bearer token');
  assertNotIncludes(functionsInvalidation, 'screenToken: screen.screenToken', 'Digital Screens Functions mirror bearer token');

  assertIncludes(storeDal, 'DIGITAL_SCREEN_STORE_OUTPUT_FIELDS', 'Digital Screens store-output field guard');
  assertIncludes(storeDal, 'await touchDigitalScreenContentVersion(data.storeId, "updateStore");', 'Digital Screens store-output refresh');
  assertIncludes(brandPropagationBoundary, 'hasDigitalScreenBrandPropagationFields', 'Digital Screens multi-outlet field guard');
  assertIncludes(brandPropagationRoute, 'storeIds: [masterStoreScope.documentId, ...propagationResult.targetOutletIds]', 'Digital Screens multi-outlet refresh uses committed target outlets');
  assertIncludes(brandPropagationRoute, 'includeScreenDataTag: refreshScreens', 'Digital Screens multi-outlet refresh keeps field-sensitive global invalidation');
  assertIncludes(brandPropagationRoute, "touchDigitalScreenContentVersionForStoreServer(storeId, 'brandPropagation')", 'Digital Screens multi-outlet refresh');

  assertIncludes(campaignDal, 'export function assertDigitalScreenMutationSucceeded', 'Digital Screens owner DAL mutation acknowledgement helper');
  assertIncludes(campaignDal, 'export function assertDigitalScreenSlideUploadSucceeded', 'Digital Screens owner DAL upload acknowledgement helper');
  assertIncludes(campaignDal, 'export const isDigitalScreenState = (value: unknown)', 'Digital Screens persisted state runtime validator');
  assertIncludes(campaignDal, 'screen.pinnedSlides.every(isPinnedScreenSlide)', 'Digital Screens persisted owner slide runtime validation');
  assertIncludes(campaignDal, "throw new Error('digital_screen_state_invalid')", 'Digital Screens invalid persisted state fail-closed branch');
  assertIncludes(campaignDal, "throw new Error('digital_screen_initialization_rejected')", 'Digital Screens initialization response contract guard');
  assertIncludes(campaignDal, 'digital_screen_mutation_rejected', 'Digital Screens owner DAL default rejection code');
  assertIncludes(campaignDal, 'const setScreenStateInTransaction = (', 'Digital Screens canonical/public mirror transaction helper');
  assertIncludes(campaignDal, 'transaction.set(getCampaignsSummaryDocRef(session), { screen }, { merge: true });', 'Digital Screens canonical transaction write');
  assertIncludes(campaignDal, 'transaction.set(getPublicScreenStateDocRef(session.sId), publicState, { merge: false });', 'Digital Screens public mirror transaction write');
  assertIncludes(campaignDal, 'return runTransaction(firebaseClient', 'Digital Screens owner mutations use Firestore transactions');
  assertIncludes(campaignDal, 'currentSlides.some((currentSlide) => currentSlide.id === slide.id)', 'Digital Screens duplicate slide retry guard');
  assertIncludes(campaignDal, 'getActivePinnedScreenSlides', 'Digital Screens expired slide pruning helper');
  assertIncludes(campaignDal, 'getActiveScreenSlides(slides, DIGITAL_SCREEN_MAX_UPLOADS)', 'Digital Screens shared active-slide cap helper');
  assertIncludes(campaignDal, 'filterExpiredSlides([result]).length === 1', 'Digital Screens upload rejects already-expired slides');
  assertIncludes(campaignDal, 'FEATURE_FLAGS.DIGITAL_SCREENS_MAX_UPLOADS', 'Digital Screens shared upload cap');
  assertIncludes(campaignDal, 'FEATURE_FLAGS.DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS', 'Digital Screens shared upload expiry');
  assertIncludes(campaignDal, 'getOwnerUploadExpiry(DIGITAL_SCREEN_UPLOAD_EXPIRY_DAYS)', 'Digital Screens upload expiry shared helper use');
  assertIncludes(campaignDal, "if (!targetSlide) throw new Error('digital_screen_slide_not_found');", 'Digital Screens caption update target acknowledgement');
  assertIncludes(campaignDal, 'uploadPreparedMediaImageWithLedger', 'Digital Screens upload variant ledger');
  assertNotIncludes(campaignDal, 'digital_screen_slide_upload_cleanup_failed', 'Digital Screens does not delete reusable content-addressed media after a Firestore failure');
  assertIncludes(preparedMediaUpload, 'const selectedPreparedVariant = preparedVariants.find(', 'Prepared media selects the currently persisted variant');
  assertIncludes(preparedMediaUpload, 'createOrReuseBlobInStorage({', 'Prepared media uses create-once immutable Storage writes');
  assertIncludes(preparedMediaUpload, 'variantUrls: [primaryUrl]', 'Prepared media records only the acquired persisted variant URL');
  assertNotIncludes(preparedMediaUpload, 'Promise.allSettled(preparedVariants.map', 'Prepared media does not upload unused sibling variants');
  assertNotIncludes(preparedMediaUpload, 'cleanupUploadedMediaUrls(', 'Prepared media does not delete a path that another concurrent record may already reuse');
  assertNotIncludes(preparedMediaUpload, 'prepared_media_partial_variant_cleanup_failed', 'Prepared media no longer exposes unsafe shared-path rollback cleanup');
  assertNotIncludes(campaignDal, 'export const getScreenDataByToken =', 'Digital Screens must not retain rules-incompatible browser public token resolver');
  assertNotIncludes(campaignDal, 'export const getMenuItemsForScreen =', 'Digital Screens must not retain Admin-parity browser project fallback');
  assertIncludes(screenTimestamp, 'export function screenTimestampToDate(value: unknown)', 'Digital Screens timestamp unknown-input boundary');
  assertIncludes(screenTimestamp, 'return validDateOrNull(timestamp.toDate());', 'Digital Screens timestamp toDate result validation');
  assertIncludes(screenTimestamp, 'typeof milliseconds === "number" && Number.isFinite(milliseconds)', 'Digital Screens timestamp millisecond validation');
  assertIncludes(screenTimestamp, 'export function isScreenExpiryValueExpired(', 'Digital Screens expiry fail-closed policy');
  assertIncludes(screenTimestamp, 'return expiryMilliseconds === null || expiryMilliseconds < nowMilliseconds;', 'Digital Screens malformed expiry rejection');
  assertIncludes(screenUtils, 'return isScreenExpiryValueExpired(slide.validUntil);', 'Digital Screens lifecycle shared expiry policy');
  assertIncludes(desktopLink, 'screenTimestampToDate(screenLastSeenAt)', 'Digital Screens desktop shared timestamp normalization');
  assertIncludes(mobile, 'screenTimestampToDate(screenLastSeenAt)', 'Digital Screens mobile shared timestamp normalization');
  assertIncludes(mobile, 'screenTimestampToMillis(left.validUntil) ?? 0', 'Digital Screens mobile safe expiry ordering');
  assertIncludes(mobile, 'function getDaysRemaining(validUntil: ScreenSlide["validUntil"])', 'Digital Screens mobile precise slide expiry contract');
  assertIncludes(desktopUploads, 'const getDaysRemaining = (validUntil: ScreenSlide["validUntil"])', 'Digital Screens desktop precise slide expiry contract');
  assertIncludes(desktopUploads, 'screenTimestampToMillis(validUntil)', 'Digital Screens desktop safe slide expiry projection');
  assertIncludes(desktopSettings, 'screenLastSeenAt?: DigitalScreenSeenTimestamp;', 'Digital Screens desktop settings precise seen timestamp');
  assertIncludes(useMenuListTypes, 'screenLastSeenAt: DigitalScreenSeenTimestamp;', 'Digital Screens Output Center precise seen timestamp');
  assertNotIncludes(desktopLink, 'screenLastSeenAt?: any;', 'Digital Screens desktop link broad seen timestamp');
  assertNotIncludes(mobile, 'useState<any>(null)', 'Digital Screens mobile broad seen timestamp state');
  assertNotIncludes(mobile, 'function getDaysRemaining(validUntil?: any)', 'Digital Screens mobile broad slide expiry contract');
  assertNotIncludes(desktopUploads, 'const getDaysRemaining = (validUntil?: any)', 'Digital Screens desktop broad slide expiry contract');
  assertNotIncludes(screenUtils, 'slide.validUntil as any', 'Digital Screens lifecycle unsafe expiry cast');
  assertNotIncludes(useMenuListTypes, 'screenLastSeenAt: any;', 'Digital Screens Output Center broad seen timestamp');

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

  assertIncludes(highlights, 'slides: state.slides', 'Digital Screens Highlights preserves the active cached fallback payload');
  assertIncludes(highlights, 'currentIndex: Math.min(prev.currentIndex, initialSlides.length - 1)', 'Digital Screens Highlights clamps the slide index after refresh');
  assertIncludes(mobile, 'FEATURE_FLAGS.DIGITAL_SCREENS_MAX_UPLOADS', 'Digital Screens mobile shared upload cap');
  assertIncludes(mobile, 'FEATURE_FLAGS.DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS', 'Digital Screens mobile shared expiry');
  assertIncludes(mobile, "trackOwnerControlUsage('screenOverride'", 'Digital Screens mobile owner-control parity');
  assertIncludes(mobileMore, 'FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED && canManageDigitalScreens', 'Digital Screens mobile navigation feature and permission gate');
  assertIncludes(mobileShare, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens mobile Share permission gate');
  assertIncludes(outputCenter, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens desktop Output Center permission gate');
  assertIncludes(outputCenter, 'canAccessDigitalScreens ? <>', 'Digital Screens desktop Output Center hidden surface gate');
  assertIncludes(businessSettings, 'canAccessDigitalScreens ? [{', 'Digital Screens desktop settings tab permission gate');
  assertIncludes(desktopSettings, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens settings component permission guard');
  assertIncludes(desktopSettings, 'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !canAccessDigitalScreens)', 'Digital Screens desktop settings pre-read feature and permission guard');
  assertIncludes(desktopSettings, 'requestId !== loadRequestRef.current', 'Digital Screens desktop settings stale permission-load refusal');
  assertIncludes(mobile, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens mobile settings internal permission guard');
  assertIncludes(mobile, 'if (!canAccessDigitalScreens)', 'Digital Screens mobile settings pre-read permission guard');
  assertIncludes(mobile, 'requestId !== loadRequestRef.current', 'Digital Screens mobile settings stale permission-load refusal');
  assertIncludes(desktopAiMenuManager, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens desktop Menu Manager link permission gate');
  assertIncludes(desktopAiMenuManager, 'screenToken: canAccessDigitalScreens', 'Digital Screens desktop Menu Manager token projection gate');
  assertIncludes(mobileAiMenuManager, 'PERMISSIONS.MANAGE_DIGITAL_SCREENS', 'Digital Screens mobile Menu Manager link permission gate');
  assertIncludes(mobileAiMenuManager, 'screenToken: canAccessDigitalScreens', 'Digital Screens mobile Menu Manager token projection gate');
  assertIncludes(aiMenuManagerExportUrls, 'if (!isValidScreenToken(token)) return', 'Digital Screens Menu Manager link token-format guard');

  assertIncludes(mirrorBackfill, "const confirmedProjectId = getArg('--confirm-project');", 'Digital Screens mirror backfill project confirmation');
  assertIncludes(mirrorBackfill, "if (!storeId && !allScreens)", 'Digital Screens mirror backfill explicit scope guard');
  assertIncludes(mirrorBackfill, "screen.screenToken", 'Digital Screens mirror backfill canonical token eligibility read');
  assertNotIncludes(mirrorBackfill, 'screenToken: screen.screenToken', 'Digital Screens mirror backfill public token write');
  assertIncludes(mirrorBackfill, '{ merge: false }', 'Digital Screens mirror backfill replaces legacy public shape');
}

function verifyDocsParity() {
  const readme = read('__docs__/digital-screens/README.md');
  const spec = read('__docs__/digital-screens/digital-screens_spec.md');
  const impl = read('__docs__/digital-screens/digital-screens_impl.md');
  const firebase = read('__docs__/digital-screens/digital-screens_firebase.md');
  const improvements = read('__docs__/digital-screens/digital-screens_improvements.md');
  const mobile = read('__docs__/digital-screens/digital-screens_mobile-support.md');
  const website = read('__docs__/digital-screens/digital-screens_website.md');
  const marketing = read('__docs__/digital-screens/digital-screens_marketing.md');
  const helpdoc = read('__docs__/digital-screens/digital-screens_helpdoc.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const launchPrerequisites = read('__docs__/production-readiness/launch-prerequisites.md');
  const ownerActions = read('__docs__/owner-action-items.md');
  const riskTracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
  const strictAuditTracker = read('__docs__/audits/menulist-feature-flow-audit-tracker.md');

  [
    [readme, 'Digital Screens README'],
    [spec, 'Digital Screens spec'],
    [impl, 'Digital Screens implementation doc'],
    [firebase, 'Digital Screens Firebase doc'],
    [improvements, 'Digital Screens improvements doc'],
    [mobile, 'Digital Screens mobile doc'],
    [website, 'Digital Screens website doc'],
    [marketing, 'Digital Screens marketing doc'],
    [helpdoc, 'Digital Screens help doc'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'npm run verify:digital-screens-boundary', `${label} dedicated verifier command`);
    assert(
      content.includes('source gate') || content.includes('Source Gate'),
      `${label} must include source-gate wording`,
    );
  });

  [
    [readme, 'Digital Screens README'],
    [spec, 'Digital Screens spec'],
    [impl, 'Digital Screens implementation doc'],
    [website, 'Digital Screens website doc'],
    [marketing, 'Digital Screens marketing doc'],
    [helpdoc, 'Digital Screens help doc'],
  ].forEach(([content, label]) => {
    [
      'always up to date',
      'Always up to date',
      'always current',
      'Always Current',
      'always-current',
      'always correct',
      'Always Correct',
      'updated in real-time',
      'updates in real-time',
      'real-time availability',
      'disappear instantly',
      'appears instantly',
      'screen updates instantly',
      'updates automatically',
      'Content updates automatically',
      'updates itself',
      'update themselves',
      'self-updating',
      'Self-updating',
      'live menu data',
      'at 8 PM',
      'shows whatever is in your menu right now',
      'never touch it again',
      'Never touch it',
      'Always showing',
      'always showing',
      'Auto-updating',
      'auto-updating',
      'Auto-Updating',
    ].forEach((stalePhrase) => {
      assertNotIncludes(content, stalePhrase, `${label} stale freshness copy`);
    });
  });

  assertIncludes(readme, 'public-safe `platformSummary/screen_{storeId}` mirror', 'Digital Screens README public listener boundary');
  assertIncludes(readme, '60-second `screen-data` server cache', 'Digital Screens README freshness cache boundary');
  assertIncludes(readme, 'screen content-version listener', 'Digital Screens README listener freshness boundary');
  assertIncludes(spec, 'source-bounded screen runtime evidence; not current launch certification', 'Digital Screens spec source-bounded status');
  assertIncludes(spec, '60-second `screen-data` server cache', 'Digital Screens spec freshness cache boundary');
  assertIncludes(spec, 'Manual browser refresh remains the owner-facing fallback', 'Digital Screens spec manual refresh fallback');
  assertIncludes(spec, 'Current Release Boundary (July 16, 2026)', 'Digital Screens spec current release boundary');
  assertIncludes(spec, 'External Certification Runbook', 'Digital Screens spec external certification gate');
  assertIncludes(spec, 'browser TV smoke for Menu Board and Highlights display modes', 'Digital Screens spec browser TV smoke gate');
  assertIncludes(spec, 'authenticated owner settings QA for desktop and mobile setup/copy/upload actions', 'Digital Screens spec owner settings QA gate');
  assertIncludes(spec, 'physical-device QA for the target TV/tablet/browser environment', 'Digital Screens spec physical-device QA gate');
  assertIncludes(spec, 'Firebase deploy evidence where Firestore rules, Storage rules, indexes, or Cloud Function logic change', 'Digital Screens spec Firebase deploy gate');
  assertIncludes(spec, 'Vercel deploy evidence where app routes or display clients change', 'Digital Screens spec Vercel deploy gate');
  assertIncludes(spec, 'production-host smoke for the target tenant and screen URL', 'Digital Screens spec production-host smoke gate');
  assertNotIncludes(spec, 'Production complete. Only readability/reliability/scale fixes allowed.', 'Digital Screens spec stale production-complete status');
  [
    [impl, 'Digital Screens implementation doc'],
    [firebase, 'Digital Screens Firebase doc'],
    [mobile, 'Digital Screens mobile doc'],
  ].forEach(([content, label]) => {
    [
      'Not current launch certification or deploy approval',
      'External Certification Runbook',
      '`npm run verify:production-readiness-local`',
      '`npm run verify:digital-screens-boundary`',
      'browser TV smoke for Menu Board and Highlights modes',
      'authenticated desktop/mobile owner settings QA',
      'physical-device TV/tablet/browser QA',
      'target Firebase deploy evidence where rules, indexes, Storage, or Functions change',
      'target Vercel deploy evidence where app routes or display clients change',
      'production-host smoke for the target tenant and screen URL',
    ].forEach((token) => assertIncludes(content, token, `${label} top launch boundary`));
  });
  assertIncludes(impl, 'Seen-signal request boundary', 'Digital Screens implementation seen-signal boundary');
  assertIncludes(impl, 'content-version listener', 'Digital Screens implementation listener refresh boundary');
  assertIncludes(impl, 'token-free public listener mirror', 'Digital Screens implementation token-free listener boundary');
  assertIncludes(impl, 'Token-Removal Rollout Order', 'Digital Screens implementation ordered migration boundary');
  assertIncludes(firebase, 'Seen signal cheap-fail ordering', 'Digital Screens Firebase cheap-fail optimization');
  assertIncludes(firebase, 'source-gate note', 'Digital Screens Firebase source-gate note');
  assertIncludes(firebase, 'contains no bearer screen token', 'Digital Screens Firebase token-free listener boundary');
  assertIncludes(improvements, 'Public Listener Mirror Exposed The Bearer Screen Token', 'Digital Screens improvements security finding');
  assertIncludes(mobile, 'acknowledged browser-local copy contract', 'Digital Screens mobile acknowledged copy contract');
  assertIncludes(website, 'current approved menu source', 'Digital Screens website current-source copy');
  assertIncludes(website, 'screen content-version listener', 'Digital Screens website listener refresh boundary');
  assertIncludes(marketing, 'saved MenuList source', 'Digital Screens marketing saved-source copy');
  assertIncludes(marketing, 'screen update path', 'Digital Screens marketing screen update path copy');
  assertIncludes(helpdoc, 'screen content-version listener', 'Digital Screens helpdoc listener refresh boundary');
  assertIncludes(audit, 'Digital Screens boundary source-gate checkpoint', 'Production readiness audit Digital Screens checkpoint');
  assertIncludes(audit, 'Digital Screens spec launch-boundary checkpoint', 'Production readiness audit Digital Screens spec checkpoint');
  assertIncludes(audit, 'Digital Screens freshness-copy boundary checkpoint', 'Production readiness audit Digital Screens freshness-copy checkpoint');
  assertIncludes(audit, 'Digital Screens technical-doc top-boundary checkpoint', 'Production readiness audit Digital Screens technical-doc checkpoint');
  assertIncludes(audit, '`npm run verify:digital-screens-boundary`', 'Production readiness audit Digital Screens verifier command');
  assertIncludes(audit, 'Digital Screens End-To-End Checkpoint - July 16, 2026', 'Production readiness audit current Digital Screens checkpoint');
  assertIncludes(audit, 'ordered cutover', 'Production readiness audit Digital Screens migration dependency');
  assertIncludes(changelog, 'Digital Screens End-To-End Hardening', 'Changelog current Digital Screens hardening entry');
  assertIncludes(changelog, 'Digital Screens Spec Launch Boundary', 'Changelog Digital Screens spec boundary entry');
  assertIncludes(changelog, 'Digital Screens Freshness-Copy Boundary', 'Changelog Digital Screens freshness-copy boundary entry');
  assertIncludes(changelog, 'Digital Screens Technical Doc Boundary', 'Changelog Digital Screens technical-doc boundary entry');
  assertIncludes(changelog, '`npm run verify:digital-screens-boundary` passed.', 'Changelog Digital Screens verifier evidence');
  assertIncludes(launchPrerequisites, 'Step 8B: Digital Screens Token-Free Public Mirror Cutover', 'Launch prerequisites Digital Screens migration runbook');
  assertOrder(launchPrerequisites, 'Deploy the current Next.js app', 'Deploy the affected Firebase Functions writers', 'Digital Screens migration app writer before Functions');
  assertOrder(launchPrerequisites, 'backfill:digital-screen-public-mirrors -- --project-id menulist-qa --all-screens --write', 'firebase deploy --project menulist-qa --config firebase.json --only firestore:rules', 'Digital Screens migration backfill before Firestore rule');
  assertIncludes(ownerActions, 'Digital Screens End-To-End Hardening — July 16, 2026', 'Owner actions Digital Screens rollout checklist');
  assertIncludes(riskTracker, 'QP-3', 'Infrastructure risk tracker Digital Screens public token item');
  assertIncludes(strictAuditTracker, '| 10 | Digital screens | Local source complete |', 'Strict audit tracker Digital Screens local status');
  assertIncludes(strictAuditTracker, 'Completed item 10 source boundary', 'Strict audit tracker Digital Screens completion evidence');
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
