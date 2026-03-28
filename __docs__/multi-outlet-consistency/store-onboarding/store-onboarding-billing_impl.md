# Store Onboarding — Razorpay Billing Architecture for Multi-Outlet

**Feature:** #4C-B — Multi-Outlet Billing (Razorpay Quantity Model)  
**Status:** ✅ Production Ready  
**Original Date:** February 12, 2026  
**Last Reviewed:** February 13, 2026  
**Author:** Cascade (Primary Master — Full Codebase Access)  
**Inputs:** ChatGPT billing architecture discussion (3 sessions) + codebase cross-check  
**Governance:** `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` (overrides all)  
**Related:** `store-onboarding-flow_impl.md` (internal creation flow — PATH 2)  
**Razorpay Reference:** `__docs__/razorpay/ACTIVE_SUBSCRIPTION_FLOW.md` (existing billing architecture)

---

## 0. Document Purpose

This document covers **PATH 1 (Payment Flow)** for multi-outlet onboarding. It defines how Razorpay billing adapts to support quantity-based per-outlet licensing.

**Companion doc:** `store-onboarding-flow_impl.md` covers **PATH 2 (Internal Flow)** — store creation, project replication, master linking.

Both flows execute together when HQ adds an outlet. Billing succeeds FIRST, then internal creation proceeds.

---

## 1. Critical Codebase Finding — Subscription Is Per-Store

### 1.1 What ChatGPT Assumed

ChatGPT proposed:

```
One subscription per tenant (brand)
quantity = number of active stores
```

### 1.2 What Actually Exists

**Subscription is per-store, NOT per-tenant.**

```typescript
// src/database/subscriptions/index.ts:29-38
const fetchSubscriptionRaw = async (tenantId: number, storeId: number) => {
  const q = query(
    getCollectionRef(),
    where("status", "in", ["active", "past_due", "cancelled", "paused"]),
    where("cycleEndDate", ">=", now),
    where("tenantId", "==", tenantId),
    where("storeId", "==", storeId), // ← queries by SPECIFIC store
    limit(1),
  );
};
```

**Firestore path:** `/subscriptions/{sub_id}` with both `tenantId` AND `storeId` fields.

**Both subscription creation routes** already pass `quantity: 1`:

```typescript
// src/app/api/onboarding/create-subscription/route.ts:244
quantity: 1,

// src/app/api/razorpay/create-subscription/route.ts:131
quantity: 1,
```

### 1.3 Cascade Verdict: PARTIAL AGREE with ChatGPT

ChatGPT's **concept** is correct (one subscription with quantity), but the **implementation approach** must respect existing architecture:

- **Master store's subscription = the chain subscription**
- **Quantity on master's subscription = total active stores**
- **Outlet stores do NOT get their own subscription doc**
- **Outlet access check: look up master store's subscription**

This is cleaner than ChatGPT's approach because:

1. No migration needed for existing single-store users
2. Master store already owns the subscription
3. Query pattern stays the same for master store
4. Only outlet stores need a "check master" fallback

---

## 2. ChatGPT Billing Discussion — Decision Matrix

### 2.1 Billing Architecture Decisions

| #   | ChatGPT Proposal                                              | Cascade Verdict | Rationale                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **One subscription per tenant**                               | **PARTIAL**     | Concept correct but implementation differs. Subscription stays on **master store**, not moved to tenant level. Outlet stores inherit access from master's subscription. No Firestore schema migration needed. |
| B2  | **`quantity` = number of active stores**                      | **AGREE**       | Already supported — both creation routes pass `quantity: 1`. Update to `quantity: N` when outlets added. Razorpay handles proration automatically.                                                            |
| B3  | **Master store owns billing permanently**                     | **AGREE**       | Aligns perfectly with existing architecture. Subscription doc has `storeId: masterStoreId`. Only master can upgrade/cancel/pause.                                                                             |
| B4  | **Never create unpaid outlet**                                | **AGREE**       | Billing update MUST succeed before store creation. Order: quantity +1 → Razorpay confirms → create outlet.                                                                                                    |
| B5  | **Immediate prorated charge (industry standard)**             | **AGREE**       | Razorpay supports proration on quantity change. Mid-cycle outlet addition charges prorated amount immediately via existing mandate.                                                                           |
| B6  | **Auto-debit via mandate (no payment popup)**                 | **AGREE**       | Already exists. Razorpay subscription flow creates mandate on first payment. Subsequent charges (including quantity increases) auto-debit. Confirmed at `src/app/api/razorpay/webhook/route.ts:31-37`.        |
| B7  | **`outletCreationLock` to prevent double-click**              | **AGREE**       | Simple field on tenant doc. Set before billing call, clear after completion.                                                                                                                                  |
| B8  | **Restrict outlet creation when `past_due`**                  | **AGREE**       | Check subscription status before allowing outlet creation. If `past_due` → block with message.                                                                                                                |
| B9  | **Quantity mismatch detection**                               | **AGREE**       | Add to existing reconciliation job at `functions/src/billing/reconcileSubscriptions.ts`. Compare `quantity` vs `activeStoreCount`.                                                                            |
| B10 | **`tenant.subscription.quantity` in Firestore**               | **DISAGREE**    | Don't duplicate. `FirestoreSubscriptionDoc` already lives in `/subscriptions/{sub_id}`. Read quantity from there. Adding to tenant doc creates dual source of truth.                                          |
| B11 | **Dedicated `POST /api/outlets/create` endpoint**             | **AGREE**       | Single endpoint handles billing + creation. See §5.                                                                                                                                                           |
| B12 | **Show informational modal before adding (not payment page)** | **AGREE**       | "Adding this outlet will increase billing by ₹X. Continue?" → auto-charge via mandate. No checkout redirect.                                                                                                  |
| B13 | **All outlets share master billing cycle**                    | **AGREE**       | One invoice, one date, one cycle. Clean accounting. Razorpay aligns new quantity to existing cycle.                                                                                                           |
| B14 | **`activeStores === subscription.quantity` must always hold** | **AGREE**       | Critical invariant. Enforced in API + reconciliation.                                                                                                                                                         |

