# Business Facts Copy Pack - Implementation

**Status:** Implemented V0 public browser-local tool
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:business-facts-copy-pack`

---

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/(website)/tools/business-facts-copy-pack/page.tsx` | Feature-flagged public website route |
| `src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx` | Public form, generated copy blocks, report card, copy/download/share, consented handoff |
| `src/lib/public-truth-tools/businessFactsCopyPackTypes.ts` | Input, report, copy block, and boundary types |
| `src/lib/public-truth-tools/businessFactsCopyPackReport.ts` | Deterministic browser-local report and copy builder |
| `scripts/verification/verify-business-facts-copy-pack.js` | Focused source gate |

## Feature Flag

```ts
ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK: true
```

## Report Contract

Each report item has:

```ts
id: BusinessFactsCopyPackCheckId;
result: BusinessFactsCopyPackResult;
evidence: BusinessFactsCopyPackEvidence;
evidenceText: string;
required: boolean;
```

The report also includes:

```ts
copyBlocks: BusinessFactsCopyBlock[];
```

Each copy block has:

```ts
id: BusinessFactsCopyBlockId;
title: string;
body: string;
evidenceText: string;
```

## Evidence Contract

`evidenceText` must explicitly state what was checked:

- owner-entered fields only
- URL format checked locally
- copy generated from entered facts only
- external platforms not opened or updated

## Boundaries

Boundary flags are all false:

- `externalUrlFetched`
- `externalProfilesOpened`
- `externalPlatformUpdated`
- `reportStored`
- `aiRewriteGenerated`
- `aiOrSearchChecked`
- `rankingPromise`

## Source Policy

V0 must not add Google, Instagram, Facebook, WhatsApp, Maps, directory, website, or search crawling. Entered URLs are references only and receive local format checks.

The only allowed network write is the optional consented `/api/public/contact` handoff.

## Shareable Report Integration

The component must use:

- `buildShareablePublicTruthToolReportPayload`
- `createShareableToolReportUrl`

This keeps the report link hash-based and avoids a new report API route or report collection.

## Verification

`npm run verify:business-facts-copy-pack` must check:

- route and component exist
- docs live under `__docs__/menulist-tools/business-facts-copy-pack/`
- feature flag and doc pointer exist
- route uses structured data and feature flags
- component uses localized copy
- component renders `evidenceText`
- component renders and copies generated copy blocks
- component posts only to existing `/api/public/contact`
- component uses shaped contact acknowledgement helpers
- report/types declare false boundary flags
- no external fetch, provider call, report storage, or external mutation exists
- public discovery, sitemap, LLM context, Tools Hub, and aggregate verifier include the tool
