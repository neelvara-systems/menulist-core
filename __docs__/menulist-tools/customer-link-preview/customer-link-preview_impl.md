# One Customer Link Preview - Implementation

**Status:** Implemented
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:customer-link-preview`

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/(website)/tools/customer-link-preview/page.tsx` | Feature-flagged public route |
| `src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx` | Browser-local public tool UI |
| `src/lib/public-truth-tools/customerLinkPreviewTypes.ts` | Input/report/check contract |
| `src/lib/public-truth-tools/customerLinkPreviewReport.ts` | Deterministic report builder |
| `src/config/features.ts` | Feature flag |
| `src/lib/seo/discoveryPolicy.ts` | Public discovery entry |
| `public/locales/menulist.ai/en-US.json` | English website copy |
| `public/locales/menulist.ai/hi-IN.json` | Hindi website copy |
| `public/sitemap.xml` | Route discovery |
| `public/llms.txt` | Agent-readable route summary |
| `public/llms-full.txt` | Agent-readable URL list |
| `scripts/verification/verify-customer-link-preview.js` | Source gate |

## Feature Flag

```ts
ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW: true
```

The route must also require `ENABLE_PUBLIC_TRUTH_TOOLS`.

## Report Contract

The report builder exports:

```ts
buildCustomerLinkPreviewReport(input: CustomerLinkPreviewInput): CustomerLinkPreviewReport
```

Each check row includes:

```ts
evidenceText: string
```

## Runtime Boundary

Do not add external URL fetches, website crawling, Google crawling, profile opening, social profile scraping, uptime monitoring, AI/search provider calls, report storage, or external platform updates in V0.

V0 may only run local string and URL-format checks.

## Contact Handoff

The optional handoff uses existing `/api/public/contact` only after consent. The component must keep the existing request policy:

- `cache: 'no-store'`
- `credentials: 'same-origin'`
- `redirect: 'manual'`
- Turnstile widget
- shaped response guard through `isAcceptedMenulistPublicContactResponse(result, 'general')`

## V1 Mapping

The `customer_link_preview` owner module in `ownerPublicTruthReadiness.ts` covers the facts this preview exposes: public basics, menu/service clarity, customer actions, hours, location, and customer-link readiness.

## Verification

`npm run verify:customer-link-preview` must check:

- route exists and is feature-flagged
- component uses browser-local report builder
- report rows render `evidenceText`
- no report API route exists
- no external fetch/crawl/provider call exists
- no report storage exists
- locales exist
- discovery/sitemap/llms entries exist
- docs live under `__docs__/menulist-tools/customer-link-preview/`
