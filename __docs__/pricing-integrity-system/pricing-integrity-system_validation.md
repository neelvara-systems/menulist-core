# Pricing Integrity System - Current Validation Boundary

**Status:** Local source complete, not current launch certification
**Validated:** July 16, 2026

## Current result

The active code and maintained docs now agree on the persisted price contract and every current mutation/output path audited in item 20:

- numeric, currency, range, multilingual, and text values share one bounded validator;
- item/option/linked-override values normalize before existing update/publish writes;
- desktop, MobileShell, bulk actions, AI Menu Manager, extraction, quality counts, and filters preserve display truth;
- relative arithmetic excludes text/range/missing values, while explicit fixed-price replacement remains available;
- public list/PDP, owner share card, Digital Screens, and PDF preflight/output use active option prices correctly;
- cache/screen propagation remains on the existing successful project mutation path;
- the dormant engine/queue is not exported as active runtime.

`runPricingIntegrity()` is dormant source scaffold with no current caller. Background PDF regeneration remains disabled.

## Local gates

The evidence ledger is `pricing-integrity-system_verification-2026-07-16.md`. The focused source gate is `npm run verify:pricing-integrity-boundary`; its behavioral child is `npm run test:menu-price-boundary`. Cross-feature gates cover Menu Editor, AI Menu Manager, public customer output, Digital Screens, PDF/share, linked outlets, pricing-plan rules, tenant safety, TypeScript, lint, dependency freeze, documentation links, and scoped diff integrity.

## Pending owner/release evidence

Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, authenticated desktop/mobile editor price-change QA, public menu and PDF artifact QA, configured-screen/browser/device QA, approved target deployment, and production-host smoke. Run `npm run verify:agent-readiness` and `npm run verify:menulist-api-tenant-safety` again on the release candidate.

No Firebase rules, indexes, Storage rules, or Cloud Function source changed in this audit, so no Firebase infrastructure deployment applies. Vercel/app deployment remains owner/release controlled.
