# MyCodex PWA Shell Firebase Impact

## Summary

No Firebase impact.

MyCodex reserves `MC` as its internal product code in `src/constants/product.ts`, but the reader runtime uses the `mycodex` route/session slug and has no Firebase project, no Firestore collections, no Storage bucket, and no product `pId` writes.

| Operation | Count | Reason |
| --- | ---: | --- |
| Firestore reads | 0 | CSS/layout-only change. |
| Firestore writes | 0 | No state is written. |
| Firestore deletes | 0 | No state is deleted. |
| Realtime listeners | 0 | No listeners. |
| Cloud Functions | 0 | No backend work. |
| Storage operations | 0 | No asset upload/download behavior change. |

## Cost Boundary

Safe-area handling, private reader auth, and browser-local reader state are CSS, JSX, filesystem-read, cookie, bounded form parsing, and `localStorage` behavior only.

The MyCodex login route rate-limits by request IP before parsing the form body, fails closed when the distributed limiter is unavailable, and caps login form submissions at 8 KB. The username, password, and dedicated `MYCODEX_SESSION_SECRET` must all be configured; MenuList's NextAuth secret and the MyCodex password are not accepted as signing-secret fallbacks. This adds no Firebase, Storage, Cloud Function, product-account, billing, or durable event behavior.

The favorite/read-later document handler also verifies the dedicated MyCodex session itself. Its filesystem reader resolves canonical paths, rejects symlink escapes and sources above 4 MiB, and returns private no-store responses. The browser accepts at most 5 MiB of response JSON so the 4 MiB Markdown source plus JSON encoding overhead remains bounded.

Client navigation path guard: malformed browser-local reader paths, including external, protocol-relative, control-character, raw-backslash, and encoded-backslash values, collapse to `/` inside `MyCodexClientContainer.buildUrl()` before any favorite, queue, recent, continue-reading, or document-tree navigation. This is browser-local URL normalization only and adds no Firebase, Storage, Cloud Function, product-account, billing, or durable event behavior.

Do not add `MYCODEX_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_MYCODEX_FIREBASE_PROJECT_ID`, `MC_FIREBASE_PROJECT_ID`, or `NEXT_PUBLIC_MC_*` env keys. MyCodex setup only needs `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET` on Vercel.
