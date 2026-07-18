# Razorpay — Firebase Cost Tracking

> **July 16, 2026:** paid-cycle entitlement parity retains the plan mirror for current-cycle cancelled/paused rows and adds one bounded hourly expiry task plus the exact `subscriptions(status ASC, cycleEndDate ASC)` index. The source requires a MenuList index and maintenance-Function deployment; no app/Vercel deploy was performed here.

**Purpose:** Track ALL Firestore reads/writes/deletes for the Razorpay billing system.
**Last Updated:** July 16, 2026

---

## July 14 Scale-Hardening Cost Delta

The long-term hardening adds two central MenuList server-only coordination collections and one compact health document. Answerlattice uses these central coordination records only for shared Razorpay provider orchestration; its subscription, top-up, transaction, store-summary, and entitlement truth remain in Answerlattice Firestore.

| Operation | Collection | Bounded cost | Purpose |
|---|---|---:|---|
| Checkout lease claim | `billingCheckoutLeases` | 1 transaction read + 1 write | Serializes one subscription or top-up create per exact product/tenant/store/kind |
| Provider-created checkpoint | `billingCheckoutLeases` | 1 transaction read + 1 write | Retains exact provider recovery identity when local persistence is uncertain |
| Successful replay checkpoint | `billingCheckoutLeases` | 1 transaction read + 1 write | Retains the exact provider identity for two minutes after local persistence, closing the post-commit/reacquire race; the next admitted attempt overwrites the same scope document after expiry |
| Provider-plan registry hit | `billingProviderPlans` | 1 document read | Reuses a previously resolved Razorpay plan without a provider scan |
| Cold/stale provider-plan claim | `billingProviderPlans` | 1 transaction read + 1 write, then 1 ready write | Allows one provider scan/create owner; concurrent callers only poll the bounded registry |
| Reconciliation checkpoint | `_system/subscriptionReconciliationCursor` | 1 initial read, up to 1 write per complete 100-row page, 1 delete at cycle end | Resumes a large population without rescanning from the beginning after runtime budget exhaustion |
| Daily billing health/retention | `billingCheckoutLeases`, `razorpayWebhookEvents`, `systemHealth/billing`, existing `systemAlerts` | At most 605 observation/retention reads + 1 health write + up to 200 old webhook deletes + 1 alert-cooldown query; attention may add 1 existing alert write | Status-scoped capped observations prevent completed checkout checkpoints or terminal webhook rows from hiding stale processing/provider state; terminal or stale-processing webhook claims older than 90 days are pruned |

