# External Certification Runbook

**Status:** Active
**Created:** July 1, 2026
**Purpose:** Single checklist for the remaining production-readiness gates that cannot be proven by local code, docs, typecheck, lint, or source verifiers alone.

**Launch boundary:** Not current launch certification or deploy approval. This runbook defines the external evidence required before launch; it does not pass any gate without recorded target evidence, explicit deploy approval where relevant, provider/browser/device QA, and production-host smoke.

---

## Current Boundary

The codebase-side gates are currently clean when the latest production-readiness audit evidence is current:

- `npm run verify:production-readiness-local`
- `npm run verify:dependency-freeze`
- `npm run docs:check-links`
- all child package `verify:*` scripts, excluding the aggregate command itself
- `npm run typecheck` (`tsc --noEmit --incremental false --pretty false`)
- `npm run lint`
- `git diff --check`

Prefer `npm run verify:production-readiness-local` for a full local boundary refresh. It runs the child root `verify:*` scripts, including `npm run verify:dependency-freeze`, `docs:check-links`, `npm run typecheck`, lint, and `git diff --check` while excluding itself to avoid recursion. Use `npm run verify:production-readiness-local -- --list` when you only need the gate inventory without executing child checks. `npm run build:verify` runs the Next deployment-configuration and frozen Firebase Admin dependency-chain guard before delegating to the same root typecheck and lint scripts. The aggregate can run targeted package builds required by local verifiers, such as the Functions TypeScript build inside `verify:catalog-analytics`, but it does not run a Next.js production build, Firebase deploy, Vercel deploy, provider smoke, Cloud Tasks enqueue, or Firestore write.

Latest local boundary evidence on July 11, 2026: `npm run verify:production-readiness-local` passed with 98/98 checks, including 94 child root `verify:*` scripts. The aggregate includes Answerlattice runtime truth, the public menu rate-limit fail-closed gate, Owner Action Layer source gate, CampaignCue operating-loop verification, dependency freeze verifier, System Strengthening SS-1 through SS-9, production-testing-guide launch-boundary guard, recycle-bin source-gate output boundary, customer PWA source-contract coverage, and documentation health with 0 broken links and 0 naming violations. The aggregate runner prints its own local-only boundary, supports `npm run verify:production-readiness-local -- --list` for a no-execution gate inventory, and uses the root `npm run typecheck` script; `npm run build:verify` first guards the Next deployment configuration and frozen Firebase Admin dependency chain, then runs the same typecheck and lint scripts, so green output cannot be mistaken for authenticated browser/manual QA or deploy certification.

Current local boundary evidence on August 1, 2026: a complete `npm run verify:production-readiness-local` replay finished with 178/179 checks passing, including all 175 child root `verify:*` scripts plus documentation links, root typecheck, lint, and `git diff --check`. The only non-pass is `verify:upstash-readiness`, which exited with its dedicated status `2` because this shell has no admissible Upstash URL/token; the aggregate classified that exact no-credential state as `BLOCKED_EXTERNAL` and continued through every remaining gate. This proves the current local source boundary only. It does not prove Upstash reachability, authenticated browser/device behavior, provider behavior, Firebase or Vercel deployment, live Firestore/Storage effects, production-host behavior, launch approval, or release certification.

This runbook is for the remaining external/runtime certification work. Do not mark MenuList fully production-ready until every gate below has evidence attached in `__docs__/audits/menulist-production-readiness-audit.md`.

---

## Stop Rules

Stop and record the blocker instead of retrying blindly when any of these happen:

- Firebase deploy fails with project access, IAM, billing, Secret Manager, or Cloud Resource Manager permission errors after local checks pass.
- Vercel deploy or production smoke has not been explicitly approved in the current session.
- Provider credentials are missing, dummy, expired, or tied to the wrong environment.
- Browser/mobile tooling cannot control a reliable viewport or device.
- A sandbox provider test touches real money, real customers, or production provider assets by mistake.

---

## Evidence Format

For each gate, append a short evidence block to the audit:

```text
Gate:
Date:
Environment:
Command or manual path:
Expected:
Actual:
Result: passed | blocked | failed
Evidence:
Follow-up:
```

Use exact dates, project IDs, route URLs, provider mode, and command output snippets. Do not record secrets, tokens, phone numbers, payment identifiers, or full customer payloads.

## Local Preflight Vs External Pass

Local preflight evidence proves the codebase still has the expected guards, limits, docs, and refusal behavior. It does **not** pass an external gate by itself. Record local preflight evidence as `local guard subset only` in the audit, then keep the external gate open until the provider, cloud, physical device, or production host evidence is collected.

All external-only certification harnesses must at least parse before their live runs are attempted:

```bash
node --check scripts/verification/verify-customer-pwa-offline.mjs
node --check scripts/verification/verify-mobile-owner-menu.mjs
node --check scripts/verification/verify-mobile-upload-extraction.mjs
node --check scripts/verification/verify-public-routing-summary-backfill.mjs
node --check scripts/verification/verify-razorpay-sandbox-readiness.mjs
```

