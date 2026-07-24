# Guest Feedback System — Validation Matrix

**Status:** Source validation maintained; external certification is separate
**Last Source Audit:** July 23, 2026
**Audience:** QA, engineering, release reviewers

---

## Current Launch Boundary

This matrix is source-verified evidence for the Guest Feedback feature, not standalone production deployment approval. Release still requires target Firestore rules and Functions deployment evidence, Turnstile and provider configuration, authenticated owner/public browser and mobile QA, retention-job observation, and production-host smoke.

## Codebase-Truth Matrix

| Flow | Source evidence | Current state |
| --- | --- | --- |
| Public page admission | `src/app/feedback/[projectId]/page.tsx` | Project ID/path and project activity/toggle validated |
| Public store/tenant eligibility | `getPublicStoreById()` plus project tenant match | Active; request/cross-request cached and invalidation-tagged |
| Browser data minimization | `projectPublicClientStore()` | Canonical owner/internal store fields excluded |
| Public request controls | submit route, rate-limit config, bounded body, schema, honeypot, Turnstile | Active |
| Owner tenant/store settlement | keyed desktop/mobile inboxes + expected-scope DAL admission + latest request/source-row ownership | Source and runtime verifier pass |
| Owner response admission | exact row/status identity, row scope, duplicate/cursor coherence and safe-integer count | Runtime verifier pass |
| Duplicate retry protection | form `submissionId`; server deterministic create/fingerprint replay | Active |
| Compact event retry protection | deterministic `feedback_submitted_{feedbackId}` event create | Active and non-blocking |
| Store field-default enforcement | submit route `resolveFeedbackDefaults()` | Active server-side |
| Review URL safety | shared normalizer in settings UI/save/API/form | Active; HTTPS Google allowlist only |
| Desktop list/filter/pagination | owner DAL plus Feedback inbox | Active, 50-item cursor pages |
| Mobile list/filter/pagination | same DAL plus Mobile Feedback screen | Active, one read per filter transition and Load more |
| Resolve/reopen | transactional DAL plus acknowledgement guards | Active; store-scoped |
| Reply drafts | deterministic helper, copy/WhatsApp | Browser-local; no send provider |
| Retention | `guestFeedbackRetention.ts` in `decisionBlocksScoring.ts` | Active behind function flag; any partial batch failure fails the task and remains retryable |
| Firestore boundary | rules and indexes | Client create/delete denied; matching store read/update only |
| HQ aggregate inbox | no source implementation | Not implemented; do not claim |
| Google review ingestion/posting | no source implementation; flags false | Disabled/incomplete; do not claim |

---

## Automated Gates

The final verification report records the latest command results. Required gates for this feature are:

```bash
npm run verify:guest-feedback-boundary
env -u GOOGLE_APPLICATION_CREDENTIALS npm run test:guest-feedback:rules
npm run verify:communication-kit-boundary
npm run verify:reviews-reputation-boundary
npm run test:reviews:rules
npx tsc --noEmit
```

The reviews gates prove that the adjacent Google-review scaffolding stays disabled, unmounted, source-bounded, and tenant/store isolated. They do not certify a live Reviews product.

---

## Required Manual Matrix

### Public

- Valid direct/menu-footer/QR source submits once.
- A retry with the same `submissionId` returns the same `feedbackId` and creates no duplicate event.
- A changed payload with a reused ID cannot overwrite the original.
- Non-Latin guest names accepted by the browser and server.
- Disabled/deleted/blocked project, store, or tenant is rejected.
- Hidden fields posted manually are discarded; configured required fields are enforced.
- Turnstile success/failure and rate-limit behavior work in the target environment.
- Invalid review URL is omitted; valid URL appears for every rating.
- Public page HTML/client payload contains no owner email/contact-person/role/internal fields.

### Owner desktop

- All, Needs attention, and Resolved filters load the correct store only.
- Load more preserves order and does not duplicate items.
- Resolve/reopen removes a card when it no longer matches the active filter.
- Failed writes show one error message and do not advance status.
- Copy and WhatsApp draft handoffs never claim a provider send.

### Owner mobile

- Filter changes perform one list fetch.
- Records after the first 50 are reachable through Load more.
- Selected detail state updates after resolve.
- Copy and WhatsApp are manual; resolve is separate and double-tap guarded.
- Shell/back/public-link behavior remains inside the mobile architecture contract.

### Settings

- `evilgoogle.com`, HTTP, malformed, oversized, and unrelated URLs show invalid state and cannot save.
- Accepted HTTPS Google review/maps shapes save normalized trimmed values.
- Clearing the URL removes it.
- Store setting saves invalidate the public store/menu/OBP cache through the existing mutation contract.

---

## Pending External Evidence

Keep these pending until the owner/release operator completes them for the target environment:

- authenticated desktop browser QA
- physical mobile-device QA
- Turnstile and Upstash target configuration smoke
- custom-domain and tenant-host feedback-link smoke
- Firebase deployment evidence when rules/index/function source changes
- Vercel deployment and production-host smoke only after explicit deploy approval

---

_Document owner: QA and Engineering_
_Last updated: July 16, 2026_
