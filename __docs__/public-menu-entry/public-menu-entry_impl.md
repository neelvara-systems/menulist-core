# Public Menu Entry - Implementation

July 28, 2026 persisted-identity correction: an authenticated draft claim revalidates transaction-current store tenant aliases and optional embedded store aliases as one exact identity before project/summary writes or public cache effects. Conflicting compatibility fields fail closed.

**Status:** Local source complete; external release evidence pending
**Last reviewed:** July 28, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The `/create-menu` page is public, but source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. The client polls every 5 seconds for no more than 36 reads. Daily cleanup removes an expired claimed draft receipt without deleting its project-owned source. Approved app release and hosted evidence remain pending.

## Runtime map

| Surface | Authority |
| --- | --- |
| `src/app/(website)/create-menu/CreateMenuClient.tsx` | Auth-aware image/link chooser and source submission |
| `src/lib/public-menu-entry/publicDraftId.ts` | One canonical UUID projector for intake responses, polling, preview routing, and claim |
| `src/app/api/public/create-menu/route.ts` | Protected intake, dedupe, draft/job create, owner-bound polling |
| shared menu extraction worker | Authoritative draft/job binding, provider extraction, DTO writeback |
| `src/app/(website)/create-menu/PreviewClient.tsx` | Bounded polling, review, claim form, session refresh |
| `src/app/api/public/create-menu/claim/route.ts` | Protected idempotent claim transaction and post-commit effects |
| `src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx` | Safe URL actions, starter signals, dashboard handoff |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts` | Bounded expired draft/source cleanup |

## Intake and polling

`POST /api/public/create-menu` applies the 30-per-5-minute hashed-user admission limit before SAFE_MODE, body parsing, draft reads, Storage, link acquisition, or provider work. A complete existing account additionally passes current `USE_MENU_EXTRACTION`. Image magic bytes and link acquisition constraints remain authoritative. Active/same-source reuse occurs before the 5-per-24-hours new-source quota. The client uses an immediate ref-backed lock before optimization or fetch so rapid photo/drop/link events cannot enter duplicate submissions before React renders the disabled state. Request failures emit bounded source/size/type or link-presence diagnostics without source content.

The deterministic draft and `menuImageProcessingJobs` record are committed in one create-only batch. The worker verifies owner, source, destination, and lifecycle binding before provider work.

`GET /api/public/create-menu` is owner-bound and has a fail-closed hashed user+draft 90-per-5-minute limiter. Intake responses, poll parameters, claim requests, and preview path segments all pass through `normalizePublicMenuDraftId()`; whitespace, path separators, malformed UUIDs, and unknown response values fail before navigation or document access. The client requests status only every 5 seconds, increments before each request, stops after 36 reads, and fetches the full DTO only when completion is reported. Persisted extracted prices are normalized again; malformed price truth is projected as a fixed failed state.

## Claim transaction

The claim route validates its bounded request, complete account scope, optional phone, draft owner/TTL/status, canonical extracted DTO, price truth, and exact Storage source envelope.

For an existing account, the transaction reads the target store, tenant, and compact project summary, validates lifecycle/tenant alignment, and reuses the store snapshot for current `PUBLISH_MENU` admission. For a new account, it uses the existing starter onboarding transaction helpers and canonical business-type registry fallback.

**Target document-ID guard:** tenant, store, draft, and project references are built only from normalized/validated identities. The project includes explicit `projectId`, `slug`, and `deleted: false`. `resolvePublicMenuEntryProjectSlug()` blocks reserved slugs and collisions across current and previous slugs. Canonical price truth and optional Menu Correctness metadata are applied before `transaction.set(projectRef, projectData)`.

The same transaction writes the project, compact project summary, store defaults, account records when new, and the complete converted-claim receipt. A same-owner retry returns that receipt without duplicating tenant/store/project writes.

## Commit and handoff

After commit, `Promise.allSettled` refreshes `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, the affected Digital Screen content version and hashed token cache tag, and Owner Business Assistant packet state. A rejected effect is logged as bounded diagnostic evidence; committed success remains success.

The preview waits at most 3 seconds for session refresh and still advances. For a new account it writes a strict versioned 24-hour session handoff containing exact tenant, store, project and canonical subdomain identity; invalid acknowledgements or unavailable sessionStorage cannot interrupt the already-committed redirect. The success page admits that browser value only through the same exact DTO, checks tenant/store against the current session before any starter-signal DAL call, evicts malformed/expired state, and repeats a bounded refresh before a full `/use-menulist` navigation.

## Cleanup

The daily maintenance task queries up to 100 expired drafts. For unclaimed sources it verifies the exact draft prefix, deletes the Storage object first, then deletes the document. A Storage failure preserves the document as retry state. For a claimed draft, it preserves the promoted source object and deletes only the expired draft receipt. This changes Function source and therefore requires the scoped MenuList QA Function deployment after local gates.

## No added architecture

No new collection, queue, listener, rule, or index is introduced. The older composite draft index remains available for rollback compatibility; the active expiry-only cleanup uses the automatic single-field index.