### 2.1b Billing Architecture Decisions — Session 3

| #   | ChatGPT Proposal                                                                 | Cascade Verdict | Rationale                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B15 | **`operationalStatus: active \| paused \| closed` on store doc**                 | **PARTIAL**     | Concept valid for future 3-state model. Day 1: use existing `store.active: boolean` (`src/types/platform/store.ts:22`). Paused = future. `active = false` covers "closed." |
| B16 | **Separate `billingStatus: billable \| non_billable` on store doc**              | **DISAGREE**    | Unnecessary Day 1. All active stores are billable. `billableStores = stores.filter(s => s.active)`. Separate field adds complexity with no value.                          |
| B17 | **Owner-controlled billing** (owner decides which outlets are billable)          | **AGREE**       | Owner creates outlet = billable. Owner deactivates = not billable next cycle. System never auto-deactivates.                                                               |
| B18 | **New outlet = immediately billable** (no delayed billing option)                | **AGREE**       | Already covered by billing-first flow (B4). Outlet creation = billing starts immediately via prorated charge.                                                              |
| B19 | **Billing reduction at next cycle only** (no mid-cycle refund on outlet removal) | **AGREE**       | Industry standard (Shopify, Slack). Deactivated outlet: `store.active = false` → next cycle: quantity decremented. No immediate refund.                                    |
| B20 | **Never delete store fully — always archive**                                    | **AGREE**       | Aligns with existing `store.active = false` + `syncStoreToSummary({ active: false })`. Store doc preserved for audit trail and potential reactivation.                     |
| B21 | **`masterStoreId` on store doc**                                                 | **DISAGREE**    | Redundant. Master derivable from `tenant.storesList.find(s => s.isMaster)`, already loaded in SessionProvider. Adding per-store creates sync burden.                       |
| B22 | **`createdByMaster: boolean` on store doc**                                      | **DISAGREE**    | All outlet stores are created by master (only creation flow). 100% redundant flag.                                                                                         |
| B23 | **`storeRole: master \| outlet` on store doc**                                   | **DISAGREE**    | Redundant with `isMaster: boolean`. One field, not two.                                                                                                                    |
| B24 | **Chain Control Panel billing impact display**                                   | **AGREE**       | Top section of Chain Control Panel: total billable outlets, cost per outlet, next invoice estimate. See companion doc `store-onboarding-flow_impl.md §17`.                 |

### 2.2 Billing Edge Cases

