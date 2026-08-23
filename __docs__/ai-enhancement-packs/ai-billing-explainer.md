# How the AI Billing System Works

**For: Founder / CEO / Co-Founder**
**Last Updated: July 15, 2026**
**Status: Implemented — billing-slice audited; full MenuList certification pending**

> **Launch boundary:** Not current launch certification or deploy approval. This founder explainer records source-gated billing and AI accounting behavior only. Current approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:billing-entitlement-boundary`, `npm run verify:ai-accounting`, Razorpay sandbox subscription/top-up/reseller/webhook smoke, desktop/mobile Billing browser QA, target deploy evidence, and production-host smoke.

This document explains the complete subscription, credit, and AI billing system as it exists in the codebase today. Nothing here is proposed or planned — everything described is built and working.

## August 22 Current Runtime and Owner-Display Contract

- Paid actions reserve exact credits transactionally before Gemini, settle the same hidden operation row after valid output, and refund the exact charged buckets on terminal failure.
- The operation belongs to the selected outlet. If that outlet inherits HQ billing, `accountingBillingStoreId` records the effective HQ subscription used for reserve, settle, refund, and recovery.
- API `remainingBalance` includes that effective `billingStoreId`; the browser applies it only to the matching active subscription.
- Owner Transactions read `menulistAiOperations/{tId}/{selectedOutletId}`. Successful/partial authenticated menu extraction is mirrored there as a compact no-credit activity row while its detailed cost/token audit remains in `MENULIST_AI_OPERATIONS` for platform operators.
- MenuList owners see the usable total plus included, promotional, and purchased balances. They also see exact credits required/used by eligible actions. Provider cost and margin remain private.

The authoritative policy is [`content-credit-decision-record-2026-08.md`](./content-credit-decision-record-2026-08.md).

---

## 1. The Big Picture

```
Customer subscribes to a plan  →  Gets monthly Content Credits
Credits reset every billing cycle  →  Unused monthly credits do NOT carry forward
Customer requests prepared content  →  Included, then valid promotional, then Pack credits are used
If they need more  →  They buy one Content Credit Pack (₹799 / $29 = 250 credits)
Normal menu and business updates  →  Always use zero Content Credits
```

There are **three types of credits** a billing store can have:

- **`monthlyCredits`** — Included with the subscription plan. Resets to full every billing cycle.
- **`promotionalCredits`** — Referral or goodwill value with an explicit expiry.
- **`topUpCredits`** — Purchased separately via the Content Credit Pack. Never resets during an active paid entitlement.

---

## 2. Subscription Plans (What Customers Pay)

Every customer must subscribe to use MenuList. Subscriptions are per-store (not per-tenant). Each store has its own subscription and its own credit balance.

Payment is handled entirely through **Razorpay** (recurring subscriptions).

### B2C Plans (Restaurants, Salons, Retail — End-Customer Facing)

| Plan           | Monthly (INR)       | Yearly (INR)         | Monthly Credits (INR) |
| -------------- | ------------------- | -------------------- | --------------------- |
| Official       | ₹599/mo             | ₹5,990/yr            | 75 units/month        |
| Pro            | ₹1,499/mo           | ₹14,990/yr           | 250 credits/month     |
| Multi-location | ₹1,499/location/mo  | ₹14,990/location/yr  | 300 credits/location  |

Multi-location billing requires at least two paid active locations, so its minimum included allowance is 600 credits per cycle.

### B2B Plans (API Customers — Developer Facing)

| Plan    | Monthly (INR) | Yearly (INR) | Monthly Credits (INR) |
| ------- | ------------- | ------------ | --------------------- |
| Starter | ₹4,999/mo     | ₹49,990/yr   | 200 units/month       |
| Pro     | ₹1,89,990/mo  | ₹1,89,990/yr | 1,000 units/month     |

USD pricing is also available and auto-selected based on user timezone.

### AI Enhancement Pack (Top-Up — One-Time Purchase)

| Pack                | Price (INR) | Credits Added |
| ------------------- | ----------- | ------------- |
| Content Credit Pack | ₹799 / $29 before tax | 250 credits |

Purchased credits are added to `topUpCredits`. They do not reset with the monthly allowance. On cancellation they are frozen and can be restored once if the same billing store reactivates within 365 days.

---

## 3. How Credits Work — The Full Lifecycle

### 3.1 Credits Are Set at Subscription Creation

When a customer subscribes (onboarding or plan change):

```
monthlyCreditsAllowance = plan's monthly credit value (250 for Pro)
monthlyCredits = 250  (full starting balance after subscription activation)
promotionalCredits = 0
topUpCredits = 0
creditsLastResetMonth = current billing period key (YYYYMM)
```

For upgrades, carry-forward is applied by the server-owned upgrade route after both the old and new subscription documents are verified. The subscription creation route never accepts browser-supplied top-up or carry-forward credit values.

### 3.2 Credits Are Consumed on Every Paid AI Action

When a customer uses a paid AI feature (e.g., generates an image):

1. System checks the effective subscription for enough capacity.
2. If yes, it atomically reserves exact units and writes the hidden operation shell.
3. Only after reservation succeeds does it call Google Gemini.
4. Valid output settles the same shell without a second debit; terminal failure refunds the exact reservation once.
5. **Reservation order:** `monthlyCredits`, then unexpired `promotionalCredits`, then `topUpCredits`.

Example: Store has 10 monthlyCredits + 50 topUpCredits. Generates 1 image (5 units).
→ After: 5 monthlyCredits + 50 topUpCredits. Monthly credits were consumed first.

Example: Store has 2 monthlyCredits + 50 topUpCredits. Generates 1 image (5 units).
→ After: 0 monthlyCredits + 47 topUpCredits. 2 from monthly + 3 from topUp.

### 3.3 Monthly Credits Reset Every Billing Cycle

This is critical to understand. **Monthly credits reset to their full allowance at the start of each billing cycle.** Unused monthly credits do NOT carry forward.

There are two mechanisms that handle this reset:

**Layer 1 — Webhook Reset (Monthly Plans):**
When Razorpay charges the customer for the next month, it sends a `subscription.charged` webhook. Our webhook handler resets:

```
monthlyCredits → monthlyCreditsAllowance (for example, Pro returns to 250)
creditsLastResetMonth → new billing period key
```

**Layer 2 — Lazy Reset (Yearly Plans + Safety Net):**
Yearly plans don't trigger a monthly webhook — Razorpay only charges once per year. So we have a lazy reset built into the capacity check function. Before every paid AI call:

```
If creditsLastResetMonth !== current billing period:
    monthlyCredits = monthlyCreditsAllowance
    creditsLastResetMonth = current billing period
    (write to Firestore — happens once per billing month, on first AI call)
