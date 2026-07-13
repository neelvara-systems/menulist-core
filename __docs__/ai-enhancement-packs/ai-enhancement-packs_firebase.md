# AI Enhancement Packs — Firebase Cost Tracking

**Feature:** AI Enhancement Packs
**Status:** ✅ Runtime Updated
**Last Updated:** July 13, 2026
**Audience:** Developers, DevOps, Cost Auditing

---

## Collections Overview

### Existing Collections (No New Collections Needed)

| Collection             | Path                                           | Purpose                                                    | Status                                |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `menulistAiOperations` | `menulistAiOperations/{tId}/{sId}/{docId}`     | Append-only AI usage event log                             | ✅ Server/Admin write only; active for billable, free, public, and internal AI audit rows |
| `topups`               | `topups/{orderId}`                             | Pack purchase records                                      | ✅ Written by top-up create/verify APIs |
| `subscriptions`        | `subscriptions/{sub_id}` (filtered by tId+sId) | Subscription with `monthlyCredits` + `topUpCredits` fields | ✅ Exists, capacity already built-in  |
| `aiCreditTransactions` | Sub-collection of `menulistAiOperations`       | Legacy credit transaction records                          | ✅ Exists                             |

**Key Decision:** No new Firestore collections are created. All data lives in existing collections with new fields.

### Paid Reservation State

Paid requests reuse the final `menulistAiOperations/{tId}/{sId}/{operationId}` document as a short-lived reservation shell. `accountingStatus` transitions `reserved -> consumed` or `reserved -> refunded`. A reserved shell intentionally omits `createdOn`, so the existing ordered transaction-history query cannot surface unfinished work. It records the exact charged recurring/top-up buckets, billing period, subscription ID, integer units, recovery mode, and remaining balance needed for idempotent settlement or compensation. Settlement writes the normal operation payload and `createdOn`; refunded shells are retained for fourteen days to preserve idempotency evidence and then removed by bounded maintenance.

Interactive reservations receive a 30-minute recovery marker. The existing daily `menulistMaintenanceScheduler.ai_operation_detail_cleanup` task reads at most ten due reservation rows per active store (maximum 200 active stores per run), refunds stale interactive rows, and deletes expired refunded shells. Batch-image reservations use deterministic operation IDs and `durable_retry`; they remain reserved while staged output may be finalized and are refunded by terminal/cancelled/max-attempt worker paths rather than by the interactive timer.

---

## Collection 1: `menulistAiOperations/{tId}/{sId}`

### Purpose

Append-only log of every AI operation. Each document represents one API call to Gemini. This is the **source of truth** for cost reconciliation. Writes are server/Admin-only through `src/lib/ai/operationLog.ts` and `src/lib/ai/accounting.ts`; browser clients can read scoped transaction history but cannot create or mutate operation rows.

### Document Schema

```typescript
{
    // Identity (auto-added by requestBodyComposer)
    tId: number,                    // Tenant ID
    sId: number,                    // Store ID
    uId: string,                    // User ID who triggered the action
    createdOn: Timestamp,           // When the operation occurred
    updatedOn: Timestamp,           // Same as createdOn (append-only, no updates)

    // Operation Details
    action: string,                 // AI_ACTIONS_TYPES value (e.g., "IMAGE_GENERATION")
    projectId: string,              // Project that triggered the operation
    fileId: string,                 // File within the project
    model: string,                  // Gemini model used (e.g., "gemini-2.5-flash-image")

    // Token Usage (from Gemini API response)
    promptTokenCount: number,       // Input tokens consumed
    candidatesTokenCount: number,   // Output tokens generated
    totalTokenCount: number,        // Total tokens (prompt + candidates)
    processingTime: number,         // Duration in milliseconds

    // Cost Accounting (INTERNAL ONLY — never exposed to customers)
    tokenPerCredit: number,         // TOKENS_PER_CREDIT constant (500)
    chargePerCredit: number,        // CHARGE_PER_CREDIT constant (100 paise)
    totalCredits: number,           // totalTokenCount / TOKENS_PER_CREDIT
    totalCharge: number,            // chargePerCredit * totalCredits (in paise)
    unitsConsumed: number,          // Abstract AI units consumed by this operation

    // Deep Tracking: Real Google cost vs our charge vs margin (all in paise)
    realCostPaise: number,          // What Google actually charges us for this operation
    ourChargePaise: number,         // What we charge the customer (units * CHARGE_PER_UNIT_PAISE)
    marginPaise: number,            // ourChargePaise - realCostPaise (profit per operation)

    // Response Data
    clientResponse: any,            // Detailed only in detailed mode; accounting_only stores count/shape summaries
    geminiResponse: any,            // Null in accounting_only; detailed mode stores bounded metadata, not raw provider text
    generationConfig: any,          // Model config summary used for this call
}
```

