# AI Enhancement Packs — Implementation Plan

**Feature:** AI Enhancement Packs (Outcome-Based AI Pricing & Usage Tracking)
**Status:** Implemented and hardened
**Last Updated:** May 13, 2026
**Audience:** Developers only

## May 13, 2026 Runtime Contract

AI enhancement accounting is now enabled end to end for owner-billable AI operations and auditable for free/internal AI operations.

Billable owner actions call `checkAICapacity()` before Gemini, write a `menulistAiOperations/{tId}/{sId}/{operationId}` event after a successful provider call, then call `consumeAICapacity()` to deduct `monthlyCredits` first and `topUpCredits` second. API responses return `remainingBalance`, and desktop/mobile frontend services sync that balance through `syncBalanceFromResponse()` without an extra subscription read.

Free, public, and internal AI calls also write operation events for cost visibility, but set `unitsConsumed = 0` and do not drain owner packs. Current non-billable audit paths include menu intake identity, public create-menu extraction, weekly analytics narrative, Help Center search, public Canonica widget search, Help Center article embedding, and Canonica translation.

Help Center and widget search are conditional audit paths. The shared search core marks provider-backed work through `aiProviderUsed` and `aiProviderOperations`; wrappers write operation records only when the request actually reached Gemini for image query generation, embedding generation, or answer generation. Canonical hits, instant-cache hits, and ordinary cached answers are not AI operations and do not create `menulistAiOperations` writes.

Owner visibility is exposed in desktop and mobile Billing through total enhancements left, plan balance, used-this-cycle count, and pack balance. Desktop and mobile Transactions show credits used and token counts so owners and support can trace usage without exposing internal margin math.

---

## Analysis: ChatGPT Suggestions vs Codebase Reality

### What ChatGPT Got Right

| Suggestion                               | Codebase Evidence                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Internal credits, external outcome packs | `TOKENS_PER_CREDIT`, `CHARGE_PER_CREDIT` in `src/constants/common.ts:138-141`                                               |
| Append-only usage event logging          | `addAiOperation()` in `src/database/aiOperations/index.tsx:217-228`                                                         |
| Rate limiting for AI ops                 | `AI_OPERATION` (20/min), `AI_EXPENSIVE` (5/min) in `src/lib/rateLimit/configs.ts:22-37`                                     |
| Top-up billing infrastructure            | `TOPUPS` collection in `src/constants/database.ts:16`, `PAYMENT_TOPUP` rate limit in `src/lib/rateLimit/configs.ts:148-152` |
| Free/paid boundary                       | `ADD_DESCRIPTION` vs `REWRITE_DESCRIPTION` in `src/constants/common.ts:131-132`                                             |

### What ChatGPT Got Wrong

| Suggestion                             | Why Wrong                                                                                 | Correct Approach                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| OpenAI/GPT models                      | MenuList uses Gemini exclusively (`src/constants/AI/models.ts`)                           | Calibrate unit costs against Google AI pricing               |
| `/tenants/{tenantId}/` Firestore paths | Existing pattern is `{collection}/{tId}/{sId}` (`src/database/aiOperations/index.tsx:14`) | Use existing `MENULIST_AI_OPERATIONS` + `TOPUPS` collections |
| "MOL v0 already exists"                | `ENABLE_MENU_OBSERVATION: false` (`src/config/features.ts:510`) — not built               | Ignore MOL references                                        |
| Mutable `aiCapacityUsed` counter only  | No event-driven backup                                                                    | Use atomic counter + append-only events (reconcilable)       |
| Stripe as payment provider             | MenuList uses **Razorpay** (fully built, production-ready)                                | Adapt existing Razorpay top-up flow for enhancement packs    |

---

## Existing Payment Infrastructure (Razorpay — Already Built)

### CRITICAL: The top-up purchase flow already exists and works

The following Razorpay-based credit purchase system is **fully built and production-ready**. The AI Enhancement Packs implementation must adapt this existing flow, not build a parallel one.

#### Existing Top-Up Flow (End-to-End)

```
Client: handleTopupPurchase(pack, currency)                  [usePaymentHandler.ts:147]
    ↓
POST /api/razorpay/create-topup-order                        [create-topup-order/route.ts]
    → withAuth() → verifyTenantAccess() → canManageSubscription → rateLimit(PAYMENT_TOPUP)
    → Find pack from aiEnhancementPacksList by packId
    → razorpayClient.orders.create({ amount, currency, notes: { tenantId, storeId, packId, creditAmount } })
    → Write topups/{orderId} as pending
    → Return { order } to client
    ↓
Client: Opens Razorpay checkout modal (window.Razorpay)      [usePaymentHandler.ts:209]
    → User completes payment
    ↓
POST /api/razorpay/verify-topup                              [verify-topup/route.ts]
    → withAuth() → verifyTenantAccess() → canManageSubscription → Zod validation
    → Verify Razorpay checkout signature
    → Read topups/{orderId} for idempotency
    → razorpayClient.orders.fetch(order_id) → validate tenant/store notes and extract packId
    → razorpayClient.payments.fetch(payment_id) → auto-capture if authorized
    → Verify captured payment belongs to order_id
    → getActiveSubscriptionForStore(tenantId, storeId)
    → Find pack from aiEnhancementPacksList → get creditAmount
    → In one Firestore transaction: increment topUpCredits and mark topups/{orderId} paid
    → Return { success: true, newCreditBalance }
    ↓
Webhook: /api/razorpay/webhook                               [webhook/route.ts]
    → Signature verification → createPaymentTransaction() → writeLogEntry()
    → Handles: order.paid, payment.failed, subscription.halted, etc.
```

#### Files to ADAPT (Not Rewrite)

