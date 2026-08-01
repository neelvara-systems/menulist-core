# Owner PWA Lifecycle Implementation

## Build boundary

`next.config.js` generates the owner Workbox worker only outside development and Vercel preview. It disables reconnect reload and start-URL caching, excludes source maps and unrelated product/public-site assets from precache, and contains no authenticated-document, Firebase Storage, or broad file-extension runtime route. Public Google fonts are the only runtime cache.

`worker/index.js` deletes `start-url`, `owner-dashboard-pages`, `auth-pages`, `screen-pages`, `firebase-images`, and `static-assets` during activation. These names are legacy caches from prior source behavior.

The checked-in `public/sw.js` is a generated artifact. It is not edited by hand in this pass; the approved production app build regenerates it from `next.config.js` and `worker/index.js`. Preview registration is disabled so a preview cannot attach an older checked-in worker.

## Registration boundary

`src/components/ServiceWorkerRegister.tsx` resolves the current origin, route, display mode, and deployment stage. It:

- registers the owner worker on maintained owner/auth paths and standalone platform launches;
- registers the minimal customer worker only on tenant origins;
- registers MyCodex’s separate worker only on its product host;
- re-runs reconciliation after App Router pathname changes, with serialized
  settlement so an older route decision cannot become the final worker state;
- requires both the exact worker script and root scope, and removes wrong-
  script or wrong-scope registrations;
- removes owner workers in development/preview;
- preserves the production owner worker on normal platform website visits;
- asks an existing correct registration to check for an update.

## Connectivity and updates

`useNetworkStatus` normalizes optional browser network metrics. `NetworkStatusProvider` owns one non-blocking desktop/MobileShell notice. It does not probe a cacheable favicon or create a second truth source.

`OwnerAppUpdatePrompt` compares the injected build ID with the bounded no-store `/api/version` response. It formats build time through the owner locale/timezone boundary, supports session deferral, and reloads only after the owner chooses **Refresh now**.
