# Razorpay — Firebase Cost Tracking

**Purpose:** Track ALL Firestore reads/writes/deletes for the Razorpay billing system.
**Last Updated:** May 20, 2026

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

| Operation | Collection | Count per event | Type | Description |
|-----------|-----------|----------------|------|-------------|
| Create/read/update | `razorpayWebhookEvents` | 1 transaction + 1 status write | READ/WRITE | Durable replay guard. Claims the event before processing, skips already processed or locked duplicates, and marks processed/failed after handling. |
| Query | `subscriptions` | 1 read | READ | Find subscription by `providerSubscriptionId` |
| Update | `subscriptions` | 1 write | WRITE | Update status, dates, credits, lastWebhook, billingHistory |
| Create | `payment_transactions` | 0-1 write | WRITE | Append-only payment audit log. Webhook storage now writes a lean v2 summary instead of the full Razorpay payload; desktop/mobile billing history support both v2 summaries and legacy raw payload rows. |

**Frequency:** Per webhook event (typically 1-3 events per billing cycle per store)

**Duplicate behavior:** A replayed Razorpay event reads the existing `razorpayWebhookEvents/{eventKey}` lock and returns without writing another `payment_transactions` row or repeating subscription mutations.

---

## Verify Subscription (`src/app/api/razorpay/verify-subscription/route.ts`)

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Query | `subscriptions` | 1 read | READ | Find pending subscription |
| Update | `subscriptions` | 1 write | WRITE | Activate subscription (status, dates, credits) |

**Frequency:** Once per new subscription or renewal verification

---

## Create Subscription (`src/app/api/razorpay/create-subscription/route.ts`)

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Create | `subscriptions` | 1 write | WRITE | New subscription document |

---

## Cancel / Pause / Resume / Upgrade

| Route | Reads | Writes | Description |
|-------|-------|--------|-------------|
| `cancel-subscription` | 1 (fetch direct store sub or provided sub) | 1 (update status) | Sets cancelled/completed + subscriptionEndDate. Uses direct store lookup, not outlet/master fallback. |
| `pause-subscription` | 1 (fetch direct store sub or provided sub) | 1 (update status) | Sets paused. Uses direct store lookup, not outlet/master fallback. |
| `resume-subscription` | 1 (fetch direct store sub or provided sub) | 1 (update status) | Sets active. Uses direct store lookup, not outlet/master fallback. |
| `upgrade-subscription` | 1 (fetch old sub) | 1 (expire old sub) | Old sub → expired, new sub created separately |

---

## DAL — `getActiveSubscriptionForStore()`

| Operation | Collection | Count per call | Type | Description |
|-----------|-----------|---------------|------|-------------|
| Query | `subscriptions` | 1 read | READ | Primary query (status in active/past_due/paused + cycleEndDate >= now) |
| Query | `subscriptions` | 0-1 read | READ | Fallback query for paused subs with expired cycle |
| Update | `subscriptions` | 0-1 write | WRITE | Auto-expire if grace period ended (rare) |

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
| `create-topup-order` | 0 | 1 | Creates Razorpay order and writes `topups/{orderId}` as `pending` |
| `verify-topup` | 2 reads | 2 writes | Verifies signature/order/payment, updates subscription credits, and marks `topups/{orderId}` as `paid` in a transaction |

---

## Cost Summary

| Trigger | Reads/night | Writes/night | Notes |
|---------|-------------|-------------|-------|
| Nightly reconciliation | N+1 | 0-2 typical after entitlement backfill | N = active subscriptions. One-time entitlement repair may add store + storesSummary + subscription marker writes for stale records. |
| Webhooks | ~3 per store/month | ~3 per store/month plus entitlement mirror on status change | Charged, renewed, failed, paused, resumed, cancelled, completed events. |
| User actions | 1-2 per action | 1 subscription write plus entitlement mirror when status changes | Cancel, pause, resume, upgrade |
| Page loads | 1 per session | 0 (usually) | Cached after first load |

**For 100 stores:** ~101 reads/night from reconciliation, ~300 webhook reads/month, ~100 writes/month total.

## Rate Limiter Provider Failure Behavior

Payment mutation routes use Upstash rate limiting before expensive Razorpay/Firebase work. If Upstash is slow or unavailable, `checkRateLimit()` now times out provider calls quickly, allows the request, and opens a short in-memory bypass window. This prevents one Redis DNS/provider outage from adding several seconds to every billing action while still preserving rate limiting when the provider is healthy.