These five syntax checks prove only that the external-only harness files still load as JavaScript modules. They do not launch Chrome, authenticate an owner, read Firestore, upload media, review target data, call Razorpay, or certify any external gate. `npm run verify:agent-readiness` enforces these checks while keeping the live harness executions outside the default local aggregate.

Use this order for each external gate:

1. Run the listed local preflight commands.
2. If preflight fails, fix code/docs first and do not start provider/cloud smoke.
3. If preflight passes but credentials, device, IAM, provider assets, or deploy approval are missing, record `blocked` with exact missing prerequisite.
4. If preflight passes and the external prerequisites exist, run only the gate's minimum flow set.
5. Append external pass/fail evidence separately from local preflight evidence.

Local preflight is especially important for Gates 4-7 because those gates can otherwise touch money, provider assets, webhook endpoints, Cloud Tasks, Storage, or customer-visible output.

---

## Gate 1: Firebase Functions Deployment

**Goal:** Deploy the Firebase Function logic that is already code-side verified but blocked by cloud access.

**Prerequisites**

- Active Firebase account has deploy access to `menulist-qa`.
- Required staging secrets exist for the targeted functions.
- Local package verifiers, TypeScript, lint, and Functions build pass.
- The deploy target is intentionally scoped; do not deploy unrelated targets.

The default `functions/package.json` `deploy` script intentionally fails closed so package-local muscle memory cannot run a broad/default-project Functions deploy. If a package-local command is required after the root preflight, use `npm --prefix functions run deploy:menulist-qa`; it mirrors the current Gate 1 `menulist-qa` target set. Production Functions deploys still require QA evidence and explicit production deploy approval.

**Commands**

Current production-readiness blocker target set:

- `processMenuImages` - legacy direct callable now fails closed and must be deployed for the old callable surface to stop invoking AI work.
- `processMenuImagesJob` - production Firestore trigger for queued menu image processing jobs.
- `menulistMaintenanceScheduler` - consolidated scheduler for reseller license expiry, lifecycle/owner-notification retention, image batch retention cleanup, AI image prompt-cache source cleanup, and operational maintenance.
- `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler` - Decision Intelligence scheduler and guarded manual recovery callables.
- `messagingOnboarding` and `backfillStoresSummary` - scheduler-hour timezone diagnostics used when publishing or backfilling store summaries.
- `verifyMenuPublish` - guarded publish verification callable used by lifecycle notification hardening.

Changed-function subset note: the July 2, 2026 source-file path hardening slice changes the shared Functions temp-file helper, KB source-file Storage path guard, and deterministic menu-link text-artifact path guard used by `processMenuImages`, `processMenuImagesJob`, `startGeneration`, `embedArticleWorker`, and `regenerateEmbedding`. If the full Gate 1 target list is not being retried, deploy exactly this changed subset and record it separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:startGeneration,functions:embedArticleWorker,functions:regenerateEmbedding --non-interactive
```

Changed-function subset note: the August 2, 2026 Gemini rolling-spend and
retry boundary changes the shared gateway used by every listed MenuList AI
consumer. After `npm run verify:functions-deploy-preflight`, use this complete
affected subset and record it separately from unrelated Gate 1 blockers:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:startGeneration,functions:retryGeneration,functions:processMenuImagesJob,functions:processMenuImages,functions:embedArticleWorker,functions:regenerateEmbedding,functions:menulistMaintenanceScheduler,functions:mapsPlaceCheck,functions:messagingOnboarding,functions:triggerSchedulerManually,functions:triggerWeeklyNarrativeManually,functions:triggerCustomerAnalyticsManually,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler --non-interactive
```

This target set activates the shared spend controller only for exports that can
reach `genAIClient`. It does not deploy Firestore rules/indexes, Storage,
hosting, unrelated Functions, or any Vercel surface.

August 2 attempt: root Functions preflight passed, then this exact MenuList QA
command stopped before predeploy/upload with
`Error: Failed to authenticate, have you run firebase login?`. No Function
revision changed.

Changed-function subset note: the July 2, 2026 Founder Monitor scheduler slice changes `functions/src/schedulers/founderMonitorSnapshot.ts` and `functions/src/schedulers/menulistMaintenanceScheduler.ts`. If only this slice is being retried, deploy exactly the consolidated scheduler target and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive
```

Owner-pending billing scale subset (July 14, 2026): checkout/provider-plan coordination adds explicit deny rules, status-scoped health observations add two exact composite indexes, and reconciliation cursor/health work changes only the consolidated maintenance scheduler. After the current caller has `menulist-qa` Cloud Resource Manager/Firebase deploy permission, run the exact scoped command and retain its output:

```bash
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,functions:menulistMaintenanceScheduler --non-interactive
```

**Pending — owner:** restore/assign the required `menulist-qa` IAM permission, run the command above, and record successful rules/index upload plus the deployed scheduler revision. Do not mark the checkout coordination rules, status-scoped health indexes, reconciliation cursor, or billing-health snapshot deployed until that evidence exists.

Latest billing subset attempt (July 14, 2026): Functions predeploy lint/build passed, then Firestore rules validation failed with Firebase Rules API HTTP 403 (`The caller does not have permission`) before rules or Function upload. Do not retry until IAM changes.

Changed-function subset note: the July 2, 2026 menu extraction SAFE_MODE worker guard changes `functions/src/logic/processMenuImagesJob.ts`. If only this slice is being retried, deploy exactly the queued extraction worker target and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImagesJob --non-interactive
```