```

This also acts as a safety net for monthly plans if the webhook fails or delays.

**Billing Period Key — How "Current Month" Is Determined:**

The reset is based on the subscription's **billing cycle anchor day**, not the calendar month.

Example: Customer subscribes on Feb 15th. Their billing cycle runs 15th → 15th.

- On March 1st → still in February's billing period (day 1 < anchor day 15). No reset.
- On March 15th → new billing period starts. Credits reset.

This prevents a customer who subscribed on the 25th from getting a reset just 5 days later on the 1st.

### 3.4 Top-Up Credits Are Added Instantly

When a customer buys an AI Enhancement Pack:

1. Razorpay processes the one-time payment (order, not subscription)
2. Our verify-topup route confirms payment with Razorpay's servers
3. `topUpCredits += 250` (added to existing balance)
4. Frontend updates immediately

Purchased credits persist across billing-cycle resets. Cancellation uses the bounded 365-day freeze-and-restore policy described above.

### 3.5 Credits Carry Forward on Plan Upgrade

When a customer upgrades their plan (for example, Official → Pro):

1. New Razorpay subscription is created with `topUpCredits = 0`
2. Razorpay checkout completes and `/api/razorpay/verify-subscription` verifies the checkout signature, captured payment, and payment-subscription ownership
3. `/api/razorpay/upgrade-subscription` verifies both old and new subscription documents belong to the same billing scope
4. Purchased and unexpired promotional credits are calculated server-side
5. Old subscription is expired
6. Server transfers purchased credits to `topUpCredits`, preserves valid promotional credits separately, and stamps `carryForwardFromSubscriptionId`
7. New subscription starts with fresh `monthlyCredits` from the new plan

Unused included credits and future annual allowances are not converted into purchased value during an upgrade.

---

## 4. What Each AI Operation Costs

### Free Operations (0 Units — We Absorb Google Cost)

These operations are always free. No units are deducted. No subscription is required.

| Operation              | Google Cost (₹) | Why Free                                     |
| ---------------------- | --------------- | -------------------------------------------- |
| Menu Extraction (OCR)  | ₹0.68           | Core value prop — must work without friction |
| First-pass Description | ₹0.13           | Part of extraction flow                      |
| New Item Metadata      | ₹0.07           | Structural, not creative                     |

Worst case cost absorbed: 10 large menu extractions = ~₹7. Negligible.

Internal audit may still record token usage and estimated platform cost for these operations. That audit cost is not owner-pack usage and does not reduce the owner's balance.

### Paid Operations (Consumes Units)

| Operation           | Units | Our Charge (₹) | Google Cost (₹) | Margin | Margin % |
| ------------------- | ----- | -------------- | --------------- | ------ | -------- |
| Image Generation    | 5     | ₹60.00         | ₹3.38           | ₹56.62 | 94%      |
| Image Editing       | 5     | ₹60.00         | ₹3.38           | ₹56.62 | 94%      |
| Batch Image Gen     | 5     | ₹60.00         | ₹3.38 per image | ₹56.62 | 94%      |
| Image Translation   | 5     | ₹60.00         | ₹3.80           | ₹56.20 | 94%      |
| Language Addition   | 3     | ₹36.00         | ₹0.37           | ₹35.63 | 99%      |
| Rewrite Description | 1     | ₹12.00         | ₹0.13           | ₹11.87 | 99%      |
| Item Translation    | 1     | ₹12.00         | ₹0.04           | ₹11.96 | 99.7%    |

Content Credits are product units, not a rupee-per-credit promise. The versioned rate catalog maps each supported operation to its credit cost.

---

## 5. Capacity Enforcement — What Happens When Credits Run Out

Before every paid AI call, the system runs a capacity check:

```
User clicks "Generate Image"
  → checkAICapacity(tenantId, storeId, 'image_generation')
  → Calculates: monthlyCredits + valid promotionalCredits + topUpCredits
  → Needs 5 units for image generation
  → If total available >= 5 → proceed to Google Gemini
  → If total available < 5 → return 402 error
