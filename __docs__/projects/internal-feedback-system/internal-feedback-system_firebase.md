# Internal Feedback System - Firebase Contract

**Status:** Implemented
**Last Updated:** July 6, 2026
**Audience:** Developers, Firebase operators, production readiness reviewers

---

## Firestore Collections

| Collection | Writer | Reader | Purpose |
| ---------- | ------ | ------ | ------- |
| `guestFeedback` | `POST /api/public/feedback/submit` through Admin SDK only | Authenticated owner/manager sessions for the matching tenant/store | Private guest feedback inbox records |
| `feedbackEvents` | Server/admin and client DAL event helpers | No public/client read path | Compact internal MOL event trail |

Client-created `guestFeedback` documents are denied in `firestore.rules`. Public submissions must pass the API route so body caps, Zod validation, honeypot, Turnstile, project/store/tenant checks, store field-default enforcement, and safe review URL normalization run before a write.

Guest Feedback project ID admission is cost-neutral for valid public feedback pages and submissions. `src/lib/feedback/guestFeedbackProjectIdBoundary.ts` preserves the supported project-ID character rule while rejecting malformed, whitespace-mutated, path-shaped, or reserved Firestore document IDs before the public QR page reads `projects/{tId}/{sId}/{projectId}` and before `POST /api/public/feedback/submit` reaches honeypot, Turnstile verification, project/store/tenant reads, `guestFeedback` writes, or MOL event logging. The submit schema no longer trims project IDs before validation. The submit route repeats the normalizer before `.doc(projectId)`, the `guestFeedback` write payload, MOL event logging, and bounded diagnostics, so malformed helper-local values fail before Firestore work and `.doc(data.projectId)` remains excluded. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache tags, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

Guest Feedback target document-ID admission is cost-neutral for valid public feedback pages and submissions. The public feedback page uses the same numeric document-ID normalizer for project-derived tenant/store segments before `projects/{tId}/{sId}/{projectId}` and `stores/{sId}` reads. `normalizeGuestFeedbackNumericDocumentId()` in `src/lib/feedback/guestFeedbackProjectIdBoundary.ts` requires exact positive numeric MenuList tenant/store IDs plus the shared Firestore document-ID boundary before `/api/public/feedback/submit` builds `projects/{tId}/{sId}/{projectId}`, `stores/{sId}`, or `tenants/{tId}` refs. Invalid whitespace-mutated, path-shaped, reserved, zero, negative, decimal, unsafe, or nonnumeric tenant/store IDs fail as validation errors before page lookup, Turnstile, Firestore reads, `guestFeedback` writes, MOL event logging, or bounded diagnostics. This changes no valid Firestore read/write/delete counts, Storage operations, Cloud Functions, cache tags, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

---

## Rule Boundary

- `guestFeedback` creates: `allow create: if false;`
- `guestFeedback` reads: allowed only for sessions that belong to the feedback tenant/store.
- `guestFeedback` updates: tenant/store admins can update only `status`, `needsAttention`, `modifiedOn`, `modifiedBy`, and `ownerNote`.
- `guestFeedback` deletes: denied from clients.
- `feedbackEvents`: append-only event records with no client read, update, or delete access.

Guest feedback writes do not invalidate public menu/OBP cache because feedback is private owner workflow data and does not change public menu, store, outlet, Official Business Page, or screen-display truth packets.

Feedback nudge storage diagnostics: the public menu inline feedback nudge uses browser-local sessionStorage only to avoid repeating the nudge in one tab session. Failed read/write paths log bounded `public_menu_feedback_nudge_storage_read_failed` / `public_menu_feedback_nudge_storage_write_failed` diagnostics only and add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

Review URL parse diagnostics are cost-neutral. Malformed configured review URLs still resolve to absent guest-facing review links, while `guest_feedback_review_url_parse_failed` logs bounded source/value-shape metadata with fixed `omit_review_url` fallback policy only. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache tags, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

Feedback QR download filename boundary is Firebase-cost neutral. Desktop Use MenuList and mobile Share now pass feedback QR filenames through `getQrCodeFilename(data.storeName)` before browser download instead of raw store-name whitespace replacement. This changes only the local filename string used by `downloadQrCode()`: no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, provider calls, cache invalidations, rules, indexes, Firebase deploy requirement, Vercel deploy action, or owner setting changes are added.

Feedback reply drafts are Firebase-cost neutral. `src/lib/feedback/feedbackReplyTemplates.ts` generates deterministic browser-local text from the already-loaded feedback record and optional store name. Desktop copy/WhatsApp handoff remains browser-local; mobile draft selection only fills the existing reply field. The only persistent change remains the existing `updateFeedbackStatus()` owner-note/status update after the owner saves.

---

## Indexes And Retention

`firestore.indexes.json` carries the `guestFeedback` composite indexes required for store-scoped newest-first, status, rating, and needs-attention queries. Keep these indexes aligned before widening owner filters.

`functions/src/analytics/guestFeedbackRetention.ts` deletes expired `guestFeedback` records in bounded batches. The task is wired through `functions/src/decisionBlocksScoring.ts` behind `ENABLE_GUEST_FEEDBACK_RETENTION`; any Cloud Function logic change still requires the scoped Firebase validation/deploy path from the production-readiness runbook.

---

## Cost Boundary

- One public feedback submission writes one `guestFeedback` document.
- The compact feedback event write is non-blocking and used for internal operational analytics only.
- Owner desktop/mobile list reads are tenant/store scoped and paginated.
- Owner counts are separate scoped reads and must stay acknowledgement-guarded before rendering.
- Status/reply updates are single-document writes after the client DAL verifies the shaped existing record.

Run `npm run verify:guest-feedback-boundary` after any rule, index, retention, DAL, or public submit change.
