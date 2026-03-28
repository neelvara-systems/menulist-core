# PDF Surface — Firebase Cost Analysis

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.1
**Last Updated:** 2026-03

---

## Summary

**Firebase cost: $0.00**

PDF generation is entirely client-side using `jsPDF`. No Firestore reads, writes, or deletes are triggered by PDF generation itself.

---

## Data Flow

```
Owner clicks "Download PDF"
  └── ShareModal reads items/categories from React state (already loaded)
        └── generateMenuPdf() — runs in browser, zero network calls
              └── jsPDF renders PDF in memory
                    └── Blob URL → browser download trigger
                          └── localStorage.setItem() — browser storage, not Firebase
```

---

## Firestore Operations

| Operation | Trigger | Count | Cost |
|-----------|---------|-------|------|
| None | PDF generation | 0 | $0.00 |

The `items` and `categories` arrays passed to `generateMenuPdf()` come from data already loaded in the ShareModal's parent component. No additional Firestore reads are made at generation time.

---

## localStorage Operations (Not Firebase)

| Key | Value | When |
|-----|-------|------|
| `menulist_last_pdf_download_{projectId}` | `Date.now()` string | Every PDF download |
| `menulist_last_pdf_version_{projectId}` | `snapshotHash` string | Every PDF download |

These are browser `localStorage` writes — zero Firebase cost.

---

## Bundle Size Impact

| Library | Already in bundle | Added by v2.1 |
|---------|------------------|---------------|
| `jspdf` | ✅ Yes (used since v1.0) | 0 bytes |

No new dependencies. No bundle size increase from v2.0 to v2.1.

---

## Scale Analysis

At 10,000 PDF downloads per month across all stores:
- Firebase cost: **$0.00**
- Server cost: **$0.00**
- All computation happens in the user's browser

This feature has zero marginal infrastructure cost regardless of usage volume.