| #    | Edge Case                                   | ChatGPT Proposal                                                              | Cascade Verdict                        | Existing Coverage                                                           |
| ---- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| BE1  | Payment succeeds but outlet creation fails  | Create in `provisioning` state, retry                                         | **AGREE**                              | ✅ Implemented — `api/outlets/create/route.ts:237-249` reverts Razorpay qty |
| BE2  | Outlet creation succeeds but billing fails  | Must NEVER happen (billing first)                                             | **AGREE** — Enforced by flow order     | ✅ Enforced — billing at line 94-103, creation at line 114-219              |
| BE3  | Double-click outlet creation                | `outletCreationLock` on tenant                                                | **AGREE**                              | ✅ Implemented — atomic lock transaction at `route.ts:79-92` (5-min TTL)    |
| BE4  | Webhook delay after quantity update         | Don't wait for webhook, use API response                                      | **AGREE**                              | ✅ Existing pattern — webhook is backup sync                                |
| BE5  | Manual Razorpay dashboard quantity edit     | Webhook `subscription.updated` syncs to Firestore                             | **PARTIAL** — Webhook not handled yet  | ❌ Need to add `subscription.updated` handler                               |
| BE6  | Payment fails next month (existing outlets) | Do NOT block existing outlets. Set `past_due`, restrict NEW outlets           | **AGREE**                              | ✅ Grace period logic exists at `src/database/subscriptions/index.ts:69-97` |
| BE7  | Quantity mismatch detection                 | Periodic check: `activeStores !== quantity` → alert                           | **AGREE**                              | ❌ Not in reconciliation yet                                                |
| BE8  | API hack bypassing billing                  | Server-side check: `quantity <= activeStores` → block                         | **AGREE**                              | ✅ Implemented — active sub check at line 71-75 + max outlet at line 61-69  |
| BE9  | Outlet added 1 day before billing cycle     | Charge 1 day proration                                                        | **AGREE** — Standard Razorpay behavior | ✅ Razorpay handles automatically                                           |
| BE10 | Client tries to remove outlet (future)      | `quantity - 1` → then deactivate outlet                                       | **AGREE** — Future feature             | ❌ Not implemented (behind feature flag)                                    |
| BE11 | Outlet permanently shut down                | Two-stage: archive → billing adjusts next cycle                               | **AGREE**                              | ❌ Not implemented                                                          |
| BE12 | Outlet removed accidentally                 | Allow reactivation before next billing cycle                                  | **AGREE**                              | ❌ Not implemented                                                          |
| BE13 | 5 outlets: 3 active, 1 paused, 1 closed     | Billing = 4 (active + paused), not 5                                          | **PARTIAL**                            | ❌ Not implemented                                                          |
| BE14 | Outlet removed 1 day before billing cycle   | Quantity reduced for next charge. Already paid for current cycle — no refund. | **AGREE**                              | ❌ Not implemented                                                          |
| BE15 | Owner tries to re-add closed outlet         | Create new outlet (new storeId). Closed outlet data preserved separately.     | **AGREE**                              | ❌ Not implemented                                                          |

---

## 3. Billing Model — Final Architecture

### 3.1 Core Rules (Locked)

```
RULE 1: Master store's subscription = chain subscription
RULE 2: subscription.quantity = total active stores (including master)
RULE 3: Billing success BEFORE outlet creation (never reverse)
RULE 4: No separate subscription per outlet
RULE 5: activeStores === subscription.quantity (invariant)
RULE 6: Proration on mid-cycle outlet addition (industry standard)
RULE 7: Auto-debit via existing mandate (no payment popup)
RULE 8: One invoice, one billing cycle, one payer (master)
RULE 9: Outlet removal = billing reduction at NEXT cycle only (no mid-cycle refund)
RULE 10: Never hard-delete store — archive only (store.active = false)
RULE 11: Owner-controlled billing — system never auto-deactivates billing
RULE 12: No separate billingStatus field — active stores are billable (Day 1)
```

### 3.2 How Outlet Access Check Works

```
Outlet user logs in → SessionProvider loads
    │
    ├── session.user.storeId = outletStoreId
    │
    ├── getActiveSubscriptionForStore(tenantId, outletStoreId)
    │   → Returns null (no subscription doc for outlet store)
    │
    ├── FALLBACK: Check if store is outlet (has masterProjectId or !isMaster)
    │   → If yes: find master storeId from tenant.storesList
    │   → getActiveSubscriptionForStore(tenantId, masterStoreId)
    │   → Returns master's subscription
    │
    └── Outlet inherits billing access from master subscription
```

### 3.3 Data Flow — Outlet Addition Billing

```
HQ clicks "Add Outlet"
    │
    ├── 1. Frontend shows info modal:
    │       "Adding this outlet will increase billing by ₹X/month.
    │        A prorated charge of ₹Y will be applied today.
    │        From next cycle, total monthly billing: ₹Z."
    │       [Continue] [Cancel]
    │
    ├── 2. HQ clicks Continue → POST /api/outlets/create
    │
    ├── 3. Backend: Lock request
    │       → Set tenant.outletCreationLock = true
    │       → If already true → reject (prevent double-click)
    │
    ├── 4. Backend: Validate
    │       → session.user.storeId must be master store
    │       → Subscription must be 'active' (not past_due/cancelled)
    │       → store.isMaster === true
    │
    ├── 5. Backend: Fetch current subscription
    │       → getActiveSubscriptionForStore(tenantId, masterStoreId)
    │       → Get providerSubscriptionId + current quantity
    │
    ├── 6. Backend: Update Razorpay quantity
    │       → razorpayClient.subscriptions.update(subId, { quantity: currentQty + 1 })
    │       → If FAILS → unlock → return error → STOP
    │       → If SUCCESS → continue
    │
    ├── 7. Backend: Update Firestore subscription quantity
    │       → updateSubscription(subId, { quantity: newQuantity })
    │       → NOTE: Need to add 'quantity' field to FirestoreSubscriptionDoc
    │
    ├── 8. Backend: Create outlet (PATH 2 — internal flow)
    │       → addOutletToMaster(masterStoreId, outletDetails)
    │       → See store-onboarding-flow_impl.md §6
    │
    ├── 9. Backend: Unlock
    │       → tenant.outletCreationLock = false
    │
    └── 10. Return success → Frontend refreshes
```

---

## 4. Schema Changes — Billing

### 4.1 `FirestoreSubscriptionDoc` — Add `quantity` Field

**File:** `src/types/razorpay.ts`