`billingCheckoutLeases` and `billingProviderPlans` are explicitly client-denied in `firestore.rules`. One checkout lease document is reused per product/tenant/store/kind, so the completed replay checkpoint does not create an append-only collection. `firestore.indexes.json` contains the exact `billingCheckoutLeases(status, expiresAt)` and `razorpayWebhookEvents(status, processingExpiresAt)` composites used by the status-scoped health queries. Terminal webhook writes delete `processingExpiresAt`, preventing completed/failed events from looking like stale claims. Ninety days exceeds [Razorpay's documented 24-hour webhook retry horizon](https://razorpay.com/docs/webhooks/best-practices/?preferred-country=IN) while preventing the idempotency collection from growing forever. Status-history bounding changes only values already written during a status mutation and adds no read/write. Reconciliation concurrency changes provider-call timing, not the one-fetch-per-admitted-subscription total.

The initial July 14 checkout/recovery section below predates this scale follow-up. Its statement that no collection, rule, or Function changed applies only to that earlier slice; the current source now includes the two coordination collections, their deny rules, the cursor/health scheduler work, and the required scoped Firebase deployment.

Deployment status: local rules-emulator denial coverage and Functions lint/build/preflight pass. On July 16 the scoped index attempt read the current index source and stopped at the Firebase Rules test endpoint with HTTP 403 before upload. The scoped scheduler Function attempt passed configured lint/build and stopped at Cloud Resource Manager HTTP 403 before upload. The current owner-pending target is `firestore:rules,firestore:indexes,functions:menulistMaintenanceScheduler`; no deployed runtime cost or behavior has changed yet.

## Browser Diagnostics Boundary

Desktop and mobile retry-payment and invoice external-link diagnostics are secure logs only. Failed browser opens for Razorpay `shortUrl` and `invoiceUrl` record bounded URL presence/length, subscription status, invoice row presence/length, and source error name/code metadata only. They add no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, Razorpay API calls, cache invalidations, rules, or indexes.

Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`. The source gate is Firebase-cost neutral and performs no provider calls, Firestore writes, Storage writes, deploys, or browser smoke. It checks that payment routes still use bounded bodies, validation, tenant/billing permission checks, rate limits where applicable, server-side Razorpay truth checks before subscription/top-up writes, browser response shape acknowledgement, and entitlement/cache sync anchors.

July 10 transactional lifecycle/upgrade boundary changes ordering and consistency, not the owner-visible billing model. Cancel, pause, resume, webhook, payment, and grace-expiry status/history writes now serialize against the current subscription document. Upgrade carry-forward uses one transaction with two subscription reads and two document writes instead of two independent merge writes; the replacement's existing top-up balance is preserved and the carry marker makes replay a no-op. Entitlement sync reads the source subscription plus the bounded current-active subscription query, then transactionally writes `stores/{storeId}`, `platformSummary/storesSummary`, and the source subscription's `analyticsEntitlement`; cache/screen/assistant invalidation still follows confirmed commit. The existing MenuList `subscriptions` composite index on `status + storeId + tenantId + cycleEndDate` supports the authoritative active-subscription query. No rules, Storage operations, Cloud Functions, scheduled functions, dependencies, owner settings, or Vercel deploy action are added.

The initial July 14 checkout/recovery hardening changed bounded reads and recovery-path writes without adding a collection, index, rule, Cloud Function, dependency, or deployment target at that stage:

- Existing-user subscription creation performs the direct-current subscription lookup plus a pending query capped at 10 documents before provider creation. A matching provider `created` checkout is reused with no new subscription write; a conflicting pending row is rejected; provider-terminal pending rows receive one local expiry write before a new checkout. After provider creation, the route still writes one pending subscription. If that write is ambiguous it re-reads the exact document; if definitively absent it cancels the provider subscription.
- Replacement verification/finalization reads the old and new rows, fetches old provider state, then re-reads both rows in the carry-forward transaction and writes both only on the first application. A retry with the carry marker performs no second credit write. Entitlement synchronization retains its existing scoped mirror reads/writes.
- A signed `order.paid` webhook can now recover a captured top-up when the browser callback is lost. It reads the immutable pending top-up, resolves the current eligible subscription for that exact billing scope, then the shared transaction re-reads both and writes the subscription plus `topups/{orderId}` only once. If browser verification already settled the order, the webhook performs validation/duplicate reads but no second credit write or owner notification. Answerlattice additionally keeps its existing store-summary mirror on a new application.
- Webhook product recovery may read a subscription when payment-only payload notes omit product/scope identity. This prevents a wrong-product write; it does not introduce an unbounded query.
- Razorpay plan pagination itself remains provider-only. The current scale follow-up adds the central registry/lease costs described above while retaining the bounded 100-row, 20-page fail-closed scan.
- Reseller offline renewal/add-location mutations now read the deterministic operation document plus current subscription (and profile when required) in one transaction, then write subscription, operation ledger, and profile counters once. Repeating the same UUID reads the existing operation result and performs no second capacity/revenue write.
- Provider quantity reconciliation reuses the reconciler's existing provider fetch, subscription transaction read, and mismatch-only write; it adds no per-row operation when quantities agree. This existing Functions target requires redeployment. The July 14 scoped QA attempt completed lint/build but stopped before upload with Cloud Resource Manager HTTP 403 for the current caller.

July 6 payment verification rate-limit boundary is Firebase-cost neutral for valid checkout verification. `/api/razorpay/verify-subscription` and `/api/razorpay/verify-topup` now run the shared `PAYMENT_VERIFICATION` limiter with HMAC-hashed authenticated user key material before bounded request-body parsing, Razorpay checkout signature checks, provider payment/order/subscription fetches, payment capture, subscription/top-up reads, or billing writes. The 20-per-hour user ceiling allows normal checkout completion, browser retry, and webhook race recovery while bounding repeated provider verification attempts. Rate-limited attempts stop with 429 before Firestore reads/writes or Razorpay provider calls. This adds no Firestore reads/writes/deletes for valid verification, no provider-call count changes for valid verification, no Storage operations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 5 past-due grace-period display fallback is Firebase-cost neutral. `getGracePeriodDisplayInfo()` centralizes owner-visible countdown/fallback metadata for Desktop Billing, Mobile Billing, and authenticated pricing subscription-management. Valid `pastDueSinceAt` records keep the same countdown; missing or malformed legacy `past_due` records show fixed "Grace period details unavailable." recovery copy. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, Razorpay provider calls, billing route calls, cache invalidations, rules, indexes, schema changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 6 MenuList Billing Subscription Document ID Boundary is Firebase-cost neutral. Valid Razorpay subscription IDs keep the same reads/writes for subscription create/update/get-by-id, AI capacity reset/consume, entitlement sync, and top-up verification. Malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail or return null before Firestore document refs. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations beyond existing entitlement sync, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 10 MenuList Billing Subscription Scope Document ID Boundary is Firebase-cost neutral. The shared boundary now protects both browser and server subscription DALs. Valid tenant/store scope keeps the same direct queries and outlet-to-master fallback; malformed scope fails before query/ref/cache-key construction, and Firestore document IDs override embedded data IDs. This adds no Firestore reads/writes/deletes for valid checks, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 13 MenuList session billing scope admission is Firebase-cost neutral. `resolveBillingScopeFromSession()` now applies the same exact positive document-ID projector before a protected Razorpay route can rate-limit, authorize, call the provider, or read/write billing truth. Explicit pre-onboarding nulls and zero/exponent/whitespace/decimal/unsafe aliases return no scope instead of becoming tenant/store `0`. Valid requests keep the same operations. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 13 MenuList billing-history scope admission is Firebase-cost neutral for valid owners and reduces malformed-request cost. Desktop/mobile now preserve the signed tenant value for exact DAL admission, and `getBillingHistoryForStore()` validates both tenant and store before building the `payment_transactions` query. Valid scope keeps the same bounded newest-50 read. Null, zero, exponent, whitespace, decimal, leading-zero, unsafe, or otherwise malformed scope performs zero reads instead of querying tenant/store `0` or another coerced identity. This changes no writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 6 MenuList Top-Up Order Document ID Boundary is Firebase-cost neutral. Valid Razorpay order IDs keep the same pending top-up write, idempotency read, subscription credit update, and paid audit write. Malformed, reserved, empty, whitespace-mutated, or path-shaped order IDs fail before `topups/{orderId}` document refs. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid Razorpay order/payment verification, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

July 6 MenuList Top-Up Scope Document ID Boundary is Firebase-cost neutral. Valid tenant/store billing scopes keep the same active-subscription read, pending top-up write, provider-note comparison, subscription credit transaction, paid audit write, Founder Monitor side effect, lifecycle/internal notification attempts, and Answerlattice store-summary mirror write. Malformed, reserved, empty, whitespace-mutated, decimal, zero, negative, unsafe, nonnumeric, or path-shaped tenant/store scope IDs fail before provider order creation, provider-note comparison, Firestore store refs, or top-up writes. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid top-up order/payment work, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, Vercel deploy action, or owner-facing settings.

---

## Nightly Reconciliation (`functions/src/billing/reconcileSubscriptions.ts`)

**Trigger:** Leased `subscription_reconciliation` maintenance task at 2:20 AM UTC (Firebase Cloud Function)
**Feature flag:** `ENABLE_SUBSCRIPTION_RECONCILIATION`

| Operation | Collection | Count per run | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Cursor read/checkpoint | `_system/subscriptionReconciliationCursor` | 1 initial read + up to 1 write per complete page | READ/WRITE | Resumes after the last fully processed document; reaching the end deletes the cursor |
| Paged query | `subscriptions` | N reads in 100-row pages | READ | `where('status', 'in', ['active', 'past_due', 'paused'])`, ordered by Firestore document ID; no unbounded snapshot is retained and only five provider fetches run concurrently |
| Transaction re-read | `subscriptions` | N reads | READ | Rechecks authoritative Firestore ID, exact provider ID and current state immediately before any update |
| Update | `subscriptions` | 0-N writes | WRITE | Only writes a mismatch; status history, recovery timestamp, cycle dates, paid count, renew date, billing-period credit reset and `lastWebhook` are committed together |
| Entitlement repair | `subscriptions`, `stores`, `platformSummary` | mismatch-only transaction | READ/WRITE | Reads the triggering subscription plus at most 10 current active subscriptions and writes the authoritative store/platform/subscription mirrors before cache invalidation |

**Cost estimate (per night):**
- **Best case (no mismatches):** approximately 2N reads (paged admission plus transaction recheck), 0 writes
- **Worst case (all mismatched):** approximately 2N base reads + N subscription writes + scoped entitlement transaction reads/writes
- **Typical:** 2N reads and few writes; webhook success keeps reconciliation changes rare

**External API calls (not Firebase):**
- Razorpay `subscriptions.fetch()` — 1 call per alive subscription per night

## Hourly Paid-Cycle Access Expiry (`subscription_access_expiry`)

| Operation | Collection | Bounded cost per run | Type | Description |
|---|---|---:|---|---|
| Due scan | `subscriptions` | Up to 500 document reads across five 100-row pages | READ | Reads only `cancelled`/`paused` rows with `cycleEndDate <= now`, ordered oldest first through the dedicated composite index |
| Transaction recheck | `subscriptions` | Up to 1 read + 1 write per due row | READ/WRITE | Rechecks exact document identity, tenant/store scope, status, and cycle end before changing the row to `expired` and setting the retry marker |
| Entitlement repair | `subscriptions`, `stores`, `platformSummary` | Bounded transaction plus post-commit invalidation per changed row | READ/WRITE/CACHE | Selects at most 10 remaining current paid-cycle rows, writes the authoritative mirrors, then clears the retry marker |

The task performs no Razorpay provider call and creates no per-run/event documents. If entitlement repair fails after the status transaction, `billingEntitlementSyncPending: true` remains on the subscription and the existing bounded pending-entitlement scan retries it. The five-page ceiling prevents an overdue backlog from monopolizing the shared maintenance invocation; later hourly runs continue the oldest due rows.

---

## Webhook Handler (`src/app/api/razorpay/webhook/route.ts`)

The webhook handler fails cheap before Firebase work: missing signature/secret returns immediately, declared payloads above 256KB return 413 before the `WEBHOOK` rate limit is charged, and accepted requests pass the shared IP limiter plus a bounded raw-body reader before HMAC verification. Invalid signatures and malformed JSON do not create Firestore documents.

July 5 normal-path debug cleanup is Firebase-cost neutral. Plan lookup no longer emits the `Searching for Razorpay plan` debug breadcrumb, and webhook handling no longer emits the `Unhandled webhook event type` debug breadcrumb. Existing plan found/create/failure diagnostics and the local `RAZORPAY_WEBHOOK_UNHANDLED_EVENT` audit row remain. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner settings, Firebase deploy requirement, or Vercel deploy action.

| Operation | Collection | Count per event | Type | Description |
|-----------|-----------|----------------|------|-------------|
| Create/read/update | `razorpayWebhookEvents` | 1 transaction + 1 status write | READ/WRITE | Durable replay guard. Claims the event before processing, skips already processed or locked duplicates, and marks processed/failed after handling. |
| Query | `subscriptions` | 1 read | READ | Find subscription by `providerSubscriptionId` |
| Update | `subscriptions` | 1 write | WRITE | Update status, dates, credits, lastWebhook, billingHistory |
| Create | `payment_transactions` | 0-1 write | WRITE | Append-only payment audit log. Webhook storage writes a lean v2 summary instead of the full Razorpay payload; desktop/mobile billing history parse these summaries through a shared formatter and still tolerate legacy raw payload rows. |
| Top-up recovery | `topups`, `subscriptions` | recovery-only transaction | READ/WRITE | On `order.paid`, validates the pending snapshot and settles the exact subscription once; duplicate/already-settled events perform no second credit write. |

**Frequency:** Per webhook event (typically 1-3 events per billing cycle per store)

**Duplicate behavior:** A replayed Razorpay event reads the existing `razorpayWebhookEvents/{eventKey}` lock and returns without writing another `payment_transactions` row or repeating subscription mutations.

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
| `create-topup-order` | Active-subscription admission | 1 | After auth, permission, and rate limit, writes `topups/{orderId}` as an immutable pending snapshot tied to the exact product, owner billing scope, pack, amount, and currency |
| `verify-topup` | Snapshot/current-target reads + 2 transaction re-reads | 0 or 2 | Verifies signature/order/payment, revalidates exact subscription + snapshot in the transaction, updates credits, and marks the order paid exactly once |
| Signed `order.paid` recovery | Snapshot/current-target reads + 2 transaction re-reads | 0 or 2 | Uses the same settlement when browser verification is lost; an already-paid snapshot causes no second credit write |

Provider order/payment identifiers remain in the billing-owned top-up ledger for reconciliation. The Founder Monitor revenue movement side effect uses a hashed movement key and does not copy the raw payment id into the platform read model.

The pending `topups/{orderId}` document is the immutable settlement snapshot. Verification derives product identity from provider notes, requires the request product to match, and reconciles the snapshot against provider order/payment ID, tenant, store, pack, credit amount, smallest-unit amount, and currency before and inside the credit transaction. Missing or divergent snapshots fail closed; live pack constants cannot change a paid order's credits after checkout begins.

Top-up subscription-current boundary: browser verification and signed webhook recovery both resolve the target recorded in the pending snapshot, then re-read that exact document in the settlement transaction. The transaction requires coherent numeric tenant/store aliases, matching product identity (while admitting legacy MenuList rows with no product alias), and nonnegative safe-integer credit fields. A deleted, re-scoped, cross-product, conflicting-alias, or malformed-balance document returns a reconciliation response; it is never recreated with stale identity or credited from a pre-capture balance. A captured payment with a still-valid pending snapshot is recovered by `order.paid`; an invalid subscription/snapshot remains fail-closed for operator reconciliation.

Successful subscription payments use one transaction over `subscriptions/{subscriptionId}`. The provider payment ID is the idempotency key, recurring credits reset only when the persisted billing-period key changes, and top-up credits are never accepted from a stale caller payload. Non-payment provider events use a separate event-keyed subscription transaction so retries and concurrent lifecycle events cannot duplicate or lose status history. `payment_transactions/{webhookEventKey}` is deterministic on webhook replay.

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
| Webhooks | ~3 per store/month | ~3 per store/month plus entitlement mirror on status change | Charged, renewed, failed, paused, resumed, cancelled, completed events. |
| User actions | Bounded route-specific reads | 0-2 subscription writes plus entitlement mirror when status changes | Create also checks current/pending intent; replacement reads old/new twice around the transaction; pause/resume cost 0 provider/Firestore mutation while disabled. |
| Page loads | 1 per session | 0 from browser | Cached after first load; client-side grace expiry no longer attempts forbidden billing writes |

**For 100 admitted subscriptions:** roughly 200 reconciliation reads/night before mismatch-only entitlement repair. Monthly webhook and write volume depends on actual cycles, retries, top-ups, replacements, and failed-payment events; do not use a fixed 100-write estimate for capacity planning.

Malformed or oversized authenticated Razorpay payment action bodies are rejected by bounded JSON parsing before tenant/store reads, provider calls, or Firestore writes. Razorpay payment actions use 8KB caps; onboarding subscription setup uses a 16KB cap after the existing onboarding rate limit and before tenant/store creation.

## Rate Limiter Provider Failure Behavior

Payment mutation routes use Upstash rate limiting before expensive Razorpay/Firebase work. Provider keys keep the route/product bucket names but store only HMAC-hashed authenticated user and tenant key material. This changes no Firestore read/write counts, provider calls, owner-facing settings, rules, indexes, Cloud Function logic, or deploy requirement. If Upstash is slow or unavailable, `checkRateLimit()` now times out provider calls quickly, allows the request, and opens a short in-memory bypass window. The timeout path uses a typed local error code instead of raw exception-message matching. This prevents one Redis DNS/provider outage from adding several seconds to every billing action while still preserving rate limiting when the provider is healthy.
