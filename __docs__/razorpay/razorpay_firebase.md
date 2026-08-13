# Razorpay — Firebase Cost Tracking

> **August 13, 2026 subscription lifecycle delta:** the 10-event shared policy and exact event/status validation add no Firestore operation before an invalid event is rejected. A valid event still creates or reclaims one `razorpayWebhookEvents` lease and writes the existing lean payment audit before event-specific mutation. `subscription.authenticated` adds one event-keyed subscription transaction only while the local row is pending. `subscription.activated` also keeps local `pending`; it writes bounded provider/cycle metadata and `capturedPaymentSyncPending: true` but no entitlement or payment ledger. `subscription.charged` owns captured-payment settlement and may append a late `pay_...` ID to a terminal row without a credit reset or entitlement reopening. `subscription.updated` may write provider status without quantity. The reconciliation query includes local `pending`; it can repair lifecycle metadata but cannot manufacture a payment ID, paid count, credit reset, or entitlement from provider status alone.

> **August 13, 2026 pending-checkout cost delta:** clicking Continue Checkout performs one bounded pending-subscription query and one provider subscription fetch. Safe checkout reuse and 48-hour eMandate `processing` add no Firestore write. A user-triggered stale replacement adds one provider cancellation plus one Firestore transaction read/write to expire the exact pending row before the normal coordinated create path. No scheduler, collection, rule, or index was added. Regular owner, Answerlattice, and reseller-online initial rows now persist `providerStatus: 'created'` with local `pending` status.

> **August 1, 2026 billing limiter outage boundary:** all eight authenticated
> checkout, subscription-mutation, and payment-verification routes fail closed
> on distributed limiter uncertainty. A provider outage returns 503 before any
> Razorpay call or Firestore read/write; actual quota exhaustion remains 429.
> This changes no valid-request Firestore/provider count, schema, rule, index,
> Function, cache, or deployment target.

> **July 28, 2026:** the billing-record product-identity backfill remains dry-run by default and write mode remains project-confirmed. Its scope classifier now reconciles every present `tenantId`/`tId` and `storeId`/`sId` value before proposing a merge. Equal numeric/string legacy aliases remain compatible; conflicts or malformed present aliases are skipped. No backfill was executed.

> **July 22, 2026:** paid-cycle entitlement parity retains the plan mirror for current-cycle cancelled/paused rows. Every owner, settlement, reconciliation, expiry, messaging, AI-recovery, and Founder Monitor subscription path now requires both exact MenuList aliases, with product-prefixed composites such as `subscriptions(pId ASC, productId ASC, status ASC, cycleEndDate ASC)`. The source requires MenuList rules/index/Function deployment; no app/Vercel deploy was performed here.

> **July 22, 2026 bounded-fallback closure:** MenuList entitlement selection and Answerlattice activation/license/intake/server fallbacks constrain both product and tenant/store alias pairs before `limit`. Shared and dedicated index files add `subscriptions(pId, productId, tenantId, storeId, tId, sId)`; exact current rows are reprojected inside entitlement transactions before any store/platform/subscription mirror write.
>
> **July 29, 2026 master-store runtime authority:** MenuList client/Admin outlet entitlement fallback shares one exact tenant `storesList` projector. Coercive IDs, malformed/conflicting activity or master flags, duplicate IDs, multiple masters and ambiguous legacy rows return no master before the fallback subscription query. Valid current lists keep the same reads; no billing or provider write is added.

**Purpose:** Track ALL Firestore reads/writes/deletes for the Razorpay billing system.
**Last Updated:** August 13, 2026

---

## July 14 Scale-Hardening Cost Delta

The long-term hardening adds two central MenuList server-only coordination collections and one compact health document. Answerlattice uses these central coordination records only for shared Razorpay provider orchestration; its subscription, top-up, transaction, store-summary, and entitlement truth remain in Answerlattice Firestore.

| Operation | Collection | Bounded cost | Purpose |
|---|---|---:|---|
| Checkout lease claim | `billingCheckoutLeases` | 1 transaction read + 1 write | Serializes one subscription or top-up create per exact product/tenant/store/kind |
| Provider-create fence | `billingCheckoutLeases` | 1 transaction read + 1 write | Proves the exact attempt still owns an unexpired pre-provider lease, then records that a provider side effect may exist before the network call |
| Provider-created checkpoint | `billingCheckoutLeases` | 1 transaction read + 1 write | Retains exact provider recovery identity when local persistence is uncertain |
| Successful replay checkpoint | `billingCheckoutLeases` | 1 transaction read + 1 write | Retains the exact provider identity for two minutes after local persistence, closing the post-commit/reacquire race; the next admitted attempt overwrites the same scope document after expiry |
| Provider-plan registry hit | `billingProviderPlans` | 1 document read | Reuses a previously resolved Razorpay plan without a provider scan |
| Cold/stale provider-plan claim | `billingProviderPlans` | 1 transaction read + 1 write; a new provider create adds 1 provider-start transaction and 1 ready transaction | Allows one bounded scan owner, proves ownership immediately before provider create, and retains one exact ready provider ID; provider-ambiguous retries scan only |
| Reconciliation checkpoint | `_system/subscriptionReconciliationCursor` | 1 initial read, up to 1 write per complete 100-row page, 1 delete at cycle end | Resumes a large population without rescanning from the beginning after runtime budget exhaustion |
| Daily billing health/retention | `billingCheckoutLeases`, `billingProviderPlans`, `razorpayWebhookEvents`, `systemHealth/billing`, existing `systemAlerts` | At most 908 observation/retention reads + 1 exact health replacement + up to 200 old webhook deletes + 1 alert-cooldown query; attention may add 1 existing alert write | Separate capped observations cover expired pre-provider/provider-ambiguous checkout and plan work, provider-created checkouts, failed/stale webhooks; exact replacement prunes stale health fields; terminal or stale-processing webhook claims older than 90 days are pruned |