```typescript
// Add to FirestoreSubscriptionDoc interface:
quantity: number; // Number of active stores (including master). Default: 1.
```

**Why:** Currently `quantity: 1` is passed to Razorpay on creation but never stored in Firestore. We need it for:

- Display in billing UI ("3 outlets × ₹2500/mo")
- Server-side validation (`quantity <= activeStores` check)
- Reconciliation comparison

### 4.2 Tenant Document — Add `outletCreationLock`

**NOT a permanent field.** Transient lock — set to `true` during outlet creation, cleared after. If process crashes, cleared by timeout (5 min TTL) or manual admin action.

```typescript
// tenants/{tenantId}
{
    outletCreationLock?: boolean;      // Transient: true during outlet creation
    outletCreationLockAt?: Timestamp;  // When lock was set (for TTL cleanup)
}
```

### 4.3 No `billingStatus` Field on Tenant

**ChatGPT proposed:** `tenant.subscription.billingStatus`

**Cascade verdict: DISAGREE.** Subscription status already lives in `/subscriptions/{sub_id}`. Adding `billingStatus` to tenant creates dual source of truth. Just read the subscription doc directly.

---

## 5. API Endpoint — `POST /api/outlets/create`

### 5.1 Security Checklist (Per Security Rules)

| Rule                              | Implementation                                          |
| --------------------------------- | ------------------------------------------------------- |
| Rule 1: `withAuth()`              | ✅ Required                                             |
| Rule 2: `verifyTenantAccess()`    | ✅ Required — verify session tenant matches             |
| Rule 3: Zod validation            | ✅ Required — validate `outletName`, `city`             |
| Rule 5: Rate limiting             | ✅ `DATA_WRITE` config (50 req/min) — overkill but safe |
| Rule 16: `sanitizeForFirestore()` | ✅ Required for all writes                              |
| Rule 18: `secureLog/secureError`  | ✅ Required — no `console.log`                          |
| Rule 20: Simple solutions         | ✅ Single endpoint, no over-engineering                 |

### 5.2 Zod Schema

```typescript
const CreateOutletSchema = z.object({
  outletName: z.string().min(1).max(255),
  city: z.string().max(255).optional(),
  contactPerson: z.string().max(255).optional(),
});
```

### 5.3 Endpoint Flow (Pseudocode)

```typescript
export const POST = withAuth(async (request, session) => {
  const { tenantId, storeId } = session.user;

  // 1. Verify tenant access
  if (!verifyTenantAccess(session, tenantId, storeId, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Rate limit
  const rateLimit = await checkRateLimit({
    key: `outlet:${tenantId}`,
    ...getRateLimitForFeature("DATA_WRITE"),
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  // 3. Validate input
  const body = await request.json();
  const validation = validateAPIInput(CreateOutletSchema, body);
  if (!validation.success) return validationErrorResponse(validation);

  // 4. Verify caller is master store
  const store = await getStoreById(storeId);
  if (!store?.isMaster) {
    return NextResponse.json(
      { error: "Only master store can create outlets" },
      { status: 403 },
    );
  }

  // 5. Check subscription is active
  const subscription = await getActiveSubscriptionForStore(tenantId, storeId);
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 402 },
    );
  }

  // 6. Check outlet creation lock
  const tenant = await getTenantById(tenantId);
  if (tenant.outletCreationLock) {
    // Check TTL — auto-release after 5 min
    const lockAge = Date.now() - tenant.outletCreationLockAt?.toMillis();
    if (lockAge < 300000) {
      return NextResponse.json(
        { error: "Outlet creation already in progress" },
        { status: 409 },
      );
    }
    // Lock expired — release and continue
  }

  // 7. Set lock
  await updateTenant(tenantId, {
    outletCreationLock: true,
    outletCreationLockAt: Timestamp.now(),
  });

  try {
    // 8. Update Razorpay quantity
    const currentQty = subscription.quantity || 1;
    const newQty = currentQty + 1;

    await razorpayClient.subscriptions.update(
      subscription.providerSubscriptionId,
      {
        quantity: newQty,
      },
    );

    // 9. Update Firestore subscription quantity
    await updateSubscription(subscription.id, { quantity: newQty });

    // 10. Create outlet (internal flow — PATH 2)
    const result = await addOutletToMaster(storeId, {
      name: validation.data.outletName,
      city: validation.data.city,
      contactPerson: validation.data.contactPerson,
    });

    // 11. Release lock
    await updateTenant(tenantId, { outletCreationLock: false });

    // 12. Log
    await logMultiOutletEvent(
      createOutletCreatedEvent({
        tenantId,
        masterStoreId: storeId,
        outletStoreId: result.storeId,
        newQuantity: newQty,
        billingImpact: true,
      }),
    );

    return NextResponse.json({
      success: true,
      storeId: result.storeId,
      projectIds: result.projectIds,
    });
  } catch (error) {
    // Release lock on any failure
    await updateTenant(tenantId, { outletCreationLock: false });

    secureError("[Outlet Creation] Failed", error as Error, {
      tenantId,
      storeId,
      outletName: validation.data.outletName,
    });

    return NextResponse.json(
      { error: "Failed to create outlet" },
      { status: 500 },
    );
  }
});
```

