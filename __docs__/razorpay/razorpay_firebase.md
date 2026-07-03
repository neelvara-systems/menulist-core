# Razorpay — Firebase Cost Tracking

**Purpose:** Track ALL Firestore reads/writes/deletes for the Razorpay billing system.
**Last Updated:** June 30, 2026

---

## Browser Diagnostics Boundary

Desktop and mobile retry-payment and invoice external-link diagnostics are secure logs only. Failed browser opens for Razorpay `shortUrl` and `invoiceUrl` record bounded URL presence/length, subscription status, invoice row presence/length, and source error name/code metadata only. They add no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, Razorpay API calls, cache invalidations, rules, or indexes.

Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`. The source gate is Firebase-cost neutral and performs no provider calls, Firestore writes, Storage writes, deploys, or browser smoke. It checks that payment routes still use bounded bodies, validation, tenant/billing permission checks, rate limits where applicable, server-side Razorpay truth checks before subscription/top-up writes, browser response shape acknowledgement, and entitlement/cache sync anchors.

---

## Nightly Reconciliation (`functions/src/billing/reconcileSubscriptions.ts`)

**Trigger:** Nightly scheduler at 2:30 AM UTC (Firebase Cloud Function)
**Feature flag:** `ENABLE_SUBSCRIPTION_RECONCILIATION`

| Operation | Collection | Count per run | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Query | `subscriptions` | 1 read | READ | `where('status', 'in', ['active', 'past_due', 'paused'])` — fetches all alive subs |
| Fetch docs | `subscriptions` | N reads | READ | N = number of alive subscriptions (typically 1 per active store) |
| Update | `subscriptions` | 0-N writes | WRITE | Only writes if mismatch found (status, cycleDates, paidCount, renewsOn, lastWebhook) |

**Cost estimate (per night):**
- **Best case (no mismatches):** 1 query + N doc reads = ~N+1 reads, 0 writes
- **Worst case (all mismatched):** 1 query + N doc reads + N writes
- **Typical:** N+1 reads, 0-2 writes (mismatches are rare — webhooks handle 99%+ of updates)

**External API calls (not Firebase):**
- Razorpay `subscriptions.fetch()` — 1 call per alive subscription per night

---

## Webhook Handler (`src/app/api/razorpay/webhook/route.ts`)

The webhook handler fails cheap before Firebase work: missing signature/secret returns immediately, declared payloads above 256KB return 413 before the `WEBHOOK` rate limit is charged, and accepted requests pass the shared IP limiter plus a bounded raw-body reader before HMAC verification. Invalid signatures and malformed JSON do not create Firestore documents.

| Operation | Collection | Count per event | Type | Description |
|-----------|-----------|----------------|------|-------------|
| Create/read/update | `razorpayWebhookEvents` | 1 transaction + 1 status write | READ/WRITE | Durable replay guard. Claims the event before processing, skips already processed or locked duplicates, and marks processed/failed after handling. |
| Query | `subscriptions` | 1 read | READ | Find subscription by `providerSubscriptionId` |
| Update | `subscriptions` | 1 write | WRITE | Update status, dates, credits, lastWebhook, billingHistory |
| Create | `payment_transactions` | 0-1 write | WRITE | Append-only payment audit log. Webhook storage writes a lean v2 summary instead of the full Razorpay payload; desktop/mobile billing history parse these summaries through a shared formatter and still tolerate legacy raw payload rows. |

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
| Create | `subscriptions` | 1 write | WRITE | New subscription document |

July 1 existing-user subscription identity hardening is Firebase-cost neutral. `create-subscription` still performs the same bounded body parse, validation, tenant/store permission check, rate limit, Razorpay plan/subscription call, and one pending subscription write. The pending subscription document and provider notes now use the authenticated session's name/email only; unvalidated `body.name` and `body.email` are ignored. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid subscription creation, cache invalidations, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

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
| `cancel-subscription` | 1 (fetch direct store sub or provided sub) | 1 (update status) | Sets cancelled/completed + subscriptionEndDate. Uses direct store lookup, not outlet/master fallback. |
| `pause-subscription` | 0 while `ENABLE_SUBSCRIPTION_PAUSE=false` | 0 while disabled | Self-service pause is disabled by default. Route returns unavailable before Razorpay or Firestore mutation. If the flag is enabled later, the route uses the direct store lookup and sets paused. |
| `resume-subscription` | 0 while `ENABLE_SUBSCRIPTION_PAUSE=false` | 0 while disabled | Self-service resume is disabled by default. Route returns unavailable before Razorpay or Firestore mutation. If the flag is enabled later, the route uses the direct store lookup and sets active. |
| `upgrade-subscription` | 2 (fetch old + new sub) | 2 (expire old sub + server-computed carry-forward on new sub) | Browser no longer supplies credit authority. New subscription starts with zero top-up credits; upgrade route computes remaining old credits server-side and stamps `carryForwardFromSubscriptionId` for idempotency. |

---

## DAL — `getActiveSubscriptionForStore()`

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Query | `subscriptions` | 1 read | READ | Primary query (status in active/past_due/paused + cycleEndDate >= now) |
| Query | `subscriptions` | 0-1 read | READ | Fallback query for paused subs with expired cycle |
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
| `create-topup-order` | 1 | 1 | After auth, permission, and rate limit, verifies an active subscription exists before creating Razorpay order and writing `topups/{orderId}` as `pending` |
| `verify-topup` | 2 reads | 2 writes | Verifies signature/order/payment, updates subscription credits, and marks `topups/{orderId}` as `paid` in a transaction |

Provider order/payment identifiers remain in the billing-owned top-up ledger for reconciliation. The Founder Monitor revenue movement side effect uses a hashed movement key and does not copy the raw payment id into the platform read model.

## Billing History

Owner-facing desktop/mobile billing history reads the unified payment transaction ledger with:

- tenant/store equality filters
- successful payment events only: `subscription.charged` and `order.paid`
- `created_at desc`
- `limit(50)`

This keeps the billing UI bounded for long-running stores. A future full export should use a separate paginated/export path rather than widening the owner page query.

---

## Cost Summary

Frontend payment diagnostic hardening adds no Firestore reads, writes, deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, or owner-visible settings. It changes only browser-side failure diagnostics in `usePaymentHandler`, `useRazorpayScript`, `paymentDiagnostics`, website pricing/credit-pack callers, the website pricing success modal dashboard handoff, desktop billing callers, and mobile billing callers.

June 29 browser billing response-parse hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only caps `usePaymentHandler` route response parsing at 32KB, logs `payment_response_parse_failed` with bounded status/OK/max-byte and plan/pack/subscription metadata, and rejects malformed subscription/order/onboarding payloads through fixed payment failure codes before checkout/session state continues.

June 30 billing action acknowledgement hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only requires successful cancel, pause, resume, and upgrade route responses already returned to the browser to parse as `{ success: true }` before owner success copy or follow-up billing refresh behavior can continue.

June 30 browser billing request-policy hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only routes the existing `usePaymentHandler` create, cancel, pause, resume, upgrade, top-up, onboarding, and verification fetches through no-store cache policy, same-origin credentials, and manual redirect handling before bounded response parsing.

July 1 payment verification acknowledgement hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only requires successful browser verification responses to match the existing route envelopes before resolving checkout success: subscription verification needs `{ success: true, status: "active" }`, and top-up verification needs `{ success: true, newCreditBalance: number }`.

June 30 Razorpay security-context hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, billing route calls, Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only changes authenticated billing route security log metadata so validation failures, billing-permission failures, signature failures, tenant/store mismatches, and mutation mismatch breadcrumbs use bounded presence/length metadata instead of raw user, request, product, subscription, order, payment, tenant, or store identifiers.

July 1 billing mutation target-gate hardening adds no Firestore reads/writes/deletes beyond the existing store read already performed by `canManageBillingMutation()`, no Storage operations, no provider calls beyond valid existing billing paths, no billing route calls, no Cloud Functions, indexes, rules, cache invalidations, schema changes, or owner-visible settings. It only rejects missing, cross-tenant, inactive, soft-deleted, or platform-blocked store targets before subscription, top-up, cancellation, pause, resume, or upgrade mutation work continues.

Razorpay webhook payment-failure diagnostic hardening adds no Firestore reads/writes beyond the existing webhook event, subscription status, payment transaction, entitlement/reseller, lifecycle/internal notification, and alert writes. It changes only fixed alert/remark text, bounded provider-error metadata, bounded provider event-id/event-key breadcrumbs, and bounded diagnostics for failed non-blocking webhook notification/alert/status-bookkeeping handoffs.

Authenticated billing mutation notification diagnostic hardening adds no Firestore reads/writes/deletes beyond existing lifecycle/internal notification send attempts and message-log behavior. It changes only bounded diagnostics for failed fire-and-forget notification imports/sends after successful verify-subscription, verify-topup, cancel, pause, resume, and upgrade operations; owner-facing payment responses and billing mutations are unchanged.

Server-side plan creation and entitlement-sync diagnostic hardening adds no Firestore reads/writes/deletes beyond the existing subscription entitlement mirror writes, no Storage operations, no Firebase Auth operation changes, no Cloud Function logic changes, no extra Cloud Function calls, no provider calls beyond the existing Razorpay plan lookup/create calls, no cache invalidations beyond existing entitlement sync tags, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. It changes only diagnostic metadata and the Razorpay plan failure throw text.

Cancellation flow diagnostic hardening adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, provider calls, cache invalidations, Cloud Function logic, rules, indexes, schema changes, tenant-shape changes, or owner-facing settings. It only changes local Razorpay cancellation flow logs from raw subscription/provider/tenant/store/plan identifiers to bounded presence/length metadata and a fixed cancellation failure code.

Subscription verification local-log diagnostic hardening adds no Firestore reads/writes/deletes, Storage operations, Firebase Auth changes, provider calls, cache invalidations, Cloud Function logic, rules, indexes, schema changes, tenant-shape changes, or owner-facing settings. It only moves `verify-subscription` local log user identity from raw top-level `userId` fields into bounded presence/length metadata.

Reconciliation diagnostic hardening adds no Firestore reads/writes/deletes beyond the existing active nightly reconciliation path, no Storage operations, no Firebase Auth operation changes, no extra Cloud Function calls, no provider calls beyond the existing Razorpay subscription fetches, no cache invalidations beyond existing entitlement sync invalidations, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. The deprecated Vercel fallback route at `src/app/api/internal/reconcile-subscriptions/route.ts` has been removed, so reconciliation now runs only from `functions/src/billing/reconcileSubscriptions.ts`.

June 29 Functions reconciliation source-error hardening adds no Firestore reads/writes/deletes beyond the existing active nightly reconciliation path, no Storage operations, no Firebase Auth operation changes, no extra Cloud Function calls, no provider calls beyond the existing Razorpay subscription fetches, no cache invalidations beyond existing entitlement sync invalidations, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. It only caps source error name/code/status metadata before Functions per-subscription failure logs.

Subscription state-machine diagnostic hardening adds no Firestore reads/writes/deletes, no Storage operations, no Firebase Auth operation changes, no extra Cloud Function calls, no provider calls, no cache invalidations, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. It changes only app and Functions warning metadata for invalid or unknown subscription status transitions. Because the active Functions reconciliation mirror is called from `computeDecisionBlocksScores`, the scoped MenuList Functions deploy target is `functions:computeDecisionBlocksScores`.

Onboarding subscription and shared payment error-handler diagnostic hardening adds no Firestore reads/writes/deletes beyond existing onboarding, subscription, and error paths, no Storage operations, no Firebase Auth operation changes, no Cloud Function logic changes, no extra Cloud Function calls, no provider calls, no rules, no indexes, no schema changes, no tenant-shape changes, and no owner-facing settings. June 28 cache-parity hardening adds one existing Next.js public cache revalidation request after successful onboarding tenant/store creation and before provider subscription creation. June 29 local-log hardening changes only validation security breadcrumbs, existing-user attempt diagnostics, success breadcrumbs, and local onboarding payment-log metadata so raw business, user, tenant, store, plan, and subscription identifiers are stored as presence/length metadata only.

| Trigger | Reads/night | Writes/night | Notes |
|---------|-------------|-------------|-------|
| Nightly reconciliation | N+1 | 0-2 typical after entitlement backfill | N = active subscriptions. One-time entitlement repair may add store + storesSummary + subscription marker writes for stale records. |
| Webhooks | ~3 per store/month | ~3 per store/month plus entitlement mirror on status change | Charged, renewed, failed, paused, resumed, cancelled, completed events. |
| User actions | 1-2 per enabled action | 1-2 subscription writes plus entitlement mirror when status changes | Cancel and upgrade/change plan. Pause/resume are feature-flag disabled by default and cost 0 Firestore reads/writes while disabled. |
| Page loads | 1 per session | 0 from browser | Cached after first load; client-side grace expiry no longer attempts forbidden billing writes |

**For 100 stores:** ~101 reads/night from reconciliation, ~300 webhook reads/month, ~100 writes/month total.

Malformed or oversized authenticated Razorpay payment action bodies are rejected by bounded JSON parsing before tenant/store reads, provider calls, or Firestore writes. Razorpay payment actions use 8KB caps; onboarding subscription setup uses a 16KB cap after the existing onboarding rate limit and before tenant/store creation.

## Rate Limiter Provider Failure Behavior

Payment mutation routes use Upstash rate limiting before expensive Razorpay/Firebase work. Provider keys keep the route/product bucket names but store only HMAC-hashed authenticated user and tenant key material. This changes no Firestore read/write counts, provider calls, owner-facing settings, rules, indexes, Cloud Function logic, or deploy requirement. If Upstash is slow or unavailable, `checkRateLimit()` now times out provider calls quickly, allows the request, and opens a short in-memory bypass window. The timeout path uses a typed local error code instead of raw exception-message matching. This prevents one Redis DNS/provider outage from adding several seconds to every billing action while still preserving rate limiting when the provider is healthy.
