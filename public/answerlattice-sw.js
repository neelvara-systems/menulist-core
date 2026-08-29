/**
 * AnswerLattice service worker.
 *
 * Privacy and freshness policy:
 * - Never cache tenant pages, API responses, support content, or knowledge data.
 * - Cache only the branded offline fallback and immutable logo assets.
 * - Keep navigations network-first and fall back only when the network fails.
 */

const ANSWERLATTICE_SCOPE_PATH = new URL(self.registration.scope).pathname;
const ANSWERLATTICE_OFFLINE_URL = ANSWERLATTICE_SCOPE_PATH === '/answerlattice/'
  ? '/__answerlattice/offline'
  : '/offline';
const ANSWERLATTICE_CACHE = 'answerlattice-offline-v1';
const ANSWERLATTICE_NAVIGATION_TIMEOUT_MS = 8000;
const ANSWERLATTICE_STATIC_ASSETS = [
  ANSWERLATTICE_OFFLINE_URL,
  '/answerlattice-logo.svg',
  '/answerlattice-icon-192.png',
  '/answerlattice-icon-512.png',
];

const fetchNavigationWithTimeout = async (request) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANSWERLATTICE_NAVIGATION_TIMEOUT_MS);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ANSWERLATTICE_CACHE);
      await Promise.all(
        ANSWERLATTICE_STATIC_ASSETS.map((url) => (
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('answerlattice-') && key !== ANSWERLATTICE_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        return await fetchNavigationWithTimeout(request);
      } catch {
        const cache = await caches.open(ANSWERLATTICE_CACHE);
        const cached = await cache.match(ANSWERLATTICE_OFFLINE_URL);
        if (cached) return cached;

        return new Response(
          '<!doctype html><meta charset="utf-8"><title>AnswerLattice offline</title>'
          + '<p style="font-family:system-ui;padding:2rem;text-align:center">'
          + 'AnswerLattice is offline. Reconnect and try again.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      }
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
