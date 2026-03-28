# Staff Prompt — Firebase Cost Tracking

**Feature:** Staff-Facing Menu Quick Reference  
**Status:** 📋 SPEC LOCKED  
**Last Updated:** February 7, 2026  
**Priority:** LOW — Reads existing project data. Zero incremental Firebase cost.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (existing), `stores` (existing)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **$0.00** — Uses existing data reads

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Load project data | `projects/{tId}/{sId}/{projectId}` | Staff opens prompt | Per staff session | 1 | Same project doc — items, prices, descriptions. Already loaded by existing DAL. |
| Load store data | `stores/{storeId}` | Staff opens prompt | Per session | 1 | Working hours, business info. Already loaded. |

### Writes

None — staff prompt is read-only.

### Deletes

None.

---

## Cost Estimate

**$0.00/month** — No incremental Firebase cost. Uses existing data that's already being read.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getStoreById` | `src/database/stores/index.ts` | Read (existing) |
| Project data | `src/database/projects/index.ts` | Read (existing) |
