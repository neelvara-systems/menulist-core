# How the AI Billing System Works

**For: Founder / CEO / Co-Founder**
**Last Updated: Feb 10, 2026**
**Status: Fully Implemented — Production Ready**

This document explains the complete subscription, credit, and AI billing system as it exists in the codebase today. Nothing here is proposed or planned — everything described is built and working.

---

## 1. The Big Picture

```
Customer subscribes to a plan  →  Gets monthly AI credits (e.g., 200 units/month)
Credits reset every billing cycle  →  Unused monthly credits do NOT carry forward
Customer uses AI features  →  Units deducted from monthlyCredits first, then topUpCredits
If they need more  →  They buy an AI Enhancement Pack (one-time, ₹2,999 = 250 units)
We pay Google per operation  →  Margins are 16x–300x depending on operation
```

There are **two types of credits** a store can have:

- **`monthlyCredits`** — Included with the subscription plan. Resets to full every billing cycle.
- **`topUpCredits`** — Purchased separately via AI Enhancement Packs. Never expire. Never reset.

---

## 2. Subscription Plans (What Customers Pay)

Every customer must subscribe to use MenuList. Subscriptions are per-store (not per-tenant). Each store has its own subscription and its own credit balance.

Payment is handled entirely through **Razorpay** (recurring subscriptions).

### B2C Plans (Restaurants, Salons, Retail — End-Customer Facing)

| Plan    | Monthly (INR) | Yearly (INR) | Monthly Credits (INR) |
| ------- | ------------- | ------------ | --------------------- |
| Starter | ₹499/mo       | ₹4,990/yr    | 75 units/month        |
| Pro     | ₹1,499/mo     | ₹14,990/yr   | 200 units/month       |
| Premium | ₹3,999/mo     | ₹39,990/yr   | 600 units/month       |

### B2B Plans (API Customers — Developer Facing)

| Plan    | Monthly (INR) | Yearly (INR) | Monthly Credits (INR) |
| ------- | ------------- | ------------ | --------------------- |
| Starter | ₹4,999/mo     | ₹49,990/yr   | 200 units/month       |
| Pro     | ₹1,89,990/mo  | ₹1,89,990/yr | 1,000 units/month     |

USD pricing is also available and auto-selected based on user timezone.

### AI Enhancement Pack (Top-Up — One-Time Purchase)

| Pack                | Price (INR) | Credits Added |
| ------------------- | ----------- | ------------- |
| AI Enhancement Pack | ₹2,999      | 250 units     |

Top-up credits are added to `topUpCredits`. They never expire and never reset. A customer can buy multiple packs.

---

## 3. How Credits Work — The Full Lifecycle

### 3.1 Credits Are Set at Subscription Creation

When a customer subscribes (onboarding or plan change):

```
monthlyCreditsAllowance = plan's monthly credit value (e.g., 200 for Pro)
monthlyCredits = 200  (full balance — ready to use)
topUpCredits = 0  (or carry-forward credits from previous subscription on upgrade)
creditsLastResetMonth = current billing period key (YYYYMM)
```

### 3.2 Credits Are Consumed on Every Paid AI Action

When a customer uses a paid AI feature (e.g., generates an image):

1. System checks: does the store have enough credits?
2. If yes → calls Google Gemini API
3. If Google succeeds → deducts units from the store's balance
4. **Consumption order:** `monthlyCredits` are used first. Only when `monthlyCredits` hits 0, `topUpCredits` are used.

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
monthlyCredits → monthlyCreditsAllowance (e.g., back to 200)
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

Top-up credits are never reset, never expire, and persist across billing cycles.

### 3.5 Credits Carry Forward on Plan Upgrade

When a customer upgrades their plan (e.g., Starter → Pro):

1. Old subscription is cancelled immediately
2. Remaining credits from the old plan are calculated
3. Those remaining credits are added as `topUpCredits` on the new subscription
4. New subscription starts with fresh `monthlyCredits` from the new plan

This means customers never lose paid-for credits when upgrading.

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

**Unit value:** 1 unit ≈ ₹12 (derived from ₹2,999 / 250 units in the Enhancement Pack).