### Read/Write Patterns

| Operation                | Trigger                       | Frequency       | Reads              | Writes |
| ------------------------ | ----------------------------- | --------------- | ------------------ | ------ |
| **Write**                | Server route/worker after successful AI provider call | Per user action | 0                  | 1      |
| **Read (paginated)**     | Admin views Transactions page | Rare            | pageSize (10-50)   | 0      |
| **Read (by store)**      | Admin filters by store        | Rare            | All docs for store | 0      |
| **Read (by date range)** | Admin filters by date         | Rare            | Filtered subset    | 0      |

### Cost Estimate

| Scenario                                   | Monthly Writes | Monthly Reads           | Firestore Cost |
| ------------------------------------------ | -------------- | ----------------------- | -------------- |
| 100 active tenants, 50 AI ops/month each   | 5,000 writes   | ~500 reads (admin only) | ~$0.03         |
| 500 active tenants, 100 AI ops/month each  | 50,000 writes  | ~2,000 reads            | ~$0.30         |
| 1000 active tenants, 200 AI ops/month each | 200,000 writes | ~5,000 reads            | ~$1.20         |

**Why so cheap:** Append-only pattern means no update costs. Reads are admin-only (paginated), not customer-facing.

### Indexes Required

| Index     | Fields                        | Purpose                              |
| --------- | ----------------------------- | ------------------------------------ |
| Composite | `createdOn` (desc) + `action` | Paginated queries with action filter |
| Composite | `createdOn` (desc)            | Date range queries                   |

**Note:** These indexes may already exist if the Transactions UI was previously tested. Verify in Firebase Console.

### Usage Date Rendering Contract

`createdOn` is stored as a Firestore `Timestamp` for normal operation rows. Browser DAL reads can return a live Firebase `Timestamp` object, while serialized/admin paths can return `{ seconds, nanoseconds }` or `{ _seconds, _nanoseconds }`. Desktop Transactions, Mobile Transactions, and the details modal must format dates through the shared date normalizer instead of passing raw timestamp objects to `Intl` formatters.

---

## Collection 2: `topups/{orderId}`

### Purpose

Record of every AI Enhancement Pack purchase. Links Razorpay order/payment to the capacity increment. The document ID is the Razorpay order ID so verification can be idempotent.

### Document Schema

```typescript
{
    // Identity
    tenantId: number,               // Tenant ID
    storeId: number,                // Store ID that created the order
    userId: string,                 // User ID who purchased
    createdOn: Timestamp,           // Purchase timestamp
    updatedOn: Timestamp,           // Same as createdOn (append-only)

    // Purchase Details
    type: "ai_enhancement_pack",    // Pack type identifier
    packId: string,                 // Internal pack ID
    packName: string,               // Display name at purchase time
    providerOrderId: string,        // Razorpay order ID (provider-agnostic field name)
    providerPaymentId?: string,     // Razorpay payment ID after verification
    amount: number,                 // Price paid (in paise for INR)
    currency: string,               // "INR" or "USD"

    // Capacity
    creditsAdded: number,           // Internal balance added to subscription.topUpCredits

    // Status
    status: "pending" | "paid" | "refunded", // Payment status
    paidAt?: Timestamp,                 // Set after verified capture
    refundedAt?: Timestamp,             // If refunded
    refundReason?: string,              // If refunded
}
```

