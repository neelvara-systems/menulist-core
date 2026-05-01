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
  ['analytics coverage', verifyAnalyticsCoverage],
  ['menu freshness hook', verifyFreshnessHook],
];

for (const [label, fn] of checks) {
  fn();
  console.log(`✓ ${label}`);
}

console.log('Customer App PWA static verification passed.');