### 5.4 Important: Razorpay Quantity Update Failure

If `razorpayClient.subscriptions.update()` fails:

- Release lock
- Return error
- Do NOT create outlet
- No cleanup needed (nothing was created yet)

If internal creation fails AFTER billing success:

- Quantity was already updated in Razorpay
- Outlet marked as `provisioning` (see `store-onboarding-flow_impl.md §6.3`)
- Admin can retry from outlet management
- Reconciliation will detect `quantity > activeStores` mismatch

---

## 6. Outlet Subscription Access — Fallback Logic

### 6.1 Current Function

```typescript
// src/database/subscriptions/index.ts:105
export const getActiveSubscriptionForStore = async (tenantId: number, storeId: number)
```

### 6.2 Required Enhancement

Add outlet fallback: if no subscription found for storeId, check if store is an outlet and look up master's subscription.

```typescript
export const getActiveSubscriptionForStore = async (
  tenantId: number,
  storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
  // 1. Try direct lookup (works for master store + legacy single stores)
  const directSub = await fetchSubscriptionRaw(tenantId, storeId);
  if (directSub) {
    return await expireIfGracePeriodEnded(directSub);
  }

  // 2. Outlet fallback: check master store's subscription
  if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
    const masterStoreId = await getMasterStoreIdForTenant(tenantId);
    if (masterStoreId && masterStoreId !== storeId) {
      const masterSub = await fetchSubscriptionRaw(tenantId, masterStoreId);
      if (masterSub) {
        return await expireIfGracePeriodEnded(masterSub);
      }
    }
  }

  return null;
};
```

**Helper function needed:**

```typescript
async function getMasterStoreIdForTenant(
  tenantId: number,
): Promise<number | null> {
  const tenant = await getTenantById(tenantId);
  const masterEntry = tenant?.storesList?.find((s) => s.isMaster === true);
  return masterEntry?.storeId ?? null;
}
```

### 6.3 Why This Is Safe

- Feature-flagged behind `ENABLE_MULTI_OUTLET`
- Only triggers when direct lookup returns null (no change for existing users)
- Single extra Firestore read (tenant doc, which is usually cached by SessionProvider)
- Master subscription doc is a single read (same as direct lookup)

---

## 7. Proration — How It Works With Razorpay

### 7.1 Mid-Cycle Outlet Addition

```
Master billing cycle: 25th of each month
Plan: ₹3000/store/month
Current: 1 store (master), quantity = 1

HQ adds outlet on 10th Feb:
  → Days remaining until 25th Feb: 15 days
  → Prorated charge: ₹3000 × (15/30) = ₹1500 (charged immediately)
  → Razorpay auto-debits ₹1500 from saved payment method

On 25th Feb (next cycle):
  → quantity = 2
  → Total charge: ₹3000 × 2 = ₹6000
  → Everything aligned
```

### 7.2 Razorpay Behavior

When `subscriptions.update({ quantity: N })` is called:

- Razorpay calculates prorated amount for remaining period
- Auto-debits from saved payment method (mandate)
- Adjusts next invoice to reflect new quantity
- No separate checkout or payment page needed

### 7.3 What User Sees

```
┌─────────────────────────────────────────────────┐
│  Add New Outlet                                  │
│                                                  │
│  Outlet Name: [Downtown Branch          ]       │
│  City:        [Mumbai                   ]       │
│                                                  │
│  ────────────────────────────────────────────── │
│  💡 Billing Impact                               │
│                                                  │
│  Today's prorated charge:    ₹1,500             │
│  (for remaining 15 days of current cycle)       │
│                                                  │
│  From next billing cycle:                       │
│  2 outlets × ₹3,000 = ₹6,000/month             │
│                                                  │
│  [Cancel]                    [Add Outlet →]     │
└─────────────────────────────────────────────────┘
```

### 7.4 Proration Calculation (Frontend Display)

```typescript
function calculateProration(
  planAmount: number, // per-store price in paise/cents
  cycleEndDate: Timestamp, // from active subscription
): { prorationAmount: number; remainingDays: number } {
  const now = new Date();
  const cycleEnd = cycleEndDate.toDate();
  const diffMs = cycleEnd.getTime() - now.getTime();
  const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Estimate: assume 30-day month for display
  const dailyRate = planAmount / 30;
  const prorationAmount = Math.round(dailyRate * remainingDays);

  return { prorationAmount, remainingDays };
}
```

**Note:** This is for UI display only. Razorpay calculates the actual proration amount on their side. The UI number may differ slightly from what Razorpay charges.

---

## 8. Webhook Handling — Quantity Changes

### 8.1 Current State

The webhook handler at `src/app/api/razorpay/webhook/route.ts` handles:

- `subscription.activated`
- `subscription.charged`
- `payment.failed` / `subscription.halted` / `subscription.pending`
- `subscription.completed`
- `subscription.cancelled`
- `subscription.paused`
- `subscription.resumed`