### Read/Write Patterns

| Operation          | Trigger                               | Frequency    | Reads               | Writes            |
| ------------------ | ------------------------------------- | ------------ | ------------------- | ----------------- |
| **Write pending**  | `create-topup-order`                  | Per purchase attempt | 0             | 1                 |
| **Write paid**     | `verify-topup`                        | Per paid purchase | 1 idempotency read | 1                 |
| **Read**           | Admin views purchase history          | Very rare    | All docs for tenant | 0                 |
| **Write (update)** | Refund processed                      | Very rare    | 1 (find doc)        | 1 (update status) |

### Cost Estimate

| Scenario                  | Monthly Writes | Monthly Reads | Firestore Cost |
| ------------------------- | -------------- | ------------- | -------------- |
| 100 pack purchases/month  | 100 writes     | ~20 reads     | < $0.01        |
| 1000 pack purchases/month | 1,000 writes   | ~100 reads    | < $0.01        |

**Negligible cost.** Pack purchases are infrequent events.

### Idempotency and Tenant Checks

`verify-topup` requires authenticated tenant/store access plus `canManageSubscription`, validates the Razorpay checkout signature, normalizes the checkout order ID through `src/lib/billing/topupDocumentIdBoundary.ts`, reads `topups/{orderId}` before changing the subscription, and writes the credit update plus paid top-up audit record in one Firestore transaction. `create-topup-order` also normalizes the provider order ID before the pending top-up write. Both top-up routes validate the resolved billing tenant/store scope through `normalizeBillingTopupScopeDocumentId()` before top-up provider work, provider-note comparison, Firestore store refs, or top-up writes. If the top-up is already `paid`, the route returns success without adding credits again. If the order is not paid yet, the route fetches the Razorpay order and requires `order.notes.tenantId` and `order.notes.storeId` to match the normalized authenticated billing scope before updating `subscriptions.topUpCredits`.

AI usage reset, reservation, settlement, and refund write through Firestore transactions. Paid AI routes run `checkAICapacity()` and then atomically reserve exact units before the provider call; if a billing-period reset is due, current allowance is applied inside that reservation transaction. After valid output, `finalizeAiOperationAccounting()` promotes the reservation shell into the operation row without a second debit. Provider/pre-settlement failure restores the exact charged buckets once. Reservation deducts recurring `monthlyCredits` first and purchased `topUpCredits` second, leaving top-up balance untouched by billing-cycle resets.

July 1 owner AI permission hardening adds one existing store permission read before expensive AI or capacity work on business copy, campaign caption, description generation, new-item metadata, translation, image generation, image editing, batch image trigger, Menu Card design advisor, SEO generation, AI pack status, and weekly narrative routes. Rejected users can incur the permission read but do not reach capacity checks, media fetches, Cloud Tasks enqueue, provider calls, analytics Firestore reads, insight writes, operation-log writes, or credit consumption. This adds no writes for rejected requests, deletes, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

July 1 batch image Cloud Tasks config preflight keeps rejected misconfigured batch requests ahead of AI capacity reads and task fanout. If the app is missing the worker URL, queue id, project location, project id, or worker secret, `/api/image-generation/batch-trigger` marks the existing batch job failed with owner-safe unavailable copy and does not enqueue Cloud Tasks or call providers. Configured runs keep the existing capacity check, task enqueue, worker secret validation, provider call, Storage upload, accounting, and credit-consumption flow. This adds no new collections, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

July 13 batch-trigger admission now treats limiter infrastructure as required for the expensive Cloud Tasks fanout. `checkBatchOperationLimit()` opts into the shared core limiter's strict provider-error mode; provider unavailability or an unexpected helper failure returns fixed `503` copy plus `Retry-After` before request-body parsing, permission/capacity reads, or task enqueue. Caller quota exhaustion remains `429`. Other shared rate-limit convenience wrappers keep their existing default. This changes no Firestore read/write shape, rule, index, Storage object, Cloud Function, task payload, provider accounting, or credit-debit contract.