| File                                                             | Current Role                                   | What Changes for Enhancement Packs                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/data/PlatformPlansList.ts:109-134`                          | Defines `creditPacksList` with `creditAmount`  | Rename to `aiEnhancementPacksList`, add `internalUnits` field, add outcome descriptions                   |
| `src/data/common.ts:63-70`                                       | Defines `CreditPack` interface                 | Rename to `AIEnhancementPack`, rename `creditAmount` → `internalUnits`, add `outcomeDescription`          |
| `src/app/api/razorpay/create-topup-order/route.ts`               | Creates Razorpay order with credit pack data   | Reference `aiEnhancementPacksList`, pass `internalUnits` in notes instead of `creditAmount`               |
| `src/app/api/razorpay/verify-topup/route.ts`                     | Verifies payment, adds credits to subscription | Keep writing to `subscription.topUpCredits` (per-store). Update labels, remove credit count from response |
| `src/app/api/razorpay/webhook/route.ts`                          | Logs transactions, handles failures            | No structural changes — transaction logging stays as-is                                                   |
| `src/hooks/usePaymentHandler.ts:147-217`                         | Client-side Razorpay checkout orchestration    | Change `name: 'MenuList.ai Credit Pack'` → `'MenuList.ai AI Enhancement Pack'`                            |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx` | Shows credit packs modal                       | Rename labels, remove credit amounts from display                                                         |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`   | Renders individual pack card                   | Remove `creditAmount` display, show outcome description instead                                           |

#### What Stays Exactly As-Is

| Component                                                 | Why No Changes                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Razorpay SDK client (`src/lib/razorpay/razorpay.ts`)      | SDK initialization is provider-level, not product-level                  |
| Razorpay order creation API                               | Same `razorpayClient.orders.create()` call, just different notes data    |
| Payment capture logic in `verify-topup`                   | Auto-capture flow is payment-provider logic, independent of product type |
| Webhook signature verification                            | Security layer, doesn't change with product type                         |
| Rate limiting (`PAYMENT_TOPUP`: 10/hr)                    | Same rate limit applies to enhancement pack purchases                    |
| Security patterns (`withAuth`, `verifyTenantAccess`, Zod) | Already compliant — no changes needed                                    |

---

## Frontend Billing Flow Analysis

### Architecture: Single Billing System (Razorpay Only)

Stripe was fully removed in Feb 2026. Razorpay is the only payment provider.
See `__docs__/razorpay/RAZORPAY_PAYMENT_FLOW.md` for complete reference.

#### `billing/` folder (Razorpay — 11 files)

| File                                                  | Role                                         |
| ----------------------------------------------------- | -------------------------------------------- |
| `billing/index.tsx`                                   | Main billing page orchestrator               |
| `billing/ActiveSubscriptionCard.tsx`                  | Subscription details + **credit card panel** |
| `billing/CreditsPackModal.tsx`                        | Credit pack purchase modal                   |
| `billing/CreditPackCard.tsx`                          | Individual pack card                         |
| `billing/PricingPlansModal.tsx`                       | Upgrade/new plan selection modal             |
| `billing/BillingHistory.tsx`                          | Transaction history table                    |
| `billing/CancellationModal.tsx`                       | Subscription cancellation flow               |
| `billing/RemainingCreditNote.tsx`                     | Credit carryover note during upgrades        |
| `billing/UpgradeConfirmationModal.tsx`                | Upgrade confirmation                         |
| `billing/UpgradeSubscriptionPayementSuccessModal.tsx` | Post-upgrade success modal                   |
| `billing/NoSubscriptionView.tsx`                      | No-subscription gate (redirects to /billing) |

---

### Active Credit Purchase Flow (End-to-End Frontend)

```
BillingPage (billing/index.tsx)
    │
    ├── ActiveSubscriptionCard
    │       ├── Subscription details (plan, billing cycle, payment method)
    │       ├── Credit Card Panel (right side):
    │       │     ├── "Total Available AI Credits" → shows (monthlyCredits + topUpCredits)
    │       │     ├── "Monthly Credits" → progress bar (used / allowance)
    │       │     ├── "Top-up Credits" → shows topUpCredits count
    │       │     └── "Buy More Credits" button → opens CreditsPackModal
    │       └── Action buttons (Upgrade, Cancel, etc.)
    │
    ├── CreditsPackModal
    │       ├── Title: "Top Up Your AI Credits"
    │       └── Maps creditPacksList → CreditPackCard (x3)
    │               ├── Shows pack.creditAmount (100, 250, 500)
    │               ├── Shows "One-Time AI Credits"
    │               └── onClick → handleCreditsPurchase(packId)
    │
    └── handleCreditsPurchase(packId)
            ├── Find pack from creditPacksList
            ├── handleTopupPurchase(pack, currency)  [usePaymentHandler.ts]
            │       ├── POST /api/razorpay/create-topup-order
            │       ├── Open Razorpay checkout modal
            │       ├── On success: POST /api/razorpay/verify-topup
            │       └── Return success/failure
            ├── message.success('Topup Credits purchased successfully.')
            ├── Show confetti animation
            └── Update local state: subscription.topUpCredits += pack.creditAmount
```

### Credit Visibility on Subscription Card

The `ActiveSubscriptionCard.tsx` is the **primary credit exposure surface**. It reads these fields from the subscription document:

```typescript
// ActiveSubscriptionCard.tsx:46
const monthlyCreditUsage = activeSubscription.monthlyCreditsAllowance > 0
    ? (activeSubscription.monthlyCredits / activeSubscription.monthlyCreditsAllowance) * 100
    : 0;

// ActiveSubscriptionCard.tsx:249
value={(activeSubscription.monthlyCredits + activeSubscription.topUpCredits)}

// ActiveSubscriptionCard.tsx:259
format={() => `${activeSubscription.monthlyCredits} / ${activeSubscription.monthlyCreditsAllowance}`}
```

### Real-Time Balance Sync (Firebase Cost Optimization)

After every AI operation, the backend returns the updated `remainingBalance` in the API response. The frontend updates `activeSubscription` state via a CustomEvent, **eliminating an extra Firebase read per AI call**.

```
AI Service (e.g. generateImageViaApi)
    → fetch('/api/image-generation')
    → Backend: checkAICapacity (1 Firestore READ)
    → Backend: Gemini API call
    → Backend: consumeAICapacity (1 Firestore WRITE) → returns { monthlyCredits, topUpCredits }
    → Backend: response includes remainingBalance
    ↓
Frontend service: syncBalanceFromResponse(responseJson)
    → Dispatches CustomEvent('ai-balance-update', { detail: remainingBalance })
    ↓
SessionProvider: event listener
    → setActiveSubscription(prev => { ...prev, ...detail })
    → UI reflects updated balance immediately
```

**Files involved:**

- `src/services/ai/balanceSync.ts` — dispatches CustomEvent
- `src/providers/sessionProvider.tsx` — listens for event, updates state
- `src/lib/ai/capacityCheck.ts` — `consumeAICapacity()` returns `RemainingBalance`
- All 6 AI API routes — include `remainingBalance` in JSON response
- All 5 frontend services — call `syncBalanceFromResponse()` after parsing response

**Firebase cost saved:** 1 Firestore read per AI operation (frontend no longer needs to re-fetch subscription after each AI call).

### Monthly Credit Reset (Two-Layer)

`monthlyCredits` resets to `monthlyCreditsAllowance` at the start of each billing month via two complementary mechanisms:

**Layer 1 — Webhook (monthly plans):** `subscription.charged` event in `api/razorpay/webhook/route.ts` resets credits when Razorpay charges the next cycle.

**Layer 2 — Lazy reset (yearly plans + safety net):** `checkAICapacity()` in `src/lib/ai/capacityCheck.ts` checks `creditsLastResetMonth` against the current billing period (YYYYMM key based on subscription anchor day, NOT calendar month). If different, it re-reads the subscription in a Firestore transaction, resets credits, and writes to Firestore (1 read + 1 write, first AI call of the billing month only). Anchor day is capped to days-in-month for month-end edge cases (e.g., anchor=31 in Feb→28). Race-safe — concurrent calls cannot overwrite a usage deduction during a reset.

**New field:** `creditsLastResetMonth?: number` on `FirestoreSubscriptionDoc`. Set by all subscription creation routes, webhook, and lazy reset. Old subscriptions without the field get reset on first AI call.

---

### Billing History Credit Exposure

The `billing/index.tsx:fetchBillingHistory()` transforms webhook events and exposes credits:

```typescript
// Line 86-94: Top-up history entry
type: "Credit Pack Purchase",
description: `Top-Up Credits for ${orderNotes?.packName}`,
creditsRe: orderNotes?.creditAmount
```

### Credit Carryover During Upgrades

`RemainingCreditNote.tsx` explicitly shows credit math to the user during plan upgrades:

```typescript
// Line 14: Shows full credit breakdown
note = `Unused credits of the current month + remaining months * monthly credits allowance + topup credits:
        ${unusedThisMonth} + ${monthsRemaining} * ${monthlyCreditsAllowance} + ${activeSubscription.topUpCredits}`;
