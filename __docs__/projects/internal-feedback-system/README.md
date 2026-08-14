# Guest Feedback System

**Feature Status:** Implemented in source; target-environment certification is separate
**Priority:** Medium (#5 in Expansion Surfaces)
**Feature Flag:** `ENABLE_GUEST_FEEDBACK: true`
**Last Source Audit:** July 16, 2026

---

## Quick Navigation

| Document                                                     | Audience         | Purpose                                       |
| ------------------------------------------------------------ | ---------------- | --------------------------------------------- |
| [Spec](./internal-feedback-system_spec.md)                   | CEO, PM, Clients | Business requirements, user flows, scope      |
| [Implementation](./internal-feedback-system_impl.md)         | Developers       | Technical blueprint, DB schema, API contracts |
| [Firebase](./internal-feedback-system_firebase.md)           | Developers, Ops  | Firestore rules, indexes, costs, retention    |
| [Mobile Support](./internal-feedback-system_mobile-support.md) | Mobile, QA      | Owner mobile shell behavior and parity gates   |
| [Help Doc](./internal-feedback-system_helpdoc.md)            | Support, Owners  | Owner-facing guidance and support boundaries  |
| [Marketing](./internal-feedback-system_marketing.md)         | Sales, Marketing | Pitch deck, landing page copy, messaging      |
| [Website](./internal-feedback-system_website.md)             | Website, Docs    | Public website placement and claim boundaries |
| [Validation](./internal-feedback-system_validation.md)       | QA               | Implementation validation report              |
| [Verification](./internal-feedback-system_verification.md)   | Architects       | Bug fixes and review documentation            |
| [ChatGPT Review](./_archive/chatgpt-review-session-mar14.md) | Architects       | Strategic review (Mar 14, 2026)               |

---

## One-Liner

> **A private feedback inbox where guests can report menu, business, or service issues directly to the owner so the approved source can be corrected.**

---

## What It Is

The Guest Feedback System is a **private correction channel** for guest feedback that:

- Captures customer-reported issues from public menu, QR, direct-link, and business-page surfaces
- Gives owners a calm inbox (not a dashboard) to read and resolve feedback
- Helps owners correct the same approved source that feeds customer-facing public surfaces
- Optionally prompts all guests, regardless of rating, toward the configured public review URL when enabled

Feedback nudge storage diagnostics: the inline public menu feedback nudge uses a browser-local, tab-scoped sessionStorage guard only to avoid repeating the nudge in the same session. Failed guard reads/writes log bounded `public_menu_feedback_nudge_storage_read_failed` / `public_menu_feedback_nudge_storage_write_failed` diagnostics only and do not create a fallback Firestore write, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

Safe review URL boundary now includes review URL parse diagnostics. Malformed configured Google review URLs are still treated as absent before guest-facing output, but parser failures log bounded `guest_feedback_review_url_parse_failed` diagnostics with source label, value type, length metadata, and fixed `omit_review_url` fallback policy only.

**What it is NOT:**

- ❌ A review manager
- ❌ A sentiment analyzer
- ❌ A reputation dashboard
- ❌ A response automation tool. Reply drafts are deterministic copy helpers only; owners still decide what to send or save.
- ❌ A CRM or customer relationship system

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      GUEST SURFACES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Menu Footer  │  │ Feedback QR  │  │ Direct Link  │          │
│  │    Link      │  │    Code      │  │   /feedback  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           ▼                                     │
│              ┌────────────────────────┐                         │
│              │   Guest Feedback Form  │                         │
│              │  • Rating (1-5 stars)  │                         │
│              │  • Message (optional)  │                         │
│              │  • Contact (optional)  │                         │
│              └───────────┬────────────┘                         │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  /api/public/feedback  │  ← Rate limited, no auth
              │      /submit           │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   guestFeedback        │  ← Firestore collection
              │   (flat collection)    │
              └───────────┬────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OWNER DASHBOARD                             │
│              ┌────────────────────────┐                         │
│              │    Feedback Inbox      │                         │
│              │  • List view           │                         │
│              │  • "Needs attention"   │                         │
│              │  • Contact indicator   │                         │
│              │  • WhatsApp deep link  │                         │
│              │  • Mark resolved       │                         │
│              │  • Download QR Code    │                         │
│              └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files in Codebase

### New Files (Created)

| File                                                                              | Purpose                                                                           | Status |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| `src/types/guestFeedback.ts`                                                      | GuestFeedback type + FeedbackDefaults + form types                                | ✅     |
| `src/database/guestFeedback/index.ts`                                             | Client owner DAL: getFeedbackList, updateFeedbackStatus, getFeedbackCount         | ✅     |
| `src/database/guestFeedback/guestFeedbackDiagnostics.ts`                          | Bounded client feedback MOL failure diagnostics                                   | ✅     |
| `src/database/guestFeedback/server.ts`                                            | Admin DAL: idempotent public feedback + compact event writes                      | ✅     |
| `src/app/api/public/feedback/submit/route.ts`                                     | Public submit endpoint (no auth, rate limited, Admin SDK write)                   | ✅     |
| `src/app/feedback/[projectId]/page.tsx`                                           | Standalone page with cached public eligibility and allowlisted browser projection | ✅     |
| `src/lib/feedback/publicFeedbackDiagnostics.ts`                                   | Bounded public feedback page/form failure diagnostics                             | ✅     |
| `src/lib/feedback/feedbackReplyTemplates.ts`                                      | Browser-local deterministic reply drafts for owner follow-up                      | ✅     |
| `src/lib/feedback/guestFeedbackSubmitResponse.ts`                                 | Shared public feedback submit response cap and shape guard                        | ✅     |
| `src/middleware/publicApi.ts`                                                     | Public rate limiting + honeypot + sanitization                                    | ✅     |
| `src/lib/utils/whatsappLink.ts`                                                   | WhatsApp deep link + phone validation + formatting                                | ✅     |
| `src/lib/utils/feedbackQrCode.ts`                                                 | QR code generation + download + URL builder                                       | ✅     |
| `src/components/atoms/GuestFeedbackForm/index.tsx`                                | Guest-facing feedback form (mobile-first)                                         | ✅     |
| `src/components/atoms/GuestFeedbackForm/StarRating.tsx`                           | Star rating input + display component                                             | ✅     |
| `src/components/templates/main-app/feedback/index.tsx`                            | Owner feedback inbox page                                                         | ✅     |
| `src/components/templates/main-app/feedback/feedbackInboxDiagnostics.ts`           | Bounded desktop inbox failure diagnostics                                         | ✅     |
| `src/components/templates/main-app/feedback/FeedbackCard.tsx`                     | Feedback card with contact/WhatsApp/resolve and reply drafts                      | ✅     |
| `src/components/templates/main-app/feedback/FeedbackFilters.tsx`                  | All / Needs Attention / Resolved filters                                          | ✅     |
| `src/components/templates/main-app/feedback/FeedbackQrDownload.tsx`               | QR code preview + download modal                                                  | ✅     |
| `src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx` | Store-level feedback settings                                                     | ✅     |
| `src/components/mobile/screens/MobileFeedbackScreen.tsx`                          | Mobile shell feedback list with filters and cursor pagination                     | ✅     |
| `src/components/mobile/screens/MobileFeedbackDetail.tsx`                          | Mobile detail with manual copy/WhatsApp drafts and separate resolve               | ✅     |
| `src/hooks/useFeedback.ts`                                                        | Generic feedback hook (KB articles/changelog)                                     | ✅     |
| `functions/src/analytics/guestFeedbackRetention.ts`                               | Nightly 90-day retention cleanup CF                                               | ✅     |
| `scripts/verification/verify-guest-feedback-boundary.js`                          | Source gate for public submit, safe review URL, owner/mobile parity, docs parity   | ✅     |

The desktop store-level settings expose explicit accessible names for the
master toggle, each collection toggle, each required-field toggle, the Google
review URL input, and its safe preview link. The shared mobile Switch wrapper
forwards `aria-label`, and the matching mobile Guest Feedback controls use the
same owner-facing labels. This is presentation-only and does not change the
store update, public cache invalidation, or feedback submission contracts.

Public feedback pages reuse the same temporary-status banner, business identity header, and shared public footer pattern as the customer menu. The feedback footer keeps the same Call / WhatsApp / Directions, policy, social, Share Feedback, and MenuList attribution treatment, plus the same OBP theme toggle behavior, so the footer stays consistent across the menu, OBP, and feedback surfaces.

### Modified Files

| File                                     | Change                                                          | Status |
| ---------------------------------------- | --------------------------------------------------------------- | ------ |
| `src/constants/database.ts`              | Added `GUEST_FEEDBACK` collection                               | ✅     |
| `functions/src/constants/database.ts`    | Added `GUEST_FEEDBACK` collection (CF mirror)                   | ✅     |
| `src/config/features.ts`                 | Added `ENABLE_GUEST_FEEDBACK: true`                             | ✅     |
| `src/lib/rateLimit/configs.ts`           | Added `FEEDBACK_SUBMISSION` rate limit config                   | ✅     |
| `src/lib/validation/apiSchemas.ts`       | Added `guestFeedbackSubmitSchema` + `guestFeedbackUpdateSchema` | ✅     |
| `src/constants/navigations.ts`           | Added `/feedback` route with `LuTicket` icon                    | ✅     |
| `firestore.rules`                        | guestFeedback client rules: API-only creates, tenant/store reads, status-only updates | ✅     |
| `firestore.indexes.json`                 | Added 3 composite indexes                                       | ✅     |
| `functions/src/decisionBlocksScoring.ts` | Added retention cleanup to nightly scheduler                    | ✅     |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_GUEST_FEEDBACK: true,
```

---

## Configuration

### Per-Project (MenuSettings)

```typescript
feedback?: boolean;  // default: true — feedback ON unless explicitly disabled
```

> Toggle is in Advanced Settings, framed as "Disable feedback for this menu" to discourage casual disabling.

### Per-Store (Store Settings)

```typescript
feedbackDefaults?: {
  collectName: boolean;   // default: false
  collectPhone: boolean;  // default: true (India market)
  collectEmail: boolean;  // default: true
};
feedbackEnabled?: boolean; // default: true — master store toggle
reviewUrl?: string;        // Google Review URL for CTA
```

### Production Boundary Confirmed June 11, 2026

- Public submissions go through `POST /api/public/feedback/submit`; direct unauthenticated Firestore creates are denied. The API applies the public feedback IP rate limit, rejects JSON bodies above 16KB before schema validation, and then verifies Turnstile when `TURNSTILE_SECRET_KEY` is configured. The browser form must send `captchaToken` from `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in that mode.
- The browser reuses one `submissionId` for retries. The Admin DAL derives a deterministic create-only feedback ID and verifies a sanitized payload fingerprint on replay; the compact submission event is create-only under a deterministic ID too. Lost responses therefore do not duplicate feedback or events.
- The guest-facing form submits with same-origin credentials, no-store cache policy, and manual redirect handling, then parses acknowledgements through a 16KB bounded JSON response guard before showing the success state. Successful acknowledgements must include an OK HTTP response, `success: true`, a non-empty `feedbackId`, and an optional string/null `reviewUrl`; malformed or oversized responses log bounded form diagnostics and show fixed failure copy.
- Safe review URL boundary: the public API and browser form normalize returned `reviewUrl` values through `normalizeGuestFeedbackReviewUrl()`. Only HTTPS Google review/maps URLs are accepted; invalid, non-Google, non-HTTPS, or oversized URLs are treated as absent.
- The public page and API verify project existence, project active/deleted status, store tenant match, store active/deleted/blocked state, tenant block state, project feedback toggle, and store feedback toggle. The page reuses the public store lookup/cache and sends only `projectPublicClientStore()` output to the browser.
- Store-owned field defaults are enforced on the server. Hidden contact fields are dropped even if a caller posts them directly, and required fields are validated by the API.
- Store-scoped owner/manager sessions can update only feedback from their store. Updates are limited to `status`, `needsAttention`, `modifiedOn`, `modifiedBy`, and `ownerNote`.
- Owner desktop/mobile list loads require a shaped `{ items, lastDocId, hasMore }` DAL result before state updates. Both surfaces expose cursor-based Load more; mobile filter changes use one effect-driven read. Desktop badge counts require a finite non-negative count before rendering. Composer fallback values route through bounded load diagnostics.
- Owner status/reply updates require a shaped feedback record with the expected id and status before success state advances. `updateFeedbackStatus()` also verifies the internal `getFeedbackById()` result shape before writing, so fallback values cannot bypass tenant/store record verification.
- Guest feedback writes do not invalidate public menu/OBP cache because feedback is private owner workflow data and does not change public truth packets.
- Source gate: run `npm run verify:guest-feedback-boundary` after any change to public feedback submission, owner feedback inboxes, mobile feedback screens, Firestore feedback rules/indexes, retention wiring, or this feature doc set.

---

## Doctrine Alignment

| Law                         | Requirement                    | Status  |
| --------------------------- | ------------------------------ | ------- |
| Law 1: Default Authority    | System handles by default      | ✅ PASS |
| Law 2: Silence Is a Feature | No notifications to owner      | ✅ PASS |
| Law 3: No Explanations      | No AI summaries or insights    | ✅ PASS |
| Law 6: No Cognitive Load    | Minimal config (2 toggles max) | ✅ PASS |
| Law 7: No Dashboard Feature | Inbox only, not analytics      | ✅ PASS |

---

## Strategic Positioning (from ChatGPT Review, Mar 14, 2026)

- **Identity:** "Operational signal captured at the point of menu consumption" — legitimate for MenuList
- **Constraint:** Must remain small, silent, inbox-based. Never expand into analytics/CRM/NPS
- **Naming:** Externally "Guest Feedback" — never "Internal Feedback System"
- **Compliance:** FTC-compliant (Google CTA shown to ALL ratings, no review gating)
- **Scalability:** Current architecture has bounded source gates, but load claims require current audit evidence before release.

## Permanent Rejection List

Never add to this feature:

- Analytics dashboards or trends
- AI sentiment analysis
- CRM, provider sends, or automated response workflows
- NPS scoring
- Email campaigns or follow-ups
- Review gating (rating-conditional CTA)

---

## Final Decisions (LOCKED)

| Decision          | Value                                               | Source               |
| ----------------- | --------------------------------------------------- | -------------------- |
| Collection        | Separate `guestFeedback`                            | User + ChatGPT       |
| Google Review URL | Manual store setting with shared strict allowlist   | Current source truth |
| Menu Toggle       | Per-project in Advanced Settings                    | User + ChatGPT       |
| Contact Fields    | Store-level defaults (not per-project)              | User + ChatGPT       |
| Retention         | 90 days hard deletion                               | Architect            |
| Success Metrics   | Internal MOL events only (no owner-facing)          | ChatGPT              |
| Feedback Page URL | `/feedback/{projectId}` (consistent with menu URLs) | Verification session |

---

## Version History

| Version | Date         | Changes                                                                |
| ------- | ------------ | ---------------------------------------------------------------------- |
| 2.15    | July 1, 2026 | Guest-facing feedback success now requires an OK HTTP response plus a non-empty feedback id acknowledgement before showing the success state. |
| 1.0     | Feb 1, 2026  | Initial documentation                                                  |
| 1.1     | Feb 2, 2026  | Bug fixes (project path, store fetch), verification complete           |
| 2.0     | Mar 14, 2026 | ChatGPT strategic review, doc refresh, all files confirmed implemented |

---

## Related Features

- **GBP Sync** (`__docs__/gbp-sync/`) — Google Business Profile integration for review URL
- **MOL** (`src/types/menuObservation.ts`) — Menu Observation Layer for event logging
- **Reputation Protection** (`__docs__/reputation-protection/`) — Broader reputation strategy (Pillar 3)

---

_Last updated: July 16, 2026_
