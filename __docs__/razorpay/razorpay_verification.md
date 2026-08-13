# Razorpay — Session Verification Log

## Session: August 14, 2026 - Hosted Checkout Recovery and Cancellation Certification

**Task:** Exercise the current Test Mode owner checkout and signed webhook path on `app.menulist.digital`, preserve the retained unpaid baseline, correct defects exposed by real provider payloads, and prove cleanup without touching production.

### Hosted Evidence

- Vercel Preview build `de18a865a1c08603ba3f740c958b827246d99a65` rendered the retained yearly subscription as `Payment Pending`. `Continue Checkout` reopened Standard Checkout for the same provider subscription. Closing and confirming exit returned immediately to the same authoritative pending state with `Continue Checkout`; no payment, entitlement, billing history, MRR, notification, or credit mutation occurred.
- Provider readback kept retained baseline `sub_TPGo1XmddplChB` at `created`, `paid_count=0`, no current billing cycle, and no authorization attempts. It was not cancelled, replaced, or otherwise mutated.
- A separate disposable subscription, `sub_TPLMUb5xz8kme6`, was cancelled through the Razorpay Test API after exact identity/status preconditions. The first signed `subscription.cancelled` delivery returned HTTP 503 because the MenuList-only QA route attempted an unconditional Answerlattice Firestore lookup.
- Vercel Preview build `1234895fdd013fa03d59400dcd8253f6d9fd6d0b` restricted lookup to the event's intended, configured product stores. Razorpay's automatic retry then returned HTTP 200 and the hosted owner Billing surface converged to `No Active Subscription`.
- Guarded cleanup deleted only the disposable local subscription after asserting its exact identity and terminal provider status. A second Firestore read found no matching document. The retained baseline and its owner/store/tenant fixture remained unchanged; production was not queried or changed.
- Razorpay Dashboard readback confirms the enabled QA endpoint has 13 events: `payment.failed`, `order.paid`, `subscription.authenticated`, `subscription.paused`, `subscription.resumed`, `subscription.activated`, `subscription.pending`, `subscription.halted`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.updated`, and `refund.processed`.

### Real-Payload Corrections

- Historical Vercel logs showed a genuine Razorpay `payment.failed` delivery returning HTTP 500. Read-only Test API inventory confirmed Razorpay can emit an order-backed failed payment with amount `0` after checkout cancellation and without `subscription_id` or top-up pack notes.
- Build `2780c22a821719b6c1ee7cf1543f2f45eb17d6be` now treats provider amount `0` as valid failed-payment audit data, uses a bounded persisted-subscription amount fallback only when the provider amount is absent, and identifies top-ups only from explicit pack identity. Order presence alone no longer labels a payment as a top-up.
- Official `subscription.pending` and `subscription.halted` payloads may contain only the subscription entity. The same resolver derives their audit amount from the transaction-current subscription instead of requiring an unrelated payment entity.
- The original failed-payment event has not yet been observed as an HTTP 200 automatic retry on the corrected build. Razorpay documents at-least-once delivery and retry of non-2xx responses for up to 24 hours; this provider-controlled retry remains an open observation, not a code or deployment blocker.

### Verification

| Check | Result |
|---|---|
| Hosted checkout dismissal recovery | Passed: the same pending subscription is re-read after dismissal and remains non-entitled with `Continue Checkout` |
| Provider-originated cancellation | Passed: corrected hosted route returned HTTP 200 on automatic retry and owner Billing converged to no active subscription |
| Product routing | Passed: MenuList-only QA does not require Answerlattice Firestore configuration; signed/intended configured product stores remain isolated |
| Failed-payment amount and classification | Passed source gates: provider amount `0`, missing amount with exact subscription fallback, malformed amount failure, explicit top-up notes, subscription identity, and ordinary order-backed payment classification |
| Lifecycle contract | Passed: exact 10/10 subscription events plus Firestore emulator matrix; authentication/activation remain pending and only captured charged settlement may grant access |
| TypeScript and scoped ESLint | Passed on the current payment/webhook changes before each staging push |
| Current Vercel deployment | Passed: build `2780c22a821719b6c1ee7cf1543f2f45eb17d6be` is Ready and served by the QA aliases |
| Disposable cleanup and retained baseline | Passed: disposable local row absent; retained provider baseline remains `created` and unpaid |
| Original `payment.failed` retry | Pending provider observation: no current-build retry has appeared yet |
| Immediate-start authorization/charge | Pending external sandbox evidence: checkout did not reach a successful mock-bank authorization, so no `subscription.activated` or captured `subscription.charged` event was fabricated |

Primary contracts rechecked: [subscription test lifecycle](https://razorpay.com/docs/payments/subscriptions/test/?preferred-country=IN), [test card details](https://razorpay.com/docs/payments/payments/test-card-details/?preferred-country=IN), [subscription webhooks](https://razorpay.com/docs/webhooks/subscriptions/), [payment webhooks](https://razorpay.com/docs/webhooks/payments/), and [webhook best practices](https://razorpay.com/docs/webhooks/best-practices/).

## Session: August 13, 2026 - Complete Subscription Lifecycle Authority

**Task:** Recheck the current Razorpay subscription documentation and the complete callback/webhook/reconciliation implementation, remove browser-trust ambiguity, and verify every documented subscription event.

### Decision and Implementation

- Retained the authenticated checkout callback. It verifies Razorpay's checkout HMAC, fetches both provider entities server-side, and requires a captured payment whose `subscription_id` matches the active provider subscription before applying settlement. Browser IDs are inputs to verification, never payment authority.
- Added one shared byte-identical app/Functions policy for all 10 documented subscription webhook events and all 9 provider states.
- Added explicit `subscription.authenticated` handling: local status remains `pending`; no entitlement, cash, MRR, payment history, notification, or credit reset occurs.
- Split `subscription.activated` from `subscription.charged`. Activation keeps local status `pending`, records bounded provider/cycle metadata, and sets `capturedPaymentSyncPending: true`; it grants no entitlement. Charged requires a captured payment bound to the same subscription and is the sole recurring event that settles payment, activates entitlement, and resets cycle credits.
- Made `subscription.updated` record validated provider state even when quantity is absent; quantity and MRR change only when a bounded quantity is present.
- Expanded reconciliation to local `pending` rows and provider `expired`, while keeping exact product/tenant/store and transaction-current checks. Reconciliation no longer copies provider `paid_count` or resets credits. Provider-active/cycle convergence requires an existing exact local `pay_*` ledger whose count matches provider truth; otherwise local status is preserved and captured settlement remains pending.
- Completed a second code-review pass over callback, webhook lease, lifecycle transactions, settlement, replacement finalization, and reconciliation. The review fixed canonical `x-razorpay-event-id` admission, collision-safe hashing for unsafe IDs, exact event/provider-status validation before claims, and explicit rejection of charged payloads without matching captured-payment evidence.
- Added out-of-order settlement recovery. A captured `subscription.charged` arriving after local `cancelled`/`completed` records its exact `pay_...` ID, method, and history while preserving terminal local/provider state, consumed credits, and closed entitlement. Terminal replacement carry-forward additionally requires that same exact payment ID in transaction-current billing history.
- Preserved first-purchase classification across partial-failure replay: when settlement committed before a later side effect failed, a retry recognizes the same first `pay_...` entry and cannot downgrade purchased MRR/notification semantics to renewal semantics.

### Verification

| Check | Result |
|---|---|
| Shared lifecycle source policy | Passed: exact 10/10 subscription events and app/Functions byte parity |
| Pure lifecycle contract | Passed: 10/10 events; only `subscription.charged` may settle captured money |
| Firestore emulator lifecycle matrix | Passed: 10/10 events plus `subscription.updated` without quantity; authenticated/activated never settle money or reset credits; charged replay is exactly once; late charged delivery preserves cancelled/completed lifecycle and credits |
| Product-scoped transaction emulator | Passed: replacement carry-forward remains exact-product/exact-scope; unpaid provider-active rows are excluded from server entitlement; payment application rejects non-`pay_*` identities; a terminal replacement requires the exact captured `pay_...` history entry |
| Webhook event identity source contract | Passed: canonical header preference, invalid-header rejection, collision-safe hashing, exact subscription event/status pairs, and captured charge evidence are required before mutation |
| Browser callback authority | Passed source gate: HMAC plus server-side payment/subscription fetch and captured/matching identity requirements |
| Paid-access consumers | Passed: MenuList server DAL, desktop/mobile access helper, AI capacity, top-up settlement, outlet mutations, store-plan mirror, GrowthOS/Public Truth, Answerlattice reads, and resume recovery all require captured/manual payment evidence |
| Checkout/provider isolation | Passed: checkout concurrency, webhook lease, provider-plan registry, reseller online provisioning, and Firestore coordination rules emulator gates |
| Firebase QA reconciliation deploy | Passed: `menulistMaintenanceScheduler` is `ACTIVE` in `us-central1` on Node 22 with hash `3ba1fd91827c88f7bd56959324994d5fd38bb226`; Razorpay key ID/secret bindings remain version 1 |
| QA Firestore subscription shape | Passed read-only aggregate audit: one pending Razorpay row; exact product and tenant/store aliases; valid provider identity and HTTPS checkout URL; array histories; no captured payment and zero entitlement/provider/scope/history anomalies. Its legacy missing `providerStatus` cannot grant access and is resolved from provider truth by checkout recovery. |
| Founder Monitor revenue authority | Passed: current MRR requires verified payment plus a current paid window; past-due MRR requires prior verified payment; unpaid pending checkout is attention-only. Functions subscription assertions, full Founder Monitor boundary suite, and Functions preflight passed before the active QA redeploy. |
| Hosted/provider lifecycle delivery | Superseded by the August 14 evidence above: the 13-event webhook is enabled and `subscription.cancelled` reached the corrected route with HTTP 200; immediate authorization/charge and the original failed-payment automatic retry remain pending external evidence |

Historical August 13 readback after the Functions deploy reported Vercel Preview build `87abeca436e32ab4febaf405dd87f50da73c6d2c`, matching that session's checked-out `HEAD` but not its uncommitted lifecycle hardening. This statement is retained as dated evidence and is superseded by the August 14 hosted builds above. No production deployment was performed.

Primary contracts rechecked: [subscription webhooks](https://razorpay.com/docs/webhooks/subscriptions/), [subscription states](https://razorpay.com/docs/payments/subscriptions/states/), [test lifecycle](https://razorpay.com/docs/payments/subscriptions/test/), and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## Session: July 14, 2026

**Task:** End-to-end Razorpay/subscription cross-check across self-serve Billing, onboarding, Answerlattice, reseller/manual billing, outlet quantity, top-up, webhook, reconciliation, owner desktop/mobile display, and documentation.

### July 16 Paid-Cycle Entitlement Follow-Up

- Cancellation/refund/legal parity exposed that the store and platform plan mirrors were removed as soon as a provider subscription became `cancelled` or `paused`, even though owner access correctly continued through the paid `cycleEndDate`.
- Root and Functions entitlement selection now retains current-cycle cancelled/paused plan mirrors, prefers active rows, and excludes past-due/expired/completed rows. A pure boundary test covers Timestamp-like future/ended cycles and malformed dates.
- The existing leased maintenance scheduler owns `subscription_access_expiry` every 60 minutes. Each run processes at most five 100-row due pages, transactionally rechecks exact scope/status/date, transitions the row to `expired`, synchronizes the mirror, and leaves `billingEntitlementSyncPending` for bounded retry on partial failure.
- The Razorpay webhook Admin emulator proves a status-only processed row, conflicting embedded event identity, and malformed retry state fail closed. Only a complete versioned ledger row can acknowledge a duplicate or become terminal payment truth.
- Top-up settlement boundary tests prove raw/coercible subscription credit and provider-identity fields cannot enter Answerlattice’s store mirror. Source gates require both authenticated callback replay and webhook settlement to use the transaction-current projected subscription rather than a pre-transaction document.
- `firestore.indexes.json` now carries the exact product-prefixed `subscriptions(pId ASC, productId ASC, status ASC, cycleEndDate ASC)` query index. Billing/source/unit, pricing/rules, tenant-safety, TypeScript, Functions lint/build/preflight and dependency gates passed locally.
- The scoped QA index attempt stopped before upload at the Firebase Rules test endpoint with HTTP 403. The scheduler Function attempt passed configured lint/build and stopped before upload at Cloud Resource Manager HTTP 403. No QA index or Function revision changed. Exact retry commands are maintained in `__docs__/owner-action-items.md`.

### Scale-Hardening Follow-Up

- Existing-user subscription/top-up creation now has actor/request-bound server coordination, exact provider recovery identity, and no client contract change.
- A two-minute completed replay checkpoint now keeps an already-running identical request from reacquiring the just-released checkout scope after local persistence. Exact retries reuse the same provider entity, changed intent conflicts during the replay window, and a later deliberate checkout is admitted after expiry.
- Enhancement-pack orders now retain both the requesting outlet and the effective billing store. An inherited-outlet purchase still credits the shared HQ subscription, while the immutable paid transaction is routed to the same HQ history scope rendered by desktop and mobile Billing.
- Provider-plan creation is serialized through the central registry while keeping complete bounded provider pagination and ambiguity recovery.
- Status history retains the latest 100 diagnostic entries; the separate payment idempotency history is unchanged.
- Reconciliation uses concurrency five, a six-minute runtime budget, a durable page cursor, and a 100-row sync-detail cap.
- Reconciliation tests now prove paid-cycle entitlement from the transaction-next provider cycle/status shape, durable pending repair across post-commit failure, and fail-visible cursor cleanup. Terminal transitions cannot leave a stale store/platform plan mirror outside the bounded pending-repair scan.
- The existing scheduler owns one daily compact billing-health summary and prunes at most 200 terminal/stale-processing webhook claims after 90 days. Status-scoped checkout/webhook queries use the exact composite indexes in `firestore.indexes.json`, and terminal webhook rows delete `processingExpiresAt`, so completed checkpoints and terminal events cannot hide real stale work. No standalone scheduler or per-event health collection was added.
- Root TypeScript, scoped root ESLint, Functions lint/build/preflight, billing source/unit gates, the new eight-way checkout concurrency emulator, explicit coordination-rules emulator, payment checkout, onboarding, multi-location, tenant-safety, pricing, Answerlattice runtime, and dependency-freeze gates passed. Documentation scan found 0 broken links; its 9 naming warnings are unrelated existing/founder-video convention files.
- The earlier scoped QA deploy completed Functions predeploy lint/build, then failed during Firestore rules validation with Firebase Rules API HTTP 403 (`The caller does not have permission`). Later rules-only audit retries stopped even earlier with `Failed to authenticate, have you run firebase login?`. No rule, index, or Function revision was uploaded. The current source includes the billing coordination rules, checkout/provider-plan health composites, CMI TTL policy, and the maintained MenuList scoring/scheduler changes, so the complete retry command is `firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerCustomerAnalyticsManually,functions:menulistMaintenanceScheduler --non-interactive`.
- **Pending — owner:** restore non-interactive Firebase CLI authentication and the required `menulist-qa` Firebase Rules/Cloud Resource Manager permissions, rerun the exact scoped deploy, separately release the app through the approved Vercel path, then run the disposable test-mode concurrent/lost-response subscription, top-up, and provider-plan ambiguity matrix in the External Certification Runbook.

### Source-Gate Results

| Check | Result |
|---|---|
| Root TypeScript | Passed: `npx tsc --noEmit` |
| Billing entitlement source gate | Passed: `npm run verify:billing-entitlement-boundary` |
| Billing settlement unit boundaries | Passed: `npm run test:billing-settlement-boundaries` |
| Checkout coordination concurrency | Passed: eight simultaneous claims converge on one attempt; pre-provider expiry alone can renew; provider-start state becomes recovery-only for subscriptions; top-up recovery retains one attempt; provider IDs are first-writer immutable; completed replay, changed-intent conflict, malformed-state refusal, expiry, and ownership release passed in the Firestore emulator |
| Checkout coordination Firestore rules | Passed: authenticated and unauthenticated browser reads/writes were denied for `billingCheckoutLeases` and `billingProviderPlans` |
| Provider-plan registry concurrency | Passed: eight simultaneous claims converge on one owner; provider-start expiry and unversioned rolling-release rows are recovery-only; only expired versioned pre-provider work can be replaced; stale owners cannot start; ready provider identity is immutable; malformed state fails closed |
| Webhook lease/idempotency concurrency | Passed: eight simultaneous claims converge on one owner; active work remains retryable; processed replay is acknowledged; expired/failed work can be re-owned; stale terminal writes cannot downgrade a newer owner; exact terminal replacement prunes stale failure/lease fields; payment-audit replay preserves `createdOn` and rejects event identity collision |
| Browser checkout response boundary | Passed: `npm run test:payment-checkout-boundary` |
| Website onboarding subscription boundary | Passed: `npm run verify:onboarding-subscription-boundary` |
| Reseller desktop/mobile/server boundary | Passed: `npm run verify:reseller-dashboard-boundary` |
| Manual payment confirmation boundary | Passed: `npm run test:reseller-confirm-payment-boundary` |
| Multi-location quantity/replacement boundary | Passed: `npm run verify:multi-location-boundary` |
| MenuList API tenant safety | Passed: `npm run verify:menulist-api-tenant-safety` |
| Pricing integrity | Passed: `npm run verify:pricing-integrity-boundary` |
| Dependency freeze | Passed: `npm run verify:dependency-freeze` |
| Answerlattice billing/runtime parity | Passed: `npm run verify:answerlattice-runtime-truth` |
| Razorpay test-mode read-only preflight | Passed: payments, orders, plans, subscriptions inventory plus valid/tampered webhook-signature self-test; mutation disabled |
| Scoped root ESLint | Passed for all touched billing/reseller/Functions verifier sources |
| MenuList Functions lint/build/preflight | Passed: Functions ESLint, TypeScript build, and `npm run verify:functions-deploy-preflight` |
| Documentation integrity | Passed: 2,380 files and 4,303 internal links scanned; 0 broken links; 9 unrelated existing founder-video naming warnings |
| Patch whitespace integrity | Passed: `git diff --check` |
| QA rules/indexes/scheduler deploy | Pending — owner: earlier attempts stopped at Firebase Rules/Cloud Resource Manager HTTP 403, and the latest audit retries stopped before upload because Firebase CLI authentication is unavailable; no final rule, index, or Function upload occurred |

### Recovery and Owner-Parity Evidence

- Matching pending existing-user checkout retries reuse the same provider `created` subscription. Provider creation followed by a missing local write triggers an ambiguity re-read before cancellation compensation.
- Upgrade intent is stored on the replacement subscription. Both authenticated verification and signed subscription webhooks can cancel the old provider subscription and apply the carry-forward transaction; the client follow-up route is idempotent.
- Signed `order.paid` settles a pending enhancement pack exactly once when the browser callback is lost. It reuses the same immutable order and transaction-current subscription boundaries as authenticated verification.
- Inherited-outlet enhancement-pack orders preserve requesting-outlet settlement scope but record the effective HQ `billingStoreId`; the webhook transaction therefore appears in the shared HQ billing history that desktop and mobile already read.
- Webhook product identity falls back to subscription lookup for payment events whose provider payload omits product notes, preventing Answerlattice failures from being recorded as MenuList.
- Manual reseller renewal and prepaid location-capacity writes use a client-retained operation UUID. Subscription state, immutable reseller transaction, and profile revenue counters commit in one Firestore transaction; replay returns the stored result.
- Desktop and mobile Billing expose recurring mutations only for the signed-in store's direct subscription. Switched-store Billing is read-only; inherited HQ subscription controls remain hidden on both surfaces.
- Manual/prepaid subscription IDs fail before every Razorpay cancel, pause, resume, or upgrade provider call.
- Razorpay plan lookup paginates with `count` and `skip` and fails closed if the bounded scan cannot establish that a lookup key is absent.
- `subscription.updated` already synchronizes a validated provider quantity. The leased Functions reconciler now repairs the same provider/local quantity mismatch if that webhook is missed; the multi-location source gate locks the transaction-current comparison.

### Historical July 14 External Verification Boundary

This July 14 session did not create real provider charges or mutate a production subscription. A disposable Razorpay test-mode account/store was still required to smoke: new subscription, post-persistence identical-request replay, replacement upgrade, cancel, UPI quantity replacement, inherited-outlet HQ history routing, lost-browser top-up webhook recovery, provider-plan lost-response recovery, reseller online payment-link activation, and Answerlattice failure routing. Pause/resume were intentionally unavailable while `ENABLE_SUBSCRIPTION_PAUSE=false`; the rejection path was source-verified, not provider-smoked. The deploy statement below is retained as historical evidence and is superseded by the current August 13 section above for scheduler status.

`firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,firestore:indexes,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerCustomerAnalyticsManually,functions:menulistMaintenanceScheduler --non-interactive`

## Session: May 20, 2026

**Task:** Production audit hardening for Razorpay billing routes, webhook replay protection, and local test-mode payment smoke.

### Changes Verified

| Check | Result |
|-------|--------|
| Root TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Functions TypeScript | Passed: `cd functions && npx tsc --noEmit` |
| Production build | Passed: `npm run build` |
| ESLint | Passed: `npm run lint` |
| Signed webhook idempotency | Passed: first signed `order.paid` returned `status: ok`, exact replay returned `status: duplicate`, one `payment_transactions` row was written |
| Invalid webhook signature | Passed: invalid signature returned 400 before parsing/mutation |
| Authenticated Razorpay test-mode subscription create | Passed: created `starter` monthly subscription in Razorpay test mode |
| Authenticated Razorpay test-mode cancel | Passed: created test subscription cancelled successfully |
| Authenticated top-up order create | Passed: created Razorpay test-mode top-up order |
| Verify-subscription schema | Passed: valid payment id without `razorpay_subscription_id` returns 400 with required-field error |
| Verify-topup bad signature | Passed: valid-shaped IDs with bad signature return 403 |
| Hosted Razorpay top-up checkout | Passed on `https://menulist.online/billing` in Razorpay Test Mode: checkout opened, OTP success completed, and MenuList updated pack balance by +250 credits |
| Billing history formatter | Passed: lean v2 top-up rows and subscription rows normalize without legacy raw payload assumptions |
| Chrome pricing page smoke | Passed: `/pricing` renders plan and credit-pack sections without the previous credit-pack error boundary |
| Local test data cleanup | Passed: deleted the test `subscriptions/{subId}` and `topups/{orderId}` Firestore documents after smoke testing |

