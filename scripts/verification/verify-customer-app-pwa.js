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
  const executableRoute = stripJsComments(route);
  assertIncludes(route, 'getStoreManifestStartUrl', 'manifest route');
  assertIncludes(route, 'startUrl,', 'manifest route');
  assertIncludes(route, 'secureError(', 'manifest route secure failure logging');
  assertIncludes(route, "'[manifest] generation failed'", 'manifest route secure failure logging');
  assertIncludes(route, "new Error('customer_app_manifest_generation_failed')", 'manifest route normalized failure logging');
  assertIncludes(route, 'buildManifestFailureLogContext', 'manifest route bounded failure context');
  assertIncludes(route, 'hostnameLength: hostname.length', 'manifest route bounded host context');
  assertIncludes(route, 'storeIdLength: normalizedStoreId.length', 'manifest route bounded store context');
  assertIncludes(route, 'errorName: error instanceof Error ? error.name : typeof error', 'manifest route bounded error context');
  assertNotIncludes(route, 'MANIFEST_START_URL_DEGRADED', 'manifest route');
  assertNotIncludes(route, 'resolveStartUrlWithFallback', 'manifest route');
  assertNotIncludes(executableRoute, 'console.error', 'manifest route executable code');
}

function verifyCustomerServiceWorkerPolicy() {
  const sw = read('public/sw-customer.js');
  const register = read('src/components/ServiceWorkerRegister.tsx');
  const rootLayout = read('src/app/layout.tsx');
  const executableSw = stripJsComments(sw);
  assertIncludes(sw, 'FROZEN: Offline page only. NEVER cached menu fallback.', 'customer service worker');
  assertIncludes(sw, "const OFFLINE_URL = '/offline';", 'customer service worker');
  assertIncludes(sw, "const OFFLINE_CACHE = 'customer-app-offline-v1';", 'customer service worker');
  assertNotIncludes(executableSw, '/_client', 'customer service worker executable code');
  assertNotIncludes(executableSw, 'firestore.googleapis.com', 'customer service worker executable code');
  assertNotIncludes(executableSw, 'cache.put', 'customer service worker executable code');
  assertIncludes(register, 'service_worker_unregister_failed', 'service worker registration cleanup diagnostics');
  assertIncludes(register, 'activeWorker: getRegisteredSwLabel(activeUrl)', 'service worker active-worker bounded label');
  assertIncludes(register, 'targetWorker: getTargetSwLabel(targetUrl)', 'service worker target-worker bounded label');
  assertNotIncludes(register, 'reg.unregister().catch(() => { })', 'service worker unregister silent catch');
  assertIncludes(rootLayout, 'logDevServiceWorkerCleanupFailure', 'root development service-worker cleanup diagnostics');
  assertIncludes(rootLayout, 'get_registrations_failed', 'root development service-worker registration lookup diagnostics');
  assertIncludes(rootLayout, 'unregister_failed', 'root development service-worker unregister diagnostics');
  assertIncludes(rootLayout, 'hostLength', 'root development service-worker bounded host metadata');
  assertNotIncludes(rootLayout, '.catch(() => {});', 'root development service-worker silent catch');
}

