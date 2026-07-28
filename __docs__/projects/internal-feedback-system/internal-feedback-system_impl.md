# Guest Feedback System — Implementation Contract

July 28, 2026 persisted-identity correction: public feedback submit and standalone feedback rendering reconcile all canonical/legacy store tenant aliases before accepting project/store scope. A conflicting `tenantId`/`tId` row cannot create guest feedback or render store-derived public output.

**Status:** Implemented in source; environment certification is separate
**Last Source Audit:** July 23, 2026
**Audience:** Engineering, security, Firebase, QA

---

## Runtime Topology

```text
Public menu / QR / direct link
  -> /feedback/{projectId}
     -> request-cached project lookup
     -> cached public store + tenant eligibility lookup
     -> explicit browser-safe store projection
  -> POST /api/public/feedback/submit
     -> flag -> IP limit -> 16KB JSON -> Zod -> honeypot -> Turnstile
     -> project + store + tenant eligibility and settings
     -> sanitize + enforce store field defaults
     -> idempotent Admin SDK feedback create
     -> idempotent compact submission event create

Authenticated desktop/mobile owner
  -> client guestFeedback DAL
     -> session tenant/store scope
     -> cursor-paginated list/count
     -> transactional resolve/reopen
```

### Owner inbox scope and response contract

- Desktop and mobile inbox instances are keyed by tenant/store and pass that captured scope into list, count, cursor and status DAL operations.
- The DAL independently compares the caller's expected scope with the active signed session before every feedback read/write.
- List settlement is latest-request-owned. Load-more attempts are serialized and deduplicate row IDs.
- Runtime list admission requires every row to match the expected tenant/store, row IDs to be unique, the cursor to equal the last admitted row, and empty pages not to claim more data.
- Status acknowledgement requires the response's own feedback ID and status to match the requested row. Counts must be nonnegative safe integers.
- Status mutations settle only while the exact source row still owns current state. A tenant/store or newer row replacement suppresses obsolete owner feedback and local projection.

---

## Source Inventory

| Area | Source |
| --- | --- |
| Public page | `src/app/feedback/[projectId]/page.tsx` |
| Guest form | `src/components/atoms/GuestFeedbackForm/index.tsx` |
| Public submit route | `src/app/api/public/feedback/submit/route.ts` |
| Request schema | `src/lib/validation/apiSchemas.ts` |
| Admin write/event DAL | `src/database/guestFeedback/server.ts` |
| Owner client DAL | `src/database/guestFeedback/index.ts` |
| Public project ID boundary | `src/lib/feedback/guestFeedbackProjectIdBoundary.ts` |
| Public store lookup | `src/lib/firestore/clientStoreLookup.ts` |
| Browser-safe store projection | `src/lib/publicTruth/clientStoreProjection.ts` |
| Review URL response/allowlist | `src/lib/feedback/guestFeedbackSubmitResponse.ts` |
| Reply drafts | `src/lib/feedback/feedbackReplyTemplates.ts` |
| Desktop inbox | `src/components/templates/main-app/feedback/` |
| Mobile inbox/detail | `src/components/mobile/screens/MobileFeedbackScreen.tsx`, `MobileFeedbackDetail.tsx` |
| Store settings | `src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx` |
| Retention task | `functions/src/analytics/guestFeedbackRetention.ts` via `functions/src/decisionBlocksScoring.ts` |
| Rules/indexes | `firestore.rules`, `firestore.indexes.json` |
| Source verifier | `scripts/verification/verify-guest-feedback-boundary.js` |

There are no authenticated `/api/feedback` list/update routes. Owner reads and status writes use the client DAL and Firestore rules.

---

## Feedback QR download filename boundary

Desktop Use MenuList and mobile Share build the local Feedback QR filename through `getQrCodeFilename(data.storeName)`. The raw store-name whitespace replacement path is not accepted. If an empty or wholly non-Latin display name has no ASCII filename characters, the helper uses `menu-feedback-qr.png` instead of producing a leading-hyphen or empty filename. This changes only the browser download name; it does not change the feedback URL, QR payload, public submit flow, Firestore, Storage, or cache behavior.

---

## Public Page Contract

`getProjectData()` validates the exact project ID, parses exact positive numeric tenant/store segments, reads `projects/{tId}/{sId}/{projectId}`, and rejects inactive, deleted, or feedback-disabled projects. React `cache()` deduplicates page/metadata reads in one server render.

`getStoreInfo()` calls `getPublicStoreById()` rather than reading and serializing a canonical store document. That shared helper checks store identity and eligibility plus tenant identity and eligibility, uses request and 60-second public caches, and participates in the `client-stores` invalidation tag. The page also verifies the returned store tenant matches the project tenant.

Only `projectPublicClientStore()` output enters the client component. Owner email, contact-person fields, roles, billing, credentials, integration secrets, and internal workflow metadata are outside the projection.

The page resolves the owner-controlled public language from the admitted `?lang=` value and projected store language settings. Heading, field labels, validation, submission states, success/failure recovery, rating accessibility text, temporary-status defaults, and attribution use the shared static public-customer translator with matching `lang` and `dir`. The official-page return link preserves the active language. Custom owner temporary-status text remains verbatim.

An invalid, disabled, deleted, or unavailable feedback project resolves to a lightweight route-local public recovery screen instead of the generic application 404. It reads only the existing `?lang=` query for fixed copy/direction and preserves that language on the homepage recovery link; it does not retry or disclose project/store state.

This localization reuses the existing project/store resolution and adds no Firestore read/write, API request, runtime translation provider, listener, analytics event, or public preference document.

---

