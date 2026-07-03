# Pricing Integrity System - Marketing and Sales Boundary

**Status:** Internal source-backed positioning only, not current launch certification
**Last Updated:** July 2, 2026

---

## Current Claim Boundary

Use this only as bounded sales/support language. Current source truth:

- Project saves go through `updateProject()`.
- Public menu/OBP cache is revalidated after project saves.
- Digital Screens content version is touched when screens are configured.
- PDF downloads are generated on demand from current menu data.
- `runPricingIntegrity()` has no current caller.
- `ENABLE_BACKGROUND_PDF_REGEN` is false.

## Current One-Liner

**"Edit prices in MenuList and keep customer-facing outputs tied to the saved menu source."**

## 30-Second Pitch

> "MenuList keeps menu prices anchored to the saved menu. Your customer link and staff-facing views use that saved truth, configured screens get a refresh signal, and a PDF download is generated from the current menu data when you need one."

## Approved Language

- "Saved menu source"
- "Customer menu link uses saved prices"
- "Configured screens receive a refresh signal"
- "Generate a fresh PDF download"
- "No separate price spreadsheet"

## Prohibited Language

- "Background PDF refresh runs after every edit"
- "PDF freshness is guaranteed without a new download"
- "All surfaces always update within seconds"
- "No need to download a fresh PDF"
- "The dormant pricing engine runs on every editor save"
- "Production ready" or "launch certified" without External Certification Runbook evidence

## Objection Handling

| Objection | Safe response |
| --- | --- |
| "Will my menu link show the saved price?" | "Yes, the customer menu uses saved project truth after the public cache refresh." |
| "Will TV screens refresh?" | "Configured Digital Screens receive a content-version signal after project saves." |
| "Will old PDFs update by themselves?" | "No. Generate a new PDF download from the current menu when you need to send one." |
| "Is background PDF regeneration live?" | "No. The background queue is reserved and currently disabled." |

## Launch Boundary

Do not use this as release approval. Current release approval requires the production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, desktop/mobile price-change QA, public menu and PDF artifact QA, configured-screen QA where applicable, target deploy evidence, and production-host smoke.
