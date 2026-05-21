# PDF Surface — Firebase Cost Analysis

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.2
**Last Updated:** 2026-05-21

---

## Summary

**Firebase cost: ₹0 for generation.** Mobile may perform one normal project read only when the selected project is not already cached and the owner taps Menu PDF.

PDF generation is entirely client-side using `jsPDF`. No Firestore reads, writes, or deletes are triggered by PDF generation itself.

---

## Data Flow

```
Owner clicks "Download PDF"
  ├── Desktop ShareModal reads items/categories from React state (already loaded)
  └── Mobile Share tab reads selected project data on tap if not already cached
        └── generateMenuPdf() — runs in browser
              └── jsPDF renders PDF in memory
                    └── Blob URL → browser download trigger
                          └── localStorage.setItem() — browser storage, not Firebase
```

---

## Firestore Operations

| Operation | Trigger | Count | Cost |
|-----------|---------|-------|------|
| Desktop PDF generation | Share modal download | 0 | ₹0 |
| Mobile selected project read | First mobile PDF download if selected project data is not cached | 0-1 read | Negligible |

On desktop, the `items` and `categories` arrays passed to `generateMenuPdf()` come from data already loaded in the ShareModal's parent component. On mobile, `MobileShareScreen.tsx` uses the `MobileProjectsProvider` cache and falls back to `refreshCachedProject(projectId)` only when the owner taps Menu PDF and the selected project details are not already present.

---

## localStorage Operations (Not Firebase)

| Key | Value | When |
|-----|-------|------|
| `menulist_last_pdf_download_{projectId}` | `Date.now()` string | Every PDF download |
| `menulist_last_pdf_version_{projectId}` | `snapshotHash` string | Every PDF download |

These are browser `localStorage` writes — zero Firebase cost.

---

## Bundle Size Impact

| Library | Already in bundle | Added by v2.2 |
|---------|------------------|---------------|
| `jspdf` | ✅ Yes (used since v1.0) | 0 bytes |

No new dependencies. No bundle size increase from v2.1 to v2.2.

---

## Scale Analysis

At 10,000 PDF downloads per month across all stores:
- Firebase cost: **₹0 for generation; up to one cached-project fallback read on first mobile PDF tap**
- Server cost: **₹0**
- All computation happens in the user's browser

This feature has zero marginal infrastructure cost regardless of usage volume.
