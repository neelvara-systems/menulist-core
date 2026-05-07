/**
 * Customer App Service Worker (Hand-Rolled, Minimal)
 * ═══════════════════════════════════════════════════════════════
 *
 * Purpose:
 *   PWA install reliability + branded offline fallback for customer
 *   tenant origins ({subdomain}.menulist.ai, verified custom domains).
 *
 * Frozen Policy (customer-app_spec.md § Plugin Governance Rule):
 *   - NO menu content caching
 *   - NO Firestore API caching
 *   - NO /_client/* page caching
 *   - NO runtime cache of tenant-facing URL patterns
 *   - Menu freshness is a server-side concern (unstable_cache +
 *     revalidateTag on every owner save)
 *
 * What this SW does cache:
 *   - /offline fallback page (precached once, served when offline)
 *
 * What this SW does NOT cache:
 *   - Menu HTML, menu data, Firestore responses, item images
 *   - Nothing else. If you're thinking about caching anything here,
 *     read customer-app_spec.md § 8 "Plugin Governance Rule" first.
 *
 * FROZEN: Offline page only. NEVER cached menu fallback.
 *   When offline, the customer sees the branded /offline page.
 *   We NEVER serve a stale cached menu — it would show items that
 *   may be sold out, priced differently, or no longer on the menu.
 *   A trustworthy "offline" screen beats a plausible-looking but
 *   stale menu every time. This boundary is frozen and must not
 *   drift ("maybe we should cache last menu too…" → NO).
 *
 * @see __docs__/customer-app/customer-app_spec.md
 * @see next.config.js § Service Worker Strategy
 */

const OFFLINE_URL = '/offline';
const OFFLINE_CACHE = 'customer-app-offline-v1';
const NAVIGATION_TIMEOUT_MS = 8000;

const fetchNavigationWithTimeout = async (request) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);

    try {
        return await fetch(request, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

// Precache the offline fallback page on install.
// This is the ONLY thing stored in cache storage for customer tenants.
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(OFFLINE_CACHE);
            try {
                await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
            } catch (err) {
                // Non-fatal: offline page will just be a browser error if
                // precache failed. Install still proceeds.
            }
            await self.skipWaiting();
        })(),
    );
});

// On activate, drop any legacy caches from older SW versions and take
// control of open pages immediately.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key !== OFFLINE_CACHE)
                    .map((key) => caches.delete(key)),
            );
            await self.clients.claim();
        })(),
    );
});

// Fetch handler: navigation-only fallback.
//
// - Non-navigation requests (fetch API, images, scripts): passed through
//   to the network with no SW involvement. No caching.
// - Navigation requests: network-first. On failure, serve the precached
//   offline page so customers get a branded screen instead of a raw browser
//   error. Stalled networks are capped by NAVIGATION_TIMEOUT_MS; this still
//   never serves stale menu content.
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.mode !== 'navigate') {
        return; // passthrough — no caching of data/assets
    }

    event.respondWith(
        (async () => {
            try {
                const response = await fetchNavigationWithTimeout(request);
                return response;
            } catch (err) {
                const cache = await caches.open(OFFLINE_CACHE);
                const cached = await cache.match(OFFLINE_URL);
                if (cached) return cached;
                // Last-resort minimal inline fallback
                return new Response(
                    '<!doctype html><meta charset="utf-8"><title>Offline</title>'
                    + '<p style="font-family:system-ui;padding:2rem;text-align:center">'
                    + 'You are offline. Please reconnect and try again.</p>',
                    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                );
            }
        })(),
    );
});

// Allow pages to trigger immediate activation if they ever call it.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
