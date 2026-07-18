# Pricing Integrity System - Mobile Support

**Status:** Current MobileShell source boundary, not current launch certification
**Last updated:** July 16, 2026

## Current mobile behavior

Mobile does not have a separate Pricing Integrity UI. It uses the shared project truth and the same mutation contract as desktop.

- The item sheet accepts numeric, currency, range, multilingual, and text price values up to 40 characters.
- Base and option values remain strings during editing; blank does not become zero and text/ranges are not coerced through `parseFloat`.
- Invalid input stays in the sheet with an owner-safe validation message; it does not update local project truth.
- Category reorder, quality counts, and repair review treat text prices and active priced options as present.
- Relative bulk changes update single numeric values only. Explicit fixed-price replacement remains available after confirmation.
- Owner list rows show base text/range values and active option price labels without inventing a base price.
- Successful persistence continues through shared cache invalidation and configured Digital Screens version propagation; failed persistence keeps existing rollback/error behavior.

## Mobile QA matrix

1. Add/edit base numeric, text, multilingual, currency, and range values.
2. Add/edit active, inactive, blank, numeric, and text options.
3. Confirm category reorder and repair counts for variant-only pricing.
4. Confirm relative bulk change skips text/ranges and fixed-price replacement is explicit.
5. Save standalone and linked outlet projects, then verify public list/PDP, screen, and fresh PDF output.
6. Confirm invalid/over-limit/emoji/markup/negative input does not persist.

There is no mobile background PDF control and `runPricingIntegrity()` is not called by MobileShell or desktop editor saves.

This doc is not current launch certification. Release approval requires the production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell price-change QA, public menu and PDF artifact QA, configured-screen/device QA, target deploy evidence, and production-host smoke.
