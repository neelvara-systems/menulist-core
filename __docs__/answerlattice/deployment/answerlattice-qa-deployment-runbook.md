# Answerlattice QA Deployment Runbook

> Last updated: 2026-07-20
> Environment: QA / staging
> Firebase project: `answerlattice-qa`
> Local dev URL: `http://localhost:3000/__answerlattice/`
> Product staging domain: `answerlattice.menulist.online`
> Product production domain: `answerlattice.com`

This runbook records the Answerlattice QA infrastructure setup and the repeatable production checklist. Do not store service account private keys, cron secrets, API keys, OAuth client secrets, or SMTP secrets in this document.

## Current QA State

Answerlattice is running as a separate product inside the shared Next.js/Vercel codebase.

| Area | QA value |
| --- | --- |
| Answerlattice Firebase mode | `separate` |
| Firebase project | `answerlattice-qa` |
| Firestore database | `(default)` |
| Firestore location | `nam5` |
| App Engine region | `us-central` |
| Cloud Functions region | `us-central1` |
| Cloud Functions codebase | `answerlattice` |
| Cloud Functions source | `functions-answerlattice/` |
| Firestore rules file | `firestore-answerlattice.rules` |
| Firestore indexes file | `firestore-answerlattice.indexes.json` |
| Storage rules file | `storage-answerlattice.rules` |
| Firebase CLI config | `firebase-answerlattice.json` |

QA Auth, Firestore, Storage, Functions, Eventarc, Cloud Tasks, Cloud Scheduler, Artifact Registry, Secret Manager, Pub/Sub, Cloud Run, and App Engine are enabled.

## Environment Target Matrix

| Environment | MenuList URL | MenuList Firebase | Answerlattice URL | Answerlattice Firebase |
| --- | --- | --- | --- | --- |
| Local development | `http://localhost:3000/` | `menulist-qa` | `http://localhost:3000/__answerlattice/` | `answerlattice-qa` |
| Vercel Preview / QA | `https://menulist.online` | `menulist-qa` | `https://answerlattice.menulist.online` | `answerlattice-qa` |
| Vercel Production | `https://menulist.ai` | `menulist` | `https://answerlattice.com` | `answerlattice` |

The code-level contract lives in `src/constants/deploymentTargets.ts`; `npm run verify:env-targets` checks the matrix, Firebase aliases, and Answerlattice deploy scripts.

## 2026-05-24 Optional Expansion Hardening

Current implementation:

- Workflow integrations are production-scoped to Slack and email self-service setup. Linear/GitHub adapters remain controlled rollout until per-tenant secret handling is self-service safe.
- Integration events, delivery logs, and delivery rate counters include `expiresAt` and must have Firestore TTL enabled:
  - `answerlattice_integrationEvents.expiresAt`
  - `answerlattice_integrationDeliveryLogs.expiresAt`
  - `answerlattice_integrationRateLimits.expiresAt`
- The settings API reads compact `platformSummary/integrationHealth_{tId}_{sId}` instead of raw delivery logs.
- Nightly workflow events are digest-first: at most one nightly summary plus critical coverage / repeated AI failure alerts per active tenant by default.
- Predictive support is widget-config gated. The widget only calls `/api/answerlattice/predictive-help` when `capabilities.predictiveSupport` is true.
- Predictive trigger summaries store resolved suggestion snippets and `sourceHash`; unchanged summaries skip writes.
- Graph summaries store `sourceHash`; unchanged graph rebuilds skip writes.
- Support Board nightly sync is part of `answerlatticeNightly` but disabled by default. When enabled for a rollout tenant, it creates only deduped support-review cards for repeated misses, negative feedback/escalation clusters, drifted answers, and release impact. It writes `platformSummary/supportBoardSummary_{tId}_{sId}` only when the compact summary changes.

Deployment checklist for this pass:

```bash
npm --prefix functions-answerlattice run build
firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json
firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json
```

