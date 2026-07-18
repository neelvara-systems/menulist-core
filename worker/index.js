self.__WB_DISABLE_DEV_LOGS = true;

// Private/authenticated HTML was cached by older owner-worker releases.
// Removing the runtime routes is not enough because Workbox leaves named
// runtime caches in Cache Storage until explicitly deleted.
const RETIRED_OWNER_DOCUMENT_CACHES = [
    'start-url',
    'owner-dashboard-pages',
    'auth-pages',
    'firebase-images',
    'screen-pages',
    'static-assets',
];

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all(RETIRED_OWNER_DOCUMENT_CACHES.map((cacheName) => caches.delete(cacheName))),
    );
});
