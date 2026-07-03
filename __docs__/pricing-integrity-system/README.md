# Pricing Integrity System

**Status:** Current source-boundary documentation, not current launch certification
**Last Updated:** July 2, 2026

---

## Current Source Boundary

Current MenuList price consistency is provided by the existing project save and public-output paths:

- `src/database/projects/index.ts` persists menu edits through `updateProject()`.
- `updateProject()` calls `revalidatePublicClientCacheForProject()` after project saves.
- `src/lib/cache/publicClientCache.ts` revalidates public menu/OBP cache and calls `touchDigitalScreenContentVersion()`.
- `src/lib/screen/screenInvalidation.ts` increments Digital Screens `screen.contentVersion` when screen output is enabled and a screen token exists.
- Project share PDF generation runs on demand from the currently loaded project data through `src/lib/export/menuPdfGenerator.ts`.
- `src/lib/pricing/integrityEngine.ts` and `src/lib/pricing/pdfQueue.ts` are source scaffold only. `runPricingIntegrity()` has no current caller, and `ENABLE_BACKGROUND_PDF_REGEN` is hard-disabled.

Current public/support/sales copy must not claim background PDF regeneration, a wired Pricing Integrity engine, or release certification.

## Current Safe Claim

Owners should edit prices in MenuList. QR/menu pages and staff-facing reads use the saved project truth, public cache is revalidated after project saves, Digital Screens receive a content-version touch when configured, and PDF downloads are generated from the current menu data on demand.

## Documentation

| File | Purpose |
| --- | --- |
| `pricing-integrity-system_spec.md` | Product boundary and release gates |
| `pricing-integrity-system_impl.md` | Current implementation evidence and dormant scaffold |
| `pricing-integrity-system_firebase.md` | Current cost boundary and reserved costs |
| `pricing-integrity-system_mobile-support.md` | Mobile price-save impact |
| `pricing-integrity-system_marketing.md` | Internal sales-safe copy |
| `pricing-integrity-system_website.md` | Website copy boundary |
| `pricing-integrity-system_helpdoc.md` | Owner support copy boundary |
| `pricing-integrity-system_validation.md` | Historical validation evidence and current launch boundary |

## Release Gates

Pricing Integrity is not release-certified by this doc set. Current release approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/mobile editor price-change QA, public menu and PDF artifact QA, Digital Screens refresh QA where applicable, target deploy evidence, and production-host smoke.