QA note: the 2026-05-24 Firebase CLI index deploy compiled rules but stopped on an existing `kb_articles` index conflict. Do not use `--force` unless the live index set has been audited, because that can delete indexes that are present in the project but missing from the local file. The TTL fields for this pass were enabled directly with targeted Firestore TTL commands:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=answerlattice_integrationEvents --database='(default)' --project=answerlattice-qa --enable-ttl --async
gcloud firestore fields ttls update expiresAt --collection-group=answerlattice_integrationDeliveryLogs --database='(default)' --project=answerlattice-qa --enable-ttl --async
gcloud firestore fields ttls update expiresAt --collection-group=answerlattice_integrationRateLimits --database='(default)' --project=answerlattice-qa --enable-ttl --async
```

Verify the TTL state:

```bash
gcloud firestore fields ttls list --collection-group=answerlattice_integrationEvents --database='(default)' --project=answerlattice-qa
gcloud firestore fields ttls list --collection-group=answerlattice_integrationDeliveryLogs --database='(default)' --project=answerlattice-qa
gcloud firestore fields ttls list --collection-group=answerlattice_integrationRateLimits --database='(default)' --project=answerlattice-qa
```

QA verification after the targeted TTL update showed all three TTL fields in `ACTIVE` state.

Production must repeat the same TTL setup in the production Answerlattice Firebase project after rules/indexes/functions are deployed there.

## 2026-05-21 Product-Separation Verification

Current implementation:

- Answerlattice dashboard routes resolve Answerlattice scope from `productAccounts.AL` on the shared NextAuth profile, or from the Answerlattice `users` document when running in `ANSWERLATTICE_FIREBASE_MODE=separate`.
- Answerlattice onboarding writes tenant, store, user, subscription, widget key, and summaries to the Answerlattice Firebase project, then writes only the `productAccounts.AL` bridge back to the default auth user document.
- Answerlattice widget config/key APIs use Answerlattice Firestore in separate mode.
- Public widget runtime keys validate only against Answerlattice `answerlatticeWidgetApi` for widget routes.
- The Next.js Answerlattice deployment has a unique server-only `ANSWERLATTICE_WIDGET_RUNTIME_SECRET` with at least 32 random characters. It signs the short-lived host-to-iframe authorization and is never exposed as a public env variable or Firebase document.
- Answerlattice AI operation logs write to `answerlattice_aiOperations` in the Answerlattice Firebase project.
- MenuList owner navigation does not expose Answerlattice management by default. MenuList can mount Answerlattice only as an env-configured external-client widget through the generic public script and a real `al_` widget key.

Verification performed:

- Created an Answerlattice QA test user in default Auth for the NextAuth bridge and in Answerlattice Auth for Answerlattice Firebase claims.
- Created Answerlattice tenant/store/user data under `answerlattice-qa`.
- Created, queried, updated, and messaged a support ticket under Answerlattice Firestore.
- Created and updated a changelog page under Answerlattice Firestore.
- Confirmed the same ticket and changelog documents were not present in the default MenuList Firebase project.
- Called `/api/widget/config` with a real `al_*` Answerlattice widget key and received remote config with route blocklist values.
- Deployed `firestore-answerlattice.rules` to `answerlattice-qa` after allowing tenant write roles to manage their own changelog documents. `answerlattice_aiOperations` direct Firestore reads are platform-only; tenant billing usage reads must go through the sanitized `/api/answerlattice/ai-operations` route.

Local route verification:

- `Host: answerlattice.menulist.online` + `/` rewrites to `/sites/answerlattice`.
- `Host: answerlattice.menulist.online` + `/dashboard` rewrites to `/answerlattice/dashboard`.
- `Host: menulist.online` + `/dashboard` stays in the MenuList owner app.
- `/__answerlattice` still renders the Answerlattice site directly for local/dev checks.

## 2026-06-20 AI Accounting Deploy Attempt

Local validation passed for Answerlattice AI operation accounting, token tracking, server-side manual draft/entity extraction, Cloud Function accounting, and platform-only raw AI operation reads:

- `npx tsc --noEmit --incremental false`
- `npm run build` from `functions-answerlattice/`
- `git diff --check`

Deploy was attempted with Firebase CLI under Node `20.20.2` because the local default Node `18.18.2` is below the Firebase CLI requirement.

- `firebase deploy --only functions:answerlattice,firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`
  - Predeploy functions build passed.
  - Blocked at Firestore rules validation: `Request to https://firebaserules.googleapis.com/v1/projects/answerlattice-qa:test had HTTP Error: 403, The caller does not have permission`.
- `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`
  - Predeploy functions build passed.
  - Blocked at project lookup: `Request to https://cloudresourcemanager.googleapis.com/v1/projects/answerlattice-qa had HTTP Error: 403, The caller does not have permission`.

## 2026-05-21 Full-Flow QA Pass

Disposable QA account tested:

- Created a default Firebase Auth user and default auth `users/{uid}` record.
- Called the real `/api/answerlattice/onboard` route, which executed the Answerlattice onboarding transaction and created Answerlattice tenant, store, user, subscription, widget key, and summary docs in `answerlattice-qa`.
- Verified immediate post-onboarding session bridge returns nested `productAccounts.AL`.
- Called `/api/auth/set-claims` with `productId: 'AL'` and verified Answerlattice custom token claims use `pId: 'AL'`, the Answerlattice tenant ID, and the Answerlattice store ID.
- 2026-06-11: Hardened `/api/auth/set-claims` so platform/support fallback claims use the scoped `productAccounts.AL` tenant/store instead of the default MenuList store, and separate Answerlattice Firebase Auth token failures return a controlled service-unavailable response. Local unauthenticated POST still returns the expected `401 Unauthorized`; authenticated token minting still requires valid Answerlattice Firebase project credentials.
- Signed into the Answerlattice Firebase client SDK with the returned Answerlattice custom token and exercised Firestore rules directly.

API/runtime flows tested:

- `GET /api/answerlattice/widget-config`
- `PUT /api/answerlattice/widget-config`
- `POST /api/answerlattice/widget-key`
- `GET /api/widget/config`
- widget runtime ETag `304`
- widget runtime origin denial `403`
- `POST /api/widget/search` validation path without AI generation
- `POST /api/widget/feedback` with a seeded `aiSearchHistory` record
- Answerlattice public API feature gate `404`
- Answerlattice translation feature gate `403`
- `POST /api/answerlattice/tenant-summary`

Firestore client-rule flows tested in dedicated/shared emulators:

- Tenant-scoped support, KB, chat, feedback, signal, surface, FAQ, and review workflows are allowed only with their required permissions.
- Canonical answers, release activation, entity indexes, intake summaries, coverage/trust/friction, graph/context summaries, and operational logs are server-owned.
- Client-writable `platformSummary` documents are limited to branding, predictive-trigger cache, and compiled-context freshness; document IDs must match payload `tId/sId`.
- Audit-log creates are limited to non-reserved owner actions; authoritative governance audit actions are server-owned.
- Cross-tenant/cross-store access and ownership mutation are rejected.

