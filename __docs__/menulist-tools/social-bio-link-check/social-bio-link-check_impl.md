# Social Bio Link Consistency Check - Implementation

**Status:** Implemented V0 public route
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:social-bio-link-check`

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/(website)/tools/social-bio-link-check/page.tsx` | Feature-flagged public route |
| `src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx` | Public form, report UI, copy/download, consented handoff |
| `src/lib/public-truth-tools/socialBioLinkCheckTypes.ts` | Input, check, report, and boundary types |
| `src/lib/public-truth-tools/socialBioLinkCheckReport.ts` | Deterministic browser-local report builder |
| `public/locales/menulist.ai/en-US.json` | English website copy |
| `public/locales/menulist.ai/hi-IN.json` | Hindi/Hinglish website copy |
| `scripts/verification/verify-social-bio-link-check.js` | Source gate |

## Feature Flag

```ts
ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK: true
```

The route also requires:

```ts
ENABLE_PUBLIC_TRUTH_TOOLS: true
```

## Input Contract

```ts
mode: 'self_report';
businessName: string;
cityOrArea: string;
currentCustomerLink: string;
instagramBioUsesCustomerLink: boolean;
facebookPageUsesCustomerLink: boolean;
whatsappProfileUsesCustomerLink: boolean;
googleProfileUsesCustomerLink: boolean;
websiteUsesCustomerLink: boolean;
qrOrPrintUsesCustomerLink: boolean;
oldLinksRemoved: boolean;
actionClear: boolean;
```

## Report Contract

Every check row includes:

```ts
evidenceText: string;
```

The report boundary fields are hard false values:

```ts
customerLinkFetched: false;
socialProfileFetched: false;
socialProfileOpened: false;
externalUrlFetched: false;
reportStored: false;
externalPlatformUpdated: false;
aiOrSearchChecked: false;
rankingPromise: false;
```

## Deterministic Scoring

- Missing or invalid current customer link returns `missing_basics`.
- Zero confirmed placements returns `missing_basics`.
- Missing customer action returns `missing_basics`.
- A valid link with one placement but old links not cleaned up returns `unclear`.
- A valid link with at least two placements, clear action, and old link cleanup returns `ready`.

## Boundaries

Do not add social profile fetching, profile opening, website crawling, Google crawling, QR destination fetching, AI/search provider calls, report storage, or external platform updates in V0.

External URLs are references only unless a later approved adapter explicitly changes the source policy.

## Handoff

The only write path is the existing optional `/api/public/contact` handoff after consent. The public report itself remains browser-local.

## Verification

`npm run verify:social-bio-link-check` must check:

- route exists and is feature-gated
- docs live under `__docs__/menulist-tools/social-bio-link-check/`
- no V0 report API route exists
- evidence text is explicit
- no profile fetch/open/crawl/provider/storage behavior exists
- locale keys exist in `en-US` and `hi-IN`
- discovery, sitemap, LLM context, Tools Hub, package script, and aggregate verifier include the route