### Remaining External Conditions

- Hosted top-up checkout completion was verified on the live domain in Razorpay Test Mode. New subscription checkout, upgrade checkout, pause/resume, and cancellation success paths should be tested with a disposable store/account or explicit approval because the available live account already has an active Premium subscription.
- Live WhatsApp onboarding requires configured Meta WhatsApp Cloud API test/sandbox credentials, a reachable webhook URL, and a test sender number. This session did not run a live WhatsApp provider delivery test.
- Local Upstash DNS failed during testing. `checkRateLimit()` now times out provider calls and opens a short bypass window, but staging/production should still use a healthy Upstash REST endpoint.

---

**Session:** Feb 12, 2026
**Task:** Migrate subscription reconciliation from Vercel API route to Firebase Cloud Function

---

## Changes Made

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `functions/src/billing/reconcileSubscriptions.ts` | **CREATED** | Reconciliation logic using Admin SDK + Razorpay SDK. Exports `reconcileSubscriptions()`. Inlines state machine (mirrors `subscriptionStateMachine.ts`), lazy Razorpay client init, `DB_COLLECTIONS.SUBSCRIPTIONS` for Firestore queries. |
| 2 | `functions/package.json` | MODIFIED | Added `razorpay: ^2.9.6` dependency |
| 3 | `functions/src/constants/features.ts` | MODIFIED | Added `ENABLE_SUBSCRIPTION_RECONCILIATION` feature flag with JSDoc |
| 4 | `functions/src/schedulers/menulistMaintenanceScheduler.ts` | MODIFIED | Owns the leased `subscription_reconciliation` task and the Razorpay secrets needed only by that operational task |
| 5 | `vercel.json` | MODIFIED | Removed Vercel cron for `/api/internal/reconcile-subscriptions` |
| 6 | `src/app/api/internal/reconcile-subscriptions/route.ts` | REMOVED | Deprecated Vercel fallback route removed after Firebase scheduler migration |
| 7 | `__docs__/razorpay/README.md` | MODIFIED | Updated reconciliation line in Key Architecture Facts, added `razorpay_firebase.md` to documents table, updated date |
| 8 | `__docs__/razorpay/active-subscription-flow.md` | MODIFIED | Updated §14.3 (reconciliation section), file inventory (added Firebase Functions table), verification checklist, test cases 8 and security test 3 |
| 9 | `__docs__/razorpay/razorpay_firebase.md` | **CREATED** | Firebase cost tracking for entire billing system |
| 10 | `__docs__/razorpay/razorpay_verification.md` | **CREATED** | This file |
| 11 | `__docs__/changelog.md` | MODIFIED | Added Feb 12, 2026 entry |

