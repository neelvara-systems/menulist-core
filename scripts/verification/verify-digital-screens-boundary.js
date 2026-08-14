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
  assertIncludes(scripts['verify:digital-screens-boundary'] || '', 'test:digital-screens:management-emulator', 'Digital Screens verifier');
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
  assertIncludes(route, 'getRateLimitForFeature(isRead ? "DATA_READ" : "DATA_WRITE")', 'Digital Screens method-aware rate limit');
  assertIncludes(route, 'digital-screen-management-${isRead ? "read" : "write"}', 'Digital Screens split read/write rate-limit bucket');
  assertIncludes(route, 'resolveCurrentSessionUserDocumentId(session)', 'Digital Screens exact actor rate-limit identity');
  assertIncludes(route, 'hashPublicRateLimitValue(scope.tenantId)', 'Digital Screens tenant-partitioned rate limit');
  assertIncludes(route, 'hashPublicRateLimitValue(scope.storeId)', 'Digital Screens store-partitioned rate limit');
  assertIncludes(route, 'getDigitalScreenManagementClientError(error)', 'Digital Screens expected mutation error projection');
  assertIncludes(route, '.max(FIRESTORE_TIMESTAMP_MAX_MILLISECONDS)', 'Digital Screens slide expiry Firestore timestamp ceiling');

  assertIncludes(contracts, '| { action: "initialize" }', 'Digital Screens explicit initialization');
  assertIncludes(contracts, 'screen: DigitalScreenOwnerStateTransport | null;', 'Digital Screens non-creating owner read');
  assertIncludes(contracts, 'code === "digital_screen_slide_limit_reached"', 'Digital Screens slide-limit conflict');
  assertIncludes(contracts, 'code === "digital_screen_slide_not_found"', 'Digital Screens stale-slide conflict');
  assertIncludes(contracts, 'code === "digital_screen_slide_id_conflict"', 'Digital Screens reused-slide identity conflict');
  assertIncludes(contracts, 'isDigitalScreenManagementResponse(', 'Digital Screens management response runtime contract');
  assertIncludes(contracts, 'screenSeenByMode?: DigitalScreenSeenByModeTransport;', 'Digital Screens bounded per-mode owner receipts');
  assertIncludes(contracts, 'FIRESTORE_TIMESTAMP_MAX_MILLISECONDS', 'Digital Screens response timestamp bound');
  assertIncludes(server, 'mutation?.action !== "initialize"', 'Digital Screens read does not initialize');
  assertIncludes(server, 'digital_screen_control_scope_invalid', 'Digital Screens private control scope guard');
  assertIncludes(server, 'digital_screen_control_missing', 'Digital Screens partial-state fail closed');
  assertIncludes(server, 'firestoreAdmin.runTransaction', 'Digital Screens canonical transaction');
  assertIncludes(server, 'transaction.get(storeRef)', 'Digital Screens transaction-current store authority');
  assertIncludes(server, 'transaction.get(tenantRef)', 'Digital Screens transaction-current tenant authority');
  assertIncludes(server, 'isCurrentScreenSeenPublicScope({', 'Digital Screens transaction-current public scope');
  assertIncludes(server, 'transaction.set(summaryRef, { screen: nextScreen }', 'Digital Screens canonical write');
  assertIncludes(server, 'transaction.set(controlRef,', 'Digital Screens private token write');
  assertIncludes(server, 'transaction.set(publicRef,', 'Digital Screens listener mirror write');
  assertIncludes(server, 'const { screenToken: _legacyToken, ...screenWithoutToken }', 'Digital Screens token removal');
  assertIncludes(server, 'if (!needsPersistence)', 'Digital Screens no-op read write suppression');
  assertIncludes(server, 'expiredSlidesPruned', 'Digital Screens expired custom-slide pruning');
  assertIncludes(server, 'validUntilMs > FIRESTORE_TIMESTAMP_MAX_MILLISECONDS', 'Digital Screens server slide expiry ceiling');

  assertIncludes(client, 'fetch("/api/digital-screens"', 'Digital Screens client uses protected API');
  assertIncludes(client, 'readJsonResponseWithLimit<unknown>', 'Digital Screens client bounded response parser');
  assertIncludes(client, 'DIGITAL_SCREEN_MANAGEMENT_RESPONSE_MAX_BYTES', 'Digital Screens response byte cap');
  assertIncludes(client, 'isDigitalScreenManagementResponse(result)', 'Digital Screens response runtime validation');
  assertNotIncludes(client, 'response.json() as Partial<DigitalScreenManagementResponse>', 'Digital Screens unbounded cast response parser');
  assertIncludes(client, 'callDigitalScreenManagementApi({ action: "initialize" })', 'Digital Screens explicit setup call');
  assertIncludes(client, 'const result = await callDigitalScreenManagementApi();', 'Digital Screens read failure propagation');
  assertNotIncludes(client, 'null,\n        "getScreenState"', 'Digital Screens read failure is not collapsed into absence');
  assertNotIncludes(client, 'transaction.set(getCampaignsSummaryDocRef(session), { screen }', 'Digital Screens client canonical write');

  assertIncludes(rules, "document.matches('^screenControl_[^_]+$')", 'Digital Screens private control rules');
  assertIncludes(rules, '&& !isPrivateScreenControlDoc(document)', 'Digital Screens private control read/write denial');
  assertIncludes(rules, 'preservesServerManagedScreenState(document)', 'Digital Screens canonical screen write protection');
  assertNotIncludes(rules, 'canWriteCurrentStorePublicScreenDoc', 'Digital Screens public mirror client writer');
}

