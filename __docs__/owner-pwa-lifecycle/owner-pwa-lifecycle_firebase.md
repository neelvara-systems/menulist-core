# Owner PWA Lifecycle Firebase and Cost

This feature adds no Firestore read, write, delete, listener, batch, transaction, rule, index, Storage operation, Cloud Function, scheduler task, or provider call.

Connectivity uses browser events. Update checks reuse the existing no-store `/api/version` route, which performs no Firebase work. Service-worker installation/update uses browser network and Cache Storage only.

Precache exclusions reduce owner worker download, Cache Storage, install parsing, and update bandwidth. Retiring authenticated document caches also removes stale private browser storage. There is no Firebase deployment for this pass.