---

## 5. Capacity Enforcement — What Happens When Credits Run Out

Before every paid AI call, the system runs a capacity check:

```
User clicks "Generate Image"
  → checkAICapacity(tenantId, storeId, 'image_generation')
  → Calculates: monthlyCredits + topUpCredits = total available
  → Needs 5 units for image generation
  → If total available >= 5 → proceed to Google Gemini
  → If total available < 5 → return 402 error
```

### Overdraft Buffer (Soft Enforcement)

At launch, we allow a **20% overdraft** to prevent bad first impressions. If a customer has 4 units left and needs 5, they're within the 20% buffer (4 × 1.2 = 4.8 ≈ allows up to 4.8 units). In this case, 4.8 < 5, so they're still blocked. But if they had 5 units and needed 6, the buffer (5 × 1.2 = 6) would allow it.

This overdraft buffer can be set to 0 for strict enforcement once we have real usage data.

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

After every AI operation, the API response includes the updated credit balance. The frontend uses a `CustomEvent ('ai-balance-update')` to update the subscription state in the session provider without making an extra Firestore read. This saves one Firestore read per AI operation.

```
API response includes: { remainingBalance: { monthlyCredits: 195, topUpCredits: 50 } }
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

Every AI operation logs a detailed transaction document at: `aiOperations/{tenantId}/{storeId}/{docId}`

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

Raju gets 200 monthly credits. His first month:

| Step                               | Operation                | Units Used    | Google Cost |
| ---------------------------------- | ------------------------ | ------------- | ----------- |
| Upload 2 menu pages                | Extraction (FREE)        | 0             | ₹1.36       |
| Descriptions auto-generated        | First-pass (FREE)        | 0             | ₹0.13       |
| Rewrites 10 descriptions           | REWRITE_DESCRIPTION × 10 | 10            | ₹1.30       |
| Adds Hindi translation             | LANGUAGE_ADDITION × 1    | 3             | ₹0.37       |
| Generates AI images for 15 items   | IMAGE_GENERATION × 15    | 75            | ₹50.70      |
| Edits 3 images (background change) | IMAGE_EDITING × 3        | 15            | ₹10.14      |
| **TOTAL**                          |                          | **103 / 200** | **₹64.00**  |

Raju used 103 of 200 monthly credits. He has 97 credits left this month.

**Next month:** His 200 monthly credits reset to full. The unused 97 do NOT carry forward. He starts fresh with 200 again.

If Raju runs out mid-month, he can buy an Enhancement Pack (₹2,999 = 250 topUpCredits). Those topUp credits persist even after monthly reset.

### Scenario B: Yearly Plan — How Monthly Reset Works

A salon subscribes to Pro Yearly (₹14,990/yr, 200 credits/month) on February 15th.

- **Feb 15 – Mar 14:** 200 credits available. Uses 150. 50 unused (lost at reset).
- **Mar 15:** Lazy reset triggers on first AI call. monthlyCredits back to 200.
- **Mar 15 – Apr 14:** Fresh 200 credits. Uses 80.
- **Apr 15:** Lazy reset again. 200 credits.
- ... continues for 12 months. No monthly payment, no monthly webhook — lazy reset handles it.

Total value over the year: 200 credits × 12 months = 2,400 credits of capacity.

### Scenario C: Credits Exhausted — Purchase Flow

```
Store has: 2 monthlyCredits + 1 topUpCredit = 3 total
Wants to: Generate image (needs 5 units)
Overdraft check: 3 × 1.2 = 3.6 < 5 → BLOCKED

→ API returns 402
→ Frontend shows "Get More Enhancements" button
→ User buys Enhancement Pack (₹2,999)
→ topUpCredits becomes 1 + 250 = 251
→ Retries image generation → succeeds
→ Balance after: 0 monthlyCredits + 246 topUpCredits
  (2 monthly used first, then 3 from topUp)