Changed-function subset note: the July 5, 2026 scheduler-hour timezone diagnostics slice changes `functions/src/utils/schedulerHour.ts`, which is imported by `functions:messagingOnboarding` and `functions:backfillStoresSummary`. If only this slice is being retried, deploy exactly this pair and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:messagingOnboarding,functions:backfillStoresSummary --non-interactive
```

Changed-function subset note: the July 5, 2026 Maps Place Check raw provider output slice changes `functions/src/logic/mapsPlaceCheck.ts`, which is exported by `functions:mapsPlaceCheck`. If only this slice is being retried, deploy exactly this callable and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive
```

Changed-function subset note: the July 5, 2026 owner-notification template-output slice changes `functions/src/messaging/templates.ts`, which is imported by `functions/src/messaging/messagingEngine.ts` and reached by the publish verification callable plus the Decision Intelligence/nightly scheduler exports. The July 5, 2026 owner-notification flag/trigger diagnostics slice changes `functions/src/ownerNotifications/processor.ts`, which is dynamically imported by `functions/src/messaging/messagingEngine.ts` and reached by the same exports. The July 5, 2026 legacy lifecycle event/status diagnostics slice changes `functions/src/messaging/messagingEngine.ts` and is reached by the same exports. If only one of these slices is being retried, deploy exactly this subset and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:verifyMenuPublish,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler --non-interactive
```

Changed-function subset note: the July 11, 2026 shared Functions AI-gateway SAFE_MODE guard changes `functions/src/ai/aiGateway.ts`. Every exported MenuList Function that can reach the shared Gemini gateway must receive the same revision; do not certify only the previously explicit extraction/Maps callers:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:startGeneration,functions:processMenuImagesJob,functions:embedArticleWorker,functions:regenerateEmbedding,functions:mapsPlaceCheck,functions:menulistMaintenanceScheduler,functions:triggerSchedulerManually,functions:triggerWeeklyNarrativeManually,functions:triggerCustomerAnalyticsManually,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding --non-interactive
```

Gateway-subset blocker recorded July 11, 2026: the exact 13-target command above completed configured Functions lint/build and then failed before upload with Cloud Resource Manager HTTP 403: the caller does not have permission. No Function revision changed, so active SAFE_MODE provider-rejection smoke remains pending.

Local preflight:

```bash
npm run verify:functions-deploy-preflight
npm run verify:catalog-analytics
npm run verify:ai-accounting
npm run verify:auth-security-failure-matrix
npm run verify:menulist-api-tenant-safety
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm --prefix functions run lint
npm --prefix functions run build
```

Passing preflight proves the Functions package lints and compiles locally, the listed source guards still pass, and the current blocked deploy target set remains documented. It does not prove Firebase CLI authentication, project IAM, enabled Google Cloud APIs, Secret Manager access, function upload, deployed revisions, scheduler execution, callable behavior, trigger delivery, or live production effect.

Current operator boundary refreshed August 1, 2026: Firebase CLI is not authenticated, so current scoped MenuList QA deploy attempts stop before predeploy or upload with `Error: Failed to authenticate, have you run firebase login?`. Local preflight can still prove source lint/build and documented target scope, but no current cloud authorization or deployment behavior is certified.

Historical authenticated evidence remains relevant but is not the current operator state: the default package-local scoped set was last retried on July 9 with `npm --prefix functions run deploy:menulist-qa`; it targeted `functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish`, completed predeploy lint/build, and failed before upload with Cloud Resource Manager HTTP 403: the caller does not have permission. The July 11 shared AI-gateway 13-target subset above reached the same pre-upload blocker after configured lint/build. Earlier documented scoped attempts for the source-file path hardening subset (`functions:processMenuImages`, `functions:processMenuImagesJob`, `functions:startGeneration`, `functions:embedArticleWorker`, and `functions:regenerateEmbedding`), the SAFE_MODE worker retry (`functions:processMenuImagesJob`), the scheduler retry (`functions:menulistMaintenanceScheduler`), the staleness lifecycle delivery retry (`functions:computeDecisionBlocksScores`, `functions:triggerDecisionBlocksScoring`, and `functions:triggerStoreNightlyScheduler`), the scheduler-hour diagnostics retry (`functions:messagingOnboarding` and `functions:backfillStoresSummary`), the Maps Place Check raw provider output retry (`functions:mapsPlaceCheck`), and the owner-notification template-output, owner-notification flag/trigger diagnostics, and legacy lifecycle event/status diagnostics retries (`functions:verifyMenuPublish`, `functions:computeDecisionBlocksScores`, `functions:triggerDecisionBlocksScoring`, and `functions:triggerStoreNightlyScheduler`) hit the same blocker class after predeploy lint/build.