function verifyPublicReadAndRefresh() {
  const page = read('src/app/screen/[token]/page.tsx');
  const retiredWorker = read('public/screen-sw.js');
  const server = read('src/database/campaigns/serverScreen.ts');
  const seen = read('src/app/api/screen/seen/route.ts');
  const seenServer = read('src/lib/screen/screenSeenServer.ts');
  const invalidation = read('src/lib/screen/serverScreenInvalidation.ts');
  const revalidation = read('src/app/api/revalidate/menu/route.ts');
  const publicClientCache = read('src/lib/cache/publicClientCache.ts');
  const publicScreenState = read('src/lib/screen/publicScreenState.ts');
  const functionsInvalidation = read('functions/src/logic/publicCacheRevalidation.ts');

  assertIncludes(page, 'getPrivateScreenTokenCacheTag(token)', 'Digital Screens token-hashed cache tag');
  assertIncludes(page, "tags: [tokenTag]", 'Digital Screens token-scoped screen cache');
  assertIncludes(page, 'tags: [`menu-store-${storeId}`]', 'Digital Screens store-scoped menu cache');
  assertNotIncludes(page, "tags: ['screen-data']", 'Digital Screens global screen cache fan-out');
  assertIncludes(page, 'if (!isValidScreenToken(token))', 'Digital Screens route token validation');
  assertIncludes(page, 'referrer: "no-referrer"', 'Digital Screens bearer-route referrer policy');
  assertIncludes(page, 'index: false', 'Digital Screens bearer-route noindex policy');
  assertIncludes(page, 'noarchive: true', 'Digital Screens bearer-route noarchive policy');
  assertIncludes(page, 'noimageindex: true', 'Digital Screens bearer-route noimageindex policy');
  assertIncludes(retiredWorker, "const RETIRED_SCREEN_CACHE = 'menulist-screen-v1';", 'Digital Screens retired worker cache identity');
  assertIncludes(retiredWorker, 'await caches.delete(RETIRED_SCREEN_CACHE);', 'Digital Screens retired worker cache cleanup');
  assertIncludes(retiredWorker, 'await self.registration.unregister();', 'Digital Screens retired worker self-unregistration');
  assertNotIncludes(retiredWorker, "self.addEventListener('fetch'", 'Digital Screens retired worker request interception');
  assertNotIncludes(retiredWorker, 'caches.keys()', 'Digital Screens retired worker cross-product cache enumeration');

  assertIncludes(server, '.where("screenToken", "==", token)', 'Digital Screens private token lookup');
  assertIncludes(server, '.where("screen.screenToken", "==", token)', 'Digital Screens legacy compatibility lookup');
  assertIncludes(server, 'getPrivateScreenControlDocId(storeId)', 'Digital Screens exact private control identity');
  assertIncludes(server, 'privateControlTenantId !== tenantId', 'Digital Screens public tenant reconciliation');
  assertIncludes(server, 'normalizeCachedScreenMenuItems(projection.items)', 'Digital Screens persisted projection item boundary');
  assertIncludes(server, 'Number.isSafeInteger(projection.contentVersion)', 'Digital Screens persisted projection version boundary');
  assertIncludes(server, 'isValidFirestoreDocumentId(projection.baseProjectId)', 'Digital Screens persisted projection project identity');
  assertIncludes(server, 'resolveScreenNumberLocale', 'Digital Screens locale resolution');
  assertIncludes(server, 'getPublicStoreById(storeId)', 'Digital Screens public store eligibility');

  assertIncludes(seenServer, 'transaction.get(params.controlRef)', 'Digital Screens seen private control read');
  assertIncludes(seenServer, 'privateTokenMatches', 'Digital Screens seen private token binding');
  assertIncludes(seen, "where('screenToken', '==', token)", 'Digital Screens seen private lookup');
  assertIncludes(seen, "where('screen.screenToken', '==', token)", 'Digital Screens seen legacy lookup');
  assertIncludes(seenServer, "control?.tenantId || \"\") !== tenantScope.documentId", 'Digital Screens seen tenant reconciliation');
  assertIncludes(seen, 'normalizeStorePermissionScopeDocumentId(rawStoreId)', 'Digital Screens seen exact supplied store identity');
  assertNotIncludes(seen, 'String(rawStoreId).trim()', 'Digital Screens seen must not trim a supplied store into different authority');
  assertIncludes(seenServer, '"screen.screenLastSeenAt": FieldValue.serverTimestamp()', 'Digital Screens seen server timestamp');
  assertIncludes(seen, 'const ScreenSeenRequestSchema = z.union([', 'Digital Screens seen runtime input contract');
  assertIncludes(seen, 'token: z.string().regex(SCREEN_TOKEN_PATTERN)', 'Digital Screens exact bearer-token admission');
  assertIncludes(seen, 'failClosedOnProviderError: true', 'Digital Screens seen limiter provider failure boundary');
  assertIncludes(seen, "status: reason === 'provider_unavailable' ? 503 : 429", 'Digital Screens seen limiter outage response');
  assertNotIncludes(seen, 'parsedRequest.token.trim()', 'Digital Screens must not trim bearer authority');
  assertIncludes(seenServer, 'getDigitalScreenSeenWriteDecision({', 'Digital Screens version-current seen decision');
  assertIncludes(seen, 'if (commitResult === \'stale_version\')', 'Digital Screens stale-version acknowledgement rejection');
  assertIncludes(seenServer, '`screen.screenSeenByMode.${params.mode}.contentVersion`', 'Digital Screens per-mode version receipt');
  assertIncludes(seenServer, '`screen.screenSeenByMode.${params.mode}.seenAt`', 'Digital Screens per-mode server timestamp');
  assertIncludes(seen, 'const TOKEN_RATE_LIMIT_ATTEMPTS = 12;', 'Digital Screens bounded multi-mode acknowledgement rate');
  assertIncludes(publicScreenState, 'getPublicScreenStateDocId', 'Digital Screens public mirror identity helper');
  assertNotIncludes(publicScreenState, 'setDoc', 'Digital Screens denied browser mirror writer');
  assertNotIncludes(publicScreenState, 'firebaseClient', 'Digital Screens public mirror browser authority');

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
  const displayStyles = read('src/app/screen/[token]/screenDisplay.module.scss');
  const server = read('src/database/campaigns/serverScreen.ts');
  const stores = read('src/database/stores/index.tsx');
  const runtime = read('src/lib/screen/screenRuntime.ts');
  const content = read('src/lib/screen/screenContent.ts');
  const adjust = read('src/components/shared/media/MediaImageAdjustModal.tsx');
  const slideGenerator = read('src/lib/screen/slideGenerator.ts');
  const campaignTypes = read('src/types/campaigns.ts');
  const seenHook = read('src/hooks/useDigitalScreenSeenSignal.ts');

  [menuBoard, highlights].forEach((display, index) => {
    const label = index === 0 ? 'Menu Board' : 'Highlights';
    assertIncludes(display, 'shouldUseDigitalScreenOfflineCache', `${label} cache truth guard`);
    assertIncludes(display, 'getPublicScreenStateDocId(storeId)', `${label} listener`);
    assertIncludes(display, 'if (!storeId || !firebaseClient)', `${label} missing Firebase fallback`);
    assertIncludes(display, 'logScreenDisplayFailure(', `${label} bounded listener diagnostics`);
    assertIncludes(display, 'digital_screen_', `${label} bounded diagnostic event`);
    assertIncludes(display, 'if (!snapshot.exists())', `${label} deleted mirror reload`);
    assertIncludes(display, 'cancelScheduledReload?.();', `${label} scheduled reload cleanup`);
    assertIncludes(display, '_guardedReloadWithRetry(', `${label} guarded immediate retry`);
    assertIncludes(display, 'useDigitalScreenSeenSignal({', `${label} seen signal`);
    assertNotIncludes(display, 'console.', `${label} raw diagnostics`);
  });
  assertIncludes(runtime, 'input.online === false', 'Digital Screens offline-only cache');
  assertIncludes(
    slideGenerator,
    'todayCampaign.confidence >= FEATURE_FLAGS.DIGITAL_SCREENS_CONFIDENCE_THRESHOLD',
    'Digital Screens campaign confidence uses the authoritative feature-registry threshold',
  );
  assertNotIncludes(
    campaignTypes,
    'SCREEN_CONFIDENCE_THRESHOLD',
    'Digital Screens campaign types must not duplicate the runtime confidence threshold',
  );
  assertIncludes(runtime, 'cachedContentVersion', 'Digital Screens cache version equality');
  assertIncludes(runtime, 'safeHeight <= 800', 'Digital Screens 720p layout');
  assertIncludes(runtime, 'getLeastUsedFittingScreenColumn', 'Digital Screens balanced column placement');
  assertIncludes(runtime, 'getFittingScreenColumnAssignments', 'Digital Screens exact bounded column fitting');
  assertIncludes(runtime, 'getSmallestFittingScreenColumnCount', 'Digital Screens content-aware column count');
  assertIncludes(highlights, '<div className="brand-name-large">{storeInfo.name || "Menu"}</div>', 'Digital Screens brand identity is visible with or without a logo');
  assertIncludes(highlights, 'if (imageFailed)', 'Digital Screens broken owner-poster fallback');
  assertIncludes(highlights, 'key={`${slide.id}:${slide.imageUrl}`}', 'Digital Screens broken-image state is isolated to one immutable owner slide');
  assertIncludes(highlights, '<BrandSlide qrReady={qrReady} qrUrl={qrUrl} storeInfo={storeInfo} />', 'Digital Screens owner-poster zero-blank fallback');
  assertIncludes(seenHook, 'body: JSON.stringify({ contentVersion, mode, storeId, token })', 'Digital Screens exact-version mode acknowledgement');
  assertIncludes(seenHook, 'completedSignals.has(marker) || activeSignals.has(marker)', 'Digital Screens duplicate client acknowledgement suppression');
  assertIncludes(seenHook, '`screen_seen_${token}_${mode}_${contentVersion}_${today}`', 'Digital Screens mode-version local acknowledgement key');
  assertIncludes(menuBoard, 'const MAX_TOTAL_ITEMS = 500;', 'Digital Screens fallback render cap');
  assertIncludes(menuBoard, 'const PAGE_DURATION_MS = 12000;', 'Digital Screens bounded page duration');
  assertIncludes(menuBoard, 'import styles from "./screenDisplay.module.scss";', 'Menu Board compiled display styles');
  assertIncludes(highlights, 'import styles from "./screenDisplay.module.scss";', 'Highlights compiled display styles');
  assertIncludes(menuBoard, 'className={`${styles.menuBoard} menu-board`}', 'Menu Board scoped display root');
  assertIncludes(menuBoard, 'data-columns={layout.columnCount}', 'Menu Board content-density style contract');
  assertIncludes(menuBoard, 'data-detail={showWideDescriptions ? "descriptions" : "compact"}', 'Menu Board description-density guard');
  assertIncludes(highlights, 'className={`${styles.highlights} screen-container`}', 'Highlights scoped display root');
  assertIncludes(menuBoard, '"--screen-columns": layout.columnCount', 'Digital Screens responsive column contract');
  assertIncludes(menuBoard, '"--screen-brand-accent": storeInfo.accentColor || DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR', 'Menu Board OBP accent propagation');
  assertIncludes(highlights, '"--screen-brand-accent": storeInfo.accentColor || DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR', 'Highlights OBP accent propagation');
  assertIncludes(runtime, 'DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR = "#f4b740"', 'Digital Screens fallback accent');
  assertIncludes(server, 'normalizePublicAccentColor(storeData?.publicPresence?.accentColor)', 'Digital Screens canonical OBP accent read');
  assertIncludes(stores, "Object.prototype.hasOwnProperty.call(data.publicPresence, 'accentColor')", 'Digital Screens OBP accent refresh');
  assertIncludes(displayStyles, 'var(--screen-brand-accent, #f4b740)', 'Digital Screens branded decorative accents');
  assertNotIncludes(menuBoard, 'data-accent=', 'Digital Screens must not invent a competing category accent palette');
  assertNotIncludes(displayStyles, '--category-accent', 'Digital Screens must use one OBP-derived decorative accent');
  assertIncludes(menuBoard, 'initial={false}', 'Menu Board first-frame visibility');
  assertIncludes(highlights, 'initial={false}', 'Highlights first-frame visibility');
  assertNotIncludes(menuBoard, '<style jsx', 'Menu Board runtime styled-jsx dependency');
  assertNotIncludes(highlights, '<style jsx', 'Highlights runtime styled-jsx dependency');
  assertIncludes(displayStyles, 'grid-template-columns: repeat(var(--screen-columns, 2)', 'Digital Screens responsive columns');
  assertIncludes(displayStyles, '-webkit-line-clamp: 2;', 'Digital Screens wide-TV full-name allowance');
  assertIncludes(displayStyles, '@media (max-height: 800px)', 'Digital Screens short-TV CSS');
  assertIncludes(displayStyles, '@media (prefers-reduced-motion: reduce)', 'Digital Screens reduced-motion support');
  assertIncludes(displayStyles, 'position: fixed;', 'Digital Screens viewport anchoring');
  assertIncludes(displayStyles, ':global(.slide-wrapper)', 'Highlights bounded slide wrapper');
  assertIncludes(displayStyles, 'position: absolute;', 'Highlights full-viewport slide positioning');
  assertIncludes(menuBoard, 'storeInfo.locale', 'Digital Screens Menu Board locale');
  assertIncludes(highlights, 'storeInfo.locale', 'Digital Screens Highlights locale');
  assertIncludes(displayStyles, 'object-fit: contain;', 'Digital Screens owner artwork fit');
  assertIncludes(displayStyles, 'top: 150px;', 'Digital Screens QR-safe offline status');
  assertIncludes(displayStyles, ':global(.slide-qr-label)', 'Digital Screens explained Highlights QR');
  assertIncludes(displayStyles, 'left: 22px;', 'Digital Screens store watermark attribution separation');
  assertIncludes(highlights, 'screenTimestampToMillis(slide.validUntil)', 'Digital Screens owner slide expiry refresh');
  assertIncludes(highlights, 'normalizeCachedScreenSlides(parsedCache.slides)', 'Highlights cached slide projection');
  assertIncludes(highlights, 'const initialTruthRef = useRef({', 'Highlights offline-first mount/server refresh distinction');
  assertIncludes(highlights, 'if (prev.slides.length === 0)', 'Highlights empty-slide rotation guard');
  assertIncludes(highlights, 'Number.isSafeInteger(prev.currentIndex)', 'Highlights rotation index normalization');
  assertIncludes(seenHook, '${diagnosticPrefix}_seen_storage_read_failed', 'Digital Screens blocked-storage read diagnostics');
  assertIncludes(seenHook, '${diagnosticPrefix}_seen_storage_write_failed', 'Digital Screens blocked-storage write diagnostics');
  assertIncludes(highlights, 'const fullscreenHintTimerRef = useRef<number | null>(null);', 'Highlights tracked fullscreen timer');
  assertIncludes(highlights, 'clearFullscreenHintTimer();', 'Highlights fullscreen timer reset');
  assertIncludes(highlights, 'window.clearTimeout(fullscreenHintTimerRef.current);', 'Highlights fullscreen timer cleanup');
  assertIncludes(menuBoard, 'normalizeCachedScreenMenuItems(', 'Menu Board cached item projection');
  assertIncludes(menuBoard, 'const initialTruthRef = useRef(', 'Menu Board server-truth reconciliation');
  assertIncludes(menuBoard, 'const totalPagesRef = useRef(totalPages);', 'Menu Board current pagination bound');
  assertIncludes(menuBoard, 'mode: "menu_board"', 'Menu Board mode-specific acknowledgement');
  assertIncludes(highlights, 'mode: "highlights"', 'Highlights mode-specific acknowledgement');
  assertIncludes(menuBoard, 'const fullscreenHintTimerRef = useRef<number | null>(null);', 'Menu Board tracked fullscreen timer');
  assertIncludes(menuBoard, 'clearFullscreenHintTimer();', 'Menu Board fullscreen timer reset');
  assertIncludes(menuBoard, 'window.clearTimeout(fullscreenHintTimerRef.current);', 'Menu Board fullscreen timer cleanup');
  assertIncludes(content, 'SCREEN_MENU_RENDER_ITEM_LIMIT = 500', 'Digital Screens render item cap');
  assertIncludes(content, 'normalized.toLocaleString(locale)', 'Digital Screens locale-aware number format');
  assertIncludes(adjust, "imageType === 'digitalScreenSlide'", 'Digital Screens upload safe-area preview');
  assertIncludes(adjust, '<LuQrCode', 'Digital Screens reserved QR preview');
  assert(!exists('src/app/screen-audit-preview/page.tsx'), 'Digital Screens audit fixture route must not ship');
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
  assertIncludes(health, 'summary: "Latest update seen"', 'Digital Screens exact-version mode health');
  assertIncludes(health, 'summary: "Update not seen"', 'Digital Screens pending-version mode health');
  [desktopLink, mobile].forEach((surface, index) => {
    assertIncludes(surface, 'getDigitalScreenModeHealth', `Digital Screens mode health surface ${index + 1}`);
  });
  assertIncludes(output, 'getDigitalScreenModeHealth', 'Digital Screens exact-version Output Center health');
  assertIncludes(output, 'screenContentVersion = screenState.contentVersion', 'Digital Screens Output Center canonical version read');
  assertIncludes(output, 'screenSeenByMode = screenState.screenSeenByMode', 'Digital Screens Output Center mode receipt read');
  assertIncludes(output, 'data.screenSeenByMode?.menu_board', 'Digital Screens Output Center Menu Board receipt');
  assertIncludes(output, 'data.screenSeenByMode?.highlights', 'Digital Screens Output Center Highlights receipt');
  assertIncludes(output, 'use_menulist_screen_status_refresh_failed', 'Digital Screens Output Center refresh diagnostics');
  assertIncludes(output, 'aria-label="Refresh TV status"', 'Digital Screens Output Center explicit status refresh');
  assertNotIncludes(output, 'getDigitalScreenHealth(data.screenLastSeenAt)', 'Digital Screens Output Center legacy aggregate status');
  assertIncludes(desktopLink, 'Refresh TV status', 'Digital Screens desktop status refresh');
  assertIncludes(desktopLink, '<style jsx global>', 'Digital Screens desktop child-card style scope');
  assertIncludes(desktopLink, '.screen-link-section {', 'Digital Screens desktop scoped style wrapper');
  assertIncludes(desktopLink, '.screen-link-section .screen-preview.highlights {', 'Digital Screens desktop child preview namespace');
  assertIncludes(desktopLink, '.screen-link-section .preview-image {', 'Digital Screens desktop preview image namespace');
  assertNotIncludes(desktopLink, '\n                .preview-image {', 'Digital Screens desktop unscoped preview image style');
  assertNotIncludes(desktopLink, '\n                .screen-mode-card {', 'Digital Screens desktop unscoped mode-card style');
  assertIncludes(desktopLink, '@media (max-width: 640px)', 'Digital Screens desktop narrow-viewport layout');
  assertIncludes(desktopLink, '.screen-link-section .screen-mode-qr {\n                        display: none;', 'Digital Screens desktop narrow-viewport QR overflow guard');
  assertIncludes(mobile, 'Refresh TV status', 'Digital Screens mobile status refresh');
  assertIncludes(desktop, 'contentVersion: screenState.contentVersion', 'Digital Screens desktop current-version owner state');
  assertIncludes(desktop, 'Try again', 'Digital Screens desktop retryable load failure');
  assertIncludes(mobile, 'setContentVersion(state.contentVersion)', 'Digital Screens mobile current-version owner state');
  assertIncludes(mobile, 'if (loadError || !screenUrl)', 'Digital Screens mobile failure-before-controls boundary');
  assertIncludes(mobile, 'Try again', 'Digital Screens mobile retryable load failure');
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
  assertIncludes(migration, 'isCurrentScreenSeenPublicScope({', 'Digital Screens private migration current store/tenant authority');
  assertIncludes(migration, 'currentInput.tenantId !== input.tenantId', 'Digital Screens private migration tenant-change fence');
  assertIncludes(migration, 'control?.storeId !== currentInput.storeId', 'Digital Screens private control exact store identity');
  assertIncludes(migration, "initializeApp({ projectId }, ADMIN_APP_NAME)", 'Digital Screens private migration exact Admin project app');
  assertIncludes(migration, 'getFirestore(app)', 'Digital Screens private migration pinned Firestore app');
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
  [
    '__docs__/digital-screens/README.md',
    '__docs__/digital-screens/digital-screens_spec.md',
    '__docs__/digital-screens/digital-screens_impl.md',
    '__docs__/digital-screens/digital-screens_firebase.md',
  ].forEach((docPath) => {
    assertIncludes(read(docPath), 'publicPresence.accentColor', `${docPath} canonical OBP accent`);
  });
  [
    '__docs__/digital-screens/README.md',
    '__docs__/digital-screens/digital-screens_impl.md',
    '__docs__/digital-screens/digital-screens_mobile-support.md',
  ].forEach((docPath) => {
    assertIncludes(read(docPath), 'screenSeenByMode', `${docPath} exact-version mode receipt`);
  });
  assertIncludes(read('__docs__/digital-screens/digital-screens_improvements.md'), 'July 29, 2026', 'Digital Screens improvement log');
  assertIncludes(read('__docs__/digital-screens/digital-screens_improvements.md'), 'August 1, 2026 render-confidence correction', 'Digital Screens render-confidence improvement log');
  assertIncludes(read('__docs__/changelog.md'), 'Digital Screens Truth and TV Output Hardening', 'Digital Screens changelog');
  assertIncludes(read('__docs__/changelog.md'), 'Digital Screens Exact-Version Output Confidence', 'Digital Screens exact-version changelog');
  assertIncludes(read('AUDIT_REPORT.md'), 'Digital Screens Exact-Version Output Audit', 'Digital Screens audit report');
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