```

---

### All Credit Visibility Violations (Doctrine Non-Compliance)

Every point where "credits" are exposed to the user in the active billing flow:

| #   | File                         | Line    | Violation                                       | Required Change                                          |
| --- | ---------------------------- | ------- | ----------------------------------------------- | -------------------------------------------------------- |
| 1   | `ActiveSubscriptionCard.tsx` | 246     | "Total Available AI Credits" title              | Remove or change to outcome-based                        |
| 2   | `ActiveSubscriptionCard.tsx` | 249     | Shows `(monthlyCredits + topUpCredits)` number  | Remove numeric display                                   |
| 3   | `ActiveSubscriptionCard.tsx` | 255     | "Monthly Credits" label                         | Remove                                                   |
| 4   | `ActiveSubscriptionCard.tsx` | 256-259 | Progress bar `X / Y` credits                    | Remove progress bar entirely                             |
| 5   | `ActiveSubscriptionCard.tsx` | 263     | "Top-up Credits" title                          | Remove                                                   |
| 6   | `ActiveSubscriptionCard.tsx` | 266     | Shows `topUpCredits` number                     | Remove numeric display                                   |
| 7   | `ActiveSubscriptionCard.tsx` | 272     | "Buy More Credits" button                       | Change to "Get AI Enhancements"                          |
| 8   | `billing/index.tsx`          | 86      | `type: "Credit Pack Purchase"` in history       | Change to "AI Enhancement Pack"                          |
| 9   | `billing/index.tsx`          | 88      | `"Top-Up Credits for ${packName}"`              | Change to pack name only                                 |
| 10  | `billing/index.tsx`          | 94      | `creditsRe: orderNotes?.creditAmount`           | Remove from history display                              |
| 11  | `billing/index.tsx`          | 140     | `'Topup Credits purchased successfully.'`       | Change to "AI enhancements are ready"                    |
| 12  | `billing/index.tsx`          | 143     | Sets `topUpCredits` directly                    | Keep internally, don't expose                            |
| 13  | `CreditsPackModal.tsx`       | 24      | "Top Up Your AI Credits"                        | "Get more AI enhancements for your menu"                 |
| 14  | `CreditsPackModal.tsx`       | 25      | "Need more power... Top up with a credit pack." | "Unlock additional AI features"                          |
| 15  | `CreditPackCard.tsx`         | 101     | Shows `pack.creditAmount` (100, 250, 500)       | Remove — show outcome description                        |
| 16  | `CreditPackCard.tsx`         | 102     | "One-Time AI Credits"                           | "AI Enhancement Pack"                                    |
| 17  | `usePaymentHandler.ts`       | 173     | `name: 'MenuList.ai Credit Pack'`               | `'MenuList.ai AI Enhancement Pack'`                      |
| 18  | `RemainingCreditNote.tsx`    | 14-16   | Full credit math breakdown                      | Simplify to "Your remaining value transfers to new plan" |
| 19  | `RemainingCreditNote.tsx`    | 24      | Shows `totalRemainingCredits` number            | Remove numeric display                                   |

---

### Re-Architecture Plan (Confirmed: Not Live, 3-Year Freeze Applies)

> **User confirmed:** "im ready for rearchitecturing the credit purchase flow... since we are not live yet... it for 3 year freeze rule"

This means the entire credit-to-enhancement-pack rename can be done **cleanly at launch** without migration concerns. The 3-year freeze rule means: ship the full AI Enhancement Pack architecture from day one.

#### ActiveSubscriptionCard — Target State

The right-side credit card panel transforms from a credit counter to a simple AI status indicator:

**Current (violates doctrine):**

```
┌─────────────────────────┐
│ Total Available AI Credits   247 │
│ Monthly Credits  ████████ 150/200 │
│ Top-up Credits              97 │
│ [View Usage] [Buy More Credits] │
└─────────────────────────┘
```

**Target (doctrine-compliant):**

```
┌─────────────────────────┐
│ AI Features               Active │
│ Your plan includes AI enhancements │
│ for images, descriptions, and    │
│ translations.                    │
│ [Get AI Enhancements]            │
└─────────────────────────┘
```

**Behavior:**

- If capacity available → Show "Active" status, no numbers
- If capacity exhausted → Show calm CTA "Get more AI enhancements for your menu"
- Never show credits, units, remaining, progress bars, or consumption metrics
- The `AICapacityGate` component (from Week 4 impl plan) handles this logic

#### CreditsPackModal + CreditPackCard — Target State

**Current:** 3 packs showing credit amounts (100, 250, 500) with "One-Time AI Credits"

**Target (single pack at launch):** 1 pack showing outcome description

```
┌─────────────────────────┐
│ AI Enhancement Pack              │
│ AI enhancements for your menu — │
│ images, descriptions,           │
│ translations                    │
│ ₹1,250                         │
│ [Purchase]                      │
└─────────────────────────┘
```

#### Billing History — Target State

Top-up entries change from:

- `"Credit Pack Purchase"` → `"AI Enhancement Pack"`
- `"Top-Up Credits for Starter Pack"` → `"AI Enhancement Pack"`
- Remove `creditsRe` field from display entirely

#### RemainingCreditNote — Target State

Changes from showing credit math to simple reassurance:

- **Current:** "You have 247 credits of the current Pro Plan will be added into topup credits..."
- **Target:** "Your remaining plan value will transfer to your new plan, so you don't lose value."

---

## Existing Infrastructure Map

### Files That Already Exist (Modify Only)

| File                                                             | What It Does                                                    | What To Change                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/constants/common.ts:123-141`                                | AI action types + credit constants                              | Add `AI_UNIT_COSTS` config alongside existing constants                                       |
| `src/constants/database.ts:9,16,90-98`                           | `MENULIST_AI_OPERATIONS`, `TOPUPS`, `AI_OPERATIONS_COLLECTIONS` | No changes needed — collections already defined                                               |
| `src/database/aiOperations/index.tsx:217-228`                    | `addAiOperation()` DAL function                                 | Add `unitsConsumed` field to data shape                                                       |
| `src/app/api/descriptions/route.ts:172`                          | Transaction logging (commented out)                             | Uncomment `addAiOperation()`, add capacity check                                              |
| `src/app/api/image-generation/route.ts:264`                      | Transaction logging (commented out)                             | Uncomment `addAiOperation()`, add capacity check                                              |
| `src/app/api/image-generation/batch-generation/route.ts:260`     | Transaction logging (commented out)                             | Uncomment `addAiOperation()`, add capacity check                                              |
| `src/app/api/image-editing/route.ts:136`                         | Transaction logging (commented out)                             | Uncomment `addAiOperation()`, add capacity check                                              |
| `src/app/api/translations/route.ts:116`                          | Transaction logging (commented out)                             | Uncomment `addAiOperation()`, add capacity check                                              |
| `src/app/api/new-item-metadata/route.ts:129`                     | Transaction logging (commented out)                             | Uncomment `addAiOperation()`, add capacity check                                              |
| `src/lib/rateLimit/configs.ts:148-152`                           | `PAYMENT_TOPUP` rate limit (10/hr)                              | No changes needed                                                                             |
| `src/data/PlatformPlansList.ts:109-134`                          | Credit packs list                                               | Rename to `aiEnhancementPacksList`, update interface                                          |
| `src/data/common.ts:63-70`                                       | `CreditPack` interface                                          | Rename to `AIEnhancementPack` interface                                                       |
| `src/data/PlatformFeaturesList.ts`                               | Feature availability per plan                                   | Change "Unlimited" → "Included" for AI features                                               |
| `src/app/api/razorpay/create-topup-order/route.ts`               | Creates Razorpay order for pack purchase                        | Update pack reference, notes data                                                             |
| `src/app/api/razorpay/verify-topup/route.ts`                     | Verifies payment, adds credits to subscription                  | Keep writing to `subscription.topUpCredits`. Update labels, remove credit count from response |
| `src/hooks/usePaymentHandler.ts`                                 | Client Razorpay checkout handler                                | Update product name label                                                                     |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx` | Pack selection modal                                            | Rename labels per doctrine                                                                    |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`   | Pack display card                                               | Remove credit amount, show outcome description                                                |

### Files That Need To Be Created

| File                                       | Purpose                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `src/constants/AI/unitCosts.ts`            | `AI_UNIT_COSTS` config + `OVERDRAFT_BUFFER_PERCENT` constant  |
| `src/lib/ai/capacityCheck.ts`              | `checkAICapacity()` server-side middleware                    |
| `src/app/api/ai-packs/status/route.ts`     | Check if store has capacity (returns `canRunAction: boolean`) |
| `src/components/common/AICapacityGate.tsx` | Client wrapper: shows calm upsell CTA when blocked            |

---

## Implementation Checklist

### Prerequisites (Before Week 1)

#### Task 0.1: Add System-Wide AI Enhancement Kill Switch

> **Source:** ChatGPT feedback point #4 (Feb 9, 2026 review)