Staging deploy retry:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive
```

Narrow this list only when a later audit slice has changed a documented subset and the remaining blocked functions are already live.

**Pass Evidence**

- Firebase CLI reports deployed functions.
- No predeploy build/lint failure.
- No Cloud Resource Manager, IAM, billing, or Secret Manager blocker.
- Audit records the exact function list and project ID.

**Blocked Evidence**

- Record the exact Firebase error.
- Keep the local verifier/build result separate from the cloud blocker.

---

## Gate 2: Tenant-Block Mirror Backfill Review

**Goal:** Review legacy stores that do not yet have denormalized `tenantBlocked` state, then run the guarded backfill only after target scope is confirmed.

**Local Preflight**

```bash
npm run verify:tenant-block-backfill-safety
npm run verify:public-business-truth
npm run verify:menulist-api-tenant-safety
```

Passing preflight proves the backfill source still requires an explicit Firebase project, refuses write mode when `--confirm-project` does not match, refuses write mode without `--tenant-id`, `--store-id`, or explicit `--all-stores`, fails those write-refusal cases before Firebase initialization, preserves tenant-block lookup/source guards, and keeps tenant-safety route guards intact. It does not prove Firestore read access, target dataset review, dry-run candidate counts, write mutation success, or production data parity.

Current blocker refreshed July 9, 2026: `npm run verify:tenant-block-backfill-safety` passed, and the bounded read-only dry run `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --limit 25` printed `Project: menulist-qa` and `Mode: DRY RUN`, then failed before dataset review with `tenant_block_backfill_failed {"code":7,"domain":"googleapis.com","reason":"CONSUMER_INVALID","message":"7 PERMISSION_DENIED: Permission denied on resource project menulist-qa."...}`. This remains a Firebase project access blocker, not a script safety failure, and write mode remains prohibited until a reviewed dry-run output exists.

**Prerequisites**

- Firestore access works for the selected Firebase project.
- Target project ID is explicit.
- Write mode is approved after dry-run output is reviewed.

**Commands**

```bash
# Initial bounded dry run:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --limit 25

# Tenant-scoped or store-scoped dry run:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --tenant-id <tenantId>
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --store-id <storeId>

# Only after dry-run output is reviewed and the target project/scope is confirmed:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --tenant-id <tenantId> --confirm-project menulist-qa --write
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --store-id <storeId> --confirm-project menulist-qa --write