Local route flows tested:

- `/__answerlattice`
- `/__answerlattice/dashboard`
- `/__answerlattice/widget`
- `/__answerlattice/tickets`
- `/__answerlattice/changelog`
- `/__answerlattice/settings`
- `/dashboard` remains MenuList.

Cleanup performed:

- Transient test documents were deleted where safe.
- Disposable Answerlattice tenant/store/user were marked inactive/deleted.
- Disposable default auth user was marked inactive/deleted and disabled in Firebase Auth.

Fix found during this pass:

- The auth session context cache could briefly serve a pre-onboarding user after the onboarding transaction. `getAuthSessionUserContext()` now bypasses cached users that still have no tenant/store so the immediate post-onboarding session can see `productAccounts.AL`.
- A QA harness initially attempted to update `answerlattice_auditLogs`, but audit logs are append-only by design. The final client-rule test was rerun using the intended create/read-only audit-log contract and passed.

## 2026-05-21 Client-Product Separation Cleanup

The temporary client-product-specific widget host and changelog connector have been removed from runtime code. Answerlattice remains available through its own routes/domains, while client products integrate the widget only by embedding the generic public script with a real Answerlattice-issued `answerlatticeWidgetApi` key from their own codebase. MenuList follows that same model through `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY`; no key is committed and no test-host flag is used.

Follow-up verification for this cleanup:

- `/dashboard` remains the MenuList owner app and should not expose Answerlattice management. An Answerlattice widget launcher appears there only if the MenuList client widget key environment variable is configured.
- Answerlattice dashboard routes remain available through `/__answerlattice/*` locally and Answerlattice host rewrites in QA.
- Widget runtime endpoints continue to accept only normal `answerlatticeWidgetApi` keys.

## 2026-05-20 Verification Log

Code and config validation:

- `npx tsc --noEmit --incremental false` passed.
- `npm --prefix functions-answerlattice run build` passed.
- `git diff --check` passed.
- `firestore-answerlattice.indexes.json` parses with 37 indexes and 0 field overrides.

QA deploy verification:

- Firestore rules deployed and compiled.
- Storage rules deployed and compiled.
- Answerlattice functions deployed successfully to `answerlattice-qa`.
- Live composite index count is 37.
- Support-ticket indexes are `READY`:
  - `deleted ASC, createdOn DESC`
  - `tId ASC, sId ASC, deleted ASC, createdOn DESC`
- Manual scheduler smoke test returned `status: "skipped"`, `enabled: false`, and wrote `answerlattice_schedulerRunLogs/{runLogId}` with `product: "answerlattice"`, `trigger: "manual"`, and `phase: "completed"`.

Local Chrome smoke test:

- `http://localhost:3000/__answerlattice` rendered the Answerlattice marketing home.
- `http://localhost:3000/answerlattice/dashboard` rendered the Answerlattice dashboard.
- `http://localhost:3000/answerlattice/widget` rendered the widget management route.
- `http://localhost:3000/answerlattice/settings` rendered the Answerlattice settings route.
- `http://localhost:3000/answerlattice/knowledge-base` rendered the Answerlattice knowledge-base route.
- `http://localhost:3000/answerlattice/tickets` rendered without the previous ticket realtime-sync warning after the support-ticket indexes became ready.

## Deployed QA Resources

Firestore rules and indexes:

- `firestore-answerlattice.rules` deployed to `answerlattice-qa`.
- `firestore-answerlattice.indexes.json` deployed to `answerlattice-qa`.
- Current index file has composite indexes plus TTL field overrides for Answerlattice integration events, delivery logs, and delivery rate counters.
- 2026-05-26: Deployed `firestore-answerlattice.rules` to `answerlattice-qa` after adding Answerlattice role permission claims for staff access control. Command: `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive`.
- 2026-05-26: Deployed `firestore-answerlattice.rules` after adding private Support Board rules. The combined Firebase indexes deploy hit a pre-existing remote `kb_articles` index conflict, so the two new `answerlattice_supportBoardCards` composite indexes were created directly with `gcloud firestore indexes composite create`; both are `READY` in `answerlattice-qa`.
- 2026-05-26: Production Firestore rules deploy for the Support Board was attempted with `firebase deploy --only firestore:rules --project answerlattice-prod --config firebase-answerlattice.json --non-interactive` and was blocked by Firebase permission `403` on project `answerlattice`. Production still needs the same rules deploy, Support Board / `aiSearchHistory` composite indexes, and updated Answerlattice functions deploy after credentials are available.
- 2026-05-27: Deployed `firestore-answerlattice.rules` to `answerlattice-qa` after adding `supportBoardSummary_*` read access for support-control users. The new `aiSearchHistory` composite index (`tId asc, sId asc, canonical asc, createdOn desc`) was created directly with `gcloud firestore indexes composite create` and verified `READY`. Deployed the existing Answerlattice functions codebase to `answerlattice-qa` after adding Support Board nightly sync to `answerlatticeNightly`.
- 2026-05-27: Production Firestore rules deploy was retried with `firebase deploy --only firestore:rules --project answerlattice-prod --config firebase-answerlattice.json --non-interactive` and remains blocked by Firebase permission `403` on project `answerlattice`.
- 2026-05-27: Deployed Answerlattice functions to `answerlattice-qa` after gating Support Board source/nightly sync and adding card status history. Production functions deploy was attempted with `firebase deploy --only functions --project answerlattice-prod --config firebase-answerlattice.json --non-interactive` and remains blocked by Firebase permission `403` on project `answerlattice`.
- 2026-05-31: Deployed `firestore-answerlattice.rules` to `answerlattice-qa` after adding self-scoped feedback create/read rules and feedback signal create allowance. Deployed Answerlattice functions to `answerlattice-qa` after excluding `entityId="unresolved"` from mutation clustering. The combined indexes deploy still hit the pre-existing remote `kb_articles` conflict, so the two `feedback` composite indexes were created/verified through `gcloud firestore indexes composite create`: `tId asc, sId asc, createdOn desc` and `sId asc, tId asc, uId asc, createdOn desc`.
- 2026-06-06: Repeated Reply Import entity autocomplete added the `answerlattice_entitySearchIndex` prefix-token composite index (`tId asc`, `sId asc`, `prefixTokens contains`) and updated existing Answerlattice onboarding-bootstrap function logic to write `prefixTokens`. Validation passed locally, but deploy was blocked for the active account. `firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed during Firebase Rules API preflight with `403 The caller does not have permission`; direct `gcloud firestore indexes composite create --project=answerlattice-qa ... prefixTokens,array-config=contains` failed with `PERMISSION_DENIED`; `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-11: Added the `aiSearchHistory` cache lookup index (`cacheKey asc`, `tId asc`, `sId asc`, `createdOn desc`) and changed cache reads to newest-first `limit(1)`. Local JSON validation passed, but deploy is blocked for the active account. `firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed at Firebase Rules API preflight with `403 The caller does not have permission`; direct `gcloud firestore indexes composite create --project=answerlattice-qa ... cacheKey/tId/sId/createdOn` failed with `PERMISSION_DENIED` / `CONSUMER_INVALID` for `tech.menulist-qa@gmail.com`.
- 2026-06-11: Public compiled bundle proxy responses now include public CORS handling and return a no-store `503 Bundle unavailable` when Answerlattice Storage Admin credentials/access fail. Local unauthenticated API sweep confirmed this path is service-unavailable while the local Storage credential reports `invalid_grant: account not found`.
- 2026-06-11: Widget/public API hardening added the `aiSearchHistory` cache lookup index (`cacheKey asc`, `tId asc`, `sId asc`, `createdOn desc`). Local JSON validation, TypeScript, and targeted lint passed, but deploy is blocked for the active account. `firebase deploy --only firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed during Firebase Rules API preflight with `403 The caller does not have permission`; direct `gcloud firestore indexes composite create --project=answerlattice-qa --database='(default)' --collection-group=aiSearchHistory --query-scope=COLLECTION --field-config=field-path=cacheKey,order=ascending --field-config=field-path=tId,order=ascending --field-config=field-path=sId,order=ascending --field-config=field-path=createdOn,order=descending --quiet` failed with `PERMISSION_DENIED` for active account `tech.menulist-qa@gmail.com`.
- 2026-06-16: Added separate Firebase content-reaction rules for `article_feedback/{tId}/{sId}/{docId}` and `changelog_feedback/{tId}/{sId}/{docId}`. Local rules compile passed during a default-project deploy, but the correct Answerlattice QA deploy remains blocked for the active account. `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed during Firebase Rules API preflight with `403 The caller does not have permission`.
- 2026-07-11: Added exact `feedback` create-shape admission and field-confined Product Surface updates. `npm run test:answerlattice-feedback:rules` passed locally, and the complete local readiness gate passed 102/102 checks across 98 child verifiers. The required Node 22 rules-only command `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` again failed during the Firebase Rules API test request with HTTP 403 `The caller does not have permission`; no rules were uploaded.
- 2026-07-19: Feature 30 billing hardening added exact Answerlattice billing read permissions, server-only tenant top-up visibility, product-scoped browser queries, and `pId + event + storeId + tenantId + created_at desc` billing-history indexes in dedicated and shared Firebase configurations. Pure contracts, dedicated/shared rule emulators, TypeScript, lint, and source verifiers passed. Both `firebase deploy --only firestore:rules,firestore:indexes --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and the corresponding `menulist-qa` shared-config command stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule or index revision changed.
- 2026-07-19: Feature 32 Weekly Digest and founder-guidance hardening added deterministic completed-week preparation inside `answerlatticeNightly`, strict source-completeness/freshness contracts, and exact readiness-authorized weekly insight reads in dedicated and shared rules. Founder Daily Brief and Owner Support Assistant remain six-summary, provider-free, and read-only. Contracts, scheduler emulator, dedicated/shared chat-analytics rule emulators, Functions build, TypeScript, lint, docs, dependency freeze, and broad source gates passed locally. The dedicated `answerlattice-qa` rules command, shared `menulist-qa` rules command, and `functions:answerlatticeNightly` command all stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule or Function revision changed.
- 2026-07-20: Feature 37 Support Truth Export hardening reserved `support_truth_export_generated` as a server-only audit action in dedicated and shared Firestore rules. Export contracts, both governance-rules emulators, Answerlattice and root TypeScript, focused lint, runtime truth, documentation links, dependency freeze, and diff integrity passed locally. Both `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed.
- 2026-07-20: Feature 39 Advanced White Label hardening confined the default-off feature to a strict private workspace branding profile, removed arbitrary CSS/font fields, and added exact nested/root validation to dedicated and shared Firestore rules. Focused contracts, both platform-summary rule emulators, Answerlattice and root TypeScript, focused lint, runtime truth, documentation links, dependency freeze, and diff integrity passed locally. Both `firebase deploy --only firestore:rules --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule revision changed.
- 2026-07-20: The final 44-feature/C1-C8 audit passed the complete Answerlattice runtime/emulator aggregate, final readiness, dependency/security, recovery, founder-control, strict TypeScript, Functions, and web SDK gates. It also repaired missing `safePayloadRatio` imports in the Slack/email adapters without restoring removed confidence output. `firebase deploy --only firestore:rules,functions:answerlatticeNightly,functions:processIntegrationEvent --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` and `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` both stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote rule or Function revision changed.
- 2026-07-20: Scheduler source-window cost telemetry added bounded per-task/per-tenant logical source-operation observations to the existing nightly run-log write and a platform-only monitor projection. Focused telemetry, chat-scheduler, Knowledge Intake summary emulator, complete runtime/emulator, final-readiness, strict TypeScript, lint, dependency-freeze, Functions-build, and diff-integrity gates passed locally. `firebase deploy --only functions:answerlattice:answerlatticeNightly,functions:answerlattice:triggerAnswerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` stopped before upload with `Error: Failed to authenticate, have you run firebase login?`; no remote Function revision changed.
- 2026-07-11: Extended the same rules target with exact `article_feedback`/`changelog_feedback` actor-item create admission, append-only updates and immutable capped history after coupling source counters and audit items in one transaction. The focused emulator and final 102/102 local readiness gate passed. The required updated-rules command was attempted once more and returned the same Firebase Rules API HTTP 403 before upload; no QA rule revision changed, and the unchanged command must not be retried until IAM changes.
- 2026-07-11: Moved canonical-answer publication, proposal decisions, drift state and entity merges behind the authenticated Answerlattice governance route, and made drifted or review-required retrieval fail closed before FAQ or RAG. Root TypeScript, focused contract suites, runtime-truth verifier, targeted lint, documentation links, diff integrity, separate-project rules emulation and shared-mode rules emulation passed locally. Demo, Trust, Pricing and USD Growth onboarding returned HTTP 200 from the local product route, and the unauthenticated governance action returned HTTP 401. The required rules-only QA command was attempted once on Node 20.20.2 with Firebase CLI 14.15.1 and failed during the Firebase Rules API test request with HTTP 403 `The caller does not have permission`; no QA rules were uploaded. Retry only after the active account receives the required Firebase Rules permission.
- 2026-07-11: The Aidbase competitor-response cross-check strengthened strict plan/role/state canonical eligibility, governed fallback stops, canonical-aware cache freshness, monthly paid onboarding and checkout URL admission, retry idempotency, public mobile proof, and the separate KB publish/embed lifecycle. Root TypeScript, targeted lint, Answerlattice runtime truth, Functions build, both governance rules emulators, docs links, dependency freeze, and 390px/1280px browser QA passed locally. The scoped QA Functions command targeting `functions:answerlattice:startGeneration`, `retryGeneration`, `finalizePublish`, `embedArticleWorker`, `regenerateEmbedding`, and `publishApprovedJobFn` completed its predeploy build, then Cloud Resource Manager returned HTTP 403 `The caller does not have permission` for `answerlattice-qa` before upload. No Function changed in QA; do not retry until IAM changes.
- 2026-06-20: Added Answerlattice AI operation/token accounting for app routes and Cloud Functions. Local root TypeScript, functions build, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` first required loading Node 20.20.2 for Firebase CLI 14, then failed at Cloud Resource Manager with `403 The caller does not have permission` for project `answerlattice-qa`.
- 2026-06-20: Forensic audit hardening added store-scoped `chatSessions` composite indexes and removed raw approved-job payload logging from the Answerlattice publish callable. Local root TypeScript, lint, app build, functions build, Answerlattice runtime verifier, and diff check passed. `firebase deploy --only firestore:indexes,functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed during Firestore Rules API preflight with `403 The caller does not have permission`; retrying `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` failed at Cloud Resource Manager with the same permission blocker.
- 2026-06-28: KB callable diagnostic hardening bounded server-side failures for `regenerateEmbedding` and `publishApprovedJobFn` in both shared/local Functions and `functions-answerlattice/`. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions run build`, `npm --prefix functions-answerlattice run build`, `npm --prefix functions run lint`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:regenerateEmbedding,functions:publishApprovedJobFn --project menulist-qa --non-interactive` passed predeploy lint/build and failed at Cloud Resource Manager with `403 The caller does not have permission`; `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with the same permission blocker.
- 2026-06-28: KB worker/finalizer diagnostic hardening bounded `embedArticleWorker` and publish-finalizer failures in shared/local Functions and `functions-answerlattice/`. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions run build`, `npm --prefix functions-answerlattice run build`, `npm --prefix functions run lint`, root `npx tsc --noEmit --incremental false --pretty false`, targeted raw-pattern scan, and diff check passed. `firebase deploy --only functions:embedArticleWorker,functions:finalizePublish --project menulist-qa --non-interactive` passed predeploy lint/build and failed at Cloud Resource Manager with `403 The caller does not have permission`; `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with the same permission blocker.
- 2026-06-28: Shared KB trigger-wrapper diagnostic hardening bounded production and dev wrapper logs for KB generation/finalization. Local `npm run verify:answerlattice-runtime-truth`, `npm run verify:menu-extraction-pipeline`, `npm --prefix functions run build`, `npm --prefix functions-answerlattice run build`, `npm --prefix functions run lint`, root `npx tsc --noEmit --incremental false --pretty false`, targeted raw-pattern scan, and diff check passed. `firebase deploy --only functions:startGeneration,functions:finalizePublish,functions:processMenuImagesJob --project menulist-qa --non-interactive` passed predeploy lint/build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: KB generation/helper diagnostic hardening bounded shared `startGeneration`, shared/separate KB AI helpers, and shared/separate KB entrypoint wrapper logs. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions run build`, `npm --prefix functions-answerlattice run build`, `npm --prefix functions run lint`, root `npx tsc --noEmit --incremental false --pretty false`, targeted raw-pattern scan, and diff check passed. `firebase deploy --only functions:startGeneration,functions:embedArticleWorker,functions:regenerateEmbedding --project menulist-qa --non-interactive` passed predeploy lint/build and failed at Cloud Resource Manager with `403 The caller does not have permission`; `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with the same permission blocker.
- 2026-06-28: Answerlattice Functions entrypoint diagnostic hardening bounded manual scheduler unauthorized/invalid-scope diagnostics and `processIntegrationEvent` event-ID breadcrumbs. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice workflow event processor diagnostic hardening bounded invalid-event, delivery-attempt, and no-enabled-adapter breadcrumbs while preserving delivery/status/rate-limit/health records. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice workflow circuit-breaker diagnostic hardening bounded circuit-breaker-opened breadcrumbs while preserving config summary writes. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice workflow adapter failure-text hardening replaced Slack/email/GitHub/Linear provider/runtime response text with fixed local delivery errors. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice retention cleanup diagnostic hardening replaced raw retention task exception text with fixed scheduler failure codes and bounded source-error metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice nightly scheduler diagnostic hardening replaced raw scheduler task errors, raw diagnostic logger payloads, and raw diagnostic objects in workflow summary events with fixed failure codes and bounded metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice master scheduler diagnostic hardening replaced raw task summary, scheduler-state, and lease-release exception text with fixed failure codes plus bounded source-error metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice onboarding bootstrap diagnostic hardening replaced raw provider/Admin exception text, raw scoped tenant failure strings, and raw job bootstrap error text with fixed failure codes plus bounded source-error and identifier metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice ticket knowledge diagnostic hardening replaced raw entity/result/fatal exception text with fixed scheduler-facing codes plus bounded source-error and scope metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice friction intelligence diagnostic hardening replaced raw aggregation, cleanup, provider, and weekly insight failure diagnostics with fixed failure codes plus bounded source-error and scope metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice predictive trigger sync diagnostic hardening replaced raw auto-generation, cache rebuild, and effectiveness failure diagnostics with fixed failure codes plus bounded source-error and scope metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice scheduled draft generator diagnostic hardening replaced raw Gemini, parse, per-proposal, and batch failure diagnostics with fixed failure codes plus bounded source-error, scope, identifier, and prompt/response length metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice Support Board sync diagnostic hardening replaced raw returned failure messages and raw scoped success/failure logs with a fixed scheduler-facing code plus bounded source-error and scope metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice compiled-context repair diagnostic hardening replaced raw changelog-load, build-lock, and scheduler-facing repair errors with fixed failure codes plus bounded source-error and scope metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-28: Answerlattice AI provider health diagnostic hardening replaced raw stored provider/runtime exception text and raw scheduler-facing health failures with fixed provider-health codes plus bounded source-error metadata. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json --non-interactive` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.
- 2026-06-29: Answerlattice Functions non-blocking diagnostic hardening made ticket-knowledge existing-answer lookup failures, scheduled draft failed-status marker failures, and founder-onboarding failed-job status marker failures observable with fixed codes. Local `npm run verify:answerlattice-runtime-truth`, `npm --prefix functions-answerlattice run build`, root `npx tsc --noEmit --incremental false --pretty false`, and diff check passed. `PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions:answerlattice --project answerlattice-qa --config ../firebase-answerlattice.json` passed predeploy build and failed at Cloud Resource Manager with `403 The caller does not have permission`.