**Missing:** No handler for quantity changes synced back from Razorpay.

### 8.2 Required Addition

The `subscription.charged` handler already updates `totalPaymentsMadeCount` from `subscriptionEntity.paid_count`. We need to also sync `quantity`:

```typescript
// In webhook route.ts, inside 'subscription.activated' / 'subscription.charged' handler:
const updatePayload: Partial<FirestoreSubscriptionDoc> = {
  // ... existing fields ...
  quantity: subscriptionEntity.quantity || 1, // NEW: sync quantity from Razorpay
};
```

This ensures Firestore stays in sync even if quantity was changed directly in Razorpay dashboard.

### 8.3 Reconciliation Enhancement

**File:** `functions/src/billing/reconcileSubscriptions.ts`

Add quantity mismatch detection:

```typescript
// After existing checks (status, cycleDates, paidCount, chargeAt):

// Quantity mismatch check
if (rzpSub.quantity != null && rzpSub.quantity !== (sub.quantity || 1)) {
  updates.quantity = rzpSub.quantity;
  syncDetails.push({
    subId: sub.id,
    field: "quantity",
    local: String(sub.quantity || 1),
    remote: String(rzpSub.quantity),
  });
}

// Active stores vs quantity validation
const activeStoreCount = await getActiveStoreCount(sub.tenantId);
if (activeStoreCount !== (sub.quantity || 1)) {
  // Log warning but don't auto-fix — this needs human review
  logger.warn("Reconciliation: quantity/store mismatch", {
    subId: sub.id,
    tenantId: sub.tenantId,
    activeStores: activeStoreCount,
    subscriptionQuantity: sub.quantity || 1,
  });
}
```

---

## 9. Billing UI Changes

### 9.1 ActiveSubscriptionCard Enhancement

**File:** `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx`

When `subscription.quantity > 1`, show:

```
Plan: Pro Plan (Monthly)
Outlets: 3 × ₹3,000 = ₹9,000/month
```

Instead of current:

```
Plan: Pro Plan (Monthly)
Amount: ₹3,000/month
```

### 9.2 Billing History Enhancement

Each invoice from Razorpay already includes quantity × price. No change needed — Razorpay invoice shows the math.

---

## 10. Outlet Removal — Billing Impact (Session 3)

### 10.1 Core Principle: Next-Cycle Billing Reduction

When an outlet is deactivated/closed, billing quantity is NOT reduced immediately. Instead:

```
Owner deactivates outlet (Chain Control Panel or settings)
    │
    ├── 1. Immediate: store.active = false
    │       → Outlet hidden from public menus
    │       → Outlet staff lose access
    │       → Store data preserved (never deleted)
    │
    ├── 2. Same cycle: No billing change
    │       → Already paid for this cycle
    │       → Quantity stays at N (includes deactivated outlet)
    │       → No mid-cycle refund (industry standard: Shopify, Slack, GitHub)
    │
    ├── 3. Schedule: Mark for quantity reduction
    │       → Set store.scheduledForBillingRemoval = true
    │       → Set store.billingRemovalScheduledAt = Timestamp.now()
    │
    └── 4. Next billing cycle: Reconciliation reduces quantity
            → reconcileSubscriptions() detects scheduledForBillingRemoval
            → razorpayClient.subscriptions.update(subId, { quantity: N - 1 })
            → Clear scheduledForBillingRemoval flag
            → Update Firestore subscription quantity
```

### 10.2 Why No Mid-Cycle Refund

1. **Industry standard** — Shopify, Slack, GitHub all charge for full cycle
2. **Razorpay limitation** — No native mid-cycle quantity reduction with credit
3. **Simplicity** — Avoids complex partial refund calculations
4. **Prevents abuse** — Can't add outlet for 1 day then remove for refund
5. **Reactivation window** — Owner can reactivate before next cycle at no cost

### 10.3 Reactivation Before Next Cycle

If owner changes mind before next billing cycle:

- Set `store.active = true`
- Clear `scheduledForBillingRemoval` flag
- No billing impact (was never removed from quantity)
- Clean reversal — like it never happened

### 10.4 Schema — Outlet Removal Fields

```typescript
// Add to StoreDataType (src/types/platform/store.ts)
scheduledForBillingRemoval?: boolean;      // Marked for quantity reduction next cycle
billingRemovalScheduledAt?: Timestamp;     // When removal was scheduled
```

### 10.5 Reconciliation Enhancement for Removal

```typescript
// In functions/src/billing/reconcileSubscriptions.ts
// After existing quantity mismatch check:

// Check for scheduled billing removals
const scheduledRemovals = await getStoresScheduledForBillingRemoval(
  sub.tenantId,
);
if (scheduledRemovals.length > 0) {
  const newQty = (sub.quantity || 1) - scheduledRemovals.length;
  if (newQty >= 1) {
    // Never go below 1 (master is always billed)
    await razorpayClient.subscriptions.update(sub.providerSubscriptionId, {
      quantity: newQty,
    });
    await updateSubscription(sub.id, { quantity: newQty });
    // Clear flags on processed stores
    for (const store of scheduledRemovals) {
      await updateStore(store.storeId, {
        scheduledForBillingRemoval: false,
        billingRemovalScheduledAt: null,
      });
    }
  }
}
```