```

### Scenario D: Plan Upgrade — Credits Carry Forward

Store on Starter (75 credits/mo) has used 30 credits this month. Remaining: 45 monthly + 10 topUp = 55 total.

User upgrades to Pro (200 credits/mo):

1. Old subscription cancelled. Remaining 55 credits saved.
2. New subscription created with: monthlyCredits = 200, topUpCredits = 55 (carried forward)
3. Total available immediately: 255 credits

---

## 10. The Economics (Per-Operation Margins)

### What Google Charges Us

| Operation           | Google Cost (USD) | Google Cost (₹) | Model Used              |
| ------------------- | ----------------- | --------------- | ----------------------- |
| Image Generation    | $0.040            | ₹3.38           | Imagen 3 / Flash Image  |
| Image Editing       | $0.040            | ₹3.38           | Gemini 2.0 Flash        |
| Batch Image Gen     | $0.040            | ₹3.38           | Per image               |
| Image Translation   | $0.045            | ₹3.80           | OCR + translate + regen |
| Language Addition   | $0.0044           | ₹0.37           | Gemini 2.0 Flash        |
| Rewrite Description | $0.0016           | ₹0.13           | Gemini 2.5 Flash        |
| Item Translation    | $0.0004           | ₹0.04           | Gemini 2.0 Flash        |

### Per-Pack Economics (₹2,999 Enhancement Pack = 250 units)

Typical usage of one pack:

| Usage                     | Units Used  | Our Revenue | Google Cost |
| ------------------------- | ----------- | ----------- | ----------- |
| 20 images generated       | 100         | ₹1,200      | ₹67.60      |
| 3 languages added         | 9           | ₹108        | ₹1.11       |
| 50 descriptions rewritten | 50          | ₹600        | ₹6.50       |
| 30 items translated       | 30          | ₹360        | ₹1.20       |
| **TOTAL**                 | **189/250** | **₹2,268**  | **₹76.41**  |

**Pack revenue: ₹2,999. Google cost: ~₹76. Gross margin: ~₹2,923 (97.5%)**

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

| Credits/Image | Images per 200 Monthly | Effect                                                  |
| ------------- | ---------------------- | ------------------------------------------------------- |
| 1–2           | 100–200                | Abused heavily — everyone generates everything          |
| 3             | 66                     | Overused — cost rises, no pack revenue                  |
| **5**         | **40**                 | **Balanced — covers normal SMB, power users buy packs** |
| 7–10          | 20–28                  | Feels restrictive — "AI finished quickly"               |

**Why 5 is the sweet spot:**

- **Pro plan (200 credits):** 40 images/month. Most menus are 30–80 items, but not all need AI images. 20–40 images in first month, then near-zero. Comfortable.
- **Natural segmentation:** Normal SMBs never buy pack. Heavy SMBs buy occasionally. Chains buy regularly.
- **Future-proof:** If Gemini cost rises, we're safe. If it drops, margin increases. If usage explodes, packs absorb load.

**Founder rule:** If adjustment needed later, increase plan credits (the generous lever) — do NOT reduce image cost (the margin lever).

### Monthly Margin Check (via Firestore)

Each AI operation document has `realCostPaise`, `ourChargePaise`, and `marginPaise`. To check margins for any store in any month:

```
Collection: aiOperations/{tenantId}/{storeId}
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
| Credit consumption logic     | `src/lib/ai/capacityCheck.ts` → `consumeAICapacity`   |
| Kill switch                  | `src/config/features.ts` → `ENABLE_AI_ENHANCEMENTS`   |
| Transaction logging          | `src/database/aiOperations/index.tsx`                 |
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
  User upgrades → old plan expired (credits carried) → new plan active

CREDIT FLOW:
  Plan gives monthlyCreditsAllowance (e.g., 200)
  monthlyCredits = 200 (resets every billing cycle)
  topUpCredits = purchased separately (never resets)
  AI call → deduct from monthlyCredits first, then topUpCredits
  Credits exhausted → 402 → "Get More Enhancements" → buy pack

MONTHLY RESET:
  Monthly plans → webhook resets on payment
  Yearly plans → lazy reset on first AI call of new billing month
  Both are idempotent and race-safe

TRACKING:
  Every operation → aiOperations/{tId}/{sId}/{docId}
  Contains: units consumed, Google cost, our charge, margin, tokens, model, timing
```