Storage rules:

- `storage-answerlattice.rules` is the dedicated source and denies unknown paths by default. The July 11 permission/metadata hardening is emulator-verified but remains pending QA deployment because of the IAM blocker recorded below.
- Allowed tenant-scoped paths:
  - `/chatSessions/chatimages/{tId}/{sId}/{imageId}`
  - `/supportTickets/documents/{tId}/{sId}/{fileId}`
  - `/supportTickets/messages/{tId}/{sId}/{fileId}`
  - `/changelog/files/{tId}/{sId}/{fileId}`
  - `/ingestion_source_files/{tId}/{sId}/{fileId}`
- Changelog and ingestion writes require knowledge-management permission.
- Ingestion writes require `delete_on_job_delete`, `knowledge_generation_only`, and `answerlattice_kb_generation` metadata.

Functions deployed in `us-central1`:

| Function | Trigger | Memory | Runtime |
| --- | --- | --- | --- |
| `answerlatticeNightly` | scheduled hourly master scheduler alias | 512 MiB | nodejs22 |
| `triggerAnswerlatticeNightly` | HTTPS manual master scheduler trigger | 512 MiB | nodejs22 |
| `processIntegrationEvent` | Firestore create | 256 MiB | nodejs22 |
| `embedArticleWorker` | task queue | 1 GiB | nodejs22 |
| `publishApprovedJobFn` | callable | 1 GiB | nodejs22 |
| `regenerateEmbedding` | callable | 1 GiB | nodejs22 |