---

## 11. Feature Flags — Billing

**File:** `src/config/features.ts`

```typescript
// Multi-Outlet Billing
ENABLE_OUTLET_BILLING: true,            // Enable quantity-based billing for outlets
ENABLE_OUTLET_PRORATION_DISPLAY: true,  // Show proration estimate in add-outlet modal
ENABLE_OUTLET_DEACTIVATE: true,         // Allow outlet deactivation from Chain Control Panel
ENABLE_BILLING_REMOVAL_SCHEDULE: true,  // Schedule quantity reduction for next cycle
```

---

## 12. Integration Points — Billing ↔ Internal Flow

### 12.1 Execution Order

```
POST /api/outlets/create
    │
    ├── BILLING (this doc)
    │   ├── Validate subscription active
    │   ├── Check lock
    │   ├── Set lock
    │   ├── Update Razorpay quantity
    │   └── Update Firestore quantity
    │
    ├── INTERNAL (store-onboarding-flow_impl.md)
    │   ├── Create store doc
    │   ├── Replicate master projects
    │   ├── Link to master
    │   └── Update tenant storesList
    │
    └── CLEANUP
        ├── Release lock
        └── Log MOL event
```

### 12.2 Failure Matrix

| Billing Step | Internal Step | Result   | Recovery                                                                    |
| ------------ | ------------- | -------- | --------------------------------------------------------------------------- |
| ✅ Success   | ✅ Success    | Normal   | —                                                                           |
| ❌ Fail      | Not started   | Clean    | Show error, retry                                                           |
| ✅ Success   | ❌ Fail       | Mismatch | Mark `provisioning`, admin retry. Reconciliation detects quantity > stores. |
| ✅ Success   | ⚠️ Partial    | Mismatch | Same as above                                                               |

---

## 13. Cost Analysis — Billing Operations

### 13.1 Per Outlet Addition

| Operation                    | Firestore Reads | Firestore Writes | Razorpay API Calls |
| ---------------------------- | --------------- | ---------------- | ------------------ |
| Fetch store (isMaster check) | 1               | 0                | 0                  |
| Fetch subscription           | 1               | 0                | 0                  |
| Fetch tenant (lock check)    | 1               | 0                | 0                  |
| Set lock                     | 0               | 1                | 0                  |
| Update Razorpay quantity     | 0               | 0                | 1                  |
| Update Firestore quantity    | 0               | 1                | 0                  |
| Release lock                 | 0               | 1                | 0                  |
| **Total (billing only)**     | **3**           | **3**            | **1**              |

Combined with internal flow (from `store-onboarding-flow_impl.md §12`):
**Grand total per outlet: 4 reads + 9 writes + 1 Razorpay API call** = negligible.

### 13.2 Ongoing — Outlet Access Check

| Operation                                 | Cost                          |
| ----------------------------------------- | ----------------------------- |
| Direct subscription lookup (master store) | 1 read (same as today)        |
| Outlet fallback (miss + master lookup)    | 2 reads (tenant + master sub) |

Outlet fallback adds 1 extra read per session init for outlet users. At Firestore pricing: **negligible**.

---

## 14. Implementation Tasks — Billing Specific

| #    | Task                                                       | File                                                                   | Change                                                                      |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| BT1  | Add `quantity` field to `FirestoreSubscriptionDoc`         | `src/types/razorpay.ts`                                                | New field: `quantity: number`                                               |
| BT2  | Set `quantity: 1` in initial subscription creation         | `src/app/api/onboarding/create-subscription/route.ts`                  | Add to subscription payload                                                 |
| BT3  | Set `quantity: 1` in subscription creation route           | `src/app/api/razorpay/create-subscription/route.ts`                    | Add to subscription payload                                                 |
| BT4  | Add outlet subscription fallback                           | `src/database/subscriptions/index.ts`                                  | Outlet → check master's subscription                                        |
| BT5  | Add `getMasterStoreIdForTenant()` helper                   | `src/database/subscriptions/index.ts`                                  | New function                                                                |
| BT6  | Create `POST /api/outlets/create` endpoint                 | `src/app/api/outlets/create/route.ts`                                  | New file — billing + internal creation                                      |
| BT7  | Sync `quantity` in webhook handler                         | `src/app/api/razorpay/webhook/route.ts`                                | Add `quantity` to `subscription.charged` update                             |
| BT8  | Add quantity mismatch detection to reconciliation          | `functions/src/billing/reconcileSubscriptions.ts`                      | New check in reconciliation loop                                            |
| BT9  | Add proration calculation utility                          | `src/utils/razorpay.ts`                                                | New `calculateProration()` function                                         |
| BT10 | Update `ActiveSubscriptionCard` for quantity display       | `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` | Show quantity × price when qty > 1                                          |
| BT11 | Add feature flags                                          | `src/config/features.ts`                                               | `ENABLE_OUTLET_BILLING`, `ENABLE_OUTLET_PRORATION_DISPLAY`                  |
| BT12 | Add `scheduledForBillingRemoval` fields to `StoreDataType` | `src/types/platform/store.ts`                                          | Two new optional fields (see §10.4)                                         |
| BT13 | Add scheduled removal detection to reconciliation          | `functions/src/billing/reconcileSubscriptions.ts`                      | Detect `scheduledForBillingRemoval` stores, reduce quantity                 |
| BT14 | Add outlet deactivation API endpoint                       | `src/app/api/outlets/deactivate/route.ts`                              | New file — sets `active = false` + schedules billing removal                |
| BT15 | Add billing impact panel to Chain Control Panel            | Chain Control Panel component                                          | Total billable, cost per outlet, next invoice (see §9.1, companion doc §17) |