`billingCheckoutLeases` and `billingProviderPlans` are explicitly client-denied in `firestore.rules`. One checkout lease document is reused per product/tenant/store/kind, so the completed replay checkpoint does not create an append-only collection. Each new subscription/order provider call adds the checkout provider-create fence transaction; retries that recover an existing provider object do not. Top-up recovery may add one same-document expiry extension while preserving the same unique receipt. One provider-plan document is reused per SHA-256 exact lookup key; the plan registry's provider-start transaction adds no collection growth, while recovery-only ambiguity may add bounded provider reads but no Firestore write until the exact plan is found. `firestore.indexes.json` contains the exact `billingCheckoutLeases(status, expiresAt)`, `billingProviderPlans(status, leaseExpiresAt)`, and `razorpayWebhookEvents(status, processingExpiresAt)` composites used by status-scoped health queries. Ordinary plan registry operations remain exact document reads/transactions. Terminal webhook writes delete `processingExpiresAt`, preventing completed/failed events from looking like stale claims. Ninety days exceeds [Razorpay's documented 24-hour webhook retry horizon](https://razorpay.com/docs/webhooks/best-practices/?preferred-country=IN) while preventing the idempotency collection from growing forever. Status-history bounding changes only values already written during a status mutation and adds no read/write. Reconciliation concurrency changes provider-call timing, not the one-fetch-per-admitted-subscription total.

The initial July 14 checkout/recovery section below predates this scale follow-up. Its statement that no collection, rule, or Function changed applies only to that earlier slice; the current source now includes the two coordination collections, their deny rules, the cursor/health scheduler work, and the required scoped Firebase deployment.

Deployment status: local rules-emulator denial coverage and Functions lint/build/preflight pass. The lifecycle-aware `menulistMaintenanceScheduler` was deployed to `menulist-qa` on August 13 and read back `ACTIVE` in `us-central1` on Node 22 at hash `3ba1fd91827c88f7bd56959324994d5fd38bb226`. A read-only aggregate Firestore audit found one pending Razorpay subscription with exact product and tenant/store aliases, valid provider identity, HTTPS checkout URL, array histories, no captured payment evidence, and zero entitlement/provider/scope/history anomalies. The legacy row has no `providerStatus`; this is non-authoritative and safe because checkout recovery fetches provider truth before mutation or checkout. Founder Monitor now shares the Functions payment-evidence boundary: current MRR requires verified payment and a current paid window, past-due MRR requires prior verified payment, and unpaid pending checkout is attention-only. The Next.js webhook route remains pending the separately approved Vercel staging deployment. The July 16 rules/index HTTP 403 evidence is historical and does not prove the current rules/index target. Re-run the maintained scoped rules/index check before claiming complete Firebase infrastructure parity.

## Browser Diagnostics Boundary

Desktop and mobile retry-payment and invoice external-link diagnostics are secure logs only. Failed browser opens for Razorpay `shortUrl` and `invoiceUrl` record bounded URL presence/length, subscription status, invoice row presence/length, and source error name/code metadata only. They add no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, Razorpay API calls, cache invalidations, rules, or indexes.

Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`. The source gate is Firebase-cost neutral and performs no provider calls, Firestore writes, Storage writes, deploys, or browser smoke. It checks that payment routes still use bounded bodies, validation, tenant/billing permission checks, rate limits where applicable, server-side Razorpay truth checks before subscription/top-up writes, browser response shape acknowledgement, and entitlement/cache sync anchors.

July 10 transactional lifecycle/upgrade boundary changes ordering and consistency, not the owner-visible billing model. Cancel, pause, resume, webhook, payment, and grace-expiry status/history writes now serialize against the current subscription document. Upgrade carry-forward uses one transaction with two subscription reads and two document writes instead of two independent merge writes; the replacement's existing top-up balance is preserved and the carry marker makes replay a no-op. Entitlement sync reads the source subscription plus the bounded exact-dual-`ML` current-active query, then transactionally writes `stores/{storeId}`, `platformSummary/storesSummary`, and the source subscription's `analyticsEntitlement`; cache/screen/assistant invalidation still follows confirmed commit. The MenuList composite on `pId + productId + status + storeId + tenantId + cycleEndDate` supports that authoritative query. Current rules/index/Functions source differs from the undeployed QA target, as recorded above.

The initial July 14 checkout/recovery hardening changed bounded reads and recovery-path writes without adding a collection, index, rule, Cloud Function, dependency, or deployment target at that stage:

- Existing-user subscription creation performs the direct-current subscription lookup plus a pending query capped at 10 documents before provider creation. A matching provider `created` checkout is reused with no new subscription write; a conflicting pending row is rejected; provider-terminal pending rows receive one local expiry write before a new checkout. After provider creation, the route still writes one pending subscription. If that write is ambiguous it re-reads the exact document; if definitively absent it cancels the provider subscription.
- Replacement verification/finalization reads the old and new rows, fetches old provider state, then re-reads both rows in the carry-forward transaction and writes both only on the first application. A retry with the carry marker performs no second credit write. Entitlement synchronization retains its existing scoped mirror reads/writes.
- A signed `order.paid` webhook can now recover a captured top-up when the browser callback is lost. It reads the immutable pending top-up, resolves the current eligible subscription for that exact billing scope, then the shared transaction re-reads both and writes the subscription plus `topups/{orderId}` only once. If browser verification already settled the order, the webhook performs validation/duplicate reads but no second credit write or owner notification. Answerlattice additionally keeps its existing store-summary mirror on a new application.
- Webhook product recovery may read a subscription when payment-only payload notes omit product/scope identity. This prevents a wrong-product write; it does not introduce an unbounded query.
- Razorpay plan pagination itself remains provider-only. The current scale follow-up adds the central registry/lease costs described above while retaining the bounded 100-row, 20-page fail-closed scan.
- Reseller offline renewal/add-location mutations now read the deterministic operation document plus current subscription (and profile when required) in one transaction, then write subscription, operation ledger, and profile counters once. Repeating the same UUID reads the existing operation result and performs no second capacity/revenue write.
- Provider quantity reconciliation reuses the reconciler's existing provider fetch, subscription transaction read, and mismatch-only write; it adds no per-row operation when quantities agree. This existing Functions target requires redeployment. The July 14 scoped QA attempt completed lint/build but stopped before upload with Cloud Resource Manager HTTP 403 for the current caller.

July 6 payment verification rate-limit boundary is Firebase-cost neutral for valid checkout verification. `/api/razorpay/verify-subscription` and `/api/razorpay/verify-topup` now run the shared `PAYMENT_VERIFICATION` limiter with HMAC-hashed authenticated user key material before bounded request-body parsing, Razorpay checkout signature checks, provider payment/order/subscription fetches, payment capture, subscription/top-up reads, or billing writes. The 20-per-hour user ceiling allows normal checkout completion, browser retry, and webhook race recovery while bounding repeated provider verification attempts. Actual quota exhaustion stops with 429; the August 1 correction additionally stops limiter infrastructure uncertainty with 503. Both paths execute before Firestore reads/writes or Razorpay provider calls. This adds no Firestore reads/writes/deletes for valid verification, no provider-call count changes for valid verification, no Storage operations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 5 past-due grace-period display fallback is Firebase-cost neutral. `getGracePeriodDisplayInfo()` centralizes owner-visible countdown/fallback metadata for Desktop Billing, Mobile Billing, and authenticated pricing subscription-management. Valid `pastDueSinceAt` records keep the same countdown; missing or malformed legacy `past_due` records show fixed "Grace period details unavailable." recovery copy. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, Razorpay provider calls, billing route calls, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 6 MenuList Billing Subscription Document ID Boundary is Firebase-cost neutral. Valid Razorpay subscription IDs keep the same reads/writes for subscription create/update/get-by-id, AI capacity reset/consume, entitlement sync, and top-up verification. Malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail or return null before Firestore document refs. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations beyond existing entitlement sync, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 10 MenuList Billing Subscription Scope Document ID Boundary is Firebase-cost neutral. The shared boundary now protects both browser and server subscription DALs. Valid tenant/store scope keeps the same direct queries and outlet-to-master fallback; malformed scope fails before query/ref/cache-key construction, and Firestore document IDs override embedded data IDs. This adds no Firestore reads/writes/deletes for valid checks, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 13 MenuList session billing scope admission is Firebase-cost neutral. `resolveBillingScopeFromSession()` now applies the same exact positive document-ID projector before a protected Razorpay route can rate-limit, authorize, call the provider, or read/write billing truth. Explicit pre-onboarding nulls and zero/exponent/whitespace/decimal/unsafe aliases return no scope instead of becoming tenant/store `0`. Valid requests keep the same operations. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 13 MenuList billing-history scope admission is Firebase-cost neutral for valid owners and reduces malformed-request cost. Desktop/mobile now preserve the signed tenant value for exact DAL admission, and `getBillingHistoryForStore()` validates both tenant and store before building the `payment_transactions` query. Valid scope keeps the same bounded newest-50 read. Null, zero, exponent, whitespace, decimal, leading-zero, unsafe, or otherwise malformed scope performs zero reads instead of querying tenant/store `0` or another coerced identity. This changes no writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 22 product-isolation hardening adds exact `pId: ML` and `productId: ML` predicates to the MenuList history query. The shared rule now admits `payment_transactions` only when both aliases are exactly `ML`, or both are exactly `AL` plus current Answerlattice billing permission and workspace scope. Dedicated Answerlattice rules also require both aliases. This prevents a one-alias query from returning a malformed record whose aliases disagree. Both product index files add `productId` to the existing paid-history composite.

Historical MenuList webhook and subscription rows created by the original request composer already contain `pId: ML` but may predate `productId`. Run `npm run backfill:billing-record-product-identity -- --project-id menulist-qa --collection payment_transactions` and then the same dry-run with `--collection subscriptions`; review counts and backup state before using `--write --confirm-project menulist-qa --all-billing-records` for each collection. The migration scans in 400-row pages and writes only safely classifiable legacy rows; it skips alias-less, conflicting, other-product and malformed-scope records. Production requires the same explicit `menulist` project confirmation. No live migration was run during the audit because Firebase credentials are unavailable.

MenuList active/paused/pending subscription reads now prove exact `pId: ML` plus `productId: ML` in both browser and server DALs. Shared subscription and top-up rules likewise require both exact ML aliases instead of treating every non-AL record as MenuList. Top-up reads additionally require both present/agreeing tenant/store alias pairs before current owner scope is evaluated. A separate exact-product subscription composite preserves existing internal Functions queries while supporting the owner newest-cycle query. Legacy alias-less or conflicting top-up rows remain quarantined from owner reads; no active browser top-up reader exists, and ownership is not inferred from scope alone.

July 6 MenuList Top-Up Order Document ID Boundary is Firebase-cost neutral. Valid Razorpay order IDs keep the same pending top-up write, idempotency read, subscription credit update, and paid audit write. Malformed, reserved, empty, whitespace-mutated, or path-shaped order IDs fail before `topups/{orderId}` document refs. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid Razorpay order/payment verification, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 6 MenuList Top-Up Scope Document ID Boundary is Firebase-cost neutral. Valid tenant/store billing scopes keep the same active-subscription read, pending top-up write, provider-note comparison, subscription credit transaction, paid audit write, Founder Monitor side effect, lifecycle/internal notification attempts, and Answerlattice store-summary mirror write. Malformed, reserved, empty, whitespace-mutated, decimal, zero, negative, unsafe, nonnumeric, or path-shaped tenant/store scope IDs fail before provider order creation, provider-note comparison, Firestore store refs, or top-up writes. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid top-up order/payment work, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

---

## Nightly Reconciliation (`functions/src/billing/reconcileSubscriptions.ts`)

**Trigger:** Leased `subscription_reconciliation` maintenance task at 2:20 AM UTC (Firebase Cloud Function)
**Feature flag:** `ENABLE_SUBSCRIPTION_RECONCILIATION`

| Operation | Collection | Count per run | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Cursor read/checkpoint | `_system/subscriptionReconciliationCursor` | 1 initial read + up to 1 write per complete page + 1 delete at cycle end | READ/WRITE/DELETE | Resumes after the last fully processed document; reaching the end deletes the cursor, and a failed delete fails the leased task instead of reporting a completed cycle |
| Paged query | `subscriptions` | N reads in 100-row pages | READ | `where('status', 'in', ['pending', 'active', 'past_due', 'paused'])`, ordered by Firestore document ID; no unbounded snapshot is retained and only five provider fetches run concurrently |
| Transaction re-read | `subscriptions` | N reads | READ | Rechecks authoritative Firestore ID, exact provider ID and current state immediately before any update |
| Update | `subscriptions` | 0-N writes | WRITE | Only writes an admitted mismatch. Provider state/quantity/renew date may converge, but `active` and cycle advancement require a matching local captured-payment ledger. Reconciliation never writes provider `paid_count` into local payment truth and never resets credits. Missing authority sets `capturedPaymentSyncPending: true`. |
| Entitlement repair | `subscriptions`, `stores`, `platformSummary` | mismatch-only transaction + 1 marker-clear write after complete mirror/cache settlement | READ/WRITE | Derives entitlement from the transaction-next subscription shape, reads the triggering subscription plus at most 10 current paid-cycle subscriptions, writes the authoritative store/platform/subscription mirrors, and clears the durable retry marker only after cache/screen/Business Health invalidation succeeds |

**Cost estimate (per night):**
- **Best case (no mismatches):** approximately 2N reads (paged admission plus transaction recheck), 0 writes
- **Worst case (all mismatched):** approximately 2N base reads + N subscription writes + scoped entitlement transaction reads/writes
- **Typical:** 2N reads and few writes; webhook success keeps reconciliation changes rare

If provider reconciliation commits a status or cycle change that requires a plan-mirror repair, `billingEntitlementSyncPending: true` is part of that same subscription transaction. A failed or interrupted post-commit mirror/cache settlement remains visible to the existing bounded pending-entitlement repair scan, including when the provider transition makes the subscription terminal and removes it from future active reconciliation queries.

### Subscription Payment-Authority Data Shape

| State | Required stored fields | Entitled? |
|---|---|---|
| Checkout created | `status: pending`, `providerStatus: created`, `paymentProvider: razorpay`, `billingHistory: []`, null cycle dates | No |
| Mandate authenticated | local `status: pending`, `providerStatus: authenticated`, empty payment history | No |
| Provider activated before settlement | local `status: pending`, `providerStatus: active`, bounded cycle dates, `capturedPaymentSyncPending: true`, empty payment history | No |
| Captured settlement | `status: active`, exact `pay_*` in `billingHistory`, matching `totalPaymentsMadeCount`, current cycle dates, `capturedPaymentSyncPending: false` | Yes, while the paid cycle/grace policy remains current |
| Manual prepaid | `billingMode: manual`, `manualPaymentConfirmed: true`; no provider subscription API calls | Yes, while the paid cycle remains current |

`billingEntitlementSyncPending` and `capturedPaymentSyncPending` are different: the first means a committed paid lifecycle change still needs store/cache mirror repair; the second means provider lifecycle is active but no local captured-payment authority has been committed.

**External API calls (not Firebase):**
- Razorpay `subscriptions.fetch()` — 1 call per alive subscription per night

## Hourly Paid-Cycle Access Expiry (`subscription_access_expiry`)

| Operation | Collection | Bounded cost per run | Type | Description |
|---|---|---:|---|---|
| Due scan | `subscriptions` | Up to 500 document reads across five 100-row pages | READ | Reads only exact-dual-`ML` `cancelled`/`paused` rows with `cycleEndDate <= now`, ordered oldest first through the product-prefixed composite index |
| Transaction recheck | `subscriptions` | Up to 1 read + 1 write per due row | READ/WRITE | Rechecks exact document identity, tenant/store scope, status, and cycle end before changing the row to `expired` and setting the retry marker |
| Entitlement repair | `subscriptions`, `stores`, `platformSummary` | Bounded transaction plus post-commit invalidation per changed row | READ/WRITE/CACHE | Selects at most 10 remaining current paid-cycle rows, writes the authoritative mirrors, then clears the retry marker |

The task performs no Razorpay provider call and creates no per-run/event documents. If entitlement repair fails after the status transaction, `billingEntitlementSyncPending: true` remains on the subscription and the existing bounded pending-entitlement scan retries it. The five-page ceiling prevents an overdue backlog from monopolizing the shared maintenance invocation; later hourly runs continue the oldest due rows.

---

## Webhook Handler (`src/app/api/razorpay/webhook/route.ts`)

The webhook handler fails cheap before Firebase work: missing signature/secret returns immediately, declared payloads above 256KB return 413 before the `WEBHOOK` rate limit is charged, and accepted requests pass the shared IP limiter plus a bounded raw-body reader before HMAC verification. Invalid signatures and malformed JSON do not create Firestore documents.

July 5 normal-path debug cleanup is Firebase-cost neutral. Plan lookup no longer emits the `Searching for Razorpay plan` debug breadcrumb, and webhook handling no longer emits the `Unhandled webhook event type` debug breadcrumb. Existing plan found/create/failure diagnostics and the local `RAZORPAY_WEBHOOK_UNHANDLED_EVENT` audit row remain. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner settings, Firebase deploy requirement, or Vercel deploy action.

| Operation | Collection | Count per event | Type | Description |
|-----------|-----------|----------------|------|-------------|
| Create/read/update | `razorpayWebhookEvents` | 1 claim transaction + 1 attempt-fenced terminal transaction | READ/WRITE | Durable replay guard. Processed events acknowledge duplicate; active work returns retryable `503`; failed/expired work receives a new owner; stale owners cannot overwrite a newer terminal state. |

Answerlattice top-up credit and store-summary writes remain in the same product-local transaction for new settlement. A paid replay that repairs the store summary first projects the current exact subscription and writes only that admitted identity/credit shape; malformed/coercible or concurrently replaced subscription state returns reconciliation instead of becoming a mirror update.
| Query | `subscriptions` | 1 read | READ | Find subscription by `providerSubscriptionId` |
| Update | `subscriptions` | 1 write | WRITE | Update bounded lifecycle metadata. Only captured callback/`subscription.charged` settlement appends `billingHistory`, clears the captured-payment marker, transitions to entitled active, or resets cycle credits. |
| Create | `payment_transactions` | 0-1 write | WRITE | Append-only payment audit log. Webhook storage writes a lean v2 summary instead of the full Razorpay payload; desktop/mobile billing history parse these summaries through a shared formatter and still tolerate legacy raw payload rows. |
| Legacy identity migration | `payment_transactions` or `subscriptions` | 1 read per scanned row; 1 write per safely classifiable legacy row | MAINTENANCE | Collection must be explicitly selected; dry-run by default, paged at 400, MenuList-project allowlisted, exact project/collection acknowledgement required for writes. Run both collections before the exact-product rule/query release. |
| Top-up recovery | `topups`, `subscriptions` | recovery-only transaction | READ/WRITE | On `order.paid`, validates the pending snapshot and settles the exact subscription once; duplicate/already-settled events perform no second credit write. |

**Frequency:** Per webhook event (typically 1-3 events per billing cycle per store)

**Duplicate behavior:** A replayed processed Razorpay event reads the existing `razorpayWebhookEvents/{eventKey}` lock and returns without writing another `payment_transactions` row or repeating subscription mutations only after the complete versioned persisted identity/state contract is admitted. Missing version/identity/attempt/timestamps, conflicting event keys, malformed retry/provider fields and invalid lease/terminal shapes fail retryably rather than becoming duplicate truth. A replay while the current lease is active returns non-success `503` plus `Retry-After`, preventing a concurrent delivery from suppressing all later provider retries if the original worker crashes. Expired/failed retries are transactionally re-owned and every terminal result is attempt-fenced.

`payment_transactions/{eventKey}` replay uses one transaction read around its merge write so the first valid `createdOn` remains immutable. Product, paired tenant/store scope aliases, event/type, provider entity IDs, amount, currency and provider event time must match exactly; a collision fails closed before merge and `modifiedOn` remains current. The Admin sanitizer preserves Firestore FieldValue transforms. Top-up audit creation is deferred until the existing settlement reads/transaction prove canonical billing scope and immutable value, so it adds no Firestore operation. Unknown non-top-up orders persist at most one unscoped internal audit row and cannot satisfy owner-history queries/rules. Legacy malformed/conflicting rows require guarded review rather than replay reassignment.

Product resolution precedes `razorpayWebhookEvents` claim and every product-local write. Exact declared aliases add no read. A legacy subscription event with no declared product performs one exact subscription-document read in each MenuList and Answerlattice project; this bounded two-read fallback already existed sequentially, but now runs together and does not convert an infrastructure error into not-found. Any read failure returns 503 before persistence, while a unique match selects the correct project.

Payment-failure events keep the same webhook event/status/subscription/alert writes, but persisted remarks and alert messages use fixed local text. Raw Razorpay `error_description` and `error_reason` values are reduced to bounded presence/length metadata on the platform alert.

---

## Verify Subscription (`src/app/api/razorpay/verify-subscription/route.ts`)

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Read | `subscriptions` | 1 read | READ | Find pending/current subscription by provider subscription ID after Razorpay checkout signature, payment status, and payment-subscription ownership are verified server-side |
| Update | `subscriptions` | 1 write | WRITE | Activate subscription (status, dates, credits) |

**Frequency:** Once per new subscription or renewal verification

---

## Create Subscription (`src/app/api/razorpay/create-subscription/route.ts`)

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Direct-current query | `subscriptions` | Bounded query | READ | Rejects an unmarked second current subscription for the signed-in direct store |
| Pending query | `subscriptions` | Up to 10 documents | READ | Reuses an exact intent, blocks a conflict, or expires provider-terminal pending rows |
| Create | `subscriptions` | 0-1 write | WRITE | One pending subscription document only when no reusable provider-created checkout exists |
| Ambiguity check | `subscriptions/{providerSubscriptionId}` | 0-1 read | READ | Re-reads an uncertain local write before deciding whether provider cancellation is required |

The pending subscription document and provider notes use authenticated session identity only; unvalidated browser name/email are ignored. The July 14 current/pending admission reads are the intentional bounded cost increase that prevents duplicate live provider subscriptions.

---

## Onboarding Create Subscription (`src/app/api/onboarding/create-subscription/route.ts`)

| Operation | Collection / Surface | Count per call | Type | Description |
|-----------|----------------------|----------------|------|-------------|
| Create tenant/store/user | `tenants`, `stores`, `users`, `platformSummary` | Existing onboarding transaction | READ/WRITE | Creates the first tenant/store, user mapping, and store summary through `createTenantStoreInTransaction()` |
| Refresh public cache | Next.js cache tags | 0 Firebase ops | CACHE | Calls `revalidateMenuCache(storeId, { tId })` after the transaction commits and before Razorpay subscription creation; failures are bounded and fail open |
| Create pending subscription | `subscriptions` | 1 write | WRITE | New pending subscription document after Razorpay subscription creation |

June 30 security-log boundary note: onboarding subscription security events now use `getBoundedSecurityRouteContext(session, request)` plus existing bounded payment/onboarding metadata. This changes no Firestore reads/writes/deletes, Firebase Auth operations, Razorpay provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

---

## Cancel / Pause / Resume / Upgrade

| Route | Reads | Writes | Description |
|-------|-------|--------|-------------|
| `cancel-subscription` | 1 (fetch direct store sub or provided sub) | 1 (update status) | Sets cancelled/completed, subscriptionEndDate, and bounded structured cancellation reason audit. Uses direct store lookup, not outlet/master fallback. |
| `pause-subscription` | 0 while `ENABLE_SUBSCRIPTION_PAUSE=false` | 0 while disabled | Self-service pause is disabled by default. Route returns unavailable before Razorpay or Firestore mutation. If the flag is enabled later, the route uses the direct store lookup and sets paused. |
| `resume-subscription` | 0 while `ENABLE_SUBSCRIPTION_PAUSE=false` | 0 while disabled | Self-service resume is disabled by default. Route returns unavailable before Razorpay or Firestore mutation. If the flag is enabled later, the route uses the direct store lookup and sets active. |
| `upgrade-subscription` / shared replacement finalizer | Old/new preflight reads + 2 transaction re-reads | 0 or 2 subscription writes | Browser no longer supplies credit authority. Provider cancellation occurs before the atomic carry-forward transaction; replay with `carryForwardFromSubscriptionId` cannot add credits twice. |

---

## DAL — `getActiveSubscriptionForStore()`

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Query | `subscriptions` | 1 read | READ | Primary query (status in active/past_due/cancelled/paused + cycleEndDate >= now) |
| Query | `subscriptions` | 0-1 read | READ | Fallback query for paused subs with expired cycle |
| Query | `subscriptions` | 0-1 read | READ | Fallback query for a visible pending checkout; pending never grants entitlement |
| Master fallback | `tenants` + `subscriptions` | 0-2 reads | READ | When outlet billing is enabled and no direct row exists, resolves and reads the master/HQ entitlement unless the tenant store list is already supplied |
| Update | `subscriptions` | 0 writes from browser | WRITE | Browser reads never mutate billing docs. If grace is over, the browser returns no active access; server-owned paths perform expiry writes and entitlement/cache sync. |

**Frequency:** Every page load in the main app (cached in session provider)

### DAL — `getDirectActiveSubscriptionForStore()`

Mutation routes use the direct lookup variant when no explicit subscription ID is provided.

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Query | `subscriptions` | 1 read | READ | Fetches only the current store subscription and applies grace-period expiry if valid. Does not fall back to a master-location subscription. |
| Update | `subscriptions` | 0-1 write | WRITE | Auto-expire only when the state machine allows `expired`. |

---

## Top-Up Orders

| Route | Reads | Writes | Description |
|-------|-------|--------|-------------|
| `create-topup-order` | Active-subscription admission + pending snapshot create/replay transaction | 1-2 reads, 0-1 writes | After auth, permission, and rate limit, creates `topups/{orderId}` once with exact product, owner scope, billing store, user, pack, amount, and currency; exact pending replay preserves the row and conflicts fail without overwrite |
| `verify-topup` | Snapshot/current-target reads + 2 transaction re-reads | 0 or 2 | Verifies signature/order/payment, revalidates exact subscription + snapshot in the transaction, updates credits, and marks the order paid exactly once |
| Signed `order.paid` recovery | Snapshot/current-target reads + 2 transaction re-reads | 0 or 2 | Uses the same settlement when browser verification is lost; an already-paid snapshot causes no second credit write |

Provider order/payment identifiers remain in the billing-owned top-up ledger for reconciliation. The Founder Monitor revenue movement side effect uses a hashed movement key and does not copy the raw payment id into the platform read model.

The pending `topups/{orderId}` document is the immutable settlement snapshot. Verification requires exact dual product aliases and complete agreeing tenant/store aliases in both provider notes and persisted truth, then reconciles provider order/payment ID, requesting outlet, frozen effective `billingStoreId`, pack/name, credit amount, smallest-unit amount, and currency before and inside the credit transaction. The current subscription must retain the same exact product/tenant/effective-store scope on initial selection, transaction mutation and paid replay. Missing, divergent, colliding or unsafe-integer snapshots fail closed; live pack constants cannot change a paid order's credits after checkout begins.

Top-up subscription-current boundary: browser verification and signed webhook recovery both resolve the target recorded in the pending snapshot, then re-read that exact document in the settlement transaction. The transaction requires both exact product aliases, both complete agreeing numeric tenant/store alias pairs, frozen billing-store equality, nonnegative safe-integer credit fields and a safe resulting sum. A deleted, re-scoped, cross-product, incomplete/conflicting-alias, malformed-balance or overflowed document returns a reconciliation response; it is never recreated with stale identity or credited from a pre-capture balance. A captured payment with a still-valid pending snapshot is recovered by `order.paid`; an invalid subscription/snapshot remains fail-closed for operator reconciliation.

Successful subscription payments use one transaction over `subscriptions/{subscriptionId}`. The provider payment ID is the idempotency key, recurring credits reset only when the persisted billing-period key changes, and top-up credits are never accepted from a stale caller payload. Non-payment provider events use a separate event-keyed subscription transaction so retries and concurrent lifecycle events cannot duplicate or lose status history. `payment_transactions/{webhookEventKey}` is deterministic on webhook replay.

Webhook subscription ownership is resolved before the central idempotency claim. Every subscription-bearing event performs one exact-document read in each product project (two reads total), requires one exact subscription ID across provider entity aliases, requires exactly one stored product owner, and reconciles any explicit exact `ML`/`AL` declaration to that owner. The selected document is reused by the processor, avoiding a third read. Zero matches or read failure returns retryable 503 with no write; dual matches, declaration mismatch, unknown product or conflicting subscription IDs return 400 with no write. Non-subscription payment/order events add no ownership read and retain their exact declaration/legacy MenuList behavior.

Provider subscription scalar projection adds no Firestore operation. Authenticated verification and each signed subscription webhook validate the event/status pair plus exact numeric safe-integer cycle/start/charge seconds, quantity and total/paid counts, and basic ordering before the existing subscription transaction; malformed values produce no subscription write. Charged settlement additionally requires matching captured-payment evidence. Optional cancellation/completion/update times pass the same exact seconds boundary. The leased reconciliation task validates every explicitly present provider timestamp/count/quantity before entering its transaction, so a malformed field cannot be ignored while another status/date field is written. Its read/write budget, cursor, concurrency and scheduler cadence are unchanged.

Replacement evidence adds no read or write. The existing pending/new subscription document must contain a valid exact old-subscription ID paired with exact nonnegative safe-integer prior MRR. Pending checkout reuse validates the stored pair and quantity against current intent. Verification/webhook compare transaction-current and pre-read evidence; finalization revalidates the current new subscription before provider cancellation and the existing carry-forward transaction. Missing nonreplacement evidence is valid, but marker-only, MRR-only, coercible and conflicting states fail without provider or Firestore mutation.

Checkout provider-recovery admission also adds no Firestore operation. It tightens the existing bounded Razorpay search or exact checkpoint fetch before the existing `billingCheckoutLeases` checkpoint and subscription write: provider ID/status/plan, attempt/product/plan notes, canonical tenant/store notes and every present quantity representation must match the current checkout intent. A failed match preserves the recovery/error path and performs no local billing-state mutation.

Upgrade recovery adds no read or write. The route already reads both product-local subscription documents; those rows must now contain paired exact replacement evidence, and a nonduplicate new row must be active before the existing provider fetch/cancel and atomic carry-forward transaction. Missing intent or non-active state returns conflict without provider or Firestore mutation.

Recurring-credit scalar admission adds no Firestore operation. The existing captured-payment transaction compares the persisted reset-period key exactly and accepts only an exact nonnegative safe-integer allowance. A string period is repaired by the normal paid-cycle reset; a malformed allowance aborts the transaction with no billing-history or credit write. The existing leased reconciliation read/write budget is unchanged and applies the same exact period/allowance contract.

## Billing History

Owner-facing desktop/mobile billing history reads the unified payment transaction ledger with:

- tenant/store equality filters
- successful payment/credit events only: `subscription.charged`, `order.paid`, and `owner_referral.reward_issued`
- `created_at desc`
- `limit(50)`

This keeps the billing UI bounded for long-running stores. Ledger writes remain server-only; the browser DAL exposes no payment-transaction creator. The formatter accepts valid seconds/milliseconds, `Date`, and Firestore Timestamp shapes and omits malformed dates instead of presenting them as a payment at the current time. A future full export should use a separate paginated/export path rather than widening the owner page query.

---

## Cost Summary

Frontend payment diagnostic hardening adds no Firestore reads, writes, deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, or owner-visible settings. It changes only browser-side failure diagnostics in `usePaymentHandler`, `useRazorpayScript`, `paymentDiagnostics`, website pricing/credit-pack callers, the website pricing success modal dashboard handoff, desktop billing callers, and mobile billing callers.

June 29 browser billing response-parse hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only caps `usePaymentHandler` route response parsing at 32KB, logs `payment_response_parse_failed` with bounded status/OK/max-byte and plan/pack/subscription metadata, and rejects malformed subscription/order/onboarding payloads through fixed payment failure codes before checkout/session state continues.

June 30 billing action acknowledgement hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only requires successful cancel, pause, resume, and upgrade route responses already returned to the browser to parse as `{ success: true }` before owner success copy or follow-up billing refresh behavior can continue.

June 30 browser billing request-policy hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only routes the existing `usePaymentHandler` create, cancel, pause, resume, upgrade, top-up, onboarding, and verification fetches through no-store cache policy, same-origin credentials, and manual redirect handling before bounded response parsing.

July 1 payment verification acknowledgement hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only requires successful browser verification responses to match the existing route envelopes before resolving checkout success: subscription verification needs `{ success: true, status: "active" }`, and top-up verification needs `{ success: true, newCreditBalance: number }`.

June 30 Razorpay security-context hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only changes authenticated billing route security log metadata so validation failures, billing-permission failures, signature failures, tenant/store mismatches, and mutation mismatch breadcrumbs use bounded presence/length metadata instead of raw user, request, product, subscription, order, payment, tenant, or store identifiers.

July 6 billing mutation scope document-ID boundary is Firebase-cost neutral. Valid billing mutation sessions keep the same one `stores/{storeId}` authorization read, tenant ownership comparison, role permission check, and provider/mutation behavior. `normalizeBillingMutationScopeDocumentId()` rejects malformed, reserved, path-shaped, whitespace-mutated, decimal, zero, negative, unsafe, or nonnumeric tenant/store scope IDs before the shared billing authorization store read or provider work. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond valid existing billing paths, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, Firebase deploy requirement, Vercel deploy action, or owner-visible settings.

July 1 billing mutation target-gate hardening adds no Firestore reads/writes/deletes beyond the existing store read already performed by `canManageBillingMutation()`, no Storage operations, no provider calls beyond valid existing billing paths, no billing route calls, no Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only rejects missing, cross-tenant, inactive, soft-deleted, or platform-blocked store targets before subscription, top-up, cancellation, pause, resume, or upgrade mutation work continues.

Razorpay webhook payment-failure diagnostic hardening adds no Firestore reads/writes beyond the existing webhook event, subscription status, payment transaction, entitlement/reseller, lifecycle/internal notification, and alert writes. It changes only fixed alert/remark text, bounded provider-error metadata, bounded provider event-id/event-key breadcrumbs, and bounded diagnostics for failed non-blocking webhook notification/alert/status-bookkeeping handoffs.

July 14 payment replay and settlement hardening keeps one successful credit application per top-up but adds a signed webhook recovery path and its validation reads. Subscription payment and lifecycle writes use transactions, top-up browser/webhook settlement repeats immutable snapshot reconciliation inside the shared transaction, and webhook audit writes target one deterministic document per provider event. The subscription document keeps a bounded recent `webhookEventHistory` array (maximum 100 keys) for partial-failure retry idempotency. No collection, index, rule, Cloud Function, or cache layer was added.

Authenticated billing mutation notification diagnostic hardening adds no Firestore reads/writes/deletes beyond existing lifecycle/internal notification send attempts and message-log behavior. It changes only bounded diagnostics for failed fire-and-forget notification imports/sends after successful verify-subscription, verify-topup, cancel, pause, resume, and upgrade operations; owner-facing payment responses and billing mutations are unchanged.

Server-side plan creation and entitlement-sync diagnostic hardening adds no Firestore reads/writes/deletes beyond the existing subscription entitlement mirror writes, no Storage operations, no Firebase Auth operation changes, no Cloud Function logic changes, no extra Cloud Function calls, no provider calls beyond the existing Razorpay plan lookup/create calls, no cache invalidations beyond existing entitlement sync tags, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. It changes only diagnostic metadata and the Razorpay plan failure throw text.

Cancellation flow diagnostic hardening adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, provider calls, cache invalidations, Cloud Function logic, rules, indexes, schema changes, tenant-shape changes, or owner-facing settings. It only changes local Razorpay cancellation flow logs from raw subscription/provider/tenant/store/plan identifiers to bounded presence/length metadata and a fixed cancellation failure code.

Subscription verification local-log diagnostic hardening adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, provider calls, cache invalidations, Cloud Function logic, rules, indexes, schema changes, tenant-shape changes, or owner-facing settings. It only moves `verify-subscription` local log user identity from raw top-level `userId` fields into bounded presence/length metadata.

Reconciliation diagnostic hardening adds no Firestore reads/writes/deletes beyond the existing active nightly reconciliation path, no Storage operations, no Firebase Auth operation changes, no extra Cloud Function calls, no provider calls beyond the existing Razorpay subscription fetches, no cache invalidations beyond existing entitlement sync invalidations, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. The deprecated Vercel fallback route at `src/app/api/internal/reconcile-subscriptions/route.ts` has been removed, so reconciliation now runs only from `functions/src/billing/reconcileSubscriptions.ts`.

June 29 Functions reconciliation source-error hardening adds no Firestore reads/writes/deletes beyond the existing active nightly reconciliation path, no Storage operations, no Firebase Auth operation changes, no extra Cloud Function calls, no provider calls beyond the existing Razorpay subscription fetches, no cache invalidations beyond existing entitlement sync invalidations, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. It only caps source error name/code/status metadata before Functions per-subscription failure logs.

Subscription state-machine diagnostic hardening adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, provider calls, cache invalidations, rules, indexes, schema changes, tenant-shape changes, or owner-facing settings. The active reconciliation path now runs as the leased `subscription_reconciliation` task inside `functions/src/schedulers/menulistMaintenanceScheduler.ts`; it is not owned by Decision Blocks.

Onboarding subscription and shared payment error-handler diagnostic hardening adds no Firestore reads/writes/deletes beyond existing onboarding, subscription, and error paths, no Storage operations, no Firebase Auth operation changes, no Cloud Function logic changes, no extra Cloud Function calls, no provider calls, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. June 28 cache-parity hardening adds one existing Next.js public cache revalidation request after successful onboarding tenant/store creation and before provider subscription creation. June 29 local-log hardening changes only validation security breadcrumbs, existing-user attempt diagnostics, success breadcrumbs, and local onboarding payment-log metadata so raw business, user, tenant, store, plan, and subscription identifiers are stored as presence/length metadata only.

| Trigger | Reads/night | Writes/night | Notes |
|---------|-------------|-------------|-------|
| Nightly reconciliation | Approximately 2N | 0-N mismatch writes plus scoped entitlement repair | One paged admission read and one transaction re-read per admitted subscription; provider fetches are external, not Firebase reads. |
| Webhooks | Provider-delivery dependent; at least the recurring lifecycle events actually emitted | One event lease/audit path per admitted delivery plus event-specific subscription/entitlement writes | All 10 subscription events are admitted; duplicates are lease/audit guarded, and only charged settles recurring money. |
| User actions | Bounded route-specific reads | 0-2 subscription writes plus entitlement mirror when status changes | Create also checks current/pending intent; replacement reads old/new twice around the transaction; pause/resume cost 0 provider/Firestore mutation while disabled. |
| Page loads | 1 per session | 0 from browser | Cached after first load; client-side grace expiry no longer attempts forbidden billing writes |

**For 100 admitted subscriptions:** roughly 200 reconciliation reads/night before mismatch-only entitlement repair. Monthly webhook and write volume depends on actual cycles, retries, top-ups, replacements, and failed-payment events; do not use a fixed 100-write estimate for capacity planning.

Malformed or oversized authenticated Razorpay payment action bodies are rejected by bounded JSON parsing before tenant/store reads, provider calls, or Firestore writes. Razorpay payment actions use 8KB caps; onboarding subscription setup uses a 16KB cap after the existing onboarding rate limit and before tenant/store creation.

## Rate Limiter Provider Failure Behavior

Payment mutation routes use Upstash rate limiting before expensive Razorpay/Firebase work. Provider keys keep the route/product bucket names but store only HMAC-hashed authenticated user and tenant key material. This changes no Firestore read/write counts, provider calls, owner-facing settings, rules, indexes, Cloud Function logic, or deploy requirement. If Upstash is slow or unavailable, `checkRateLimit()` now times out provider calls quickly, allows the request, and opens a short in-memory bypass window. The timeout path uses a typed local error code instead of raw exception-message matching. This prevents one Redis DNS/provider outage from adding several seconds to every billing action while still preserving rate limiting when the provider is healthy.
### Exact product and duplicate-scope alias boundary (July 22, 2026)

`subscriptions` and `payment_transactions` reads require exact `pId/productId` plus present, agreeing numeric `tId/tenantId` and `sId/storeId`. Browser list queries constrain all six identity fields; the MenuList composites include `tId` and `sId` alongside product, primary scope, status/event and ordering fields. Server direct reads and every transaction-current payment/webhook/lifecycle/grace/upgrade mutation apply the same projector before writing. Incomplete, conflicting and foreign-product rows fail closed and require guarded migration or manual review.

### Create-only writer and exact pending-reuse boundary (July 22, 2026)

Initial subscription writes use Firestore `create`, so a provider-ID collision fails without replacing the existing record. Payload composition rejects incomplete/conflicting scope aliases and persists both canonical pairs. Direct update helpers use a transaction-current exact-scope read before merge. Pending checkout reuse queries `pId/productId/status/tenantId/storeId/tId/sId` and reprojects the result before any provider fetch or hosted-URL response; the existing exact-scope subscription composites support this equality prefix, so restart 428 adds no index, rule or Functions source change.

### Functions and global-consumer exact scope (July 22, 2026)

MenuList Functions share `functions/src/billing/subscriptionScope.ts`: a subscription is usable only with exact dual `ML` aliases and present, agreeing positive numeric `tId/tenantId` and `sId/storeId`. Reconciliation validates before provider fetch and transaction write; entitlement queries constrain both pairs; paid/manual expiry, pending entitlement repair, AI reservation recovery, lifecycle messaging and Founder Monitor project current scope through the same helper. Conflicting legacy rows are skipped or produce bounded repair errors rather than receiving billing/credit/message side effects.