Operational configuration:

- Artifact Registry cleanup policy is set for `gcf-artifacts` in `us-central1`, deleting function images older than 7 days.
- Secret Manager secret `ANSWERLATTICE_CRON_SECRET` exists in `answerlattice-qa`.
- Required or declared Gemini secrets exist in `answerlattice-qa`: `ANSWERLATTICE_GEMINI_AI_KEY`, `ANSWERLATTICE_GEMINI_AI_KEY_2`, `ANSWERLATTICE_GEMINI_AI_KEY_3`, and `ANSWERLATTICE_GEMINI_AI_KEY_4`.
- The `triggerAnswerlatticeNightly` function has access to `ANSWERLATTICE_CRON_SECRET` and the declared Answerlattice Gemini secrets.
- The scheduled, task, and callable AI functions have access to the declared Answerlattice Gemini secrets.
- Manual scheduler auth uses `Authorization: Bearer $ANSWERLATTICE_CRON_SECRET`.

## Commands Used For QA

Rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
```

App Engine application:

```bash
gcloud app create --project answerlattice-qa --region=us-central --quiet
```

Artifact cleanup:

```bash
firebase functions:artifacts:setpolicy --project answerlattice-qa --config firebase-answerlattice.json --location us-central1 --days 7 --force
```

Secret Manager:

```bash
gcloud services enable secretmanager.googleapis.com --project answerlattice-qa --quiet
gcloud secrets create ANSWERLATTICE_CRON_SECRET --project answerlattice-qa --replication-policy=automatic
gcloud secrets versions add ANSWERLATTICE_CRON_SECRET --project answerlattice-qa --data-file=<local-secret-file>
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY --project answerlattice-qa
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_2 --project answerlattice-qa
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_3 --project answerlattice-qa
firebase functions:secrets:set ANSWERLATTICE_GEMINI_AI_KEY_4 --project answerlattice-qa
```

Functions:

```bash
npm --prefix functions-answerlattice run build
firebase deploy --only functions --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
```

Inventory check:

```bash
firebase functions:list --project answerlattice-qa --config firebase-answerlattice.json
```

When Firebase CLI returns `409 index already exists`, verify live indexes before treating it as a failure. On 2026-05-20 the live Answerlattice QA index set matched `firestore-answerlattice.indexes.json` even though Firebase CLI still returned a 409 while reconciling existing vector indexes. Missing individual indexes can be created directly:

```bash
gcloud firestore indexes composite create \
  --project=answerlattice-qa \
  --database='(default)' \
  --collection-group=supportTickets \
  --query-scope=COLLECTION \
  --field-config=field-path=deleted,order=ascending \
  --field-config=field-path=createdOn,order=descending

