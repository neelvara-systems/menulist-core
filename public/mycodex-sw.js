/**
 * MyCodex Service Worker
 *
 * Private docs policy:
 * - Do not cache document pages or markdown content.
 * - Cache only the offline fallback and static MyCodex logo assets.
 * - Navigation is network-first; offline shows /offline.
 */

const MYCODEX_OFFLINE_URL = '/offline';
const MYCODEX_CACHE = 'mycodex-offline-v1';
const MYCODEX_NAVIGATION_TIMEOUT_MS = 8000;
const MYCODEX_STATIC_ASSETS = [
  MYCODEX_OFFLINE_URL,
  '/mycodex-logo.svg',
  '/mycodex-logo.png',
  '/mycodex-icon-192.png',
  '/mycodex-icon-512.png',
];

const fetchNavigationWithTimeout = async (request) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MYCODEX_NAVIGATION_TIMEOUT_MS);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(MYCODEX_CACHE);
      await Promise.all(
        MYCODEX_STATIC_ASSETS.map((url) => (
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
          .filter((key) => key.startsWith('mycodex-') && key !== MYCODEX_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        return await fetchNavigationWithTimeout(request);
      } catch {
        const cache = await caches.open(MYCODEX_CACHE);
        const cached = await cache.match(MYCODEX_OFFLINE_URL);
        if (cached) return cached;

        return new Response(
          '<!doctype html><meta charset="utf-8"><title>MyCodex offline</title>'
          + '<p style="font-family:system-ui;padding:2rem;text-align:center">'
          + 'MyCodex is offline. Reconnect and try again.</p>',
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