## Public Submit Contract

### Admission order

1. `ENABLE_GUEST_FEEDBACK`
2. `FEEDBACK_SUBMISSION` IP rate limit (10 requests per 10 minutes)
3. 16KB JSON body cap
4. `guestFeedbackSubmitSchema`
5. exact project/tenant/store document-ID normalization
6. honeypot
7. Turnstile verification when configured
8. parallel project/store/tenant reads
9. project/store/tenant identity, activity, deletion, block, and feedback-setting checks
10. sanitization and server enforcement of store-owned field visibility/requiredness
11. idempotent feedback/event persistence

### Idempotency

The browser lazily creates one `submissionId` and reuses it for retries until the success screen replaces the form. When present, the API requires 16–100 URL-safe characters. The field remains optional for an already-open pre-deploy form; a legacy omission receives a server UUID and keeps the previous one-request/one-record behavior, while current clients receive retry deduplication.

`submitGuestFeedbackAdmin()` hashes tenant, store, project, and `submissionId` into a deterministic document ID. It uses Firestore `create()` rather than `add()`. The document stores a SHA-256 fingerprint of the sanitized persistent request fields.

- First request: create record and return HTTP 201.
- Exact replay: read the existing deterministic document, require scope/project/fingerprint equality, and return HTTP 200 with the same `feedbackId`.
- Reused ID with changed payload: fail closed; it cannot overwrite the original record.

The `FEEDBACK_SUBMITTED` event uses a deterministic ID based on `feedbackId` and create-only semantics. Retrying after a lost response cannot duplicate either document, and a retry can repair a missing first event attempt without extending an existing event's expiry.

### Stored feedback shape

```typescript
{
  tId: number;
  sId: number;
  projectId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  source: 'menu_footer' | 'feedback_qr' | 'direct_link';
  message?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'new';
  needsAttention: boolean;
  createdBy: 'guest';
  createdOn: Timestamp;
  expiresOn: Timestamp;
  requestFingerprintHash: string; // internal replay guard
}
```

The fingerprint is not rendered by the owner DTO normalizer and contains no reversible guest content.

---

## Review URL Contract

`normalizeGuestFeedbackReviewUrl()` is the single allowlist for settings display, settings save, submit-route response, and browser response handling. It accepts HTTPS only and these shapes:

- Google hosts with `/local/writereview` or `/maps`
- `g.page` paths containing `/review`
- `maps.app.goo.gl`
- `goo.gl/maps...` legacy map links

Substring hosts such as `evilgoogle.com`, non-HTTPS URLs, arbitrary redirects, and values over 2048 characters are rejected. Invalid settings cannot be persisted. The review CTA is optional and never depends on rating.

---

## Owner DAL and Rules

`resolveSessionScope()` requires exact positive tenant/store IDs plus a user ID. All list/count/update operations use that scope.

- Lists fetch `pageSize + 1`, validate every persisted record, and return `{ items, lastDocId, hasMore }`.
- Cursor documents must exist, be shaped, and belong to the current store.
- Desktop and mobile use 50-item pages and explicit Load more controls.
- Status changes run in a Firestore transaction and can update only status-derived fields, modifier metadata, and an optional 300-character owner note.
- UI success requires `assertFeedbackStatusUpdateSucceeded()`.
- Active-filter lists remove items locally when their new status no longer matches.

Rules deny client creates/deletes, require matching tenant/store reads, and restrict owner updates to the approved field set. Rules emulator coverage proves own-store admission and cross-store/cross-tenant/public denial.

The current DAL does not implement an HQ all-outlet aggregate query.

---

## Desktop and Mobile Reply Boundary

`feedbackReplyTemplates.ts` creates deterministic drafts from an already-loaded feedback record and optional store name.

- Desktop: copy or open WhatsApp; no persistence and no send acknowledgement.
- Mobile: choose/edit a browser-local draft, copy it, or open WhatsApp. Resolve is a separate write.
- MenuList never claims to have sent a reply.
- Guest text, draft text, phone, email, and raw identifiers are excluded from diagnostics.

---

## Retention and Cost

`expiresOn` is set to 90 days at create time. `processGuestFeedbackRetention()` is wired into the existing nightly `decisionBlocksScoring` scheduler behind `ENABLE_GUEST_FEEDBACK_RETENTION`. It queries expired records with a bounded limit and deletes in bounded batches.

Normal submission cost: three eligibility reads, one feedback write, and one compact event write. Exact replay cost: the normal eligibility reads plus one exact feedback read; no duplicate writes. Desktop/mobile reads are cursor-paginated; no real-time listener exists.

Private feedback/status writes do not invalidate public caches. Store settings do, through the existing store mutation/public cache contract.

---

## Separate Dormant Reviews Boundary

`ENABLE_REVIEWS_REPUTATION` and `ENABLE_AI_REPLY_ASSIST` remain false. Existing source is limited to two guarded routes, unmounted components, types, rules/indexes for `reviewsState`, and pure classification rules. There is no GBP ingestion writer, review DAL/inbox, scheduler, reply-posting route, or mobile review UI. Provider access alone is not activation evidence.

---

## Verification

Run after any change to this flow:

```bash
npm run verify:guest-feedback-boundary
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:guest-feedback:rules
npm run verify:communication-kit-boundary
npx tsc --noEmit
```

Manual release evidence remains target-specific: public page/form, retry after a lost response, every filter and pagination branch, resolve/reopen, invalid and valid review URLs, mobile copy/WhatsApp, Turnstile, custom domain, and production-host smoke.

---

_Document owner: Engineering_
_Last updated: July 16, 2026_