function verifyNextPwaScoping() {
  const nextConfig = read('next.config.js');
  const executableConfig = stripJsComments(nextConfig);
  assertIncludes(nextConfig, 'register: false', 'next-pwa config');
  assertNotIncludes(executableConfig, "urlPattern: /^\\/_client", 'next-pwa runtimeCaching');
  assertNotIncludes(executableConfig, 'firestore.googleapis.com', 'next-pwa runtimeCaching');
  assertNotIncludes(executableConfig, '/api/public', 'next-pwa runtimeCaching');
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
  assertIncludes(mobileShell, "'/dashboard': MOBILE_ROUTE_DEFAULT", 'owner mobile launch mapping');
  assert(ownerManifest.display === 'standalone', 'owner manifest display must be standalone');
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
  const publicStoreLookup = read('src/lib/firestore/clientStoreLookup.ts');
  const executableIconRoute = stripJsComments(appIconRoute);
  const executableSplashRoute = stripJsComments(appSplashRoute);
  const executableScreenshotRoute = stripJsComments(appScreenshotRoute);

  assertIncludes(publicStoreLookup, 'export const getPublicStoreById = cache(', 'public store-id lookup');
  assertIncludes(publicStoreLookup, 'data.active === false || data.deleted === true', 'public store-id lookup active/deleted guard');
  assertIncludes(publicStoreLookup, 'isStoreOrTenantBlocked(data)', 'public store-id lookup platform block guard');
  assertIncludes(appIconRoute, 'renderCustomerAppIcon', 'customer app icon route');
  assertIncludes(appIconRoute, "import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';", 'customer app icon route public store lookup');
  assertIncludes(appIconRoute, 'const store = await getPublicStoreById(storeId);', 'customer app icon route public store lookup');
  assertIncludes(appIconRoute, 'resolveCustomerAppIconSource', 'customer app icon route');
  assertIncludes(appIconRoute, "iconSource.source === 'override'", 'customer app icon route');
  assertIncludes(appIconRoute, 'customer_app_icon_generation_failed', 'customer app icon route bounded fallback logging');
  assertIncludes(appIconRoute, "getBoundedRuntimeStringContext('storeId', storeId)", 'customer app icon route bounded store context');
  assertIncludes(appIconRoute, 'const ipHash = hashPublicRateLimitValue(getClientIp(request));', 'customer app icon route hashed rate-limit IP key');
  assertIncludes(appIconRoute, 'key: `public-dynamic-asset:icon:${ipHash}`', 'customer app icon route must not store raw IP rate-limit keys');
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
  assertIncludes(desktopSettings, 'assertPWASettingsUpdateSucceeded(settingsResult);', 'desktop customer app settings acknowledgement guard');
  assertIncludes(desktopSettings, 'assertPWAIconOverrideUpdateSucceeded(iconResult);', 'desktop customer app icon acknowledgement guard');
  assertIncludes(desktopSettings, "customer_app_business_copy_meta_update_rejected", 'desktop customer app metadata acknowledgement guard');
  assertIncludes(mobileSettings, 'assertPWASettingsUpdateSucceeded(settingsResult);', 'mobile customer app settings acknowledgement guard');
  assertIncludes(mobileSettings, 'assertPWAIconOverrideUpdateSucceeded(iconResult);', 'mobile customer app icon acknowledgement guard');
  assertIncludes(mobileSettings, "customer_app_business_copy_meta_update_rejected", 'mobile customer app metadata acknowledgement guard');
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
    'updateData[`installsByPlatform.${data.pwaPlatform}`] = 1;',
    'updateData[`installsBySource.${data.pwaInstallSource}`] = 1;',
    'updateData[`appOpensByPlatform.${data.pwaPlatform}`] = 1;',
  ].forEach((needle) => {
    assertIncludes(analytics, needle, `Customer App analytics event field ${needle}`);
  });

  assertIncludes(publicAnalyticsRoute, "const RESERVED_PROJECT_IDS = new Set(['obp', 'customerApp']);", 'public analytics reserved customerApp project id');
  assertIncludes(publicAnalyticsRoute, "const rateLimitResponse = await checkPublicRateLimit(req, 'PUBLIC_ANALYTICS');", 'public analytics rate-limit before body parse');
  assertIncludes(publicAnalyticsRoute, 'const bodyResult = await readBoundedJsonBody(req, PUBLIC_ANALYTICS_TRACK_MAX_BODY_BYTES);', 'public analytics bounded body read');
  assertIncludes(publicAnalyticsRoute, "if (projectId === 'customerApp') return preferences.trackCustomerApp;", 'public analytics Customer App preference gate');
  assertIncludes(publicAnalyticsRoute, 'projectId: data.projectId,', 'public analytics writes validated project id');
  assertIncludes(publicAnalyticsRoute, "logAnalyticsFailure('public_analytics_track_failed'", 'public analytics bounded failure logging');
  assertNotIncludes(publicAnalyticsRoute, 'req.json()', 'public analytics route must not parse unbounded JSON');

  for (const [label, content] of [
    ['client analytics writer', clientAnalyticsWrite],
    ['server analytics writer', serverAnalyticsWrite],
  ]) {
    assertIncludes(content, "projectId === 'customerApp'", `${label} Customer App surface routing`);
    assertIncludes(content, "? 'customerApp'", `${label} Customer App surface value`);
    assertIncludes(content, 'filterAnalyticsUpdateData(updateData)', `${label} analytics write policy`);
    assertIncludes(content, 'assignProcessedAnalyticsField', `${label} dotted field preservation`);
  }

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
  assertIncludes(dashboardDal, "getDocId.dashboardSummary(tId, sId, 'customerApp')", 'Customer App dashboard DAL doc id');
  assertIncludes(dashboardDal, 'summary: data.summary || null', 'Customer App dashboard DAL summary field');
  assertIncludes(dashboardDal, 'daily30d: Array.isArray(data.daily30d) ? data.daily30d : []', 'Customer App dashboard DAL daily rows');
  assertIncludes(dashboardDal, '"getCustomerAppDashboardSummary"', 'Customer App dashboard DAL apiCallComposer label');
  assertIncludes(dashboardHook, 'getCustomerAppDashboardSummary(tId!, sId!)', 'Customer App dashboard hook DAL fetch');
  assertIncludes(dashboardHook, 'getAnalyticsSchedulerCacheKey(new Date()', 'Customer App dashboard hook scheduler cache key');
  assertIncludes(dashboardHook, 'dedupingInterval: 86400000', 'Customer App dashboard hook daily dedupe');

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
  assertIncludes(customerAppSpec, 'Runtime implemented and source-gated; manual device QA still required', 'Customer App spec source-gated status');
  assertIncludes(customerAppFirebase, 'Source-gated runtime evidence; external certification still required', 'Customer App Firebase source-gated status');
  assertIncludes(customerAppMobile, 'Source-gated runtime evidence; real-device QA still required', 'Customer App mobile source-gated status');
  assertIncludes(customerAppHelp, 'Source-backed help draft; not standalone launch certification', 'Customer App helpdoc launch boundary');
  assertIncludes(customerAppMarketing, 'Source-backed marketing draft; not standalone launch certification', 'Customer App marketing launch boundary');
  assertIncludes(customerAppWebsite, 'Source-backed website draft; not standalone launch certification', 'Customer App website launch boundary');
}

