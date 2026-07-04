# Price Availability Gap Check - Implementation

**Status:** Implemented
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:price-availability-gap-check`

## Runtime Boundary

Public route: `/tools/price-availability-gap-check`

Files:

- `src/app/(website)/tools/price-availability-gap-check/page.tsx`
- `src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx`
- `src/lib/public-truth-tools/priceAvailabilityGapTypes.ts`
- `src/lib/public-truth-tools/priceAvailabilityGapReport.ts`
- `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts`
- `scripts/verification/verify-price-availability-gap-check.js`

Feature flags:

- `ENABLE_PUBLIC_TRUTH_TOOLS: true`
- `ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK: true`

## Report Contract

Each check item uses:

```ts
evidenceText: string
```

The UI must render `check.evidenceText` directly so the report cannot imply crawling, provider checks, POS access, inventory checks, AI checks, or hidden confidence scoring.

## Deterministic V0 Checks

The builder in `priceAvailabilityGapReport.ts` uses owner-entered values only:

- pasted source text
- selected source type
- selected pricing mode
- selected availability mode
- selected clarity facts
- optional current customer link string

The URL check is format-only. The URL is not opened or fetched.

Do not add external price verification, live inventory checks, POS checks, ordering-provider checks, external source crawling, AI/search provider calls, file upload, or report storage in V0.

## Boundaries

The report boundaries must stay false:

- `externalUrlFetched: false`
- `pricesVerifiedExternally: false`
- `liveInventoryChecked: false`
- `posChecked: false`
- `orderingProviderChecked: false`
- `reportStored: false`
- `externalPlatformUpdated: false`
- `aiOrSearchChecked: false`
- `rankingPromise: false`

## Owner V1 Module

Owner readiness is computed in `ownerPublicTruthReadiness.ts`.

Module:

- id: `price_availability_gap`
- title: `Price and availability clarity`
- mobile fix target: `menu_tab`
- source: selected/default MenuList project only

The module checks:

- item count
- priced item count
- variant/attribute count
- priced variant/attribute count
- explicit availability flags

Evidence must state:

> Checked selected/default MenuList item prices, variant prices, and item availability flags only. POS, live inventory, ordering providers, external menus, and AI/search were not checked.

## Optional Contact Handoff

The public page may submit a consented follow-up to `/api/public/contact`. This is not report storage. It is the existing public contact enquiry path.

The component must use:

- `cache: 'no-store'`
- `credentials: 'same-origin'`
- `redirect: 'manual'`
- bounded response parsing through `readMenulistPublicContactResponseJson`
- shaped acknowledgement guard through `isAcceptedMenulistPublicContactResponse(result, 'general')`
- Turnstile when configured

## Verification

`npm run verify:price-availability-gap-check` must check:

- route exists and is feature-flagged
- docs exist under `__docs__/menulist-tools/price-availability-gap-check/`
- locale keys exist
- discovery, sitemap, `llms.txt`, and `llms-full.txt` include the route
- no report API route exists
- report and type boundaries are false
- no external fetch/provider/storage/upload/POS/live-inventory behavior appears in V0 files
- owner module exists with explicit external-system exclusion evidence
