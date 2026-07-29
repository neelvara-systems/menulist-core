require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertOrder(content, orderedTokens, label) {
  let previousIndex = -1;
  for (const token of orderedTokens) {
    const index = content.indexOf(token);
    assert(index !== -1, `${label} missing token ${token}`);
    assert(index > previousIndex, `${label} must keep token order at ${token}`);
    previousIndex = index;
  }
}

function assertNoDirectConsole(content, label) {
  const executableContent = stripJsComments(content);
  assert(
    !/\bconsole\.(?:error|warn|log)\s*\(/.test(executableContent),
    `${label} must not use direct console logging`,
  );
}

function assertNoMenuIntelligenceConsumer(content, label) {
  [
    'getMenuIntelligence',
    'getItemPresentation',
    'getItemsByPriority',
    'MENU_INTELLIGENCE',
    'MenuIntelligenceState',
    'menuIntelligence',
    '@lib/intelligence',
    'src/lib/intelligence',
  ].forEach((token) => {
    assertNotIncludes(content, token, `${label} CMI consumer boundary`);
  });
}

function stripJsComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function verifyManifestIdentity() {
  const { assertManifestStoreIdentity } = require('../../src/__tests__/manifestStoreIdentity');
  assertManifestStoreIdentity();
}

function verifyManifestLink() {
  const page = read('src/app/client/[[...slug]]/page.tsx');
  const clientLayout = read('src/app/client/layout.tsx');
  assertIncludes(page, "const manifestUrl = '/manifest.webmanifest';", 'client metadata');
  assertIncludes(page, 'startupImage: getStaticCustomerAppleStartupImages()', 'client metadata startup images');
  assertIncludes(clientLayout, 'startupImage: fallbackStartupImages', 'client layout fallback startup images');
  assertIncludes(clientLayout, 'const fallbackStartupImages = getStaticCustomerAppleStartupImages();', 'client layout static startup image helper');
  assertIncludes(clientLayout, "'color-scheme': 'light'", 'client layout color-scheme metadata');
  assertIncludes(clientLayout, 'background: #ffffff !important', 'client layout launch background');
  assertNotIncludes(page, 'manifest.webmanifest?start=', 'client metadata');
}

function verifyManifestRoute() {
  const route = read('src/app/manifest.webmanifest/route.ts');
  const manifestGenerator = read('src/lib/pwa/manifestGenerator.ts');
  const shortcutsBuilder = read('src/lib/pwa/shortcutsBuilder.ts');
  const customerAppImpl = read('__docs__/customer-app/customer-app_impl.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const executableRoute = stripJsComments(route);
  assertIncludes(route, 'getStoreManifestStartUrl', 'manifest route');
  assertIncludes(route, 'startUrl,', 'manifest route');
  assertIncludes(route, "requestHostname = h.get('host') || '';", 'manifest route Host-only tenant selector');
  assertNotIncludes(route, 'x-forwarded-host', 'manifest route must not accept forwarded-host tenant selection');
  assertIncludes(route, 'secureError(', 'manifest route secure failure logging');
  assertIncludes(route, "'[manifest] generation failed'", 'manifest route secure failure logging');
  assertIncludes(route, "new Error('customer_app_manifest_generation_failed')", 'manifest route normalized failure logging');
  assertIncludes(route, 'buildManifestFailureLogContext', 'manifest route bounded failure context');
  assertIncludes(route, 'hostnameLength: hostname.length', 'manifest route bounded host context');
  assertIncludes(route, 'storeIdLength: normalizedStoreId.length', 'manifest route bounded store context');
  assertIncludes(route, 'errorName: getBoundedErrorName(error) || typeof error', 'manifest route bounded error context');
  assertIncludes(route, "logRuntimeFailure('customer_app_manifest_start_url_lookup_failed'", 'manifest start-url lookup diagnostics');
  assertIncludes(route, 'MAX_MANIFEST_START_URL_DIAGNOSTICS', 'manifest start-url diagnostic cap');
  assertIncludes(route, 'reportedManifestStartUrlFailures.add(failureKey)', 'manifest start-url one-per-shape guard');
  assertIncludes(route, "getBoundedRuntimeStringContext('storeId', storeId)", 'manifest start-url bounded store context');
  assertIncludes(route, 'projectSummaryDocIdLength', 'manifest start-url bounded summary doc context');
  assertIncludes(route, "fallbackPolicy: 'use_root_manifest_start_url'", 'manifest start-url fallback policy');
  assertIncludes(route, 'returnsRootStartUrl: true', 'manifest start-url fallback result');
  assertIncludes(route, 'catch (error) {', 'manifest start-url catch source error');
  assertNotIncludes(route, '} catch {\n        // A transient summary read failure should not make the manifest invalid.', 'manifest start-url silent catch');
  assertNotIncludes(route, 'MANIFEST_START_URL_DEGRADED', 'manifest route');
  assertNotIncludes(route, 'resolveStartUrlWithFallback', 'manifest route');
  assertNotIncludes(executableRoute, 'console.error', 'manifest route executable code');
  assertIncludes(route, 'const contentLanguage = resolveStorePublicLanguage(store);', 'manifest route owner-controlled public language');
  assertIncludes(route, 'const t = createPublicCustomerTranslator(contentLanguage);', 'manifest route public translator');
  assertIncludes(route, 'language: contentLanguage,', 'manifest route language pass-through');
  assertIncludes(manifestGenerator, 'lang: activeLanguage,', 'manifest generator localized language');
  assertIncludes(manifestGenerator, 'dir: getPublicCustomerLanguageDirection(activeLanguage)', 'manifest generator localized direction');
  assertIncludes(shortcutsBuilder, 'appendPublicLanguageParam(url, activeLanguage)', 'manifest shortcut language preservation');
  assertIncludes(shortcutsBuilder, 'const t = createPublicCustomerTranslator(activeLanguage);', 'manifest shortcut localized labels');
  assertIncludes(customerAppImpl, 'customer_app_manifest_start_url_lookup_failed', 'Customer App implementation manifest start-url diagnostics');
  assertIncludes(customerAppFirebase, 'Manifest start-url lookup diagnostics', 'Customer App Firebase manifest start-url diagnostics');
  assertIncludes(productionAudit, 'Customer App manifest start-url diagnostics checkpoint', 'production audit manifest start-url checkpoint');
  assertIncludes(changelog, 'Customer App Manifest Start-URL Diagnostics', 'changelog manifest start-url checkpoint');
}

function verifyCustomerAppShortcutHandoffBoundary() {
  const clientNotFound = read('src/app/client/not-found.tsx');
  const shortcutHandoffUrl = read('src/app/client/pwa/shortcutHandoffUrl.ts');
  const externalRedirectClient = read('src/app/client/pwa/PwaExternalRedirectClient.tsx');
  const callClient = read('src/app/client/pwa/call/PwaCallHandoffClient.tsx');
  const directionsClient = read('src/app/client/pwa/directions/PwaDirectionsHandoffClient.tsx');
  const whatsappClient = read('src/app/client/pwa/whatsapp/PwaWhatsAppHandoffClient.tsx');
  const reservationPage = read('src/app/client/pwa/reservation/page.tsx');
  const orderPage = read('src/app/client/pwa/order/page.tsx');
  const directionsPage = read('src/app/client/pwa/directions/page.tsx');
  const customerAppImpl = read('__docs__/customer-app/customer-app_impl.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(clientNotFound, "getPublicCustomerLocale(requestedLanguage).split('-')[0] || 'en'", 'Customer App not-found supported language projection');
  assertNotIncludes(clientNotFound, 'setActiveLanguage(requestedLanguage)', 'Customer App not-found must not reflect a raw language query into document attributes');

  assertIncludes(shortcutHandoffUrl, 'const TEL_URL_PATTERN = /^tel:\\+[0-9]+$/;', 'Customer App shortcut tel URL shape guard');
  assertIncludes(shortcutHandoffUrl, "const WHATSAPP_HOST = 'wa.me';", 'Customer App shortcut WhatsApp host guard');
  assertIncludes(shortcutHandoffUrl, 'const WHATSAPP_PATH_PATTERN = /^\\/[0-9]+$/;', 'Customer App shortcut WhatsApp path guard');
  assertIncludes(shortcutHandoffUrl, 'return normalizeOBPExternalHttpsUrl(value);', 'Customer App shortcut HTTPS URL guard');
  assertIncludes(shortcutHandoffUrl, 'return normalizeOBPGoogleMapsUrl(value);', 'Customer App shortcut Google Maps URL guard');
  assertIncludes(shortcutHandoffUrl, 'parsed.hostname.toLowerCase() !== WHATSAPP_HOST', 'Customer App shortcut WhatsApp host enforcement');

  assertIncludes(externalRedirectClient, 'const safeTargetUrl = getSafePwaExternalHttpsUrl(targetUrl);', 'Customer App reservation/order client safe URL');
  assertIncludes(externalRedirectClient, 'if (!safeTargetUrl) {', 'Customer App reservation/order client fail-closed guard');
  assertIncludes(externalRedirectClient, 'window.location.replace(safeTargetUrl);', 'Customer App reservation/order client safe redirect');
  assertIncludes(externalRedirectClient, '<a href={safeTargetUrl}>{t(\'menu.continue\')}</a>', 'Customer App reservation/order client localized safe noscript link');
  assertIncludes(externalRedirectClient, 'createPublicCustomerTranslator(activeLanguage)', 'Customer App reservation/order client localized copy');
  assertNotIncludes(externalRedirectClient, 'window.location.replace(targetUrl);', 'Customer App reservation/order client raw redirect');
  assertNotIncludes(externalRedirectClient, '<a href={targetUrl}>Continue</a>', 'Customer App reservation/order client raw noscript link');

  assertIncludes(callClient, 'const safeTelUrl = getSafePwaTelUrl(telUrl);', 'Customer App call client safe URL');
  assertIncludes(callClient, 'if (!safeTelUrl) {', 'Customer App call client fail-closed guard');
  assertIncludes(callClient, 'window.location.replace(safeTelUrl);', 'Customer App call client safe redirect');
  assertIncludes(callClient, '<a href={safeTelUrl}>{t(\'menu.tapToCall\')}</a>', 'Customer App call client localized safe noscript link');
  assertIncludes(callClient, 'createPublicCustomerTranslator(activeLanguage)', 'Customer App call client localized copy');
  assertNotIncludes(callClient, 'window.location.replace(telUrl);', 'Customer App call client raw redirect');
  assertNotIncludes(callClient, '<a href={telUrl}>Tap to call</a>', 'Customer App call client raw noscript link');

  assertIncludes(directionsClient, 'const safeMapsUrl = getSafePwaGoogleMapsUrl(mapsUrl);', 'Customer App directions client safe URL');
  assertIncludes(directionsClient, 'if (!safeMapsUrl) {', 'Customer App directions client fail-closed guard');
  assertIncludes(directionsClient, 'window.location.replace(safeMapsUrl);', 'Customer App directions client safe redirect');
  assertIncludes(directionsClient, '<a href={safeMapsUrl}>{t(\'menu.openInMaps\')}</a>', 'Customer App directions client localized safe noscript link');
  assertIncludes(directionsClient, 'createPublicCustomerTranslator(activeLanguage)', 'Customer App directions client localized copy');
  assertNotIncludes(directionsClient, 'window.location.replace(mapsUrl);', 'Customer App directions client raw redirect');
  assertNotIncludes(directionsClient, '<a href={mapsUrl}>Open in Maps</a>', 'Customer App directions client raw noscript link');
  assertIncludes(directionsPage, 'type PwaDirectionsStore = {', 'Customer App directions fallback must use an explicit store projection.');
  assertIncludes(directionsPage, 'function projectPwaDirectionsStore(value: unknown): PwaDirectionsStore | null', 'Customer App directions fallback must project unknown store input at runtime.');
  assertIncludes(directionsPage, 'function buildMapsUrl(value: unknown)', 'Customer App directions fallback must admit persisted store input as unknown.');
  assertIncludes(directionsPage, 'const store = projectPwaDirectionsStore(value);', 'Customer App directions fallback must consume the explicit store projection.');
  assertNotIncludes(directionsPage, 'function buildMapsUrl(store: any)', 'Customer App directions fallback must not erase the public store contract.');

  assertIncludes(whatsappClient, 'const safeWaUrl = getSafePwaWhatsAppUrl(waUrl);', 'Customer App WhatsApp client safe URL');
  assertIncludes(whatsappClient, 'if (!safeWaUrl) {', 'Customer App WhatsApp client fail-closed guard');
  assertIncludes(whatsappClient, 'window.location.replace(safeWaUrl);', 'Customer App WhatsApp client safe redirect');
  assertIncludes(whatsappClient, '<a href={safeWaUrl}>{t(\'menu.openInWhatsApp\')}</a>', 'Customer App WhatsApp client localized safe noscript link');
  assertIncludes(whatsappClient, 'createPublicCustomerTranslator(activeLanguage)', 'Customer App WhatsApp client localized copy');
  assertNotIncludes(whatsappClient, 'window.location.replace(waUrl);', 'Customer App WhatsApp client raw redirect');
  assertNotIncludes(whatsappClient, '<a href={waUrl}>Open in WhatsApp</a>', 'Customer App WhatsApp client raw noscript link');

  assertIncludes(reservationPage, 'const reservationUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.reservationUrl);', 'Customer App reservation server URL normalization');
  assertIncludes(orderPage, 'const orderUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.orderUrl);', 'Customer App order server URL normalization');
  assertIncludes(reservationPage, 'if (store.publicPresence?.showReservation === false) return notFound();', 'Customer App reservation handoff must honor owner visibility.');
  assertIncludes(orderPage, 'if (store.publicPresence?.showOrder === false) return notFound();', 'Customer App order handoff must honor owner visibility.');
  assertIncludes(directionsPage, 'const direct = normalizeOBPGoogleMapsUrl(store?.publicPresence?.googleMapsUrl);', 'Customer App directions server URL normalization');

  assertIncludes(customerAppImpl, 'Shortcut handoff URL boundary', 'Customer App implementation shortcut handoff boundary docs');
  assertIncludes(customerAppFirebase, 'Shortcut handoff URL guard', 'Customer App Firebase shortcut handoff boundary docs');
  assertIncludes(productionAudit, 'Customer App shortcut handoff URL boundary checkpoint', 'Production audit Customer App shortcut handoff boundary');
  assertIncludes(changelog, 'Customer App Shortcut Handoff URL Boundary', 'Changelog Customer App shortcut handoff boundary');
}

function verifyCustomerServiceWorkerPolicy() {
  const sw = read('public/sw-customer.js');
  const register = read('src/components/ServiceWorkerRegister.tsx');
  const rootLayout = read('src/app/layout.tsx');
  const offlineHarness = read('scripts/verification/verify-customer-pwa-offline.mjs');
  const packageJson = JSON.parse(read('package.json'));
  const customerAppTest = read('__docs__/customer-app/customer-app_test.md');
  const certificationRunbook = read('__docs__/production-readiness/external-certification-runbook.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const executableSw = stripJsComments(sw);
  assertIncludes(sw, 'FROZEN: Offline page only. NEVER cached menu fallback.', 'customer service worker');
  assertIncludes(sw, "const OFFLINE_URL = '/offline';", 'customer service worker');
  assertIncludes(sw, "const OFFLINE_CACHE = 'customer-app-offline-v1';", 'customer service worker');
  assertNotIncludes(executableSw, '/_client', 'customer service worker executable code');
  assertNotIncludes(executableSw, 'firestore.googleapis.com', 'customer service worker executable code');
  assertNotIncludes(executableSw, 'cache.put', 'customer service worker executable code');
  assertIncludes(register, 'service_worker_domain_resolution_failed', 'service worker domain resolution diagnostics');
  assertIncludes(register, 'reportedServiceWorkerDomainResolutionFailure', 'service worker domain resolution one-per-path guard');
  assertIncludes(register, "getBoundedRuntimeStringContext('host', window.location.host)", 'service worker domain resolution bounded host metadata');
  assertIncludes(register, "failurePolicy: 'register_nothing'", 'service worker domain resolution fail-closed policy');
  assertIncludes(register, 'service_worker_unregister_failed', 'service worker registration cleanup diagnostics');
  assertIncludes(register, 'activeWorker: getRegisteredSwLabel(activeUrl)', 'service worker active-worker bounded label');
  assertIncludes(register, 'targetWorker: getTargetSwLabel(targetUrl)', 'service worker target-worker bounded label');
  assertIncludes(register, 'service_worker_script_url_label_parse_failed', 'service worker script-label parse diagnostics');
  assertIncludes(register, 'MAX_SERVICE_WORKER_SCRIPT_LABEL_DIAGNOSTICS', 'service worker script-label diagnostic cap');
  assertIncludes(register, "getBoundedRuntimeStringContext('scriptUrl', scriptUrl)", 'service worker script-label bounded URL metadata');
  assertIncludes(register, "fallbackPolicy: 'label_unknown'", 'service worker script-label fallback policy');
  assertIncludes(register, 'service_worker_public_cleanup_reload_storage_failed', 'service worker cleanup reload storage diagnostics');
  assertIncludes(register, "getBoundedRuntimeStringContext('reloadKey', PUBLIC_SW_CLEARED_RELOAD_KEY)", 'service worker reload guard bounded storage metadata');
  assertIncludes(register, "fallbackPolicy: 'reload_without_session_guard'", 'service worker reload guard fallback policy');
  assertNotIncludes(register, '} catch {\n        return null;\n    }', 'service worker domain resolution must not silently return null');
  assertNotIncludes(register, "} catch {\n        return 'unknown';\n    }", 'service worker script-label parse must not silently return unknown');
  assertNotIncludes(register, '} catch {\n                            window.location.reload();\n                        }', 'service worker cleanup reload storage failures must not silently reload');
  assertNotIncludes(register, 'reg.unregister().catch(() => { })', 'service worker unregister silent catch');
  assertIncludes(rootLayout, 'logDevServiceWorkerCleanupFailure', 'root development service-worker cleanup diagnostics');
  assertIncludes(rootLayout, 'get_registrations_failed', 'root development service-worker registration lookup diagnostics');
  assertIncludes(rootLayout, 'unregister_failed', 'root development service-worker unregister diagnostics');
  assertIncludes(rootLayout, 'hostLength', 'root development service-worker bounded host metadata');
  assertNotIncludes(rootLayout, '.catch(() => {});', 'root development service-worker silent catch');
  assert(
    packageJson.scripts?.['smoke:customer-pwa-offline'] === 'node scripts/verification/verify-customer-pwa-offline.mjs',
    'root package must expose the customer PWA offline browser smoke',
  );
  [
    "const tenantHostname = process.env.CUSTOMER_PWA_QA_TENANT_HOST || 'habibis.menulist.ai';",
    "const upstreamUrl = new URL(process.env.CUSTOMER_PWA_QA_UPSTREAM_URL || 'http://127.0.0.1:3000');",
    'function createLoopbackTenantProxy()',
    'tenantProxy.setOffline(true);',
    "await navigator.serviceWorker.register('/sw-customer.js', { scope: '/' });",
    "caches.open('customer-app-offline-v1')",
    "const offlineUrl = new URL('/offline', baseUrl).href;",
    "boundary: 'local_loopback_customer_worker_contract_only'",
    'productionRegistrationCertified: false',
    'pwaInstallCertified: false',
    'realDeviceCertified: false',
    'menuContentCached: !offlineCacheIsOfflineOnly',
  ].forEach((token) => assertIncludes(offlineHarness, token, 'customer PWA offline browser harness'));
  assertNotIncludes(offlineHarness, 'Network.emulateNetworkConditions', 'customer PWA offline harness deprecated CDP network emulation');
  assertNotIncludes(offlineHarness, 'Network.emulateNetworkConditionsByRule', 'customer PWA offline harness CDP network emulation');
  assertIncludes(customerAppTest, 'Local Customer-Worker Browser Smoke', 'Customer App local offline smoke test guide');
  assertIncludes(customerAppTest, 'Keep the installed-device airplane-mode step below open', 'Customer App real-device offline boundary');
  assertIncludes(certificationRunbook, 'harness-owned loopback tenant proxy', 'Gate 3 customer PWA loopback proxy contract');
  assertIncludes(certificationRunbook, 'This proves the local loopback customer-worker contract only.', 'Gate 3 customer PWA certification boundary');
  assertIncludes(productionAudit, 'External Certification Gate 3 Local Customer-Worker Offline Evidence - July 11, 2026', 'Production audit local customer PWA evidence');
  assertIncludes(changelog, 'Local Customer-Worker Offline Contract Evidence', 'Changelog local customer PWA evidence');
}

function verifyClientMenuOfflineDocsMatchServiceWorkerPolicy() {
  const sw = read('public/sw-customer.js');
  const offlinePage = read('src/app/offline/page.tsx');
  const readme = read('__docs__/client-menu/README.md');
  const spec = read('__docs__/client-menu/_spec.md');
  const impl = read('__docs__/client-menu/_impl.md');
  const marketing = read('__docs__/client-menu/_marketing.md');
  const website = read('__docs__/client-menu/client-menu_website.md');
  const helpdoc = read('__docs__/client-menu/client-menu_helpdoc.md');
  const mobileSupport = read('__docs__/client-menu/client-menu_mobile-support.md');
  const autosellSpec = read('__docs__/client-menu/autosell-features/_spec.md');
  const autosellImpl = read('__docs__/client-menu/autosell-features/_impl.md');
  const autosellFirebase = read('__docs__/client-menu/autosell-features/autosell-features_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    [readme, 'Client Menu README'],
    [spec, 'Client Menu spec'],
    [impl, 'Client Menu implementation'],
    [marketing, 'Client Menu marketing'],
    [website, 'Client Menu website'],
    [helpdoc, 'Client Menu helpdoc'],
    [mobileSupport, 'Client Menu mobile support'],
    [autosellSpec, 'AutoSell spec'],
    [autosellImpl, 'AutoSell implementation'],
    [autosellFirebase, 'AutoSell Firebase'],
  ].forEach(([content, label]) => {
    [
      'works offline thanks to built-in caching',
      'The menu works offline after the first load',
      'Offline mode works (cached content)',
      'Cached content visible',
      'Item opens (cached)',
      'Service worker, offline cache',
      'Service worker + cache',
      'next-pwa with service worker',
      'PWA caching',
      'PWA with service worker and no stale menu cache',
      'updates the moment you make a change',
      'updates itself',
      'see it instantly',
      'Customers see it instantly',
      'Customers see it immediately',
      'customers see it immediately',
      'Instant Availability',
      'Sold-out items fade instantly',
      '100% of updates reflected instantly',
      'Sold out items disappear instantly',
      'Change reflects in < 1 second',
      'Updates in real-time when owners make changes',
      'First Contentful Paint | < 1.5s',
      'Customer Decision Time | 60s → 15s',
      'Owner Effort           | Zero (auto-updates)',
      'Menu load time            | < 2 seconds',
      'Menu loads in < 2 seconds on 3G',
      'Menu loads in under 2 seconds on any device',
      'menu loading in under 2 seconds',
      'this takes about 30 seconds',
      'should load in under 2 seconds',
      'menu still perfect',
      'Cached content accessible',
      'see menu instantly',
      'Mark items sold out instantly',
      'Your menu, always live.',
      'the customer at 2:01 saw the new price',
      'customer seeing it at 2:01',
      'Get Your Live Menu',
      'Get your live menu',
      'the menu that runs itself',
      'The Menu That Runs Itself',
      'A live menu that thinks for itself',
      'Live menu.*real-time',
      'Update your menu from WhatsApp',
    ].forEach((stalePhrase) => {
      assertNotIncludes(content, stalePhrase, `${label} offline/freshness boundary`);
    });
  });

  assertIncludes(sw, 'FROZEN: Offline page only. NEVER cached menu fallback.', 'Customer service worker frozen offline policy');
  assertIncludes(sw, 'Menu HTML, menu data, Firestore responses, item images', 'Customer service worker no menu cache policy');
  assertIncludes(sw, 'When offline, the customer sees the branded /offline page.', 'Customer service worker branded offline fallback policy');
  assertIncludes(offlinePage, 'Reconnect to see the latest information.', 'Shared offline page reconnect copy');
  assertNotIncludes(offlinePage, 'latest live menu', 'Shared offline page customer-only reconnect copy');

  assertIncludes(readme, 'Offline fallback', 'Client Menu README offline fallback label');
  assertIncludes(readme, 'Customer service worker shows `/offline`; no stale menu cache', 'Client Menu README offline fallback copy');
  assertIncludes(spec, 'Offline mode shows a clear reconnect screen instead of cached menu content', 'Client Menu spec offline fallback requirement');
  assertIncludes(spec, 'SSR, Vercel Data Cache, optimized images', 'Client Menu spec performance mitigation');
  assertIncludes(spec, 'This historical spec does not certify fixed load-time, decision-time, engagement, retention, or real-time freshness metrics for the current release.', 'Client Menu spec fixed-metric launch boundary');
  assertIncludes(spec, 'Menu follows the target release performance budget verified by browser/device QA', 'Client Menu spec target-release performance boundary');
  assertIncludes(impl, 'Customer service worker with offline fallback only', 'Client Menu implementation PWA tech boundary');
  assertIncludes(impl, 'never caches menu HTML, menu data, Firestore', 'Client Menu implementation no menu cache boundary');
  assertIncludes(impl, 'Offline state must show reconnect screen, not stale menu content', 'Client Menu implementation offline expected behavior');
  assertIncludes(impl, 'Clear reconnect screen; no stale menu cache', 'Client Menu implementation validation offline boundary');
  assertIncludes(impl, 'Not certified by this historical implementation note', 'Client Menu implementation performance evidence boundary');
  assertIncludes(marketing, 'public menu refreshes through the current cache path', 'Client Menu marketing cache refresh copy');
  assertIncludes(marketing, 'one live menu link backed by the approved source', 'Client Menu marketing source-truth copy');
  assertIncludes(
    marketing,
    'Your menu link, backed by the approved source.',
    'Client Menu marketing bounded hero copy',
  );
  assertIncludes(
    marketing,
    'customers saw the approved menu after refresh',
    'Client Menu marketing bounded testimonial copy',
  );
  assertIncludes(
    marketing,
    'Get your approved menu link',
    'Client Menu marketing bounded CTA copy',
  );
  assertIncludes(
    marketing,
    'customer menu showing the approved version after refresh',
    'Client Menu marketing bounded launch-campaign hook',
  );
  assertIncludes(readme, '| Availability State      | Sold-out items fade after public menu refresh', 'Client Menu README availability cache-boundary copy');
  assertIncludes(spec, '| Availability State          | Sold-out items fade after public menu refresh', 'Client Menu spec availability cache-boundary copy');
  assertIncludes(spec, 'Current cache window can be up to 60 seconds', 'Client Menu spec availability cache window');
  assertIncludes(marketing, '| **Availability State**      | Sold out? It fades after the public menu refresh |', 'Client Menu marketing availability cache-boundary copy');
  assertIncludes(marketing, 'Customer menus refresh from the approved source', 'Client Menu marketing approved-source refresh copy');
  assertIncludes(autosellSpec, '| 2   | Availability State    | Item fades after public menu refresh', 'AutoSell spec availability cache-boundary row');
  assertIncludes(autosellSpec, 'Customer-visible freshness follows the current public cache path', 'AutoSell spec public cache boundary');
  assertIncludes(autosellImpl, '## Feature #2: Availability State', 'AutoSell implementation availability heading');
  assertIncludes(autosellFirebase, '### 2. Availability State (sold-out items fade after public menu refresh)', 'AutoSell Firebase availability cache-boundary heading');
  assertIncludes(website, 'MenuList does not serve cached menu content offline', 'Client Menu website offline fallback copy');
  assertIncludes(website, 'current cache refresh', 'Client Menu website cache refresh copy');
  assertIncludes(website, 'release-specific browser and device load evidence', 'Client Menu website fixed-speed evidence boundary');
  assertIncludes(helpdoc, 'offline screen and reloads the live menu after reconnecting', 'Client Menu helpdoc offline fallback copy');
  assertIncludes(helpdoc, 'Processing time depends on file quality, menu size, provider status, and current system load.', 'Client Menu helpdoc extraction timing boundary');
  assertIncludes(helpdoc, 'load speed still depends on menu size, images, device, connection, and current hosting/provider behavior.', 'Client Menu helpdoc load-speed boundary');
  assertIncludes(mobileSupport, 'Offline mode must show a clear reconnect screen instead of cached menu content that could be stale.', 'Client Menu mobile support offline fallback rule');
  assertIncludes(productionAudit, 'Client Menu availability refresh-copy checkpoint', 'Production audit Client Menu availability refresh-copy checkpoint');
  assertIncludes(productionAudit, 'Client Menu marketing freshness-copy checkpoint', 'Production audit Client Menu marketing freshness-copy checkpoint');
  assertIncludes(productionAudit, 'Client Menu performance and realtime-doc boundary checkpoint', 'Production audit Client Menu performance/realtime doc checkpoint');
  assertIncludes(changelog, 'Client Menu Availability Refresh Copy Boundary', 'Changelog Client Menu availability refresh-copy checkpoint');
  assertIncludes(changelog, 'Client Menu Marketing Freshness Copy Boundary', 'Changelog Client Menu marketing freshness-copy checkpoint');
  assertIncludes(changelog, 'Client Menu Performance Realtime Doc Boundary', 'Changelog Client Menu performance/realtime doc checkpoint');
}

function verifyCustomerAppPublicCopyFreshnessBoundary() {
  const customerAppSpec = read('__docs__/customer-app/customer-app_spec.md');
  const customerAppMobile = read('__docs__/customer-app/customer-app_mobile-support.md');
  const customerAppHelp = read('__docs__/customer-app/customer-app_helpdoc.md');
  const customerAppMarketing = read('__docs__/customer-app/customer-app_marketing.md');
  const customerAppWebsite = read('__docs__/customer-app/customer-app_website.md');
  const customerAppTest = read('__docs__/customer-app/customer-app_test.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  for (const [label, content] of [
    ['Customer App marketing doc', customerAppMarketing],
    ['Customer App website doc', customerAppWebsite],
    ['Customer App help doc', customerAppHelp],
    ['Customer App mobile doc', customerAppMobile],
    ['Customer App spec', customerAppSpec],
  ]) {
    [
      'Their app updates automatically. No action needed from you. No action needed from them.',
      'Their app updates automatically.',
      'Always Current',
      'Always current',
      'reflects it immediately',
      'Customers always see your current menu',
      'Updates automatically',
      'updates automatically when you update your menu',
      'syncs with live menu automatically',
      'Updates when you update your menu',
      'Live menu that updates itself',
      'No maintenance — updates when you update',
      'Your live menu opens instantly',
      'menu opens instantly',
      'opens instantly',
      'app icon appears instantly',
      'Takes 5 seconds',
      '3+ per customer',
      '+20% with Customer App',
      'Our repeat order rate is up since we turned this on.',
      'Order placed 30 seconds faster',
      'If this feature increased your repeat customers by even 5%',
      '| **MenuList Customer App** | **Included** | **Instant** | **Automatic** |',
      'This takes effect immediately.',
      'always fetches latest',
      "they'll see your latest menu immediately",
      'Completes in <5 seconds?',
      'Push notifications (deferred to future phase)',
      'One-tap access increases repeat visits',
      'MenuList powers thousands of branded apps',
      '>5% of repeat visitors',
      '>3 per installed user',
      '>60% enable the feature',
      '+20% repeat visit rate',
      'Weeks to build, $$$ to maintain',
      'Zero effort, zero maintenance',
      'Works on every phone',
      'works on Jio phone, iPhone, any phone',
      'Real apps cost ₹5-10 lakh',
      '90% of the value',
      'One tap opens the live menu',
      'one-tap access to your live menu',
      'One tap from home screen → live menu',
      'one tap opens your live menu',
      'They order faster. You earn loyalty easier.',
      'Increased repeat visits — reduced friction wins',
      'I recognize it instantly among my apps',
      'so it always works',
    ].forEach((stalePhrase) => {
      assertNotIncludes(content, stalePhrase, `${label} public freshness/social-proof boundary`);
    });
  }

  assertIncludes(customerAppSpec, 'return-from-hidden freshness safeguard', 'Customer App spec return-from-hidden freshness boundary');
  assertIncludes(customerAppSpec, 'Runtime source-gated evidence; not current launch certification', 'Customer App spec top launch boundary status');
  assertIncludes(customerAppSpec, 'Current Customer App release approval still requires the active [production-readiness audit]', 'Customer App spec current release gate');
  assertIncludes(customerAppSpec, 'must not evolve into periodic background syncing', 'Customer App spec no pseudo-realtime boundary');
  assertIncludes(customerAppSpec, 'Release-specific target; not certified by this spec', 'Customer App spec evidence-bound KPI targets');
  assertIncludes(customerAppSpec, 'Requires cohort analysis before any public claim', 'Customer App spec retention evidence boundary');
  assertIncludes(customerAppMobile, 'Runtime/mobile source evidence; not current mobile launch certification', 'Customer App mobile top launch boundary status');
  assertIncludes(customerAppMobile, 'real browser/device Customer App QA', 'Customer App mobile device QA release gate');
  assertIncludes(customerAppMobile, 'Short, thumb-friendly flow?', 'Customer App mobile no fixed-speed admission gate');
  assertIncludes(customerAppHelp, 'Source-backed help draft; not current support publication or launch certification', 'Customer App helpdoc top launch boundary status');
  assertIncludes(customerAppHelp, 'Current publication or release approval still requires the active [production-readiness audit]', 'Customer App helpdoc current publication gate');
  assertIncludes(customerAppHelp, 'After the save is acknowledged and the public menu path is available', 'Customer App helpdoc save acknowledgement freshness boundary');
  assertIncludes(customerAppHelp, 'the approved public menu after the supported cache or return-to-app refresh path completes', 'Customer App helpdoc public-cache freshness boundary');
  assertIncludes(customerAppWebsite, 'Source-backed website draft; not current publication or launch certification', 'Customer App website top launch boundary status');
  assertIncludes(customerAppWebsite, 'Current publication or release approval still requires the active [production-readiness audit]', 'Customer App website current publication gate');
  assertIncludes(customerAppWebsite, 'Customers see approved changes after the public cache or return-to-app refresh path completes.', 'Customer App website public-cache freshness copy');
  assertIncludes(customerAppWebsite, 'active sessions do not mutate in the background.', 'Customer App website active-session boundary copy');
  assertIncludes(customerAppWebsite, 'Use only an owner-approved quote from a live Customer App customer.', 'Customer App website social-proof evidence boundary');
  assertIncludes(customerAppMarketing, 'Source-backed marketing draft; not current sales, publication, or launch certification', 'Customer App marketing top launch boundary status');
  assertIncludes(customerAppMarketing, 'Current sales, publication, or release approval still requires the active [production-readiness audit]', 'Customer App marketing current sales/publication gate');
  assertIncludes(customerAppMarketing, 'Current public menu path', 'Customer App marketing current public path copy');
  assertIncludes(customerAppMarketing, 'supported public cache or return-to-app refresh path', 'Customer App marketing cache/refocus freshness copy');
  assertIncludes(customerAppMarketing, 'Use live Customer App analytics only after release evidence exists.', 'Customer App marketing analytics evidence boundary');
  assertIncludes(customerAppMarketing, 'Use exact cost comparisons only with current market evidence.', 'Customer App marketing cost-comparison evidence boundary');
  assertIncludes(customerAppTest, 'Pre-production validation checklist; not current launch certification', 'Customer App test top launch boundary status');
  assertIncludes(customerAppTest, 'This checklist is a release-evidence template, not current Customer App launch approval.', 'Customer App test release-evidence template boundary');
  assertIncludes(customerAppTest, '`npm run verify:customer-app-pwa`', 'Customer App test current verifier gate');
  assertIncludes(productionAudit, 'Customer App freshness public-copy boundary checkpoint', 'Production audit Customer App public-copy checkpoint');
  assertIncludes(productionAudit, 'Customer App companion evidence-bound docs checkpoint', 'Production audit Customer App companion-doc checkpoint');
  assertIncludes(productionAudit, 'Customer App top-level launch-boundary checkpoint', 'Production audit Customer App top-level launch-boundary checkpoint');
  assertIncludes(changelog, 'Customer App Freshness Public Copy Boundary', 'Changelog Customer App public-copy checkpoint');
  assertIncludes(changelog, 'Customer App Companion Evidence Boundaries', 'Changelog Customer App companion-doc checkpoint');
  assertIncludes(changelog, 'Customer App top-level launch boundaries are visible', 'Changelog Customer App top-level launch-boundary checkpoint');
}

function verifyCustomerAppTechnicalDocBoundaries() {
  const customerAppImpl = read('__docs__/customer-app/customer-app_impl.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(customerAppImpl, '**Launch boundary:** Not current launch certification or deploy approval.', 'Customer App implementation top launch boundary');
  assertIncludes(customerAppImpl, 'This implementation contract is source-gated runtime evidence; Customer App release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:customer-app-pwa`, real browser/device Customer App QA, target deploy evidence where relevant, and production-host smoke.', 'Customer App implementation current release gate');
  assertIncludes(customerAppFirebase, '**Launch boundary:** Not current launch certification or deploy approval.', 'Customer App Firebase top launch boundary');
  assertIncludes(customerAppFirebase, 'This Firebase cost doc is source-gated runtime/cost evidence; Customer App release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:customer-app-pwa`, real browser/device Customer App QA, scoped scheduler deploy evidence where relevant, analytics rollup evidence, and production-host smoke.', 'Customer App Firebase current release gate');
  assertIncludes(productionAudit, 'Customer App technical-doc top-boundary checkpoint', 'Production audit Customer App technical-doc top-boundary checkpoint');
  assertIncludes(changelog, 'Customer App technical docs have top launch boundaries', 'Changelog Customer App technical-doc top-boundary checkpoint');
}

function verifyOwnerSerwistScoping() {
  const packageJson = JSON.parse(read('package.json'));
  const declaredDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const ownerWorker = read('src/app/sw.ts');
  const serwistRoute = read('src/app/serwist/[path]/route.ts');
  const registration = read('src/components/ServiceWorkerRegister.tsx');
  assert(!declaredDependencies['next-pwa'], 'next-pwa must remain removed');
  assertIncludes(declaredDependencies['@serwist/turbopack'] || '', '9.5.12', 'Serwist build integration version');
  assertIncludes(declaredDependencies.serwist || '', '9.5.12', 'Serwist runtime version');
  assertIncludes(registration, "const OWNER_SW_URL = '/serwist/sw.js';", 'owner Serwist registration URL');
  assertIncludes(registration, "const LEGACY_OWNER_SW_URL = '/sw.js';", 'legacy owner worker cleanup URL');
  assertIncludes(serwistRoute, "additionalPrecacheEntries: [{ url: '/offline', revision }]", 'owner offline fallback precache');
  assertIncludes(serwistRoute, "`${distDir}/static/**/*.css`", 'bounded owner style precache');
  assertNotIncludes(serwistRoute, '**/*.js', 'owner global JavaScript precache');
  assertNotIncludes(ownerWorker, 'firestore.googleapis.com', 'Serwist runtimeCaching');
  assertNotIncludes(ownerWorker, 'firebasestorage.googleapis.com', 'Serwist runtimeCaching');
  assertNotIncludes(ownerWorker, '/api/public', 'Serwist runtimeCaching');
  assertNotIncludes(ownerWorker, "cacheName: 'static-assets'", 'owner PWA broad extension cache');
  assertNotIncludes(ownerWorker, "cacheName: 'owner-dashboard-pages'", 'owner PWA private dashboard cache');
  assertNotIncludes(ownerWorker, "cacheName: 'auth-pages'", 'owner PWA auth-page cache');
  assertNotIncludes(ownerWorker, "cacheName: 'screen-pages'", 'owner PWA screen-page cache');
  for (const cacheName of ['start-url', 'owner-dashboard-pages', 'auth-pages', 'screen-pages', 'firebase-images', 'static-assets']) {
    assertIncludes(ownerWorker, `'${cacheName}'`, `owner PWA retired ${cacheName} cleanup`);
  }
}

function verifyOwnerAuthManifest() {
  const authLayout = read('src/app/(global-pages)/layout.tsx');
  const mainLayout = read('src/app/(main)/layout.tsx');
  const mobileShell = read('src/components/mobile/MobileShell.tsx');
  const ownerManifest = JSON.parse(read('public/manifest.json'));
  const ownerIconFiles = [
    'public/apple-touch-icon.png',
    'public/favicon-16x16.png',
    'public/favicon-32x32.png',
    'public/favicon.ico',
    'public/icons/apple-touch-icon.png',
    'public/icons/apple-touch-icon-152x152.png',
    'public/icons/apple-touch-icon-167x167.png',
    'public/icons/apple-touch-icon-180x180.png',
    'public/icons/favicon-16x16.png',
    'public/icons/favicon-32x32.png',
    'public/icons/favicon.ico',
  ];

  assertIncludes(authLayout, "manifest: '/manifest.json'", 'owner auth layout metadata');
  assertIncludes(mainLayout, 'manifest: "/manifest.json"', 'owner dashboard layout metadata');
  assert(ownerManifest.start_url === '/today', 'owner manifest start_url must be /today');
  assert(ownerManifest.name === 'MenuList', 'owner manifest name must use the MenuList identity');
  assertIncludes(mobileShell, "'/dashboard': MOBILE_ROUTE_DEFAULT", 'owner mobile launch mapping');
  assert(ownerManifest.display === 'standalone', 'owner manifest display must be standalone');
  assert(ownerManifest.orientation === undefined, 'owner manifest must allow device rotation');
  assert(Array.isArray(ownerManifest.icons), 'owner manifest icons must be an array');
  const expectedOwnerShortcuts = [
    ['Today', '/today'],
    ['Menu', '/projects'],
    ['Share & QR', '/use-menulist'],
    ['Feedback', '/feedback'],
  ];
  assert(Array.isArray(ownerManifest.shortcuts), 'owner manifest shortcuts must be an array');
  assert(ownerManifest.shortcuts.length === expectedOwnerShortcuts.length, 'owner manifest shortcuts count changed');
  for (const [index, [name, url]] of expectedOwnerShortcuts.entries()) {
    const shortcut = ownerManifest.shortcuts[index];
    assert(shortcut?.name === name, `owner manifest shortcut ${index} must be ${name}`);
    assert(shortcut?.url === url, `owner manifest shortcut ${name} must launch ${url}`);
    assert(shortcut.url.startsWith('/'), `owner manifest shortcut ${name} must stay in manifest scope`);
  }
  for (const icon of ownerManifest.icons) {
    assert(icon.src, 'owner manifest icon must include src');
    assert(fs.existsSync(path.join(ROOT, 'public', icon.src)), `owner manifest icon file missing: ${icon.src}`);
  }
  for (const file of ownerIconFiles) {
    assert(fs.existsSync(path.join(ROOT, file)), `owner PWA icon file missing: ${file}`);
  }
}

function verifyOwnerFaviconsTransparent() {
  const faviconPngs = [
    'public/favicon-16x16.png',
    'public/favicon-32x32.png',
    'public/icons/favicon-16x16.png',
    'public/icons/favicon-32x32.png',
  ];

  for (const file of faviconPngs) {
    const png = PNG.sync.read(fs.readFileSync(path.join(ROOT, file)));
    const cornerAlpha = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
    ].map(([x, y]) => png.data[((png.width * y + x) << 2) + 3]);
    const visiblePixels = png.data.reduce((count, value, index) => (
      index % 4 === 3 && value > 8 ? count + 1 : count
    ), 0);
    let whiteTilePixels = 0;
    for (let index = 0; index < png.data.length; index += 4) {
      const alpha = png.data[index + 3];
      if (
        alpha > 8
        && png.data[index] > 235
        && png.data[index + 1] > 235
        && png.data[index + 2] > 235
      ) {
        whiteTilePixels += 1;
      }
    }

    assert(cornerAlpha.every((alpha) => alpha === 0), `${file} must have transparent corners`);
    assert(visiblePixels > 0, `${file} must contain visible logo pixels`);
    assert(whiteTilePixels > visiblePixels * 0.45, `${file} must use the white rounded favicon tile`);
  }
}

function verifyCustomerAppAssets() {
  const appIconRoute = read('src/app/api/app-icons/[storeId]/[size]/route.tsx');
  const appSplashRoute = read('src/app/api/app-splash/[storeId]/[size]/route.tsx');
  const appScreenshotRoute = read('src/app/api/app-screenshots/[storeId]/[formFactor]/route.tsx');
  const assetHelpers = read('src/lib/pwa/customerAppAssets.tsx');
  const clientPage = read('src/app/client/[[...slug]]/page.tsx');
  const manifestGenerator = read('src/lib/pwa/manifestGenerator.ts');
  const mobileSettings = read('src/components/mobile/screens/MobileCustomerAppScreen.tsx');
  const desktopSettings = read('src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx');
  const pwaDal = read('src/database/pwa/index.ts');
  const pwaIconStorageBoundary = read('src/lib/pwa/pwaIconStorageBoundary.ts');
  const publicStoreLookup = read('src/lib/firestore/clientStoreLookup.ts');
  const customerAppImpl = read('__docs__/customer-app/customer-app_impl.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const executableIconRoute = stripJsComments(appIconRoute);
  const executableSplashRoute = stripJsComments(appSplashRoute);
  const executableScreenshotRoute = stripJsComments(appScreenshotRoute);

  assertIncludes(publicStoreLookup, 'export const getPublicStoreById = cache(', 'public store-id lookup');
  assertIncludes(publicStoreLookup, 'data.active === false || data.deleted === true', 'public store-id lookup active/deleted guard');
  assertIncludes(publicStoreLookup, 'return await isStoreOrTenantIneligible(data) ? null : data;', 'public store-id lookup shared lifecycle/block guard');
  assertIncludes(appIconRoute, 'renderCustomerAppIcon', 'customer app icon route');
  assertIncludes(appIconRoute, "import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';", 'customer app icon route public store lookup');
  assertIncludes(appIconRoute, 'const store = await getPublicStoreById(storeId);', 'customer app icon route public store lookup');
  assertIncludes(appIconRoute, 'resolveCustomerAppIconSource', 'customer app icon route');
  assertIncludes(appIconRoute, "iconSource.source === 'override'", 'customer app icon route');
  assertIncludes(appIconRoute, 'customer_app_icon_generation_failed', 'customer app icon route bounded fallback logging');
  assertIncludes(appIconRoute, "getBoundedRuntimeStringContext('storeId', storeId)", 'customer app icon route bounded store context');
  assertIncludes(appIconRoute, 'const ipHash = hashPublicRateLimitValue(getClientIp(request));', 'customer app icon route hashed rate-limit IP key');
  assertIncludes(appIconRoute, 'key: `public-dynamic-asset:icon:${ipHash}`', 'customer app icon route must not store raw IP rate-limit keys');
  assertIncludes(appIconRoute, 'const STORE_ID_PATTERN = /^\\d{1,20}$/;', 'customer app icon route store-id shape guard');
  assertIncludes(appIconRoute, 'if (!STORE_ID_PATTERN.test(storeId)) return true;', 'customer app icon route invalid store fallback');
  assertOrder(
    appIconRoute,
    [
      'if (await shouldUseFallbackAsset(request, storeId)) {',
      'const store = await getPublicStoreById(storeId);',
    ],
    'customer app icon route fallback before store lookup',
  );
  assertNotIncludes(appIconRoute, "secureError('[app-icons] generation failed'", 'customer app icon route raw fallback logging');
  assertNotIncludes(appIconRoute, 'key: `public-dynamic-asset:icon:${getClientIp(request)}`', 'customer app icon route raw rate-limit IP key');
  assertNotIncludes(appIconRoute, 'firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get()', 'customer app icon route direct store read');
  assertNotIncludes(executableIconRoute, 'Response.redirect', 'customer app icon route executable code');
  assertNotIncludes(executableIconRoute, 'console.error', 'customer app icon route executable code');
  assertIncludes(appSplashRoute, 'renderCustomerAppSplash', 'customer app splash route');
  assertIncludes(appSplashRoute, "import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';", 'customer app splash route public store lookup');
  assertIncludes(appSplashRoute, 'const store = await getPublicStoreById(storeId);', 'customer app splash route public store lookup');
  assertIncludes(appSplashRoute, 'parseCustomerAppSplashSize', 'customer app splash route');
  assertIncludes(appSplashRoute, 'resolveCustomerAppIconSource', 'customer app splash route');
  assertIncludes(appSplashRoute, "iconSource.source === 'override' ? 0.88 : 0.72", 'customer app splash route');
  assertIncludes(appSplashRoute, 'customer_app_splash_generation_failed', 'customer app splash route bounded fallback logging');
  assertIncludes(appSplashRoute, "getBoundedRuntimeStringContext('storeId', storeId)", 'customer app splash route bounded store context');
  assertIncludes(appSplashRoute, 'const ipHash = hashPublicRateLimitValue(getClientIp(request));', 'customer app splash route hashed rate-limit IP key');
  assertIncludes(appSplashRoute, 'key: `public-dynamic-asset:splash:${ipHash}`', 'customer app splash route must not store raw IP rate-limit keys');
  assertIncludes(appSplashRoute, 'const STORE_ID_PATTERN = /^\\d{1,20}$/;', 'customer app splash route store-id shape guard');
  assertIncludes(appSplashRoute, 'if (!STORE_ID_PATTERN.test(storeId)) return true;', 'customer app splash route invalid store fallback');
  assertOrder(
    appSplashRoute,
    [
      'if (await shouldUseFallbackAsset(request, storeId)) {',
      'const store = await getPublicStoreById(storeId);',
    ],
    'customer app splash route fallback before store lookup',
  );
  assertNotIncludes(appSplashRoute, "secureError('[app-splash] generation failed'", 'customer app splash route raw fallback logging');
  assertNotIncludes(appSplashRoute, 'key: `public-dynamic-asset:splash:${getClientIp(request)}`', 'customer app splash route raw rate-limit IP key');
  assertNotIncludes(appSplashRoute, 'firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get()', 'customer app splash route direct store read');
  assertNotIncludes(executableSplashRoute, 'console.error', 'customer app splash route executable code');
  assertIncludes(appScreenshotRoute, 'renderScreenshot', 'customer app screenshot route');
  assertIncludes(appScreenshotRoute, "import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';", 'customer app screenshot route public store lookup');
  assertIncludes(appScreenshotRoute, 'const store = await getPublicStoreById(storeId);', 'customer app screenshot route public store lookup');
  assertIncludes(appScreenshotRoute, 'customer_app_screenshot_generation_failed', 'customer app screenshot route bounded fallback logging');
  assertIncludes(appScreenshotRoute, "getBoundedRuntimeStringContext('storeId', storeId)", 'customer app screenshot route bounded store context');
  assertIncludes(appScreenshotRoute, 'const ipHash = hashPublicRateLimitValue(getClientIp(request));', 'customer app screenshot route hashed rate-limit IP key');
  assertIncludes(appScreenshotRoute, 'key: `public-dynamic-asset:screenshot:${ipHash}`', 'customer app screenshot route must not store raw IP rate-limit keys');
  assertIncludes(appScreenshotRoute, 'const STORE_ID_PATTERN = /^\\d{1,20}$/;', 'customer app screenshot route store-id shape guard');
  assertIncludes(appScreenshotRoute, 'if (!STORE_ID_PATTERN.test(storeId)) return true;', 'customer app screenshot route invalid store fallback');
  assertIncludes(appScreenshotRoute, 'function parseFormFactor(raw: string): FormFactor | null', 'customer app screenshot route strict form-factor parser');
  assertIncludes(appScreenshotRoute, "if (raw === 'narrow' || raw === 'wide') return raw;", 'customer app screenshot route supports only manifest form factors');
  assertIncludes(appScreenshotRoute, "return new Response('Unsupported screenshot form factor', { status: 404 });", 'customer app screenshot route rejects unsupported form factors');
  assertOrder(
    appScreenshotRoute,
    [
      'const form = parseFormFactor(params.formFactor);',
      'if (!form) {',
      "return new Response('Unsupported screenshot form factor', { status: 404 });",
      'const storeId = params.storeId;',
      'if (await shouldUseFallbackAsset(request, storeId)) {',
    ],
    'customer app screenshot route rejects unsupported form factors before rate limit or store lookup',
  );
  assertOrder(
    appScreenshotRoute,
    [
      'if (await shouldUseFallbackAsset(request, storeId)) {',
      'const store = await getPublicStoreById(storeId);',
    ],
    'customer app screenshot route fallback before store lookup',
  );
  assertNotIncludes(appScreenshotRoute, "secureError('[app-screenshots] generation failed'", 'customer app screenshot route raw fallback logging');
  assertNotIncludes(appScreenshotRoute, 'key: `public-dynamic-asset:screenshot:${getClientIp(request)}`', 'customer app screenshot route raw rate-limit IP key');
  assertNotIncludes(appScreenshotRoute, 'firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get()', 'customer app screenshot route direct store read');
  assertNotIncludes(executableScreenshotRoute, 'console.error', 'customer app screenshot route executable code');
  assertIncludes(assetHelpers, 'CUSTOMER_APPLE_STARTUP_IMAGES', 'customer app asset helpers');
  assertIncludes(assetHelpers, 'deriveCustomerAppShortName', 'customer app asset helpers');
  assertIncludes(assetHelpers, 'getCustomerAppIconVersion', 'customer app asset helpers');
  assertIncludes(assetHelpers, 'getStaticCustomerAppleStartupImages', 'customer app asset helpers');
  assertIncludes(assetHelpers, "mode === 'generated'", 'customer app asset helpers');
  assertIncludes(assetHelpers, "objectFit: 'contain'", 'customer app asset helpers');
  assertIncludes(clientPage, 'deriveCustomerAppShortName(storeName, pwaShortName)', 'client metadata app title');
  assertIncludes(clientPage, 'getCustomerAppIconUrl(storeData.id, 180, pwaIconVersion)', 'client metadata app icon version');
  assertIncludes(clientPage, 'getStaticCustomerAppleStartupImages()', 'client metadata static startup image');
  assertIncludes(manifestGenerator, 'getCustomerAppIconUrl(input.id, size, input.iconVersion)', 'customer app manifest icons');
  assertIncludes(mobileSettings, "objectFit: 'contain'", 'mobile customer app icon preview');
  assertIncludes(mobileSettings, 'pwaIconUpdatedAt', 'mobile customer app icon cache busting');
  assertIncludes(desktopSettings, "objectFit: 'contain'", 'desktop customer app icon preview');
  assertIncludes(desktopSettings, 'pwaIconUpdatedAt', 'desktop customer app icon cache busting');
  assertIncludes(pwaDal, "'publicPresence.pwaIconUpdatedAt'", 'PWA DAL icon update timestamp');
  assertIncludes(pwaDal, 'assertPWASettingsUpdateSucceeded', 'PWA settings acknowledgement guard');
  assertIncludes(pwaDal, "throw new Error('pwa_settings_update_rejected');", 'PWA settings rejected acknowledgement code');
  assertIncludes(pwaDal, 'assertPWAIconOverrideUpdateSucceeded', 'PWA icon acknowledgement guard');
  assertIncludes(pwaDal, "throw new Error('pwa_icon_override_update_rejected');", 'PWA icon rejected acknowledgement code');
  assertIncludes(pwaDal, "const fileId = `${createRuntimeId('pwa_icon')}.png`;", 'PWA icon upload attempt-unique object identity');
  assertIncludes(pwaDal, 'cleanupPWAIconOverrideUrls', 'PWA icon shared post-commit cleanup boundary');
  assertIncludes(pwaDal, 'isOwnedPWAIconUrl(url, scope)', 'PWA icon cleanup same-bucket tenant ownership filter');
  assertIncludes(pwaDal, 'replacePWAIconOverride', 'PWA icon atomic lifecycle facade');
  assertIncludes(pwaDal, "await cleanupPWAIconOverrideUrls([uploadedUrl], 'replace', scope);", 'PWA icon failed-write upload compensation');
  assertIncludes(pwaDal, 'readCommittedPWAIconOverride(', 'PWA icon ambiguous write read-back boundary');
  assertIncludes(pwaDal, 'getDocFromServer(getDocRef(scope.storeId))', 'PWA icon read-back must not trust locally pending Firestore state');
  assertIncludes(pwaDal, 'pwa_icon_override_write_outcome_ambiguous', 'PWA icon ambiguous write diagnostic');
  assertIncludes(pwaDal, 'cleanupSupersededPWAIconUrl', 'PWA icon current-reference cleanup guard');
  assertIncludes(pwaDal, 'pwa_icon_superseded_cleanup_guard_failed', 'PWA icon guarded cleanup diagnostic');
  const pwaIconReplacementSection = pwaDal.slice(pwaDal.indexOf('export const replacePWAIconOverride'));
  assertOrder(
    pwaIconReplacementSection,
    [
      'catch (error) {',
      'await readCurrentPWAIconStore(scope)',
      'if (committedOverride) {',
      "await cleanupPWAIconOverrideUrls([uploadedUrl], 'replace', scope);",
    ],
    'PWA icon ambiguous commit read-back before new-object compensation',
  );
  assertIncludes(pwaDal, 'removePWAIconOverride', 'PWA icon post-commit removal lifecycle');
  assertIncludes(pwaIconStorageBoundary, 'isPWAIconStoragePath', 'PWA icon exact Storage path boundary');
  assertIncludes(pwaIconStorageBoundary, 'assertPreparedPWAIconFile', 'PWA icon prepared PNG admission boundary');
  assertIncludes(pwaDal, 'summarizeStorageCleanupResults(results)', 'PWA icon cleanup explicit Storage acknowledgement accounting');
  assertIncludes(pwaDal, 'pwa_icon_storage_cleanup_failed', 'PWA icon bounded cleanup diagnostics');
  assertIncludes(desktopSettings, 'assertPWASettingsUpdateSucceeded(settingsResult);', 'desktop customer app settings acknowledgement guard');
  assertIncludes(desktopSettings, 'await replacePWAIconOverride({', 'desktop customer app uses shared replacement lifecycle');
  assertIncludes(desktopSettings, 'await removePWAIconOverride({', 'desktop customer app uses shared removal lifecycle');
  assertNotIncludes(desktopSettings, "import { deleteFileByUrl } from '@database/storage/deleteFromStorage';", 'desktop customer app direct Storage deletion bypass');
  assertIncludes(desktopSettings, "customer_app_business_copy_meta_update_rejected", 'desktop customer app metadata acknowledgement guard');
  assertIncludes(mobileSettings, 'assertPWASettingsUpdateSucceeded(settingsResult);', 'mobile customer app settings acknowledgement guard');
  assertIncludes(mobileSettings, 'await replacePWAIconOverride({', 'mobile customer app uses shared replacement lifecycle');
  assertIncludes(mobileSettings, 'await removePWAIconOverride({', 'mobile customer app uses shared removal lifecycle');
  assertNotIncludes(mobileSettings, "import { deleteFileByUrl } from '@database/storage/deleteFromStorage';", 'mobile customer app direct Storage deletion bypass');
  assertIncludes(mobileSettings, "customer_app_business_copy_meta_update_rejected", 'mobile customer app metadata acknowledgement guard');
  assertIncludes(customerAppImpl, 'Dynamic asset store ID fallback boundary', 'Customer App implementation dynamic asset fallback boundary');
  assertIncludes(customerAppFirebase, 'Dynamic asset store-ID fallback is cost-neutral', 'Customer App Firebase dynamic asset fallback boundary');
  assertIncludes(productionAudit, 'Customer App dynamic asset store ID fallback checkpoint', 'Production audit Customer App dynamic asset fallback boundary');
  assertIncludes(changelog, 'Customer App Dynamic Asset Store ID Fallback Boundary', 'Changelog Customer App dynamic asset fallback boundary');
}

function verifyAnalyticsCoverage() {
  const analytics = read('src/lib/analytics/unified.ts');
  const publicAnalyticsRoute = read('src/app/api/public/analytics/track/route.ts');
  const clientAnalyticsWrite = read('src/database/analytics/index.ts');
  const serverAnalyticsWrite = read('src/lib/analytics/serverWrite.ts');
  const aggregateCustomerAnalytics = read('functions/src/aggregateCustomerAnalytics.ts');
  const dashboardSummaryAggregation = read('functions/src/analytics/dashboardSummaryAggregation.ts');
  const decisionBlocksScoring = read('functions/src/decisionBlocksScoring.ts');
  const dashboardDal = read('src/database/ownerDashboard/index.ts');
  const dashboardHook = read('src/hooks/useCustomerAppDashboard.ts');
  const desktopMetrics = read('src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx');
  const mobileMetrics = read('src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx');
  const customerAppImpl = read('__docs__/customer-app/customer-app_impl.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const customerAppTest = read('__docs__/customer-app/customer-app_test.md');
  const customerAppSpec = read('__docs__/customer-app/customer-app_spec.md');
  const customerAppMobile = read('__docs__/customer-app/customer-app_mobile-support.md');
  const customerAppHelp = read('__docs__/customer-app/customer-app_helpdoc.md');
  const customerAppMarketing = read('__docs__/customer-app/customer-app_marketing.md');
  const customerAppWebsite = read('__docs__/customer-app/customer-app_website.md');
  const expectedEvents = [
    'CUSTOMER_APP_PROMPT_SHOWN',
    'CUSTOMER_APP_PROMPT_DISMISSED',
    'CUSTOMER_APP_INSTALL_STARTED',
    'CUSTOMER_APP_INSTALLED',
    'CUSTOMER_APP_OPENED',
    'CUSTOMER_APP_SHORTCUT_MENU',
    'CUSTOMER_APP_SHORTCUT_CALL',
    'CUSTOMER_APP_SHORTCUT_DIRECTIONS',
    'CUSTOMER_APP_SHORTCUT_WHATSAPP',
    'CUSTOMER_APP_SHORTCUT_RESERVATION',
    'CUSTOMER_APP_SHORTCUT_ORDER',
  ];

  for (const eventName of expectedEvents) {
    assertIncludes(analytics, eventName, 'analytics event coverage');
  }

  assertIncludes(analytics, "const effectiveProjectId = isCustomerAppEvent ? 'customerApp' : data.projectId;", 'analytics project routing');
  assertIncludes(analytics, 'installsBySurface', 'analytics source attribution');
  assertIncludes(analytics, 'appOpensBySurface', 'analytics source attribution');
  [
    'updateData.totalPromptShown = 1;',
    'updateData.totalPromptDismissed = 1;',
    'updateData.totalInstallStarted = 1;',
    'updateData.totalInstalled = 1;',
    'updateData.uniqueInstallSessions = 1;',
    'updateData.totalAppOpens = 1;',
    "updateData['shortcutClicks.menu'] = 1;",
    "updateData['shortcutClicks.call'] = 1;",
    "updateData['shortcutClicks.directions'] = 1;",
    "updateData['shortcutClicks.whatsapp'] = 1;",
    "updateData['shortcutClicks.reservation'] = 1;",
    "updateData['shortcutClicks.order'] = 1;",
    'const installedPlatform = normalizeAnalyticsEnum(data.pwaPlatform, ANALYTICS_PWA_PLATFORMS);',
    'updateData[`installsByPlatform.${installedPlatform}`] = 1;',
    'const installSource = normalizeAnalyticsEnum(data.pwaInstallSource, ANALYTICS_PWA_INSTALL_SOURCES);',
    'updateData[`installsBySource.${installSource}`] = 1;',
    'const installSurface = normalizeAnalyticsEnum(data.pwaInstallSurface, ANALYTICS_PWA_INSTALL_SURFACES);',
    'updateData[`installsBySurface.${installSurface}`] = 1;',
    'const openedPlatform = normalizeAnalyticsEnum(data.pwaPlatform, ANALYTICS_PWA_PLATFORMS);',
    'updateData[`appOpensByPlatform.${openedPlatform}`] = 1;',
    'const openedSurface = normalizeAnalyticsEnum(data.pwaInstallSurface, ANALYTICS_PWA_INSTALL_SURFACES);',
    'updateData[`appOpensBySurface.${openedSurface}`] = 1;',
  ].forEach((needle) => {
    assertIncludes(analytics, needle, `Customer App analytics event field ${needle}`);
  });
  assertNotIncludes(analytics, 'updateData[`installsByPlatform.${data.pwaPlatform}`] = 1;', 'Customer App raw platform map key');
  assertNotIncludes(analytics, 'updateData[`installsBySource.${data.pwaInstallSource}`] = 1;', 'Customer App raw source map key');
  assertNotIncludes(analytics, 'updateData[`appOpensByPlatform.${data.pwaPlatform}`] = 1;', 'Customer App raw app-open platform map key');

  assertIncludes(publicAnalyticsRoute, "const RESERVED_PROJECT_IDS = new Set(['obp', 'customerApp']);", 'public analytics reserved customerApp project id');
  assertIncludes(publicAnalyticsRoute, "const rateLimitResponse = await checkPublicRateLimit(req, 'PUBLIC_ANALYTICS');", 'public analytics rate-limit before body parse');
  assertIncludes(publicAnalyticsRoute, 'const bodyResult = await readBoundedJsonBody(req, PUBLIC_ANALYTICS_TRACK_MAX_BODY_BYTES);', 'public analytics bounded body read');
  assertIncludes(publicAnalyticsRoute, "if (projectId === 'customerApp') return preferences.trackCustomerApp;", 'public analytics Customer App preference gate');
  assertIncludes(publicAnalyticsRoute, 'projectId: data.projectId,', 'public analytics writes validated project id');
  assertIncludes(publicAnalyticsRoute, "logAnalyticsFailure('public_analytics_track_failed'", 'public analytics bounded failure logging');
  assertNotIncludes(publicAnalyticsRoute, 'req.json()', 'public analytics route must not parse unbounded JSON');

  assertIncludes(clientAnalyticsWrite, "fetch('/api/public/analytics/track'", 'client analytics validated public-route boundary');
  assertIncludes(clientAnalyticsWrite, 'body: JSON.stringify({', 'client analytics validated public-route payload');
  assertIncludes(clientAnalyticsWrite, 'filterAnalyticsUpdateData(updateData)', 'client analytics write policy');
  assertNotIncludes(clientAnalyticsWrite, 'setDoc(dailyDocRef', 'client analytics direct Firestore write');
  assertIncludes(serverAnalyticsWrite, "analyticsProjectId === 'customerApp'", 'server analytics writer Customer App surface routing');
  assertIncludes(serverAnalyticsWrite, "? 'customerApp'", 'server analytics writer Customer App surface value');
  assertIncludes(serverAnalyticsWrite, 'filterAnalyticsUpdateData(updateData)', 'server analytics write policy');
  assertIncludes(serverAnalyticsWrite, 'assignProcessedAnalyticsField', 'server analytics dotted field preservation');

  [
    'totalPromptShown?: number;',
    'totalPromptDismissed?: number;',
    'totalInstallStarted?: number;',
    'totalInstalled?: number;',
    'uniqueInstallSessions?: number;',
    'totalAppOpens?: number;',
    'shortcutClicks?: Record<string, number>;',
    'installsByPlatform?: Record<string, number>;',
    'installsBySource?: Record<string, number>;',
    'appOpensByPlatform?: Record<string, number>;',
    "return projectId !== 'customerApp';",
    'updates.lifetimeTotalPromptShown = FieldValue.increment(dailyData.totalPromptShown);',
    'updates.lifetimeTotalInstalled = FieldValue.increment(dailyData.totalInstalled);',
    'updates.lifetimeUniqueInstalls = FieldValue.increment(dailyData.uniqueInstallSessions);',
    'updates.lifetimeTotalAppOpens = FieldValue.increment(dailyData.totalAppOpens);',
    "addMapUpdates('shortcutClicks');",
    "addMapUpdates('installsByPlatform');",
    "addMapUpdates('installsBySource');",
    "addMapUpdates('appOpensByPlatform');",
    "addNumericDelta('uniqueInstallSessions', 'lifetimeUniqueInstalls');",
    "addNumericDelta('totalAppOpens', 'lifetimeTotalAppOpens');",
    "addMapDelta('shortcutClicks', 'shortcutClicks');",
    "addMapDelta('installsByPlatform', 'installsByPlatform');",
    "addMapDelta('installsBySource', 'installsBySource');",
    "addMapDelta('appOpensByPlatform', 'appOpensByPlatform');",
    'mergeMapField(result.shortcutClicks, readAnalyticsMap(doc, \'shortcutClicks\'));',
    'mergeMapField(result.installsByPlatform, readAnalyticsMap(doc, \'installsByPlatform\'));',
    'mergeMapField(result.installsBySource, readAnalyticsMap(doc, \'installsBySource\'));',
    'mergeMapField(result.appOpensByPlatform, readAnalyticsMap(doc, \'appOpensByPlatform\'));',
  ].forEach((needle) => {
    assertIncludes(aggregateCustomerAnalytics, needle, `Customer App aggregation contract ${needle}`);
  });

  [
    "fetchExistingDailyDocsByDate(db, tId, sId, 'customerApp', startDate, settlementDate)",
    "getDashboardSummaryDocId(tId, sId, 'customerApp')",
    "getAnalyticsDocId.summary(tId, sId, 'customerApp')",
    "kind: 'customerAppDashboardSummary'",
    'summary,',
    'daily30d,',
    'totalPromptShown: data.totalPromptShown || 0,',
    'totalInstalled: data.totalInstalled || 0,',
    'uniqueInstallSessions: data.uniqueInstallSessions || 0,',
    'totalAppOpens: data.totalAppOpens || 0,',
    "shortcutClicks: readAnalyticsMap(data, 'shortcutClicks'),",
    "installsByPlatform: readAnalyticsMap(data, 'installsByPlatform'),",
    "installsBySource: readAnalyticsMap(data, 'installsBySource'),",
    "appOpensByPlatform: readAnalyticsMap(data, 'appOpensByPlatform'),",
    'if (projectId === \'customerApp\') {',
    'await writeCustomerAppDashboardSummary(db, tId, sId, settlementDate, settledDailyData);',
  ].forEach((needle) => {
    assertIncludes(dashboardSummaryAggregation, needle, `Customer App dashboard summary contract ${needle}`);
  });

  assertIncludes(decisionBlocksScoring, "const knownAnalyticsProjectIds = Array.from(new Set([...activeProjectIds, 'customerApp']));", 'nightly scheduler includes customerApp virtual project');
  assertIncludes(decisionBlocksScoring, 'customerAnalyticsProjectIds: knownAnalyticsProjectIds', 'nightly scheduler records Customer App project ids');
  assertIncludes(decisionBlocksScoring, 'customerApp: true', 'nightly scheduler records Customer App surface');
  assertIncludes(decisionBlocksScoring, '`${tId}_${sId}_customerApp_dashboard_summary`', 'nightly scheduler records Customer App dashboard summary doc id');

  assertIncludes(dashboardDal, 'export interface CustomerAppDashboardSummary', 'Customer App dashboard DAL type');
  assertIncludes(dashboardDal, "getDocId.dashboardSummary(tenantId, storeId, 'customerApp')", 'Customer App dashboard DAL normalized doc id');
  assertIncludes(dashboardDal, 'normalizeCustomerAppDashboardReadModel(summarySnap.data(), tenantId, storeId)', 'Customer App dashboard DAL runtime DTO');
  assertIncludes(dashboardDal, 'summary: data.summary,', 'Customer App dashboard DAL normalized summary field');
  assertIncludes(dashboardDal, 'daily30d: data.daily30d,', 'Customer App dashboard DAL normalized daily rows');
  assertIncludes(dashboardDal, '"getCustomerAppDashboardSummary"', 'Customer App dashboard DAL apiCallComposer label');
  assertIncludes(dashboardHook, 'getCustomerAppDashboardSummary(tId!, sId!)', 'Customer App dashboard hook DAL fetch');
  assertIncludes(dashboardHook, 'getAnalyticsSchedulerCacheKey(new Date()', 'Customer App dashboard hook scheduler cache key');
  assertIncludes(dashboardHook, 'dedupingInterval: 86400000', 'Customer App dashboard hook daily dedupe');
  assertIncludes(dashboardHook, 'normalizeCustomerAppDashboardReadModel(value, tId, sId)', 'Customer App dashboard local cache DTO');
  assertIncludes(dashboardHook, 'removeCachedData(cacheKey);', 'Customer App dashboard invalid local cache eviction');

  for (const [label, content] of [
    ['desktop Customer App metrics card', desktopMetrics],
    ['mobile Customer App metrics card', mobileMetrics],
  ]) {
    assertIncludes(content, 'useCustomerAppDashboard', `${label} reads Customer App dashboard summary`);
    assertIncludes(content, 'lifetimeUniqueInstalls ?? summary?.lifetimeTotalInstalled', `${label} installed customer KPI`);
    assertIncludes(content, 'daily.reduce((sum, day) => sum + (day.totalAppOpens || 0), 0)', `${label} 30-day app-open KPI`);
    assertIncludes(content, 'daily.reduce((sum, day) => sum + (day.totalInstalled || 0), 0)', `${label} 30-day install KPI`);
    assertIncludes(content, "summary?.installsBySource?.['ios-inferred']", `${label} iOS inferred install KPI`);
    assertIncludes(content, "summary?.installsBySource?.['ios-standalone']", `${label} iOS standalone install KPI`);
    assertIncludes(content, 'totalInstalled - (summary?.installsBySource?.[\'ios-standalone\'] ?? 0)', `${label} prompt conversion excludes manual iOS installs`);
    assertIncludes(content, 'summary?.shortcutClicks', `${label} shortcut KPI`);
    assertIncludes(content, 'summary?.installsByPlatform', `${label} platform install KPI`);
    assertIncludes(content, 'customerApp.appStickiness', `${label} app stickiness copy`);
  }

  for (const [label, content] of [
    ['Customer App implementation doc', customerAppImpl],
    ['Customer App Firebase doc', customerAppFirebase],
    ['Customer App test doc', customerAppTest],
  ]) {
    assertIncludes(content, 'analytics source-chain contract', `${label} analytics source-chain boundary`);
    assertIncludes(content, 'desktop/mobile KPI', `${label} desktop/mobile KPI boundary`);
  }
  assertIncludes(customerAppImpl, '`src/hooks/useCustomerAppDashboard.ts` -> `getCustomerAppDashboardSummary()`', 'Customer App implementation current dashboard hook path');
  assertIncludes(customerAppFirebase, '`useCustomerAppDashboard` hook', 'Customer App Firebase current dashboard hook path');
  assertIncludes(customerAppFirebase, 'Live event-write, rollup, dashboard-value, real-device install, and production-host smoke still require', 'Customer App Firebase external certification boundary');
  assertIncludes(customerAppTest, 'The static source-chain gate proves field wiring only', 'Customer App test live analytics smoke boundary');
  assertIncludes(customerAppTest, 'clear the 3-year freeze production gate', 'Customer App test production gate wording');
  assertIncludes(customerAppTest, 'Each KPI clears production analytics signoff only when all three layers pass', 'Customer App test KPI signoff wording');
  assertIncludes(customerAppTest, 'Analytics clears production signoff only if all are true', 'Customer App test analytics signoff wording');
  assertIncludes(customerAppTest, 'Deploy Cloud Function changes through External Certification Runbook Gate 1 after `npm run verify:functions-deploy-preflight`', 'Customer App test scoped Functions deploy gate');
  assertIncludes(customerAppTest, 'Customer App analytics runs inside the shared scheduler and `triggerCustomerAnalyticsManually`', 'Customer App test analytics Functions deploy target boundary');
  assertNotIncludes(customerAppTest, 'production-ready under the 3-year freeze standard', 'Customer App test stale production-ready gate wording');
  assertNotIncludes(customerAppTest, 'Each KPI is production-ready only when all three layers pass', 'Customer App test stale KPI production-ready wording');
  assertNotIncludes(customerAppTest, 'Analytics is production-ready only if all are true', 'Customer App test stale analytics production-ready wording');
  assertNotIncludes(customerAppTest, 'firebase deploy --only functions:aggregateCustomerAnalytics', 'Customer App test stale standalone aggregate deploy target');
  assertNotIncludes(customerAppFirebase, 'Dashboard reads use existing `useAnalyticsData` hook with `projectId=\'customerApp\'`', 'Customer App Firebase stale dashboard hook wording');
  for (const [label, content] of [
    ['Customer App spec', customerAppSpec],
    ['Customer App Firebase doc', customerAppFirebase],
    ['Customer App mobile doc', customerAppMobile],
    ['Customer App helpdoc', customerAppHelp],
    ['Customer App marketing doc', customerAppMarketing],
    ['Customer App website doc', customerAppWebsite],
  ]) {
    assertNotIncludes(content, 'Ready for Implementation', `${label} stale ready-for-implementation status`);
    assertNotIncludes(content, 'READY FOR IMPLEMENTATION', `${label} stale ready-for-implementation footer`);
  }
  assertIncludes(customerAppSpec, 'Runtime source-gated evidence; not current launch certification', 'Customer App spec source-gated status');
  assertIncludes(customerAppFirebase, 'Source-gated runtime evidence; external certification still required', 'Customer App Firebase source-gated status');
  assertIncludes(customerAppMobile, 'Runtime/mobile source evidence; not current mobile launch certification', 'Customer App mobile source-gated status');
  assertIncludes(customerAppHelp, 'Source-backed help draft; not current support publication or launch certification', 'Customer App helpdoc launch boundary');
  assertIncludes(customerAppMarketing, 'Source-backed marketing draft; not current sales, publication, or launch certification', 'Customer App marketing launch boundary');
  assertIncludes(customerAppWebsite, 'Source-backed website draft; not current publication or launch certification', 'Customer App website launch boundary');
}

function verifyPwaTrackingDiagnostics() {
  const diagnostics = read('src/lib/pwa/pwaDiagnostics.ts');
  const installDetection = read('src/lib/pwa/installDetection.ts');
  const shortcutDetector = read('src/lib/pwa/shortcutSourceDetector.ts');
  const standaloneDetector = read('src/lib/pwa/standaloneDetector.ts');
  const installTracker = read('src/lib/pwa/installTracker.ts');
  const visitCounter = read('src/lib/pwa/visitCounter.ts');
  const storageValue = read('src/lib/pwa/storageValue.ts');
  const customerAppController = read('src/components/customerApp/CustomerAppController.tsx');
  const installPrompt = read('src/components/customerApp/InstallPrompt.tsx');
  const mobileSettings = read('src/components/mobile/screens/MobileCustomerAppScreen.tsx');
  const desktopSettings = read('src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx');
  const desktopBusinessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const customerAppImpl = read('__docs__/customer-app/customer-app_impl.md');
  const customerAppSpec = read('__docs__/customer-app/customer-app_spec.md');
  const customerAppFirebase = read('__docs__/customer-app/customer-app_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertNoDirectConsole(diagnostics, 'Customer App PWA diagnostics helper');
  assertNoDirectConsole(installDetection, 'Customer App install detection');
  assertNoDirectConsole(shortcutDetector, 'Customer App shortcut detector');
  assertNoDirectConsole(standaloneDetector, 'Customer App standalone detector');
  assertNoDirectConsole(installTracker, 'Customer App install tracker');
  assertNoDirectConsole(visitCounter, 'Customer App visit counter');
  assertNoDirectConsole(storageValue, 'Customer App persisted scalar boundary');
  assertNoDirectConsole(installPrompt, 'Customer App install prompt');
  assertNoDirectConsole(mobileSettings, 'Mobile Customer App settings screen');
  assertNoDirectConsole(desktopSettings, 'Desktop Customer App settings tab');

  assertIncludes(diagnostics, "import { secureError } from '@lib/security/secureLogger';", 'Customer App PWA diagnostics helper');
  assertIncludes(diagnostics, 'getBoundedPwaStringContext', 'Customer App PWA bounded context helper');
  assertIncludes(diagnostics, 'logPwaTrackingFailure', 'Customer App PWA tracking diagnostics helper');
  assertIncludes(diagnostics, "secureError('[Customer App PWA] Operation failed'", 'Customer App PWA secure diagnostics');
  assertIncludes(diagnostics, 'sourceErrorName', 'Customer App PWA source error name');
  assertIncludes(diagnostics, 'sourceErrorCode', 'Customer App PWA source error code');
  assertIncludes(installDetection, 'customer_app_install_detection_failed', 'Customer App install detection diagnostics');
  assertIncludes(installDetection, 'reportedInstallDetectionFailure', 'Customer App install detection one-per-path guard');
  assertIncludes(installDetection, 'hasMatchMedia', 'Customer App install detection bounded browser-capability context');
  assertIncludes(shortcutDetector, 'customer_app_shortcut_tracking_failed', 'Customer App shortcut tracking diagnostics');
  assertIncludes(shortcutDetector, 'customer_app_shortcut_scope_invalid', 'Customer App shortcut invalid scope diagnostics');
  assertIncludes(shortcutDetector, 'customer_app_shortcut_session_guard_failed', 'Customer App shortcut completion guard diagnostics');
  assertIncludes(shortcutDetector, 'getTenantStoreStorageKey', 'Customer App shortcut tenant/store session key');
  assertIncludes(shortcutDetector, 'shortcutTrackingInFlight', 'Customer App shortcut in-flight de-duplication');
  assertIncludes(shortcutDetector, 'parseCanonicalPwaTimestamp(rawCompletion)', 'Customer App shortcut exact completion marker');
  assertIncludes(shortcutDetector, 'window.sessionStorage.removeItem(shortcutScopeKey)', 'Customer App shortcut corrupt completion eviction');
  assert(
    shortcutDetector.indexOf('window.sessionStorage.setItem(shortcutScopeKey, String(Date.now()))')
      > shortcutDetector.indexOf('await trackEvent(SHORTCUT_EVENT_MAP[source]'),
    'Customer App shortcut completion marker must be written only after acknowledged analytics tracking',
  );
  assertIncludes(shortcutDetector, 'customer_app_shortcut_source_parse_failed', 'Customer App shortcut source parse diagnostics');
  assertIncludes(shortcutDetector, 'reportedShortcutSourceParseFailure', 'Customer App shortcut source parse one-per-path guard');
  assertIncludes(shortcutDetector, "getBoundedPwaStringContext('search', search)", 'Customer App shortcut source bounded search context');
  assertIncludes(standaloneDetector, 'customer_app_open_tracking_failed', 'Customer App open tracking diagnostics');
  assertIncludes(standaloneDetector, 'reportedCustomerAppOpenStorageFailures', 'Customer App open storage one-per-operation guard');
  assertIncludes(standaloneDetector, 'getCustomerAppOpenStorageContext', 'Customer App open storage bounded context helper');
  assertIncludes(standaloneDetector, 'customer_app_open_session_storage_unavailable', 'Customer App open sessionStorage availability diagnostics');
  assertIncludes(standaloneDetector, 'customer_app_open_session_guard_failed', 'Customer App open session guard diagnostics');
  assertIncludes(standaloneDetector, 'customer_app_ios_install_inference_storage_failed', 'Customer App iOS install inference storage diagnostics');
  assertIncludes(standaloneDetector, "getBoundedPwaStringContext('storageKey', storageKey)", 'Customer App open storage-key bounded context');
  assertIncludes(standaloneDetector, 'STANDALONE_SESSION_STORAGE_TEST_KEY', 'Customer App open storage test key constant');
  assertIncludes(installTracker, 'customer_app_install_tracking_failed', 'Customer App install tracking diagnostics');
  assertIncludes(installTracker, 'customer_app_install_scope_invalid', 'Customer App install invalid scope diagnostics');
  assertIncludes(installTracker, 'reportedInstallStorageFailures', 'Customer App prompt-shown storage one-per-operation guard');
  assertIncludes(installTracker, 'customer_app_install_dedupe_storage_unavailable', 'Customer App install de-dupe storage availability diagnostics');
  assertIncludes(installTracker, 'customer_app_install_dedupe_read_failed', 'Customer App install de-dupe read diagnostics');
  assertIncludes(installTracker, 'customer_app_install_dedupe_write_failed', 'Customer App install de-dupe write diagnostics');
  assertIncludes(installTracker, "'install_dedupe_availability'", 'Customer App install de-dupe availability operation');
  assertIncludes(installTracker, "'install_dedupe_read'", 'Customer App install de-dupe read operation');
  assertIncludes(installTracker, "'install_dedupe_write'", 'Customer App install de-dupe write operation');
  assertIncludes(installTracker, 'customer_app_prompt_shown_storage_unavailable', 'Customer App prompt-shown storage availability diagnostics');
  assertIncludes(installTracker, 'customer_app_prompt_shown_storage_write_failed', 'Customer App prompt-shown storage write diagnostics');
  assertIncludes(installTracker, "getBoundedPwaStringContext('storageKey', storageKey)", 'Customer App prompt-shown storage-key bounded context');
  assertIncludes(installTracker, 'INSTALL_TRACKER_STORAGE_TEST_KEY', 'Customer App install tracker storage test key constant');
  assertIncludes(visitCounter, 'reportedPromptStorageFailures', 'Customer App prompt storage one-per-operation guard');
  assertIncludes(visitCounter, 'customer_app_prompt_storage_unavailable', 'Customer App prompt storage availability diagnostics');
  assertIncludes(visitCounter, 'customer_app_prompt_visit_increment_failed', 'Customer App prompt visit increment diagnostics');
  assertIncludes(visitCounter, 'customer_app_prompt_visit_read_failed', 'Customer App prompt visit read diagnostics');
  assertIncludes(visitCounter, 'customer_app_prompt_dismissal_write_failed', 'Customer App prompt dismissal write diagnostics');
  assertIncludes(visitCounter, 'customer_app_prompt_dismissal_read_failed', 'Customer App prompt dismissal read diagnostics');
  assertIncludes(visitCounter, 'customer_app_direct_install_intent_parse_failed', 'Customer App direct install intent parse diagnostics');
  assertIncludes(visitCounter, 'reportedDirectInstallIntentParseFailure', 'Customer App direct install intent parse one-per-path guard');
  assertIncludes(visitCounter, "getBoundedPwaStringContext('storageKey', storageKey)", 'Customer App prompt storage-key bounded context');
  assertIncludes(visitCounter, "getBoundedPwaStringContext('search', search)", 'Customer App direct install bounded search context');
  assertIncludes(visitCounter, 'VISIT_COUNTER_STORAGE_TEST_KEY', 'Customer App prompt storage test key constant');
  assertIncludes(storageValue, 'parseCanonicalPwaTimestamp', 'Customer App canonical timestamp boundary');
  assertIncludes(storageValue, 'parseCanonicalPwaCount', 'Customer App canonical count boundary');
  assertIncludes(storageValue, 'Number.isSafeInteger(timestamp)', 'Customer App timestamp safe-integer boundary');
  assertIncludes(visitCounter, 'MAX_PERSISTED_VISIT_COUNT', 'Customer App visit-count cap');
  assertIncludes(visitCounter, 'parseCanonicalPwaCount', 'Customer App visit-count parser usage');
  assertIncludes(visitCounter, 'parseCanonicalPwaTimestamp', 'Customer App dismissal parser usage');
  assertIncludes(installTracker, 'parseCanonicalPwaTimestamp', 'Customer App install-marker parser usage');
  assertIncludes(installTracker, 'getTenantStoreStorageKey(INSTALL_FIRED_KEY_PREFIX, tenantId, storeId)', 'Customer App install tenant/store de-dupe key');
  assertIncludes(installTracker, 'getTenantStoreStorageKey(PROMPT_SHOWN_AT_KEY_PREFIX, tenantId, storeId)', 'Customer App prompt-shown tenant/store key');
  assertIncludes(visitCounter, 'getTenantStoreStorageKey(VISIT_COUNT_KEY_PREFIX, tenantId, storeId)', 'Customer App visit tenant/store key');
  assertIncludes(visitCounter, 'getTenantStoreStorageKey(DISMISSED_AT_KEY_PREFIX, tenantId, storeId)', 'Customer App dismissal tenant/store key');
  assertIncludes(customerAppController, 'incrementVisitCount(tenantId, storeId)', 'Customer App controller tenant/store visit scope');
  assertIncludes(customerAppController, 'canShowPrompt(tenantId, storeId, directIntent)', 'Customer App controller tenant/store prompt scope');
  assertIncludes(customerAppController, 'markPromptDismissed(tenantId, storeId)', 'Customer App controller tenant/store dismissal scope');
  assertIncludes(customerAppController, 'processedPromptScopeRef.current === promptScopeKey', 'Customer App controller one visit/eligibility pass per tenant/store scope');
  assertIncludes(customerAppController, "const promptScopeKey = getTenantStoreStorageKey(", 'Customer App controller canonical tenant/store scope guard');
  assertIncludes(customerAppController, 'const featureOn = FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && Boolean(promptScopeKey);', 'Customer App controller must guard every listener and side effect by canonical scope');
  assertIncludes(customerAppController, 'setDeferredPrompt(null)', 'Customer App controller clears a prior-scope native install event');
  assertIncludes(customerAppController, 'setShouldShowPrompt(false)', 'Customer App controller clears prior-scope prompt visibility');
  assertIncludes(installPrompt, 'recordPromptShown(tenantId, storeId);', 'Customer App operational prompt marker independent of analytics');
  assertIncludes(installPrompt, 'reportedPromptScopeRef.current === promptScopeKey', 'Customer App prompt shown once per mounted tenant/store scope');
  assert(
    installPrompt.indexOf('recordPromptShown(tenantId, storeId);')
      < installPrompt.indexOf('if (trackingEnabled) {'),
    'Customer App prompt marker must not depend on analytics consent',
  );
  assertIncludes(standaloneDetector, 'getTenantStoreStorageKey', 'Customer App open tenant/store session key');
  assertIncludes(standaloneDetector, 'customer_app_open_scope_invalid', 'Customer App open invalid scope diagnostics');
  assertIncludes(standaloneDetector, 'appOpenTrackingInFlight', 'Customer App open in-flight guard');
  assertIncludes(standaloneDetector, 'parseCanonicalPwaTimestamp', 'Customer App iOS prompt parser usage');
  assertIncludes(standaloneDetector, 'parseCanonicalPwaTimestamp(rawCompletion)', 'Customer App open exact completion marker');
  assertIncludes(standaloneDetector, 'window.sessionStorage.removeItem(scopedOpenKey)', 'Customer App open corrupt completion eviction');
  assert(
    standaloneDetector.indexOf('window.sessionStorage.setItem(scopedOpenKey, String(Date.now()))')
      > standaloneDetector.indexOf('await trackEvent(TrackingEvent.CUSTOMER_APP_OPENED'),
    'Customer App open completion marker must be written only after acknowledged analytics tracking',
  );
  assertIncludes(installPrompt, 'customer_app_native_install_prompt_failed', 'Customer App native install prompt diagnostics');
  assertIncludes(mobileSettings, 'customer_app_mobile_settings_save_failed', 'Mobile Customer App settings diagnostics');
  assertIncludes(mobileSettings, 'customer_app_mobile_install_link_copy_failed', 'Mobile Customer App install-link copy diagnostics');
  assertIncludes(mobileSettings, 'copyCustomerAppMobileInstallLink', 'Mobile Customer App install-link copy acknowledgement helper');
  assertIncludes(mobileSettings, 'CUSTOMER_APP_MOBILE_INSTALL_LINK_COPY_UNAVAILABLE', 'Mobile Customer App install-link unavailable clipboard code');
  assertIncludes(mobileSettings, 'CUSTOMER_APP_MOBILE_INSTALL_LINK_COPY_FALLBACK_FAILED', 'Mobile Customer App install-link fallback failure code');
  assertIncludes(mobileSettings, 'hasClipboardWrite', 'Mobile Customer App install-link clipboard support metadata');
  assertIncludes(mobileSettings, 'hasCopyFallback', 'Mobile Customer App install-link fallback support metadata');
  assertIncludes(mobileSettings, "const copied = document.execCommand('copy');", 'Mobile Customer App textarea copy acknowledgement');
  assertIncludes(mobileSettings, "getBoundedPwaStringContext('installLink', installLink)", 'Mobile Customer App bounded install-link context');
  assertIncludes(desktopSettings, 'customer_app_desktop_settings_save_failed', 'Desktop Customer App settings diagnostics');
  assertIncludes(desktopSettings, 'customer_app_desktop_install_link_copy_failed', 'Desktop Customer App install-link copy diagnostics');
  assertIncludes(desktopSettings, 'copyCustomerAppDesktopInstallLink', 'Desktop Customer App install-link copy acknowledgement helper');
  assertIncludes(desktopSettings, 'CUSTOMER_APP_DESKTOP_INSTALL_LINK_COPY_UNAVAILABLE', 'Desktop Customer App install-link unavailable clipboard code');
  assertIncludes(desktopSettings, 'CUSTOMER_APP_DESKTOP_INSTALL_LINK_COPY_FALLBACK_FAILED', 'Desktop Customer App install-link fallback failure code');
  assertIncludes(desktopSettings, 'hasClipboardWrite', 'Desktop Customer App install-link clipboard support metadata');
  assertIncludes(desktopSettings, 'hasCopyFallback', 'Desktop Customer App install-link fallback support metadata');
  assertIncludes(desktopSettings, "const copied = document.execCommand('copy');", 'Desktop Customer App textarea copy acknowledgement');
  assertIncludes(desktopSettings, "getBoundedPwaStringContext('installLink', installLink)", 'Desktop Customer App bounded install-link context');
  [
    'customerAppScopeKeyRef.current === requestScopeKey',
    'componentActiveRef.current',
    "String(previous?.tenantId ?? '') !== String(expectedTenantId)",
    "String(previous?.storeId ?? '') !== String(expectedStoreId)",
  ].forEach((token) => {
    assertIncludes(desktopSettings, token, 'Desktop Customer App tenant/store settlement guard');
    assertIncludes(mobileSettings, token, 'Mobile Customer App tenant/store settlement guard');
  });
  assertIncludes(
    mobileSettings,
    'return <MobileCustomerAppScreenContent key={scopeKey} {...props} />;',
    'Mobile Customer App tenant/store keyed remount',
  );
  assertIncludes(desktopBusinessSettings, '<CustomerAppTab', 'Desktop Customer App mounted surface');
  assertIncludes(
    desktopBusinessSettings,
    'key={`${String(storeDetails?.tenantId ?? \'\')}:${String(storeDetails?.storeId ?? \'\')}`}',
    'Desktop Customer App tenant/store keyed remount',
  );
  assertIncludes(installTracker, 'storageAvailable: false', 'Customer App install no-storage failure diagnostics');
  assertIncludes(installTracker, 'storageAvailable: true', 'Customer App install storage failure diagnostics');
  assertNotIncludes(installDetection, '} catch {\n    return false;\n  }', 'Customer App install detection must not silently fail');
  assertNotIncludes(shortcutDetector, '} catch {\n    return null;\n  }', 'Customer App shortcut source parse must not silently fail');
  assertNotIncludes(shortcutDetector, '[pwa] detectAndTrackShortcutLaunch failed', 'Customer App shortcut raw warning');
  assertNotIncludes(standaloneDetector, '[pwa] detectAndTrackAppOpen failed', 'Customer App standalone raw warning');
  assertNotIncludes(standaloneDetector, '} catch {\n    return false;\n  }', 'Customer App standalone storage availability must not silently fail');
  assertNotIncludes(standaloneDetector, '/* fall through and still fire */', 'Customer App standalone session guard must not silently fail');
  assertNotIncludes(standaloneDetector, 'non-fatal — analytics should never break the customer experience', 'Customer App iOS inference storage must not silently fail');
  assertNotIncludes(installTracker, '[pwa] fireInstalledEventOnce failed', 'Customer App install raw warning');
  assertNotIncludes(installTracker, 'window.localStorage.setItem(\n      `${PROMPT_SHOWN_AT_KEY_PREFIX}${storeId}`,\n      String(Date.now()),\n    );\n  } catch {\n    /* noop */\n  }', 'Customer App prompt-shown timestamp storage must not silently noop');
  assertNotIncludes(installTracker, 'window.localStorage.setItem(key, String(Date.now()));\n  } catch (err) {\n    // Non-fatal', 'Customer App install de-dupe storage write must not be hidden by broad tracking catch');
  assertNotIncludes(visitCounter, '} catch {\n    return 0;\n  }', 'Customer App prompt visit storage must not silently return zero');
  assertNotIncludes(visitCounter, '} catch {\n    /* noop */\n  }', 'Customer App prompt dismissal storage must not silently noop');
  assertNotIncludes(visitCounter, 'return Date.now() - dismissedAt < DISMISS_SUPPRESSION_MS;\n  } catch {\n    return false;\n  }', 'Customer App prompt dismissal storage must not silently return false');
  assertNotIncludes(visitCounter, "const v = params.get('pwa');\n    return v === 'install' || v === '1' || v === 'true';\n  } catch {\n    return false;\n  }", 'Customer App direct install intent parse must not silently fail');
  assertNotIncludes(installPrompt, '[pwa] native install prompt failed:', 'Customer App native install prompt raw warning');
  assertNotIncludes(mobileSettings, '[MobileCustomerAppScreen] save failed:', 'Mobile Customer App settings raw diagnostic');
  assertNotIncludes(mobileSettings, "} catch {\n            Toast.show({ content: 'Could not copy", 'Mobile Customer App silent install-link copy catch');
  assertNotIncludes(mobileSettings, "await navigator.clipboard.writeText(installLink);\n            Toast.show", 'Mobile Customer App install-link copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileSettings, "document.execCommand('copy');\n            Toast.show", 'Mobile Customer App textarea fallback must not assume copy success');
  assertNotIncludes(desktopSettings, '[CustomerAppTab] save failed:', 'Desktop Customer App settings raw diagnostic');
  assertNotIncludes(desktopSettings, "} catch {\n            message.error('Could not copy", 'Desktop Customer App silent install-link copy catch');
  assertNotIncludes(desktopSettings, "await navigator.clipboard.writeText(installLink);\n            message.success", 'Desktop Customer App install-link copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopSettings, "document.execCommand('copy');\n            message.success", 'Desktop Customer App textarea fallback must not assume copy success');
  assertIncludes(customerAppImpl, 'Failed standalone-open storage availability, session guard, or iOS install-inference storage paths log bounded `customer_app_open_*` diagnostics once per operation', 'Customer App implementation doc standalone-open storage diagnostics');
  assertIncludes(customerAppImpl, 'Failed prompt visit-count or dismissal localStorage paths log bounded `customer_app_prompt_*` diagnostics once per operation', 'Customer App implementation doc prompt storage diagnostics');
  assertIncludes(customerAppImpl, 'Failed install-mode detection and shortcut/direct-intent URL parsing log bounded Customer App diagnostics once per failure path', 'Customer App implementation doc install and URL intent diagnostics');
  assertIncludes(customerAppImpl, 'Service-worker domain-resolution failures log bounded `service_worker_domain_resolution_failed` diagnostics', 'Customer App implementation doc service-worker domain diagnostics');
  assertIncludes(customerAppImpl, 'Malformed registered service-worker script URLs log bounded `service_worker_script_url_label_parse_failed` diagnostics', 'Customer App implementation doc service-worker script-label diagnostics');
  assertIncludes(customerAppImpl, 'Failed public service-worker cleanup reload session guards log bounded `service_worker_public_cleanup_reload_storage_failed` diagnostics', 'Customer App implementation doc service-worker reload storage diagnostics');
  assertIncludes(customerAppImpl, 'Failed prompt-shown timestamp storage for iOS inference logs bounded `customer_app_prompt_shown_*` diagnostics once per operation', 'Customer App implementation doc prompt-shown timestamp diagnostics');
  assertIncludes(customerAppImpl, 'Failed install-fired de-dupe storage availability/read/write paths log bounded `customer_app_install_dedupe_*` diagnostics once per operation', 'Customer App implementation doc install de-dupe storage diagnostics');
  assertIncludes(customerAppSpec, '`CUSTOMER_APP_OPENED` uses a browser-local `sessionStorage` guard', 'Customer App spec standalone-open session guard');
  assertIncludes(customerAppSpec, 'Install-mode detection and shortcut/direct-intent parse failures log bounded diagnostics only', 'Customer App spec install and URL intent diagnostics');
  assertIncludes(customerAppSpec, 'Visit-count and dismissal-storage failures log bounded `customer_app_prompt_*` diagnostics only', 'Customer App spec prompt storage diagnostics');
  assertIncludes(customerAppSpec, 'no fallback write path is created', 'Customer App spec standalone-open no fallback write boundary');
  assertIncludes(customerAppFirebase, 'Standalone-open storage diagnostics', 'Customer App Firebase standalone-open storage diagnostics');
  assertIncludes(customerAppFirebase, 'Prompt gate storage diagnostics', 'Customer App Firebase prompt storage diagnostics');
  assertIncludes(customerAppFirebase, 'Install detection and URL intent diagnostics', 'Customer App Firebase install and URL intent diagnostics');
  assertIncludes(customerAppFirebase, 'Service-worker domain-resolution diagnostics', 'Customer App Firebase service-worker domain diagnostics');
  assertIncludes(customerAppFirebase, 'Service-worker degraded fallback diagnostics', 'Customer App Firebase service-worker degraded fallback diagnostics');
  assertIncludes(customerAppFirebase, 'Prompt-shown timestamp diagnostics', 'Customer App Firebase prompt-shown timestamp diagnostics');
  assertIncludes(customerAppFirebase, 'Install de-dupe storage diagnostics', 'Customer App Firebase install de-dupe storage diagnostics');
  assertIncludes(customerAppFirebase, 'These diagnostics add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement', 'Customer App Firebase cost-neutral standalone-open diagnostics');
  assertIncludes(productionAudit, 'Customer App service-worker domain diagnostics checkpoint', 'Production audit Customer App service-worker domain diagnostics checkpoint');
  assertIncludes(productionAudit, 'Customer App service-worker degraded fallback diagnostics checkpoint', 'Production audit Customer App service-worker degraded fallback diagnostics checkpoint');
  assertIncludes(changelog, 'Customer App Service Worker Domain Diagnostics', 'Changelog Customer App service-worker domain diagnostics checkpoint');
  assertIncludes(changelog, 'Customer App Service Worker Degraded Fallback Diagnostics', 'Changelog Customer App service-worker degraded fallback diagnostics checkpoint');
}

function verifyFreshnessHook() {
  const hook = read('src/hooks/useMenuFreshness.ts');
  assertIncludes(hook, 'router.refresh();', 'menu freshness hook');
  assertIncludes(hook, 'minRefreshIntervalMs = 60_000', 'menu freshness hook cooldown');
  assertNotIncludes(hook, 'onSnapshot', 'menu freshness hook');
  assertNotIncludes(hook, 'setInterval', 'menu freshness hook');
}

function verifyDigitalScreenDiagnostics() {
  const campaignDal = read('src/database/campaigns/index.ts');
  const serverScreenDal = read('src/database/campaigns/serverScreen.ts');
  const screenInvalidation = read('src/lib/screen/serverScreenInvalidation.ts');
  const revalidateMenuRoute = read('src/app/api/revalidate/menu/route.ts');
  const screenDiagnostics = read('src/lib/screen/screenDiagnostics.ts');
  const storesDal = read('src/database/stores/index.tsx');
  const brandPropagation = read('src/database/multiOutlet/brandPropagation.ts');
  const brandPropagationRoute = read('src/app/api/outlets/brand-propagation/route.ts');
  const brandPropagationBoundary = read('src/lib/multiOutlet/brandPropagationBoundary.ts');
  const screenSettings = read('src/components/templates/main-app/settings/DigitalScreenSettings/index.tsx');
  const screenLink = read('src/components/templates/main-app/settings/DigitalScreenSettings/ScreenLink.tsx');
  const ownerUploads = read('src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx');
  const mobileScreenSettings = read('src/components/mobile/screens/MobileDigitalScreensScreen.tsx');
  const screenUtils = read('src/lib/screen/utils.ts');
  const screenPublicState = read('src/lib/screen/publicScreenState.ts');
  const screenContent = read('src/lib/screen/screenContent.ts');
  const screenRenderer = read('src/lib/screen/screenRenderer.ts');
  const screenSlides = read('src/lib/screen/slideGenerator.ts');
  const screenEvergreenSlides = read('src/lib/screen/evergreenSlides.ts');
  const ownerControlUsage = read('src/database/ownerControlUsage/index.ts');
  const screenDisplay = read('src/app/screen/[token]/ScreenDisplay.tsx');
  const menuBoardDisplay = read('src/app/screen/[token]/MenuBoardDisplay.tsx');
  const screenPage = read('src/app/screen/[token]/page.tsx');
  const screenAttribution = read('src/app/screen/[token]/ScreenAttribution.tsx');

  assertNoDirectConsole(campaignDal, 'campaign screen DAL');
  assertNoDirectConsole(serverScreenDal, 'server screen DAL');
  assertNoDirectConsole(screenInvalidation, 'screen invalidation helper');
  assertNoDirectConsole(screenDiagnostics, 'screen diagnostics helper');
  assertNoDirectConsole(screenSettings, 'desktop digital screen settings');
  assertNoDirectConsole(screenLink, 'desktop digital screen link card');
  assertNoDirectConsole(ownerUploads, 'desktop digital screen owner uploads');
  assertNoDirectConsole(mobileScreenSettings, 'mobile digital screens');
  assertNoDirectConsole(screenUtils, 'screen utility helper');
  assertNoDirectConsole(ownerControlUsage, 'owner control usage DAL');
  assertNoDirectConsole(screenDisplay, 'public highlights screen display');
  assertNoDirectConsole(menuBoardDisplay, 'public menu board screen display');

  [
    [campaignDal, 'campaign screen DAL'],
    [serverScreenDal, 'server screen DAL'],
    [screenInvalidation, 'screen invalidation helper'],
    [screenSettings, 'desktop digital screen settings'],
    [screenLink, 'desktop digital screen link card'],
    [ownerUploads, 'desktop digital screen owner uploads'],
    [mobileScreenSettings, 'mobile digital screens'],
    [screenUtils, 'screen utility helper'],
    [screenPublicState, 'public screen state helper'],
    [screenContent, 'screen content helper'],
    [screenRenderer, 'screen renderer helper'],
    [screenSlides, 'screen slide generator'],
    [screenEvergreenSlides, 'screen evergreen slides'],
    [screenDisplay, 'public highlights screen display'],
    [menuBoardDisplay, 'public menu board screen display'],
    [screenPage, 'public screen route'],
    [screenAttribution, 'public screen attribution'],
  ].forEach(([content, label]) => {
    assertNoMenuIntelligenceConsumer(content, label);
  });

  assertIncludes(campaignDal, 'logCampaignScreenFailure', 'campaign screen DAL secure logging');
  assertIncludes(campaignDal, 'export function assertDigitalScreenMutationSucceeded', 'campaign screen DAL mutation acknowledgement guard');
  assertIncludes(campaignDal, 'digital_screen_mutation_rejected', 'campaign screen DAL default mutation rejection code');
  assertIncludes(campaignDal, 'digital_screen_slide_upload_update_rejected', 'campaign screen upload slide acknowledgement rejection code');
  assertNotIncludes(campaignDal, 'export const getScreenDataByToken', 'campaign DAL does not expose the removed client public-token resolver');
  assertNotIncludes(campaignDal, 'export const getMenuItemsForScreen', 'campaign DAL does not expose the removed client public-menu resolver');
  assertIncludes(campaignDal, 'projectIdLength: String(projectId || "").length', 'campaign history bounded project context');
  assertIncludes(screenPage, 'getScreenDataByTokenServer', 'public screen route uses the server token resolver');
  assertIncludes(screenPage, 'getMenuItemsForScreenServer', 'public screen route uses the server menu resolver');
  assertIncludes(serverScreenDal, 'logServerScreenFailure', 'server screen secure logging');
  assertIncludes(serverScreenDal, 'digital_screen_server_token_resolver_failed', 'server screen token failure logging');
  assertIncludes(serverScreenDal, 'digital_screen_server_menu_items_failed', 'server screen menu failure logging');
  assertIncludes(serverScreenDal, 'tokenLength: token.length', 'server screen bounded token context');
  assertIncludes(serverScreenDal, 'storeIdLength: storeId.length', 'server screen bounded store context');
  assertIncludes(serverScreenDal, 'baseProjectIdLength: String(baseProjectId || "").length', 'server screen bounded project context');
  assertIncludes(screenInvalidation, 'logServerScreenTouchFailure', 'screen invalidation secure logging');
  assertIncludes(screenInvalidation, 'digital_screen_server_content_version_touch_failed', 'screen invalidation content-version failure logging');
  assertIncludes(screenInvalidation, 'storeIdLength: storeId.length', 'screen invalidation bounded store context');
  assertIncludes(screenInvalidation, 'getPrivateScreenTokenCacheTag(screenToken)', 'screen invalidation exact token cache tag');
  assertIncludes(revalidateMenuRoute, 'body.touchScreen === true', 'protected screen refresh request');
  assertNotIncludes(revalidateMenuRoute, "'screen-data'", 'removed global screen cache fan-out');
  assertIncludes(storesDal, 'DIGITAL_SCREEN_STORE_OUTPUT_FIELDS', 'store output screen refresh field guard');
  assertIncludes(storesDal, 'touchScreen: hasDigitalScreenStoreOutputFieldChanges(data)', 'store output screen refresh');
  assertIncludes(brandPropagationBoundary, 'hasDigitalScreenBrandPropagationFields', 'multi-outlet screen refresh field guard');
  assertIncludes(brandPropagationRoute, 'storeIds: [masterStoreScope.documentId, ...propagationResult.targetOutletIds]', 'multi-outlet screen refresh uses committed target outlets');
  assertNotIncludes(brandPropagationRoute, 'includeScreenDataTag', 'multi-outlet screen refresh avoids global invalidation');
  assertIncludes(brandPropagationRoute, "touchDigitalScreenContentVersionForStoreServer(storeId, 'brandPropagation')", 'multi-outlet screen refresh');
  assertIncludes(screenDiagnostics, 'logScreenSettingsFailure', 'screen settings secure logging');
  assertIncludes(screenDiagnostics, 'logScreenDisplayFailure', 'screen display secure logging');
  assertIncludes(screenDiagnostics, 'getBoundedScreenStringContext', 'screen settings bounded string context');
  assertIncludes(screenDiagnostics, '"[Digital Screen] Settings operation failed"', 'screen settings secure diagnostic message');
  assertIncludes(screenDiagnostics, '"[Digital Screen] Display operation failed"', 'screen display secure diagnostic message');
  assertIncludes(screenDiagnostics, 'sourceErrorName', 'screen settings source error name');
  assertIncludes(screenDiagnostics, 'sourceErrorCode', 'screen settings source error code');
  assertIncludes(screenDiagnostics, 'copyScreenTextToClipboard', 'digital screen copy acknowledgement helper');
  assertIncludes(screenDiagnostics, 'SCREEN_CLIPBOARD_COPY_UNAVAILABLE', 'digital screen unavailable clipboard code');
  assertIncludes(screenDiagnostics, 'SCREEN_CLIPBOARD_COPY_FALLBACK_FAILED', 'digital screen fallback failure code');
  assertIncludes(screenDiagnostics, 'const copied = document.execCommand("copy");', 'digital screen textarea copy acknowledgement');
  assertIncludes(screenSettings, 'digital_screen_settings_load_failed', 'desktop screen settings load diagnostics');
  assertIncludes(screenSettings, 'digital_screen_settings_override_toggle_failed', 'desktop screen settings override diagnostics');
  assertIncludes(screenSettings, 'assertDigitalScreenMutationSucceeded(', 'desktop screen settings mutation acknowledgement guard');
  assertIncludes(screenSettings, 'desktop_digital_screen_override_update_rejected', 'desktop screen override rejected acknowledgement code');
  assertIncludes(screenSettings, "void trackOwnerControlUsage('screenOverride'", 'desktop screen override fire-and-forget tracking');
  assertIncludes(screenSettings, "void fetchSettings(); // Refresh to get new slide", 'desktop screen upload refresh fire-and-forget');
  assertIncludes(screenLink, 'desktop_digital_screen_link_open_failed', 'desktop screen link open diagnostics');
  assertIncludes(screenLink, 'desktop_digital_screen_link_copy_failed', 'desktop screen link copy diagnostics');
  assertIncludes(screenLink, 'desktop_digital_screen_link_open_blocked', 'desktop screen blocked-open code');
  assertIncludes(screenLink, 'logScreenSettingsFailure("desktop_digital_screen_link_open_failed"', 'desktop screen link secure diagnostics');
  assertIncludes(screenLink, 'logScreenSettingsFailure("desktop_digital_screen_link_copy_failed"', 'desktop screen link copy secure diagnostics');
  assertIncludes(screenLink, 'getBoundedScreenStringContext("screenOpenUrl", url)', 'desktop screen link bounded URL context');
  assertIncludes(screenLink, 'getBoundedScreenStringContext("screenCopyUrl", url)', 'desktop screen link copy bounded URL context');
  assertIncludes(screenLink, 'const opened = window.open(url, "_blank", "noopener,noreferrer")', 'desktop screen safe link open');
  assertIncludes(screenLink, 'copyScreenTextToClipboard(url)', 'desktop screen link acknowledged copy helper usage');
  assertIncludes(screenLink, 'hasClipboardWrite: hasScreenClipboardWrite()', 'desktop screen link clipboard support metadata');
  assertIncludes(screenLink, 'hasCopyFallback: hasScreenCopyFallback()', 'desktop screen link fallback support metadata');
  assertNotIncludes(screenLink, '} catch {\n            message.error("Unable to copy screen link");', 'desktop screen link copy must not be toast-only');
  assertNotIncludes(screenLink, 'await navigator.clipboard.writeText(url);\n            if (type === "menu")', 'desktop screen link copy must not use unguarded Clipboard API success');
  assertNotIncludes(screenLink, 'document.execCommand("copy");\n            if (type === "menu")', 'desktop screen link textarea fallback must not assume success');
  assertNotIncludes(screenLink, 'onOpen={() => window.open(screenUrl, "_blank", "noopener,noreferrer")}', 'desktop screen menu link silent open');
  assertNotIncludes(screenLink, 'onOpen={() => window.open(highlightsUrl, "_blank", "noopener,noreferrer")}', 'desktop screen highlights link silent open');
  [
    'desktop_digital_screen_slide_prepare_failed',
    'desktop_digital_screen_slide_upload_failed',
    'desktop_digital_screen_caption_update_failed',
    'desktop_digital_screen_slide_delete_failed',
  ].forEach((failureCode) => {
    assertIncludes(ownerUploads, failureCode, 'desktop digital screen owner-upload diagnostics');
  });
  [
    'desktop_digital_screen_caption_update_rejected',
    'desktop_digital_screen_slide_delete_rejected',
  ].forEach((failureCode) => {
    assertIncludes(ownerUploads, failureCode, 'desktop digital screen owner-upload rejected acknowledgement code');
  });
  assertIncludes(ownerUploads, 'assertDigitalScreenMutationSucceeded(', 'desktop digital screen owner-upload mutation acknowledgement guard');
  assertIncludes(ownerUploads, 'logScreenSettingsFailure', 'desktop digital screen owner-upload secure diagnostics');
  assertIncludes(ownerUploads, 'getBoundedScreenStringContext', 'desktop digital screen owner-upload bounded context');
  assertNotIncludes(ownerUploads, 'error?.message', 'desktop digital screen owner-upload raw exception text');
  assertNotIncludes(ownerUploads, 'error.message ||', 'desktop digital screen owner-upload raw exception text');
  [
    'mobile_digital_screen_state_load_failed',
    'mobile_digital_screen_override_toggle_failed',
    'mobile_digital_screen_slide_prepare_failed',
    'mobile_digital_screen_slide_upload_failed',
    'mobile_digital_screen_caption_update_failed',
    'mobile_digital_screen_slide_delete_failed',
    'mobile_digital_screen_link_open_failed',
    'mobile_digital_screen_link_copy_failed',
  ].forEach((failureCode) => {
    assertIncludes(mobileScreenSettings, failureCode, 'mobile digital screens bounded diagnostics');
  });
  [
    'mobile_digital_screen_override_update_rejected',
    'mobile_digital_screen_caption_update_rejected',
    'mobile_digital_screen_slide_delete_rejected',
  ].forEach((failureCode) => {
    assertIncludes(mobileScreenSettings, failureCode, 'mobile digital screens rejected acknowledgement code');
  });
  assertIncludes(mobileScreenSettings, 'assertDigitalScreenMutationSucceeded(', 'mobile digital screens mutation acknowledgement guard');
  assertIncludes(mobileScreenSettings, 'logScreenSettingsFailure', 'mobile digital screens secure diagnostics');
  assertIncludes(mobileScreenSettings, 'getBoundedScreenStringContext', 'mobile digital screens bounded context');
  assertIncludes(mobileScreenSettings, 'mobile_digital_screen_link_open_blocked', 'mobile digital screen blocked-open code');
  assertIncludes(mobileScreenSettings, "getBoundedScreenStringContext('screenOpenUrl', url)", 'mobile digital screen bounded open URL context');
  assertIncludes(mobileScreenSettings, "getBoundedScreenStringContext('screenCopyUrl', url)", 'mobile digital screen bounded copy URL context');
  assertIncludes(mobileScreenSettings, "const opened = window.open(url, '_blank', 'noopener,noreferrer')", 'mobile digital screen safe link open');
  assertIncludes(mobileScreenSettings, 'copyScreenTextToClipboard(url)', 'mobile digital screen acknowledged copy helper usage');
  assertIncludes(mobileScreenSettings, 'hasClipboardWrite: hasScreenClipboardWrite()', 'mobile digital screen clipboard support metadata');
  assertIncludes(mobileScreenSettings, 'hasCopyFallback: hasScreenCopyFallback()', 'mobile digital screen fallback support metadata');
  assertNotIncludes(mobileScreenSettings, "} catch {\n            Toast.show({ content: t('failedToCopy'), duration: 2000 });", 'mobile digital screen link copy must not be toast-only');
  assertNotIncludes(mobileScreenSettings, "await navigator.clipboard.writeText(url);\n            if (type === 'menu')", 'mobile digital screen link copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileScreenSettings, 'document.execCommand("copy");\n            if (type === \'menu\')', 'mobile digital screen textarea fallback must not assume success');
  assertNotIncludes(mobileScreenSettings, "onOpen={() => window.open(screenUrl, '_blank', 'noopener,noreferrer')}", 'mobile digital screen menu silent open');
  assertNotIncludes(mobileScreenSettings, "onOpen={() => window.open(highlightsUrl, '_blank', 'noopener,noreferrer')}", 'mobile digital screen highlights silent open');
  assertNotIncludes(mobileScreenSettings, 'error?.message', 'mobile digital screens owner-visible errors');
  assertNotIncludes(mobileScreenSettings, 'Toast.show({ content: error', 'mobile digital screens owner-visible errors');
  assertIncludes(ownerControlUsage, 'logOwnerControlUsageFailure', 'owner control usage secure logging');
  assertIncludes(ownerControlUsage, 'owner_control_tracking_schedule_failed', 'owner control schedule failure diagnostics');
  assertIncludes(ownerControlUsage, 'owner_control_tracking_write_failed', 'owner control write failure diagnostics');
  assertIncludes(ownerControlUsage, 'projectIdLength: projectId.length', 'owner control bounded project context');
  assertIncludes(ownerControlUsage, 'itemIdLength: itemId.length', 'owner control bounded item context');
  assertIncludes(ownerControlUsage, 'tIdLength: String(tId ?? \'\').length', 'owner control bounded tenant context');
  assertIncludes(ownerControlUsage, 'sIdLength: String(sId ?? \'\').length', 'owner control bounded store context');
  assertNotIncludes(campaignDal, 'Token not found: ${token}', 'campaign screen DAL diagnostics');
  assertNotIncludes(serverScreenDal, 'Token not found: ${token}', 'server screen DAL diagnostics');
  assertNotIncludes(campaignDal, 'screenToken}`', 'campaign screen DAL diagnostics');
  assertNotIncludes(campaignDal, 'Updated:`, settings', 'campaign screen DAL diagnostics');
  assertNotIncludes(screenSettings, '[DigitalScreenSettings] Error:', 'desktop screen settings raw diagnostic');
  assertNotIncludes(ownerControlUsage, '[OwnerControlUsage] Tracking error (non-blocking):', 'owner control usage raw schedule diagnostic');
  assertNotIncludes(ownerControlUsage, '[OwnerControlUsage] Tracked:', 'owner control usage raw success diagnostic');
  assertNotIncludes(ownerControlUsage, '[OwnerControlUsage] Failed to track:', 'owner control usage raw write diagnostic');
  assertNotIncludes(ownerControlUsage, 'console.debug', 'owner control usage raw debug diagnostic');
  [
    'digital_screen_display_cache_read_failed',
    'digital_screen_display_cache_write_failed',
    'digital_screen_display_seen_signal_failed',
    'digital_screen_display_listener_failed',
    'digital_screen_display_fullscreen_request_failed',
  ].forEach((failureCode) => {
    assertIncludes(screenDisplay, failureCode, `highlights screen display failure code ${failureCode}`);
  });
  assertIncludes(screenDisplay, 'SCREEN_SEEN_REQUEST_POLICY', 'highlights screen display seen-signal request policy');
  assertIncludes(screenDisplay, "cache: 'no-store'", 'highlights screen display seen-signal request bypasses browser cache');
  assertIncludes(screenDisplay, "credentials: 'same-origin'", 'highlights screen display seen-signal request keeps credentials same-origin');
  assertIncludes(screenDisplay, "redirect: 'manual'", 'highlights screen display seen-signal request does not follow redirects');
  assertIncludes(screenDisplay, '...SCREEN_SEEN_REQUEST_POLICY', 'highlights screen display uses seen-signal request policy');
  [
    'digital_screen_menuboard_cache_read_failed',
    'digital_screen_menuboard_cache_write_failed',
    'digital_screen_menuboard_seen_signal_failed',
    'digital_screen_menuboard_listener_failed',
    'digital_screen_menuboard_fullscreen_request_failed',
  ].forEach((failureCode) => {
    assertIncludes(menuBoardDisplay, failureCode, `menu board screen display failure code ${failureCode}`);
  });
  assertIncludes(menuBoardDisplay, 'SCREEN_SEEN_REQUEST_POLICY', 'menu board screen display seen-signal request policy');
  assertIncludes(menuBoardDisplay, "cache: 'no-store'", 'menu board screen display seen-signal request bypasses browser cache');
  assertIncludes(menuBoardDisplay, "credentials: 'same-origin'", 'menu board screen display seen-signal request keeps credentials same-origin');
  assertIncludes(menuBoardDisplay, "redirect: 'manual'", 'menu board screen display seen-signal request does not follow redirects');
  assertIncludes(menuBoardDisplay, '...SCREEN_SEEN_REQUEST_POLICY', 'menu board screen display uses seen-signal request policy');
  [
    [screenDisplay, '[Screen] Cache read failed:'],
    [screenDisplay, '[Screen] Cache write failed:'],
    [screenDisplay, '[Screen] Daily seen signal failed (will retry tomorrow)'],
    [screenDisplay, '[Screen] Listener error:'],
    [screenDisplay, 'Using cached data'],
    [screenDisplay, 'Using server data'],
    [screenDisplay, 'QR ready'],
    [screenDisplay, 'Content version changed'],
    [screenDisplay, 'requestFullscreen?.().catch(() => { })'],
    [menuBoardDisplay, '[MenuBoard] Snapshot error:'],
    [menuBoardDisplay, '[MenuBoard] Daily seen signal failed (will retry tomorrow)'],
    [menuBoardDisplay, 'Using cached data'],
    [menuBoardDisplay, 'Offline fallback refresh attempt'],
    [menuBoardDisplay, 'requestFullscreen?.().catch(() => { })'],
  ].forEach(([source, rawDiagnostic]) => {
    assertNotIncludes(source, rawDiagnostic, `public screen raw diagnostic ${rawDiagnostic}`);
  });
}

const checks = [
  ['manifest identity', verifyManifestIdentity],
  ['manifest link', verifyManifestLink],
  ['manifest route', verifyManifestRoute],
  ['customer app shortcut handoff boundary', verifyCustomerAppShortcutHandoffBoundary],
  ['customer service worker policy', verifyCustomerServiceWorkerPolicy],
  ['client menu offline docs', verifyClientMenuOfflineDocsMatchServiceWorkerPolicy],
  ['customer app public copy freshness boundary', verifyCustomerAppPublicCopyFreshnessBoundary],
  ['customer app technical doc boundaries', verifyCustomerAppTechnicalDocBoundaries],
  ['owner Serwist scoping', verifyOwnerSerwistScoping],
  ['owner auth manifest', verifyOwnerAuthManifest],
  ['owner transparent favicons', verifyOwnerFaviconsTransparent],
  ['customer app assets', verifyCustomerAppAssets],
  ['analytics coverage', verifyAnalyticsCoverage],
  ['PWA tracking diagnostics', verifyPwaTrackingDiagnostics],
  ['menu freshness hook', verifyFreshnessHook],
  ['digital screen diagnostics', verifyDigitalScreenDiagnostics],
];

for (const [label, fn] of checks) {
  fn();
  console.log(`✓ ${label}`);
}

console.log('Customer App PWA static verification passed.');
