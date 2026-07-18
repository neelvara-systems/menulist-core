# Pricing Integrity System - Implementation

**Status:** Current source-boundary implementation, not current launch certification
**Last updated:** July 16, 2026

## Canonical modules

- `src/lib/validation/pricing.schema.ts` owns the 40-character persisted value boundary and optional-value normalization.
- `src/lib/pricing/formatMenuPrice.ts` separates display formatting from `parseSingleMenuPrice()` arithmetic admission.
- `src/lib/pricing/publicItemPricePresentation.ts` resolves base/active-option customer price truth.
- `src/lib/pricing/projectPriceTruth.ts` normalizes all persisted project item/option/override prices in memory.

## Mutation path

`runUpdateProject()` and `publishProject()` call `normalizeProjectPriceTruth()` after project-payload sanitization and before the existing write. The linked-outlet route validates both standard project data and allowed price overrides with the same contract. This adds no read or write; it is an in-memory precondition on existing mutations.

Desktop and MobileShell item sheets validate before updating local project state. Bulk desktop/mobile utilities use `parseSingleMenuPrice()` for relative arithmetic. AI Menu Manager uses the same rule: relative changes exclude text/ranges, while an explicit exact-price request may replace them after approval. Quality summaries, category reorder, and filters use display-price truth, including active options.

## Output path

- Public list cards and PDP option rows use the active option projection.
- Digital Screens preserve numeric, text, range, and active-option price output.
- Shareable owner cards show the same base/option projection.
- Menu Card Export validates display values and counts an active priced option as price coverage.
- Decision Block analytics records a price only when it is one single numeric value.

Project save/publish continues through the existing public cache revalidation and configured Digital Screens version touch. There is no new propagation collection or polling loop.

## PDF path

Project Share imports `generateMenuPdf()` on demand, renders the current loaded project snapshot, and records a scoped browser-local snapshot hash/history marker. No background PDF job is created by this share path. Previously downloaded PDFs are immutable external artifacts.

## Dormant isolation

`integrityEngine.ts`, `molLogger.ts`, and `pdfQueue.ts` remain source scaffold. `runPricingIntegrity()` has no active caller and `ENABLE_BACKGROUND_PDF_REGEN` is false. The active pricing barrel exports formatter/presentation helpers only, preventing an incidental import from making the dormant engine look current.

The bounded `pricingIntegrity.pdf.lastFailureReason` handling remains defense in depth for a future explicit caller; it does not create active runtime behavior.

## Verification

The local contract is guarded by `npm run test:menu-price-boundary`, `npm run verify:pricing-integrity-boundary`, and the affected Menu Editor, AI Menu Manager, public, screen, PDF, multi-location, rules, tenant, type, lint, dependency, and docs gates.

This implementation note is not current launch certification. Release approval also requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell mutation QA, public menu and PDF artifact QA, configured-screen QA, target deployment evidence, and production-host smoke.
