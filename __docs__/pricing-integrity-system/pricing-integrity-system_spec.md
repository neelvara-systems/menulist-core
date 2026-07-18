# Pricing Integrity System - Specification

**Status:** Current source-boundary specification, not current launch certification
**Last updated:** July 16, 2026

## Owner outcome

An owner can save the price wording their business actually uses without a second pricing system. The same saved truth reaches MenuList customer and export surfaces, while operations that require arithmetic touch only unambiguous single numeric prices.

## Canonical price contract

Accepted persisted values include:

- `299`, `₹1,299`, or another supported currency-prefixed single value;
- `199-249`, `199/249`, `199–249`, or `199—249`;
- `Market Price`, `Seasonal`, or a multilingual label;
- an explicit blank value for an intentionally missing base/option price.

The boundary trims input, caps it at 40 characters, rejects negative numeric endpoints, markup/control/invisible-format characters, emoji, non-finite numbers, objects, and arrays. A zero value can be normalized safely; the existing Menu Correctness publish policy continues to decide whether an active zero-priced item is acceptable.

## Required active flows

| Flow | Required behavior |
| --- | --- |
| Desktop item editor | Validate base and option prices before local save; preserve text/ranges |
| MobileShell item editor | Same contract; no `parseFloat` conversion or blank-to-zero mutation |
| Bulk price actions | Preview/apply only single numeric values for relative changes; an explicit fixed-price action may replace text/range values |
| AI Menu Manager | Same relative-versus-fixed rule, with approval card and no silent text/range coercion |
| Extraction/review | Admit the shared contract and reject unsafe values |
| Project update/publish | Normalize every item, option, item override, and option override before the existing write |
| Linked-outlet save | Normalize standard and override price payloads before authority/billing persistence |
| Owner quality/filter UI | Text and active-option prices count as present; numeric range filters use only single numeric values |
| Public list/PDP | Show base price or active option range/labels; exclude inactive/unpriced options |
| Digital Screens | Preserve text/ranges and active option projections |
| PDF/share | Generate from current loaded truth; active priced options prevent a false missing-price warning |

## Propagation and failure

- A successful existing project mutation keeps its existing cache invalidation and Digital Screens content-version touch.
- Invalid price input fails before the project write; it does not partially sanitize into a different price.
- Relative bulk/assistant changes skip text, range, blank, and nonnumeric values instead of guessing.
- Screen/PDF/public renderers show less rather than inventing a number.
- Existing owner-safe save errors and optimistic rollback behavior remain authoritative.

## Reserved scaffold

`runPricingIntegrity()` has no current caller. Background PDF jobs, MOL events from that engine, and `pricingIntegrity.pdf.*` state are not part of an active owner save. They remain isolated until a separate architecture/cost/deploy decision is approved.

## Release boundary

This spec is not current launch certification. Current release approval requires the production-readiness audit, External Certification Runbook evidence, `npm run verify:pricing-integrity-boundary`, `npm run verify:agent-readiness`, `npm run verify:menulist-api-tenant-safety`, authenticated desktop/MobileShell price mutation QA, public menu and PDF artifact QA, configured-screen QA, target deploy evidence, and production-host smoke.
