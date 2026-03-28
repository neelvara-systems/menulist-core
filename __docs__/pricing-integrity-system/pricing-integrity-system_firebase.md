# Pricing Integrity System — Firebase Cost Tracking

**Feature:** Cross-Surface Price Consistency  
**Status:** ✅ Ready for Implementation  
**Last Updated:** February 7, 2026  
**Priority:** LOW — QR/Web menu and Staff Prompt already read live. This is about Screens refresh + PDF regeneration.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (existing — live price source)
- **Storage Buckets:** `MenuListAi/generated-pdfs/{storeId}` (planned — auto-generated PDFs)
- **Cloud Functions (Planned):** `regeneratePDF` (on project change), `refreshScreenContent` (on price change)
- **Estimated Monthly Cost:** **Low** — Most integrity is "free" (live reads from existing project data)

---

## Firestore Operations

### Existing (Already Implemented — Zero Incremental Cost)

| Surface | How It Gets Prices | Incremental Firebase Cost |
|---------|-------------------|--------------------------|
| QR/Web Menu | Live read from `projects/{tId}/{sId}/{projectId}` (cached 60s) | $0 — already happening |
| Staff Prompt | Live read from same project doc | $0 — already happening |

### Planned (Screens + PDF)

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Screen content refresh | `screenContent/{tId}/{sId}` | Price change detected | Per price change | Planned: regenerate screen slides when prices change. |
| PDF regeneration trigger | `projects/{tId}/{sId}/{projectId}` | Price change detected | Per price change | Planned: Cloud Function detects price diff and regenerates PDF. |

### Writes (Planned)

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| Store regenerated PDF URL | `projects/{tId}/{sId}/{projectId}` | After PDF generation | Per price change | Merge update with new PDF URL. |

---

## Cost Estimate

Current: **$0.00/month** — Live reads are already happening.
Planned (with PDF + Screens): **~$0.10/month** per 1000 price changes.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts:382` | Write (triggers integrity check) |
| `revalidateMenuCache` | `src/lib/actions/revalidateMenuCache.ts` | Cache invalidation (instant customer update) |
