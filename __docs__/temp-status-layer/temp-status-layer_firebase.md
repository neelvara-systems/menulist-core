# Temporary Status Layer — Firebase Cost Tracking

**Date:** June 1, 2026

---

## Cost Summary

**Monthly Cost (100 stores): ~₹5**

Extremely lightweight — single field on existing store document.

| Operation | Per Event | Monthly (100 stores, ~200 events) |
|-----------|----------|----------------------------------|
| Write temp status | 1 write | ~₹0.10 |
| Read (already loaded) | 0 extra reads | ₹0 |
| Cleanup (nightly) | 1 read per store | ~₹5 |
| **Total** | | **~₹5/month** |

No new collections. `tempStatus` is a field on existing store document.

## Cache Invalidation

`POST /api/store/temp-status` revalidates the public cache tags that can display store status:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`

This adds no Firestore reads, writes, indexes, listeners, Storage operations, or Cloud Functions.

---

**Last Updated:** June 1, 2026