```

### Strict Non-Negative Enforcement

The operation proceeds only when the exact usable balance covers the full reservation. No hidden overdraft is allowed. Goodwill is represented as an explicit promotional grant instead of an invisible negative balance.

### What the Customer Sees

When credits are exhausted:

- API returns **402** status with message "Additional AI enhancements needed"
- Frontend catches this specific error and shows **"Get More Enhancements"** button
- Clicking opens the AI Enhancement Pack purchase modal
- After buying, credits are added immediately and they can retry

### Kill Switch

A global feature flag `ENABLE_AI_ENHANCEMENTS` can disable all paid AI operations system-wide. When OFF, every paid AI call returns a "maintenance" response. Free operations (extraction, first-pass descriptions) still work.

---

## 6. Frontend Balance Sync

After every settled paid AI operation, the API response includes the updated credit balance and effective billing store. The frontend uses a `CustomEvent ('ai-balance-update')` to update the matching subscription state in the session provider without making an extra Firestore read. Responses for another active store are ignored.

```
API response includes: { remainingBalance: { billingStoreId: 72, monthlyCredits: 195, topUpCredits: 50 } }
  → Frontend fires CustomEvent 'ai-balance-update'
  → SessionProvider updates activeSubscription state
  → UI reflects new balance instantly
```

---

## 7. Subscription Statuses and Grace Period

| Status      | What It Means                                                    |
| ----------- | ---------------------------------------------------------------- |
| `pending`   | Subscription created but payment not yet completed               |
| `active`    | In good standing. Auto-renewal is ON. Credits available.         |
| `past_due`  | Payment failed. Razorpay is retrying. 7-day grace period active. |
| `cancelled` | User requested cancellation. Access continues until cycle end.   |
| `expired`   | Paid period ended. No access to paid AI features.                |

**Grace Period:** When a payment fails, the subscription enters `past_due`. The customer still has access for **7 days** while Razorpay retries the payment. After 7 days with no successful payment, the subscription is automatically expired on the next capacity check.

---

## 8. Per-Store Transaction Tracking

Every owner-visible MenuList operation logs an allowlisted transaction document at `menulistAiOperations/{tenantId}/{selectedOutletId}/{docId}`. Menu extraction also keeps its separate detailed platform audit in top-level `MENULIST_AI_OPERATIONS`.

Each document contains:

| Field             | What It Means                                               |
| ----------------- | ----------------------------------------------------------- |
| `action`          | What they did (image_generation, rewrite_description, etc.) |
| `unitsConsumed`   | How many internal units were deducted                       |
| `totalTokenCount` | How many Gemini tokens were actually used                   |
| `realCostPaise`   | What Google actually charged us (in paise)                  |
| `ourChargePaise`  | What we charged the customer (in paise)                     |
| `marginPaise`     | Profit per operation = ourCharge - realCost                 |
| `processingTime`  | How long it took (ms)                                       |
| `model`           | Which Gemini model was used                                 |
| `projectId`       | Which project triggered this operation                      |
| `fileId`          | Which file within the project                               |

This data is queryable by store, by action type, by date range. No separate summary collection needed.

---

## 9. Real-World Scenarios

### Scenario A: "Raju's Biryani House" — Small Restaurant, Pro Plan (₹1,499/mo)

Raju gets 250 monthly credits. His first month:

| Step                               | Operation                | Units Used    | Google Cost |
| ---------------------------------- | ------------------------ | ------------- | ----------- |
| Upload 2 menu pages                | Extraction (FREE)        | 0             | ₹1.36       |
| Descriptions auto-generated        | First-pass (FREE)        | 0             | ₹0.13       |
| Refreshes 10 descriptions in one bulk request | REWRITE_DESCRIPTION × 1 | 1     | ₹0.13       |
| Runs one menu-file or public-copy Hindi translation request | LANGUAGE_ADDITION × 1 | 3 | ₹0.37 |
| Generates AI images for 15 items   | IMAGE_GENERATION × 15    | 75            | ₹50.70      |
| Edits 3 images (background change) | IMAGE_EDITING × 3        | 15            | ₹10.14      |
| **TOTAL**                          |                          | **94 / 250**  | **₹62.83**  |

Raju used 94 of 250 monthly credits. He has 156 credits left this cycle. A separate single-item refresh is another request and therefore another credit.

Language addition is charged per `/api/translations` request, not once per language-selection gesture. For example, translating two menu files and one project-public-copy batch can create three `LANGUAGE_ADDITION` operations (9 units total). The UI processes and records each request separately so partial completion and transaction history remain truthful.

**Next cycle:** His 250 included credits reset to full. The unused 156 do not carry forward.

If Raju runs out mid-cycle, he can buy one Pack (₹799 / $29 = 250 purchased credits). Those credits persist through monthly resets.

### Scenario B: Yearly Plan — How Monthly Reset Works

A salon subscribes to Pro Yearly (₹14,990/yr, 250 credits/month) on February 15th.

- **Feb 15 – Mar 14:** 250 credits available. Uses 150. 100 unused at reset.
- **Mar 15:** Lazy reset triggers on first eligible action. `monthlyCredits` returns to 250.
- **Mar 15 – Apr 14:** Fresh 250 credits. Uses 80.
- **Apr 15:** Lazy reset again. 250 credits.
- ... continues for 12 months. No monthly payment, no monthly webhook — lazy reset handles it.

Annual billing replenishes 250 credits monthly; it does not grant 3,000 credits in advance.

### Scenario C: Credits Exhausted — Purchase Flow

```
Store has: 2 monthlyCredits + 1 topUpCredit = 3 total
Wants to: Generate image (needs 5 units)
Exact balance check: 3 < 5 → BLOCKED