---

## Decision Rationale

### Why migrate from Vercel to Firebase Functions?

1. **Timeout and scale:** Vercel serverless functions have a 10s timeout (free) / 60s (pro). Firebase Functions v2 allows 540s (9 min). The active reconciler uses 100-row cursor pages, five concurrent provider fetches, and a six-minute work budget; it resumes on the next leased run instead of relying on one unbounded sequential pass.
2. **No extra cron:** The consolidated maintenance scheduler owns reconciliation as a 2:20 AM UTC leased task. Decision Blocks remains limited to store-EOD analytics/intelligence, and no separate Vercel Cron or standalone scheduled function is added.
3. **Same infrastructure:** Firebase Functions use the service account — no CRON_SECRET needed. Razorpay keys are managed as Firebase secrets, same as other sensitive configs.

### Why inline the state machine instead of sharing?

Firebase Functions (`functions/src/`) cannot import from the Next.js app (`src/`). The state machine is 20 lines of code — inlining with a comment `// mirrors src/lib/billing/subscriptionStateMachine.ts` is simpler and more maintainable than creating a shared package.

### Why lazy Razorpay client init?

Firebase secrets are only available at runtime, not at import time. Lazy initialization ensures the Razorpay client is created only when `reconcileSubscriptions()` is actually called, after secrets are populated.

