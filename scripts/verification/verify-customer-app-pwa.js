require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

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
  assertIncludes(page, "const manifestUrl = '/manifest.webmanifest';", 'client metadata');
  assertIncludes(page, 'startupImage: getCustomerAppleStartupImages(storeData.id)', 'client metadata startup images');
  assertNotIncludes(page, 'manifest.webmanifest?start=', 'client metadata');
}

function verifyManifestRoute() {
  const route = read('src/app/manifest.webmanifest/route.ts');
  assertIncludes(route, 'getStoreManifestStartUrl', 'manifest route');
  assertIncludes(route, 'startUrl,', 'manifest route');
  assertNotIncludes(route, 'MANIFEST_START_URL_DEGRADED', 'manifest route');
  assertNotIncludes(route, 'resolveStartUrlWithFallback', 'manifest route');
}

function verifyCustomerServiceWorkerPolicy() {
  const sw = read('public/sw-customer.js');
  const executableSw = stripJsComments(sw);
  assertIncludes(sw, 'FROZEN: Offline page only. NEVER cached menu fallback.', 'customer service worker');
  assertIncludes(sw, "const OFFLINE_URL = '/offline';", 'customer service worker');
  assertIncludes(sw, "const OFFLINE_CACHE = 'customer-app-offline-v1';", 'customer service worker');
  assertNotIncludes(executableSw, '/_client', 'customer service worker executable code');
  assertNotIncludes(executableSw, 'firestore.googleapis.com', 'customer service worker executable code');
  assertNotIncludes(executableSw, 'cache.put', 'customer service worker executable code');
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
  const ownerManifest = JSON.parse(read('public/manifest.json'));
  const ownerIconFiles = [
    'public/apple-touch-icon.png',
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
  assert(ownerManifest.start_url === '/dashboard', 'owner manifest start_url must be /dashboard');
  assert(ownerManifest.display === 'standalone', 'owner manifest display must be standalone');
  assert(Array.isArray(ownerManifest.icons), 'owner manifest icons must be an array');
  for (const icon of ownerManifest.icons) {
    assert(icon.src, 'owner manifest icon must include src');
    assert(fs.existsSync(path.join(ROOT, 'public', icon.src)), `owner manifest icon file missing: ${icon.src}`);
  }
  for (const file of ownerIconFiles) {
    assert(fs.existsSync(path.join(ROOT, file)), `owner PWA icon file missing: ${file}`);
  }
}

function verifyCustomerAppAssets() {
  const appIconRoute = read('src/app/api/app-icons/[storeId]/[size]/route.tsx');
  const appSplashRoute = read('src/app/api/app-splash/[storeId]/[size]/route.tsx');
  const assetHelpers = read('src/lib/pwa/customerAppAssets.tsx');
  const clientPage = read('src/app/client/[[...slug]]/page.tsx');
  const manifestGenerator = read('src/lib/pwa/manifestGenerator.ts');
  const mobileSettings = read('src/components/mobile/screens/MobileCustomerAppScreen.tsx');
  const executableIconRoute = stripJsComments(appIconRoute);

  assertIncludes(appIconRoute, 'renderCustomerAppIcon', 'customer app icon route');
  assertIncludes(appIconRoute, 'resolveCustomerAppIconImageUrl', 'customer app icon route');
  assertNotIncludes(executableIconRoute, 'Response.redirect', 'customer app icon route executable code');
  assertIncludes(appSplashRoute, 'renderCustomerAppSplash', 'customer app splash route');
  assertIncludes(appSplashRoute, 'parseCustomerAppSplashSize', 'customer app splash route');
  assertIncludes(assetHelpers, 'CUSTOMER_APPLE_STARTUP_IMAGES', 'customer app asset helpers');
  assertIncludes(assetHelpers, 'deriveCustomerAppShortName', 'customer app asset helpers');
  assertIncludes(assetHelpers, "objectFit: 'contain'", 'customer app asset helpers');
  assertIncludes(clientPage, 'deriveCustomerAppShortName(storeName, pwaShortName)', 'client metadata app title');
  assertIncludes(manifestGenerator, "`${iconBase}/180`", 'customer app manifest icons');
  assertIncludes(manifestGenerator, "`${iconBase}/384`", 'customer app manifest icons');
  assertIncludes(mobileSettings, "objectFit: 'contain'", 'mobile customer app icon preview');
}

function verifyAnalyticsCoverage() {
  const analytics = read('src/lib/analytics/unified.ts');
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
}

function verifyFreshnessHook() {
  const hook = read('src/hooks/useMenuFreshness.ts');
  assertIncludes(hook, 'router.refresh();', 'menu freshness hook');
  assertIncludes(hook, 'minRefreshIntervalMs = 60_000', 'menu freshness hook cooldown');
  assertNotIncludes(hook, 'onSnapshot', 'menu freshness hook');
  assertNotIncludes(hook, 'setInterval', 'menu freshness hook');
}

const checks = [
  ['manifest identity', verifyManifestIdentity],
  ['manifest link', verifyManifestLink],
  ['manifest route', verifyManifestRoute],
  ['customer service worker policy', verifyCustomerServiceWorkerPolicy],
  ['next-pwa scoping', verifyNextPwaScoping],
  ['owner auth manifest', verifyOwnerAuthManifest],
  ['customer app assets', verifyCustomerAppAssets],
  ['analytics coverage', verifyAnalyticsCoverage],
  ['menu freshness hook', verifyFreshnessHook],
];

for (const [label, fn] of checks) {
  fn();
  console.log(`✓ ${label}`);
}

console.log('Customer App PWA static verification passed.');
