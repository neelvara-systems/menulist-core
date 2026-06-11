# Hours & Holiday Accuracy — Firebase Cost Tracking

**Feature:** Hours Status Display + Holiday Exceptions  
**Status:** #2A ✅ IMPLEMENTED (Hours Status) | #2B 🔶 DEFERRED (Holidays)  
**Last Updated:** June 11, 2026
**Priority:** LOW — Reads existing store data. No new collections or writes.

---

## Summary

- **Collections Used:** `stores` (`workingHours` field plus `hoursLastUpdatedAt` freshness stamp)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Negligible** — Uses existing store data reads

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Read store working hours | `stores/{storeId}` | Customer menu page load | Per menu view (cached 60s) | 0 (already loaded) | N/A | Hours data is part of store document already fetched for menu rendering. Zero incremental cost. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Update working hours | `stores/{storeId}` | Owner edits hours in settings | Rare (setup only) | 1 | `workingHours`, `hoursLastUpdatedAt` | Same store settings write; no extra document write. |

### Deletes

None.

---

## Planned (Feature #2B — Holiday Exceptions)

| Operation | Collection | Trigger | Notes |
|-----------|-----------|---------|-------|
| Read holiday config | `stores/{storeId}` (holidays field) | Customer page load | Will be part of existing store doc. Zero incremental reads. |
| Write holiday config | `stores/{storeId}` | Owner sets holidays | Merge update to store doc. Very rare. |

---

## Cost Estimate

**$0.00/month** — No incremental Firebase cost. Uses existing store document reads.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getStoreById` | `src/database/stores/index.ts` | Read (already loaded for menu) |
| `updateStore` | `src/database/stores/index.ts` | Write (hours update — rare) |
