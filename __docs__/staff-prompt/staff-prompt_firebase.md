# Staff Prompt — Firebase Cost Tracking

**Feature:** Staff-Facing Menu Quick Reference  
**Status:** ✅ IMPLEMENTED AS READ-ONLY TODAY SUMMARY DISPLAY
**Last Updated:** July 1, 2026
**Priority:** LOW — Included in existing Today summary read. Zero incremental Firebase cost.

---

## Summary

- **Collections Used:** `platformSummary/campaigns_{sId}` (existing Today summary)
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **$0.00** — Uses existing data reads
- **Runtime Boundary:** No new reads, writes, deletes, listeners, Storage objects, Functions, or provider calls.

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Load Today summary | `platformSummary/campaigns_{sId}` | Owner opens Today/mobile Today | Per Today open, SWR deduped 30s | 1 | Same summary read already used for Today campaigns, physical surfaces, and staffPrompt. |

### Writes

None in the active owner UI. If a scheduler writes `staffPrompt`, it writes the existing campaigns summary document with the rest of Today state.

### Deletes

None.

---

## Cost Estimate

**$0.00/month incremental** — Staff Prompt is included in the existing Today summary read.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getTodayCampaigns` | `src/database/campaigns/index.ts` | Read existing Today summary |