July 1 batch image prompt-cache retention is bounded by the consolidated maintenance scheduler. Cache-eligible batch worker misses write a private prepared source object under `system/aiImagePromptCache/` and an `aiImagePromptCache/{cacheKey}` doc with `expiresAt`; cache hits copy source bytes into the requesting store's own `media/menuItem/{tId}/{sId}/...` path and record a free `unitsConsumed: 0` operation. `menulistMaintenanceScheduler` now runs `ai_image_prompt_cache_cleanup` daily, scanning up to 25 expired cache docs, deleting only source paths under `system/aiImagePromptCache/`, and then deleting the cache docs. This changes Firebase Function logic and remains pending live effect until the updated scheduler can be deployed.

---

## Capacity Storage: `subscriptions/{sub_id}` (Existing — No New Fields)

### Architecture Decision: Per-Store, On Subscription (VALIDATED)

> **Per-tenant capacity was REJECTED.** See spec doc Conflict 2 for full rationale.
> Subscriptions, AI operations, projects, and top-ups are all scoped by `{tId}/{sId}`.
> Capacity stays on the subscription document where credits already live.

### Existing Fields Used for Capacity

```typescript
// FirestoreSubscriptionDoc (src/types/razorpay.ts)
// Path: subscriptions/{sub_id} — queried by where("tenantId") + where("storeId")
{
    // ... existing subscription fields ...

    monthlyCreditsAllowance: number,  // Fixed per plan (e.g., 200 for Pro)
    monthlyCredits: number,           // Current balance — resets each billing cycle
    topUpCredits: number,             // Purchased balance — never resets, added by pack purchase
}
```

**No new fields needed.** Capacity = `monthlyCredits + topUpCredits`.

### Read/Write Patterns

| Operation                            | Trigger                                                                      | Frequency         | Reads | Writes |
| ------------------------------------ | ---------------------------------------------------------------------------- | ----------------- | ----- | ------ |
| **Read**                             | Every paid AI operation (capacity check via `getActiveSubscriptionForStore`) | Per user action   | 1     | 0      |
| **Reserve paid credits**             | Before paid provider work (`reserveAiCapacity` transaction)                   | Per paid action   | 2     | 2      |
| **Settle operation shell**           | After successful paid output (`finalizeAiOperationAccounting`)                | Per paid success  | 2     | 1      |
| **Refund reservation**               | Failed paid work that will not retry the same durable output                  | Per failed action | 2     | 2      |
| **Recover due shells**               | Daily consolidated maintenance, max 10 due rows per active store              | Daily             | 0-10  | 0-2 per recovered row |
| **Write (increment `topUpCredits`)** | Pack purchase verify-topup                                                   | Per purchase      | 0     | 1      |
| **Write (reset `monthlyCredits`)**   | Subscription renewal or lazy reset transaction                               | Monthly per store | 0-1   | 1      |

MenuList Billing Subscription Document ID Boundary: capacity-check lazy reset and consumption normalize subscription document IDs before `subscriptions/{subscriptionId}` refs. Valid Razorpay IDs keep the same 0-1 reset write and per-operation consume write; malformed or whitespace-mutated IDs return before reset refs or fail paid credit consumption before debit refs.

### Cost Estimate

| Scenario                             | Monthly Reads | Monthly Writes                         | Firestore Cost |
| ------------------------------------ | ------------- | -------------------------------------- | -------------- |
| 100 stores, 50 paid ops/month each   | 5,000         | 5,000 + 100 (purchases) + 100 (resets) | ~$0.06         |
| 500 stores, 100 paid ops/month each  | 50,000        | 50,000 + 500 + 500                     | ~$0.60         |
| 1000 stores, 200 paid ops/month each | 200,000       | 200,000 + 1000 + 1000                  | ~$2.40         |

