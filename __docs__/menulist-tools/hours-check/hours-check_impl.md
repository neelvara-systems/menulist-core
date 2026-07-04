# Hours Check - Implementation Plan

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Developers and future maintainers

---

## 1. Current State

The V0 public runtime exists at `/tools/hours-check`.

Implemented files:

| Path | Purpose |
| --- | --- |
| `src/app/(website)/tools/hours-check/page.tsx` | Public website route, metadata, structured data, and feature-flag gate |
| `src/components/website/hoursCheck/HoursCheckPage.tsx` | Browser-local form, report UI, copy/download, and consented handoff |
| `src/lib/public-truth-tools/hoursCheckTypes.ts` | Hours Check input/report contracts |
| `src/lib/public-truth-tools/hoursCheckReport.ts` | Deterministic hours, special-hours, fallback, and link checks |
| `scripts/verification/verify-hours-check.js` | Boundary verifier for route, flags, docs, locales, discovery, and no external fetch/provider behavior |

No V1 owner card, paid add-on history, Google inspection, holiday API, report API route, storage path, Cloud Function, or AI/search provider call is implemented in V0.

---

## 2. Feature Flags

Implemented flags in `src/config/features.ts`:

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_HOURS_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Use feature config, not new env vars, for ordinary product switches.

---

## 3. Type Contracts

Input:

```typescript
export interface HoursCheckInput {
  mode: 'self_report';
  businessName: string;
  cityOrArea: string;
  timeZone: string;
  regularHoursText: string;
  closedDaysText: string;
  specialHoursText: string;
  currentCustomerLink: string;
  lateNightClarity: LateNightClarity;
  specialHoursStatus: SpecialHoursStatus;
  contactFallbackShown: boolean;
}
```

Report:

```typescript
export interface HoursCheckReport {
  generatedAt: string;
  status: 'ready' | 'missing_basics' | 'unclear' | 'not_checked' | 'manual_review_needed';
  businessName: string;
  cityOrArea: string;
  timeZone: string;
  checks: HoursCheckItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    type: 'create_customer_link' | 'fix_hours' | 'manual_review';
    href: string;
  };
  boundaries: {
    externalUrlFetched: false;
    googleProfileInspected: false;
    holidayCalendarFetched: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
```

Every `HoursCheckItem` includes `evidenceText: string`.

---

## 4. Deterministic Checks

| Check | Source | Rule |
| --- | --- | --- |
| Regular hours | `regularHoursText` | Present when local text includes day and time hints |
| Closed days | `closedDaysText` and all hours text | Present when closed/open-daily wording exists |
| Late-night hours | `lateNightClarity` and hours text | Present/not needed when owner marks the midnight boundary clearly |
| Holiday hours | `specialHoursStatus` and `specialHoursText` | Present/not needed when listed or explicitly not applicable |
| Location timing | `cityOrArea` and `timeZone` | Present when city/area/country/timezone context exists |
| Contact fallback | `contactFallbackShown` | Present when owner marks visible fallback |
| Current customer link | `currentCustomerLink` | Present when URL shape is locally valid |
| External hours verification | boundary row | Always `not_checked` in V0 |

The code must never claim Google, maps, websites, holiday calendars, or AI/search answers were inspected.

---

## 5. Public Route Rules

V0 route rules:

- render from `(website)` route group
- use `WebsitePageStructuredData`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_HOURS_CHECK`
- import shared website CSS
- use localized copy under `Website.HoursCheckPage`
- run `buildHoursCheckReport(form)` only in the browser
- keep report copy/download browser-local
- submit optional follow-up to `/api/public/contact` only after consent and Turnstile completion
- set contact handoff request options to `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'`
- require the shared public-contact source/status/help-topic acknowledgement before submitted state or accepted handoff tracking

Do not add `src/app/api/hours-check/report/route.ts` for V0.

---

## 6. Cost And Storage

V0 report path:

- Firestore reads: 0
- Firestore writes: 0
- Firestore deletes: 0
- Storage operations: 0
- Cloud Functions: 0
- External fetches: 0
- Google API calls: 0
- Holiday API calls: 0
- AI/provider calls: 0

Optional follow-up:

- reuses existing `/api/public/contact`
- creates one existing public contact enquiry write only after explicit consent and existing route validation

---

## 7. External Source Boundary

Do not add Google Business Profile API, Maps API, website crawling, social crawling, holiday calendar API, or AI/search sampling in V0.

Reasons:

- external inspection creates cost, privacy, rate-limit, and accuracy obligations
- holiday inference can create false confidence for local businesses
- the V0 job is clarity from owner-visible facts, not platform verification
- MenuList's fix path should be one current customer source

If an adapter is later approved, it must use explicit consent, source policy, entitlement/cost controls, privacy review, rate limits, and verifier updates.

---

## 8. V1 Owner Implementation Direction

V1 should reuse existing owner truth and public-page hours data:

- store hours
- temp status
- holiday/special hours if already modeled
- OBP/public page visibility
- call/WhatsApp/booking fallback
- QR/share readiness

Do not create a standalone Hours dashboard for V1.

---

## 9. Verifier Gate

`npm run verify:hours-check` must check:

- doc set exists under `__docs__/menulist-tools/hours-check/`
- feature flag exists
- route and component exist
- route structured data and feature gates exist
- report type includes `evidenceText`
- report boundaries are false for URL fetch, Google profile inspection, holiday calendar fetch, report storage, external platform updates, AI/search, and ranking promises
- no report API route exists
- no external URL fetch exists
- no Google, maps, holiday, or AI provider runtime exists
- locales exist in `en-US` and `hi-IN`
- discovery policy, sitemap, `llms.txt`, and `llms-full.txt` include the public route

---

## 10. Implementation Notes

The V0 result is deliberately conservative. It can identify obvious day/time text, closed-day wording, selected late-night clarity, selected special-hours state, fallback presence, and current-link URL shape. It cannot prove the business is open, verify a public platform, or infer local holidays.
