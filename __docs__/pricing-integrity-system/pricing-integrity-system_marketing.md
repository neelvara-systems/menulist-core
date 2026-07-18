# Pricing Integrity System - Marketing Boundary

**Status:** Internal source-backed positioning, not current launch certification
**Last updated:** July 16, 2026

## Safe one-line claim

**Keep customer menu prices tied to one saved MenuList source, including option prices and business-specific price wording.**

## Supported detail

- Owners can save numbers, ranges, currencies, multilingual wording, or labels such as `Market Price`.
- Customer menus, active options, configured screens, and fresh PDF downloads use the same saved menu truth.
- Relative bulk changes avoid guessing when a value is text or a range.
- Public cache and configured-screen refresh behavior follows the existing successful project-save path.
- PDFs are generated on demand from current menu data.

## Do not claim

- Existing downloaded PDFs change themselves.
- Every external surface refreshes instantly or is externally certified.
- Relative automation changes text/range prices.
- The dormant Pricing Integrity engine runs on saves.
- Background PDF generation is live. `ENABLE_BACKGROUND_PDF_REGEN` is false.

## Objection handling

| Question | Safe response |
| --- | --- |
| Can I use `Market Price` or a range? | Yes. MenuList preserves valid price wording instead of forcing it into a number. |
| What about Small/Large prices? | Active priced options appear as current choices and contribute to the item price shown. |
| Can I increase all prices by 10%? | Single numeric prices can change; text, ranges, and missing values are left unchanged for review. |
| Does an old PDF update? | No. Generate a fresh PDF after a menu change. |

This copy boundary is not current launch certification. Release approval requires the production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell checks, public menu and PDF artifact QA, configured-screen QA, target deploy evidence, and production-host smoke.
