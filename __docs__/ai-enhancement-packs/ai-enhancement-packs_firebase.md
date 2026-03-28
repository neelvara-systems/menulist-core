# AI Enhancement Packs — Firebase Cost Tracking

**Feature:** AI Enhancement Packs
**Status:** 📝 Specification Complete
**Last Updated:** February 9, 2026
**Audience:** Developers, DevOps, Cost Auditing

---

## Collections Overview

### Existing Collections (No New Collections Needed)

| Collection             | Path                                           | Purpose                                                    | Status                                |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `menulistAiOperations` | `menulistAiOperations/{tId}/{sId}/{docId}`     | Append-only AI usage event log                             | ✅ Exists, logging currently disabled |
| `topups`               | `topups/{tId}/{sId}/{docId}`                   | Pack purchase records                                      | ✅ Exists, empty                      |
| `subscriptions`        | `subscriptions/{sub_id}` (filtered by tId+sId) | Subscription with `monthlyCredits` + `topUpCredits` fields | ✅ Exists, capacity already built-in  |
| `aiCreditTransactions` | Sub-collection of `menulistAiOperations`       | Legacy credit transaction records                          | ✅ Exists                             |

**Key Decision:** No new Firestore collections are created. All data lives in existing collections with new fields.

---

## Collection 1: `menulistAiOperations/{tId}/{sId}`

### Purpose

Append-only log of every AI operation. Each document represents one API call to Gemini. This is the **source of truth** for cost reconciliation.

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
    model: string,                  // Gemini model used (e.g., "gemini-2.0-flash-preview-image-generation")

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
    clientResponse: any,            // What was returned to the client
    geminiResponse: any,            // Raw Gemini API response (for debugging)
    generationConfig: any,          // Model config used for this call
}
```

### Read/Write Patterns

| Operation                | Trigger                       | Frequency       | Reads              | Writes |
| ------------------------ | ----------------------------- | --------------- | ------------------ | ------ |
| **Write**                | Every AI API call             | Per user action | 0                  | 1      |
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

---

## Collection 2: `topups/{tId}/{sId}`

### Purpose

Record of every AI Enhancement Pack purchase. Links Razorpay payment to capacity increment.

### Document Schema

```typescript
{
    // Identity (auto-added by requestBodyComposer)
    tId: number,                    // Tenant ID
    sId: number,                    // Store ID
    uId: string,                    // User ID who purchased
    createdOn: Timestamp,           // Purchase timestamp
    updatedOn: Timestamp,           // Same as createdOn (append-only)

    // Purchase Details
    type: "ai_enhancement_pack",    // Pack type identifier
    providerOrderId: string,        // Razorpay order ID (provider-agnostic field name)
    providerPaymentId: string,      // Razorpay payment ID
    amount: number,                 // Price paid (in paise for INR)
    currency: string,               // "INR" or "USD"

    // Capacity
    unitsAdded: number,             // Internal AI units added to tenant capacity
    packVersion: string,            // "1.0" — for future pack tier identification

    // Status
    status: "completed" | "refunded",   // Payment status
    refundedAt?: Timestamp,             // If refunded
    refundReason?: string,              // If refunded
}
```

### Read/Write Patterns

| Operation          | Trigger                               | Frequency    | Reads               | Writes            |
| ------------------ | ------------------------------------- | ------------ | ------------------- | ----------------- |
| **Write**          | Razorpay verify-topup (pack purchase) | Per purchase | 0                   | 1                 |
| **Read**           | Admin views purchase history          | Very rare    | All docs for tenant | 0                 |
| **Write (update)** | Refund processed                      | Very rare    | 1 (find doc)        | 1 (update status) |

### Cost Estimate

| Scenario                  | Monthly Writes | Monthly Reads | Firestore Cost |
| ------------------------- | -------------- | ------------- | -------------- |
| 100 pack purchases/month  | 100 writes     | ~20 reads     | < $0.01        |
| 1000 pack purchases/month | 1,000 writes   | ~100 reads    | < $0.01        |

**Negligible cost.** Pack purchases are infrequent events.

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
| **Write (decrement credits)**        | After successful AI operation (`updateSubscription`)                         | Per user action   | 0     | 1      |
| **Write (increment `topUpCredits`)** | Pack purchase verify-topup                                                   | Per purchase      | 0     | 1      |
| **Write (reset `monthlyCredits`)**   | Subscription renewal                                                         | Monthly per store | 0     | 1      |

### Cost Estimate

| Scenario                             | Monthly Reads | Monthly Writes                         | Firestore Cost |
| ------------------------------------ | ------------- | -------------------------------------- | -------------- |
| 100 stores, 50 paid ops/month each   | 5,000         | 5,000 + 100 (purchases) + 100 (resets) | ~$0.06         |
| 500 stores, 100 paid ops/month each  | 50,000        | 50,000 + 500 + 500                     | ~$0.60         |
| 1000 stores, 200 paid ops/month each | 200,000       | 200,000 + 1000 + 1000                  | ~$2.40         |

### Credit Decrement Pattern

```typescript
// After successful AI operation:
// Decrement monthlyCredits first, then topUpCredits
import { updateSubscription } from "@database/subscriptions";

const monthlyRemaining = subscription.monthlyCredits || 0;
const topUpRemaining = subscription.topUpCredits || 0;

let newMonthly = monthlyRemaining;
let newTopUp = topUpRemaining;

if (monthlyRemaining >= unitsToConsume) {
  newMonthly = monthlyRemaining - unitsToConsume;
} else {
  const remainder = unitsToConsume - monthlyRemaining;
  newMonthly = 0;
  newTopUp = Math.max(0, topUpRemaining - remainder);
}

await updateSubscription(subscription.id, {
  monthlyCredits: newMonthly,
  topUpCredits: newTopUp,
});
```

**Why not atomic increment?** The decrement needs conditional logic (monthlyCredits first, then topUpCredits). The subscription is fetched in the capacity check step anyway, so the read is already done. The write updates both fields in one call.

### Balance Sync Optimization (Feb 2026)

`consumeAICapacity()` now returns `{ monthlyCredits, topUpCredits }` after the write. All AI API routes include this as `remainingBalance` in their JSON response. Frontend services call `syncBalanceFromResponse()` which dispatches a `CustomEvent('ai-balance-update')`. `SessionProvider` listens and updates `activeSubscription` state.

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
match /topups/{tId}/{sId}/{docId} {
    allow read: if request.auth != null && request.auth.token.tId == tId;
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
| `menulistAiOperations`      | Indefinite (append-only, audit trail) | Daily Firestore export |
| `topups`                    | Indefinite (financial records)        | Daily Firestore export |
| `tenants` (capacity fields) | Active (reset on renewal)             | Part of tenant backup  |

---

## Migration Notes

### Enabling Usage Logging (Day 1)

1. Uncomment `addAiOperation()` in all 6 API routes (see impl doc)
2. No collection creation needed — `menulistAiOperations` already exists
3. No index creation needed initially — existing `createdOn` desc index covers basic queries
4. Monitor Firestore usage in console for first 48 hours

### Capacity Enforcement (Day 1)

1. No new fields needed — `monthlyCredits` and `topUpCredits` already exist on subscription documents
2. Add capacity check (`checkAICapacity`) before each paid AI API route
3. Add credit decrement (`consumeAICapacity`) after each successful AI operation
4. User confirmed not live yet — no migration needed (3-year freeze rule)

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
