# Razorpay Payment Flow — Complete Reference

> **⚠️ SUPERSEDED:** This document has been merged into [razorpay_impl.md](./razorpay_impl.md) which is now the single source of truth for all Razorpay documentation. This file is kept for historical reference only.

**Last Updated:** Feb 2026
**Status:** Razorpay is the ONLY payment provider (Stripe removed)

---

## Current Razorpay Capabilities (Already Built)

### Subscription Management

| Feature                 | Route / File                                 | Status     |
| ----------------------- | -------------------------------------------- | ---------- |
| Create subscription     | `api/razorpay/create-subscription/route.ts`  | ✅ Working |
| Cancel subscription     | `api/razorpay/cancel-subscription/route.ts`  | ✅ Working |
| Upgrade/change plan     | `api/razorpay/upgrade-subscription/route.ts` | ✅ Working |
| Verify subscription     | `api/razorpay/verify-subscription/route.ts`  | ✅ Working |
| Razorpay webhook        | `api/razorpay/webhook/route.ts`              | ✅ Working |
| Top-up order (AI packs) | `api/razorpay/create-topup-order/route.ts`   | ✅ Working |
| Verify top-up           | `api/razorpay/verify-topup/route.ts`         | ✅ Working |

### Frontend

| Feature                  | File                                                               | Status     |
| ------------------------ | ------------------------------------------------------------------ | ---------- |
| Payment handler hook     | `hooks/usePaymentHandler.ts`                                       | ✅ Working |
| Plan handler utility     | `lib/razorpay/plan-handler.ts`                                     | ✅ Working |
| Razorpay client init     | `lib/razorpay/razorpay.ts`                                         | ✅ Working |
| Billing page             | `components/templates/main-app/billing/index.tsx`                  | ✅ Working |
| Pricing plans modal      | `components/templates/main-app/billing/PricingPlansModal.tsx`      | ✅ Working |
| Active subscription card | `components/templates/main-app/billing/ActiveSubscriptionCard.tsx` | ✅ Working |
| Credits pack modal       | `components/templates/main-app/billing/CreditsPackModal.tsx`       | ✅ Working |
| No subscription view     | `components/templates/main-app/billing/NoSubscriptionView.tsx`     | ✅ Working |

### Database

| Feature              | File                                            | Status     |
| -------------------- | ----------------------------------------------- | ---------- |
| Subscription CRUD    | `database/subscriptions/index.ts`               | ✅ Working |
| Payment transactions | `database/subscriptions/paymentTransactions.ts` | ✅ Working |

### Security

| Feature            | Details                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| Auth               | All routes use `withAuth()` middleware                                       |
| Tenant isolation   | `verifyTenantAccess()` on all subscription operations                        |
| Webhook validation | IP allowlist + signature verification in `lib/security/webhookValidation.ts` |
| Input validation   | Zod schemas on all inputs                                                    |

---

## Stripe Files Removed (Feb 2026)

These files were Stripe-specific and safely deleted:

| Deleted File                                       | Razorpay Equivalent                                    |
| -------------------------------------------------- | ------------------------------------------------------ |
| `billingStripe/NoSubscriptionView.tsx`             | `billing/NoSubscriptionView.tsx`                       |
| `billingStripe/PlanDetails.tsx`                    | `billing/PricingPlansModal.tsx`                        |
| `billingStripe/SubscribeButton.tsx`                | `hooks/usePaymentHandler.ts` → Razorpay checkout       |
| `billingStripe/ManageSubscription.tsx`             | `billing/ActiveSubscriptionCard.tsx` (custom UI)       |
| `billingStripe/type.ts`                            | `data/common.ts` → `PricingPlan` type                  |
| `api/subscriptions/cancel/route.ts`                | `api/razorpay/cancel-subscription/route.ts` ✅         |
| `api/subscriptions/create-payment-intent/route.ts` | `api/razorpay/create-subscription/route.ts` ✅         |
| `api/subscriptions/update/route.ts`                | `api/razorpay/upgrade-subscription/route.ts` ✅        |
| `api/subscriptions/verify-session/route.ts`        | `api/razorpay/verify-subscription/route.ts` ✅         |
| `api/webhook/route.ts` (Stripe)                    | `api/razorpay/webhook/route.ts` ✅                     |
| `lib/stripe.ts`                                    | `lib/razorpay/razorpay.ts` ✅                          |
| `database/subscriptions/stripe.ts`                 | `database/subscriptions/index.ts` ✅                   |
| `billing/success/page.tsx`                         | Razorpay uses inline callback, no redirect page needed |

**Conclusion:** All subscription functionality that existed in Stripe has a working Razorpay equivalent. No features were lost.

---

## Future Enhancements (Backlog)

