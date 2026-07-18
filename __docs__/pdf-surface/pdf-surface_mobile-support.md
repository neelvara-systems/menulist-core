# PDF Surface — Mobile Support Assessment

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** Compatibility bridge
**Last Updated:** July 16, 2026

---

## 4-Gate Admission Test

### Gate 1 — Frequency
**Question:** How often does an SMB owner generate a PDF menu?

- Estimated: 1–3 times per month (when printing menus for tables, staff, or delivery drivers)
- Spike events: price changes, seasonal menu updates, new location openings
- **PASS** — Low frequency but high-impact each time. Mobile access matters when the owner is at the printer or in the restaurant and needs to pull a fresh PDF quickly.

### Gate 2 — Speed
**Question:** Can this be done fast enough on mobile to be useful?

- PDF rendering is entirely client-side (jsPDF); mobile may read the selected project on tap if the full project is not already cached
- Generation time: ~500ms–2s depending on menu size
- File download triggers native browser save/open dialog on mobile
- **PASS** — Fast enough. No loading state beyond 2s even on large menus.

### Gate 3 — Touch
**Question:** Does the mobile UI surface this correctly with proper touch targets?

- Desktop PDF download is accessed via Share Modal
- Mobile PDF download is accessed from `MobileShareScreen.tsx` under **Print & downloads**
- Mobile uses large download tiles with 44px+ touch targets
- **PASS** — Mobile entry point exists and is touch-accessible.

### Gate 4 — Value
**Question:** Does the owner actually get value from this on mobile?

- Owner is at their restaurant, menu prices just changed, needs fresh PDFs for the evening service
- Opens MenuList on phone → Share tab → Print & downloads → Menu PDF → Sends to WhatsApp → Staff print at front desk
- **PASS** — This is the realistic use case. Mobile is often the fastest path.

---

## Verdict: ✅ All 4 Gates Pass

Mobile print output is operational inside MobileShell. With Menu Card Export enabled, the normal action opens the shared Print Menu screen. The older quick-PDF path remains only as a flag-off compatibility bridge and delegates to the same renderer.

---

## Mobile Implementation Status

### Existing Mobile Entry Point
`src/components/mobile/screens/MobileShareScreen.tsx` — PDF download is available in the mobile Share tab under **Print & downloads**.

Current mobile path:
```typescript
MobileShareScreen
  -> Print Menu (normal enabled path)
  -> MobileMenuCardExportScreen
  -> shared useMenuCardExportController

Flag-off compatibility only
  -> selected project cache / refreshCachedProject(projectId)
  -> generateMenuPdf() -> shared Menu Card Export renderer
  -> downloadPdf()
```

The compatibility path reads the selected project only when needed, passes current project/store context into the shared renderer, and records tenant/store/project-scoped freshness markers on a best-effort basis after delivery.

### Known Mobile Behavior
- iOS Safari: PDF opens in browser viewer (then share/save)
- Android Chrome: PDF downloads to Downloads folder
- Both behaviors are expected and acceptable — system-standard file download

---

## No Further Mobile Layout Work Required

The PDF generation library (`jsPDF`) runs in-browser on mobile. No separate mobile renderer is permitted; desktop and mobile share Menu Card Export ownership.
