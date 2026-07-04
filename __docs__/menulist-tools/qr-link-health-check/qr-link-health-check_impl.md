# QR Link Health Check - Implementation Plan

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Developers and future maintainers

---

## 1. Current State

The V0 public runtime exists at `/tools/qr-link-health-check`.

Implemented files:

| Path | Purpose |
| --- | --- |
| `src/app/(website)/tools/qr-link-health-check/page.tsx` | Public website route, metadata, structured data, and feature-flag gate |
| `src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx` | Browser-local form, report UI, copy/download, and consented handoff |
| `src/lib/public-truth-tools/qrLinkHealthTypes.ts` | QR Link Health input/report contracts |
| `src/lib/public-truth-tools/qrLinkHealthReport.ts` | Deterministic pasted-target checks |
| `scripts/verification/verify-qr-link-health-check.js` | Boundary verifier for route, flags, docs, locales, discovery, and no external fetch |

V1 owner readiness is implemented through the shared Business Health/Public Truth owner card. No standalone QR dashboard, paid add-on history, QR image decoder, report API route, storage path, Cloud Function, or AI/search provider call is implemented in V0.

---

## 2. Feature Flags

Implemented flags in `src/config/features.ts`:

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Use feature config, not new env vars, for ordinary product switches.

---

## 3. Type Contracts

Input:

```typescript
export interface QrLinkHealthInput {
  mode: 'self_report';
  businessName: string;
  cityOrArea: string;
  qrTargetUrl: string;
  expectedDestination: QrLinkExpectedDestination;
  targetLooksCurrent: boolean;
  customerActionVisible: boolean;
  printedContextClear: boolean;
  replacementNeeded: boolean;
}
```

Report:

```typescript
export interface QrLinkHealthReport {
  generatedAt: string;
  status: 'ready' | 'missing_basics' | 'unclear' | 'not_checked' | 'manual_review_needed';
  businessName: string;
  cityOrArea: string;
  expectedDestination: QrLinkExpectedDestination;
  checks: QrLinkHealthItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    type: 'create_customer_link' | 'replace_qr_target' | 'manual_review';
    label: string;
    description: string;
    href: string;
  };
  boundaries: {
    qrImageDecoded: false;
    targetPageFetched: false;
    externalSourcesFetched: false;
    aiOrSearchChecked: false;
    externalPlatformUpdated: false;
    rankingPromise: false;
  };
}
```

Every `QrLinkHealthItem` includes `evidenceText: string`.

---

## 4. Deterministic Checks

| Check | Source | Rule |
| --- | --- | --- |
| QR target | `qrTargetUrl` | Present when a URL string exists |
| URL format | `qrTargetUrl` | Present only for public HTTPS URLs |
| MenuList customer link | URL host/path | Present when host is an active MenuList domain or MenuList-looking customer host; unclear for valid external URLs |
| Current link confidence | owner selection | Present when owner marks the QR target current; missing when replacement is needed |
| Customer action | owner selection plus URL hints | Present when owner marks a visible action or URL hints menu/order/book/WhatsApp/call/direction |
| Printed context | owner selection | Present when owner says the QR is labeled or placed clearly for customers |
| Target page inspection | fixed boundary | Always `not_checked` in V0 |

The local URL parser accepts bare public domains by normalizing them to HTTPS. It rejects explicit `http://`, localhost, `.local`, private IP, raw IP, loopback IPv6, and credentialed targets. The code must never claim that the target page works, loads, or contains specific content.

---

## 5. Public Route Rules

V0 route rules:

- render from `(website)` route group
- use `WebsitePageStructuredData`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK`
- import shared website CSS
- use localized copy under `Website.QrLinkHealthCheckPage`
- run `buildQrLinkHealthReport(form)` only in the browser
- keep report copy/download browser-local
- submit optional follow-up to `/api/public/contact` only after consent and Turnstile completion
- set contact handoff request options to `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'`
- require the shared public-contact source/status/help-topic acknowledgement before submitted state or accepted handoff tracking

Do not add `src/app/api/qr-link-health-check/report/route.ts` for V0.

---

## 6. Cost And Storage

V0 report path:

- Firestore reads: 0
- Firestore writes: 0
- Firestore deletes: 0
- Storage operations: 0
- Cloud Functions: 0
- External fetches: 0
- AI/provider calls: 0

Optional follow-up:

- reuses existing `/api/public/contact`
- creates one existing public contact enquiry write only after explicit consent and existing route validation

---

## 7. QR Decoder Boundary

Do not add QR image decoding in V0.

Reasons:

- the current repo has QR generation dependencies, not an approved browser QR decoder
- adding a new decoder dependency conflicts with the freeze posture for a small free tool
- uploading QR images would require a storage, privacy, and retention decision even if decoded locally

If QR image decoding is later approved, it must be browser-local by default, must not store images, and must update this doc, Firebase doc, mobile-support doc, test cases, and verifier.

---

## 8. V1 Owner Implementation Direction

V1 reuses existing owner truth and link generation:

- store/project state from owner context and DAL
- current public menu/customer link generation
- QR/share surface state
- existing Business Health/Public Discovery/Share UI shells

Do not create a standalone QR dashboard for V1. Show the check where the owner already manages public/share readiness.

---

## 9. Verifier Gate

`npm run verify:qr-link-health-check` must check:

- doc set exists under `__docs__/menulist-tools/qr-link-health-check/`
- feature flag exists
- route and component exist
- route structured data and feature gates exist
- report type includes `evidenceText`
- report boundaries are false for QR image decoding, target page fetch, external fetch, AI/search, external updates, and ranking promises
- no report API route exists
- no source URL fetch exists
- no file upload or storage path exists
- locales exist in `en-US` and `hi-IN`
- discovery policy, sitemap, `llms.txt`, and `llms-full.txt` include the public route

---

## 10. Implementation Notes

The V0 result is deliberately conservative. A valid external URL is not treated as broken, but it is not treated as a MenuList-ready customer link either. The report should say "unclear" when the tool cannot inspect the page.
