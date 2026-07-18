# Public Menu Entry - Firebase and Scale

**Status:** Local source complete; scoped QA Function deployment pending
**Last reviewed:** July 17, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The `/create-menu` page is public, but source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. Preview checks are 5 seconds apart and capped at 36 Firestore status reads before retry; completion can add one full-result read. An expired claimed draft document is deleted while the promoted source object is retained. Approved app release and target evidence remain pending.

## Data reused

- `publicMenuDrafts`: 24-hour owner-bound draft and claim receipt.
- `menuImageProcessingJobs`: existing deterministic extraction job.
- Firebase Storage `publicMenuDrafts/{draftId}/...`: source until claim; after claim the project owns the same URL.
- Existing `tenants`, `stores`, nested `projects`, `platformSummary`, user, referral, and starter-activation truth.

No new collection, rule, or Storage rule was added. The obsolete `claimed + expiresAt` cleanup composite was removed because cleanup now reads all expired drafts. Large draft-only maps (`extractedData`, `extractedBusinessProfile`, `sourceMetadata`, and `growthAcquisition`) are exempt from automatic indexing; current dedupe and cleanup still use the existing scalar `createdByUId` and `expiresAt` indexes.

## Operation posture

| Stage | Bounded Firebase work |
| --- | --- |
| Burst admission | Upstash only; fail closed before Firebase work. |
| Existing-account intake permission | Current store permission admission; one existing store read where the shared permission helper requires it. |
| Active/same-source reuse | Bounded owner draft query; no write/Storage/provider work when reused. |
| New source | One Storage write plus two Firestore create writes in one draft/job batch; shared worker lifecycle remains existing. |
| Poll | One draft document read per request; 5 seconds, maximum 36 status reads, then owner retry. Completion performs at most one additional full-result read. Backend limit is 90 per 5 minutes and fails closed on limiter outage. |
| Existing-account claim | Transaction reads draft, store, tenant, and compact project summary; current publish permission reuses the read store snapshot. Writes project, summary, applicable store defaults, and claim receipt. |
| New-account claim | Existing starter onboarding transaction reads/writes plus project, summary, and receipt. |
| Idempotent claim retry | Draft receipt read and no duplicate tenant/store/project mutation. |
| Post-commit effects | Cache invalidation and existing Digital Screens/assistant invalidation; failures do not repeat the transaction. |
| Daily cleanup | At most 100 expired drafts; unclaimed file delete then draft delete, or claimed receipt delete while source is preserved. |

Public create-menu claim target document-ID boundary hardening is Firebase-cost neutral. The slug, explicit project identity, price validation, phone validation, canonical business type, and in-transaction Menu Correctness stamp are CPU/transaction-shaping boundaries and add no new read or write.

## Scale decisions

- Cheap burst admission prevents 10MB parsing, Firestore dedupe queries, Storage, acquisition, and provider work during abuse or limiter outage.
- The daily quota runs after reusable-source proof, so valid retries do not consume new-source capacity.
- Polling is finite and below the backend limiter; no snapshot listener is needed for a short-lived funnel.
- Existing claim permission reuses the store transaction read instead of adding another Firestore read.
- The compact project summary provides collision/default handling without scanning nested projects.
- Cleanup is capped at 100 and retry-safe. If backlog growth is observed, adjust the existing scheduler batch/cadence with metrics; do not add a queue pre-emptively.
- Claimed source retention is necessary because the created project references that URL. Only the duplicate receipt document expires.
- Draft extraction/profile/source/attribution payloads are never filtered or ordered by current runtime code, so their index fanout does not grow with extracted menu size.

## Deployment boundary

The cleanup query changed from unclaimed-only to all expired drafts, so `functions/src/schedulers/menulistMaintenanceScheduler.ts` changed. Functions build/lint/preflight passed. The required Function command `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa` completed predeploy lint/build but Cloud Resource Manager returned `HTTP Error: 403, The caller does not have permission`; IAM/project access is owner-controlled and the QA deploy remains pending. The July 17 index cleanup also requires the scoped `firebase deploy --only firestore:indexes --project menulist-qa --config firebase.json --non-interactive` release step. No Firestore rule or Storage-rule deploy applies. Production Functions and all Vercel deployment remain pending unless separately approved.
