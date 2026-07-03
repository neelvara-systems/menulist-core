# Pricing Integrity System - Mobile Support

**Status:** Mobile source-boundary evidence, not current launch certification
**Last Updated:** July 2, 2026
**Decision:** Mobile price edits use the shared project save path

---

## Current Mobile Boundary

Mobile does not have a separate Pricing Integrity UI. When mobile owner flows save project/menu price changes through the shared project persistence path, the same source-boundary applies:

- Saved project truth is the price source.
- Public cache revalidation is triggered by the shared save path.
- Configured Digital Screens receive a content-version touch where applicable.
- PDF downloads are generated on demand from current menu data.

## Not Active Runtime

- No mobile background PDF regeneration control exists.
- No mobile Pricing Integrity engine control exists.
- `runPricingIntegrity()` is not currently called by mobile or desktop editor saves.

## Current QA Gate

Release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated mobile editor price-change QA, public menu and PDF artifact QA, configured-screen refresh QA where applicable, target deploy evidence, and production-host smoke.
