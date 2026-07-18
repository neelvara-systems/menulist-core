# Physical Surfaces — Firebase Cost Tracking (Historical proposal)

**Feature:** Campaign-Based Recommendation Cards (Legacy)
**Status:** ⚠️ LEGACY — Identity surfaces handled by [Menu Kit](../menu-kit/menu-kit_firebase.md) ($0.00/month)
**Last Updated:** March 14, 2026
**Priority:** LOW — Legacy campaign surfaces. For print-ready identity surfaces, see Menu Kit.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (existing — source data for print)
- **Storage Buckets (Planned):** `MenuListAi/generated-print/{storeId}/{format}/` (generated PDFs, posters)
- **Cloud Functions (Planned):** `generatePrintSurface` (on-demand or on price change)
- **Estimated Monthly Cost:** **Low** — On-demand generation + Storage for generated files

---

## Planned Firestore Operations

### Reads

| Operation                   | Collection                         | Trigger                        | Frequency      | Notes                                                   |
| --------------------------- | ---------------------------------- | ------------------------------ | -------------- | ------------------------------------------------------- |
| Read project data for print | `projects/{tId}/{sId}/{projectId}` | User requests print generation | Per generation | Same project doc. No incremental reads beyond existing. |

### Writes

| Operation               | Collection                         | Trigger              | Frequency      | Notes                                                        |
| ----------------------- | ---------------------------------- | -------------------- | -------------- | ------------------------------------------------------------ |
| Store generated PDF URL | `projects/{tId}/{sId}/{projectId}` | After PDF generation | Per generation | Merge update with `printSurfaces.pdf.url` and `generatedAt`. |

---

## Firebase Storage (Planned)

| Operation           | Path Pattern                                             | Size   | Notes                       |
| ------------------- | -------------------------------------------------------- | ------ | --------------------------- |
| Store generated PDF | `MenuListAi/generated-print/{storeId}/pdf/{date}.pdf`    | 1-10MB | Full menu PDF with styling. |
| Store poster image  | `MenuListAi/generated-print/{storeId}/poster/{date}.png` | 2-5MB  | Print-ready poster.         |

---

## Cost Estimate (Planned)

| Resource         | Per 1000 generations/month | Monthly Cost     |
| ---------------- | -------------------------- | ---------------- |
| Firestore Reads  | 1,000 (existing data)      | $0.00            |
| Firestore Writes | 1,000                      | $0.00            |
| Storage          | 10GB                       | $0.26            |
| Cloud Functions  | 1,000 × 30s                | $0.05            |
| **Total**        |                            | **~$0.31/month** |

---

## Implementation Status

❌ **Not yet implemented.** Spec locked.