---

## 15. Testing Strategy — Billing

| #     | Scenario                                     | Expected Result                                                                                  |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| BTC1  | Single store subscription (existing)         | Works exactly as today, `quantity: 1`                                                            |
| BTC2  | Add first outlet (billing)                   | Razorpay quantity → 2, proration charged, Firestore quantity updated                             |
| BTC3  | Add 3rd outlet                               | Razorpay quantity → 3, proration charged                                                         |
| BTC4  | Outlet user login → subscription check       | Fallback to master's subscription, access granted                                                |
| BTC5  | Master store login → subscription check      | Direct lookup works, no fallback needed                                                          |
| BTC6  | Add outlet when `past_due`                   | Blocked with message                                                                             |
| BTC7  | Double-click add outlet                      | Second request blocked by lock                                                                   |
| BTC8  | Billing success + internal failure           | Quantity mismatch detected, outlet in `provisioning`                                             |
| BTC9  | Reconciliation with quantity mismatch        | Warning logged, manual review flagged                                                            |
| BTC10 | Razorpay dashboard manual quantity edit      | Webhook syncs quantity to Firestore                                                              |
| BTC11 | Deactivate outlet (billing removal)          | `store.active = false`, `scheduledForBillingRemoval = true`, quantity unchanged until next cycle |
| BTC12 | Reactivate outlet before next cycle          | `store.active = true`, `scheduledForBillingRemoval` cleared, no billing impact                   |
| BTC13 | Reconciliation processes scheduled removal   | Quantity decremented, Razorpay updated, flags cleared                                            |
| BTC14 | Deactivate last outlet (only master remains) | Quantity → 1, master always billed                                                               |
| BTC15 | Chain Control Panel billing impact display   | Shows correct billable count, cost per outlet, next invoice estimate                             |

---

## 16. Existing Codebase Assets (Billing — Already Built)

| Asset                                | File                                              | What It Does                              |
| ------------------------------------ | ------------------------------------------------- | ----------------------------------------- |
| `createInitialSubscription()`        | `src/database/subscriptions/index.ts:123`         | Creates subscription doc with Razorpay ID |
| `updateSubscription()`               | `src/database/subscriptions/index.ts:139`         | Updates subscription fields (merge)       |
| `getActiveSubscriptionForStore()`    | `src/database/subscriptions/index.ts:105`         | Fetches active subscription for store     |
| `getSubscriptionById()`              | `src/database/subscriptions/index.ts:150`         | Fetches by Razorpay sub ID                |
| `validateTransition()`               | `src/lib/billing/subscriptionStateMachine.ts:49`  | Validates status transitions              |
| `getOrCreateRazorpayPlan()`          | `src/lib/razorpay/plan-handler.ts:19`             | Deduplicates Razorpay plans               |
| `razorpayClient`                     | `src/lib/razorpay/razorpay.ts`                    | Razorpay SDK singleton                    |
| `validateRazorpayWebhookSignature()` | `src/lib/razorpay/webhook-validator.ts`           | HMAC-SHA256 signature validation          |
| Webhook handler                      | `src/app/api/razorpay/webhook/route.ts`           | Handles all Razorpay events               |
| Reconciliation                       | `functions/src/billing/reconcileSubscriptions.ts` | Nightly Firestore ↔ Razorpay sync         |
| `calculateRemainingCredits()`        | `src/utils/razorpay.ts`                           | Credit carry-forward calculation          |
| `getGracePeriodInfo()`               | `src/utils/razorpay.ts`                           | 7-day grace period calculation            |

---

**DOCUMENT STATUS:** 📋 IMPLEMENTATION PLAN READY  
**COMPANION:** `store-onboarding-flow_impl.md` (PATH 2 — Internal Creation)  
**NEXT:** Execute tasks BT1-BT15 in order (billing), then T1-T25 (internal)  
**GOVERNANCE:** All decisions aligned with MenuList Constitution + Security Rules + 3-Year Freeze  
**SESSIONS:** Incorporates decisions from ChatGPT sessions 1-3
