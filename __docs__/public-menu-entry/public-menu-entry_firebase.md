# Public Menu Entry - Firebase and Scale

**Status:** Local source complete; scoped QA Function deployment pending
**Last reviewed:** August 7, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. Preview checks are 5 seconds apart and capped at 36 Firestore status reads before retry; completion can add one full-result read. An expired claimed draft document is deleted while the promoted source object is retained. Approved app release and target evidence remain pending.

## Data reused

- `publicMenuDrafts`: 24-hour owner-bound draft and claim receipt.
- `menuImageProcessingJobs`: existing deterministic extraction job.
- Firebase Storage `publicMenuDrafts/{draftId}/...`: one image or up to 15 browser-converted PDF page images until claim; after claim the project owns the same URLs.
- Existing `tenants`, `stores`, nested `projects`, `platformSummary`, user, referral, and starter-activation truth.

No new collection, rule, or Storage rule was added. The obsolete `claimed + expiresAt` cleanup composite was removed because cleanup now reads all expired drafts. Large draft-only maps (`extractedData`, `extractedBusinessProfile`, `sourceMetadata`, `sourceFiles`, and `growthAcquisition`) are exempt from automatic indexing; current dedupe and cleanup still use the existing scalar `createdByUId` and `expiresAt` indexes.

## Operation posture

| Stage | Bounded Firebase work |
| --- | --- |
| Burst admission | Upstash only; fail closed before Firebase work. |
| Existing-account intake permission | Current store permission admission; one existing store read where the shared permission helper requires it. |
| Active/same-source reuse | Bounded owner draft query; no write/Storage/provider work when reused. |
| New image source | One Storage write plus two Firestore create writes in one draft/job batch; shared worker lifecycle remains existing. |
| New PDF source | One Storage write per converted page, capped at 15, plus the same two Firestore create writes in one draft/job batch. No raw PDF Storage write. |
| Poll | One draft document read per request; 5 seconds, maximum 36 status reads, then owner retry. Completion performs at most one additional full-result read. Backend limit is 90 per 5 minutes and fails closed on limiter outage. |
| Existing-account claim | Transaction reads draft, store, tenant, and compact project summary; current publish permission reuses the read store snapshot. Writes project, summary, applicable store defaults, and claim receipt. |
| New-account claim | Existing starter onboarding transaction reads/writes plus project, summary, and receipt. |
| Idempotent claim retry | Draft receipt read and no duplicate tenant/store/project mutation. |
| Post-commit effects | Cache invalidation and existing Digital Screens/assistant invalidation; failures do not repeat the transaction. |
| Daily cleanup | At most 100 expired drafts, independent of the intake feature flag; every unclaimed source delete then draft delete, or claimed receipt delete while all project-owned sources are preserved. |

Public create-menu claim target document-ID boundary hardening is Firebase-cost neutral. The slug, explicit project identity, price validation, phone validation, canonical business type, and in-transaction Menu Correctness stamp are CPU/transaction-shaping boundaries and add no new read or write.

The browser preview projector and request-lifecycle guards add no Firebase operation. Canonical response normalization occurs after the existing bounded HTTP read; an aborted status request does not schedule another poll or mutate current state. The immediate claim single-flight guard prevents duplicate browser POSTs, while the route's transaction receipt remains the durable idempotency authority.

The server polling projector also adds no Firebase operation: it validates the
already-read draft source envelope against configured Storage identity and
normalizes the response in memory. Provider-outage responses omit quota/reset
headers; real exhaustion retains them. All authenticated intake and poll
responses are explicitly private/no-store/nosniff.

The browser last-claim handoff is session-only and adds no Firebase operation. Its strict versioned DTO contains exact tenant/store/project identity, canonical subdomain and a 24-hour timestamp. The success page compares tenant/store against the current session before the existing `recordStarterActivationSignal` call, evicts a known mismatch, and keys browser acknowledgement by exact tenant/store/signal; that DAL still independently rechecks the active session store before its one acknowledged store update. Invalid or cross-session state creates no write. Success query URLs are browser-output-only and now require the active MenuList platform root or exact tenant subdomain; this adds no read, write, delete, Storage, Function, rule, index, cache, or deployment effect.

## Scale decisions

- Cheap burst admission prevents 10MB parsing, Firestore dedupe queries, Storage, acquisition, and provider work during abuse or limiter outage.
- The daily quota runs after reusable-source proof, so valid retries do not consume new-source capacity.
- Polling is finite and below the backend limiter; no snapshot listener is needed for a short-lived funnel.
- Existing claim permission reuses the store transaction read and adds one exact current-user transaction read so stale role, scope, lifecycle or revocation state cannot authorize a write. New-account claim likewise adds one exact current-user transaction read before tenant/store allocation.
- The compact project summary provides collision/default handling without scanning nested projects.
- Cleanup is capped at 100 and retry-safe. If backlog growth is observed, adjust the existing scheduler batch/cadence with metrics; do not add a queue pre-emptively.
- Claimed source retention is necessary because the created project references every validated source URL. Only the duplicate receipt document expires.
- PDF conversion moves CPU work to the browser. Firebase cost grows only with the bounded number of page-image Storage writes/deletes; Firestore read/write counts do not increase with page count.
- Draft extraction/profile/source/attribution payloads are never filtered or ordered by current runtime code, so their index fanout does not grow with extracted menu size.

## Deployment boundary

The multi-source binding changes `processMenuImagesJob`, and multi-source retention changes `menulistMaintenanceScheduler`. The required QA targets are those two Functions plus `firestore:indexes` for the `sourceFiles` exemption. No Firestore rule or Storage-rule deploy applies. Production Functions and all Vercel deployment remain pending unless separately approved.
