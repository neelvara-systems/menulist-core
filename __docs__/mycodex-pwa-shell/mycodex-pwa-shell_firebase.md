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

The MyCodex login route rate-limits by request IP before parsing the form body and caps login form submissions at 8 KB. This adds no Firebase, Storage, Cloud Function, product-account, billing, or durable event behavior.

Do not add `MYCODEX_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_MYCODEX_FIREBASE_PROJECT_ID`, `MC_FIREBASE_PROJECT_ID`, or `NEXT_PUBLIC_MC_*` env keys. MyCodex setup only needs `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET` on Vercel.
