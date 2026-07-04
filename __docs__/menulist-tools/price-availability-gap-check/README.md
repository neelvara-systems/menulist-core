# Price Availability Gap Check

**Status:** Implemented V0 public tool and V1 owner readiness module
**Last Updated:** July 4, 2026
**Route:** `/tools/price-availability-gap-check`
**Local Source Gate:** `npm run verify:price-availability-gap-check`
**Family:** [Public Truth Tools](../public-truth-tools/README.md)

Price Availability Gap Check helps an SMB owner see whether the public source customers currently use makes prices, rates, availability, unavailable items, variants, packages, and quote paths clear.

It is not a price-monitoring crawler, POS connector, inventory sync, ordering-provider inspector, SEO audit, AI visibility check, or ranking tool.

## Documentation Set

| Audience | File | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./price-availability-gap-check_spec.md) | Owner job, scope, V0/V1/V2 ladder, non-goals |
| Developers | [Implementation](./price-availability-gap-check_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./price-availability-gap-check_marketing.md) | Internal positioning for SMB conversations |
| Website | [Website](./price-availability-gap-check_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./price-availability-gap-check_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./price-availability-gap-check_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./price-availability-gap-check_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./price-availability-gap-check_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./price-availability-gap-check_validation.md) | Implementation parity record |

## Version Ladder

| Lane | Behavior | Status |
| --- | --- | --- |
| V0 | Public free tool. Owner pastes menu/service/catalog/package/price-list text and optional current customer link. Browser-local report only. | Implemented |
| V1 | Logged-in MenuList owner check. Uses selected/default MenuList project truth for item prices, variant prices, and availability flags inside Business Health / Public Discovery. | Implemented |
| V2 | Paid add-on behavior: recurring checks, saved history, monthly reports, multi-location consistency, agency reports, or owner-approved managed repair. | Documented only |

## Runtime Files

| Surface | File |
| --- | --- |
| Public route | `src/app/(website)/tools/price-availability-gap-check/page.tsx` |
| Website component | `src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx` |
| Report builder | `src/lib/public-truth-tools/priceAvailabilityGapReport.ts` |
| Types | `src/lib/public-truth-tools/priceAvailabilityGapTypes.ts` |
| Owner readiness module | `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` |
| Verifier | `scripts/verification/verify-price-availability-gap-check.js` |

## Boundary

V0 checks owner-entered text and owner-selected facts only. It does not open links, verify external prices, check live inventory, inspect POS systems, inspect ordering providers, call AI providers, scan search results, store report state, or update external platforms.

The optional follow-up form uses the existing `/api/public/contact` path after consent.