### Why was the deprecated Vercel route removed?

The temporary Vercel fallback was removed after the leased Firebase scheduler became the only supported reconciliation path. Keeping a callable duplicate reconciler would create two scheduling authorities and stale operational guidance.

---

## Verification Checklist

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (functions/) | ✅ Zero errors |
| `npx tsc --noEmit` (root/) | ✅ Zero errors |
| Feature flag exists in `functions/src/constants/features.ts` | ✅ `ENABLE_SUBSCRIPTION_RECONCILIATION` |
| Secrets declared on scheduler config | ✅ `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Leased scheduler isolation | ✅ `subscription_reconciliation` task in `menulistMaintenanceScheduler.ts` |
| Vercel cron removed | ✅ `vercel.json` is empty `{}` |
| Old Vercel route removed | ✅ No duplicate reconciliation endpoint remains |
| Docs updated: active-subscription-flow.md | ✅ §14.3, file inventory, checklist, tests |
| Docs updated: README.md | ✅ Key facts, documents table |
| Changelog entry added | ✅ Feb 12, 2026 |
| Firebase cost doc created | ✅ `razorpay_firebase.md` |
| State machine mirrors frontend version | ✅ Same transitions, comment references source |
| Admin SDK used (not client SDK) | ✅ `firestoreAdmin` from `../firebaseAdmin` |
| `Timestamp` imported at top level (not inline require) | ✅ Fixed during review |

---

## Historical Improvement Notes — Superseded July 14, 2026

1. **Reconciliation metrics** — Implemented as one compact `systemHealth/billing` snapshot plus bounded alerting instead of an append-only reconciliation log.
2. **Parallel Razorpay fetches** — Implemented with concurrency five, a six-minute work budget, and a durable page cursor.
3. **Shared types package** — Still intentionally deferred. The small mirrored Functions state machine does not justify a new runtime/package boundary.

---

## Items Needing Discussion

None — migration is straightforward with no open questions.
