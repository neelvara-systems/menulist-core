# External Certification Runbook

**Status:** Active
**Created:** July 1, 2026
**Purpose:** Single checklist for the remaining production-readiness gates that cannot be proven by local code, docs, typecheck, lint, or source verifiers alone.

---

## Current Boundary

The codebase-side gates are currently clean when the latest production-readiness audit evidence is current:

- `npm run verify:production-readiness-local`
- `npm run verify:dependency-freeze`
- `npm run docs:check-links`
- all child package `verify:*` scripts, excluding the aggregate command itself
- `npx tsc --noEmit --incremental false --pretty false`
- `npm run lint`
- `git diff --check`

Prefer `npm run verify:production-readiness-local` for a full local boundary refresh. It runs the child root `verify:*` scripts, including `npm run verify:dependency-freeze`, `docs:check-links`, TypeScript, lint, and `git diff --check` while excluding itself to avoid recursion. It can run targeted package builds required by local verifiers, such as the Functions TypeScript build inside `verify:catalog-analytics`, but it does not run a Next.js production build, Firebase deploy, Vercel deploy, provider smoke, Cloud Tasks enqueue, or Firestore write.

Latest local boundary evidence on July 2, 2026: `npm run verify:production-readiness-local` passed with 67/67 checks, including 63 child root `verify:*` scripts. The aggregate includes the public menu rate-limit fail-closed gate, dependency freeze verifier, System Strengthening SS-1 through SS-9, production-testing-guide launch-boundary guard, and recycle-bin source-gate output boundary. The aggregate runner now prints its own local-only boundary so green output cannot be mistaken for authenticated browser/manual QA or deploy certification.

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
node --check scripts/verification/verify-mobile-owner-menu.mjs
node --check scripts/verification/verify-mobile-upload-extraction.mjs
node --check scripts/verification/verify-public-routing-summary-backfill.mjs
```

These syntax checks prove only that the harness files still load as JavaScript modules. They do not launch Chrome, authenticate an owner, read Firestore, upload media, review target data, or certify any external gate. `npm run verify:agent-readiness` enforces these checks while keeping the live harness executions outside the default local aggregate.

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

**Commands**

Current production-readiness blocker target set:

- `processMenuImages` - legacy direct callable now fails closed and must be deployed for the old callable surface to stop invoking AI work.
- `processMenuImagesJob` - production Firestore trigger for queued menu image processing jobs.
- `menulistMaintenanceScheduler` - consolidated scheduler for reseller license expiry, lifecycle/owner-notification retention, image batch retention cleanup, AI image prompt-cache source cleanup, and operational maintenance.
- `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler` - Decision Intelligence scheduler and guarded manual recovery callables.
- `verifyMenuPublish` - guarded publish verification callable used by lifecycle notification hardening.

Changed-function subset note: the July 2, 2026 source-file path hardening slice changes the shared Functions temp-file helper, KB source-file Storage path guard, and deterministic menu-link text-artifact path guard used by `processMenuImages`, `processMenuImagesJob`, `startGeneration`, `embedArticleWorker`, and `regenerateEmbedding`. If the full Gate 1 target list is not being retried, deploy exactly this changed subset and record it separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:startGeneration,functions:embedArticleWorker,functions:regenerateEmbedding --non-interactive
```

Changed-function subset note: the July 2, 2026 Founder Monitor scheduler slice changes `functions/src/schedulers/founderMonitorSnapshot.ts` and `functions/src/schedulers/menulistMaintenanceScheduler.ts`. If only this slice is being retried, deploy exactly the consolidated scheduler target and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive
```

Changed-function subset note: the July 2, 2026 menu extraction SAFE_MODE worker guard changes `functions/src/logic/processMenuImagesJob.ts`. If only this slice is being retried, deploy exactly the queued extraction worker target and record the result separately from the broader blocked set:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImagesJob --non-interactive
```

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

Current blocker recorded July 2, 2026: local readiness now passes with 67/67 checks. The latest documented scoped attempts for the source-file path hardening subset (`functions:processMenuImages`, `functions:processMenuImagesJob`, `functions:startGeneration`, `functions:embedArticleWorker`, and `functions:regenerateEmbedding`), the SAFE_MODE worker retry (`functions:processMenuImagesJob`), and the scheduler retry (`functions:menulistMaintenanceScheduler`) completed predeploy lint/build before failing ahead of upload with Cloud Resource Manager HTTP 403: the caller does not have permission.

