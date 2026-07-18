#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, token, label) {
  assert(content.includes(token), `${label} must include ${token}`);
}

function stripJsComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const nextConfig = read('next.config.js');
const executableNextConfig = stripJsComments(nextConfig);
[
  'register: false',
  'skipWaiting: true',
  'reloadOnOnline: false',
  'cacheStartUrl: false',
  'buildExcludes: [/\\.map$/]',
  'publicExcludes: [',
].forEach((token) => assertIncludes(nextConfig, token, 'owner PWA build boundary'));
for (const cacheName of ['owner-dashboard-pages', 'auth-pages', 'screen-pages']) {
  assert(!executableNextConfig.includes(`cacheName: '${cacheName}'`), `owner PWA must not cache ${cacheName}`);
}
for (const token of ['firestore.googleapis.com', 'firebasestorage.googleapis.com', '/api/public', "urlPattern: /^\\/_client"]) {
    assert(!executableNextConfig.includes(token), `owner PWA runtime cache must exclude ${token}`);
}
assert(!executableNextConfig.includes("cacheName: 'static-assets'"), 'owner PWA must not use a broad extension runtime cache');

const worker = read('worker/index.js');
for (const cacheName of ['start-url', 'owner-dashboard-pages', 'auth-pages', 'screen-pages', 'firebase-images', 'static-assets']) {
  assertIncludes(worker, `'${cacheName}'`, `retired owner cache cleanup for ${cacheName}`);
}
assertIncludes(worker, "self.addEventListener('activate'", 'retired owner cache activation cleanup');

const registration = read('src/components/ServiceWorkerRegister.tsx');
[
  "deploymentStage.stage !== 'preview'",
  'await currentRegistration?.update();',
  '/^\\/assets(?:\\/|$)/',
  '/^\\/business-health(?:\\/|$)/',
  '/^\\/forgot-password(?:\\/|$)/',
  '/^\\/growth-kits(?:\\/|$)/',
  '/^\\/menu-manager(?:\\/|$)/',
].forEach((token) => assertIncludes(registration, token, 'owner service-worker lifecycle'));

const manifest = JSON.parse(read('public/manifest.json'));
assert(manifest.name === 'MenuList', 'owner manifest must use the MenuList identity');
assert(manifest.start_url === '/today', 'owner manifest must launch /today');
assert(manifest.display === 'standalone', 'owner manifest must use standalone display');
assert(manifest.orientation === undefined, 'owner manifest must allow device rotation');

const networkHook = read('src/hooks/useNetworkStatus.ts');
[
  "window.addEventListener('online', updateNetworkStatus)",
  "window.addEventListener('offline', updateNetworkStatus)",
  'Number.isFinite(value)',
].forEach((token) => assertIncludes(networkHook, token, 'owner network signal boundary'));

const networkProvider = read('src/providers/NetworkStatusProvider.tsx');
assertIncludes(networkProvider, 'role="status"', 'non-blocking connectivity notice');
assertIncludes(networkProvider, 'You can keep working.', 'slow-network continuation copy');
assert(!networkProvider.includes('<Modal'), 'connectivity must not block owner workflows');
assert(!networkProvider.includes("fetch('/favicon.ico'"), 'connectivity must not trust a cacheable favicon probe');

const mobileShell = read('src/components/mobile/MobileShell.tsx');
assert(!mobileShell.includes('navigator.onLine'), 'MobileShell must inherit the shared connectivity boundary');
assert(!mobileShell.includes('setIsOffline'), 'MobileShell must not duplicate connectivity state');

const updatePrompt = read('src/components/common/OwnerAppUpdatePrompt.tsx');
[
  "formatDateTime(parsed, 'datetime', formatter)",
  'aria-label="Dismiss update prompt"',
  'window.sessionStorage.setItem(DISMISSED_BUILD_KEY, serverBuildId)',
  'window.location.reload()',
].forEach((token) => assertIncludes(updatePrompt, token, 'owner update prompt'));

const offlinePage = read('src/app/offline/page.tsx');
assertIncludes(offlinePage, 'latest information', 'shared offline fallback');
assert(!offlinePage.includes('latest live menu'), 'shared offline fallback must not claim customer-only context');

const ownerRuntimeSources = `${nextConfig}\n${worker}\n${registration}`;
assert(!/addEventListener\(['"]sync['"]/.test(ownerRuntimeSources), 'owner PWA must not add background mutation replay');

const docs = [
  '__docs__/owner-pwa-lifecycle/README.md',
  '__docs__/owner-pwa-lifecycle/owner-pwa-lifecycle_spec.md',
  '__docs__/owner-pwa-lifecycle/owner-pwa-lifecycle_impl.md',
  '__docs__/owner-pwa-lifecycle/owner-pwa-lifecycle_firebase.md',
  '__docs__/owner-pwa-lifecycle/owner-pwa-lifecycle_mobile-support.md',
  '__docs__/owner-pwa-lifecycle/owner-pwa-lifecycle_test-cases.md',
  '__docs__/owner-pwa-lifecycle/owner-pwa-lifecycle_verification.md',
];
docs.forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Owner PWA lifecycle source boundary passed.');