# Whole-project writes require an explicit all-stores acknowledgement after whole-project dry-run review:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --all-stores --confirm-project menulist-qa --write
```

**Pass Evidence**

- Dry run prints target project and mode before Firestore reads.
- Write run requires `--confirm-project` matching `--project-id`.
- Write run also requires `--tenant-id`, `--store-id`, or explicit `--all-stores`.
- Output shows bounded counts and no raw sensitive data.

---

## Gate 2A: Firebase Storage Rules Deployment

**Goal:** Deploy the Storage rules cutover that denies direct client reads, writes, and deletes for unscoped legacy `MenuListAi/project/...` objects. Active project uploads must continue to use tenant-scoped `projects/{fileType}/{tId}/{sId}/{fileId}` paths.

**Local Preflight**

```bash
npm run verify:storage-paths
npm run verify:production-readiness-local
```

Passing preflight proves active project fallback uploads use tenant-scoped paths, legacy project paths deny direct client access in `storage.rules`, and the local aggregate remains clean. It does not prove Firebase CLI authentication, project IAM, Storage rules upload, deployed rules propagation, or live bucket behavior.

Current blocker refreshed July 11, 2026: `npm run verify:storage-paths` passed, and `npm run verify:production-readiness-local` includes `verify:storage-paths` and passes with 98/98 checks. The latest scoped retry remains the July 9 command `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive`; it failed before rules upload while checking/enabling `firebasestorage.googleapis.com` with Service Usage HTTP 403: project `menulist-qa` not found or permission denied.

**Prerequisites**

- Active Firebase account has deploy access to `menulist-qa`.
- No active deployed client is expected to write to legacy `MenuListAi/project/...` paths.
- QA deploy evidence is required before production deploy approval.

**Commands**

```bash
firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive
```

Production Storage rules deploy requires QA evidence and explicit production approval in the active session:

```bash
firebase deploy --project menulist --config firebase.json --only storage --non-interactive
```

**Pass Evidence**

- `npm run verify:storage-paths` passed.
- QA Storage rules deploy completed.
- Direct SDK reads of a legacy project object fail for public, same-tenant, cross-tenant, and platform clients if a legacy fixture exists; separately test any explicitly retained tokenized compatibility URL.
- New legacy write/delete attempts are denied, or the absence of legacy-write clients is documented.
- Production deploy approval and evidence captured separately.

**Stop Conditions**

- Firebase deploy fails with Cloud Resource Manager, IAM, billing, or project access error.
- Any active client still attempts direct legacy `MenuListAi/project/...` reads or writes.
- Rules deploy would target production before QA evidence and explicit production approval.

---

## Gate 3: True Mobile And Browser QA

**Goal:** Prove owner shell and public customer surfaces work on narrow viewports and real mobile conditions.

**Local Preflight**

```bash
node --check scripts/verification/verify-customer-pwa-offline.mjs
node --check scripts/verification/verify-mobile-owner-menu.mjs
node --check scripts/verification/verify-mobile-upload-extraction.mjs
npm run verify:mobile-shell-route-map
npm run verify:staff-roles-route-parity
npm run verify:customer-app-pwa
npm run verify:public-business-truth
npm run verify:menu-extraction-pipeline
npm run verify:public-truth-tools
```

When the local tenant host, Chrome, and development server are available, run the maintained non-mutating customer-worker browser harness:

```bash
CUSTOMER_PWA_QA_TENANT_HOST=habibis.menulist.digital \
CUSTOMER_PWA_QA_UPSTREAM_URL=http://127.0.0.1:3000 \
CUSTOMER_PWA_QA_OUTPUT_DIR=/tmp/menulist-customer-pwa-qa \
npm run smoke:customer-pwa-offline
```

The harness uses a temporary Chrome profile and a harness-owned loopback tenant proxy. It loads the online tenant page, waits for development service-worker cleanup, manually registers `/sw-customer.js`, verifies Cache Storage contains exactly `customer-app-offline-v1` with only `/offline`, severs only the proxy's upstream connection, and fresh-navigates to the maintained offline screen. It fails if cached menu/runtime content appears, the offline reconnect copy is missing, or the online tenant title leaks into the fallback. It does not stop the shared development server or mutate Firebase, Storage, provider, or deployment state.

Historical local evidence, July 11, 2026: the command passed against the now-retired `habibis.qa.menulist.digital` host mapped to loopback. Current reruns must use `habibis.menulist.digital`. The 390x844 offline capture rendered `You're offline` and `Reconnect to see the latest live menu.`; both online and offline cache inspection found only `/offline`, with `menuContentCached: false`. This proves the local loopback customer-worker contract only. Development intentionally unregisters service workers before the harness manually registers one, so this result does not prove production registration, installability, deployed worker scope, physical-device behavior, or production-host offline behavior.

Passing preflight proves the owner-mobile and mobile upload/extraction harnesses are syntactically valid, shell route targets are source-mapped, Staff/Roles mobile sub-screens keep their shared route/permission contract, customer app and public business truth source gates are intact, menu extraction intake still enforces source limits, and public truth tools remain browser-local/static-report surfaces. It does not prove real device rendering, authenticated owner-shell visual behavior, touch ergonomics, browser console cleanliness, or public route runtime rendering.

When a local/staging dev server and eligible non-production owner fixture are available, run the authenticated mobile owner Menu harness in explicit fixture mode:

```bash
MOBILE_QA_ENV_FILE=.env \
MOBILE_QA_BASE_URL=http://localhost:3050 \
MOBILE_QA_OUTPUT_DIR=/tmp/menulist-mobile-qa \
MOBILE_QA_DEBUG_PORT=9355 \
MOBILE_QA_CDP_TIMEOUT_MS=90000 \
MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE=1 \
MOBILE_QA_EMAIL=<owner-test-email> \
MOBILE_QA_STORE_ID=<non-production-store-id> \
MOBILE_QA_PROJECT_ID=<non-production-project-id> \
MOBILE_QA_PROJECT_NAME="<expected menu/project name>" \
node scripts/verification/verify-mobile-owner-menu.mjs
```

The harness creates the screenshot output directory before capture and honors `MOBILE_QA_CDP_TIMEOUT_MS` for Chrome DevTools waits. `MOBILE_QA_REQUIRE_EXPLICIT_FIXTURE=1` makes the run fail before browser launch unless the owner email, store id, project id, and expected project name are all provided. Do not certify owner-shell mobile QA from the script's local defaults.

The harness must classify initial blockers explicitly. `fixture_blocked` means the selected owner store needs an active subscription or unexpired starter activation before MobileShell certification can continue; `auth_blocked` means the local auth/session setup failed; `runtime_blocked` means the page rendered an error/not-found state. Do not treat these as visual QA passes.

After fixture admission, the harness traverses Today, Menu, Share, and More through the actual bottom navigation, verifies each `#mobile/{tab}` state remains inside `MobileShell`, captures one screenshot per tab, and fails on page-level horizontal overflow, clipped visible interactive controls outside intentional horizontal scrollers, bottom-navigation targets below 44x44px, missing active-tab accessibility state, or material browser errors. Menu-specific bulk, Visibility, and Fix Text Case sheet checks run only after the four-tab navigation pass returns to Menu.

