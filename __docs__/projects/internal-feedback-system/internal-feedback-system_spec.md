# Guest Feedback System — Product Specification

**Status:** Implemented in source; release certification remains environment-specific
**Feature Flag:** `ENABLE_GUEST_FEEDBACK: true`
**Last Source Audit:** July 16, 2026
**Audience:** Product, engineering, QA, support

---

## Purpose

Guest Feedback is a private correction and service-feedback channel. A guest can submit a rating and optional note from an enabled public menu, feedback QR, or direct link. The current store's owner or manager can review it and mark it resolved.

It is not a Google review-management product and does not promise to prevent, suppress, intercept, import, or post public reviews.

---

## Current User Flows

### 1. Guest submission

1. Guest opens `/feedback/{projectId}` from the menu footer, feedback QR, or direct link.
2. The server validates the project ID and confirms the project, store, and tenant are eligible for public output.
3. The page sends only an allowlisted public store projection to the browser; owner contact and internal store fields are not serialized.
4. Guest selects a 1–5 rating and may provide the contact fields enabled by the store.
5. The browser submits a bounded request with a stable `submissionId`, honeypot value, and Turnstile token when configured.
6. The API applies the feature flag, IP rate limit, 16KB body cap, Zod validation, honeypot, Turnstile, project/store/tenant checks, server sanitization, and store field-default enforcement.
7. The server derives a deterministic feedback document ID from the request scope and `submissionId`. A retry returns the existing record only when the sanitized payload fingerprint matches, preventing duplicate feedback and duplicate submission events.
8. The success state appears only after an OK, shaped acknowledgement with a non-empty `feedbackId`.
9. When a configured HTTPS Google review/maps URL passes the shared allowlist, the same optional public-review CTA is available after every rating. Rating never controls URL availability.

### 2. Owner desktop inbox

1. The authenticated store-scoped owner DAL loads up to 50 records plus a cursor check.
2. The owner can filter All, Needs attention, or Resolved and load older pages.
3. Low ratings remain `needsAttention` only while status is `new`.
4. Contact actions appear only for contact information the guest supplied.
5. Deterministic reply drafts are browser-local copy/WhatsApp helpers. MenuList does not send them.
6. Resolve/reopen uses a tenant-and-store-verified Firestore transaction and advances local state only after a shaped acknowledgement.

### 3. Owner mobile inbox

1. The feedback screen stays inside `MobileShell` and uses the same store-scoped DAL.
2. Filter changes perform one list load; mobile supports the same cursor-based Load more flow as desktop.
3. The detail screen can copy or open a reply draft in WhatsApp. Draft editing is browser-local and does not persist or send.
4. Mark resolved is a separate action with a loading guard and acknowledgement check.

### 4. Settings and public-link flow

1. Store settings control whether feedback is enabled and which comment/contact fields are shown or required.
2. A project can independently disable feedback through `menuSettings.feedback === false`.
3. A Google review URL is optional. Both the settings UI and save handler use the same HTTPS host/path allowlist, and invalid values cannot be saved.
4. Store-setting mutations use the existing store DAL and public cache invalidation contract. Private feedback record writes do not invalidate menu/OBP caches because they do not change public truth.

---

## Functional Contract

| Requirement | Current contract |
| --- | --- |
| Public access | No login; protected by IP rate limit, bounded input, honeypot, and Turnstile when configured |
| Rating | Required integer from 1 through 5 |
| Comment | Optional/configurable, maximum 300 characters |
| Name | Optional/configurable, 2–60 characters when provided; Unicode letters and marks supported |
| Phone | Optional/configurable, maximum 20 characters |
| Email | Optional/configurable, maximum 120 characters |
| Retry behavior | Current clients use a stable browser submission ID; server uses create-only deterministic records and a payload replay check. Legacy omission remains compatible without retry deduplication. |
| Owner scope | Current authenticated tenant and store only |
| Pagination | 50 records per desktop/mobile page; maximum DAL page size 100 |
| Status | `new` or `resolved`; low-rating attention flag derives from rating plus status |
| Reply drafts | Browser-local copy/WhatsApp handoff only; no provider send path |
| Review CTA | Optional valid Google URL, shown independently of rating |
| Feedback retention | `guestFeedback` record expires after 90 days and is deleted by the nightly maintenance path |
| Event retention | Compact `feedbackEvents` submission record expires using `FEEDBACK_EVENT_RETENTION_DAYS` (currently 180) |
| QR output | Standalone `/feedback/{projectId}` URL; 1024px PNG by default |

---

## Store-Scoped Multi-Outlet Boundary

The current inbox is store-scoped. An HQ user can work through the existing selected-store/outlet context, but the feedback DAL does not aggregate all outlets into one query and there is no HQ-wide feedback filter. Do not claim an all-outlet inbox.

This is intentional for the current simple, low-cost flow. Any future aggregation requires a separate product decision, explicit cross-store permission semantics, bounded reads or summary documents, desktop/mobile design, and rules tests.

---

## Privacy and Data Boundary

- Public page browser data comes from `projectPublicClientStore()`; canonical store documents must not be serialized into `GuestFeedbackForm`.
- Guest contact details are optional, visible only to an authenticated matching store, and excluded from runtime diagnostics.
- Public submissions write through the Admin SDK route; unauthenticated client creates are denied.
- Owner clients cannot change the original rating, message, contact data, source, project, tenant, or store.
- No raw guest message or contact detail is stored in `feedbackEvents`.
- The guest feedback record is hard-deleted after expiry; this is not an archive or CRM.

---

## Non-Goals

- Google review ingestion, monitoring, or reply posting
- Review gating or rating-based routing
- Public-review prevention or rating-improvement promises
- Sentiment or reputation dashboards
- AI-generated feedback analysis inside this inbox
- Automatic customer replies
- Email/SMS campaigns, CRM history, or customer profiling
- HQ-wide all-outlet aggregation in the current runtime
- Owner notifications for every submission

The separate `reviews-reputation` and `reputation-protection` folders describe disabled, incomplete future scaffolding. Their flags must remain off until ingestion, persistence, mounted owner/mobile UI, provider behavior, permission tests, deploy evidence, and production smoke all exist.

---

## Cost and Scale Contract

Normal public submission work is bounded to three eligibility reads, one create-only `guestFeedback` write, and one compact create-only event write. A replay adds one exact-document read and does not create another feedback/event record.

Owner lists are cursor-paginated. Retention deletes at most the bounded scheduler limit per run. No real-time listeners, per-feedback notification fan-out, unbounded history query, or raw-feedback AI call belongs in this flow.

---

## Release Gates

Repository gates:

- `npm run verify:guest-feedback-boundary`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:guest-feedback:rules`
- `npm run verify:communication-kit-boundary`
- `npx tsc --noEmit`

External/owner-run gates remain pending per target environment: authenticated browser and mobile-device QA, Turnstile and Upstash configuration smoke, custom-domain feedback-link smoke, target Firebase deployment evidence when rules/index/function source changes, Vercel deployment only with explicit approval, and production-host verification.

---

_Document owner: Product and Engineering_
_Last updated: July 16, 2026_
