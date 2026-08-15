# Photo Gap Check - Implementation Plan

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Developers and future maintainers

---

## 1. Current State

The V0 public runtime exists at `/tools/photo-gap-check`.

Implemented files:

| Path | Purpose |
| --- | --- |
| `src/app/(website)/tools/photo-gap-check/page.tsx` | Public website route, metadata, structured data, and feature-flag gate |
| `src/components/website/photoGapCheck/PhotoGapCheckPage.tsx` | Browser-local form, report UI, copy/download, and consented handoff |
| `src/lib/public-truth-tools/photoGapCheckTypes.ts` | Photo Gap Check input/report contracts |
| `src/lib/public-truth-tools/photoGapCheckReport.ts` | Deterministic visual-coverage checks |
| `scripts/verification/verify-photo-gap-check.js` | Boundary verifier for route, flags, docs, locales, discovery, and no upload/fetch/provider behavior |

V1 owner readiness is implemented through the shared Business Health/Public Truth owner card. No standalone visual identity dashboard, paid add-on history, image upload, image analysis, report API route, storage path, Cloud Function, Google/Instagram inspection, or AI/search provider call is implemented in V0.

---

## 2. Feature Flags

Implemented flags in `src/config/features.ts`:

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Use feature config, not new env vars, for ordinary product switches.

---

## 3. Type Contracts

Input:

```typescript
export interface PhotoGapCheckInput {
  mode: 'self_report';
  businessName: string;
  cityOrArea: string;
  businessType: PhotoGapBusinessType;
  currentCustomerLink: string;
  logoPresent: boolean;
  coverImagePresent: boolean;
  locationOrTeamPhotoPresent: boolean;
  productOrServicePhotosPresent: boolean;
  photosLookCurrent: boolean;
  publicPageHasImages: boolean;
}
```

Report:

```typescript
export interface PhotoGapCheckReport {
  generatedAt: string;
  status: 'ready' | 'missing_basics' | 'unclear' | 'not_checked' | 'manual_review_needed';
  businessName: string;
  cityOrArea: string;
  businessType: PhotoGapBusinessType;
  checks: PhotoGapCheckItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    type: 'create_customer_link' | 'complete_visual_profile' | 'review_current_link' | 'manual_review';
    href: string;
  };
  boundaries: {
    imageUploaded: false;
    imageAnalyzed: false;
    externalUrlFetched: false;
    googleProfileInspected: false;
    instagramInspected: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
```

Next-action routing is gap-specific: missing visual rows route to visual completion, a link-only gap routes to customer-link creation, and a ready report with an existing valid link routes to reviewing that current link rather than creating a duplicate.

Every `PhotoGapCheckItem` includes `evidenceText: string`.

---

## 4. Deterministic Checks

| Check | Source | Rule |
| --- | --- | --- |
| Logo | owner selection | Present when selected |
| Cover image | owner selection | Present when selected |
| Location or team photo | owner selection | Present when selected |
| Product or service photos | owner selection and business type | Present when selected |
| Photo context | owner selection | Present when owner says photos are current and representative |
| Public page images | owner selection | Present when current customer page shows images |
| Current customer link | entered URL | Present when URL shape is locally valid |
| External photo verification | boundary row | Always `not_checked` in V0 |

The code must never claim images were uploaded, analyzed, fetched, or inspected on external platforms.

---

## 5. Public Route Rules

V0 route rules:

- render from `(website)` route group
- use `WebsitePageStructuredData`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK`
- import shared website CSS
- use localized copy under `Website.PhotoGapCheckPage`
- run `buildPhotoGapCheckReport(form)` only in the browser
- keep report copy/download browser-local
- submit optional follow-up to `/api/public/contact` only after consent and Turnstile completion
- set contact handoff request options to `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'`
- require the shared public-contact source/status/help-topic acknowledgement before submitted state or accepted handoff tracking

Do not add `src/app/api/photo-gap-check/report/route.ts` for V0.

---

## 6. Cost And Storage

V0 report path:

- Firestore reads: 0
- Firestore writes: 0
- Firestore deletes: 0
- Storage operations: 0
- Cloud Functions: 0
- Image uploads: 0
- External fetches: 0
- Google/Instagram API calls: 0
- AI/provider calls: 0

Optional follow-up:

- reuses existing `/api/public/contact`
- creates one existing public contact enquiry write only after explicit consent and existing route validation

---

## 7. Visual Source Boundary

Do not add file upload, local image parsing, computer vision, Google Business Profile API, Instagram inspection, website crawling, social crawling, or AI/search sampling in V0.

Reasons:

- visual inspection creates privacy, storage, quality, and copyright obligations
- external source inspection creates cost and rate-limit obligations
- the V0 job is coverage readiness from owner-known facts, not photo scoring
- MenuList's fix path should be one current customer source

If an adapter is later approved, it must use explicit consent, source policy, entitlement/cost controls, privacy review, rate limits, and verifier updates.

---

## 8. V1 Owner Implementation Direction

V1 reuses existing owner truth and OBP/public-page media data:

- logo
- cover image
- store/profile media
- menu item/service image coverage
- public page image visibility
- current customer link readiness

Do not create a standalone visual identity dashboard for V1.

---

## 9. Verifier Gate

`npm run verify:photo-gap-check` must check:

- doc set exists under `__docs__/menulist-tools/photo-gap-check/`
- feature flag exists
- route and component exist
- route structured data and feature gates exist
- report type includes `evidenceText`
- report boundaries are false for image upload, image analysis, URL fetch, Google profile inspection, Instagram inspection, report storage, external platform updates, AI/search, and ranking promises
- no report API route exists
- no image upload or FileReader exists
- no external URL fetch exists
- no Google, Instagram, image-analysis, or AI provider runtime exists
- locales exist in `en-US` and `hi-IN`
- discovery policy, sitemap, `llms.txt`, and `llms-full.txt` include the public route

---

## 10. Implementation Notes

The V0 result is deliberately conservative. It can show obvious missing visual slots based on owner selections, but it cannot prove image quality, freshness, ownership, or external profile state.
