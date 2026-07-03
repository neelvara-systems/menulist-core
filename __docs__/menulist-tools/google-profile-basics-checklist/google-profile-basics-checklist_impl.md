# Google Profile Basics Checklist - Implementation

**Status:** Implemented V0 route; V1 uses existing `google_profile_handoff` owner module
**Local Source Gate:** `npm run verify:google-profile-basics-checklist`

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/(website)/tools/google-profile-basics-checklist/page.tsx` | Feature-flagged public route |
| `src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx` | Public form, report, copy/download, consented handoff |
| `src/lib/public-truth-tools/googleProfileBasicsTypes.ts` | Input/report/boundary types |
| `src/lib/public-truth-tools/googleProfileBasicsReport.ts` | Deterministic browser-local report builder |
| `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` | Existing `google_profile_handoff` V1 owner readiness module |
| `scripts/verification/verify-google-profile-basics-checklist.js` | Source gate |

## Feature Flag

```ts
ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST: true
```

## Report Contract

Each report item has:

```ts
id: GoogleProfileBasicsCheckId;
result: GoogleProfileBasicsResult;
evidence: GoogleProfileBasicsEvidence;
evidenceText: string;
required: boolean;
```

Boundary flags are all false:

- `googleFetched`
- `googleProfileOpened`
- `googleProfileUpdated`
- `externalUrlFetched`
- `reportStored`
- `externalPlatformUpdated`
- `aiOrSearchChecked`
- `rankingPromise`

## Source Policy

Do not add Google crawling, profile opening, Maps scraping, Search scraping, review inspection, ranking checks, profile ownership verification, external URL fetches, AI/search provider calls, or report storage in V0.

The only network write is the optional consented `/api/public/contact` handoff.

## V1 Owner Module

No new owner module is needed for V1. The existing `google_profile_handoff` module already checks current MenuList customer-link readiness and owner-confirmed Google handoff state.

## Verification

`npm run verify:google-profile-basics-checklist` must check:

- route and component exist
- feature flag and docs pointer exist
- route uses structured data and feature flags
- component renders `evidenceText`
- component posts only to existing `/api/public/contact`
- report/types declare false boundary flags
- no Google fetch, external fetch, AI/provider call, report storage, or external mutation exists
- docs live under `__docs__/menulist-tools/google-profile-basics-checklist/`