→ API returns 402
→ Frontend shows "Get More Enhancements" button
→ User buys Content Credit Pack (₹799 / $29 before tax)
→ topUpCredits becomes 1 + 250 = 251
→ Retries image generation → succeeds
→ Balance after: 0 monthlyCredits + 246 topUpCredits
  (2 monthly used first, then 3 from topUp)
```

### Scenario D: Plan Upgrade — Credits Carry Forward

Store on Official (75 credits/mo) has used 30 credits this month. Remaining: 45 monthly + 10 topUp = 55 total.

User upgrades to Pro (250 credits/mo):

1. Old subscription is replaced. Its 45 unused included credits are not converted.
2. The 10 purchased credits transfer to the replacement.
3. New subscription starts with `monthlyCredits = 250` and `topUpCredits = 10`.

---

## 10. The Economics (Per-Operation Margins)

### What Google Charges Us

| Operation           | Google Cost (USD) | Google Cost (₹) | Model Used              |
| ------------------- | ----------------- | --------------- | ----------------------- |
| Image Generation    | $0.040            | ₹3.38           | Gemini 2.5 Flash Image  |
| Image Editing       | $0.040            | ₹3.38           | Gemini 2.5 Flash Image  |
| Batch Image Gen     | $0.040            | ₹3.38           | Per image               |
| Image Translation   | $0.045            | ₹3.80           | OCR + translate + regen |
| Language Addition   | $0.0044           | ₹0.37           | Gemini 2.5 Flash        |
| Rewrite Description | $0.0016           | ₹0.13           | Gemini 2.5 Flash        |
| Item Translation    | $0.0004           | ₹0.04           | Gemini 2.5 Flash        |

### Per-Pack Economics (₹799 Content Credit Pack = 250 credits)

Typical usage of one pack:

One Pack is ₹799 before applicable tax. Provider-cost estimates remain internal and are monitored by operation and model. Credits are not allocated a public per-operation rupee value.

### Yearly Subscription Margin Simulation

> **Source:** ChatGPT margin stress-test (Feb 10, 2026)

**Question:** Will yearly subscribers with monthly credits destroy margins?

#### Heavy User Scenario (Pro Yearly — India)

```
Revenue: ₹14,990/year
Monthly credits: 200
```

Assume VERY heavy monthly usage (well above average):

| Operation            | Monthly Volume | Credits Used | Google Cost |
| -------------------- | -------------- | ------------ | ----------- |
| Image generation     | 30 images      | 150          | ₹102        |
| Description rewrites | 50 rewrites    | 50           | ₹6.50       |
| Language additions   | 2 languages    | 6            | ₹0.74       |
| **Monthly total**    |                | **206**      | **₹109.24** |

```
Yearly AI cost: ₹109.24 × 12 = ~₹1,320
Yearly revenue: ₹14,990
Profit after AI cost: ₹13,670 (91% margin)
```

**Even at heavy usage, yearly subscribers are extremely profitable.** Most SMBs use far less.

#### Extreme Abuse Scenario

At 100 images + 200 rewrites + 5 languages/month = 715 credits needed. Plan gives 200. User hits limit in week 1 and must buy packs. **System protects itself automatically.**

#### When Would MenuList Actually Lose Money?

Only if ALL of these happen simultaneously:

1. Gemini pricing increases 10×
2. We keep prices the same
3. User hits max usage every month
4. We give huge free credits
5. They never buy packs

**Probability: near zero.** And even then: kill switch, adjustable credits per plan, adjustable pack price.

### Unit Cost Sweet Spot: Why 5 Credits Per Image Is Correct

> **Source:** ChatGPT unit cost analysis (Feb 10, 2026)

Image generation is the most expensive operation. The credits-per-image number determines whether packs feel "scarce" or "comfortable."

| Credits/Image | Images per 250 Pro Cycle | Effect                                                  |
| ------------- | ---------------------- | ------------------------------------------------------- |
| 1–2           | 125–250                | Abused heavily — everyone generates everything          |
| 3             | 83                     | Overused — cost rises, no pack revenue                  |
| **5**         | **50**                 | **Balanced — covers normal SMB, power users buy packs** |
| 7–10          | 25–35                  | Feels restrictive — "AI finished quickly"               |

**Why 5 is the sweet spot:**

- **Pro plan (250 credits):** up to 50 generated images per cycle at the current 5-credit rate. Most menus are 30–80 items, but not every item needs a generated image.
- **Natural segmentation:** Normal SMBs never buy pack. Heavy SMBs buy occasionally. Chains buy regularly.
- **Future-proof:** If Gemini cost rises, we're safe. If it drops, margin increases. If usage explodes, packs absorb load.

**Founder rule:** If adjustment needed later, increase plan credits (the generous lever) — do NOT reduce image cost (the margin lever).

### Monthly Margin Check (via Firestore)

Each AI operation document has `realCostPaise`, `ourChargePaise`, and `marginPaise`. To check margins for any store in any month:

```
Collection: menulistAiOperations/{tenantId}/{storeId}
Filter: createdOn >= startOfMonth
Aggregate: sum(realCostPaise), sum(ourChargePaise), sum(marginPaise)
```

---

## 11. Where to Find Things in Code

| What                         | Where                                                 |
| ---------------------------- | ----------------------------------------------------- |
| Unit costs per operation     | `src/constants/AI/unitCosts.ts`                       |
| Action type constants        | `src/constants/common.ts` → `AI_ACTIONS_TYPES`        |
| Capacity check + lazy reset  | `src/lib/ai/capacityCheck.ts`                         |
| Credit reservation/settlement | `src/lib/ai/capacityCheck.ts` → reserve/finalize/refund |
| Kill switch                  | `src/config/features.ts` → `ENABLE_AI_ENHANCEMENTS`   |
| Transaction logging          | `src/lib/ai/operationLog.ts`; browser reader: `src/database/aiOperations/index.tsx` |
| Plan definitions + pricing   | `src/data/PlatformPlansList.ts`                       |
| Subscription type definition | `src/types/razorpay.ts` → `FirestoreSubscriptionDoc`  |
| Subscription database layer  | `src/database/subscriptions/index.ts`                 |
| Webhook (monthly reset)      | `src/app/api/razorpay/webhook/route.ts`               |
| Create subscription          | `src/app/api/razorpay/create-subscription/route.ts`   |
| Verify subscription          | `src/app/api/razorpay/verify-subscription/route.ts`   |
| Onboarding subscription      | `src/app/api/onboarding/create-subscription/route.ts` |
| Top-up order creation        | `src/app/api/razorpay/create-topup-order/route.ts`    |
| Top-up verification          | `src/app/api/razorpay/verify-topup/route.ts`          |
| Upgrade subscription         | `src/app/api/razorpay/upgrade-subscription/route.ts`  |
| Cancel subscription          | `src/app/api/razorpay/cancel-subscription/route.ts`   |
| Frontend capacity error      | `src/services/ai/capacityError.ts`                    |
| Frontend balance sync        | `src/providers/sessionProvider.tsx`                   |
| Remaining credits display    | `src/utils/razorpay.ts` → `calculateRemainingCredits` |
| Billing UI                   | `src/components/templates/main-app/billing/`          |

---

## 12. Summary — How It All Connects

```
SUBSCRIPTION LIFECYCLE:
  Onboarding/Purchase → Razorpay checkout → pending
  Payment succeeds → verify-subscription confirms → active
  Every billing cycle → webhook resets monthlyCredits → active
  Payment fails → past_due → 7-day grace → expired
  User cancels → cancelled → access until cycleEndDate → expired
  User upgrades → purchased + valid promo transfer → new recurring allowance starts

CREDIT FLOW:
  Plan gives monthlyCreditsAllowance (75 Official, 250 Pro, or 300 per paid Multi-location location)
  monthlyCredits resets every billing cycle
  promotionalCredits = valid reward or goodwill balance with an expiry
  topUpCredits = purchased separately; cycle resets do not change it
  Metered request → reserve from monthlyCredits, then valid promotionalCredits, then topUpCredits
  Valid output → settle; terminal failure → refund the exact reservation
  Credits exhausted → 402 → "Get More Enhancements" → buy pack

MONTHLY RESET:
  Monthly plans → webhook resets on payment
  Yearly plans → lazy reset on first AI call of new billing month
  Both are idempotent and race-safe

TRACKING:
  Owner history → menulistAiOperations/{tId}/{selectedOutletId}/{docId}
  Platform extraction audit → MENULIST_AI_OPERATIONS/{docId}
  Owner projection hides provider economics; platform audit retains bounded cost/token telemetry
```
