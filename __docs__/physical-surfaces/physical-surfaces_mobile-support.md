# Physical Surfaces (PDF Generation) — Mobile Support

**Last Updated:** February 16, 2026 (v2 — PDF download added to MobileShareScreen)
**Decision:** ✅ MOBILE SUPPORTED — Owner can generate and download menu PDF from phone

---

## Feature Admission Test (Re-evaluated with "no desktop at all" lens)

| Gate          | Result        | Reasoning                                         |
| ------------- | ------------- | ------------------------------------------------- |
| **Frequency** | ⚠️ OCCASIONAL | PDF generated rarely but BLOCKING without desktop |
| **Speed**     | ✅ PASS       | jsPDF generates client-side in <2s                |
| **Touch**     | ✅ PASS       | Single "Download" button                          |
| **Value**     | ✅ PASS       | Phone-only owner can WhatsApp PDF to print shop   |

---

## Mobile Implementation

| Feature                | Mobile Component                                   | Status |
| ---------------------- | -------------------------------------------------- | ------ |
| Generate menu PDF      | `MobileShareScreen` → `generateAndDownloadMenuPdf` | ✅     |
| Download to phone      | `MobileShareScreen` → browser download             | ✅     |
| Share via WhatsApp/etc | Phone's native share after download                | ✅     |

Uses same `jsPDF`-based `generateAndDownloadMenuPdf` from `@lib/export/menuPdfGenerator` as desktop ShareModal. Fetches project data on-demand via `getProjectsList` + `getProjectData`.
