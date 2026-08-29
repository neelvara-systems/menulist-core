# Internal Feedback System - Firebase Contract

**Status:** Implemented
**Last Updated:** August 28, 2026
**Audience:** Developers, Firebase operators, production readiness reviewers

---

## Firestore Collections

| Collection | Writer | Reader | Purpose |
| ---------- | ------ | ------ | ------- |
| `guestFeedback` | `POST /api/public/feedback/submit` through Admin SDK only | Authenticated owner/manager sessions for the matching tenant/store | Private guest feedback inbox records |
| `feedbackEvents` | Server/Admin submit helper | No public/client read path | Compact internal MOL event trail |

Client-created `guestFeedback` documents are denied in `firestore.rules`. Public submissions must pass the API route so body caps, Zod validation, honeypot, Turnstile, project/store/tenant checks, store field-default enforcement, and safe review URL normalization run before a write.

Guest Feedback project ID admission is cost-neutral for valid public feedback pages and submissions. `src/lib/feedback/guestFeedbackProjectIdBoundary.ts` preserves the supported project-ID character rule while rejecting malformed, whitespace-mutated, path-shaped, or reserved Firestore document IDs before the public QR page reads `projects/{tId}/{sId}/{projectId}` and before `POST /api/public/feedback/submit` reaches honeypot, Turnstile verification, project/store/tenant reads, `guestFeedback` writes, or MOL event logging. The submit schema no longer trims project IDs before validation. The submit route repeats the normalizer before `.doc(projectId)`, the `guestFeedback` write payload, MOL event logging, and bounded diagnostics, so malformed helper-local values fail before Firestore work and `.doc(data.projectId)` remains excluded. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache tags, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

Guest Feedback target document-ID admission is cost-neutral for valid submissions. `normalizeGuestFeedbackNumericDocumentId()` validates the project-derived tenant/store segments. The public page then uses `getPublicStoreById()` for the store/tenant eligibility read and verifies the returned tenant matches the project. That shared lookup participates in request caching, the 60-second public data cache, and the `client-stores` invalidation tag. Only `projectPublicClientStore()` output reaches the browser. The submit route independently normalizes exact positive tenant/store IDs before building project/store/tenant refs.

---

## Rule Boundary

- `guestFeedback` creates: `allow create: if false;`
- `guestFeedback` reads: allowed only for sessions that belong to the feedback tenant/store.
- `guestFeedback` updates: tenant/store admins can update only `status`, `needsAttention`, `modifiedOn`, `modifiedBy`, and `ownerNote`; `modifiedOn` must be the Firestore write time (`request.time`) produced by a server-timestamp transform.
- `guestFeedback` deletes: denied from clients.
- `feedbackEvents`: append-only event records with no client read, update, or delete access.

Guest feedback writes do not invalidate public menu/OBP cache because feedback is private owner workflow data and does not change public menu, store, outlet, Official Business Page, or screen-display truth packets.

Owner inbox reads and status writes carry a caller-captured tenant/store into the client DAL. The DAL still derives authority from the signed active session and rejects disagreement before Firestore work. Normal operation costs are unchanged: desktop keeps one list plus one aggregate count on initial/filter loads, mobile keeps one list read, pagination keeps its cursor read plus bounded query, and status remains one transaction. If a newer desktop list replaces the source row while a status transaction commits, the client performs one list/count reconciliation instead of projecting over newer state. Runtime result guards reject cross-scope rows, duplicate IDs, incoherent cursors, fractional counts, and wrong-row status acknowledgements before UI state changes.

Desktop Feedback distribution project resolution adds zero reads when the already-loaded store has a valid `primaryProjectId` or the component receives a valid explicit project. A legacy store without either performs at most one exact tenant/store-scoped project-summary read on first Feedback navigation; SWR deduplicates it for one hour and disables focus/reconnect revalidation. The selector rejects inactive, deleted, special, and malformed projects before creating a public Feedback URL. Copy, open, WhatsApp handoff, QR generation, and PNG download remain browser-local and add no Firestore write, listener, Storage operation, Function invocation, analytics event, payment, or provider send.

Feedback nudge storage diagnostics: the public menu inline feedback nudge uses browser-local sessionStorage only to avoid repeating the nudge in one tab session. Failed read/write paths log bounded `public_menu_feedback_nudge_storage_read_failed` / `public_menu_feedback_nudge_storage_write_failed` diagnostics only and add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

Review URL parse diagnostics are cost-neutral. Malformed configured review URLs still resolve to absent guest-facing review links, while `guest_feedback_review_url_parse_failed` logs bounded source/value-shape metadata with fixed `omit_review_url` fallback policy only. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache tags, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

Feedback QR download filename boundary is Firebase-cost neutral. Desktop Use MenuList and mobile Share now pass feedback QR filenames through `getQrCodeFilename(data.storeName)` before browser download instead of raw store-name whitespace replacement. This changes only the local filename string used by `downloadQrCode()`: no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, provider calls, cache invalidations, rules, indexes, Firebase deploy requirement, Vercel deploy action, or owner setting changes are added.

Feedback reply drafts are Firebase-cost neutral. `src/lib/feedback/feedbackReplyTemplates.ts` generates deterministic browser-local text from the already-loaded feedback record and optional store name. Desktop and mobile copy/WhatsApp handoffs remain browser-local and do not persist or claim a send. Mobile resolve is a separate existing status write.

Public feedback retry idempotency uses a deterministic `guestFeedback` document ID plus a SHA-256 fingerprint of sanitized persistent fields. Normal submissions still perform one feedback create; an exact replay adds one exact-document read and returns the existing ID without another write. A changed payload cannot reuse the ID to overwrite the record. The `FEEDBACK_SUBMITTED` event also uses a deterministic create-only ID, so retries do not duplicate compact events.

---

## Indexes And Retention

`firestore.indexes.json` carries the `guestFeedback` composite indexes required for store-scoped newest-first, status, rating, and needs-attention queries. Keep these indexes aligned before widening owner filters.

`functions/src/analytics/guestFeedbackRetention.ts` deletes expired `guestFeedback` records in bounded batches. The task is wired through `functions/src/decisionBlocksScoring.ts` behind `ENABLE_GUEST_FEEDBACK_RETENTION`. If any batch reports deletion errors, the scheduler records the task as failed through the existing stable failure code instead of reporting a successful retention run; the next run can retry the still-expired rows. Any Cloud Function logic change still requires the scoped Firebase validation/deploy path from the production-readiness runbook.

---

## Cost Boundary

- One new public feedback submission writes one `guestFeedback` document and one compact event. Exact replay writes neither.
- The compact feedback event write is non-blocking and used for internal operational analytics only.
- Owner desktop/mobile list reads are tenant/store scoped and cursor-paginated in 50-item pages.
- Owner counts are separate scoped reads and must stay acknowledgement-guarded before rendering.
- Status/reply updates are single-document writes after the client DAL verifies the shaped existing record.

Run `npm run verify:guest-feedback-boundary` and `npm run test:guest-feedback:rules` after any rule, index, retention, DAL, or public submit change. The emulator command clears ambient Application Default Credential paths and invokes the repository-local `ts-node`; it must not require a production credential file.
