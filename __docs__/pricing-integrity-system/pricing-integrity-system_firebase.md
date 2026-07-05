# Pricing Integrity System - Firebase Cost Tracking

**Feature:** Cross-surface price consistency
**Status:** Current cost boundary, not current launch certification
**Last Updated:** July 2, 2026

---

## Current Firebase Operations

| Operation | Current path | Cost boundary |
| --- | --- | --- |
| Project save | Existing project document write through `updateProject()` | Existing owner edit cost |
| Public menu/OBP cache revalidation | `/api/revalidate/menu` call from `revalidatePublicClientCacheForProject()` | No extra Firestore collection |
| Digital Screens refresh signal | `platformSummary/campaigns_{storeId}.screen.contentVersion` increment when screens are configured | One bounded summary write when applicable |
| On-demand PDF generation | Browser-local generation from loaded project data | No background job write |

## Dormant/Reserved Operations

| Operation | Current boundary |
| --- | --- |
| Background PDF regeneration jobs | Not active; `ENABLE_BACKGROUND_PDF_REGEN = false` in `src/lib/pricing/pdfQueue.ts` |
| `pricingIntegrity.pdf.status` writes | Not reached by editor saves because `runPricingIntegrity()` has no current caller |
| MOL price-change events from pricing engine | Reserved for the dormant `runPricingIntegrity()` path |
| Cloud Function PDF worker | Not active in the current Pricing Integrity path |

July 5, 2026 PDF failure reason persistence update: `markPDFFailed()` remains dormant with no current editor-save caller, but if a future caller uses the scaffold it stores only a bounded local failure code in `pricingIntegrity.pdf.lastFailureReason`. Arbitrary caller text collapses to `pricing_pdf_generation_failed`, and diagnostics keep raw input as presence/length metadata only. This adds no reads, writes, deletes, Storage operations, Cloud Functions, API routes, indexes, rules, queue behavior, public cache invalidation, owner/customer UI, or deploy requirement beyond the dormant write that already existed if the scaffold is explicitly called.

## Current Cost Claim

Current incremental Pricing Integrity cost is limited to existing project-save writes, public cache revalidation, and Digital Screens content-version touches where screens are configured. There is no active background PDF queue cost.

## Verification

This cost boundary is guarded by `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, and `npm run verify:menulist-api-tenant-safety`. Release approval still requires the active production-readiness audit, External Certification Runbook evidence, authenticated desktop/mobile price-change QA, public menu and PDF artifact QA, Digital Screens refresh QA where applicable, target deploy evidence, and production-host smoke.

If a future release wires `runPricingIntegrity()` or enables background PDF regeneration, this file must be updated with exact reads, writes, storage paths, queue behavior, scheduler/function behavior, and scoped Firebase deploy evidence.
