# Temporary Status Layer — Firebase Cost Tracking

**Date:** June 26, 2026
**Last Source Gate Update:** July 6, 2026

---

## Source Gate

This Firebase/cost boundary is source-gated by `npm run verify:temporary-status-boundary`.

The current runtime uses one existing store document field, a dynamic authenticated API route, a 4KB bounded JSON request body, an 8KB bounded browser response parser, and no dedicated cleanup collection or Cloud Function. Public rendering and the public pull API return `null`/no banner for expired temporary statuses, so stale customer-facing output is suppressed without a scheduled cleanup worker.

## Cost Summary

**Monthly Cost (100 stores): negligible**

Extremely lightweight — single field on existing store document.

| Operation | Per Event | Monthly (100 stores, ~200 events) |
|-----------|----------|----------------------------------|
| Write temp status | 1 write | ~₹0.10 |
| Read (already loaded) | 0 extra reads | ₹0 |
| Cleanup worker | Not shipped | ₹0 |
| **Total** | | **~₹0.10/month plus existing store reads** |

No new collections. `tempStatus` is a field on existing store document.

Admission guard: `POST /api/store/temp-status` checks `ENABLE_TEMP_STATUS`, validates session tenant/store IDs through the shared Firestore document-ID guard with an exact raw-value check and a 160-character ceiling, normalizes the optional session actor ID before limiter material or `tempStatus.createdBy`, applies the existing store permission helper, uses the `DATA_WRITE` limiter with hashed owner/store key segments, and applies a 4KB bounded JSON cap before validating or writing. Rejected disabled, invalid-session, oversized, or rate-limited requests add no Firestore writes.

Failure diagnostics use the shared runtime diagnostics helper with stable `store_temp_status_update_failed` code, action/type/message-presence metadata, bounded tenant/store/user/expiry presence-length metadata, and source error name/code/status only. The owner response remains generic and public cache invalidation behavior is unchanged.

Browser response parsing is Firebase-cost neutral. `src/lib/tempStatus/clientResponse.ts` caps `/api/store/temp-status` responses at 8KB and requires `{ success: true }` before desktop/mobile optimistic state remains. Malformed or oversized responses log `temp_status_response_parse_failed`; invalid successful envelopes log `temp_status_response_invalid`. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, provider calls, API routes, cache tags, rules, indexes, schema changes, Firebase deploy requirement, or Vercel deploy action.

Browser request-boundary hardening is Firebase-cost neutral. Desktop Business Settings, mobile Temporary Status, and mobile Today/Hours temporary-status calls now use the shared `AUTH_BROWSER_REQUEST_POLICY`, which keeps existing status set/clear requests uncached, same-origin, and manual-redirect before the shared bounded response parser. This changes no Firestore reads/writes/deletes beyond existing valid status set/clear requests, no Storage operations, no Cloud Functions, no API routes, no rules, no indexes, no schema fields, and no owner-facing settings.

June 30 shared request-policy consolidation is Firebase-cost neutral. Replacing inline `/api/store/temp-status` request option blocks with the shared authenticated browser request policy changes only client-side fetch construction and source verifier coverage; it adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public output rendering, or owner-facing settings.

## Cache Invalidation

`POST /api/store/temp-status` revalidates the public cache tags that can display store status:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`
- `screen-data`

The same successful write touches the Digital Screens content version with `storeTempStatus` and invalidates the Owner Business Assistant packet cache for the store. The public pull API returns `null` for expired temporary statuses. This adds no Firestore reads, indexes, listeners, Storage operations, or Cloud Functions beyond the existing valid set/clear store write.

---

**Last Updated:** July 6, 2026