function verifyPwaTrackingDiagnostics() {
  const diagnostics = read('src/lib/pwa/pwaDiagnostics.ts');
  const shortcutDetector = read('src/lib/pwa/shortcutSourceDetector.ts');
  const standaloneDetector = read('src/lib/pwa/standaloneDetector.ts');
  const installTracker = read('src/lib/pwa/installTracker.ts');
  const installPrompt = read('src/components/customerApp/InstallPrompt.tsx');
  const mobileSettings = read('src/components/mobile/screens/MobileCustomerAppScreen.tsx');
  const desktopSettings = read('src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx');

  assertNoDirectConsole(diagnostics, 'Customer App PWA diagnostics helper');
  assertNoDirectConsole(shortcutDetector, 'Customer App shortcut detector');
  assertNoDirectConsole(standaloneDetector, 'Customer App standalone detector');
  assertNoDirectConsole(installTracker, 'Customer App install tracker');
  assertNoDirectConsole(installPrompt, 'Customer App install prompt');
  assertNoDirectConsole(mobileSettings, 'Mobile Customer App settings screen');
  assertNoDirectConsole(desktopSettings, 'Desktop Customer App settings tab');

  assertIncludes(diagnostics, "import { secureError } from '@lib/security/secureLogger';", 'Customer App PWA diagnostics helper');
  assertIncludes(diagnostics, 'getBoundedPwaStringContext', 'Customer App PWA bounded context helper');
  assertIncludes(diagnostics, 'logPwaTrackingFailure', 'Customer App PWA tracking diagnostics helper');
  assertIncludes(diagnostics, "secureError('[Customer App PWA] Operation failed'", 'Customer App PWA secure diagnostics');
  assertIncludes(diagnostics, 'sourceErrorName', 'Customer App PWA source error name');
  assertIncludes(diagnostics, 'sourceErrorCode', 'Customer App PWA source error code');
  assertIncludes(shortcutDetector, 'customer_app_shortcut_tracking_failed', 'Customer App shortcut tracking diagnostics');
  assertIncludes(standaloneDetector, 'customer_app_open_tracking_failed', 'Customer App open tracking diagnostics');
  assertIncludes(installTracker, 'customer_app_install_tracking_failed', 'Customer App install tracking diagnostics');
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
  assertIncludes(installTracker, 'storageAvailable: false', 'Customer App install no-storage failure diagnostics');
  assertIncludes(installTracker, 'storageAvailable: true', 'Customer App install storage failure diagnostics');
  assertNotIncludes(shortcutDetector, '[pwa] detectAndTrackShortcutLaunch failed', 'Customer App shortcut raw warning');
  assertNotIncludes(standaloneDetector, '[pwa] detectAndTrackAppOpen failed', 'Customer App standalone raw warning');
  assertNotIncludes(installTracker, '[pwa] fireInstalledEventOnce failed', 'Customer App install raw warning');
  assertNotIncludes(installPrompt, '[pwa] native install prompt failed:', 'Customer App native install prompt raw warning');
  assertNotIncludes(mobileSettings, '[MobileCustomerAppScreen] save failed:', 'Mobile Customer App settings raw diagnostic');
  assertNotIncludes(mobileSettings, "} catch {\n            Toast.show({ content: 'Could not copy", 'Mobile Customer App silent install-link copy catch');
  assertNotIncludes(mobileSettings, "await navigator.clipboard.writeText(installLink);\n            Toast.show", 'Mobile Customer App install-link copy must not use unguarded Clipboard API success');
  assertNotIncludes(mobileSettings, "document.execCommand('copy');\n            Toast.show", 'Mobile Customer App textarea fallback must not assume copy success');
  assertNotIncludes(desktopSettings, '[CustomerAppTab] save failed:', 'Desktop Customer App settings raw diagnostic');
  assertNotIncludes(desktopSettings, "} catch {\n            message.error('Could not copy", 'Desktop Customer App silent install-link copy catch');
  assertNotIncludes(desktopSettings, "await navigator.clipboard.writeText(installLink);\n            message.success", 'Desktop Customer App install-link copy must not use unguarded Clipboard API success');
  assertNotIncludes(desktopSettings, "document.execCommand('copy');\n            message.success", 'Desktop Customer App textarea fallback must not assume copy success');
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
  const screenInvalidation = read('src/lib/screen/screenInvalidation.ts');
  const screenDiagnostics = read('src/lib/screen/screenDiagnostics.ts');
  const storesDal = read('src/database/stores/index.tsx');
  const brandPropagation = read('src/database/multiOutlet/brandPropagation.ts');
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
  assertIncludes(campaignDal, 'digital_screen_client_token_resolver_failed', 'campaign screen token failure logging');
  assertIncludes(campaignDal, 'digital_screen_client_menu_items_failed', 'campaign screen menu failure logging');
  assertIncludes(campaignDal, 'tokenLength: token.length', 'campaign screen bounded token context');
  assertIncludes(campaignDal, 'storeIdLength: storeId.length', 'campaign screen bounded store context');
  assertIncludes(campaignDal, 'projectIdLength: String(projectId || "").length', 'campaign history bounded project context');
  assertIncludes(serverScreenDal, 'logServerScreenFailure', 'server screen secure logging');
  assertIncludes(serverScreenDal, 'digital_screen_server_token_resolver_failed', 'server screen token failure logging');
  assertIncludes(serverScreenDal, 'digital_screen_server_menu_items_failed', 'server screen menu failure logging');
  assertIncludes(serverScreenDal, 'tokenLength: token.length', 'server screen bounded token context');
  assertIncludes(serverScreenDal, 'baseProjectIdLength: String(baseProjectId || "").length', 'server screen bounded project context');
  assertIncludes(screenInvalidation, 'logScreenInvalidationFailure', 'screen invalidation secure logging');
  assertIncludes(screenInvalidation, 'digital_screen_projection_build_failed', 'screen invalidation projection failure logging');
  assertIncludes(screenInvalidation, 'digital_screen_content_version_touch_failed', 'screen invalidation content-version failure logging');
  assertIncludes(screenInvalidation, 'projectIdLength: projectId.length', 'screen invalidation bounded project context');
  assertIncludes(storesDal, 'DIGITAL_SCREEN_STORE_OUTPUT_FIELDS', 'store output screen refresh field guard');
  assertIncludes(storesDal, 'await touchDigitalScreenContentVersion(data.storeId, "updateStore");', 'store output screen refresh');
  assertIncludes(brandPropagation, 'hasDigitalScreenPropagatedOutputChanges(propagatedChanges)', 'multi-outlet screen refresh field guard');
  assertIncludes(brandPropagation, 'await touchDigitalScreenContentVersion(outlet.storeId, "propagateMasterStoreChangesToOutlets");', 'multi-outlet screen refresh');
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
  ['customer service worker policy', verifyCustomerServiceWorkerPolicy],
  ['next-pwa scoping', verifyNextPwaScoping],
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
