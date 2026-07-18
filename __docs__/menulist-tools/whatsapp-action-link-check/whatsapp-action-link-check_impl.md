# WhatsApp Action Link Check - Implementation Plan

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 16, 2026
**Audience:** Developers and future maintainers

---

## 1. Current State

The V0 public runtime exists at `/tools/whatsapp-action-link-check`.

Implemented files:

| Path | Purpose |
| --- | --- |
| `src/app/(website)/tools/whatsapp-action-link-check/page.tsx` | Public website route, metadata, structured data, and feature-flag gate |
| `src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx` | Browser-local form, report UI, copy/download, and consented handoff |
| `src/lib/public-truth-tools/whatsappActionLinkTypes.ts` | WhatsApp Action Link input/report contracts |
| `src/lib/public-truth-tools/whatsappActionLinkReport.ts` | Deterministic phone/link/message checks |
| `scripts/verification/verify-whatsapp-action-link-check.js` | Boundary verifier for route, flags, docs, locales, discovery, and no external send/fetch |

V1 owner readiness is implemented through the shared Business Health/Public Truth owner card. No standalone WhatsApp dashboard, paid add-on history, WhatsApp API integration, message sending, number verification, report API route, storage path, Cloud Function, or AI/search provider call is implemented in V0.

---

## 2. Feature Flags

Implemented flags in `src/config/features.ts`:

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Use feature config, not new env vars, for ordinary product switches.

---

## 3. Type Contracts

Input:

```typescript
export interface WhatsAppActionLinkInput {
  mode: 'self_report';
  businessName: string;
  cityOrArea: string;
  whatsappNumber: string;
  existingWhatsappLink: string;
  currentCustomerLink: string;
  messageIntent: WhatsAppActionMessageIntent;
  suggestedMessage: string;
  menuOrServiceLinkAttached: boolean;
  hoursExpectationSet: boolean;
  fallbackActionShown: boolean;
}
```

Report:

```typescript
export interface WhatsAppActionLinkReport {
  generatedAt: string;
  status: 'ready' | 'missing_basics' | 'unclear' | 'not_checked' | 'manual_review_needed';
  businessName: string;
  cityOrArea: string;
  messageIntent: WhatsAppActionMessageIntent;
  previewLink: string | null;
  checks: WhatsAppActionLinkItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    type: 'create_customer_link' | 'fix_whatsapp_action' | 'manual_review';
    href: string;
  };
  boundaries: {
    messageSent: false;
    phoneNumberVerified: false;
    whatsappLinkOpened: false;
    externalUrlFetched: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
```

Every `WhatsAppActionLinkItem` includes `evidenceText: string`.

---

## 4. Deterministic Checks

| Check | Source | Rule |
| --- | --- | --- |
| WhatsApp number | `whatsappNumber` or `existingWhatsappLink` | Present when local number/link text includes a usable phone-shape |
| Click-to-chat format | entered link or generated wa.me shape | Present for valid wa.me/api.whatsapp.com/send/whatsapp://send format or likely country-code number |
| Message intent | `messageIntent` plus `suggestedMessage` | Present when the action is clear |
| Suggested message | `suggestedMessage` | Present when text is long enough and contains action/help words |
| Menu or service link | `currentCustomerLink` and owner selection | Present when valid URL or owner marks link attached |
| Hours expectation | owner selection or message hints | Present when the customer has a reply/timing expectation |
| Fallback action | owner selection | Present when a fallback call/booking/public link is indicated |
| Message delivery | boundary row | Always `not_checked` in V0 |

Number parsing uses `phoneValidation.ts` and rejects arbitrary non-format characters rather than stripping them into a different number. Existing WhatsApp links are recognized only for strict HTTPS `wa.me/{digits}`, strict `/send?phone=` on the approved WhatsApp web hosts, or `whatsapp://send?phone=`. The generated preview is always a local `https://wa.me/{digits}` value and is produced only after the phone shape passes.

The code must never claim the WhatsApp account works or that a message was delivered.

Malformed WhatsApp link parsing remains a local invalid-link fallback. `src/lib/public-truth-tools/whatsappActionLinkReport.ts` logs capped `whatsapp_action_link_url_parse_failed` diagnostics with candidate length, protocol presence, WhatsApp-scheme/host booleans, and fixed `treat_as_invalid_whatsapp_link` fallback policy only. It must not log raw WhatsApp links, phone numbers, suggested messages, customer links, report rows, generated preview links, or parser exception text.

---

## 5. Public Route Rules

V0 route rules:

- render from `(website)` route group
- use `WebsitePageStructuredData`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK`
- import shared website CSS
- use localized copy under `Website.WhatsAppActionLinkCheckPage`
- run `buildWhatsAppActionLinkReport(form)` only in the browser
- keep report copy/download browser-local
- submit optional follow-up to `/api/public/contact` only after consent and Turnstile completion
- set contact handoff request options to `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'`
- require the shared public-contact source/status/help-topic acknowledgement before submitted state or accepted handoff tracking

Do not add `src/app/api/whatsapp-action-link-check/report/route.ts` for V0.

---

## 6. Cost And Storage

V0 report path:

- Firestore reads: 0
- Firestore writes: 0
- Firestore deletes: 0
- Storage operations: 0
- Cloud Functions: 0
- External fetches: 0
- WhatsApp API calls: 0
- AI/provider calls: 0

Optional follow-up:

- reuses existing `/api/public/contact`
- creates one existing public contact enquiry write only after explicit consent and existing route validation

---

## 7. WhatsApp Boundary

Do not add WhatsApp Business API, click-to-send, deep-link opening, phone verification, or account lookup in V0.

Reasons:

- message sending is an external side effect
- account verification requires provider/API decisions
- opening links creates accidental transmission risk
- the V0 job is readiness, not delivery

If an adapter is later approved, it must use explicit consent, entitlement/cost controls, privacy review, rate limits, and verifier updates.

---

## 8. V1 Owner Implementation Direction

V1 reuses existing owner truth and public-page action data:

- WhatsApp number/action field
- current customer link
- menu/service link readiness
- call/booking/order fallback
- public page CTA visibility
- hours/temp-status readiness
- QR/share readiness

Do not create a standalone WhatsApp dashboard for V1.

---

## 9. Verifier Gate

`npm run verify:whatsapp-action-link-check` must check:

- doc set exists under `__docs__/menulist-tools/whatsapp-action-link-check/`
- feature flag exists
- route and component exist
- route structured data and feature gates exist
- report type includes `evidenceText`
- report boundaries are false for message sending, phone verification, link opening, URL fetch, external updates, AI/search, and ranking promises
- no report API route exists
- no WhatsApp send/open runtime exists
- no external URL fetch exists
- malformed WhatsApp URL parsing uses capped diagnostics with no raw link or message content
- locales exist in `en-US` and `hi-IN`
- discovery policy, sitemap, `llms.txt`, and `llms-full.txt` include the public route

---

## 10. Implementation Notes

The V0 result is deliberately conservative. It can identify obvious WhatsApp link and phone-number shapes, but it cannot prove the WhatsApp account exists, belongs to the business, or receives messages. Evidence text must say that clearly.