gcloud firestore indexes composite create \
  --project=answerlattice-qa \
  --database='(default)' \
  --collection-group=supportTickets \
  --query-scope=COLLECTION \
  --field-config=field-path=tId,order=ascending \
  --field-config=field-path=sId,order=ascending \
  --field-config=field-path=deleted,order=ascending \
  --field-config=field-path=createdOn,order=descending
```

Manual scheduler smoke test:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $ANSWERLATTICE_CRON_SECRET" \
  -H "Content-Type: application/json" \
  https://us-central1-answerlattice-qa.cloudfunctions.net/triggerAnswerlatticeNightly
```

Scoped manual retry for one workspace:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $ANSWERLATTICE_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tId":123,"sId":456}' \
  https://us-central1-answerlattice-qa.cloudfunctions.net/triggerAnswerlatticeNightly
```

Expected QA result when the code default `ENABLE_ANSWERLATTICE_NIGHTLY=true` is deployed and no eligible tenant has `hasEntities=true`:

```json
{
  "scheduler": "answerlatticeMasterScheduler",
  "status": "skipped",
  "trigger": "manual",
  "tasks": [
    {
      "name": "governance_nightly",
      "status": "success"
    }
  ]
}
```

When tenants are processed, the governance batch writes a matching document under `answerlattice_schedulerRunLogs/{runLogId}` with:

- `product: "answerlattice"`
- `trigger: "manual"`
- `status: "skipped"` when no eligible tenants exist, otherwise `success` or `partial`
- `phase: "completed"`
- `enabled: true`

The master scheduler state always updates `platformSummary/answerlatticeSchedulerState`; per-workspace settlement uses `platformSummary/answerlatticeNightlyState_*` and `platformSummary/answerlatticeNightlyLock_*`.

## Local Development Notes

Local Answerlattice admin code supports two safe paths:

1. Valid explicit `ANSWERLATTICE_FIREBASE_*` service account env vars.
2. `ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS=./answerlattice-service-account.json` for local QA testing.
3. Local Application Default Credentials in non-production only.

If `ANSWERLATTICE_FIREBASE_PRIVATE_KEY` is malformed in local `.env`, the app ignores that invalid local credential and tries the Answerlattice service-account JSON path before ADC. Production does not use the local ADC fallback; production must have valid explicit Answerlattice credentials.

`ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS` should point to an ignored local service account JSON file only when needed. Do not commit service account JSON files.

## Backup and Recovery

The executable Firestore managed-backup and isolated-restore procedure is maintained in [Answerlattice Backup and Recovery Runbook](./answerlattice-backup-recovery-runbook.md).

Source tooling does not prove deployed recovery readiness. Production certification still requires a verified cloud schedule, a ready backup, a timed restore into a new `answerlattice-recovery-*` database, tenant-isolation and canonical-lineage validation, TTL policy readback, and separate Storage/Auth recovery evidence.

## July 11, 2026 Forensic Audit Deployment Attempt

After the Firebase forensic audit passed root TypeScript, lint, the production build, the Answerlattice Functions build, runtime-truth contracts, the full dedicated/shared Firebase emulator aggregate, Storage rules, index/TTL parity, documentation links, dependency freeze, and diff integrity, the required QA deployments were attempted once:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions \
  --project answerlattice-qa \
  --config firebase-answerlattice.json \
  --non-interactive
```

