# ActiveSubscription Flow — Complete Architecture Reference

> **Purpose:** This document maps the entire `activeSubscription` data flow end-to-end — from Razorpay payment events through webhooks, Firestore, React providers, and every UI component that consumes it. Reading this gives you the full real picture of how subscription state moves through the application.
>
> **Last Updated:** July 5, 2026
> **Scope:** Frontend + Backend + Database + External (Razorpay)

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [The Data Type — `FirestoreSubscriptionDoc`](#2-the-data-type)
3. [Layer 1: Razorpay → Webhook → Firestore (Backend)](#3-layer-1-backend)
4. [Layer 2: Firestore → Provider → Context (Frontend Data Loading)](#4-layer-2-frontend-data-loading)
5. [Layer 3: Context → UI Components (Frontend Rendering)](#5-layer-3-frontend-rendering)
6. [Layer 4: UI → API → Razorpay (User Actions)](#6-layer-4-user-actions)
7. [Status Lifecycle & UI Behavior Matrix](#7-status-lifecycle)
8. [Date Fields — What Each One Means & Where It's Displayed](#8-date-fields)
9. [Credit System — How Credits Flow Through activeSubscription](#9-credit-system)
10. [Real-Time Balance Sync (AI Operations)](#10-balance-sync)
11. [File Inventory — Every File That Touches activeSubscription](#11-file-inventory)
12. [Edge Cases & Business Rules](#12-edge-cases)
13. [Verification Checklist](#13-verification-checklist)

---

## 1. High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   RAZORPAY       │────▶│   WEBHOOK        │────▶│   FIRESTORE      │
│   (Payment)      │     │   /api/razorpay/  │     │   subscriptions/ │
│                  │     │   webhook/route.ts │     │   {sub_id}       │
└─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                          │
                              ┌────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND — SessionProvider                                       │
│  src/providers/sessionProvider.tsx                                 │
│                                                                    │
│  On session load:                                                  │
│    getActiveSubscriptionForStore(tId, sId) → setActiveSubscription │
│                                                                    │
│  On AI operation:                                                  │
│    CustomEvent 'ai-balance-update' → patches monthlyCredits/topUp  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  CONTEXT — PlatformGlobalDataProvider                              │
│  src/providers/platformProviders/platformGlobalDataProvider.tsx     │
│                                                                    │
│  activeSubscription: FirestoreSubscriptionDoc | null               │
│  setActiveSubscription: (sub) => void                              │
│                                                                    │
│  Available to ALL components via useContext(PlatformGlobalDataCtx)  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
            ┌───────────────────┼────────────────────┐
            ▼                   ▼                    ▼
    ┌──────────────┐  ┌──────────────┐    ┌──────────────────┐
    │ BillingPage   │  │ Dashboard    │    │ Projects         │
    │ (main-app)    │  │ (redirect    │    │ (gate: no sub    │
    │               │  │  if null)    │    │  → NoSubView)    │
    └──────┬────────┘  └─────────────┘    └──────────────────┘
           │
    ┌──────┼──────────────┬────────────────┬──────────────┐
    ▼      ▼              ▼                ▼              ▼
 Active   Pricing      Billing         Credits       Cancellation
 SubCard  PlansModal   History         PackModal     Modal
```

**Two separate entry points load `activeSubscription`:**

| Surface                            | Where Loaded            | How                                                                                |
| ---------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| **Main App** (dashboard)           | `SessionProvider`       | `getActiveSubscriptionForStore(tId, sId)` on session init → stored in context      |
| **Website** (landing/pricing page) | `LandingPage/index.tsx` | Same DAL call `getActiveSubscriptionForStore()` in local `useEffect` → local state |

---

## 2. The Data Type

**File:** `src/types/razorpay.ts` — `FirestoreSubscriptionDoc`

```typescript
interface FirestoreSubscriptionDoc {
  id?: string;
  paymentProvider: "razorpay";
  providerSubscriptionId: string; // Razorpay sub_xxxxx ID (also Firestore doc ID)
  providerPlanId: string; // Razorpay plan_xxxxx ID

  // --- Identity ---
  userId: string;
  name: string;
  email: string;
  tenantId: number | string;
  storeId: number | string;
  userType: "B2C" | "B2B";

  // --- Plan & Status ---
  status: PaymentStatus; // "pending"|"active"|"cancelled"|"expired"|"paid"|"failed"|"past_due"|"paused"|"completed"
  planName: string; // e.g. "Pro Plan (Yearly)"
  planId: string; // e.g. "pro"
  planType: "MONTH" | "YEAR";
  amount: number; // in smallest currency unit (paise/cents)
  currency: "INR" | "USD";

  // --- Dates (all Firebase Timestamps) ---
  cycleStartDate: Timestamp; // Current billing period start
  cycleEndDate: Timestamp; // Current billing period end
  renewsOn: Timestamp; // When next charge happens (same as cycleEndDate)
  subscriptionStartDate: Timestamp; // When subscription began
  subscriptionEndDate: Timestamp; // When subscription ends (based on total_count)
  pastDueSinceAt: Timestamp; // When payment first failed (for grace period calc)

  // --- Credits ---
  monthlyCreditsAllowance: number; // Fixed per plan. Never changes.
  monthlyCredits: number; // Current balance. Reset each cycle.
  topUpCredits: number; // Purchased credits. Never reset.
  creditsLastResetMonth?: number; // YYYYMM — tracks last credit reset

  // --- Billing Metadata ---
  totalPaymentsNeededCount: number; // Razorpay total_count
  totalPaymentsMadeCount: number; // Razorpay paid_count
  shortUrl: string; // Razorpay payment page URL

  // --- Payment Method ---
  paymentMethod: {
    type: string; // "card" | "upi"
    brand?: string; // "visa", "mastercard"
    last4?: string; // "4024"
    upiId?: string;
    upiTransactionId?: string;
  } | null;

  // --- Audit Trail ---
  statuses: Array<{
    // Append-only log of status changes
    status: string;
    timestamp: Timestamp;
    amount: number;
    currency: string;
    remark: string;
  }>;
  billingHistory: string[]; // Array of Razorpay payment IDs
  lastWebhook: {
    // Last webhook event received
    event: string;
    timestamp: Timestamp;
  } | null;
}
```

---

## 3. Layer 1: Razorpay → Webhook → Firestore (Backend)

### 3.1 How Subscription Data Gets Created

| Route                                      | When                              | What It Creates                                                                                   |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST /api/onboarding/create-subscription` | New user onboarding               | Creates tenant + store + pending subscription doc in Firestore. Opens Razorpay Checkout.          |
| `POST /api/razorpay/create-subscription`   | Existing user buys plan           | Creates pending subscription doc. Opens Razorpay Checkout.                                        |
| `POST /api/razorpay/verify-subscription`   | After Razorpay Checkout completes | Verifies payment with Razorpay API, updates doc to `active`, sets credits, dates, payment method. |

### 3.2 How Subscription Data Gets Updated (Webhooks)

**File:** `src/app/api/razorpay/webhook/route.ts`

| Razorpay Event           | Our Handler                          | Fields Updated                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription.activated` | Sets `active`, resets credits        | `status`, `cycleStartDate`, `cycleEndDate`, `renewsOn`, `subscriptionStartDate`, `subscriptionEndDate`, `monthlyCredits`, `creditsLastResetMonth`, `paymentMethod`, `lastWebhook`, `billingHistory`, `statuses` |
| `subscription.charged`   | Same as activated (renewal)          | Same fields — credits reset, dates updated to new cycle                                                                                                                                                         |
| `payment.failed`         | Sets `past_due`                      | `status`, `pastDueSinceAt`, `lastWebhook`, `statuses`                                                                                                                                                           |
| `subscription.pending`   | Sets `past_due` (retry in progress)  | `status`, `pastDueSinceAt`, `lastWebhook`, `statuses`                                                                                                                                                           |
| `subscription.halted`    | Sets `past_due` (all retries failed) | `status`, `pastDueSinceAt`, `lastWebhook`, `statuses`                                                                                                                                                           |
| `subscription.completed` | Sets `completed`                     | `status`, `subscriptionEndDate`, `lastWebhook`, `statuses`                                                                                                                                                      |
| `subscription.cancelled` | Updates `lastWebhook` only           | `lastWebhook` (DB status update done in cancel-subscription route)                                                                                                                                              |
| `subscription.paused`    | Sets `paused`                        | `status`, `lastWebhook`, `statuses`                                                                                                                                                                             |
| `subscription.resumed`   | Sets `active`                        | `status`, `lastWebhook`, `statuses`                                                                                                                                                                             |

### 3.3 How Subscription Data Gets Updated (User Actions)

| Route                                     | Action            | Fields Updated                                                         |
| ----------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `POST /api/razorpay/cancel-subscription`  | User cancels      | `status: "cancelled"`, `statuses`                                      |
| `POST /api/razorpay/pause-subscription`   | Feature-gated self-service pause | Returns unavailable while `ENABLE_SUBSCRIPTION_PAUSE=false`; if enabled, sets `status: "paused"` and calls Razorpay Pause API |
| `POST /api/razorpay/resume-subscription`  | Feature-gated self-service resume | Returns unavailable while `ENABLE_SUBSCRIPTION_PAUSE=false`; if enabled, sets `status: "active"` and calls Razorpay Resume API |
| `POST /api/razorpay/upgrade-subscription` | User upgrades     | Old sub: `status: "expired"`. New sub created via create-subscription. |
| `POST /api/razorpay/verify-topup`         | User buys credits | `topUpCredits` incremented                                             |

---

## 4. Layer 2: Firestore → Provider → Context (Frontend Data Loading)

### 4.1 Main App Path (Dashboard Users)

**File:** `src/providers/sessionProvider.tsx`

```
Session authenticated
  → getTenantById(tId)
  → getStoreById(sId)
  → getActiveSubscriptionForStore(tId, sId) ← THE KEY CALL
  → setActiveSubscription(subscriptionData)
  → Passed into PlatformGlobalDataProvider context
  → Available everywhere via useContext(PlatformGlobalDataContext)
```

**The DAL Query** (`src/database/subscriptions/index.ts` — `getActiveSubscriptionForStore`):

```
Firestore query:
  WHERE status IN ["active", "past_due", "cancelled", "paused"]
  AND cycleEndDate >= now
  AND tenantId == tId
  AND storeId == sId
  LIMIT 1
```

**Grace Period Business Rule (in DAL):**

- If `pastDueSinceAt` exists → calculate 7-day grace period
- If inside grace → return subscription (user keeps access)
- If outside grace → auto-expire: set `status: "expired"`, return `null`

### 4.2 Website/Landing Page Path

**File:** `src/components/templates/website/platformSite/landingPage/index.tsx`

```
Session authenticated + has tenantId/storeId
  → getActiveSubscriptionForStore(tId, sId) ← SAME DAL CALL
  → setActiveSubscription(sub) ← LOCAL STATE (not context)
  → If sub exists → show SubscriptionManagementPage
  → If no sub → show PricingPage
```

### 4.3 Real-Time Credit Updates (No Firestore Read)

**File:** `src/providers/sessionProvider.tsx` (lines 57-68)

```
AI API response includes remainingBalance
  → Frontend service calls syncBalanceFromResponse(responseJson)
  → Dispatches CustomEvent 'ai-balance-update'
  → SessionProvider listener patches activeSubscription in-place:
      setActiveSubscription(prev => ({
        ...prev,
        monthlyCredits: detail.monthlyCredits,
        topUpCredits: detail.topUpCredits
      }))
```

This saves 1 Firestore read per AI operation.

---

## 5. Layer 3: Context → UI Components (Frontend Rendering)

### 5.1 Component Tree — Who Consumes What

```
BillingPage (billing/index.tsx)
  ├── ActiveSubscriptionCard        ← Shows plan details, status, dates, credits, actions
  │     ├── renderTag()             ← Status badge (active/cancelled/paused/past_due/expired)
  │     ├── renderAccessUntillDate()← Smart date display per status
  │     ├── renderGracePeriodInfo() ← Warning text for past_due
  │     ├── renderActionButtons()   ← Cancel/Upgrade/support buttons per status; Pause/Resume hidden unless feature flag is enabled
  │     └── CancellationModal       ← 2-step cancel flow (reason → confirm)
  │
  ├── BillingHistory                ← Table of past payments (NOT from activeSubscription directly)
  │
  ├── PricingPlansModal             ← Shows available plans for upgrade/downgrade
  │     ├── PlanCardComponent       ← Individual plan card with Upgrade/Change Plan button
  │     ├── UpgradeConfirmationModal← Confirm dialog with credit carry-forward info
  │     └── RemainingCreditNote     ← Shows calculated remaining credits to carry forward
  │
  └── CreditsPackModal              ← Buy top-up AI credit packs
        └── CreditPackCard          ← Individual credit pack card

DashboardPage (dashboard/index.tsx)
  └── if (!activeSubscription) redirect('/billing')   ← GATE: no sub = redirect

ProjectsPage (projects/index.tsx)
  └── if (!activeSubscription) → NoSubscriptionView   ← GATE: no sub = block UI
```

### 5.2 Website/Landing Page Components

```
LandingPage (landingPage/index.tsx)
  ├── Navbar                        ← Receives activeSubscription (for CTA button logic)
  ├── PricingPage                   ← Shown when NO active subscription
  │     ├── PlanCard                ← Plan cards for new purchase
  │     └── CreditPacksCtaSection   ← Credit packs CTA
  │
  └── SubscriptionManagementPage    ← Shown when active subscription EXISTS
        ├── renderTag()             ← Status badge (same logic as main app)
        ├── renderAccessUntillDate()← Date display per status
        ├── Credit display          ← Monthly + TopUp + Total
        └── CreditPacksCtaSection   ← Buy more credits
              └── CreditPackCard    ← 3 tiers, shows Purchase/Sign In/Purchase Plan
```

---

## 6. Layer 4: UI → API → Razorpay (User Actions)

**File:** `src/hooks/usePaymentHandler.ts`

| Action            | Hook Function             | API Route                                      | Razorpay API                          | Post-Action                    |
| ----------------- | ------------------------- | ---------------------------------------------- | ------------------------------------- | ------------------------------ |
| New subscription  | `onClickPaymentCard()`    | `/api/razorpay/create-subscription`            | Creates subscription + opens Checkout | `verify-subscription` → active |
| Upgrade/Downgrade | `onUpgradePlan()`         | `create-subscription` + `upgrade-subscription` | Cancel old + create new               | Credits carried forward        |
| Cancel            | `onCancelSubscription()`  | `/api/razorpay/cancel-subscription`            | Cancels on Razorpay                   | Access until cycleEndDate      |
| Pause             | `onPauseSubscription()`   | `/api/razorpay/pause-subscription`             | Disabled while `ENABLE_SUBSCRIPTION_PAUSE=false` | Unavailable before mutation    |
| Resume            | `onResumeSubscription()`  | `/api/razorpay/resume-subscription`            | Disabled while `ENABLE_SUBSCRIPTION_PAUSE=false` | Unavailable before mutation    |
| Buy credits       | `handleTopupPurchase()`   | `create-topup-order` + `verify-topup`          | Creates order + captures              | topUpCredits incremented       |
| Onboarding        | `executePostOnboarding()` | `/api/onboarding/create-subscription`          | Creates tenant + sub                  | Session updated with tId/sId   |

Cancel, pause, resume, and upgrade browser calls require the existing route response to parse as `{ success: true }` before billing screens can show success copy or run follow-up refresh behavior. Malformed, oversized, or negative successful HTTP responses fail through fixed payment codes (`payment_subscription_*_response_invalid`) and bounded payment diagnostics.

**After every action:** `refetchActiveSubscription()` is called to reload from Firestore.

---

## 7. Status Lifecycle & UI Behavior Matrix

| Status      | How User Gets Here                                | Tag Color             | Access?                  | Date Shown                                   | Actions Available      | Grace?    |
| ----------- | ------------------------------------------------- | --------------------- | ------------------------ | -------------------------------------------- | ---------------------- | --------- |
| `active`    | Payment succeeded                                 | 🟢 Green              | ✅ Yes                   | "Renews On" (or "Expires On" if final cycle) | Cancel, Upgrade. Pause only if `ENABLE_SUBSCRIPTION_PAUSE=true` | N/A       |
| `paused`    | Legacy/provider-side pause                        | 🟡 Warning            | ✅ Yes (until cycle end) | "Paused Since"                               | Contact Support, Cancel. Resume only if `ENABLE_SUBSCRIPTION_PAUSE=true` | N/A       |
| `past_due`  | Payment failed, Razorpay retrying                 | 🟡 Warning            | ✅ Yes (7-day grace)     | Grace period end date                        | Cancel, Retry Payment  | ✅ 7 days |
| `cancelled` | User cancelled                                    | 🔴 Error              | ✅ Yes (until cycle end) | "Access Good Until" cycleEndDate             | Choose New Plan        | N/A       |
| `expired`   | Grace period ended OR upgrade old sub             | ⚪ Default            | ❌ No                    | N/A                                          | Choose New Plan        | N/A       |
| `completed` | All billing cycles finished (total_count reached) | N/A (not in UI query) | ❌ No                    | N/A                                          | N/A                    | N/A       |
| `pending`   | Initial creation, not yet paid                    | N/A (not in UI query) | ❌ No                    | N/A                                          | N/A                    | N/A       |

**Key insight:** The DAL primary query returns subscriptions with status in `["active", "past_due", "cancelled", "paused"]` AND `cycleEndDate >= now`. A **fallback query** additionally checks for `paused` subscriptions whose `cycleEndDate` has passed so legacy/provider-side paused records remain visible on Billing. With `ENABLE_SUBSCRIPTION_PAUSE=false`, the owner sees support recovery instead of self-service resume. Dashboard and Projects gates use `hasValidSubscriptionAccess()` to block access for paused subs with expired cycles.

---

## 8. Date Fields — What Each One Means & Where It's Displayed

| Field                      | Source                                                                          | Meaning                          | Where Displayed                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `cycleStartDate`           | Razorpay `current_start × 1000`                                                 | Start of current billing period  | ActiveSubscriptionCard: "Current Billing Cycle"                                         |
| `cycleEndDate`             | Razorpay `current_end × 1000`                                                   | End of current billing period    | ActiveSubscriptionCard: "Current Billing Cycle", also "Access Good Until" for cancelled |
| `renewsOn`                 | Razorpay `charge_at × 1000`                                                     | When next auto-charge happens    | ActiveSubscriptionCard: "Renews On" (active status)                                     |
| `subscriptionStartDate`    | Razorpay `start_at × 1000`                                                      | When subscription began          | Not prominently displayed                                                               |
| `subscriptionEndDate`      | Calculated: `start_at + total_count × interval`                                 | When subscription fully ends     | ActiveSubscriptionCard: "Subscription End Date"                                         |
| `pastDueSinceAt`           | Set by webhook on `payment.failed`/`subscription.pending`/`subscription.halted` | When payment first failed        | Used to calculate grace period: `pastDueSinceAt + 7 days`                               |
| `statuses[last].timestamp` | Appended on every status change                                                 | When last status change occurred | "Paused Since" for paused status                                                        |

### Date Calculation Logic

**`getSubscriptionEndDate()`** (webhook/route.ts):

```
if interval === 'YEAR': startDate + total_count years
if interval === 'MONTH': startDate + total_count months
```

With `total_count = 3` (yearly) or `36` (monthly), this means subscription end is ~3 years from start.

**`isFinalCycle`** (ActiveSubscriptionCard):

```
Math.abs(renewsOn.seconds - subscriptionEndDate.seconds) <= 86400
```

If the next renewal date is within 1 day of the subscription end date → it's the final cycle. UI shows "Expires On" instead of "Renews On", and "Change Plan" instead of "Cancel".

**Grace Period** (`src/utils/razorpay.ts` — `getGracePeriodInfo()` / `getGracePeriodDisplayInfo()`):

```
graceEndsDate = pastDueSinceAt + 7 days
remainingDays = max(0, ceil((graceEndsDate - now) / (1 day)))
display fallback = "Grace period details unavailable." when a malformed legacy past_due record has no pastDueSinceAt
```

**Credit Carry-Forward** (`src/utils/razorpay.ts` — `calculateRemainingCredits()`):

- Monthly plan: `monthlyCredits + topUpCredits`
- Yearly plan: `unusedThisMonth + (monthsRemaining - 1) × monthlyCreditsAllowance + topUpCredits`

---

## 9. Credit System — How Credits Flow Through activeSubscription

```
┌─────────────────────────────────────────────────────────────┐
│  monthlyCreditsAllowance: 500  (set once, never changes)    │
│  monthlyCredits: 320           (decrements on AI use)       │
│  topUpCredits: 150             (decrements after monthly=0) │
│                                                              │
│  Total Available = monthlyCredits + topUpCredits = 470       │
└─────────────────────────────────────────────────────────────┘

On each billing cycle renewal (subscription.charged webhook):
  monthlyCredits → reset to monthlyCreditsAllowance (500)
  creditsLastResetMonth → updated to current YYYYMM
  topUpCredits → unchanged (never reset)

On AI operation:
  1. Backend: consumeAICapacity() deducts from monthlyCredits first
  2. If monthlyCredits = 0, deducts from topUpCredits
  3. Returns remainingBalance in API response
  4. Frontend: syncBalanceFromResponse() updates context in-place

On upgrade:
  calculateRemainingCredits() → total remaining carried to new sub's topUpCredits
```

---

## 10. Real-Time Balance Sync (AI Operations)

**Flow:**

```
User triggers AI operation (e.g., image generation)
  → Frontend AI service calls API (e.g., /api/image-generation)
  → Backend: checkAICapacity() → consumeAICapacity()
  → Backend returns: { success: true, remainingBalance: { monthlyCredits: 319, topUpCredits: 150 } }
  → Frontend: syncBalanceFromResponse(responseJson)
  → Dispatches CustomEvent('ai-balance-update', { detail: remainingBalance })
  → SessionProvider listener: patches activeSubscription.monthlyCredits and .topUpCredits
  → All UI components re-render with updated credit counts
```

**Why this matters:** Without this, every AI operation would require a separate Firestore read to show updated credits. This pattern saves ~1 read per AI call.

**File chain:**

1. `src/services/ai/balanceSync.ts` — `syncBalanceFromResponse()`
2. `src/providers/sessionProvider.tsx` — `handleBalanceUpdate` listener
3. `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` — displays credit counts

---

## 11. File Inventory — Every File That Touches activeSubscription

### Backend (API Routes)

| File                                                  | Role                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| `src/app/api/razorpay/webhook/route.ts`               | Webhook handler — updates subscription in Firestore |
| `src/app/api/razorpay/create-subscription/route.ts`   | Creates new Razorpay subscription + Firestore doc   |
| `src/app/api/razorpay/verify-subscription/route.ts`   | Verifies payment, activates subscription            |
| `src/app/api/razorpay/cancel-subscription/route.ts`   | Cancels subscription on Razorpay + Firestore        |
| `src/app/api/razorpay/pause-subscription/route.ts`    | Feature-gated pause route; unavailable before mutation while disabled |
| `src/app/api/razorpay/resume-subscription/route.ts`   | Feature-gated resume route; unavailable before mutation while disabled |
| `src/app/api/razorpay/upgrade-subscription/route.ts`  | Cancels old + marks expired, credits carried        |
| `src/app/api/razorpay/create-topup-order/route.ts`    | Creates Razorpay order for credit purchase          |
| `src/app/api/razorpay/verify-topup/route.ts`          | Verifies top-up payment, adds credits               |
| `src/app/api/onboarding/create-subscription/route.ts` | New user: creates tenant + store + subscription     |

### Backend (Libraries)

| File                                    | Role                                        |
| --------------------------------------- | ------------------------------------------- |
| `src/lib/razorpay/razorpay.ts`          | Razorpay SDK client singleton               |
| `src/lib/razorpay/plan-handler.ts`      | Get or create Razorpay plan (dedup)         |
| `src/lib/razorpay/webhook-validator.ts` | HMAC-SHA256 signature validation            |
| `src/lib/ai/capacityCheck.ts`           | `checkAICapacity()` + `consumeAICapacity()` |
| `src/lib/validation/apiSchemas.ts`      | Zod schemas for subscription API inputs     |

### Database (DAL)

| File                                                | Role                                                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/database/subscriptions/index.ts`               | `getActiveSubscriptionForStore()`, `createInitialSubscription()`, `updateSubscription()`, `getSubscriptionById()` |
| `src/database/subscriptions/paymentTransactions.ts` | `createPaymentTransaction()`, `getBillingHistoryForStore()`                                                       |

### Types

| File                    | Role                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `src/types/razorpay.ts` | `FirestoreSubscriptionDoc`, `PaymentStatus`, `BillingHistoryItem`, `FirestoreTopupDoc` |

### Providers

| File                                                             | Role                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/providers/sessionProvider.tsx`                              | Loads `activeSubscription` on session init, listens for balance updates  |
| `src/providers/platformProviders/platformGlobalDataProvider.tsx` | Defines context type and provides `activeSubscription` to component tree |

### Hooks

| File                             | Role                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| `src/hooks/usePaymentHandler.ts` | All payment actions: create, cancel, pause, resume, upgrade, topup |

### Utils

| File                             | Role                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `src/utils/razorpay.ts`          | `getGracePeriodInfo()`, `getGracePeriodDisplayInfo()`, `calculateRemainingCredits()`, `hasValidSubscriptionAccess()` |
| `src/utils/dateTime/index.tsx`   | `formatDateTime()` — handles Timestamp → formatted string                             |
| `src/utils/formatters.ts`        | `formatCurrency()` — amount in paise/cents → display string                           |
| `src/services/ai/balanceSync.ts` | `syncBalanceFromResponse()` — dispatches credit update events                         |

### Firebase Cloud Functions

| File                                              | Role                                                            |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `functions/src/billing/reconcileSubscriptions.ts` | Nightly reconciliation — syncs Firestore ↔ Razorpay (Admin SDK) |
| `functions/src/decisionBlocksScoring.ts`          | Nightly scheduler — calls reconciliation after other jobs       |
| `functions/src/constants/features.ts`             | `ENABLE_SUBSCRIPTION_RECONCILIATION` feature flag               |

### Main App UI Components (Ant Design)

| File                                                                     | Role                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/components/templates/main-app/billing/index.tsx`                    | BillingPage — orchestrator, refetch logic                                 |
| `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx`   | Main subscription display — status, dates, credits, actions               |
| `src/components/templates/main-app/billing/BillingHistory.tsx`           | Payment history table                                                     |
| `src/components/templates/main-app/billing/PricingPlansModal.tsx`        | Plan selection for upgrade/downgrade/new                                  |
| `src/components/templates/main-app/billing/UpgradeConfirmationModal.tsx` | Confirm upgrade with credit carry-forward info                            |
| `src/components/templates/main-app/billing/RemainingCreditNote.tsx`      | Displays calculated remaining credits                                     |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx`         | Credit pack purchase modal                                                |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`           | Individual credit pack card                                               |
| `src/components/templates/main-app/billing/CancellationModal.tsx`        | 2-step cancellation flow                                                  |
| `src/components/templates/main-app/billing/NoSubscriptionView.tsx`       | "No subscription" placeholder                                             |
| `src/components/templates/main-app/dashboard/index.tsx`                  | Gate: redirects to /billing if `hasValidSubscriptionAccess()` is false    |
| `src/components/templates/main-app/projects/index.tsx`                   | Gate: shows NoSubscriptionView if `hasValidSubscriptionAccess()` is false |

### Website/Landing Page UI Components (shadcn/ui)

| File                                                                                                         | Role                                                                  |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `src/components/templates/website/platformSite/landingPage/index.tsx`                                        | Landing page — loads subscription, decides pricing vs management view |
| `src/components/templates/website/platformSite/landingPage/pricing/index.tsx`                                | Pricing page for new users                                            |
| `src/components/templates/website/platformSite/landingPage/pricing/SubscriptionManagement.tsx`               | Subscription display for existing users (website version)             |
| `src/components/templates/website/platformSite/landingPage/pricing/CreditPackCard.tsx`                       | Credit pack card (website version)                                    |
| `src/components/templates/website/platformSite/landingPage/components/landingpage/CreditPacksCtaSection.tsx` | Credit packs CTA section                                              |
| `src/components/templates/website/platformSite/landingPage/components/landingpage/Navbar.tsx`                | Receives subscription for CTA button logic                            |

---

## 12. Edge Cases & Business Rules

### 12.1 Grace Period Auto-Expiry

- **Rule:** 7-day grace period from `pastDueSinceAt`
- **Where enforced:** `getActiveSubscriptionForStore()` in DAL — if grace expired, auto-sets `status: "expired"` and returns `null`
- **Result:** User sees "No Active Subscription" and must buy a new plan

### 12.2 Cancelled But Still Active

- **Rule:** Cancelled users retain access until `cycleEndDate`
- **Where enforced:** DAL query includes `"cancelled"` in status filter AND requires `cycleEndDate >= now`
- **Result:** After cycleEndDate passes, query returns `null` — user loses access

### 12.3 Paused But Still Active

- **Rule:** Paused users retain access until current `cycleEndDate`
- **Where enforced:** DAL primary query includes `"paused"` in status filter AND requires `cycleEndDate >= now`
- **Self-service policy:** Owner pause/resume is disabled while `ENABLE_SUBSCRIPTION_PAUSE=false`; paused records are treated as legacy/provider-side states and use support recovery.

### 12.3a Paused With Expired Billing Cycle

- **Scenario:** A legacy/provider-side pause exists → billing cycle ends → user visits dashboard
- **DAL behavior:** Primary query returns null (cycleEndDate < now). **Fallback query** finds paused sub regardless of cycleEndDate → returns it.
- **Access gates:** `hasValidSubscriptionAccess()` returns `false` for paused subs with expired cycle:
  - Dashboard → redirects to `/billing`
  - Projects → shows `NoSubscriptionView`
  - BillingPage → shows subscription card with support recovery while self-service pause is disabled
- **Owner action:** Contact support. If `ENABLE_SUBSCRIPTION_PAUSE=true` in the future, Resume can be re-enabled.
- **Files involved:** `src/utils/razorpay.ts` (`hasValidSubscriptionAccess`), `src/database/subscriptions/index.ts` (fallback query), `ActiveSubscriptionCard.tsx` (cycle-aware paused message)

### 12.4 Final Billing Cycle

- **Detection:** `Math.abs(renewsOn.seconds - subscriptionEndDate.seconds) <= 86400`
- **UI change:** Shows "Expires On" instead of "Renews On", shows "Change Plan" instead of "Cancel"
- **Why:** After final cycle, subscription moves to `completed` — user must choose a new plan

### 12.5 Upgrade = Cancel Old + Create New

- **Flow:** Calculate remaining credits → Create new subscription → User pays → Cancel old sub → Carry credits to new
- **Credit carry:** `monthlyCredits + (monthsRemaining × monthlyCreditsAllowance) + topUpCredits` → added as `topUpCredits` on new sub
- **Downgrade:** Same flow — PricingPlansModal shows all plans except current

### 12.6 Webhook Idempotency

- **`billingHistory`:** Dedup check — won't append if payment ID already exists
- **`statuses`:** Append-only (duplicates acceptable as audit trail)
- **Credit operations:** Naturally idempotent — `monthlyCredits = monthlyCreditsAllowance` is same regardless of how many times called

### 12.8 Payment Method Null Safety

- **Scenario:** `paymentMethod` could theoretically be null (e.g., data corruption)
- **Guard:** ActiveSubscriptionCard uses optional chaining `paymentMethod?.type` and shows "N/A" tag as fallback
- **CancellationModal:** Uses `cycleEndDate` (not `renewsOn`) for accurate "access until" date display

### 12.7 Two-Layer Credit Reset

- **Primary:** Webhook `subscription.charged` → resets `monthlyCredits` to `monthlyCreditsAllowance`
- **Safety net:** `capacityCheck.ts` → lazy reset based on `creditsLastResetMonth` and billing-period key
- **Why both:** Webhook may be delayed or missed; lazy reset ensures credits are always correct on next AI call

---

## 13. Verification Checklist

| Check                                                                               | Status |
| ----------------------------------------------------------------------------------- | ------ |
| `PaymentStatus` type includes all states (including "paused")                       | ✅     |
| DAL query includes "paused" in status filter                                        | ✅     |
| DAL fallback query for paused subs with expired cycleEndDate                        | ✅     |
| `hasValidSubscriptionAccess()` utility for access gates                             | ✅     |
| Dashboard/Projects gates use `hasValidSubscriptionAccess()` not just null check     | ✅     |
| Webhook handles all 9 Razorpay lifecycle states                                     | ✅     |
| `lastWebhook` updated in ALL webhook cases                                          | ✅     |
| `billingHistory` idempotency guard (dedup check)                                    | ✅     |
| ActiveSubscriptionCard handles `paused` status (tag, date, support fallback, optional feature-gated resume) | ✅     |
| SubscriptionManagement (website) handles `paused` status (tag, date, support text)  | ✅     |
| Pause API is blocked before provider/database mutation while feature flag is false   | ✅     |
| Resume API is blocked before provider/database mutation while feature flag is false  | ✅     |
| PricingPlansModal shows all plans except current (supports downgrade)               | ✅     |
| `total_count` set to 3/36 in both create routes (3-year auto-renewal)               | ✅     |
| Invoice button shows when `invoiceUrl` exists                                       | ✅     |
| Dashboard gate: redirects to /billing when no subscription                          | ✅     |
| Projects gate: shows NoSubscriptionView when no subscription                        | ✅     |
| Balance sync: AI operations update credits without Firestore read                   | ✅     |
| Currency formatting: all amounts divided by 100 (paise/cents → display)             | ✅     |
| Date formatting: all Razorpay Unix timestamps × 1000 before Timestamp.fromMillis()  | ✅     |
| Security: all API routes use withAuth + verifyTenantAccess + tenant ownership check | ✅     |
| TypeScript: zero type errors from subscription code (`npx tsc --noEmit`)            | ✅     |
| State machine: `validateTransition()` guard on ALL status-setting code              | ✅     |
| DAL split: fetch / expire / compose — no mixed concerns                             | ✅     |
| Reconciliation: Firebase nightly scheduler syncs Firestore ↔ Razorpay               | ✅     |
| Billing immutability: `@immutable` rule documented in `FirestoreSubscriptionDoc`    | ✅     |
| Payment transaction log: append-only, no update/delete methods                      | ✅     |
| Shared billingUtils: no duplicate functions across routes                           | ✅     |
| No debug console.log in production billing code                                     | ✅     |
| Pre-freeze testing matrix documented (Section 15)                                   | ✅     |

---

## 14. Billing Hardening (Post-Audit)

### 14.1 Subscription State Machine

**File:** `src/lib/billing/subscriptionStateMachine.ts`

All subscription status transitions are governed by a centralized transition validator. Every route, webhook handler, and DAL function that changes status calls `validateTransition(from, to, context)` before writing to Firestore.

**Valid transitions:**

```
pending   → active
active    → past_due | paused | cancelled | completed | expired
past_due  → active | expired
paused    → active | cancelled | expired
cancelled → expired
expired   → (terminal)
completed → (terminal)
```

**Behavior:** Logs warning for invalid transitions but does NOT throw — Razorpay webhooks are authoritative and should never be rejected due to local state mismatch. The warning enables monitoring and alerting.

**Applied in:** webhook route (7 cases), cancel, pause, resume, upgrade, verify routes, DAL auto-expire.

### 14.2 DAL Refactor — 3-Layer Composition

**File:** `src/database/subscriptions/index.ts`

`getActiveSubscriptionForStore()` was refactored from a monolithic function into 3 composable layers:

| Layer | Function                          | Responsibility                                                           |
| ----- | --------------------------------- | ------------------------------------------------------------------------ |
| 1     | `fetchSubscriptionRaw()`          | Pure Firestore query + paused fallback. No business logic, no mutations. |
| 2     | `expireIfGracePeriodEnded()`      | Grace period check + auto-expire mutation. ONLY write during read path.  |
| 3     | `getActiveSubscriptionForStore()` | Orchestrator — composes Layer 1 + Layer 2.                               |

**Why:** Isolates the dangerous auto-expire mutation (write during read) so a bug in expiry logic can't break the query layer. Each layer is independently testable.

### 14.3 Nightly Reconciliation Job (Firebase Cloud Function)

**File:** `functions/src/billing/reconcileSubscriptions.ts`
**Called from:** `functions/src/decisionBlocksScoring.ts` nightly scheduler (2:30 AM UTC)
**Feature flag:** `FUNCTION_FLAGS.ENABLE_SUBSCRIPTION_RECONCILIATION` in `functions/src/constants/features.ts`

> **Migration note (Feb 2026):** Moved from Vercel API route (`/api/internal/reconcile-subscriptions`) + Vercel Cron to Firebase Cloud Functions. Reasons: longer timeout (540s vs 10s), no extra cron needed (runs alongside existing nightly jobs), same infrastructure.

> **Route removal note (Jul 2026):** The deprecated Vercel fallback route at `/api/internal/reconcile-subscriptions` has been removed. The active Firebase Functions reconciler is the only supported reconciliation path and uses bounded diagnostics with subscription/provider IDs as presence-length metadata.

Safety net for webhook failures. Queries all `active`/`past_due`/`paused` subscriptions from Firestore (Admin SDK), fetches each from Razorpay API, and syncs mismatches:

- **Status mismatch** → sync to Razorpay's authoritative state (with `validateTransition()`)
- **Cycle dates** → sync if Razorpay has newer cycle (start date is later)
- **Paid count** → sync if different
- **Renews-on** → sync if >1 day difference

**Auth:** Runs as Firebase service account — no user auth needed.
**Secrets:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (Firebase secrets, declared on scheduler config).
**Logging:** `functions.logger` — results visible in Firebase Console → Functions → Logs.

**Nightly scheduler execution order:**

1. Decision Blocks Scoring (per-project)
2. Menu Intelligence (per-project)
3. Authority Maturation Analysis
4. Menu Drift Metrics
5. Guest Feedback Retention
6. **Subscription Reconciliation** ← runs last, non-blocking

### 14.4 Shared Billing Utilities

**File:** `src/lib/billing/billingUtils.ts`

Extracted duplicate functions from webhook and verify-subscription routes into a shared utility:

| Function                                     | Previously duplicated in     | Purpose                                                      |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `getPlanDetailsFromConstants(notes)`         | webhook, verify-subscription | Looks up plan from local constants using Razorpay notes      |
| `getSubscriptionEndDate(subscriptionEntity)` | webhook, verify-subscription | Calculates subscription end date from start_at + total_count |

**Pattern applied:** Redundancy Elimination (Pattern 1 from `IDE_PROMPTS/7. CODE REFACTORING PATTERNS.md`)

### 14.5 Frozen Core Governance

The billing architecture is now **frozen**. No structural changes without explicit review.

**Rules:**

1. No manual Firestore edits — all updates via webhook, API routes, or reconciliation
2. All status changes must pass through `validateTransition()`
3. Payment transaction log is **append-only** — no update/delete methods exist
4. `FirestoreSubscriptionDoc` has `@immutable` rule documented in the type definition
5. New billing features require audit against this document before implementation

---

## 15. Pre-Freeze Testing Matrix

Run these tests with real money before freezing the billing architecture.

### 15.1 INR Subscription Tests

| #   | Test Case                  | Steps                                     | Expected Result                                         | Status |
| --- | -------------------------- | ----------------------------------------- | ------------------------------------------------------- | ------ |
| 1   | New monthly subscription   | Choose plan → Pay via UPI/Card → Verify   | Status: active, credits set, cycleEndDate = +1 month    | ☐      |
| 2   | New yearly subscription    | Choose plan → Pay via UPI/Card → Verify   | Status: active, credits set, cycleEndDate = +1 year     | ☐      |
| 3   | Monthly renewal            | Wait for cycle end → Auto-charge          | Status: active, new cycle dates, credits reset          | ☐      |
| 4   | Upgrade (monthly→yearly)   | Click upgrade → Choose new plan → Pay     | Old sub: expired, new sub: active, credits carried      | ☐      |
| 5   | Downgrade (yearly→monthly) | Click upgrade → Choose cheaper plan → Pay | Old sub: expired, new sub: active, credits carried      | ☐      |
| 6   | Cancel subscription        | Click cancel → Confirm → Verify           | Status: cancelled, access until cycleEndDate            | ☐      |
| 7   | Pause disabled             | Active subscription → Billing UI + direct API | No Pause action shown; API returns unavailable before mutation | ☐      |
| 8   | Resume disabled            | Paused legacy record → Billing UI + direct API | Support recovery shown; API returns unavailable before mutation | ☐      |
| 9   | Failed payment             | Use test card that fails → Verify         | Status: past_due, grace period starts, retry link shown | ☐      |
| 10  | Recovery after failure     | Retry payment → Success                   | Status: active, pastDueSinceAt cleared, credits reset   | ☐      |
| 11  | Top-up credits             | Buy credit pack → Pay → Verify            | topUpCredits increased, transaction logged              | ☐      |

### 15.2 USD Subscription Tests

| #   | Test Case              | Steps                               | Expected Result                                | Status |
| --- | ---------------------- | ----------------------------------- | ---------------------------------------------- | ------ |
| 1   | New subscription (USD) | Choose plan → Pay via Card → Verify | Status: active, currency: USD, amount in cents | ☐      |
| 2   | Renewal (USD)          | Wait for cycle end → Auto-charge    | Status: active, new cycle dates                | ☐      |
| 3   | Top-up (USD)           | Buy credit pack → Pay → Verify      | topUpCredits increased                         | ☐      |

### 15.3 Edge Case Tests

| #   | Test Case               | How to Test                                              | Expected Result                                           | Status |
| --- | ----------------------- | -------------------------------------------------------- | --------------------------------------------------------- | ------ |
| 1   | Webhook delayed         | Verify-subscription fires before webhook                 | User sees active immediately (optimistic update)          | ☐      |
| 2   | Webhook duplicate       | Replay same webhook event                                | Idempotent — billingHistory dedup, no double credits      | ☐      |
| 3   | Webhook missing         | Block webhook, run reconciliation                        | Reconciliation syncs status from Razorpay                 | ☐      |
| 4   | Grace period expiry     | Set pastDueSinceAt to 8 days ago → Load app              | Auto-expires to expired, loses access                     | ☐      |
| 5   | Paused + cycle ended    | Legacy/provider-side paused sub → Wait for cycleEndDate  | Sub visible on billing page with support recovery, no dashboard/projects access | ☐      |
| 6   | Final cycle (completed) | Set totalPaymentsMadeCount = totalPaymentsNeededCount    | Shows "Choose New Plan", no cancel/pause buttons          | ☐      |
| 7   | State machine warning   | Force invalid transition in test                         | Logger.warn fires, transition still proceeds              | ☐      |
| 8   | Reconciliation mismatch | Manually desync Firestore status → Run nightly scheduler | Firestore synced to Razorpay's authoritative state        | ☐      |

### 15.4 Security Tests

| #   | Test Case                 | How to Test                                              | Expected Result                | Status |
| --- | ------------------------- | -------------------------------------------------------- | ------------------------------ | ------ |
| 1   | Tenant isolation          | Try to cancel another tenant's sub                       | 403 Forbidden                  | ☐      |
| 2   | Invalid webhook signature | Send forged webhook                                      | 400 Invalid signature          | ☐      |
| 3   | Reconciliation auth       | Runs as Firebase service account only (no HTTP endpoint) | Cannot be triggered externally | ☐      |
| 4   | Rate limit on create      | Spam create-subscription                                 | 429 after limit exceeded       | ☐      |

**Freeze criteria:** ALL tests pass → billing architecture frozen.

---

_This document covers the complete `activeSubscription` architecture. For Razorpay-specific implementation details (webhook signatures, plan creation, retry/dunning, etc.), see `razorpay_impl.md`._
