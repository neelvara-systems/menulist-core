/**
 * Retired Digital Screen service-worker tombstone.
 *
 * Digital Screens use server-rendered current truth, the public content-version
 * listener, and version-matched local data controlled by the display client.
 * This file remains at its historical URL only so an old registration can
 * update, remove its own legacy cache, and unregister itself.
 */

const RETIRED_SCREEN_CACHE = 'menulist-screen-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await caches.delete(RETIRED_SCREEN_CACHE);
            await self.registration.unregister();
        })(),
    );
});
