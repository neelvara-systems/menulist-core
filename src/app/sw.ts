/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
    CacheFirst,
    CacheableResponsePlugin,
    ExpirationPlugin,
    Serwist,
} from 'serwist';

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

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

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        {
            matcher: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: new CacheFirst({
                cacheName: 'owner-google-font-styles',
                plugins: [
                    new CacheableResponsePlugin({ statuses: [0, 200] }),
                    new ExpirationPlugin({
                        maxEntries: 8,
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                    }),
                ],
            }),
        },
        {
            matcher: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: new CacheFirst({
                cacheName: 'owner-google-font-files',
                plugins: [
                    new CacheableResponsePlugin({ statuses: [0, 200] }),
                    new ExpirationPlugin({
                        maxEntries: 16,
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                    }),
                ],
            }),
        },
    ],
    fallbacks: {
        entries: [
            {
                url: '/offline',
                matcher: ({ request }) => request.destination === 'document',
            },
        ],
    },
});

serwist.addEventListeners();