**File:** `src/config/features.ts`

Add a system-wide kill switch for all AI enhancement operations. This is an **infrastructure survival control** — if Gemini pricing changes, a bug causes runaway usage, or someone scripts the API, this flag disables all paid AI operations instantly.

```typescript
// ═════════════════════════════════════════════════════════════════
// AI ENHANCEMENT PACKS (Cost Control)
// ═════════════════════════════════════════════════════════════════

/**
 * Master kill switch for ALL paid AI enhancement operations.
 *
 * When OFF:
 * - Free operations (extraction, base descriptions) continue working
 * - Paid operations (image gen, rewrites, translations) are disabled
 * - Calm message shown: "AI enhancements temporarily unavailable"
 * - No crash, no error — graceful degradation
 *
 * Use cases:
 * - Emergency: Gemini pricing spike or runaway API costs
 * - Abuse: Scripted API attack consuming credits
 * - Maintenance: Capacity system migration or recalibration
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 *
 * Production: Enable when capacity enforcement is ready
 * Emergency: Set to false to disable all paid AI operations instantly
 */
ENABLE_AI_ENHANCEMENTS: true,
```

**Integration pattern** (used in `checkAICapacity()`):

```typescript
import { FEATURE_FLAGS } from "@config/features";

if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS && !isFreeTierAction(actionType)) {
  return { allowed: false, reason: "maintenance", ... };
}
```

**Validation:**

- [ ] Flag added to `src/config/features.ts` following existing pattern
- [ ] Free operations (extraction, ADD_DESCRIPTION) unaffected when flag is OFF
- [ ] `checkAICapacity()` checks flag before capacity check
- [ ] Client receives calm message, not error, when flag is OFF

---

#### Task 0.2: Add Overdraft Buffer Config

> **Source:** ChatGPT feedback point #1 (Feb 9, 2026 review)

**File:** `src/constants/AI/unitCosts.ts` (same file as AI_UNIT_COSTS in Task 1.1)

```typescript
/**
 * Overdraft buffer for soft enforcement at launch.
 *
 * Allows users to exceed their exact capacity by this percentage
 * before blocking. Prevents bad first impressions and support friction.
 *
 * Set to 0 for strict enforcement (after real usage data collected).
 * NEVER expose this to customers.
 */
export const OVERDRAFT_BUFFER_PERCENT = 20; // 20% overdraft allowed at launch
```

**Used in `checkAICapacity()`** — see Task 2.2.

**Validation:**

- [ ] Constant exported from `unitCosts.ts`
- [ ] `checkAICapacity()` uses buffer in capacity calculation
- [ ] Overdraft usage logged in AI operation events for margin tracking

---

### Week 1: Foundation (Internal Cost Tracking)

#### Task 1.1: Define AI Unit Costs

**File:** `src/constants/AI/unitCosts.ts` (NEW)

```typescript
import { AI_ACTIONS_TYPES } from "@constant/common";

/**
 * Internal AI Unit Costs
 *
 * Units are abstract — they do NOT map 1:1 to tokens, API calls, or dollars.
 * They normalize different AI operations to a single cost metric.
 *
 * CALIBRATION NOTE: These values need calibration against actual
 * Gemini API billing data. Current values are estimates.
 *
 * NEVER expose these values to customers.
 */
export const AI_UNIT_COSTS: Record<string, number> = {
  // Free operations (0 units)
  [AI_ACTIONS_TYPES.IMAGE_PROCESSING]: 0, // Core extraction — always free
  [AI_ACTIONS_TYPES.ADD_DESCRIPTION]: 0, // First-pass description — free
  [AI_ACTIONS_TYPES.NEW_ITEM_METADATA]: 0, // Structural — free

  // Paid operations (consumes units)
  [AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: 2, // ~500-2000 Gemini tokens
  [AI_ACTIONS_TYPES.IMAGE_GENERATION]: 5, // Gemini 2.0 Flash / Imagen 3
  [AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION]: 5, // Per image in batch
  [AI_ACTIONS_TYPES.LANGUAGE_ADDITION]: 3, // Per language, Gemini 2.0 Flash
  [AI_ACTIONS_TYPES.ITEM_TRANSLATION]: 1, // Per item translation
  [AI_ACTIONS_TYPES.IMAGE_TRANSLATION]: 4, // OCR + translation + regen
};

/**
 * Check if an AI action is free (0 units)
 */
export function isFreeTierAction(actionType: string): boolean {
  return (AI_UNIT_COSTS[actionType] ?? 0) === 0;
}

/**
 * Get unit cost for an AI action
 */
export function getUnitCost(actionType: string): number {
  return AI_UNIT_COSTS[actionType] ?? 0;
}
```

**Validation:**

- [ ] All `AI_ACTIONS_TYPES` values have a corresponding unit cost
- [ ] Free operations return 0
- [ ] Values calibrated against Gemini billing (OPEN: needs founder input)

---

#### Task 1.2: Uncomment `addAiOperation()` in All 6 API Routes

Each route has the same pattern — a commented-out `addAiOperation()` call. Uncomment and enhance with `unitsConsumed`.

**Route 1: `src/app/api/descriptions/route.ts:172`**

Current:

```typescript
transactionObject.transactionId = new Date().getTime().toString(); //await addAiOperation(transactionObject);;
```

Change to:

```typescript
transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
transactionObject.transactionId = await addAiOperation(transactionObject);
```

**Route 2: `src/app/api/image-generation/route.ts:264`**

Current:

```typescript
const transactionId = "test"; //||await addAiOperation(transactionObject);
```

Change to:

```typescript
transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
const transactionId = await addAiOperation(transactionObject);
```

**Route 3: `src/app/api/image-generation/batch-generation/route.ts:260`**

Current:

```typescript
const transactionId = "test"; //||await addAiOperation(transactionObject);
```

Change to:

```typescript
transactionObject.unitsConsumed =
  getUnitCost(transactionObject.action) * generatedImagesResponse.length;
const transactionId = await addAiOperation(transactionObject);
```

**Route 4: `src/app/api/image-editing/route.ts:136`**

Current:

```typescript
transactionObject.transactionId = crypto.randomUUID(); //await addAiOperation(transactionObject);
```

Change to:

```typescript
transactionObject.unitsConsumed = getUnitCost(
  AI_ACTIONS_TYPES.IMAGE_GENERATION,
);
transactionObject.transactionId = await addAiOperation(transactionObject);
```

**Route 5: `src/app/api/translations/route.ts:116`**

Current:

```typescript
transactionObject.transactionId = new Date().getTime().toString(); //await addAiOperation(transactionObject);;
```

Change to:

```typescript
transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
transactionObject.transactionId = await addAiOperation(transactionObject);
```

**Route 6: `src/app/api/new-item-metadata/route.ts:129`**

Current:

```typescript
transactionObject.transactionId = new Date().getTime().toString(); //await addAiOperation(transactionObject);;
```

Change to:

```typescript
transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
transactionObject.transactionId = await addAiOperation(transactionObject);
```

**Validation:**

- [ ] All 6 routes have `addAiOperation()` uncommented
- [ ] All transaction objects include `unitsConsumed` field
- [ ] Batch operations multiply unit cost by item count
- [ ] Free operations (extraction, ADD_DESCRIPTION, NEW_ITEM_METADATA) log 0 units
- [ ] No regressions in API response structure (client still receives `transaction` object)

---

#### Task 1.3: Enhance `addAiOperation` DAL

**File:** `src/database/aiOperations/index.tsx`

The existing `addAiOperation` at line 217-228 is functional and follows DAL patterns correctly. The only enhancement needed is ensuring the data shape includes `unitsConsumed`. Since `addAiOperation` accepts `data: any` and uses `requestBodyComposer`, no structural changes are needed — just ensure callers pass `unitsConsumed`.

**Optional improvement:** Add TypeScript interface for transaction data:

```typescript
interface AIOperationData {
  action: string;
  projectId: string;
  fileId: string;
  model: string;
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  processingTime: number;
  tokenPerCredit: number;
  chargePerCredit: number;
  totalCredits: number;
  totalCharge: number;
  unitsConsumed: number; // NEW: internal AI units consumed
  transactionId?: string;
  clientResponse?: any;
  geminiResponse?: string;
  generationConfig?: any;
}
```

**Validation:**

- [ ] `requestBodyComposer` auto-adds `sId`, `tId`, `uId`, timestamps
- [ ] `apiCallComposer` provides error handling and logging
- [ ] Data writes to `menulistAiOperations/{tId}/{sId}` path

---

### Week 2: Capacity Enforcement

#### Task 2.1: AI Capacity Check & Consumption (Using Existing Subscription Credits)

> **Architecture Decision: Per-Store, On Subscription (VALIDATED)**
>
> Capacity lives on the `subscription` document — the same `FirestoreSubscriptionDoc` that already has `monthlyCredits` and `topUpCredits`. No new documents, no new collections, no scope change.
>
> **Why NOT per-tenant:**
>
> 1. Subscriptions are per-store (`getActiveSubscriptionForStore(tId, sId)`)
> 2. AI operations log to per-store path (`menulistAiOperations/{tId}/{sId}`)
> 3. Projects are per-store (`projectsMetadata/{tId}/{sId}`)
> 4. Top-ups write to per-store subscription (`subscription.topUpCredits`)
> 5. Multi-chain: each store has its own subscription and should manage capacity independently
> 6. Moving to per-tenant would create scope mismatch, cross-store drain, and race conditions
>
> **Founder rationale:** Local outlets use AI credits only for overridden/local data (their choice, not master's). Local items only benefit that outlet — no other outlet gets value. Per-store capacity ensures each outlet pays for its own work.
>
> **Full multi-outlet scenarios:** See spec doc → "Multi-Outlet Pack Logic (Detailed)"

**No new DAL file needed.** Use existing `getActiveSubscriptionForStore()` and `updateSubscription()` from `src/database/subscriptions/index.ts`.

**Capacity model (using existing fields):**

```
Available capacity = subscription.monthlyCredits + subscription.topUpCredits
```

**Consumption order:**

1. Decrement `monthlyCredits` first (resets each billing cycle)
2. When `monthlyCredits` reaches 0, decrement `topUpCredits` (persistent)
3. When both = 0, capacity exhausted → upsell CTA

**Helper function** (add to `src/lib/ai/capacityCheck.ts` — NEW file):

```typescript
import {
  getActiveSubscriptionForStore,
  updateSubscription,
} from "@database/subscriptions";
import { isFreeTierAction, getUnitCost } from "@constant/AI/unitCosts";
import { FirestoreSubscriptionDoc } from "@type/razorpay";

/**
 * Consume AI capacity from a store's subscription.
 * Decrements monthlyCredits first, then topUpCredits.
 * Uses atomic-safe pattern: read → check → write.
 *
 * IMPORTANT: Called AFTER successful Gemini API call, not before.
 * The pre-check is done by checkAICapacity() before the call.
 */
export async function consumeAICapacity(
  subscription: FirestoreSubscriptionDoc,
  unitsToConsume: number,
): Promise<void> {
  const monthlyRemaining = subscription.monthlyCredits || 0;
  const topUpRemaining = subscription.topUpCredits || 0;

  let newMonthly = monthlyRemaining;
  let newTopUp = topUpRemaining;

  if (monthlyRemaining >= unitsToConsume) {
    // Fully covered by monthly credits
    newMonthly = monthlyRemaining - unitsToConsume;
  } else {
    // Use all remaining monthly, rest from topUp
    const remainder = unitsToConsume - monthlyRemaining;
    newMonthly = 0;
    newTopUp = Math.max(0, topUpRemaining - remainder);
  }

  await updateSubscription(subscription.id, {
    monthlyCredits: newMonthly,
    topUpCredits: newTopUp,
  });
}
```

**Validation:**

- [ ] Uses existing `updateSubscription()` DAL (no new Firestore write patterns)
- [ ] Decrements monthlyCredits first, then topUpCredits
- [ ] No new fields on subscription document
- [ ] No new collections or documents
- [ ] Per-store scoped (subscription is per-store)

---

#### Task 2.2: Create Capacity Check Middleware

**File:** `src/lib/ai/capacityCheck.ts` (same file as consumeAICapacity above)

Server-side capacity enforcement function used by all paid AI routes. Uses the store's active subscription to check available credits.

```typescript
import { getActiveSubscriptionForStore } from "@database/subscriptions";
import {
  isFreeTierAction,
  getUnitCost,
  OVERDRAFT_BUFFER_PERCENT,
} from "@constant/AI/unitCosts";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { FEATURE_FLAGS } from "@config/features";

interface CapacityCheckResult {
  allowed: boolean;
  unitsRequired: number;
  remaining: number;
  reason?:
    | "free"
    | "sufficient"
    | "overdraft"
    | "exhausted"
    | "maintenance"
    | "no_subscription";
  subscription: FirestoreSubscriptionDoc | null; // Pass to consumeAICapacity after success
}

/**
 * Check if a store's subscription has sufficient AI capacity for an action.
 *
 * Checks in order:
 * 1. Kill switch (ENABLE_AI_ENHANCEMENTS) — if OFF, block paid actions
 * 2. Free tier check — free actions always pass
 * 3. Subscription lookup — per-store
 * 4. Capacity check with overdraft buffer (soft enforcement at launch)
 *
 * IMPORTANT: This check happens BEFORE the Gemini API call.
 * If capacity is insufficient, the API call is never made.
 *
 * @param tenantId - Tenant ID from session
 * @param storeId - Store ID from session (capacity is per-store)
 * @param actionType - AI_ACTIONS_TYPES value
 * @param quantity - Number of items (for batch operations)
 */
export async function checkAICapacity(
  tenantId: number,
  storeId: number,
  actionType: string,
  quantity: number = 1,
): Promise<CapacityCheckResult> {
  // Free actions always allowed (even when kill switch is OFF)
  if (isFreeTierAction(actionType)) {
    return {
      allowed: true,
      unitsRequired: 0,
      remaining: Infinity,
      reason: "free",
      subscription: null,
    };
  }

  // Kill switch check — block all paid operations when OFF
  if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS) {
    return {
      allowed: false,
      unitsRequired: 0,
      remaining: 0,
      reason: "maintenance",
      subscription: null,
    };
  }

  const unitsRequired = getUnitCost(actionType) * quantity;
  const subscription = await getActiveSubscriptionForStore(tenantId, storeId);

  if (!subscription) {
    return {
      allowed: false,
      unitsRequired,
      remaining: 0,
      reason: "no_subscription",
      subscription: null,
    };
  }

  const remaining =
    (subscription.monthlyCredits || 0) + (subscription.topUpCredits || 0);

  // Soft enforcement: allow overdraft up to OVERDRAFT_BUFFER_PERCENT
  const overdraftAllowance = remaining * (OVERDRAFT_BUFFER_PERCENT / 100);
  const effectiveCapacity = remaining + overdraftAllowance;
  const isOverdraft =
    remaining < unitsRequired && effectiveCapacity >= unitsRequired;

  return {
    allowed: effectiveCapacity >= unitsRequired,
    unitsRequired,
    remaining,
    reason:
      remaining >= unitsRequired
        ? "sufficient"
        : isOverdraft
          ? "overdraft"
          : "exhausted",
    subscription,
  };
}
```

**Integration Pattern (per AI route):**

```typescript
// At the top of each paid AI route, after withAuth():
const capacityCheck = await checkAICapacity(
  session.user.tenantId,
  session.user.storeId,
  actionType,
  quantity,
);
if (!capacityCheck.allowed) {
  return NextResponse.json(
    {
      success: false,
      blocked: true,
      reason: "capacity_exhausted", // Internal only — client maps to CTA
    },
    { status: 402 },
  );
}

// ... proceed with Gemini API call ...

// After successful operation, decrement from subscription credits:
await consumeAICapacity(
  capacityCheck.subscription,
  capacityCheck.unitsRequired,
);
```

**Critical:** Capacity is consumed AFTER successful Gemini call, not before. This avoids deducting units for failed operations. The subscription object from the check is reused for the consume call to avoid a second Firestore read.

---

#### Task 2.3: Wire Capacity Check Into All 6 API Routes

Each paid AI route gets the same enforcement pattern:

| Route                                        | Action Type              | Quantity Logic             |
| -------------------------------------------- | ------------------------ | -------------------------- |
| `descriptions/route.ts`                      | `REWRITE_DESCRIPTION`    | 1 per call                 |
| `image-generation/route.ts`                  | `IMAGE_GENERATION`       | 1 per call                 |
| `image-generation/batch-generation/route.ts` | `BATCH_IMAGE_GENERATION` | `items.length`             |
| `image-editing/route.ts`                     | `IMAGE_GENERATION`       | 1 per call                 |
| `translations/route.ts`                      | `LANGUAGE_ADDITION`      | 1 per language             |
| `new-item-metadata/route.ts`                 | `NEW_ITEM_METADATA`      | 0 (free) — no check needed |

**Note:** `image-processor/route.ts` (extraction) is always free — no capacity check.

**Validation:**

- [ ] All paid routes check capacity before Gemini call
- [ ] All paid routes consume capacity after successful Gemini call
- [ ] Free routes (`IMAGE_PROCESSING`, `ADD_DESCRIPTION`, `NEW_ITEM_METADATA`) skip capacity check
- [ ] Batch operations multiply by quantity
- [ ] 402 response triggers upsell CTA on client (not error message)

---

### Week 3: Pack Purchase Flow (Adapt Existing Razorpay Top-Up)

> **NOTE:** The Razorpay payment flow rework is handled separately. This section documents the TARGET state for when that rework happens. The existing `create-topup-order` → `verify-topup` flow is the foundation — it gets adapted, not replaced.

#### Task 3.1: Rename Data Structures

**File:** `src/data/common.ts` (MODIFY)

Current:

```typescript
export interface CreditPack {
  packId: string;
  name: string;
  creditAmount: number;
  priceINR: Price;
  priceUSD: Price;
  stripePriceId: string;
}
```

Change to:

```typescript
export interface AIEnhancementPack {
  packId: string;
  name: string; // User-facing name (e.g., "AI Enhancement Pack")
  outcomeDescription: string; // What the user gets (e.g., "AI enhancements for your menu")
  internalUnits: number; // INTERNAL: Never display to user
  priceINR: Price;
  priceUSD: Price;
  providerPriceId: string; // Provider-agnostic (was stripePriceId)
}
```

**File:** `src/data/PlatformPlansList.ts` (MODIFY)

Current:

```typescript
const creditPacksList: CreditPack[] = [
    { "packId": "starter", "name": "Starter Pack", "creditAmount": 100, ... },
    { "packId": "value", "name": "Value Pack", "creditAmount": 250, ... },
    { "packId": "pro", "name": "Pro Pack", "creditAmount": 500, ... },
];
```

Change to:

```typescript
const aiEnhancementPacksList: AIEnhancementPack[] = [
  {
    packId: "enhancement",
    name: "AI Enhancement Pack",
    outcomeDescription:
      "AI enhancements for your menu — images, descriptions, translations",
    internalUnits: 100, // Calibrate against Gemini costs
    priceINR: { price: 125000, monthlyCredits: null },
    priceUSD: { price: 1500, monthlyCredits: null },
    providerPriceId: "price_AI_ENHANCEMENT_PACK_ID",
  },
  // Future: tiered packs (capability-flagged, not "Phase 2")
];
```

> **Launch model:** Single pack, one price. The `packTiers: "single"` feature flag controls this. Multiple tiers are data-ready but inactive.

#### Task 3.2: Adapt Razorpay Top-Up Order Route

**File:** `src/app/api/razorpay/create-topup-order/route.ts` (MODIFY)

Key changes (handled during Razorpay flow rework):

1. Import `aiEnhancementPacksList` instead of `creditPacksList`
2. Pass `internalUnits` in Razorpay order notes instead of `creditAmount`
3. Error message: "Enhancement pack not found" instead of "Credit pack not found"

```typescript
// Line 87: Change pack lookup
const selectedPack = aiEnhancementPacksList.find((p) => p.packId === packId);
if (!selectedPack) {
  return NextResponse.json(
    { error: "Enhancement pack not found." },
    { status: 404 },
  );
}

// Line 100-113: Update Razorpay order notes
const razorpayOrder = await razorpayClient.orders.create({
  amount: price,
  currency,
  notes: {
    tenantId,
    storeId,
    userId,
    packId,
    internalUnits: selectedPack.internalUnits, // was: creditAmount
    packName: selectedPack.name,
    price: price,
    currency,
  },
});
```

#### Task 3.3: Adapt Razorpay Verify-Topup Route

**File:** `src/app/api/razorpay/verify-topup/route.ts` (MODIFY)

Key changes:

1. Import `aiEnhancementPacksList` instead of `creditPacksList`
2. Use `internalUnits` instead of `creditAmount` for the amount to add
3. **Keep writing to `subscription.topUpCredits`** (per-store, existing behavior)
4. Remove credit count from response (doctrine compliance)

```typescript
// Line 123: Change pack lookup
const selectedPack = aiEnhancementPacksList.find((p) => p.packId === packId);
if (!selectedPack) {
  return NextResponse.json(
    { success: false, error: "Invalid enhancement pack." },
    { status: 400 },
  );
}
const unitsToAdd = selectedPack.internalUnits;

// Line 133-145: KEEP existing per-store subscription write
// Credits stay on subscription document (per-store, aligned with all other data)
const currentTopUpCredits = internalSub.topUpCredits || 0;
const newBalance = currentTopUpCredits + unitsToAdd;
await updateSubscription(internalSub.id, { topUpCredits: newBalance });

// NOTE: Do NOT return unit balance in response — doctrine violation
return NextResponse.json({ success: true });
```

#### Task 3.4: Adapt Client Payment Handler

**File:** `src/hooks/usePaymentHandler.ts` (MODIFY)

```typescript
// Line 173: Change product name shown in Razorpay checkout
const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: order.id,
  name: "MenuList.ai AI Enhancement Pack", // was: 'MenuList.ai Credit Pack'
  description: pack.name, // Uses pack.name (doctrine-compliant)
  // ... rest stays the same
};
```

#### Task 3.5: Create Pack Status API Route

**File:** `src/app/api/ai-packs/status/route.ts` (NEW)

Simple route that returns whether the current store's subscription has capacity for AI actions. Client uses this to pre-check before showing AI action buttons.

```typescript
// Response shape (NEVER includes unit counts):
{
    canRunActions: true,      // Has capacity
    packAvailable: true,      // Enhancement pack exists for purchase
}
```

---

### Week 4: Client-Side UX

#### Task 4.1: Create AI Capacity Gate Component

**File:** `src/components/common/AICapacityGate.tsx` (NEW)

Wrapper component that checks capacity before rendering AI action buttons. If blocked, shows calm upsell CTA instead.

```typescript
interface AICapacityGateProps {
  children: React.ReactNode;
  actionType: string;
  quantity?: number;
}
```

**Behavior:**

- Capacity available → Render children normally (action buttons)
- Capacity exhausted → Render calm CTA: "Get more AI enhancements for your menu"
- CTA click → Redirect to pack purchase page
- No error messages, no "ran out", no "insufficient credits"

#### Task 4.2: Integrate Gate Into Existing AI Surfaces

| Surface                  | File                                                                  | What Changes                            |
| ------------------------ | --------------------------------------------------------------------- | --------------------------------------- |
| Description regeneration | `src/components/templates/main-app/projects/editor/`                  | Wrap regen button with `AICapacityGate` |
| Image generation         | `src/components/templates/main-app/projects/editor/ImageUploadModal/` | Wrap generate button                    |
| Batch image generation   | `src/components/templates/main-app/projects/editor/`                  | Wrap batch generate trigger             |
| Translation              | `src/components/templates/main-app/projects/editor/`                  | Wrap add language trigger               |
| Image editing            | `src/components/templates/main-app/projects/editor/`                  | Wrap edit button                        |

#### Task 4.3: Handle 402 Response in API Calls

Update existing API call error handling to recognize `{ blocked: true }` responses:

```typescript
// In existing API call patterns:
if (response.status === 402 && data.blocked) {
  // Show calm upsell CTA — NOT an error notification
  showPackUpsell(); // Custom function, not notification.error()
  return;
}
```

---

### Feature Flags (3-Year Freeze Compliance)

**File:** `src/config/features.ts` (MODIFY)

```typescript
/**
 * AI Enhancement Packs
 *
 * Controls AI capacity enforcement and pack purchasing.
 * Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_spec.md
 */
ENABLE_AI_ENHANCEMENT_PACKS: true,    // Master toggle for capacity enforcement

/**
 * Pack Tier Mode
 *
 * "single": One pack, one price (launch mode)
 * "tiered": Multiple pack tiers (future, data flag only)
 */
AI_PACK_TIER_MODE: "single" as "single" | "tiered",

/**
 * AI Outcome Report
 *
 * Customer-facing activity report showing what changed (not consumption).
 * false: Disabled at launch
 * true: Show outcome reports
 */
AI_OUTCOME_REPORT: false,

/**
 * AI Admin Dashboard
 *
 * Internal margin reporting for founder.
 * false: Disabled at launch
 * true: Show admin AI cost dashboard
 */
AI_ADMIN_DASHBOARD: false,
```

---

## Security Checklist

| Requirement                                           | Implementation                               | Status |
| ----------------------------------------------------- | -------------------------------------------- | ------ |
| `withAuth()` on all AI routes                         | Already done on all 6 routes                 | ✅     |
| `withAuth()` on pack purchase route                   | `create-topup-order/route.ts`                | ✅     |
| `withAuth()` on pack status route                     | `GET /api/ai-packs/status`                   | ✅     |
| Zod validation on pack purchase input                 | `validateAPIInput()` in create-topup-order   | ✅     |
| Rate limit on pack purchase                           | `PAYMENT_TOPUP` (10/hr) — already configured | ✅     |
| Capacity check server-side only                       | `checkAICapacity()` in all 6 API routes      | ✅     |
| No capacity data in client responses                  | See audit note below ⚠️                      | ⚠️     |
| `sanitizeForFirestore()` on all writes                | Uses `requestBodyComposer` in DAL            | ✅     |
| Firestore rules: deny client reads on capacity fields | Not possible in Firestore (field-level)      | N/A    |
| Razorpay webhook signature verification               | Already done in `webhook/route.ts`           | ✅     |
| Store isolation on capacity                           | Per-store subscription fields — verified     | ✅     |
| No unit/credit exposure in UI                         | All credit displays removed (Session 14)     | ✅     |

**Audit Note (Session 14b):** AI routes return `remainingBalance` (`{ monthlyCredits, topUpCredits }`) and `transaction.totalCredits` in responses. These are used by `balanceSync.ts` to update `activeSubscription` state without extra Firestore reads (performance optimization: saves 1 read per AI operation). Values are NOT displayed in UI (all credit displays removed in Session 14). Visible only via DevTools inspection. **Risk: Low.** Removing would add Firebase read cost per AI operation. Accepted as known low-risk item.

---

## Validation Report

| Check                                    | Expected                   | Evidence                                          | Status |
| ---------------------------------------- | -------------------------- | ------------------------------------------------- | ------ |
| AI action types defined                  | 8 types                    | `src/constants/common.ts:123-136`                 | ✅     |
| AI model configs centralized             | 9 operations               | `src/constants/AI/models.ts:59-219`               | ✅     |
| `addAiOperation` DAL exists              | Functional                 | `src/database/aiOperations/index.tsx:217-228`     | ✅     |
| `addAiOperation` commented out in routes | 6 routes                   | All 6 confirmed via grep                          | ✅     |
| `TOPUPS` collection defined              | In DB_COLLECTIONS          | `src/constants/database.ts:16`                    | ✅     |
| `PAYMENT_TOPUP` rate limit               | 10/hr                      | `src/lib/rateLimit/configs.ts:148-152`            | ✅     |
| Razorpay billing infrastructure          | Full CRUD                  | `src/app/api/razorpay/`                           | ✅     |
| Transactions UI                          | Built                      | `src/components/templates/main-app/transactions/` | ✅     |
| `TOKENS_PER_CREDIT` constant             | 500                        | `src/constants/common.ts:138`                     | ✅     |
| `CHARGE_PER_CREDIT` constant             | 100 (paise)                | `src/constants/common.ts:139`                     | ✅     |
| Multi-tenant DAL pattern                 | `{collection}/{tId}/{sId}` | `src/database/aiOperations/index.tsx:14`          | ✅     |
| `requestBodyComposer` used               | Auto timestamps            | `src/database/aiOperations/index.tsx:221`         | ✅     |
| `apiCallComposer` used                   | Error handling             | `src/database/aiOperations/index.tsx:218`         | ✅     |

---

## Testing Guide

### Manual Test: Usage Event Logging

1. Open any project in the editor
2. Trigger a description rewrite
3. Check Firestore: `menulistAiOperations/{tId}/{sId}` should have a new document
4. Verify document contains: `action`, `unitsConsumed`, `totalTokenCount`, `processingTime`, `model`
5. Verify `requestBodyComposer` added: `sId`, `tId`, `uId`, `createdOn`, `updatedOn`
6. Open Transactions page → verify the operation appears

### Manual Test: Capacity Enforcement

1. Find the store's active subscription document in Firestore
2. Set `monthlyCredits` to 1 and `topUpCredits` to 0
3. Trigger image generation (costs 5 units) → should be blocked (remaining: 1 < 5)
4. Verify 402 response with `{ blocked: true }`
5. Verify client shows calm CTA, NOT error notification
6. Trigger description rewrite (costs 2 units) → should also be blocked (remaining: 1 < 2)
7. Set `monthlyCredits` to 10 → retry → should succeed
8. Verify `monthlyCredits` was decremented after the operation

### Manual Test: Pack Purchase

1. Click upsell CTA → verify Razorpay checkout opens
2. Complete purchase with test card/UPI
3. Verify `verify-topup` increments `subscription.topUpCredits`
4. Verify purchase record in `topups` collection
5. Retry blocked AI action → should succeed now

### Manual Test: Free Operations

1. Set subscription `monthlyCredits` to 0 and `topUpCredits` to 0 (zero capacity)
2. Upload a new menu image → extraction should succeed (free)
3. Generate first-pass descriptions → should succeed (free)
4. Trigger description REWRITE → should be blocked (paid)

---

## Progress Tracking

| Task                                                | Week | Status | Notes                                                      |
| --------------------------------------------------- | ---- | ------ | ---------------------------------------------------------- |
| Define `AI_UNIT_COSTS` config                       | 1    | ✅     | `src/constants/AI/unitCosts.ts` — built                    |
| Uncomment `addAiOperation()` in 6 routes            | 1    | ✅     | All 6 routes wired with `getUnitCost()`                    |
| Add `unitsConsumed` to transaction objects          | 1    | ✅     | Via `getUnitCost()` call in each route                     |
| Create capacity check + consume helpers             | 2    | ✅     | `src/lib/ai/capacityCheck.ts` — built                      |
| Create `checkAICapacity()` middleware               | 2    | ✅     | Server-side enforcement — built                            |
| Wire capacity check into 6 routes                   | 2    | ✅     | All 6 paid routes enforce capacity                         |
| Add feature flags                                   | 2    | ✅     | `ENABLE_AI_ENHANCEMENTS` in `features.ts`                  |
| Rename `CreditPack` → `AIEnhancementPack`           | 3    | ✅     | `common.ts` + all 13 consumers (Session 14, Feb 24 2026)   |
| Rename `creditPacksList` → `aiEnhancementPacksList` | 3    | ✅     | `PlatformPlansList.ts` + consumers (deprecated alias kept) |
| Adapt `create-topup-order` route                    | 3    | ✅     | Already uses `aiEnhancementPacksList`                      |
| Adapt `verify-topup` route                          | 3    | ✅     | Already uses `aiEnhancementPacksList`                      |
| Adapt `usePaymentHandler.ts` labels                 | 3    | ✅     | "AI Enhancement Pack" in Razorpay checkout (Session 14)    |
| Create pack status API route                        | 3    | ✅     | `GET /api/ai-packs/status` — boolean only (Session 14b)    |
| Change "Unlimited" to "Included" in feature list    | 3    | ✅     | B2C + B2B features updated (Session 14b)                   |
| Re-architect `ActiveSubscriptionCard` credit panel  | 4    | ✅     | AI Features status card, no credit numbers (Session 14)    |
| Re-architect `CreditsPackModal` → single pack modal | 4    | ✅     | Already uses `aiEnhancementPacksList`, outcome labels      |
| Re-architect `CreditPackCard` → pack card           | 4    | ✅     | Shows `description` instead of `creditAmount` (Session 14) |
| Re-architect `RemainingCreditNote`                  | 4    | ✅     | "Your remaining value transfers" — no credit math (S14)    |
| Update `billing/index.tsx` billing history labels   | 4    | ✅     | "AI Enhancement Pack" in history (Session 14)              |
| Update `billing/index.tsx` success messages         | 4    | ✅     | "AI enhancements are ready!" (Session 14)                  |
| Create `AICapacityGate` component                   | 4    | ✅     | `src/components/common/AICapacityGate.tsx` (Session 14b)   |
| Integrate gate into editor surfaces                 | 4    | ✅     | 6 surfaces wired — full 402 pipeline fix (Session 14c)     |
| Handle 402 response in API calls                    | 4    | ✅     | `src/services/ai/capacityError.ts` — already built         |
| Security audit (all routes)                         | 5    | ✅     | See audit findings below (Session 14b)                     |
| Update Firestore security rules                     | 5    | ✅     | Documented: field-level restriction not possible (S14b)    |
| Update website `CreditPacksCtaSection`              | 4    | ✅     | AIEnhancementPack + doctrine-compliant labels (Session 14) |
| Update website `CreditPackCard`                     | 4    | ✅     | AIEnhancementPack, shows description (Session 14)          |
| Update website `SubscriptionManagement`             | 4    | ✅     | AI Features status, no credit numbers (Session 14)         |
| Update `MobileBillingScreen`                        | 4    | ✅     | AI Features status, doctrine-compliant labels (Session 14) |

> **3-Year Freeze Rule:** User confirmed not live yet. Full re-architecture ships at launch. No migration or backward compatibility needed.

---

## May 2026 Runtime Audit — Billing and Enhancement Pack Contract

### Desktop Billing

Desktop billing remains the deepest owner surface:

1. `src/components/templates/main-app/billing/index.tsx` resolves the selected billing store from `activeStoreContext`, `storeDetails.storeId`, or `session.user.storeId`.
2. `getActiveSubscriptionForStore(tenantId, selectedStoreId, tenantDetails.storesList)` returns the selected store subscription or the HQ subscription for outlet stores.
3. Billing history uses the effective subscription store (`activeSubscription.storeId`) so outlet views do not query an empty outlet ledger when billing is inherited.
4. Enhancement-pack purchase still uses `usePaymentHandler.handleTopupPurchase()` and updates local `activeSubscription.topUpCredits` from the verified server balance when available.
5. If the selected outlet inherits HQ billing, the desktop page explicitly tells the owner that plan changes, retries, and enhancement packs apply to HQ.

### Mobile Billing

Mobile billing now mirrors the same contract in `src/components/mobile/screens/MobileBillingScreen.tsx`:

1. Store picker is available for HQ users with `canSwitchStores`.
2. Monthly and yearly plan choices are available in the mobile plan sheet.
3. Enhancement packs are purchased directly on mobile through the same Razorpay top-up handler.
4. Billing history reads from the effective subscription store, matching desktop and multi-outlet billing inheritance.
5. Mobile hides Billing and Transactions from users without `canAccessBilling`.

### Enhancement Pack Server Flow

The verified top-up flow is now audit-complete and idempotent:

```
POST /api/razorpay/create-topup-order
    -> withAuth + tenant access + canManageSubscription + PAYMENT_TOPUP rate limit
    -> Zod validates packId + currency
    -> Razorpay order is created with tenantId, storeId, packId, creditAmount
    -> topups/{orderId} is written as status="pending"

POST /api/razorpay/verify-topup
    -> withAuth + tenant access + canManageSubscription
    -> Zod validates razorpay_payment_id + razorpay_order_id + razorpay_signature
    -> Razorpay checkout signature is verified server-side
    -> if topups/{orderId} is already paid, return without adding credits again
    -> payment is captured/verified with Razorpay
    -> Razorpay order tenant/store notes must match the session tenant/store
    -> active subscription is resolved through getActiveSubscriptionForStore()
    -> topUpCredits is incremented once in a Firestore transaction
    -> topups/{orderId} is marked status="paid" with providerPaymentId in the same transaction
```

This keeps `subscriptions.topUpCredits` as the fast balance and `topups` as the financial audit record.

### AI Usage and Balance Consumption

The runtime credit contract is:

1. `monthlyCreditsAllowance` is the plan allowance for the billing period.
2. `monthlyCredits` is the current recurring balance and resets to `monthlyCreditsAllowance` at renewal.
3. `topUpCredits` is purchased enhancement-pack balance and does not reset.
4. Paid AI routes call `checkAICapacity()` before the provider request and `consumeAICapacity()` after a successful operation.
5. Lazy monthly reset and `consumeAICapacity()` both use Firestore transactions so reset and usage writes cannot overwrite each other during concurrent AI calls.
6. AI responses return `remainingBalance`; desktop and mobile owner UI listen through `syncBalanceFromResponse()` and update `activeSubscription` without an extra Firestore read.
7. Campaign caption generation is included as `AI_ACTIONS_TYPES.CAMPAIGN_CAPTION` with a 1-unit cost and the same operation log/capacity path.
8. Batch image generation worker calls are guarded by the Cloud Tasks project header before they run provider work.

---

## Admin Dashboard Backlog (Future)

> **Source:** ChatGPT feedback review (Feb 10, 2026) — classified as IMPROVE

### Priority Metric: AI Cost % of Revenue (Global)

```
Monthly: total_ai_cost / total_subscription_revenue
```

| Range  | Status                                                  |
| ------ | ------------------------------------------------------- |
| <10%   | Excellent — AI costs well within margins                |
| 10–20% | Fine — monitor trends                                   |
| >25%   | Investigate — check for abuse or pricing miscalibration |

**Data infrastructure already exists:**

- Each AI operation doc has: `realCostPaise`, `ourChargePaise`, `marginPaise`
- Subscription docs have: `amount`, `currency`
- Feature flag: `AI_ADMIN_DASHBOARD: false` (ready to enable)
- Query: `aiOperations/{tId}/{sId}` → `sum(realCostPaise)` vs subscription revenue

**Implementation:** Simple Firestore aggregation query on admin page. No new schema needed.

---

**Document Signature:** Lead Architect (Cascade)
**Last Updated:** February 10, 2026 (v5 — ChatGPT feedback audit additions: admin dashboard metric backlog)