### Credit Decrement Pattern

```typescript
// After successful AI operation:
// Re-read the subscription inside a transaction, then decrement
// monthlyCredits first and topUpCredits second.
await firestoreAdmin.runTransaction(async (tx) => {
  const subscriptionSnap = await tx.get(subscriptionRef);
  const subscription = subscriptionSnap.data();
  const monthlyRemaining = Number(subscription.monthlyCredits || 0);
  const topUpRemaining = Number(subscription.topUpCredits || 0);

  const newMonthly = Math.max(0, monthlyRemaining - unitsToConsume);
  const remainder = Math.max(0, unitsToConsume - monthlyRemaining);
  const newTopUp = Math.max(0, topUpRemaining - remainder);

  tx.set(subscriptionRef, {
    monthlyCredits: newMonthly,
    topUpCredits: newTopUp,
    modifiedOn: serverTimestamp,
  }, { merge: true });
});
```

**Why a transaction instead of a plain update?** The decrement needs conditional logic and must re-read the latest balance to avoid missed deductions during concurrent AI requests.

### Balance Sync Optimization (Feb 2026)

Reservation settlement returns `{ monthlyCredits, topUpCredits }` as `remainingBalance`. Paid AI API routes include this in their JSON response. Frontend services call `syncBalanceFromResponse()` which dispatches a `CustomEvent('ai-balance-update')`; `SessionProvider` listens and updates `activeSubscription` state without another Firestore read.

**Result:** Eliminates 1 Firestore read per AI operation on the frontend side. The frontend no longer needs to re-fetch the subscription document after each AI call to update the displayed balance.

---

## Reconciliation Strategy

### Why Both Credit Balance + Event Log?

| Approach                                       | Speed                  | Accuracy                           | Risk                         |
| ---------------------------------------------- | ---------------------- | ---------------------------------- | ---------------------------- |
| Credit balance only (subscription fields)      | Fast (1 read)          | Drift risk                         | Balance could desync         |
| Event log only (sum all events)                | Slow (aggregate query) | Perfect                            | Too slow for real-time check |
| **Both (balance for speed, events for truth)** | **Fast + verifiable**  | **Balance checked against events** | **Minimal**                  |

### Reconciliation Job (Scheduled Function)

A nightly Cloud Function that compares the subscription credit balance against the actual sum of `unitsConsumed` from `menulistAiOperations`:

```
For each store's active subscription:
    1. Sum all unitsConsumed from menulistAiOperations/{tId}/{sId} for current billing period
    2. Compare with (monthlyCreditsAllowance - monthlyCredits) on subscription
    3. If drift > threshold: log warning, investigate
    4. If drift is frequent: alert for investigation
```

**Frequency:** Nightly (via existing Cloud Functions scheduler pattern)
**Cost:** ~1 aggregation query per tenant per night

---

## Total Firebase Cost Projection

### Monthly Cost Summary

| Component                              | 100 tenants | 500 tenants | 1000 tenants |
| -------------------------------------- | ----------- | ----------- | ------------ |
| AI operation events                    | $0.03       | $0.30       | $1.20        |
| Pack purchases                         | < $0.01     | < $0.01     | < $0.01      |
| Subscription capacity checks + updates | $0.06       | $0.60       | $2.40        |
| Reconciliation job                     | < $0.01     | $0.05       | $0.10        |
| **Total**                              | **~$0.10**  | **~$0.95**  | **~$3.70**   |

### Cost vs Revenue

At even 10% pack adoption (10 purchases/month at ₹500 = ₹5,000 revenue):

- Firebase cost: ₹8 (~$0.10)
- **Margin: 99.8%**

At scale (1000 tenants, 100 purchases at ₹500 = ₹50,000 revenue):

- Firebase cost: ₹308 (~$3.70)
- **Margin: 99.4%**

**Firebase costs are negligible relative to Gemini API costs, which are the actual margin driver.**

