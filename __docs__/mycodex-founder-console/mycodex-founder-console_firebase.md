# MyCodex Founder Console Firebase and Cost Contract

## Ownership

MyCodex has no Firebase project, Firestore collections, Storage bucket, Cloud Functions, realtime listeners, or product-account documents.

All operations remain charged to and governed by the owning product.

The shared browser session provider treats `/__mycodex` as a platform-only,
store-independent namespace. It may synchronize the signed-in actor's Firebase
Auth claims for embedded client-DAL tools, but it does not bootstrap the
actor's selected MenuList tenant, store, subscription, or store read models.

## Home read envelope

The home screen reuses the existing MenuList Ops Control Room snapshot only when opened or manually refreshed.

| Operation | Approximate paid operation count per open |
| --- | ---: |
| Current platform-access read | 1 document read |
| Ops config | 1 document read |
| Latest alert | up to 1 document read |
| Store aggregate counts | 3 aggregation reads under existing Firebase billing semantics |
| Recent alerts | up to 10 document reads |
| MyCodex writes/deletes/listeners | 0 |

No automatic polling or realtime listener is added. Opening a detailed surface uses that surface's existing documented read envelope.

## Cost controls

- Fetch on open and manual refresh only.
- Latest-request guards prevent stale duplicate rendering.
- Hidden product sections do not preload their operational data.
- Every list keeps its existing bounds and pagination.
- Product summaries are not recomputed into a MyCodex database.
- Browser-local reader preferences remain in `localStorage`.

## Mutation contract

MyCodex does not create a mutation DAL. Existing product mutations retain their current validation, authorization, rate limiting, audit trail, confirmation, idempotency, and error behavior.

## Paid-cost interpretation

Approximate cost discussions use gross paid/list rates and do not subtract free quota, credits, trials, or promotions unless a separate comparison is explicitly requested.