The Functions predeploy build passed. Deployment then stopped before upload while checking `firebasestorage.googleapis.com` because Service Usage returned HTTP 403: project not found or permission denied.

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage \
  --project menulist-qa \
  --config firebase.json \
  --non-interactive
```

The shared-mode deployment also stopped before upload while checking `firebasestorage.googleapis.com` because Service Usage returned HTTP 403: project not found or permission denied.

No QA rules, indexes, Storage rules, or Functions were changed by these failed attempts. Do not retry until the active account has project visibility plus Service Usage, Firestore Rules, Firestore index, Storage, Cloud Functions, Cloud Build, Artifact Registry, and service-account deployment permissions for the relevant QA project.

## July 16, 2026 First Trusted Answers Deployment Attempt

The First Trusted Answers source, explicit widget outcomes, confirmed-resolution aggregation, and newest-first history index passed local TypeScript, Functions build, focused contracts, and the full Answerlattice runtime/emulator verifier. A QA Functions deployment was then attempted with Node 20:

```bash
firebase deploy --only functions:answerlattice \
  --project answerlattice-qa \
  --config ../firebase-answerlattice.json
```

The predeploy Functions build passed. Cloud Resource Manager then returned HTTP 403 for `answerlattice-qa`, so no Functions or indexes were uploaded. The same project-access blocker from the July 11 audit remains active. When access is restored, deploy Firestore indexes before or with the Functions code because the nightly history query now depends on the mirrored `pId + tId + sId + createdOn DESC` index.

## July 20, 2026 AI Failure Escalation Rule Deployment Attempt

Feature 40 tightened both support-ticket create rule sets so browser clients cannot set server-reserved `source`, `knowledgeCandidate`, `escalationContext`, or `widgetEscalation` fields. Dedicated and shared rules-emulator tests passed before deployment was attempted.

```bash
firebase deploy --only firestore:rules \
  --project answerlattice-qa \
  --config firebase-answerlattice.json \
  --non-interactive
```

```bash
firebase deploy --only firestore:rules \
  --project menulist-qa \
  --config firebase.json \
  --non-interactive
```

Both commands stopped before upload with:

```text
Error: Failed to authenticate, have you run firebase login?
```

No QA rule revision changed. Re-authenticate the Firebase CLI with an account authorized for both QA projects, rerun the same scoped commands, then repeat the dedicated/shared ticket-rules emulator tests and inspect the deployed rules before treating the remote authority boundary as current.

## Production Setup Checklist

Before production launch on `answerlattice.com`:

1. Create the production Answerlattice Firebase/GCP project `answerlattice`.
2. Enable Firebase Auth, Firestore, Storage, Functions, Eventarc, Cloud Tasks, Cloud Scheduler, Cloud Run, Pub/Sub, Artifact Registry, Secret Manager, and App Engine.
3. Choose App Engine region before creating the app. This is effectively irreversible.
4. Add production web app config to Vercel production env:
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=separate`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MEASUREMENT_ID`
5. Add production server env to Vercel production env:
   - `ANSWERLATTICE_FIREBASE_MODE=separate`
   - `ANSWERLATTICE_FIREBASE_PROJECT_ID`
   - `ANSWERLATTICE_FIREBASE_CLIENT_EMAIL`
   - `ANSWERLATTICE_FIREBASE_PRIVATE_KEY`
   - `ANSWERLATTICE_FIRESTORE_DATABASE_ID` only if using a non-default database.
6. Create production `ANSWERLATTICE_CRON_SECRET` and declared `ANSWERLATTICE_GEMINI_AI_KEY*` secrets in Secret Manager.
7. Deploy Firestore rules, Firestore indexes, Storage rules, and functions with `firebase-answerlattice.json` against project `answerlattice`.
8. Run the manual scheduler smoke test and verify the `answerlattice_schedulerRunLogs/{runLogId}` document.
9. Confirm the target branch's Answerlattice function flags before deploying. The ready-to-use default enables the nightly operational loop, trust metrics, capped draft generation, and capped onboarding bootstrap. Support Board nightly sync, optional public API, translation, white-label, and escalation flows remain controlled by rollout flags.
10. Verify manual scheduler logs, tenant summary discovery, and cost expectations before sending production customer traffic.

## Production Warnings

- Do not reuse QA service account credentials in production.
- Do not store service account JSON or secret values in docs or Git.
- Do not point production Answerlattice at the MenuList Firebase project.
- Do not add Answerlattice scheduled functions to MenuList functions; Answerlattice scheduled work stays in `functions-answerlattice/` and should route through the centralized Answerlattice scheduler before adding a new scheduled export.
- Do not send production customer traffic until manual trigger logs, tenant summary discovery, and cost expectations are verified in production.
