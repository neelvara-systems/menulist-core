# Public Menu Entry - Implementation

July 28, 2026 persisted-identity correction: an authenticated draft claim revalidates transaction-current store tenant aliases and optional embedded store aliases as one exact identity before project/summary writes or public cache effects. Conflicting compatibility fields fail closed.

**Status:** Local source complete; external release evidence pending
**Last reviewed:** July 28, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. The client polls every 5 seconds for no more than 36 reads. Daily cleanup removes an expired claimed draft receipt without deleting its project-owned source. Approved app release and hosted evidence remain pending.

## Runtime map

| Surface | Authority |
| --- | --- |
| `src/app/(website)/create-menu/CreateMenuClient.tsx` | Auth-aware image/link chooser and source submission |
| `src/lib/public-menu-entry/publicDraftId.ts` | One canonical UUID projector for intake responses, polling, preview routing, and claim |
| `src/app/api/public/create-menu/route.ts` | Protected intake, dedupe, draft/job create, owner-bound polling |
| shared menu extraction worker | Authoritative draft/job binding, provider extraction, DTO writeback |
| `src/app/(website)/create-menu/PreviewClient.tsx` | Bounded abort-owned polling, normalized review state, single-flight claim form, session refresh |
| `src/lib/publicCreateMenu/previewDraftResponse.ts` | Browser response projector over canonical extracted-menu/profile contracts |
| `src/app/api/public/create-menu/claim/route.ts` | Protected idempotent claim transaction and post-commit effects |
| `src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx` | Safe URL actions, starter signals, dashboard handoff |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts` | Bounded expired draft/source cleanup |

## Intake and polling

`POST /api/public/create-menu` applies the 30-per-5-minute hashed-user admission limit before SAFE_MODE, body parsing, draft reads, Storage, link acquisition, or provider work. A complete existing account additionally passes current `USE_MENU_EXTRACTION`. Image magic bytes and link acquisition constraints remain authoritative. Active/same-source reuse occurs before the 5-per-24-hours new-source quota. The client uses an immediate ref-backed lock before optimization or fetch so rapid photo/drop/link events cannot enter duplicate submissions before React renders the disabled state. Request failures emit bounded source/size/type or link-presence diagnostics without source content.

The deterministic draft and `menuImageProcessingJobs` record are committed in one create-only batch. The worker verifies owner, source, destination, and lifecycle binding before provider work.

`GET /api/public/create-menu` is owner-bound, private/no-store, and has a fail-closed hashed user+draft 90-per-5-minute limiter. Intake responses, poll parameters, claim requests, and preview path segments all pass through `normalizePublicMenuDraftId()`; whitespace, path separators, malformed UUIDs, and unknown response values fail before navigation or document access. The server revalidates the temporary source against the configured bucket, exact draft path, MIME, size and token, then projects all detected/profile/source fields through the canonical browser-safe preview normalizer. The client requests status only every 5 seconds, increments before each request, stops after 36 reads, and fetches the full DTO only when completion is reported; it repeats the same projection before React state. Unknown status, malformed source/nested structures, unsafe color values, or a completed full response without a coherent menu produce the fixed load-failed state. The poll owns an `AbortController`, so cleanup or a changed draft/session/retry cycle prevents a late request from changing current state. Persisted extracted prices are normalized again; malformed price truth is projected as a fixed failed state.

## Claim transaction

The claim route validates its bounded request, complete account scope, optional phone, draft owner/TTL/status, canonical extracted DTO, price truth, and exact Storage source envelope.

For an existing account, the transaction reads the target store, tenant, current user, and compact project summary. It validates user identity/lifecycle/revocation and exact current tenant/store/role mapping, validates store/tenant lifecycle alignment, and evaluates `PUBLISH_MENU` against the locked current role and store roles. For a new account, it locks the current user and requires eligible empty-scope truth before using the existing starter onboarding transaction helpers and canonical business-type registry fallback.

Existing persisted public-presence/business-attribute maps are accepted only as plain records. Business type resolves through the canonical registry, category is string-only, and an invalid legacy subdomain falls back to the exact store identity before URL or receipt output. The request schema is strict and every protected response is private, no-store and nosniff.

**Target document-ID guard:** tenant, store, draft, and project references are built only from normalized/validated identities. The project includes explicit `projectId`, `slug`, and `deleted: false`. `resolvePublicMenuEntryProjectSlug()` blocks reserved slugs and collisions across current and previous slugs. Canonical price truth and optional Menu Correctness metadata are applied before `transaction.set(projectRef, projectData)`.

The same transaction writes the project, compact project summary, store defaults, account records when new, and the complete converted-claim receipt. A same-owner retry returns that receipt without duplicating tenant/store/project writes.

## Commit and handoff

After commit, `Promise.allSettled` refreshes `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, the affected Digital Screen content version and hashed token cache tag, and Owner Business Assistant packet state. A rejected effect is logged as bounded diagnostic evidence; committed success remains success.

The preview claim action uses an immediate ref-backed single-flight guard, waits at most 3 seconds for session refresh, clears that timeout when refresh settles early, and still advances. For a new account it writes a strict versioned 24-hour session handoff containing exact tenant, store, project and canonical subdomain identity; invalid acknowledgements or unavailable sessionStorage cannot interrupt the already-committed redirect. The success page admits that browser value only through the same exact DTO, checks tenant/store against the current session before any starter-signal DAL call, evicts malformed/expired or known cross-session state, and keys in-memory signal acknowledgement by exact tenant/store/signal. Query-string menu/official-page links are accepted only on the active MenuList platform root or an exact tenant subdomain before render, copy, or WhatsApp composition. Copy feedback owns one cleanup-safe timer; dashboard refresh owns and clears its bounded timer, rejects parallel clicks, and then performs one full `/use-menulist` navigation.

## Cleanup

The daily maintenance task queries up to 100 expired drafts regardless of whether new Public Menu Entry intake is enabled. Disabling a write/admission flag must not pause retention for already-persisted private drafts. For unclaimed sources it verifies the exact draft prefix, deletes the Storage object first, then deletes the document. A Storage failure preserves the document as retry state. For a claimed draft, it preserves the promoted source object and deletes only the expired draft receipt. This changes Function source and therefore requires the scoped MenuList QA Function deployment after local gates.

## No added architecture

No new collection, queue, listener, rule, or index is introduced. The older composite draft index remains available for rollback compatibility; the active expiry-only cleanup uses the automatic single-field index.