Staging deploy retry:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --non-interactive
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

**Goal:** Deploy the Storage rules cutover that keeps legacy `MenuListAi/project/...` objects authenticated-readable but denies new legacy writes/deletes. Active project uploads must continue to use tenant-scoped `projects/{fileType}/{tId}/{sId}/{fileId}` paths.

**Local Preflight**

```bash
npm run verify:storage-paths
npm run verify:production-readiness-local
```

Passing preflight proves active project fallback uploads use tenant-scoped paths, legacy project paths are read-only in `storage.rules`, and the local aggregate remains clean. It does not prove Firebase CLI authentication, project IAM, Storage rules upload, deployed rules propagation, or live bucket behavior.

Current blocker recorded July 2, 2026: `npm run verify:storage-paths` passed and local readiness now passes with 67/67 checks, while the prior `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive` attempt failed before rules upload while checking/enabling `firebasestorage.googleapis.com` with Service Usage HTTP 403: project `menulist-qa` not found or permission denied.

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
- Existing legacy project object read smoke still works for authenticated owners if a legacy fixture exists.
- New legacy write/delete attempts are denied, or the absence of legacy-write clients is documented.
- Production deploy approval and evidence captured separately.

**Stop Conditions**

- Firebase deploy fails with Cloud Resource Manager, IAM, billing, or project access error.
- Any active client still attempts legacy `MenuListAi/project/...` writes.
- Rules deploy would target production before QA evidence and explicit production approval.

---

## Gate 3: True Mobile And Browser QA

**Goal:** Prove owner shell and public customer surfaces work on narrow viewports and real mobile conditions.

**Local Preflight**

```bash
node --check scripts/verification/verify-mobile-owner-menu.mjs
node --check scripts/verification/verify-mobile-upload-extraction.mjs
npm run verify:mobile-shell-route-map
npm run verify:staff-roles-route-parity
npm run verify:customer-app-pwa
npm run verify:public-business-truth
npm run verify:menu-extraction-pipeline
npm run verify:public-truth-tools
```

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
npm run verify:billing-entitlement-boundary
npm run verify:menulist-api-tenant-safety
npm run verify:no-free-product-plans
npm run verify:auth-security-failure-matrix
```

Passing preflight proves local Razorpay admission, bounded-body, signature, diagnostic, plan, UI, subscription/top-up sequencing, webhook cheap-fail/idempotency, browser acknowledgement, and entitlement/cache sync guard coverage only. It does not prove sandbox checkout, provider webhook delivery, captured-payment state, or provider/local state parity.

**Prerequisites**

- Razorpay test-mode keys are configured only in the intended staging/local environment.
- `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` both start with `rzp_test_`; never use `rzp_live_` for this gate.
- `RAZORPAY_KEY_SECRET` belongs to the same Razorpay test account as `RAZORPAY_KEY_ID`.
- `RAZORPAY_WEBHOOK_SECRET` belongs to the same Razorpay test webhook endpoint used for this smoke.
- Firebase Functions secrets for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set only on the matching non-production target if the smoke includes Functions-owned payment work.
- No production Razorpay credentials are used.

**Minimum Flow Set**

- New owner subscription checkout.
- Payment verification with signature.
- Failed provider setup after local tenant/store/user creation, confirming compensation behavior.
- Top-up purchase flow.
- Reseller payment flow if reseller launch is in scope.
- Webhook signature rejection and accepted webhook handling.

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

**Prerequisites**

- `BATCH_IMAGE_GENERATION_WORKER_URL`
- `BATCH_IMAGE_GENERATION_QUEUE_ID`
- `BATCH_IMAGE_GENERATION_WORKER_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PROJECT_LOCATION`
- Firebase Function deploy completed for the worker target.

**Minimum Flow Set**

- Start a batch image generation job.
- Confirm Cloud Tasks enqueue.
- Confirm worker rejects missing/wrong secret.
- Confirm worker accepts correct secret.
- Confirm generated images reach the review state.
- Confirm selected images persist to project data.

**Pass Evidence**

- Queue ID and project ID.
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
