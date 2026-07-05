# Pricing Integrity System - Implementation Boundary

**Document Type:** Technical implementation evidence
**Status:** Current source-boundary implementation notes, not current launch certification
**Last Updated:** July 2, 2026

---

## Current Save Path

`updateProject()` in `src/database/projects/index.ts` is the active owner price-save path. After a normal project save it:

1. Persists the project document.
2. Calls `revalidatePublicClientCacheForProject(projectId, "updateProject")`.
3. Revalidates public menu/OBP cache.
4. Touches Digital Screens content version through `touchDigitalScreenContentVersion()`.

This is the current code path that protects customer-facing price truth after owner edits.

## Current PDF Path

Project Share PDF generation is browser-local/on-demand:

- `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` imports `generateMenuPdf()`.
- `src/lib/export/menuPdfGenerator.ts` delegates visual output to Menu Card Export.
- The generated artifact uses the currently loaded project/menu data and returns a `snapshotHash`.
- No background PDF job is created by this share path.

## Dormant Pricing Scaffold

The following files exist but are not wired into the active editor save path:

| File | Current boundary |
| --- | --- |
| `src/lib/pricing/integrityEngine.ts` | Defines `runPricingIntegrity()`, `markPDFFresh()`, `markPDFFailed()`, and integrity state helpers. `runPricingIntegrity()` has no current caller. |
| `src/lib/pricing/pdfQueue.ts` | Defines a debounced background job writer, but `ENABLE_BACKGROUND_PDF_REGEN` is hard-disabled. |
| `src/lib/pricing/molLogger.ts` | Defines MOL price/PDF logging helpers for the dormant pricing engine path. |
| `src/lib/pricing/index.ts` | Exports the dormant pricing helpers for future wiring. |

PDF failure reason persistence follow-up (July 5, 2026): `markPDFFailed()` still belongs to the dormant pricing engine scaffold, but it no longer persists arbitrary caller text into `pricingIntegrity.pdf.lastFailureReason`. Code-shaped reasons matching the bounded local-code pattern are retained; arbitrary text collapses to `pricing_pdf_generation_failed`. Diagnostics record the stored code plus raw input presence/length metadata only.

## Public Claim Boundary

Implementation docs, website copy, help copy, and sales copy must use the current source-backed claim:

> Saved MenuList project truth updates customer menus and staff-facing reads, configured Digital Screens receive a content-version touch, and PDF downloads are generated from current menu data on demand.

They must not claim that background PDF regeneration is active or that `runPricingIntegrity()` is currently wired to editor saves.

## Verification

This boundary is guarded by `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, and `npm run verify:menulist-api-tenant-safety`. Release approval still requires the active production-readiness audit, External Certification Runbook evidence, authenticated desktop/mobile price-change QA, public menu and PDF artifact QA, Digital Screens refresh QA where applicable, target deploy evidence, and production-host smoke.
