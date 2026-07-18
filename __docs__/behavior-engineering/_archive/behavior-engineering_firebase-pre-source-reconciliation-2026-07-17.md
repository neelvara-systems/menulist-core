# Archived Behavior Engineering — Firebase Cost Tracking

**Feature:** Behavior Engineering (Presence Dominance Activation)
**Created:** February 19, 2026
**Audience:** Founder, Developers
**Status:** Implementation In Progress

---

## Summary

- **Collections Used:** `stores` (existing — one optional field addition)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** ₹0 (zero) — UI-only changes

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Check nudge dismissed | stores | Dashboard load | Per visit | 0 (already loaded) | Uses existing `storeDetails` from context |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Dismiss nudge card | stores | User clicks × | Once per store lifetime | 1 | `behaviorNudgeDismissedAt` merge update | Uses existing `updateStoreDetails()` DAL |

### Deletes

None.

---

## Firebase Storage

None.

---

## Cloud Functions

None.

---

## Security Rules Impact

No changes needed. The `behaviorNudgeDismissedAt` field is written via existing authenticated DAL function (`updateStoreDetails`) which already has proper security rules.

---

## Cost Optimization Notes

- **Current optimizations:** Zero new reads. Nudge dismiss state is a single field on an already-loaded store document. No additional queries.
- **Cost impact:** Effectively ₹0/month. One merge write per store (once in lifetime of the store).
- **Warnings:** None. This is the lowest-cost feature possible.

---

## Cost Estimate (per 1000 active users/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads | 0 (uses existing context) | ₹0 | ₹0 |
| Firestore Writes | ~1000 (one-time dismiss, amortized) | ₹0.015/100K | ₹0.00 |
| Storage | 0 | ₹0 | ₹0 |
| Cloud Functions | 0 | ₹0 | ₹0 |
| **Total** | | | **₹0.00** |

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateStoreDetails` | `src/database/stores/index.ts` | Write (merge) — existing |

No new DAL functions needed.

---

## API Routes & Their Firebase Impact

None. No new API routes.

---

**Last Updated:** February 19, 2026