**Prerequisites**

- Reliable Chrome control, in-app browser control, Playwright, BrowserStack, or physical device access.
- A local or staging URL with authenticated owner test access.
- Test tenant/store/project data is non-production or explicitly approved for staging smoke.
- The selected owner store has active subscription access or unexpired starter activation before the owner-shell certification run.

**Minimum Route Set**

- Owner mobile shell: Today, Menu, Share, More.
- Menu editor mobile upload/link intake.
- Public menu and Official Business Page.
- Feedback and compliance pages.
- Billing and reseller screens if the release includes billing changes.
- Location/outlet screens if the release includes multi-location changes.

**Pass Evidence**

- Viewport or device name.
- Route list tested.
- Screenshots or concise visual notes.
- No page-level horizontal overflow.
- No unreadable clipped controls.
- No desktop-route bypass for PWA shell screens.
- Public routes do not expose owner-only data or require login.

---

## Gate 4: Razorpay Sandbox Smoke

**Goal:** Prove subscription, top-up, reseller, and failure-compensation flows against Razorpay sandbox mode.

**Local Preflight**

```bash
node --check scripts/verification/verify-razorpay-sandbox-readiness.mjs
npm run verify:billing-entitlement-boundary
npm run verify:menulist-api-tenant-safety
npm run verify:no-free-product-plans
npm run verify:auth-security-failure-matrix
```

Passing preflight proves local Razorpay admission, bounded-body, signature, diagnostic, plan, UI, subscription/top-up sequencing, webhook cheap-fail/idempotency, browser acknowledgement, and entitlement/cache sync guard coverage only. It does not prove sandbox checkout, provider webhook delivery, captured-payment state, or provider/local state parity.

**Repeatable Read-Only Provider Preflight**

```bash
RAZORPAY_SANDBOX_ENV_FILE=.env \
RAZORPAY_SANDBOX_TIMEOUT_MS=15000 \
npm run smoke:razorpay-sandbox-readonly
```

The command hard-rejects `rzp_live_` keys, requires exact private/public `rzp_test_` key-ID agreement, performs four bounded GET-only provider inventory calls (`payments.all`, `orders.all`, `plans.all`, and `subscriptions.all`, each with `count: 1`), and performs a synthetic raw-body webhook HMAC self-test that must accept the exact body and reject a one-byte change. It prints only mode, operation, entity, count, and pass/fail metadata. It does not create, update, capture, cancel, refund, or delete provider objects and does not access Firestore or Storage.

Current partial evidence refreshed July 14, 2026 after the final billing cross-check: `npm run smoke:razorpay-sandbox-readonly` passed against the local test-mode account. All four provider operations returned `entity: collection` with one bounded item, the exact synthetic raw body passed signature validation, and a one-byte body change failed validation. This proves the configured test-mode credentials can read the four provider families and the installed SDK's raw-body signature primitive behaves as expected with the configured local webhook secret. It does not prove the secret matches a deployed Razorpay webhook endpoint, checkout, subscription creation, payment verification, top-up purchase, webhook delivery, provider failure compensation, local/provider state parity, deployed Functions secrets, or no-real-charge behavior.

