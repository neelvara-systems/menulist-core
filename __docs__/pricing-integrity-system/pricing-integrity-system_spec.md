# Pricing Integrity System - Product Specification

**Document Type:** Non-technical PRD
**Status:** Current source-boundary spec, not current launch certification
**Priority:** P0 feature boundary
**Last Updated:** July 2, 2026

---

## Current Runtime Truth

Pricing consistency is currently source-backed by the shared project save path, not by a separately wired Pricing Integrity engine:

- Owner price edits are saved through `updateProject()` in `src/database/projects/index.ts`.
- Project saves revalidate public menu/OBP cache through `revalidatePublicClientCacheForProject()`.
- The same public-cache helper touches Digital Screens `screen.contentVersion` through `touchDigitalScreenContentVersion()` when Digital Screens are enabled and a screen token exists.
- QR/menu pages and staff-facing reads use saved project truth.
- PDF downloads are generated on demand from the currently loaded project data through `src/lib/export/menuPdfGenerator.ts`.
- `src/lib/pricing/integrityEngine.ts` exists as dormant scaffold. `runPricingIntegrity()` has no current caller.
- `src/lib/pricing/pdfQueue.ts` keeps `ENABLE_BACKGROUND_PDF_REGEN = false`; background PDF regeneration is not active runtime.

## Product Promise Boundary

Safe current promise:

> Edit prices in MenuList. Saved menu truth is the source for customer menus, staff-facing views, configured Digital Screens refresh signals, and on-demand PDF downloads.

Do not claim:

- Background PDF regeneration is live.
- A standalone Pricing Integrity engine is wired into editor saves.
- Every surface is externally certified without current QA evidence.
- This doc grants production launch approval.

## In Scope Today

| Capability | Current boundary |
| --- | --- |
| QR/Web menu price consistency | Uses saved project truth and public cache revalidation after project saves |
| Staff-facing price consistency | Uses saved project truth |
| Digital Screens refresh signal | `screen.contentVersion` touch is attempted after project save when screens are configured |
| PDF download freshness | Browser-local PDF generation uses the currently loaded menu data |
| Price display formatting | `formatMenuPrice()` preserves text prices and numeric ranges |

## Reserved Scaffold

| Capability | Current boundary |
| --- | --- |
| `runPricingIntegrity()` | Source scaffold only; no current caller |
| `pricingIntegrity.pdf.status` writes | Scaffolded in `integrityEngine.ts`, not reached by editor saves |
| MOL price-change logging via `logPriceChange()` | Reserved for the dormant engine path |
| Background PDF queue | Hard-disabled by `ENABLE_BACKGROUND_PDF_REGEN = false` |
| PDF freshness URL/state writes | Reserved until a wired worker/job path exists |

## Release Gates

Current release approval still requires:

- Active production-readiness audit evidence.
- External Certification Runbook evidence.
- `npm run verify:pricing-integrity-boundary`.
- `npm run verify:agent-readiness`.
- `npm run verify:menulist-api-tenant-safety`.
- Authenticated desktop and mobile editor price-change QA.
- public menu and PDF artifact QA, plus staff view and configured Digital Screens checks.
- Target deploy evidence and production-host smoke.
- Scoped Firebase deploy evidence if a release scope adds or changes Cloud Function logic.
