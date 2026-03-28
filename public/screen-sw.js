/**
 * Digital Screen Service Worker
 * Per spec: FR-7 - Screen works offline (cached content)
 * Per spec: NFR-2 - Offline cache duration: 24 hours minimum
 */

const CACHE_NAME = 'menulist-screen-v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Assets to cache for offline use
const STATIC_ASSETS = [
    '/images/placeholder-item.png',
    '/images/default-store-logo.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Screen SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Screen SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[Screen SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle screen-related requests
    if (!url.pathname.startsWith('/screen/') &&
        !url.pathname.startsWith('/api/screen/') &&
        !url.pathname.startsWith('/images/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Check if cached response is still valid
                if (cachedResponse) {
                    const cachedDate = cachedResponse.headers.get('sw-cached-date');
                    if (cachedDate) {
                        const age = Date.now() - parseInt(cachedDate, 10);
                        if (age < CACHE_DURATION) {
                            console.log('[Screen SW] Serving from cache:', url.pathname);
                            return cachedResponse;
                        }
                    }
                }

                // Fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Clone response before caching
                        const responseToCache = networkResponse.clone();

                        // Cache the new response
                        caches.open(CACHE_NAME).then((cache) => {
                            // Add timestamp header for cache invalidation
                            const headers = new Headers(responseToCache.headers);
                            headers.set('sw-cached-date', String(Date.now()));

                            const cachedResponse = new Response(responseToCache.body, {
                                status: responseToCache.status,
                                statusText: responseToCache.statusText,
                                headers: headers
                            });

                            cache.put(event.request, cachedResponse);
                        });

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.log('[Screen SW] Network failed, serving cached:', url.pathname);
                        // If network fails, return cached response even if expired
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        throw error;
                    });
            })
    );
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[Screen SW] Cache cleared');
        });
    }
});
