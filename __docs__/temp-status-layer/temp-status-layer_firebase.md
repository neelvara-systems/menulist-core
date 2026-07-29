# Temporary Status Layer - Firebase and Scale

**Status:** Source-gated cost evidence; not deployment approval
**Last reviewed:** July 25, 2026

## Source Gate

Run `npm run verify:temporary-status-boundary` for the current cost boundary.

```bash
npm run verify:temporary-status-boundary
```

## Data Shape

Temporary Status adds no collection. It reuses one optional field on `stores/{storeId}`:

```ts
interface StoreTemporaryStatus {
  type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
  message: string;
  expiresAt: string;
  createdAt?: string;
  createdBy?: string | null;
  sourceProjectId?: string;
}
```

The owner route validates compact/nested session tenant/store aliases through the shared exact permission-scope guard, normalizes the optional actor, runs a fail-closed hashed limiter, and admits a 4KB bounded JSON request. One transaction then reads the current store and tenant, validates active/unblocked ownership plus current persisted permission, and writes the status only from that transaction-current authority.

## Operation Budget

| Path | Firestore work |
| --- | --- |
| Manual set | Two transaction reads (current store + tenant) and one existing store-document update after admission. |
| Manual clear | Two transaction reads (current store + tenant) and one existing store-document update deleting the field. |
| Public rendering | No Temporary Status-only read; status is projected from the store data already loaded by that surface. |
| Public pull API | No extra Temporary Status read beyond the route's canonical store read. |
| Expiry | Zero write/delete; public pull API returns `null` for expired temporary statuses and browser/public projections omit them. |
| Cleanup | No scheduler, scan, queue, collection, or listener. |
| Special Menu | Status is included in its existing store lifecycle transaction; no standalone Temporary Status operation. |

The shared owner response parser is capped at 8KB and has no Firebase cost.

## Post-Commit Effects

The one committed store write is followed by existing non-authoritative refresh effects: `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, the affected Digital Screens content version and hashed token cache tag, and the Owner Business Assistant packet cache. The helper runs these effects concurrently and reports partial failure as `effectsPending`.

No retry collection or second write was added. This keeps write amplification fixed while avoiding a false mutation failure after Firestore has committed.

## Scale Decision

No TTL policy or cleanup worker is justified. Expired values are small, bounded fields on existing store documents, and correctness is enforced at every public/browser projection. A scheduled cleanup would introduce scans or index/TTL operations without improving customer correctness.

The only growth dimension is the existing store count; there is no per-status history. Message and response sizes are bounded. This remains simpler and more scalable than an event collection.

`stores.tempStatus` is never used as a Firestore filter or ordering field. Its small nested map is exempt from automatic single-field indexing, reducing set/clear index fanout without changing the exact store write, expiry projection, special-menu ownership, or public cache behavior.

## Infrastructure Boundary

The transaction-current authority correction changes app-side mutation behavior and adds one tenant read while replacing the former standalone permission-store read with the transaction store read. It does not modify Firestore rules, indexes, Storage rules, Firebase Functions source, collections, provider calls, cache effects, or the persisted status shape. No Firebase infrastructure deployment applies; app release and authenticated concurrency smoke remain pending.
