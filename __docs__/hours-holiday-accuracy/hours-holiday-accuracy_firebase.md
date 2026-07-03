# Hours & Holiday Accuracy — Firebase Cost Tracking

**Feature:** Hours Status Display + Holiday Exceptions
**Status:** #2A ✅ IMPLEMENTED (Hours Status) | #2B 🔶 DEFERRED (Holidays)
**Last Updated:** July 2, 2026
**Priority:** LOW — Reads existing store data. No new collections or writes.

---

## Source Gate

- Source gate: `npm run verify:working-hours-boundary`
- Working-hours saves use `updateStore()` and require explicit write acknowledgement before local success state is treated as confirmed.
- Time-slot preset saves use `updateTimeSlotPresets()`; the shared store DAL refreshes public menu/OBP cache after the store-level preset write.
- Preset edit/delete cascades update project category snapshots and keep their existing per-project public cache revalidation.
- No holiday-calendar collection, exception collection, Cloud Function, Storage object, provider call, or extra listener exists in current source.

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
| Update time-slot presets | `stores/{storeId}` | Owner creates, edits, or deletes a preset | Rare (setup only) | 1 | `timeSlotPresets`, `modifiedOn` | Same store settings write plus public cache revalidation; no extra Firestore write. |

Mobile full-hours and Today quick-hours saves require an explicit `updateStore()` acknowledgement before saved copy or local baselines change. This does not add reads/writes/deletes; it only prevents `apiCallComposer()` fallback values from being treated as confirmed working-hours persistence.

Desktop and mobile time-slot preset saves require an explicit `updateTimeSlotPresets()` acknowledgement before local preset state changes. The shared store DAL now revalidates the public menu/OBP cache after the preset merge so public surfaces do not keep stale store-level preset truth. Editing or deleting a preset still runs the existing project-category cascade; those project writes keep their existing per-project cache revalidation.

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