Provider references: [Test Subscriptions](https://razorpay.com/docs/payments/subscriptions/test/?preferred-country=IN) and [Validate and Test Webhooks](https://razorpay.com/docs/webhooks/validate-test/?locale=en-US).

**Prerequisites**

- Razorpay test-mode keys are configured only in the intended staging/local environment.
- `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID` starts with `rzp_test_`; never use `rzp_live_` for this gate.
- `MENULIST_RAZORPAY_KEY_SECRET` belongs to the same Razorpay test account as `NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID`.
- `MENULIST_RAZORPAY_WEBHOOK_SECRET` belongs to the same Razorpay test webhook endpoint used for this smoke.
- Firebase Functions secrets for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set only on the matching non-production target if the smoke includes Functions-owned payment work.
- No production Razorpay credentials are used.

**Minimum Flow Set**

- New owner subscription checkout.
- Two concurrent identical subscription-create requests converge on one provider subscription, including the timing where request B passed the pending read just before request A persisted and completed; a changed intent receives a conflict.
- Simulated lost create response recovers the exact `checkoutAttemptId` subscription before any second provider create.
- Payment verification with signature.
- Failed provider setup after local tenant/store/user creation, confirming compensation behavior.
- Top-up purchase flow.
- Two concurrent identical top-up creates converge on one attempt receipt/order, including the post-persistence lease-reacquire boundary; simulated lost response recovers the receipt-filtered order.
- An inherited-outlet top-up credits the shared HQ subscription and its paid transaction appears in the same HQ billing-history scope shown on desktop and mobile.
- A lost-browser `order.paid` webhook applies the pending top-up exactly once and replay does not add credits again.
- Reseller payment flow if reseller launch is in scope.
- Webhook signature rejection and accepted webhook handling.

**Pending — owner:** after the app-side changes and scoped Firebase rules/scheduler revision are deployed to the intended non-production target, run this disposable Razorpay test-mode mutation set and attach sanitized provider/local state evidence. The maintained read-only preflight is already green but does not pass these mutation checks.

**Pass Evidence**

- Provider mode is sandbox/test.
- Local records match provider state.
- Failed provider setup does not leave active local tenant/store/user scope.
- Webhook rejects invalid signatures.
- No real charge is created.

---

## Gate 5: WhatsApp Provider Smoke

**Goal:** Prove Messaging Onboarding with real Meta WhatsApp Cloud API test assets before owner-facing launch.

**Local Preflight**

```bash
npm run verify:agent-readiness
npm run verify:env-targets
npm run verify:whatsapp-action-link-check
npm run verify:messaging-onboarding-monitor-boundary
npm run verify:menu-extraction-pipeline
npm run verify:menulist-api-tenant-safety
```

Passing preflight proves local env/secret naming, docs, public WhatsApp Action Link Check non-provider boundaries, platform-only messaging onboarding monitor coverage, preview/fix/publish source gates, messaging extraction destination routing, public cache-tag writes, ops guards, and bounded WhatsApp diagnostics only. It does not prove Meta webhook delivery, provider media download, outbound WhatsApp delivery, provider asset configuration, or provider-mode correctness.

Current blocker refreshed July 9, 2026: checked-in root and MenuList Functions dotenv files keep `ENABLE_MESSAGING_ONBOARDING` absent or `false`, and local presence checks found no WhatsApp provider secret values in `.env`, `functions/.env.menulist-qa`, `functions/.env.menulist`, or `functions/.env.menulist.example`. No Firebase Secret Manager read, Meta app registration, test phone number, approved recipient, deployed webhook, or provider call was performed. Gate 5 remains blocked until the owner provisions real non-production Meta assets, sets matching Firebase secrets on the smoke target, deploys the webhook function, registers the webhook URL, and enables only that target.

**Prerequisites**

- Non-production Meta app.
- Meta test phone number and approved test recipient.
- Firebase Functions secrets set for the same non-production target:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_APP_SECRET`
  - `WHATSAPP_VERIFY_TOKEN`
- Webhook URL registered for the deployed non-production function.
- `ENABLE_MESSAGING_ONBOARDING=true` only after real secrets and Meta webhook registration exist for the target.

**Minimum Flow Set**

- Inbound text.
- Inbound image or PDF.
- Preview generation.
- Approve and publish.
- Outbound confirmation.
- `/ops/messaging-onboarding` visibility.
- Media URL rejection path for unsafe/private targets.

**Pass Evidence**

- Provider mode and Firebase project ID.
- Inbound webhook reaches MenuList.
- Preview and publish state transitions are visible.
- Outbound message is delivered to the approved test recipient.
- No dummy secrets or production WhatsApp number are used.

---

## Gate 6: POS Webhook Provider Smoke

**Goal:** Prove POS Sync against a real public HTTPS endpoint controlled for staging.

**Local Preflight**

```bash
npm run verify:pos-sync-boundary
npm run verify:public-business-truth
npm run verify:menulist-api-tenant-safety
npm run verify:auth-security-failure-matrix
```

Passing preflight proves the maintained source-only POS boundary gate, local public-HTTPS validation, DNS/private-target blocking, bounded request/response handling, signed payload source coverage, desktop/mobile owner-safe failure copy, MobileShell routing, and UI acknowledgement guards only. It does not prove receiver-side signature verification, test delivery, publish-triggered delivery, or provider payload acceptance.

Current blocker refreshed July 9, 2026: `npm run verify:pos-sync-boundary` passed, but no controlled public HTTPS POS receiver endpoint, receiver-side signature-verification evidence, saved owner POS setting, test delivery, or publish-triggered delivery evidence is recorded for the active certification run. Gate 6 remains blocked until the owner provides or provisions a staging receiver endpoint that can verify MenuList signatures and accept a signed full-menu snapshot without exposing secrets.

**Prerequisites**

- Public HTTPS test endpoint.
- Endpoint can verify MenuList signature.
- Endpoint is not localhost, private IP, link-local, `.local`, or metadata-style infrastructure.

**Minimum Flow Set**

- Save POS endpoint.
- Test connection.
- Publish menu change.
- Delivery route sends signed full-menu snapshot.
- Failed endpoint returns owner-safe error.
- Secret rotation persists before UI success.

**Pass Evidence**

- Endpoint URL domain, with no secrets in docs.
- Signature verified by receiver.
- Delivery payload shape is accepted.
- Failed endpoint path is logged without sensitive payload.

---

## Gate 7: Batch Image Worker Configuration

**Goal:** Prove batch image generation can enqueue and process Cloud Tasks instead of failing preflight.

**Local Preflight**

```bash
npm run verify:agent-readiness
npm run verify:ai-accounting
npm run verify:auth-security-failure-matrix
env -u FIREBASE_PROJECT_ID -u FIREBASE_PROJECT_LOCATION -u BATCH_IMAGE_GENERATION_QUEUE_ID -u BATCH_IMAGE_GENERATION_WORKER_URL -u BATCH_IMAGE_GENERATION_WORKER_SECRET npx tsx -e "import { getImageGenerationTaskConfigStatus } from './src/lib/google/cloudTask/index.ts'; const status = getImageGenerationTaskConfigStatus(); console.log(JSON.stringify(status)); if (status.ready !== false || status.hasProjectId || status.hasQueueId || status.hasQueueLocation || status.hasWorkerUrl || status.hasWorkerSecret) throw new Error('Expected incomplete batch worker config');"
```

Passing preflight proves local batch-trigger admission, accounting/capacity ordering, worker secret/header guards, and missing-config cheap-fail behavior only. It does not prove Cloud Tasks enqueue, worker invocation, worker secret acceptance, provider image generation, review state, or project persistence.

Current blocker refreshed July 15, 2026: local `.env` has `FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_LOCATION`, `BATCH_IMAGE_GENERATION_QUEUE_ID`, and an HTTPS `BATCH_IMAGE_GENERATION_WORKER_URL`, but `BATCH_IMAGE_GENERATION_WORKER_SECRET` is missing. MenuList Functions dotenv files do not contain the batch worker keys. A no-enqueue status probe using the app helper returned `ready:false`, `hasProjectId:true`, `hasQueueLocation:true`, `hasQueueId:true`, `hasWorkerUrl:true`, and `hasWorkerSecret:false`. Gate 7 remains blocked until the worker secret is configured for the target, the worker target is deployed, the existing queue policy is captured, and a controlled Cloud Tasks enqueue/worker smoke is run. Application-side task creation is capped at eight concurrent requests, but that does not replace queue-level dispatch and retry controls.

**Prerequisites**

- `BATCH_IMAGE_GENERATION_WORKER_URL`
- `BATCH_IMAGE_GENERATION_QUEUE_ID`
- `BATCH_IMAGE_GENERATION_WORKER_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PROJECT_LOCATION`
- Target app deployment completed for the HTTPS worker route. This is a Vercel/app deployment boundary, not a Firebase Function deployment.

**Queue Policy Evidence**

Run this read-only command after loading the intended target values:

```bash
gcloud tasks queues describe "$BATCH_IMAGE_GENERATION_QUEUE_ID" \
  --location="$FIREBASE_PROJECT_LOCATION" \
  --project="$FIREBASE_PROJECT_ID" \
  --format=json
```

Record `rateLimits.maxConcurrentDispatches`, `rateLimits.maxDispatchesPerSecond`, and the complete `retryConfig`. Confirm they fit the deployed worker capacity and current Gemini target quota before changing them; do not copy unverified values between QA and production.

**Minimum Flow Set**

- Start a batch image generation job.
- Confirm Cloud Tasks enqueue.
- Confirm worker rejects missing/wrong secret.
- Confirm worker accepts correct secret.
- Confirm generated images reach the review state.
- Confirm selected images persist to project data.

**Pass Evidence**

- Queue ID and project ID.
- Captured queue dispatch and retry policy, with target-capacity review.
- Job ID presence only, not full payload.
- Worker auth rejection and acceptance.
- Owner-visible job result.

---

## Gate 8: Production Host Smoke

**Goal:** Prove the deployed production host serves the verified app after explicit deploy approval.

**Local Preflight**

```bash
npm run verify:production-readiness-local
```

Passing preflight proves local source gates, documentation links, TypeScript, lint, and diff hygiene only. It does not prove a Vercel build, deployed artifact, production environment variables, custom-domain routing, CDN behavior, Firebase production access, or production-host runtime behavior.

**Prerequisites**

- Owner explicitly approves Vercel deploy in the active session.
- Release scope is clear.
- Production env vars and Firebase targets are confirmed.
- `npm run verify:production-readiness-local` passes immediately before deploy.
- Do not run Vercel deploy, preview deploy, production deploy, or production-host smoke from this runbook unless that approval exists in the active session.

**Minimum Flow Set**

- Home page.
- Sign-in.
- Public menu.
- Official Business Page.
- Compliance page.
- Feedback route.
- Owner dashboard route after auth.
- Public API missing-key fail-closed response.
- Sitemap, robots, and llms files if launch/discovery is in scope.

**Pass Evidence**

- Production URL.
- Deploy URL.
- Route list and status.
- No stale copy or wrong canonical host.
- No owner-only data on public routes.

---

## Final Certification Rule

MenuList is production-ready only when:

- Codebase gates are green.
- All external gates above are passed or explicitly out of release scope.
- Any out-of-scope gate has a named owner-side decision and no hidden runtime dependency.
- The production-readiness audit is updated with exact evidence.
- No deploy/build/provider claim is inferred from local source checks alone.