| #   | Feature                 | Priority | Notes                                                                        |
| --- | ----------------------- | -------- | ---------------------------------------------------------------------------- |
| 1   | Downgrade plan flow     | P1       | Currently upgrade cancels old + creates new. Downgrade needs proration logic |
| 2   | Pause subscription      | P2       | Implemented but disabled by policy. Keep `ENABLE_SUBSCRIPTION_PAUSE=false` unless MenuList deliberately offers owner self-service pause. |
| 3   | Invoice generation      | P2       | Razorpay auto-generates invoices — expose to user                            |
| 4   | Failed payment retry UI | P2       | Show "Update payment method" when `past_due`                                 |
| 5   | Subscription analytics  | P2       | MRR, churn rate, LTV tracking for founder dashboard                          |

---

## Monthly Credit Reset (Feb 10, 2026 — Bug Fix)

**Problem:** `monthlyCredits` was set at subscription creation but NEVER reset on renewal. Monthly subscribers kept their depleted balance after paying again. Yearly subscribers had no monthly reset mechanism at all.

**Solution: Two-layer reset**

### Layer 1: Webhook Reset (Monthly Plans)

When `subscription.charged` fires (Razorpay renewal), the webhook now resets:

```
monthlyCredits → monthlyCreditsAllowance
creditsLastResetMonth → billingPeriod
```

**File:** `api/razorpay/webhook/route.ts` (subscription.activated / subscription.charged case)

### Layer 2: Lazy Reset (Yearly Plans + Safety Net)

In `checkAICapacity()`, before checking capacity:

```
billingPeriod = getBillingPeriodKey(subscription.cycleStartDate)
if creditsLastResetMonth !== billingPeriod:
    monthlyCredits = monthlyCreditsAllowance
    creditsLastResetMonth = billingPeriod
    → write to Firestore (1 write, first AI call of the billing month only)
```

**File:** `src/lib/ai/capacityCheck.ts`

### Billing-Cycle-Aware Period Key (NOT Calendar Month)

Razorpay billing cycles run from anchor day to anchor day (e.g., 15th to 15th). The `getBillingPeriodKey()` function uses `cycleStartDate` to derive the anchor day:

```
Sub starts Feb 15 → anchor day = 15
  Mar 1  (day 1 < 15)  → period key 202602 (still Feb's billing period — NO reset)
  Mar 15 (day 15 >= 15) → period key 202603 (new billing period — reset triggers)

Month-end edge case: anchor=31, February (28 days)
  Anchor capped to 28 → Feb 28 triggers reset correctly.
  Without cap, credits would never reset in shorter months.
```

This prevents premature credit resets for mid-month subscriptions and handles month-end edge cases.

### Why Both Layers?

- **Monthly plans:** Webhook handles reset reliably when payment succeeds
- **Yearly plans:** No monthly webhook event exists — lazy reset fills this gap
- **Safety net:** If webhook fails/delays, lazy reset catches it on next AI call
- **Race-safe:** Lazy reset re-reads and writes inside a Firestore transaction, so a reset cannot overwrite a concurrent usage deduction.

### New Field: `creditsLastResetMonth`

- **Type:** `number` (YYYYMM billing-period key, e.g., `202602` — based on anchor day, NOT calendar month)
- **Set by:** All subscription creation routes + webhook + lazy reset
- **Purpose:** Track which billing period `monthlyCredits` was last refreshed for
- **Migration:** Old subscriptions without this field get reset on first AI call (generous but correct — they paid for those credits)

### Files Changed

| File                                          | Change                                                               |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `types/razorpay.ts`                           | Added `creditsLastResetMonth?: number` to `FirestoreSubscriptionDoc` |
| `api/razorpay/webhook/route.ts`               | Reset `monthlyCredits` + set `creditsLastResetMonth` on charge       |
| `api/razorpay/verify-subscription/route.ts`   | Set `creditsLastResetMonth` on first verification                    |
| `api/razorpay/create-subscription/route.ts`   | Set `creditsLastResetMonth` on creation                              |
| `api/onboarding/create-subscription/route.ts` | Set `creditsLastResetMonth` on onboarding                            |
| `lib/ai/capacityCheck.ts`                     | Transactional lazy reset before capacity check and transactional consumption |

---

## Key Architecture Decisions

1. **Razorpay-only:** Stripe fully removed. Single payment provider reduces complexity.
2. **Per-store subscriptions:** Each store has its own subscription (not per-tenant).
3. **Credits carry forward:** On upgrade, remaining credits transfer to new plan.
4. **Grace period:** 7 days for `past_due` status before expiration.
5. **AI Enhancement Packs:** One-time top-up purchases via Razorpay orders (not subscriptions).
6. **Two-layer credit reset:** Webhook (monthly plans) + lazy reset in `checkAICapacity` (yearly plans + safety net).
7. **Transactional consumption:** Paid AI usage deducts `monthlyCredits` first and `topUpCredits` second inside `consumeAICapacity()`.
