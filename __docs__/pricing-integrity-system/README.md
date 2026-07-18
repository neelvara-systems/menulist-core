# Pricing Integrity System

**Status:** Current source-boundary documentation, not current launch certification
**Last updated:** July 16, 2026

## Current runtime boundary

MenuList has one persisted menu-price contract across owner mutation and customer output:

- An item or option price may be a single number, currency value, range, multilingual label, or text such as `Market Price`, up to 40 characters.
- Desktop, MobileShell, extraction review, linked-outlet save, AI Menu Manager, and shared project persistence use the same validation/normalization boundary.
- The normal project update and publish DAL normalizes item, option, and linked-override prices before the existing write. Invalid price input fails before persistence.
- Text/range prices remain display truth. Only a true single numeric price enters percentage/flat arithmetic, analytics, outlier checks, or numeric range filters.
- Active priced options count as item price truth and appear in owner cards, the public list/PDP, Digital Screens, and PDF preflight/output.
- Existing project save/publish paths revalidate public menu/OBP cache and touch configured Digital Screens through the existing content-version path.
- Share PDFs are generated on demand from the current project snapshot. No old downloaded file can be changed after it leaves MenuList.

`src/lib/pricing/integrityEngine.ts`, `molLogger.ts`, and `pdfQueue.ts` remain reserved scaffold. `runPricingIntegrity()` has no current caller, `ENABLE_BACKGROUND_PDF_REGEN` is false, and the active `src/lib/pricing/index.ts` barrel does not export that dormant path.

## Maintained documents

| Document | Purpose |
| --- | --- |
| `pricing-integrity-system_spec.md` | Product and failure boundaries |
| `pricing-integrity-system_impl.md` | Active code paths and dormant isolation |
| `pricing-integrity-system_firebase.md` | Reads, writes, cache, and cost |
| `pricing-integrity-system_mobile-support.md` | MobileShell/editor parity |
| `pricing-integrity-system_helpdoc.md` | Owner support guidance |
| `pricing-integrity-system_marketing.md` | Safe internal claims |
| `pricing-integrity-system_website.md` | Public-copy boundary |
| `pricing-integrity-system_validation.md` | Current local verification and pending evidence |
| `pricing-integrity-system_verification-2026-07-16.md` | Evidence ledger for this audit |

## Release boundary

This source-complete audit is not current launch certification. Release approval still needs the active production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell mutation checks, public menu and PDF artifact QA, configured-screen QA, target deployment evidence, and production-host smoke.
