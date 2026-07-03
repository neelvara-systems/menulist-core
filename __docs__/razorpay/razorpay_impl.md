# Razorpay Payment System — Complete Technical Reference

**For:** Developers, Founder, CEO, Co-Founder
**Last Updated:** July 1, 2026
**Status:** Implemented and billing-slice audited — full MenuList production certification still pending
**Codebase:** Single source of truth. Every claim links to exact file:line.

This document covers the **entire** Razorpay payment flow end-to-end: from user onboarding → subscription creation → payment processing → webhook handling → credit management → owner-side billing UI → cancellation/upgrade flows. Runtime code remains the source of truth.

June 11, 2026 audit corrections:

- `/api/razorpay/verify-subscription` requires the Razorpay checkout signature, verifies payment status is `captured`, and verifies the payment belongs to the submitted subscription before activating local billing state.
- `/api/razorpay/create-subscription` no longer accepts browser-supplied carry-forward credit. New subscriptions start with `topUpCredits: 0`.
- `/api/razorpay/upgrade-subscription` verifies both old and new subscription ownership, computes remaining credits from the old subscription server-side, writes `carryForwardFromSubscriptionId`, and applies carry-forward idempotently.
- `/api/razorpay/create-topup-order` verifies an active subscription exists before opening paid top-up checkout.
- Authenticated billing JSON routes use bounded body readers before schema validation, Razorpay provider calls, tenant/store reads, or subscription/top-up writes: 8KB for Razorpay payment actions and 16KB for onboarding subscription setup.
- Browser subscription reads no longer attempt forbidden subscription writes when grace period has ended; server-owned paths perform expiry writes and entitlement/cache sync.
- Owner billing history is capped to the latest 50 successful payment events.
- `usePaymentHandler` and `useRazorpayScript` now use bounded payment diagnostics instead of direct console logging. Subscription/top-up verification failures no longer log raw verification response payloads, payment identifiers, signatures, provider errors, or checkout exception objects.
- Browser billing route requests in `usePaymentHandler` now use no-store caching, same-origin credentials, and manual redirect handling for create, cancel, pause, resume, upgrade, top-up, onboarding, and verification handoffs before accepting route responses.
- Browser billing route responses in `usePaymentHandler` now pass through `readPaymentResponseJson()`, which uses `readJsonResponseWithLimit()` with a 32KB cap. Malformed or oversized create, cancel, pause, resume, upgrade, top-up, onboarding, and verification responses log `payment_response_parse_failed` with status/OK/max-byte metadata plus bounded plan/pack/subscription context only, then continue through fixed generic failure codes. Successful subscription, top-up order, and onboarding responses are shape-checked before checkout opens or session state updates. Cancel, pause, resume, and upgrade responses must also parse as `{ success: true }` before owner success copy or follow-up state refresh can continue.
- Browser payment verification acknowledgements are shape-checked before checkout success resolves. `/api/razorpay/verify-subscription` must return `{ success: true, status: "active" }`, and `/api/razorpay/verify-topup` must return `{ success: true, newCreditBalance: number }`; malformed 2xx responses fail through fixed payment verification failure codes.
- Authenticated Razorpay route `logger.security()` events use `getBoundedRazorpaySecurityContext()` instead of raw `buildSecurityContext()` output. Validation failure `attemptedData`, billing-permission failures, signature failures, tenant/store mismatches, and mutation mismatch breadcrumbs record identifier presence/length metadata instead of raw user IDs, emails, tenant/store IDs, request IP/user-agent values, product/plan/pack IDs, subscription IDs, order IDs, or payment IDs.
- Authenticated MenuList billing mutations use `canManageBillingMutation()` to fail closed for missing store/tenant/role context, cross-tenant stores, inactive stores, soft-deleted stores, and platform-blocked stores before subscription, top-up, cancellation, pause, resume, or upgrade mutations proceed.
- Website pricing, website credit packs, desktop billing, subscription self-service, and mobile billing callers now use the same bounded payment diagnostics for payment failures. They do not direct-console or raw-log checkout/store-switch/history/refetch errors, and owner-visible payment failure messages stay generic.
- Desktop and mobile retry-payment and invoice links now open through guarded `noopener,noreferrer` browser handoffs. Blocked opens log bounded URL presence/length and invoice/subscription context only.
- Server-side plan creation and entitlement sync diagnostics are bounded. Razorpay plan lookup/create logs use lookup/provider-plan presence and length metadata only, throw fixed local failure text, and store source error name/code/status only in diagnostics. MenuList entitlement sync failures use `billing_store_plan_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata.
- Cancellation flow logs now use `getRazorpaySubscriptionMutationLogContext()` instead of raw subscription, provider-subscription, tenant, store, or plan identifiers. Cancellation failure logs also use the fixed `razorpay_cancel_subscription_failed` code with bounded source-error metadata.
- Subscription verification local logs no longer set raw top-level `userId` fields. Payment, provider subscription, internal subscription, update, and failure breadcrumbs keep user identity as bounded presence/length metadata inside the log payload.
- Successful authenticated billing mutations keep lifecycle/internal notification sends fire-and-forget, but failed notification imports/sends now emit bounded `logRazorpayNonBlockingFailure` diagnostics. Verify-subscription, verify-topup, cancel, pause, resume, and upgrade routes log stable notification failure codes plus identifier presence/length metadata only; they do not log raw emails, store names, provider payloads, or raw tenant/store/payment/subscription IDs.
- Razorpay webhook notification, alert, and failed-status bookkeeping fallbacks also use bounded `logRazorpayNonBlockingFailure` diagnostics. Webhook receipt and duplicate breadcrumbs bound provider event IDs/event keys as presence/length metadata instead of logging raw provider identifiers.
- Onboarding subscription diagnostics and the shared `handlePaymentError()` helper are bounded. Onboarding validation security breadcrumbs, existing-user attempts, success breadcrumbs, failure logs, and local dev payment logs store stable codes plus identifier presence/length metadata only. Shared Firestore/Razorpay payment-handler logs no longer include raw exception messages, stacks, provider descriptions, or raw user/tenant/store IDs; generic Firestore/Razorpay fallback responses use fixed detail text in every environment.
- Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`. This locks server-side payment verification, active-subscription top-up gating, checkout response acknowledgement, and entitlement/cache sync source contracts. It is source/docs parity only and does not replace real Razorpay sandbox checkout or webhook smoke.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Inventory](#2-file-inventory)
3. [Type Definitions & Database Schema](#3-type-definitions--database-schema)
4. [Subscription Plans & Pricing](#4-subscription-plans--pricing)
5. [Flow 1: New User Onboarding](#5-flow-1-new-user-onboarding)
6. [Flow 2: Existing User — New Subscription](#6-flow-2-existing-user--new-subscription)
7. [Flow 3: Payment Verification](#7-flow-3-payment-verification)
8. [Flow 4: Webhook Processing](#8-flow-4-webhook-processing)
9. [Flow 5: Plan Upgrade](#9-flow-5-plan-upgrade)
10. [Flow 6: Subscription Cancellation](#10-flow-6-subscription-cancellation)
11. [Flow 7: AI Enhancement Pack (Top-Up)](#11-flow-7-ai-enhancement-pack-top-up)
12. [Credit System — Monthly Reset](#12-credit-system--monthly-reset)
13. [Grace Period & Past Due Handling](#13-grace-period--past-due-handling)
14. [Frontend — Owner Billing Dashboard](#14-frontend--owner-billing-dashboard)
15. [Frontend — Website Subscription Management](#15-frontend--website-subscription-management)
16. [Security Implementation](#16-security-implementation)
17. [Database Access Layer (DAL)](#17-database-access-layer-dal)
18. [Billing History & Transaction Logging](#18-billing-history--transaction-logging)
19. [Utility Functions](#19-utility-functions)
20. [Environment Variables](#20-environment-variables)
21. [Key Architecture Decisions](#21-key-architecture-decisions)
22. [Changes, Fixes & Improvements Log](#22-changes-fixes--improvements-log)
23. [**Razorpay Official Docs Audit**](#23-razorpay-official-docs-audit-feb-10-2026)
24. [Future Enhancements (Backlog)](#24-future-enhancements-backlog)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                   │
│  Website Pricing Page          Owner Dashboard Billing Page      │
│  (shadcn/ui components)        (Ant Design components)           │
│         │                              │                          │
│         └──────────┬───────────────────┘                          │
│                    │                                              │
│         usePaymentHandler.ts (hook)                              │
│         useRazorpayScript.ts (script loader)                     │
│                    │                                              │
│         Razorpay Checkout Modal (client-side)                    │
└────────────────────┼─────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│                 BACKEND (Next.js API Routes)                      │
│                                                                   │
│  /api/onboarding/create-subscription     (new users)             │
│  /api/razorpay/create-subscription       (existing users)        │
│  /api/razorpay/verify-subscription       (post-payment)          │
│  /api/razorpay/upgrade-subscription      (plan change)           │
│  /api/razorpay/cancel-subscription       (cancellation)          │
│  /api/razorpay/create-topup-order        (AI pack purchase)      │
│  /api/razorpay/verify-topup              (AI pack verification)  │
│  /api/razorpay/webhook                   (Razorpay events)       │
│                    │                                              │
│         lib/razorpay/razorpay.ts         (SDK client)            │
│         lib/razorpay/plan-handler.ts     (plan dedup)            │
│         lib/razorpay/webhook-validator.ts (HMAC-SHA256)          │
└────────────────────┼─────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│              FIRESTORE DATABASE                                   │
│                                                                   │
│  subscriptions/{providerSubscriptionId}   (subscription doc)     │
│  paymentTransactions/{auto-id}            (webhook event log)    │
│  aiOperations/{tId}/{sId}/{auto-id}       (AI usage tracking)   │
└──────────────────────────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────┐
│           RAZORPAY (External)                                     │
│                                                                   │
│  Plans API        → getOrCreateRazorpayPlan()                    │
│  Subscriptions API → create, fetch, cancel                       │
│  Orders API       → create (for top-ups)                         │
│  Payments API     → fetch, capture                               │
│  Invoices API     → fetch (for billing history)                  │
│  Webhooks         → subscription.charged, payment.failed, etc.   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Principle:** Subscriptions are **per-store** (not per-tenant). Each store has its own subscription, its own credit balance, and its own billing cycle.

---

## 2. File Inventory

### Backend — API Routes

| File                                                  | Purpose                                                      | Lines | Auth           |
| ----------------------------------------------------- | ------------------------------------------------------------ | ----- | -------------- |
| `src/app/api/onboarding/create-subscription/route.ts` | New user onboarding (tenant + store + subscription creation) | 349   | `withAuth()`   |
| `src/app/api/razorpay/create-subscription/route.ts`   | Create subscription for existing user                        | 219   | `withAuth()`   |
| `src/app/api/razorpay/verify-subscription/route.ts`   | Server-side payment verification + activation                | 222   | `withAuth()`   |
| `src/app/api/razorpay/upgrade-subscription/route.ts`  | Cancel old plan + expire with credit carry-forward           | 120   | `withAuth()`   |
| `src/app/api/razorpay/cancel-subscription/route.ts`   | User-initiated cancellation with reason tracking             | 116   | `withAuth()`   |
| `src/app/api/razorpay/create-topup-order/route.ts`    | Create Razorpay order for AI Enhancement Pack                | 130   | `withAuth()`   |
| `src/app/api/razorpay/verify-topup/route.ts`          | Verify top-up payment + add credits                          | 157   | `withAuth()`   |
| `src/app/api/razorpay/webhook/route.ts`               | Process Razorpay webhook events                              | 260   | HMAC signature |

### Backend — Library / Utilities

| File                                    | Purpose                                                       | Lines |
| --------------------------------------- | ------------------------------------------------------------- | ----- |
| `src/lib/razorpay/razorpay.ts`          | Razorpay SDK singleton client                                 | 18    |
| `src/lib/razorpay/plan-handler.ts`      | `getOrCreateRazorpayPlan()` — dedup plans by lookup key       | 130   |
| `src/lib/razorpay/webhook-validator.ts` | HMAC-SHA256 signature validation with timing-safe compare     | 94    |
| `src/utils/razorpay.ts`                 | `getGracePeriodInfo()`, `calculateRemainingCredits()`         | 74    |
| `src/lib/ai/capacityCheck.ts`           | `checkAICapacity()`, `consumeAICapacity()`, lazy credit reset | 202   |

### Frontend Diagnostics

| File | Purpose |
| ---- | ------- |
| `src/hooks/paymentDiagnostics.ts` | Shared bounded diagnostics for browser payment and Razorpay script failures. |
| `src/hooks/usePaymentHandler.ts` | Opens checkout, posts verification payloads to server routes, parses billing route responses with a bounded 32KB reader, shape-checks subscription/order/onboarding payloads, and logs only normalized failure codes plus bounded product/plan/pack/status metadata. |
| `src/hooks/useRazorpayScript.ts` | Loads Razorpay Checkout and logs script-load failure through bounded payment diagnostics. |
| `src/components/website/pricing-pages/index.tsx` | Handles website subscription/onboarding checkout failures with bounded diagnostics and generic user-facing failure text. |
| `src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx` | Opens the post-payment dashboard handoff with `noopener,noreferrer`, logs bounded blocked-open diagnostics, and falls back to same-tab navigation without raw purchase/payment payloads. |
| `src/components/website/pricing-pages/shared/CreditPacksCtaSection.tsx` | Handles website credit-pack top-up failures with bounded diagnostics. |
| `src/components/templates/main-app/billing/index.tsx` | Handles owner desktop upgrade, paid-location, credit-pack, and store-switch failures with bounded diagnostics. |
| `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` | Handles desktop cancel, pause, resume, and retry-payment link-open failures with bounded diagnostics and generic owner messages. |
| `src/components/templates/main-app/billing/BillingHistory.tsx` | Handles desktop invoice link-open failures with bounded diagnostics and generic owner messages. |
| `src/components/mobile/screens/MobileBillingScreen.tsx` | Handles mobile billing payment-action, subscription refetch, history-load, store-switch, retry-payment, pending-payment, and invoice link-open failures with bounded diagnostics and generic toast text. |

Frontend diagnostics must not log raw `razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_order_id`, `razorpay_signature`, `shortUrl`, `invoiceUrl`, verification responses, billing route response bodies, provider exception payloads, owner identity, or full plan/subscription objects. `npm run verify:menulist-api-tenant-safety` guards this contract.

### Backend — Database Layer

| File                                                | Purpose                                         | Lines |
| --------------------------------------------------- | ----------------------------------------------- | ----- |
| `src/database/subscriptions/index.ts`               | Subscription CRUD + grace period enforcement    | 143   |
| `src/database/subscriptions/paymentTransactions.ts` | Webhook event logging + billing history queries | 55    |

### Backend — Type Definitions

| File                                     | Purpose                                                               | Lines |
| ---------------------------------------- | --------------------------------------------------------------------- | ----- |
| `src/types/razorpay.ts`                  | `FirestoreSubscriptionDoc`, `FirestoreTopupDoc`, `BillingHistoryItem` | 141   |
| `src/types/razorpayWebhookEventTypes.ts` | Webhook event payload types (Payment, Subscription, EventObject)      | 126   |

### Backend — Plan Data

| File                            | Purpose                                                          | Lines |
| ------------------------------- | ---------------------------------------------------------------- | ----- |
| `src/data/PlatformPlansList.ts` | B2C plans, B2B plans, AI Enhancement Packs, getters              | 154   |
| `src/data/common.ts`            | `Plan`, `AIEnhancementPack`, `Currency`, `BillingInterval` types | 104   |

### Frontend — Hooks

| File                             | Purpose                                                               | Lines |
| -------------------------------- | --------------------------------------------------------------------- | ----- |
| `src/hooks/usePaymentHandler.ts` | All payment flows: create, verify, upgrade, cancel, topup, onboarding | 350   |
| `src/hooks/useRazorpayScript.ts` | Dynamic Razorpay Checkout.js script loader                            | 36    |

### Frontend — Owner Dashboard (Ant Design)

| File                                                                                    | Purpose                                        | Lines |
| --------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- |
| `src/components/templates/main-app/billing/index.tsx`                                   | Main billing page — orchestrator               | 234   |
| `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx`                  | Subscription details card + credits display    | 288   |
| `src/components/templates/main-app/billing/PricingPlansModal.tsx`                       | Plan selection modal with MONTH/YEAR toggle    | 300   |
| `src/components/templates/main-app/billing/CancellationModal.tsx`                       | 2-step cancellation flow with reason + consent | 167   |
| `src/components/templates/main-app/billing/CreditPackCard.tsx`                          | Individual AI Enhancement Pack card            | 134   |
| `src/components/templates/main-app/billing/CreditsPackModal.tsx`                        | Modal wrapping pack cards                      | 40    |
| `src/components/templates/main-app/billing/RemainingCreditNote.tsx`                     | Credit carry-forward display on upgrade        | 32    |
| `src/components/templates/main-app/billing/UpgradeConfirmationModal.tsx`                | Upgrade confirmation with credit note          | 64    |
| `src/components/templates/main-app/billing/UpgradeSubscriptionPayementSuccessModal.tsx` | Success modal with confetti                    | 107   |
| `src/components/templates/main-app/billing/BillingHistory.tsx`                          | Table of past payments with invoice links      | 145   |
| `src/components/templates/main-app/billing/NoSubscriptionView.tsx`                      | Empty state → "View Plans" CTA                 | 38    |

### Frontend — Website (shadcn/ui)

| File                                                                                                     | Purpose                             | Lines |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----- |
| `src/components/templates/website/platformSite/landingPage/pricing/SubscriptionManagement.tsx`           | Public subscription management page | 204   |
| `src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx` | Onboarding success modal with safe dashboard handoff | 108   |

**Total: 34 files, ~4,000+ lines of code**

---

## 3. Type Definitions & Database Schema

### FirestoreSubscriptionDoc

**Collection:** `subscriptions`
**Document ID:** Razorpay subscription ID (e.g., `sub_xxxxxxxxxxxxx`)
**File:** `src/types/razorpay.ts:36-99`

```typescript
interface FirestoreSubscriptionDoc {
  id?: string;
  paymentProvider: "razorpay"; // Always "razorpay"
  providerSubscriptionId: string; // Razorpay sub ID (also used as Firestore doc ID)
  providerPlanId: string; // Razorpay plan ID

  // Core User & Tenant Context
  userId: string;
  name: string;
  email: string;
  tenantId: number | string;
  storeId: number | string;
  userType: "B2C" | "B2B";

  // Plan & Status
  status:
    | "pending"
    | "active"
    | "cancelled"
    | "expired"
    | "paid"
    | "failed"
    | "past_due"
    | "completed";
  planName: string; // e.g., "Pro Plan (Yearly)"
  planId: string; // e.g., "pro"
  planType: "MONTH" | "YEAR";
  amount: number; // In smallest currency unit (paise/cents)
  currency: "INR" | "USD";

  // Billing Cycle Dates (Firebase Timestamps)
  cycleStartDate: Timestamp; // Start of current billing period
  cycleEndDate: Timestamp; // End of current billing period
  renewsOn: Timestamp; // When next charge occurs (= cycleEndDate)
  subscriptionStartDate: Timestamp; // When subscription first started
  subscriptionEndDate: Timestamp; // When subscription will fully end
  pastDueSinceAt: Timestamp; // When payment first failed (null if not past_due)

  // Credit Management System
  monthlyCreditsAllowance: number; // Fixed credits per cycle (set once, e.g., 200)
  monthlyCredits: number; // Current balance (resets every billing cycle)
  topUpCredits: number; // Purchased credits (never resets, never expires)
  creditsLastResetMonth?: number; // YYYYMM billing-period key (e.g., 202602)

  // Razorpay Metadata
  totalPaymentsNeededCount: number; // Razorpay total_count
  totalPaymentsMadeCount: number; // Razorpay paid_count
  shortUrl: string; // Razorpay payment page URL

  // Payment Method
  paymentMethod: {
    type: string; // "card" | "upi"
    brand?: string; // "visa" | "mastercard"
    last4?: string; // "4024"
    upiId?: string; // UPI VPA
    upiTransactionId?: string;
  } | null;

  // Audit Trail
  statuses: Array<{
    status: string;
    timestamp: Timestamp;
    amount: number;
    currency: string;
    remark: string;
  }>;
  billingHistory: string[]; // Array of Razorpay payment IDs
  lastWebhook: { event: string; timestamp: Timestamp } | null;
}
```

### FirestoreTopupDoc

**File:** `src/types/razorpay.ts:114-129`

```typescript
interface FirestoreTopupDoc {
  id?: string;
  paymentProvider: "razorpay";
  providerOrderId: string; // Razorpay order ID
  providerPaymentId?: string; // Razorpay payment ID
  creditsAdded: number;
  amount: number;
  currency: "INR" | "USD";
  status: PaymentStatus;
  userId: string;
  tenantId: number | string;
  storeId: number | string;
  paidAt?: Timestamp;
  packId?: string;
}
```

### BillingHistoryItem (Frontend Display)

**File:** `src/types/razorpay.ts:131-141`

```typescript
interface BillingHistoryItem {
  id: string;
  type: string; // "Subscription Payment" | "Credit Pack Purchase"
  date: number; // JS timestamp
  description: string;
  amount: number;
  currency: string;
  status: string;
  invoiceId?: string;
  invoiceUrl?: string;
}
```

---

## 4. Subscription Plans & Pricing

**File:** `src/data/PlatformPlansList.ts:10-95`

### B2C Plans

| Plan ID   | Plan Name    | Monthly Price (INR) | Yearly Price (INR) | Monthly Credits (INR) | Monthly Price (USD) | Yearly Price (USD) | Monthly Credits (USD) |
| --------- | ------------ | ------------------- | ------------------ | --------------------- | ------------------- | ------------------ | --------------------- |
| `starter` | Starter Plan | ₹499                | ₹4,990             | 75                    | $29                 | $290               | 100                   |
| `pro`     | Pro Plan     | ₹1,499              | ₹14,990            | 200                   | $79                 | $790               | 400                   |
| `premium` | Premium Plan | ₹3,999              | ₹39,990            | 600                   | $149                | $1,490             | 1,000                 |

### B2B Plans

| Plan ID   | Plan Name   | Monthly Price (INR) | Yearly Price (INR) | Monthly Credits (INR) | API Call Allowance |
| --------- | ----------- | ------------------- | ------------------ | --------------------- | ------------------ |
| `starter` | Starter API | ₹4,999              | ₹49,990            | 200                   | 1,000/mo           |
| `pro`     | Pro API     | ₹1,89,990           | ₹1,89,990          | 1,000                 | 5,000/mo           |

### AI Enhancement Pack (Top-Up)

**File:** `src/data/PlatformPlansList.ts:112-121`

| Pack ID       | Name                | Credits | Price (INR) | Price (USD) |
| ------------- | ------------------- | ------- | ----------- | ----------- |
| `enhancement` | AI Enhancement Pack | 250     | ₹2,999      | $35         |

### Razorpay Plan Deduplication

**File:** `src/lib/razorpay/plan-handler.ts:57-130`

Plans are created on Razorpay's side using a **lookup key** pattern to avoid duplicates:

```
lookupKey = "{userType}_{planId}_{interval}_{currency}_{price}".toUpperCase()
Example: "B2C_PRO_MONTH_INR_149900"
```

`getOrCreateRazorpayPlan()` searches existing Razorpay plans (up to 100) for a matching `lookupKey` in `notes`. If found, returns existing plan ID. If not, creates a new plan. Lookup, found-plan, create-plan, and failure diagnostics use bounded metadata only; raw lookup keys, provider plan IDs, and provider exception messages are not logged or rethrown.

---

## 5. Flow 1: New User Onboarding

**Entry Point:** Website pricing page → user signs up → selects plan
**Frontend:** `usePaymentHandler.ts:219-314` → `executePostOnboarding()`
**Backend:** `src/app/api/onboarding/create-subscription/route.ts:41-348`

### Sequence

```
1. User selects plan on website pricing page
2. purchaseIntent stored in localStorage: { plan, currency, businessName, businessIndustry }
3. User signs in (NextAuth)
4. executePostOnboarding() called with purchaseIntent

FRONTEND:
5. POST /api/onboarding/create-subscription
   Body: { businessName, businessIndustry, planId, interval, currency, userType }

BACKEND:
6. withAuth() verifies session
7. Verify user does NOT already have tenant/store (security)
8. Rate limit check: PAYMENT_ONBOARDING config
9. Bounded JSON body parse (16KB cap)
10. Zod input validation (OnboardingSubscriptionSchema)
11. Find plan from PlatformPlansList constants
12. ATOMIC TRANSACTION (Firestore runTransaction):
    a. Create tenant document
    b. Create store document (with default roles, time slot presets)
    c. Sync to storesSummary (Cloud Function optimization)
    d. Update user document with tenantId + storeId
    e. Update platformSummary counts
13. getOrCreateRazorpayPlan() — find or create Razorpay plan
14. razorpayClient.subscriptions.create() — create Razorpay subscription
    - total_count: 36 (monthly) or 3 (yearly)
    - notes: { tenantId, storeId, userId, userType, planId, priceKey, interval, ... }
15. createInitialSubscription() — Firestore doc with:
    - status: "pending"
    - monthlyCreditsAllowance: plan credits
    - monthlyCredits: plan credits (full balance)
    - topUpCredits: 0
    - creditsLastResetMonth: YYYYMM (calendar month, corrected later by verify)
    - cycleStartDate/EndDate: null (set after payment)
16. Return { subscription, tenantId, storeId }

FRONTEND (continued):
17. Update NextAuth session with new tenantId/storeId
18. Open Razorpay Checkout modal (subscription_id)
19. User completes payment
20. Razorpay handler callback → verifySubscriptionPaymentResponse()
21. POST /api/razorpay/verify-subscription (see Flow 3)
22. Show SubscriptionPayementSuccessModal with confetti
```

### Analytics Assistant Entitlement Sync

When a subscription becomes `active`, payment verification and Razorpay webhooks sync the active plan id to:

- `stores/{storeId}.activePlanType`
- `platformSummary/storesSummary.stores.{storeId}.activePlanType`
- `subscriptions/{subscriptionId}.analyticsEntitlement`

Only `active` subscriptions carry an active plan type. `past_due`, `paused`, `cancelled`, `expired`, and `completed` remove the store-level plan mirror so paid analytics AI summaries and action-list wording fail closed. The nightly reconciliation job repairs stale or missing entitlement mirrors without scanning stores.

The active Firebase Functions reconciler at `functions/src/billing/reconcileSubscriptions.ts` is the only supported subscription reconciliation path. The deprecated Vercel fallback route at `src/app/api/internal/reconcile-subscriptions/route.ts` was removed on July 1, 2026, after the Firebase scheduler migration. Functions per-subscription failures use `BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED`. Subscription/provider IDs are logged as presence-length metadata only, update logs use counts/booleans instead of raw field arrays, and source error names/codes/status values are capped before Functions logging.

### Key Security

- `withAuth()` middleware on the route
- Checks user does NOT already have tenant (prevents duplicate onboarding)
- Rate limiting: `PAYMENT_ONBOARDING` config
- Zod validation: `OnboardingSubscriptionSchema`
- Atomic transaction: prevents partial tenant/store creation
- Server-created IDs passed to Razorpay notes (not client-provided)

---

## 6. Flow 2: Existing User — New Subscription

**Entry Point:** Owner dashboard billing page → "View Plans" / "Choose a New Plan"
**Frontend:** `usePaymentHandler.ts:20-74` → `createSubscription()` → `onClickPaymentCard()`
**Backend:** `src/app/api/razorpay/create-subscription/route.ts`

### Sequence

```
1. User clicks "Get Started" on a plan card (PricingPlansModal)
2. UpgradeConfirmationModal shows plan details + remaining credits
3. User confirms → handleConfirmUpgrade() called

FRONTEND:
4. createSubscription(plan, currency, user)
5. POST /api/razorpay/create-subscription
   Body: { planId, interval, currency, userType, quantity? }

BACKEND:
6. withAuth()
7. Bounded JSON body parse (8KB cap)
8. Zod validation
9. Resolve billing scope, verify tenant/store access, and check billing mutation permission
10. Rate limit check: PAYMENT_SUBSCRIPTION config
11. Find plan from PlatformPlansList constants
12. getOrCreateRazorpayPlan()
13. razorpayClient.subscriptions.create()
    - total_count: 36 (monthly) or 3 (yearly)
    - notes include zero server-owned carried credits for new subscriptions
    - billing name/email come from the authenticated session only, not request body fallbacks
14. createInitialSubscription():
    - status: "pending"
    - monthlyCredits: plan's monthlyCredits
    - topUpCredits: 0
    - creditsLastResetMonth: YYYYMM
15. Return { subscription }

FRONTEND (continued):
16. Open Razorpay Checkout modal
17. User pays → handler → verifySubscriptionPaymentResponse()
18. POST /api/razorpay/verify-subscription
19. Refetch subscription, show success modal
```

---

## 7. Flow 3: Payment Verification

**File:** `src/app/api/razorpay/verify-subscription/route.ts:40-222`

Called immediately after Razorpay Checkout completes on the frontend. This is an **optimistic update** — we don't wait for the webhook.

### Sequence

```
1. Frontend POST /api/razorpay/verify-subscription
   Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, productId? }

2. withAuth() + bounded JSON body parse (8KB cap) + Zod validation (VerifyPaymentRequestSchema)
3. Verify Razorpay checkout HMAC signature before provider or Firestore reads
4. Fetch payment from Razorpay: razorpayClient.payments.fetch(payment_id)
5. Fetch subscription from Razorpay: razorpayClient.subscriptions.fetch(sub_id)
6. Resolve billing scope, verify tenant/store access, and check billing mutation permission
7. Find internal Firestore subscription: getSubscriptionById(sub_id)
8. Verify payment is captured and belongs to the submitted subscription
9. Verify internal subscription belongs to the session billing scope
10. If already active → return { success: true } (webhook may have beaten us)
11. Get plan details from constants using subscription notes
12. Calculate creditsLastResetMonth (billing-period-aware):
   - Anchor day = cycleStartDate day-of-month
   - Cap anchor to days in current month (month-end edge case)
   - If today < anchor: still in previous billing period
13. Build updatePayload:
    - status: "active"
    - monthlyCreditsAllowance: from plan constants
    - monthlyCredits: full allowance
    - topUpCredits: preserved from pending doc
    - creditsLastResetMonth: billing-period key
    - cycleStartDate, cycleEndDate, renewsOn: from Razorpay subscription
    - subscriptionStartDate, subscriptionEndDate: calculated
    - paymentMethod: { type, brand, last4, upiId, upiTransactionId }
    - billingHistory: [payment_id]
    - statuses: append "verified" entry
14. updateSubscription() — write to Firestore
15. Return { success: true, status: "active" }
```

### Subscription End Date Calculation

**File:** `src/app/api/razorpay/verify-subscription/route.ts:23-38`

```typescript
// For YEAR plans: start_at + total_count years
// For MONTH plans: start_at + total_count months
// total_count = 36 for monthly (3 years), 3 for yearly
```

---

## 8. Flow 4: Webhook Processing

**File:** `src/app/api/razorpay/webhook/route.ts:63-260`

Razorpay sends webhook events for subscription lifecycle changes. This route is **unauthenticated** (no `withAuth()`) but **signature-validated**. Before the raw body is read, it rejects malformed or oversized `content-length` headers above 256KB and applies the shared `WEBHOOK` IP rate limit. Chunked/no-length bodies are still read through a bounded raw-body reader, so oversized streams are rejected before JSON parse, idempotency claims, or billing mutations.

### Security — Webhook Signature Validation

**File:** `src/lib/razorpay/webhook-validator.ts:36-93`

```
1. Extract x-razorpay-signature header
2. Reject malformed/oversized declared bodies above 256KB
3. Apply `WEBHOOK` public rate limit
4. Read the raw body with a 256KB stream cap
5. HMAC-SHA256(requestBody, RAZORPAY_WEBHOOK_SECRET)
6. Timing-safe comparison (crypto.timingSafeEqual)
7. If mismatch -> 400 "Invalid signature"
```

### Durable Webhook Replay Guard

Before any billing mutation, the webhook handler claims a server-only document in `razorpayWebhookEvents/{eventKey}`. The key prefers Razorpay's webhook event id when present and falls back to a stable hash of the signed raw body. Already processed events and actively locked events return `status: duplicate`, so retries do not create extra `payment_transactions` rows or repeat subscription writes. Failed or stale claims can be retried.

### Handled Events

| Event                    | Action                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `subscription.activated` | Set status "active", update billing dates, reset credits, store payment method         |
| `subscription.charged`   | Same as activated — reset monthlyCredits, update cycle dates, append to billingHistory |
| `subscription.completed` | Set status "completed", update subscriptionEndDate                                     |
| `subscription.cancelled` | Log only — cancellation DB handling done in cancel-subscription route                  |
| `subscription.halted`    | Set status "past_due", record pastDueSinceAt                                           |
| `payment.failed`         | Set status "past_due", record error description                                        |
| `order.paid`             | Log top-up payment (transaction record)                                                |

### Key Webhook Logic (subscription.activated / subscription.charged)

**File:** `src/app/api/razorpay/webhook/route.ts:154-208`

```
1. Extract subscriptionEntity and paymentEntity from event payload
2. getSubscriptionById(subscriptionEntity.id) — find our Firestore doc
3. getPlanDetailsFromConstants(notes) — get plan from local constants
4. Extract payment method (card brand/last4 or UPI VPA)
5. Compute billing-period key (same anchor-day logic as verify-subscription):
   - newCycleStart = subscriptionEntity.current_start
   - rawAnchorDay = newCycleStart day-of-month
   - Cap anchor to days in current month
   - If today < anchor: still previous period
   - key = year * 100 + month
6. Build update:
   - status: "active"
   - monthlyCredits: reset to monthlyCreditsAllowance
   - creditsLastResetMonth: billing-period key
   - cycleStartDate/EndDate from Razorpay current_start/current_end
   - renewsOn from charge_at
   - subscriptionEndDate calculated from start_at + total_count
   - Append payment ID to billingHistory
   - Append status entry to statuses array
7. updateSubscription()
```

### Transaction Logging

**File:** `src/app/api/razorpay/webhook/route.ts:119`

Every webhook event is logged to the `paymentTransactions` collection as a lean v2 audit summary instead of the full Razorpay payload. This creates a complete audit trail while limiting Firestore document size and read cost. The event summary is enriched with:

- `tenantId` and `storeId` (extracted from subscription/order notes)
- `transactionType`: "subscription" or "topup"
- `invoiceUrl`: fetched from Razorpay Invoices API for `subscription.charged` and `order.paid` events

Billing history rendering uses `src/lib/billing/billingHistoryFormatter.ts` so desktop and mobile both accept lean v2 summaries and legacy raw Razorpay payload rows. The formatter keeps webhook documents small while preserving invoice, amount, status, billing-cycle, and top-up credit display. If Razorpay omits `creditAmount` from a top-up webhook row but the pack name/amount still matches the configured pack catalog, the UI uses the configured pack credit count for display without adding a Firestore read.

---

## 9. Flow 5: Plan Upgrade

**Entry Point:** Owner dashboard → "Upgrade Plan" button
**Frontend:** `usePaymentHandler.ts:129-145` → `onUpgradePlan()`
**Backend:** `src/app/api/razorpay/upgrade-subscription/route.ts:13-120`

### Sequence

```
FRONTEND:
1. User clicks "Upgrade Plan" → PricingPlansModal opens (filtered to higher plans)
2. Selects new plan → UpgradeConfirmationModal shows:
   - New plan details + price
   - RemainingCreditNote showing credit carry-forward calculation
3. User confirms → onUpgradePlan() called

4. calculateRemainingCredits(currentPlan):
   - Monthly: unusedThisMonth + topUpCredits
   - Yearly: unusedThisMonth + (remainingMonths * monthlyCreditsAllowance) + topUpCredits
5. createSubscription(newPlan, currency, user)
   → This creates a NEW Razorpay subscription + pending Firestore doc
   → topUpCredits in new doc = 0 until the server applies carry-forward
6. User pays via Razorpay Checkout
7. verify-subscription activates the new subscription

8. POST /api/razorpay/upgrade-subscription
   Body: { rc: remainingCredits, nSi: newSubscriptionId, oSi: oldSubscriptionId }

BACKEND:
9. withAuth() + rate limit + bounded JSON body parse (8KB cap)
10. Resolve billing scope, verify tenant/store access, and check billing mutation permission
11. getProductSubscriptionById(oldSubscriptionId) and getProductSubscriptionById(newSubscriptionId)
12. Verify both old and new subscriptions belong to the same tenant/store billing scope
13. Compute remaining credits server-side from the old subscription
14. Fetch old subscription from Razorpay
15. If not "completed" → razorpayClient.subscriptions.cancel(oldSubId)
16. updateSubscription(oldSubId):
    - status: "expired"
    - cycleEndDate: now
    - subscriptionEndDate: now
    - Append status entry with carry-forward details
17. updateSubscription(newSubscriptionId):
    - topUpCredits: server-computed remainingCredits
    - carryForwardCredits: remainingCredits
    - carryForwardFromSubscriptionId: oldSubscriptionId
18. Return { success: true }
```

### Credit Carry-Forward Calculation

**File:** `src/utils/razorpay.ts:34-74` → `calculateRemainingCredits()`

```
Monthly plans: totalRemainingCredits = monthlyCredits + topUpCredits
Yearly plans:
  monthsRemaining = (endYear - todayYear) * 12 + (endMonth - todayMonth)
  if today.date <= end.date: monthsRemaining += 1
  totalRemainingCredits = unusedThisMonth + (monthsRemaining - 1) * monthlyCreditsAllowance + topUpCredits
```

All remaining credits become `topUpCredits` on the new subscription (they never expire).

---

## 10. Flow 6: Subscription Cancellation

**Entry Point:** Owner dashboard → "Cancel Subscription" button
**Frontend:** `ActiveSubscriptionCard.tsx:59-72` → `CancellationModal.tsx`
**Backend:** `src/app/api/razorpay/cancel-subscription/route.ts:12-116`

### Sequence

```
FRONTEND:
1. User clicks "Cancel Subscription"
2. CancellationModal opens — 2-step animated flow:
   Step 1: Select reason (6 predefined + "Other" with textarea)
   Step 2: Confirm with checkbox consent
3. User confirms → onCancelSubscription()
4. POST /api/razorpay/cancel-subscription
   Body: { reason, otherReason, consent, subscriptionId? }

BACKEND:
5. withAuth() + rate limit + bounded JSON body parse (8KB cap)
6. Resolve billing scope, verify tenant/store access, and check billing mutation permission
7. Find subscription: by subscriptionId or direct current-store subscription lookup
8. Verify subscription belongs to user's tenant/store
9. Fetch subscription from Razorpay
10. If Razorpay status is "completed" → skip cancel (already ended)
11. Else → razorpayClient.subscriptions.cancel(providerSubscriptionId)
    This is IMMEDIATE cancellation on Razorpay's side
12. Verify Razorpay status is now "cancelled" or "completed"
13. updateSubscription():
    - status: "cancelled"
    - cycleEndDate: preserved (user keeps access until end of paid period)
    - subscriptionEndDate: set to cycleEndDate
    - Append status entry with reason, otherReason, consent
14. Return { success: true }
```

### Cancellation Reasons

**File:** `src/components/templates/main-app/billing/CancellationModal.tsx:11-18`

```
- "No longer need a website"
- "Lack of functionality"
- "Too expensive"
- "Found another tool"
- "Purchased accidentally"
- "Other (Please specify)"
```

### Post-Cancellation Behavior

- User retains access until `cycleEndDate` (paid period end)
- Subscription status shows "Cancelled" with access-until date
- The `getActiveSubscriptionForStore()` query includes `cancelled` status + `cycleEndDate >= now` — so they still pass capacity checks
- After `cycleEndDate` passes, the subscription no longer appears in active queries

---

## 11. Flow 7: AI Enhancement Pack (Top-Up)

**Entry Point:** Owner dashboard → "Buy More Credits" or capacity exhaustion → "Get More Enhancements"
**Frontend:** `usePaymentHandler.ts:147-217` → `handleTopupPurchase()`
**Backend Create:** `src/app/api/razorpay/create-topup-order/route.ts:15-130`
**Backend Verify:** `src/app/api/razorpay/verify-topup/route.ts:11-157`

### Sequence

```
FRONTEND:
1. User clicks "Buy More Credits" → CreditsPackModal opens
2. Selects pack → handleTopupPurchase(pack, currency)

3. POST /api/razorpay/create-topup-order
   Body: { packId, currency }

BACKEND (create-topup-order):
4. withAuth() + verifyTenantAccess() + canManageSubscription
5. Rate limit: PAYMENT_TOPUP config
6. Find pack from aiEnhancementPacksList
7. razorpayClient.orders.create():
   - amount: pack price
   - currency
   - notes: { tenantId, storeId, userId, packId, creditAmount, packName, price }
8. Write `topups/{orderId}` as `pending`
9. Return { order }

FRONTEND (continued):
10. Open Razorpay Checkout with order_id (NOT subscription_id — this is a one-time order)
11. User pays
12. POST /api/razorpay/verify-topup
    Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature }

BACKEND (verify-topup):
13. withAuth() + verifyTenantAccess() + canManageSubscription
14. Zod validation (VerifyTopupRequestSchema)
15. Verify Razorpay checkout signature
16. Read `topups/{orderId}` for idempotency
17. Fetch order and validate tenant/store notes
18. Fetch payment: razorpayClient.payments.fetch(payment_id)
19. If payment.status === "authorized" → programmatic capture:
    razorpayClient.payments.capture(payment_id, amount, currency)
20. Re-fetch payment → verify status === "captured" and payment.order_id matches
21. Find active subscription for store
22. Verify subscription belongs to tenant
23. Find pack from aiEnhancementPacksList → get creditAmount
24. In one Firestore transaction: increment `subscription.topUpCredits` and mark `topups/{orderId}` as `paid`
25. Return { success: true, newCreditBalance }

FRONTEND (continued):
26. Update local state from `newCreditBalance`
27. Show success message
```

### Key Difference: Orders vs Subscriptions

- **Subscriptions** are for recurring plan payments (Razorpay manages billing cycle)
- **Orders** are for one-time purchases (AI Enhancement Packs)
- Top-up uses `order_id` in Razorpay Checkout, not `subscription_id`
- Payments on orders may need **programmatic capture** (vs auto-capture on subscriptions)

---

## 12. Credit System — Monthly Reset

### Two-Layer Reset Mechanism

#### Layer 1: Webhook Reset (Monthly Plans)

**File:** `src/app/api/razorpay/webhook/route.ts:170-192`

When Razorpay fires `subscription.charged` (every billing cycle):

```
monthlyCredits = monthlyCreditsAllowance (e.g., back to 200)
creditsLastResetMonth = current billing-period key
```

#### Layer 2: Lazy Reset (Yearly Plans + Safety Net)

**File:** `src/lib/ai/capacityCheck.ts:160-195`

Before every paid AI call in `checkAICapacity()`:

```
currentBillingPeriod = getBillingPeriodKey(subscription.cycleStartDate)
if creditsLastResetMonth !== currentBillingPeriod:
    monthlyCredits = monthlyCreditsAllowance
    creditsLastResetMonth = currentBillingPeriod
    → write to Firestore (1 write, first AI call of billing month only)
```

#### Billing Period Key — Anchor Day Logic

**File:** `src/lib/ai/capacityCheck.ts:167-195` → `getBillingPeriodKey()`

```
Sub starts Feb 15 → anchorDay = 15
  Mar 1  (day 1 < 15)  → period key 202602 (still Feb's billing period — NO reset)
  Mar 15 (day 15 ≥ 15) → period key 202603 (new billing period — reset triggers)

Month-end edge case: anchorDay=31, February (28 days)
  anchorDay capped to min(31, 28) = 28
  Feb 28 triggers reset correctly.
  Without cap, credits would never reset in shorter months.
```

#### Why Both Layers?

- **Monthly plans:** Webhook handles reset reliably when Razorpay charges
- **Yearly plans:** No monthly webhook — lazy reset fills this gap
- **Safety net:** If webhook fails/delays, lazy reset catches it on next AI call
- **Race-safe:** Concurrent calls both reset to the same idempotent value

---

## 13. Grace Period & Past Due Handling

### Backend Logic

**File:** `src/database/subscriptions/index.ts:62-89`

When `getActiveSubscriptionForStore()` finds a subscription with `pastDueSinceAt`:

```
1. Calculate grace period: pastDueSinceAt + 7 days
2. If within grace period → return subscription (access granted)
3. If outside grace period:
   → Auto-expire subscription:
     status = "expired"
     cycleEndDate = now
     subscriptionEndDate = now
     Append "expired" status entry
   → Return null (no active subscription)
```

### Utility Function

**File:** `src/utils/razorpay.ts:4-32` → `getGracePeriodInfo()`

```typescript
getGracePeriodInfo(pastDueTimestamp, graceDays = 7)
→ Returns: { remainingDays, graceEndsDate, graceEndsTimestamp }
```

### Frontend Display

**File:** `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:155-161`

When `past_due`:

- Tag shows "Payment Failed" (warning color)
- Grace period countdown: "X days left"
- Warning message: "Your last payment attempt failed..."
- Action buttons: "Cancel Subscription" + "Retry Payment" (links to Razorpay short_url)
- Webhook status remarks use fixed local text such as "Payment failed" or "Payment retry pending"; raw Razorpay `error_description` / `error_reason` values stay out of subscription history and platform alert messages.

---

## 14. Frontend — Owner Billing Dashboard

**File:** `src/components/templates/main-app/billing/index.tsx`

### Page Structure

```
BillingPage
├── Loading state (Spin + Alert)
├── ActiveSubscriptionCard (if subscription exists)
│   ├── Plan details (name, price, cycle dates)
│   ├── Status tag (Active/Cancelled/Past Due/Expired)
│   ├── Payment method display (Card brand/last4 or UPI VPA)
│   ├── Action buttons (context-dependent):
│   │   ├── Active: "Cancel" + "Upgrade Plan" (if not premium)
│   │   ├── Active (final cycle): "Change Plan"
│   │   ├── Cancelled/Expired: "Choose a New Plan"
│   │   └── Past Due: "Cancel" + "Retry Payment"
│   └── Credit Card (right column):
│       ├── Total Available Credits (monthlyCredits + topUpCredits)
│       ├── Monthly Credits progress bar (monthlyCredits / allowance)
│       ├── Top-up Credits count
│       └── "View Usage" + "Buy More Credits" buttons
├── BillingHistory (lazy-loaded table)
├── PricingPlansModal (upgrade/new plan selection)
├── UpgradeSubscriptionPayementSuccessModal (confetti)
├── CreditsPackModal (AI Enhancement Pack purchase)
└── NoSubscriptionView (if no subscription — "View Plans" CTA)
```

### Smart Button Logic

**File:** `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx:76-107`

```
isFinalCycle = |renewsOn - subscriptionEndDate| <= 86400 (within 1 day)

Active + not final cycle → "Cancel" + "Upgrade" (if not premium)
Active + final cycle → "Change Plan" (subscription ends, need new one)
Cancelled/Expired → "Choose a New Plan"
Past Due + not final cycle → "Cancel" + "Retry Payment"
```

### Plan Filtering on Upgrade

**File:** `src/components/templates/main-app/billing/PricingPlansModal.tsx:212-223`

```
If upgrading from Starter → show Pro + Premium only
If upgrading from Pro → show Premium only
If new subscription → show all plans
```

### Currency Auto-Detection

**File:** `src/components/templates/main-app/billing/PricingPlansModal.tsx:226-229`

```typescript
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (userTimeZone === "Asia/Kolkata" || userTimeZone === "Asia/Calcutta") {
  setCurrency("INR");
}
```

---

## 15. Frontend — Website Subscription Management

**File:** `src/components/templates/website/platformSite/landingPage/pricing/SubscriptionManagement.tsx`

A separate subscription management page on the public website (shadcn/ui components instead of Ant Design). Shows:

- Current Plan card: name, price, billing cycle, status, payment method
- AI Credits card: monthly credits progress, top-up credits, total
- Navigation buttons: Dashboard, Transactions, Billing History
- Credit Packs CTA section
- Grace period info for past_due subscriptions

---

## 16. Security Implementation

### Authentication

All protected routes use `withAuth()` middleware:

| Route                                 | Auth Method           |
| ------------------------------------- | --------------------- |
| `/api/onboarding/create-subscription` | `withAuth()`          |
| `/api/razorpay/create-subscription`   | `withAuth()`          |
| `/api/razorpay/verify-subscription`   | `withAuth()`          |
| `/api/razorpay/upgrade-subscription`  | `withAuth()`          |
| `/api/razorpay/cancel-subscription`   | `withAuth()`          |
| `/api/razorpay/create-topup-order`    | `withAuth()`          |
| `/api/razorpay/verify-topup`          | `withAuth()`          |
| `/api/razorpay/webhook`               | HMAC-SHA256 signature |

### Tenant Isolation

Every protected route verifies `verifyTenantAccess(session, tenantId, storeId, request)`:

- Verify subscription belongs to the user's tenant/store
- Log security events on mismatch with `logger.security()` at CRITICAL level using bounded identifier presence/length metadata from `getBoundedRazorpaySecurityContext()` and `getBoundedRazorpayStringContext()`
- MenuList billing mutations also require `canManageBillingMutation()` to confirm the session store still belongs to the session tenant and is not inactive, soft-deleted, or platform-blocked before provider or Firestore mutation work continues.

### Input Validation

- 8KB bounded JSON body cap before Zod validation on authenticated Razorpay payment action routes.
- 16KB bounded JSON body cap before onboarding subscription validation and tenant/store creation.
- `VerifyPaymentRequestSchema` (Zod) on verify-subscription and `VerifyTopupRequestSchema` on verify-topup.
- `OnboardingSubscriptionSchema` (Zod) on onboarding.
- Subscription create, upgrade, cancel, pause, resume, and top-up create routes validate through the shared billing API schemas.

### Rate Limiting

| Route               | Config Key             |
| ------------------- | ---------------------- |
| Onboarding          | `PAYMENT_ONBOARDING`   |
| Create subscription | `PAYMENT_SUBSCRIPTION` |
| Create topup        | `PAYMENT_TOPUP`        |
| Cancel/upgrade/pause/resume | `SUBSCRIPTION_MUTATION` |

Provider keys keep the route/product bucket names but hash authenticated user and tenant key material before calling the shared limiter. Raw user IDs and tenant IDs must not be stored in Razorpay or onboarding subscription rate-limit provider keys.

Onboarding subscription security events use `getBoundedSecurityRouteContext(session, request)` for user/request route metadata and the bounded Razorpay/onboarding helpers for business, tenant, store, plan, and subscription fields. Raw `buildSecurityContext()` output must not be spread into onboarding subscription security logs.

### Webhook Security

**File:** `src/lib/razorpay/webhook-validator.ts`

- HMAC-SHA256 signature verification
- `crypto.timingSafeEqual()` — prevents timing attacks
- Secure logging via `secureLog()`/`secureError()` (no sensitive data in logs)

---

## 17. Database Access Layer (DAL)

**File:** `src/database/subscriptions/index.ts`

### Functions

| Function                                           | Purpose                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `getActiveSubscriptionForStore(tenantId, storeId)` | Query active/past_due/cancelled subscriptions where cycleEndDate >= now. Includes 7-day grace period enforcement. |
| `createInitialSubscription(providerSubId, data)`   | Create subscription doc with Razorpay sub ID as Firestore doc ID                                                  |
| `updateSubscription(subId, data)`                  | Merge-update subscription doc                                                                                     |
| `getSubscriptionById(id)`                          | Fetch single subscription by ID                                                                                   |

### Active Subscription Query

**File:** `src/database/subscriptions/index.ts:28-93`

```typescript
const q = query(
  getCollectionRef(),
  where("status", "in", ["active", "past_due", "cancelled"]),
  where("cycleEndDate", ">=", now),
  where("tenantId", "==", tenantId),
  where("storeId", "==", storeId),
  limit(1),
);
```

Note: `cancelled` subscriptions are included because the user still has access until `cycleEndDate`. The grace period check on `past_due` happens after the query.

### Patterns

- All functions wrapped in `apiCallComposer()` (error handling)
- All writes use `requestBodyComposer()` (adds tId, sId, uId, timestamps)
- Collection name from `DB_COLLECTIONS.SUBSCRIPTIONS`
- `setDoc(docRef, data, { merge: true })` for updates

---

## 18. Billing History & Transaction Logging

### Payment Transactions (Webhook Log)

**File:** `src/database/subscriptions/paymentTransactions.ts`

**Collection:** `paymentTransactions` (via `DB_COLLECTIONS.PAYMENT_TRANSACTIONS`)

Every webhook event is stored as a document. Used for:

- Audit trail of all Razorpay events
- Billing history display in the frontend

**May 20, 2026 hardening:** New webhook rows use `auditVersion: 2` and store only the fields needed for audit and billing history (`event`, tenant/store ids, payment/subscription/order ids, amount, currency, status, invoice id/url, subscription cycle, quantity, and top-up pack metadata). Raw provider payloads are not stored for new rows. Desktop and mobile billing history still fall back to legacy raw rows.

Pending subscriptions can be cancelled before authentication/activation. This is expected for abandoned hosted checkout or cleanup flows, so the shared state machine allows `pending -> cancelled`.

### Billing History Query

**File:** `src/database/subscriptions/paymentTransactions.ts:29-54`

```typescript
const q = query(
  getCollectionRef(),
  where("tenantId", "==", tenantId),
  where("storeId", "==", storeId),
  where("event", "in", ["subscription.charged", "order.paid"]),
  orderBy("created_at", "desc"),
);
```

### Frontend Billing History

**File:** `src/components/templates/main-app/billing/index.tsx:53-101` → `fetchBillingHistory()`

Transforms raw webhook events into display format:

| Event Type                 | Display Type           | Extra Info                       |
| -------------------------- | ---------------------- | -------------------------------- |
| `subscription.charged`     | "Subscription Payment" | Billing cycle dates, invoice URL |
| `order.paid` (with packId) | "Credit Pack Purchase" | Pack name, credits received      |

**File:** `src/components/templates/main-app/billing/BillingHistory.tsx` — Table with:

- Date, Type, Description, Amount, Billing Cycle, Credits, Status, Invoice link

---

## 19. Utility Functions

### getGracePeriodInfo()

**File:** `src/utils/razorpay.ts:4-32`

```
Input: pastDueTimestamp, graceDays (default 7)
Output: { remainingDays, graceEndsDate, graceEndsTimestamp }
```

### calculateRemainingCredits()

**File:** `src/utils/razorpay.ts:34-74`

```
Input: activeSubscription (FirestoreSubscriptionDoc)
Output: { unusedThisMonth, monthsRemaining, monthlyCreditsAllowance, totalRemainingCredits }

Monthly: totalRemainingCredits = monthlyCredits + topUpCredits
Yearly: totalRemainingCredits = unusedThisMonth + (monthsRemaining - 1) * allowance + topUpCredits
```

Used in:

- `RemainingCreditNote.tsx` — shows carry-forward on upgrade
- `usePaymentHandler.ts` — calculates carry-forward for upgrade flow

### getOrCreateRazorpayPlan()

**File:** `src/lib/razorpay/plan-handler.ts:57-130`

Deduplicates Razorpay plans using a lookup key in `notes`. Prevents creating duplicate plans for the same price/currency/interval combination. Diagnostics are bounded through `getRazorpayPlanLogContext()` and `razorpay_plan_lookup_or_create_failed`; callers receive fixed local failure text instead of provider messages.

### getBillingPeriodKey()

**File:** `src/lib/ai/capacityCheck.ts:167-195`

Calculates billing-cycle-aware YYYYMM key from subscription's `cycleStartDate`. Uses anchor day (day subscription started) instead of calendar month to determine period boundaries. Handles month-end edge cases by capping anchor to days in current month.

---

## 20. Environment Variables

| Variable                      | Purpose                         | Used In                                 |
| ----------------------------- | ------------------------------- | --------------------------------------- |
| `RAZORPAY_KEY_ID`             | Server-side API key             | `src/lib/razorpay/razorpay.ts`          |
| `RAZORPAY_KEY_SECRET`         | Server-side API secret          | `src/lib/razorpay/razorpay.ts`          |
| `RAZORPAY_WEBHOOK_SECRET`     | Webhook signature verification  | `src/app/api/razorpay/webhook/route.ts` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client-side key for Checkout.js | `src/hooks/usePaymentHandler.ts`        |

---

## 21. Key Architecture Decisions

1. **Razorpay-only:** Stripe fully removed (Feb 2026). Single payment provider reduces complexity.
2. **Per-store subscriptions:** Each store has its own subscription, credit balance, and billing cycle. Not per-tenant.
3. **Razorpay sub ID = Firestore doc ID:** The `providerSubscriptionId` is used as the Firestore document ID. This creates a 1:1 mapping and simplifies lookups.
4. **Credits carry forward on upgrade:** Remaining credits (monthly + topUp + future months for yearly) are calculated and added as `topUpCredits` on the new subscription.
5. **Two-layer credit reset:** Webhook (monthly plans) + lazy reset in `checkAICapacity()` (yearly plans + safety net). Both are idempotent.
6. **Billing-period-aware reset:** Uses subscription anchor day, not calendar month. Prevents premature resets for mid-month subscriptions.
7. **7-day grace period:** Enforced in DAL (`getActiveSubscriptionForStore`), not in a Cloud Function. Auto-expires on next query after grace period.
8. **Optimistic verification:** `verify-subscription` activates the subscription immediately after payment, without waiting for the webhook. Both webhook and verify converge to the same state.
9. **Top-ups use Orders, not Subscriptions:** AI Enhancement Packs use Razorpay Orders API (one-time) with programmatic capture. Credits are added to `topUpCredits` which never reset.
10. **Transaction logging:** Every webhook event is stored in `paymentTransactions` collection. Serves as audit trail and billing history source.
11. **Plan deduplication:** `getOrCreateRazorpayPlan()` uses a lookup key to avoid creating duplicate plans on Razorpay.
12. **Immediate cancellation:** Cancellations are immediate on Razorpay (not end-of-cycle). User retains access until `cycleEndDate` via our Firestore query logic.

---

## 22. Changes, Fixes & Improvements Log

### May 20, 2026 — Production Audit Hardening

- **Webhook replay protection:** Added `razorpayWebhookEvents` server-only idempotency locks. Duplicate signed events now return without repeating payment transaction writes or subscription mutations.
- **State transitions now block invalid writes:** API routes, DAL grace expiry, webhook handlers, and reconciliation only write status changes when `subscriptionStateMachine.ts` allows the transition.
- **State-machine diagnostics bounded:** App-side transition validation and the active Functions reconciliation mirror now log invalid/unknown transition warnings with fixed text plus bounded status/context presence metadata only.
- **Payment mutation lookup tightened:** Cancel, pause, and resume no longer use master/outlet fallback when no subscription ID is provided; they fetch only the current store's direct subscription.
- **Mutation validation tightened:** Verify-subscription now requires `razorpay_subscription_id`; cancel, pause, resume, and upgrade use Zod schemas and return controlled 400/404/409 responses instead of leaking internal errors.
- **Reconciliation diagnostics bounded:** The active Firebase Functions reconciler logs stable reconciliation failure codes with bounded subscription/provider metadata, update counts/booleans, and no raw sync detail rows in local dev logs. The deprecated `/api/internal/reconcile-subscriptions` fallback route has been removed.
- **Client mutation errors fixed:** Dashboard cancel and upgrade promises now stop after failed responses instead of rejecting and then resolving.
- **Rate limiter outage behavior improved:** Upstash provider calls now have a short timeout and temporary bypass window so a Redis outage does not stall billing actions.

### Feb 10, 2026 — Monthly Credit Reset Bug Fix

**Problem:** `monthlyCredits` was set at subscription creation but NEVER reset on renewal. Monthly subscribers kept depleted balances after paying again. Yearly subscribers had no monthly reset at all.

**Root Cause:** Missing reset logic in both webhook handler and capacity check.

**Fix:** Two-layer reset mechanism:

- **Layer 1 (Webhook):** Reset `monthlyCredits` to `monthlyCreditsAllowance` on `subscription.charged` event
- **Layer 2 (Lazy):** Reset in `checkAICapacity()` using `creditsLastResetMonth` field comparison

**Files Changed:**

| File                                                        | Change                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/types/razorpay.ts`                                     | Added `creditsLastResetMonth?: number` to `FirestoreSubscriptionDoc` |
| `src/app/api/razorpay/webhook/route.ts:170-192`             | Reset monthlyCredits + set creditsLastResetMonth on charge           |
| `src/app/api/razorpay/verify-subscription/route.ts:162-170` | Set creditsLastResetMonth on first verification                      |
| `src/app/api/razorpay/create-subscription/route.ts:180`     | Initialize creditsLastResetMonth on creation                         |
| `src/app/api/onboarding/create-subscription/route.ts:295`   | Initialize creditsLastResetMonth on onboarding                       |
| `src/lib/ai/capacityCheck.ts:160-195`                       | Lazy reset logic with getBillingPeriodKey()                          |

### Feb 10, 2026 — Calendar Month → Billing Period Key

**Problem:** Initial `creditsLastResetMonth` used calendar month YYYYMM (e.g., 202602 = February). A subscription starting Feb 15 would get a premature reset on March 1 (new calendar month, but still in same billing period).

**Fix:** Changed to billing-cycle-aware period key based on subscription's anchor day. `getBillingPeriodKey(cycleStartDate)` uses the day-of-month from the subscription start date as the anchor.

### Feb 10, 2026 — Month-End Edge Case Fix

**Problem:** If a user subscribes on Jan 31 (anchorDay=31), February has only 28 days. The check `now.getDate() < anchorDay` would always be true (no day in Feb is ≥ 31), causing credits to never reset.

**Fix:** Cap `anchorDay` to `Math.min(rawAnchorDay, daysInCurrentMonth)`. Applied in:

- `src/lib/ai/capacityCheck.ts:182` (lazy reset)
- `src/app/api/razorpay/webhook/route.ts:177` (webhook reset)
- `src/app/api/razorpay/verify-subscription/route.ts:167` (verification)

### Feb 2026 — Stripe Removal

**What:** All Stripe-related code, types, API routes, and UI components removed. Razorpay is now the sole payment provider.

**Files Removed:**

| Deleted File                                       | Razorpay Equivalent                          |
| -------------------------------------------------- | -------------------------------------------- |
| `billingStripe/NoSubscriptionView.tsx`             | `billing/NoSubscriptionView.tsx`             |
| `billingStripe/PlanDetails.tsx`                    | `billing/PricingPlansModal.tsx`              |
| `billingStripe/SubscribeButton.tsx`                | `hooks/usePaymentHandler.ts`                 |
| `billingStripe/ManageSubscription.tsx`             | `billing/ActiveSubscriptionCard.tsx`         |
| `billingStripe/type.ts`                            | `data/common.ts`                             |
| `api/subscriptions/cancel/route.ts`                | `api/razorpay/cancel-subscription/route.ts`  |
| `api/subscriptions/create-payment-intent/route.ts` | `api/razorpay/create-subscription/route.ts`  |
| `api/subscriptions/update/route.ts`                | `api/razorpay/upgrade-subscription/route.ts` |
| `api/subscriptions/verify-session/route.ts`        | `api/razorpay/verify-subscription/route.ts`  |
| `api/webhook/route.ts` (Stripe)                    | `api/razorpay/webhook/route.ts`              |
| `lib/stripe.ts`                                    | `lib/razorpay/razorpay.ts`                   |
| `database/subscriptions/stripe.ts`                 | `database/subscriptions/index.ts`            |

No features were lost in the migration.

---

## 23. Razorpay Official Docs Audit (Feb 10, 2026)

> **Source:** Deep cross-reference of our codebase against official Razorpay documentation (razorpay.com/docs). All subscription API endpoints, webhook events, lifecycle states, payment retries, international payments, and SaaS patterns reviewed.

### 23.1 Subscription Lifecycle States — Our Coverage

Razorpay defines **9 subscription states**. Here's what we handle vs what we don't:

| Razorpay State     | Webhook Event                | Our Handling                                                                                                                                                                                 | Status             |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `created`          | —                            | Set when `createInitialSubscription()` writes `status: "pending"`                                                                                                                            | ✅ Handled         |
| `authenticated`    | `subscription.authenticated` | NOT explicitly handled — falls to `default` case in webhook. OK because subscription progresses to `active` next.                                                                            | ⚠️ Logged only     |
| `active`           | `subscription.activated`     | Full handling: status → "active", billing dates set, credits reset, payment method stored                                                                                                    | ✅ Handled         |
| `active` (renewal) | `subscription.charged`       | Full handling: same as activated — credits reset, cycle dates updated                                                                                                                        | ✅ Handled         |
| `pending`          | `subscription.pending`       | ✅ Handled (Feb 11, 2026): sets `past_due` + `pastDueSinceAt`, supports both payment-entity and subscription-entity paths                                                                    | ✅ Handled         |
| `halted`           | `subscription.halted`        | Handled: status → "past_due", `pastDueSinceAt` recorded                                                                                                                                      | ✅ Handled         |
| `cancelled`        | `subscription.cancelled`     | Logged only — DB update done in `cancel-subscription` route directly                                                                                                                         | ✅ Handled         |
| `completed`        | `subscription.completed`     | Handled: status → "completed", `subscriptionEndDate` updated                                                                                                                                 | ✅ Handled         |
| `paused`           | `subscription.paused`        | ✅ Handled (Feb 11, 2026): sets `status: "paused"`, records in statuses array. New API route + frontend UI.                                                                                  | ✅ Handled         |
| `resumed`          | `subscription.resumed`       | ✅ Handled (Feb 11, 2026): sets `status: "active"`, records in statuses array. New API route + frontend UI.                                                                                  | ✅ Handled         |
| `expired`          | —                            | Not a Razorpay webhook event. Razorpay expires subscriptions when `start_at` time passes without authentication. Our internal "expired" status is used for upgrades and grace period expiry. | ✅ Different usage |

### 23.2 Critical Findings

#### Finding #1: `subscription.pending` Not Explicitly Handled ⚠️

**Razorpay docs say:** When auto-charge fails, subscription moves to `pending`. Razorpay retries automatically (for cards). If ALL retries fail → `halted`.

**Our code:** The `pending` event falls to the `default` case in `webhook/route.ts:240-246`. It's logged as an unhandled event but no status update occurs.

**Risk level:** LOW. The `payment.failed` event (which fires alongside `pending`) IS handled and sets `past_due`. Also, the eventual `subscription.halted` event sets `past_due` too. However, the subscription entity status from Razorpay says "pending" while our Firestore doc may still say "active" until `halted` fires.

**Recommendation:** Add explicit `subscription.pending` handling that sets `status: "past_due"` and records `pastDueSinceAt`. This makes our state more immediately accurate.

```
Priority: P1 (correctness improvement)
Impact: Low risk because halted catches it eventually
Effort: ~10 lines of code
Status: ✅ DONE (Feb 11, 2026) — Added to webhook switch with dual-path handling
```

#### Finding #2: Cancellation Uses Immediate Cancel, Not `cancel_at_cycle_end` ⚠️

**Razorpay docs say:** Cancel API supports `cancel_at_cycle_end: true` — subscription stays `active` until billing cycle ends, then moves to `cancelled`.

**Our code:** `cancel-subscription/route.ts:80` calls `razorpayClient.subscriptions.cancel()` WITHOUT `cancel_at_cycle_end` parameter (defaults to `false` = immediate cancel).

**What we do instead:** We cancel immediately on Razorpay's side but preserve `cycleEndDate` in Firestore so user retains access until end of paid period. The `getActiveSubscriptionForStore()` query includes `cancelled` status with `cycleEndDate >= now`.

**Assessment:** This is a **valid design choice**, not a bug. Using `cancel_at_cycle_end: true` would keep Razorpay billing active until cycle end (which we DON'T want — we want to stop all future charges immediately). Our approach is correct: cancel on Razorpay immediately, grant access locally until paid period ends.

**Confirmation:** ✅ Correct as-is. No change needed.

#### Finding #3: Upgrade Uses Cancel + New Sub, Not Razorpay's Update API

**Razorpay docs say:** You can update a subscription's plan using the Update Subscription API with `schedule_change_at: "now"` or `"cycle_end"`. Razorpay handles prorated charges/refunds automatically.

**Our code:** `upgrade-subscription/route.ts` cancels the old subscription, creates a new one, and carries forward credits manually.

**Assessment:** Our approach is **intentionally different** and correct for our use case:

- Razorpay's Update API changes the plan in-place (same `sub_id`). This means we'd need to handle prorated invoice events, credit note refunds, and billing cycle changes.
- Our cancel-and-create approach gives us full control: clean credit carry-forward, new subscription doc, no prorated charge complexity, supports monthly↔yearly frequency changes.
- Razorpay's Update API has a limitation: "If plans have different billing cycles, the new plan is billed at the new interval, starting on the day of the change" — which is exactly what we want, but our approach gives us more predictability.

**Confirmation:** ✅ Correct design choice. More control, simpler mental model.

#### Finding #4: `payment.failed` Handler Assumes `subscription_id` Exists

**Our code:** `webhook/route.ts:128-153` — The `payment.failed` case accesses `paymentEntity.subscription_id`. For subscription payments this works. But `payment.failed` can also fire for:

- Failed top-up order payments (which don't have `subscription_id`)
- Failed standalone payments

**Current protection:** Line 131 checks `if (paymentEntity.subscription_id)` before proceeding. This is correct.

**Assessment:** ✅ Already guarded correctly.

#### Finding #5: Webhook Signature Validation — Raw Body ✅

**Razorpay docs explicitly warn:** "Ensure that the webhook body is passed as an argument in the raw webhook request body. Do not parse or cast the webhook request body."

**Our code:** `webhook/route.ts:78` correctly uses `await request.text()` (raw body) for signature validation, then `JSON.parse(requestBody)` separately.

**Confirmation:** ✅ Correct implementation per Razorpay's explicit warning.

#### Finding #6: `total_count` Updated for Auto-Renewal ✅

**Razorpay docs say:** `total_count` = number of billing cycles. For yearly plan billed yearly, `total_count: 1` means one charge (1 year).

**Previous code:** `totalCount = 1` for yearly, `totalCount = 24` for monthly.

**Updated code (Feb 11, 2026):** `totalCount = 3` for yearly (3-year auto-renewal), `totalCount = 36` for monthly (3-year auto-renewal). Updated in both `create-subscription/route.ts` and `onboarding/create-subscription/route.ts`.

**Rationale:** Yearly subscriptions with `total_count: 1` moved to `completed` after first charge, forcing manual renewal. Now with `total_count: 3`, Razorpay auto-charges yearly for up to 3 years. Monthly subscriptions extended from 24 to 36 cycles (3 years). Users who want to stop renewing can cancel anytime.

**Confirmation:** ✅ Updated. Both subscription creation routes now consistent at 3-year total_count.

#### Finding #7: `lastWebhook` Field — Now Updated ✅

**Previous state:** `FirestoreSubscriptionDoc` had `lastWebhook` field but no webhook code updated it.

**Fixed (Feb 11, 2026):** Added `lastWebhook: { event: event.event, timestamp: Timestamp.now() }` to ALL webhook update payloads:

- `payment.failed` / `subscription.halted` / `subscription.pending` case
- `subscription.activated` / `subscription.charged` case
- `subscription.completed` case
- `subscription.cancelled` case (lastWebhook only, DB update done in cancel route)
- `subscription.paused` case (new)
- `subscription.resumed` case (new)

**Status:** ✅ DONE

### 23.3 Payment Retries & Dunning — Our Handling

**Razorpay's retry model (cards):**

1. Auto-charge fails → `subscription.pending` webhook
2. Razorpay retries automatically (next day for cards)
3. If retry succeeds → `subscription.charged` → back to `active`
4. If all retries fail → `subscription.halted` → no more auto-charges
5. Customer can change card → if successful charge → back to `active`
6. When moving from `halted` to `active`, previous unpaid invoices are NOT re-attempted

**Our handling:**

- `payment.failed` → status: "past_due" + `pastDueSinceAt` recorded ✅
- `subscription.halted` → status: "past_due" ✅
- 7-day grace period → auto-expire in `getActiveSubscriptionForStore()` ✅
- Frontend shows "Retry Payment" button linking to Razorpay `short_url` ✅
- `subscription.charged` (after successful retry) → resets to "active" ✅

**Gap identified:**

- Razorpay distinguishes `pending` (retrying) from `halted` (retries exhausted). We map both to `past_due`. This is acceptable for our use case — the user sees the same UX either way.
- We don't use Razorpay's "Change Card" flow (customer-facing link in Razorpay emails). Instead, we link to `short_url`. Per Razorpay docs, the email sent to customers already contains a link to change card details. ✅ OK — Razorpay handles customer communication when `customer_notify: true`.

**Our `customer_notify` setting:** We don't pass `customer_notify` in subscription creation, which **defaults to `true`** per Razorpay docs. This means Razorpay sends:

- Email on subscription start
- Email on successful charge
- Email on payment failure (with card change link)
- Email when subscription moves to halted

**Confirmation:** ✅ Correct. Razorpay handles dunning emails automatically.

### 23.4 India vs International — Currency & Payment Handling

**Razorpay docs say:**

- Supports 135+ currencies for international payments
- Amount must be in smallest currency unit (paise for INR, cents for USD)
- Currency parameter must match at order/subscription creation
- International payments require separate activation on Razorpay Dashboard
- Settlements for international payments happen in INR (for Indian businesses)

**Our implementation:**

| Check                       | Status | Evidence                                                                          |
| --------------------------- | ------ | --------------------------------------------------------------------------------- |
| Currency in plan creation   | ✅     | `plan-handler.ts:48` — `currency: currency` passed to Razorpay plan creation      |
| Amount in smallest unit     | ✅     | `PlatformPlansList.ts` stores amounts in paise/cents (e.g., 149900 = ₹1,499)      |
| Currency auto-detection     | ✅     | `PricingPlansModal.tsx:226-229` — timezone-based: Asia/Kolkata → INR, else USD    |
| Separate plans per currency | ✅     | `plan-handler.ts:23` — lookup key includes currency: `"B2C_PRO_MONTH_INR_149900"` |
| Top-up currency support     | ✅     | `create-topup-order/route.ts:102` — currency passed to `orders.create()`          |
| Zod validation for currency | ✅     | `apiSchemas.ts:148` — `z.enum(['INR', 'USD'])`                                    |

**Gap identified:**

- **Timezone-based currency detection** could be inaccurate. An Indian user traveling abroad would get USD pricing. A US-based Indian would get USD pricing. This is acceptable at launch but could be improved with IP-based geolocation or explicit user preference.
- **No currency switching UI** — once set, users can't change currency. This is fine because subscriptions are locked to a currency on Razorpay's side.

**Razorpay international activation requirement:**

- International payments must be enabled on the Razorpay Dashboard
- Requires additional KYC for Indian businesses accepting international payments
- **Action item:** Ensure international payments are activated before launching USD pricing

### 23.5 Date Handling — Detailed Verification

**Razorpay provides these timestamps (Unix seconds):**

- `current_start` — start of current billing cycle
- `current_end` — end of current billing cycle
- `charge_at` — when next charge will occur
- `start_at` — when subscription first started
- `ended_at` — when subscription was cancelled/completed
- `created_at` — when subscription was created

**Our mapping:**

| Razorpay Field  | Our Firestore Field                   | Conversion                                            | Status |
| --------------- | ------------------------------------- | ----------------------------------------------------- | ------ |
| `current_start` | `cycleStartDate`                      | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| `current_end`   | `cycleEndDate`                        | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| `charge_at`     | `renewsOn`                            | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| `start_at`      | `subscriptionStartDate`               | `Timestamp.fromMillis(x * 1000)`                      | ✅     |
| Calculated      | `subscriptionEndDate`                 | `start_at + total_count * interval`                   | ✅     |
| `ended_at`      | `subscriptionEndDate` (on completion) | `Timestamp.fromMillis(x * 1000)` or `Timestamp.now()` | ✅     |

**Subscription end date calculation — verified:**

- `getSubscriptionEndDate()` in both `webhook/route.ts:22-37` and `verify-subscription/route.ts:23-38`
- For YEAR: `startDate.setFullYear(startDate.getFullYear() + total_count)`
- For MONTH: `startDate.setMonth(startDate.getMonth() + total_count)`
- This correctly uses JavaScript's `Date` rollover handling (e.g., adding 1 month to Jan 31 = Mar 3, which matches Razorpay's billing behavior)

**Edge case consideration:** JavaScript's `setMonth()` can overflow. Jan 31 + 1 month = March 3 (not Feb 28). Razorpay handles month-end differently (may use Feb 28). For `total_count: 24` (monthly plans), the end date is approximate — but we also update `cycleEndDate` from Razorpay's actual values on each webhook, so the authoritative dates stay accurate.

### 23.6 SaaS Patterns Comparison — What Others Do

| SaaS Pattern                | Razorpay Support                     | Our Status                                               | Priority         |
| --------------------------- | ------------------------------------ | -------------------------------------------------------- | ---------------- |
| **Auto-retry on failure**   | ✅ Built-in (cards)                  | ✅ Razorpay handles                                      | N/A              |
| **Dunning emails**          | ✅ `customer_notify: true`           | ✅ Default behavior                                      | N/A              |
| **Grace period**            | ❌ Not built-in                      | ✅ 7-day grace in our DAL                                | N/A              |
| **Cancel at cycle end**     | ✅ `cancel_at_cycle_end`             | ⚠️ We do immediate cancel + local access until cycle end | OK               |
| **Pause/Resume**            | ✅ Pause/Resume API                  | Implemented but self-service disabled by `ENABLE_SUBSCRIPTION_PAUSE=false` (May 21, 2026) | Disabled by policy |
| **Plan upgrade (prorated)** | ✅ Update Subscription API           | ⚠️ We use cancel + new sub                               | OK (by design)   |
| **Plan downgrade**          | ✅ Update Subscription API           | ✅ Implemented (Feb 11, 2026) — same cancel+new flow     | Done             |
| **Invoice download**        | ✅ Razorpay generates invoices       | ✅ Fixed (Feb 11, 2026) — button condition corrected     | Done             |
| **Card change flow**        | ✅ Customer email link               | ✅ Razorpay emails contain link                          | N/A              |
| **Webhook idempotency**     | Recommended                          | ✅ billingHistory dedup added (Feb 11, 2026)             | Done             |
| **Trial period**            | ✅ Supported                         | ❌ Not used                                              | N/A (not needed) |
| **Addons (extra charges)**  | ✅ Supported                         | ❌ Not used                                              | N/A              |
| **Scheduled plan changes**  | ✅ `schedule_change_at: "cycle_end"` | ❌ Not used                                              | P3               |

#### Finding #8: Webhook Idempotency — billingHistory Guard Added ✅

**Razorpay docs:** Webhooks can be retried if your endpoint returns non-2xx. The same event may arrive multiple times.

**Fixed (Feb 11, 2026):** Added idempotency guard for `billingHistory` array in the `subscription.activated`/`subscription.charged` handler:

```typescript
const updatedBillingHistory = internalSub.billingHistory.includes(
  paymentEntity.id,
)
  ? internalSub.billingHistory
  : [...internalSub.billingHistory, paymentEntity.id];
```

The `statuses` array still appends on each webhook (acceptable — it's an audit log, duplicate entries are informational). The core operations (credit reset, date updates) remain naturally idempotent.

**Status:** ✅ DONE (billingHistory dedup). Statuses array left as append-only audit log.

### 23.7 Razorpay Subscription Entity Fields We Don't Use

These fields exist in Razorpay webhook payloads but we don't store/use them:

| Razorpay Field          | What It Is                 | Should We Use It?                        |
| ----------------------- | -------------------------- | ---------------------------------------- |
| `remaining_count`       | Billing cycles remaining   | Could display to user. Low priority.     |
| `auth_attempts`         | Card auth attempts         | Useful for debugging. Low priority.      |
| `has_scheduled_changes` | Pending plan changes       | We don't use Razorpay's update API. N/A. |
| `offer_id`              | Linked offer/discount      | Not using offers yet. N/A.               |
| `pause_initiated_by`    | Who paused (self/customer) | Webhook-compatible only. Owner self-service pause is disabled by policy. |
| `cancel_initiated_by`   | Who cancelled              | Could be useful for analytics. P3.       |

### 23.8 Summary — Action Items

| #   | Finding                                           | Priority | Effort            | Status                                   |
| --- | ------------------------------------------------- | -------- | ----------------- | ---------------------------------------- |
| 1   | Handle `subscription.pending` webhook explicitly  | P1       | ~10 lines         | ✅ DONE (Feb 11, 2026)                   |
| 2   | Update `lastWebhook` field in webhook handler     | P2       | ~5 lines per case | ✅ DONE (Feb 11, 2026)                   |
| 3   | Webhook idempotency — check duplicate payment IDs | P2       | ~15 lines         | ✅ DONE (Feb 11, 2026)                   |
| 4   | Invoice download button in billing history UI     | P2       | ~20 lines         | ✅ DONE (Feb 11, 2026)                   |
| 5   | Pause/Resume subscription flow                    | P2       | ~200 lines        | Disabled by default (May 21, 2026); API/UI gated behind `ENABLE_SUBSCRIPTION_PAUSE=false` |
| 6   | Plan downgrade flow                               | P1       | ~300 lines        | ✅ DONE (Feb 11, 2026)                   |
| 7   | Ensure Razorpay international payments enabled    | P0       | Dashboard config  | 📋 Checklist added (see §23.10)          |
| 8   | Consider yearly `total_count: 3` for auto-renewal | P2       | 1 line change     | ✅ DONE (Feb 11, 2026) — changed to 3/36 |

### 23.9 Verification Checklist — Everything Correct

| Area                              | Verified Against                             | Result                                                  |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Webhook signature validation      | Razorpay docs: HMAC-SHA256 + raw body        | ✅ Correct                                              |
| Subscription state handling       | Razorpay lifecycle docs                      | ✅ 9/9 states handled (all including paused/resumed)    |
| Payment retry flow                | Razorpay payment-retries docs                | ✅ Handled via payment.failed + halted                  |
| Cancel API usage                  | Razorpay cancel-subscription docs            | ✅ Correct (immediate cancel by design)                 |
| Subscription creation params      | Razorpay create-subscription API             | ✅ plan_id, total_count (3/36), quantity, notes correct |
| Date handling (Unix → Timestamp)  | Razorpay API response fields                 | ✅ All × 1000 conversions correct                       |
| Currency handling (INR/USD)       | Razorpay international payments docs         | ✅ Separate plans per currency, smallest unit           |
| Top-up via Orders API             | Razorpay orders vs subscriptions distinction | ✅ Correct — one-time orders with programmatic capture  |
| Plan deduplication                | Not in Razorpay docs (our pattern)           | ✅ Lookup key prevents duplicates                       |
| Credit reset on charge            | Our billing architecture                     | ✅ Two-layer reset (webhook + lazy)                     |
| Grace period                      | Our architecture (not Razorpay-native)       | ✅ 7-day in DAL query                                   |
| Security (auth, tenant isolation) | Our security rules + OWASP                   | ✅ All routes protected                                 |

### 23.10 Razorpay International Payments Activation Checklist

> **P0 — Required before launching USD pricing.** This is a Razorpay Dashboard configuration, not a code change.

| #   | Step                                                         | Status     |
| --- | ------------------------------------------------------------ | ---------- |
| 1   | Log in to Razorpay Dashboard → Settings → International      | ⬜ Pending |
| 2   | Enable "Accept International Payments"                       | ⬜ Pending |
| 3   | Complete additional KYC documents (Indian business required) | ⬜ Pending |
| 4   | Wait for Razorpay approval (may take 2-5 business days)      | ⬜ Pending |
| 5   | Verify test payment with USD currency in test mode           | ⬜ Pending |
| 6   | Verify currency auto-detection works (timezone-based)        | ⬜ Pending |
| 7   | Verify Razorpay plan creation with USD amounts works         | ⬜ Pending |
| 8   | Confirm settlement happens in INR (Razorpay default)         | ⬜ Pending |

**Code readiness:** ✅ All code supports INR/USD already — separate plans per currency, Zod validation for currency, timezone-based detection.

**When to complete:** Before any marketing/launch targeting international (non-India) customers.

---

## 24. Future Enhancements (Backlog)

| #   | Feature                                       | Priority | Notes                                                                                         |
| --- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| 1   | ~~Downgrade plan flow~~                       | ~~P1~~   | ✅ DONE (Feb 11, 2026) — PricingPlansModal now shows all plans, uses same cancel+new-sub flow |
| 2   | ~~Handle `subscription.pending` webhook~~     | ~~P1~~   | ✅ DONE (Feb 11, 2026) — Added to webhook switch with dual-path handling                      |
| 3   | Pause subscription                           | P2       | Implemented but disabled by default (May 21, 2026). UI hides Pause/Resume and APIs return unavailable while `ENABLE_SUBSCRIPTION_PAUSE=false`. |
| 4   | ~~Invoice download in billing history~~       | ~~P2~~   | ✅ DONE (Feb 11, 2026) — Fixed condition, button shows when invoiceUrl exists                 |
| 5   | Failed payment retry UI                       | P2       | Show "Update payment method" when `past_due`. Currently links to Razorpay short_url.          |
| 6   | Subscription analytics                        | P2       | MRR, churn rate, LTV tracking for founder dashboard.                                          |
| 7   | ~~Webhook idempotency guard~~                 | ~~P2~~   | ✅ DONE (Feb 11, 2026) — billingHistory dedup check before append                             |
| 8   | ~~Update `lastWebhook` field~~                | ~~P2~~   | ✅ DONE (Feb 11, 2026) — Added to all webhook update payloads                                 |
| 9   | Multi-store billing                           | P3       | If tenant has multiple stores, aggregate billing view.                                        |
| 10  | ~~Yearly auto-renewal (`total_count > 1`)~~   | ~~P2~~   | ✅ DONE (Feb 11, 2026) — Changed to 3 (yearly) / 36 (monthly) in both create routes           |
| 11  | ~~Razorpay international payments checklist~~ | ~~P0~~   | ✅ Checklist added in §23.10. Dashboard config required before USD launch.                    |