---

## Security Rules

### Firestore Rules (Required Updates)

```
// menulistAiOperations — server-write only
match /menulistAiOperations/{tId}/{sId}/{docId} {
    allow read: if request.auth != null && request.auth.token.tId == tId;
    allow write: if false;  // Server-only writes via Admin SDK
}

// topups — server-write only
match /topups/{orderId} {
    allow read: if request.auth != null && request.auth.token.tId == resource.data.tenantId;
    allow write: if false;  // Server-only writes via webhook
}

// subscriptions — credit fields are server-managed
match /subscriptions/{subId} {
    // Existing read rules unchanged
    // Deny client writes to credit balance fields
    allow update: if request.auth != null
        && request.auth.token.tId == resource.data.tenantId
        && !request.resource.data.diff(resource.data).affectedKeys()
            .hasAny(['monthlyCredits', 'topUpCredits', 'monthlyCreditsAllowance']);
}
```

**Key Principle:** Credit balance fields (`monthlyCredits`, `topUpCredits`) are NEVER writable from the client. All mutations go through server-side API routes (which use Firebase Admin SDK, bypassing security rules).

### Data Sensitivity Classification

| Field                           | Classification | Who Can See                                                             |
| ------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `monthlyCredits`                | Internal       | Founder/admin only (currently shown in UI — to be removed per doctrine) |
| `topUpCredits`                  | Internal       | Founder/admin only (currently shown in UI — to be removed per doctrine) |
| `unitsConsumed`                 | Internal       | Founder/admin only                                                      |
| `totalCredits`                  | Internal       | Founder/admin only                                                      |
| `totalCharge`                   | Internal       | Founder/admin only                                                      |
| `totalTokenCount`               | Internal       | Founder/admin only                                                      |
| `action`, `projectId`, `fileId` | Operational    | Developer debugging                                                     |
| `providerOrderId`, `amount`     | Financial      | Founder/admin only                                                      |

**Rule:** No capacity, unit, credit, or token data appears in any client-facing API response. The only client-facing signal is `canRunActions: boolean`.

---

## Backup & Data Retention

| Collection                  | Retention                             | Backup                 |
| --------------------------- | ------------------------------------- | ---------------------- |
| `menulistAiOperations`      | Indefinite compact accounting/audit rows; detailed fields pruned when `detailExpiresAt` is due | Daily Firestore export |
| `topups`                    | Indefinite (financial records)        | Daily Firestore export |
| `tenants` (capacity fields) | Active (reset on renewal)             | Part of tenant backup  |

---

## Migration Notes

### Enabling Usage Logging (Day 1)

1. Route billable successful provider calls through `finalizeAiOperationAccounting()`
2. No collection creation needed — `menulistAiOperations` already exists
3. Keep Firestore rules server/Admin-only for writes and tenant/store-scoped for reads
4. Run `npm run verify:ai-accounting`
5. Monitor Firestore usage in console for first 48 hours

### Capacity Enforcement (Day 1)

1. No new fields needed — `monthlyCredits` and `topUpCredits` already exist on subscription documents
2. Add the matching owner permission guard before each paid owner AI API route reaches capacity or provider work
3. Add capacity admission (`checkAICapacity`) and an exact transactional reservation (`reserveAiCapacity`) before each paid provider call
4. Settle the same reservation through `finalizeAiOperationAccounting()` after successful output; refund it on every failure path that will not retry the same durable work
5. User confirmed not live yet — no migration needed (3-year freeze rule)

### Composite Index Creation (Before Launch)

Create in Firebase Console or via `firestore.indexes.json`:

```json
{
  "collectionGroup": "menulistAiOperations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "createdOn", "order": "DESCENDING" },
    { "fieldPath": "action", "order": "ASCENDING" }
  ]
}
```

---

**Document Signature:** Lead Architect (Cascade)
**Last Updated:** February 9, 2026 (v3 — deep tracking fields added, balance sync optimization)
