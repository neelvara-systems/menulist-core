# PDF Surface — Firebase Cost Analysis

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** Compatibility bridge
**Last Updated:** July 16, 2026

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
        └── generateMenuPdf() — adapts to Menu Card Export in browser
              └── shared jsPDF renderer creates PDF in memory
                    └── Blob URL → browser download trigger
                          └── best-effort scoped freshness marker — browser storage, not Firebase
```

---

## Firestore Operations

| Operation | Trigger | Count | Cost |
|-----------|---------|-------|------|
| Desktop PDF generation | Share modal download | 0 | ₹0 |
| Mobile selected project read | First mobile PDF download if selected project data is not cached | 0-1 read | Negligible |

On desktop, the `items` and `categories` arrays passed to `generateMenuPdf()` come from data already loaded in the ShareModal's parent component. On mobile, `MobileShareScreen.tsx` uses the `MobileProjectsProvider` cache and falls back to `refreshCachedProject(projectId)` only when the owner taps Menu PDF and the selected project details are not already present.

---

## Device-local freshness operations (Not Firebase)

| Key shape | Value | When |
|-----|-------|------|
| `menulist_last_pdf_download_{tenant:store}_{projectId}` (segments encoded) | `Date.now()` string | Delivered legacy/flag-off PDF when tenant/store scope is available |
| `menulist_last_pdf_version_{tenant:store}_{projectId}` (segments encoded) | `sourceHash` string | Same delivery when a source hash exists |

These are browser `localStorage` writes — zero Firebase cost. Project-only legacy keys are not read. Storage/quota rejection is ignored after delivery so it cannot produce a false download failure.

---

## Bundle Size Impact

| Library | Already in bundle | Added by v2.2 |
|---------|------------------|---------------|
| `jspdf` | ✅ Yes (used since v1.0) | 0 bytes |

No new dependency is added by the compatibility bridge.

---

## Scale Analysis

At 10,000 PDF downloads per month across all stores:
- Firebase cost: **₹0 for generation; up to one cached-project fallback read on first mobile PDF tap**
- Server cost: **₹0**
- All computation happens in the user's browser

This feature has zero marginal infrastructure cost regardless of usage volume.
