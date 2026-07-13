# Razorpay Subscription — User Journey Tracking

> **Purpose:** Complete tracking of every user journey and flow in the subscription system. Each scenario documents the exact path through the codebase, what triggers it, what happens at each step, and the current status. Use this as a reference when revisiting, debugging, or extending the subscription flow.
>
> **Last Updated:** July 5, 2026
> **Verification Method:** Code dry-run tracing (every file, every branch)

---

## Table of Contents

1. [Journey 1: New User — First Subscription (Onboarding)](#journey-1)
2. [Journey 2: Active User — Monthly/Yearly Auto-Renewal Succeeds](#journey-2)
3. [Journey 3: Active User — Payment Fails → Grace Period](#journey-3)
4. [Journey 4: Past-Due User — Retries Payment from Dashboard](#journey-4)
5. [Journey 5: Past-Due User — Grace Period Expires → Auto-Expire](#journey-5)
6. [Journey 6: Active User — Cancels Subscription](#journey-6)
7. [Journey 7: Cancelled User — Cycle Ends → Loses Access](#journey-7)
8. [Journey 8: Cancelled/Expired User — Resubscribes](#journey-8)
9. [Journey 9: Active User — Pause Is Disabled](#journey-9)
10. [Journey 10: Paused User — Resume Is Disabled](#journey-10)
11. [Journey 11: Paused User — Billing Cycle Ends While Paused](#journey-11)
12. [Journey 12: Active User — Upgrades Plan](#journey-12)
13. [Journey 13: Active User — Downgrades Plan](#journey-13)
14. [Journey 14: Active User — Buys Credit Top-Up](#journey-14)
15. [Journey 15: Active User — Uses AI → Credits Deplete](#journey-15)
16. [Journey 16: Final Billing Cycle → Subscription Completes](#journey-16)
17. [Journey 17: Payment Verification Fails (Webhook Safety Net)](#journey-17)
18. [Journey 18: User Closes Razorpay Modal Without Paying](#journey-18)
19. [Journey 19: Halted Subscription (All Retries Exhausted)](#journey-19)
20. [Journey 20: Website Pricing Page — Subscription Management View](#journey-20)

---

<a id="journey-1"></a>
## Journey 1: New User — First Subscription (Onboarding)

**Status:** ✅ Fully Handled

**Trigger:** User lands on pricing page, picks a plan, signs in with Google, enters business details.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User visits `/pricing` → selects plan → signs in | `landingPage/pricing/index.tsx` | `onClickPaymentCard()` or `executePostOnboarding()` |
| 2 | If new user → onboarding API called | `usePaymentHandler.ts` → `executePostOnboarding()` | POST `/api/onboarding/create-subscription` |
| 3 | Server creates tenant + store + Razorpay subscription + Firestore doc (status: `pending`) | `api/onboarding/create-subscription/route.ts` | `createInitialSubscription()` |
| 4 | Razorpay Checkout modal opens | `usePaymentHandler.ts` | `new window.Razorpay(options).open()` |
| 5 | User completes payment | Razorpay hosted modal | — |
| 6 | Handler calls verify API | `usePaymentHandler.ts` → `verifySubscriptionPaymentResponse()` | POST `/api/razorpay/verify-subscription` |
| 7 | Server: fetches payment from Razorpay, validates, sets status=`active`, sets credits, dates, payment method | `api/razorpay/verify-subscription/route.ts` | `updateSubscription()` |
| 8 | NextAuth session updated with tenantId/storeId | `usePaymentHandler.ts` | `update({ tenantId, storeId })` |
| 9 | User redirected to dashboard | `landingPage/pricing/index.tsx` | `router.push('/dashboard')` |

**Firestore doc after this journey:**
```
status: "active"
cycleStartDate: Razorpay current_start × 1000
cycleEndDate: Razorpay current_end × 1000
renewsOn: Razorpay charge_at × 1000
monthlyCredits: monthlyCreditsAllowance (full)
topUpCredits: 0 (or carried from upgrade)
paymentMethod: { type: "card"|"upi", brand, last4, upiId }
```

**Webhook also fires:** `subscription.activated` and/or `subscription.charged` — idempotent with verify route.

---

<a id="journey-2"></a>
## Journey 2: Active User — Monthly/Yearly Auto-Renewal Succeeds

**Status:** ✅ Fully Handled

**Trigger:** Razorpay auto-charges user's saved payment method on `charge_at` date.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | Razorpay charges user → sends `subscription.charged` webhook | External (Razorpay) | — |
| 2 | Webhook handler validates signature (HMAC-SHA256) | `api/razorpay/webhook/route.ts` | `validateRazorpayWebhookSignature()` |
| 3 | Fetches invoice data from Razorpay | `api/razorpay/webhook/route.ts` | `getInvoiceById()` |
| 4 | Writes a bounded deterministic audit summary to the payment ledger | `api/razorpay/webhook/route.ts` | `writeProductPaymentTransactionAudit()` |
| 5 | Looks up internal subscription by Razorpay sub ID | `api/razorpay/webhook/route.ts` | `getSubscriptionById()` |
| 6 | Resets monthly credits, updates cycle dates, clears pastDueSinceAt, appends billing history (with idempotency check) | `api/razorpay/webhook/route.ts` | `updateSubscription()` |
| 7 | Next time user loads any page → SessionProvider fetches updated doc | `sessionProvider.tsx` | `getActiveSubscriptionForStore()` |

**Key fields updated:**
```
status: "active"
monthlyCredits: monthlyCreditsAllowance (RESET)
cycleStartDate: new current_start
cycleEndDate: new current_end
renewsOn: new charge_at
pastDueSinceAt: null (CLEARED)
creditsLastResetMonth: updated
billingHistory: [..., paymentId] (if not already present)
lastWebhook: { event, timestamp }
```

**Idempotency guard:** `if (internalSub.billingHistory?.includes(paymentEntity.id))` — prevents duplicate billing entries if webhook fires twice.

---

<a id="journey-3"></a>
## Journey 3: Active User — Payment Fails → Grace Period

**Status:** ✅ Fully Handled

**Trigger:** Razorpay tries to charge user's payment method and it fails (insufficient funds, card expired, etc.)

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | Razorpay charge fails → sends `payment.failed` webhook | External (Razorpay) | — |
| 2 | Webhook sets status=`past_due`, preserves first failure time | `api/razorpay/webhook/route.ts` | `pastDueSinceAt: internalSub.pastDueSinceAt \|\| Timestamp.now()` |
| 3 | Razorpay may retry → sends `subscription.pending` webhook | External (Razorpay) | — |
| 4 | Pending handler also sets `past_due` + preserves `pastDueSinceAt` | `api/razorpay/webhook/route.ts` | Same preservation logic |
| 5 | User visits dashboard → DAL checks grace period | `database/subscriptions/index.ts` | `getGracePeriodInfo(pastDueSinceAt)` |
| 6 | If within 7 days → returns subscription (access continues) | `database/subscriptions/index.ts` | `if (remainingDays > 0) return subData` |
| 7 | UI shows "Payment Failed" tag, grace period countdown, warning text | `ActiveSubscriptionCard.tsx` | `renderTag()`, `renderGracePeriodInfo()`, `renderAccessUntillDate()` |
| 8 | User sees "Retry Payment" button (opens Razorpay shortUrl through guarded browser handoff) | `ActiveSubscriptionCard.tsx` | `handleOpenPaymentLink('retry_payment')` |

**Key fields updated:**
```
status: "past_due"
pastDueSinceAt: Timestamp.now() (only set ONCE, preserved on subsequent failures)
lastWebhook: { event, timestamp }
```

**UI display for past_due:**
- Tag: 🟡 "Payment Failed"
- Date: "Grace period (X days left)" with end date when `pastDueSinceAt` exists
- Fallback: fixed "Grace period details unavailable." recovery copy when a legacy or malformed `past_due` doc has no `pastDueSinceAt`
- Warning text: "Your last payment attempt failed..."
- Buttons: "Cancel Subscription" + "Retry Payment" (via shortUrl)

---

<a id="journey-4"></a>
## Journey 4: Past-Due User — Retries Payment from Dashboard

**Status:** ✅ Fully Handled

**Trigger:** User clicks "Retry Payment" button on billing page.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User clicks "Retry Payment" → opens Razorpay short URL in new tab through `noopener,noreferrer`; blocked opens log bounded diagnostics | `ActiveSubscriptionCard.tsx` | `payment_desktop_subscription_payment_link_open_failed` |
| 2 | User completes payment on Razorpay's hosted page | External (Razorpay) | — |
| 3 | Razorpay processes payment → sends `subscription.charged` webhook | External (Razorpay) | — |
| 4 | Webhook handler: resets credits, updates dates, clears `pastDueSinceAt`, sets status=`active` | `api/razorpay/webhook/route.ts` | Same as Journey 2 renewal flow |
| 5 | User returns to billing tab → refreshes page → sees active subscription | `billing/index.tsx` | `refetchActiveSubscription()` |

**Note:** The `shortUrl` is the Razorpay-hosted payment page set during subscription creation. It remains valid throughout the subscription lifecycle and allows users to update their payment method and retry payment.

**Fallback:** If `shortUrl` is missing → "Contact Support" button shown instead.

---

<a id="journey-5"></a>
## Journey 5: Past-Due User — Grace Period Expires → Auto-Expire

**Status:** ✅ Fully Handled

**Trigger:** 7 days pass since `pastDueSinceAt` without successful payment.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | 7+ days since first payment failure | — | — |
| 2 | User visits any page that loads subscription | `sessionProvider.tsx` OR `billing/index.tsx` | `getActiveSubscriptionForStore()` |
| 3 | DAL: subscription found with `pastDueSinceAt` | `database/subscriptions/index.ts` | Primary query matches (cycleEndDate might still be in future) |
| 4 | DAL: `getGracePeriodInfo()` → `remainingDays = 0` | `database/subscriptions/index.ts` | Grace expired check |
| 5 | DAL: auto-updates to expired, sets cycleEndDate and subscriptionEndDate to now | `database/subscriptions/index.ts` | `updateSubscription(id, { status: 'expired', ... })` |
| 6 | DAL returns `null` | `database/subscriptions/index.ts` | `return null` |
| 7 | User sees "No Active Subscription" | `billing/index.tsx` | Renders `NoSubscriptionView` / empty state |
| 8 | Dashboard redirects to `/billing` | `dashboard/index.tsx` | `hasValidSubscriptionAccess()` returns false |
| 9 | Projects shows `NoSubscriptionView` | `projects/index.tsx` | `hasValidSubscriptionAccess()` returns false |

**Firestore doc after auto-expire:**
```
status: "expired"
cycleEndDate: Timestamp.now()
subscriptionEndDate: Timestamp.now()
statuses: [..., { status: "expired", remark: "Expired due to payment failed..." }]
```

**Side-effect read:** The DAL writes (auto-expire) during a read operation. This is intentional — it's the only point where the grace period is checked.

---

<a id="journey-6"></a>
## Journey 6: Active User — Cancels Subscription

**Status:** ✅ Fully Handled

**Trigger:** User clicks "Cancel Subscription" on billing page.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User clicks "Cancel Subscription" → CancellationModal opens | `ActiveSubscriptionCard.tsx` | `setIsCancellationModalOpen(true)` |
| 2 | Step 1: User selects cancellation reason | `CancellationModal.tsx` | Reason radio buttons |
| 3 | Step 2: User confirms with "I understand" checkbox | `CancellationModal.tsx` | Consent checkbox |
| 4 | Calls cancel API | `usePaymentHandler.ts` → `onCancelSubscription()` | POST `/api/razorpay/cancel-subscription` |
| 5 | Server: validates session, tenant access, finds subscription | `api/razorpay/cancel-subscription/route.ts` | `withAuth`, `verifyTenantAccess` |
| 6 | Server: calls Razorpay cancel (immediate) | `api/razorpay/cancel-subscription/route.ts` | `razorpayClient.subscriptions.cancel()` |
| 7 | Server: updates Firestore — status=cancelled, subscriptionEndDate=cycleEndDate | `api/razorpay/cancel-subscription/route.ts` | `updateSubscription()` |
| 8 | Frontend: refetches, shows "Cancelled" tag + "Access Good Until" date | `ActiveSubscriptionCard.tsx` | `refetchActiveSubscription()` |
| 9 | Webhook `subscription.cancelled` fires later → only updates `lastWebhook` | `api/razorpay/webhook/route.ts` | No status change (already handled by API route) |

**Key fields updated:**
```
status: "cancelled"
subscriptionEndDate: cycleEndDate (access until end of paid period)
statuses: [..., { status: "cancelled", remark: "Cancelled by user, reason: ..." }]
```

**UI after cancellation:**
- Tag: 🔴 "Cancelled"
- Date: "Access Good Until" → `cycleEndDate`
- Button: "Choose a New Plan"

**CancellationModal date:** Shows `cycleEndDate` (not `renewsOn`) for accurate "access until" display.

---

<a id="journey-7"></a>
## Journey 7: Cancelled User — Cycle Ends → Loses Access

**Status:** ✅ Fully Handled

**Trigger:** `cycleEndDate` passes for a cancelled subscription.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | `cycleEndDate` passes | — | — |
| 2 | User visits any page | `sessionProvider.tsx` | `getActiveSubscriptionForStore()` |
| 3 | DAL query: `where("cycleEndDate", ">=", now)` → no match (cycleEndDate < now) | `database/subscriptions/index.ts` | Primary query returns empty |
| 4 | Fallback query checks for paused subs → not applicable (status is cancelled) | `database/subscriptions/index.ts` | Fallback only checks `status == "paused"` |
| 5 | Returns `null` → user sees "No Active Subscription" | `billing/index.tsx` | Empty state rendered |

**No Firestore write needed:** The subscription doc stays as `cancelled` in Firestore. The DAL simply stops returning it because `cycleEndDate < now`.

---

<a id="journey-8"></a>
## Journey 8: Cancelled/Expired User — Resubscribes

**Status:** ✅ Fully Handled

**Trigger:** User with cancelled/expired subscription clicks "Choose a New Plan" or "View Plans".

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1a | If cancelled (still visible): "Choose a New Plan" button | `ActiveSubscriptionCard.tsx` | `renderActionButtons()` for cancelled |
| 1b | If null (expired/cycle ended): "View Plans" button | `billing/index.tsx` | Empty state "View Plans" button |
| 2 | Opens PricingPlansModal | `billing/index.tsx` | `setIsPricingModalOpen({ action: "new", active: true })` |
| 3 | User selects plan → `handleConfirmUpgrade()` | `billing/index.tsx` | Checks `Boolean(activeSubscription)` |
| 4a | If activeSubscription exists (cancelled): `onUpgradePlan()` — carries credits | `usePaymentHandler.ts` | `calculateRemainingCredits()` → credit carry |
| 4b | If no activeSubscription: `onClickPaymentCard()` — fresh subscription | `usePaymentHandler.ts` | Creates new sub without carry |
| 5 | Razorpay Checkout → payment → verify → active | Same as Journey 1 | — |
| 6 | For upgrade path: old sub marked expired, credits carried to new sub's `topUpCredits` | `api/razorpay/upgrade-subscription/route.ts` | `updateSubscription(old, { status: 'expired' })` |

**Credit carry-forward formula:**
- Monthly: `monthlyCredits + topUpCredits`
- Yearly: `unusedThisMonth + (monthsRemaining - 1) × monthlyCreditsAllowance + topUpCredits`

---

<a id="journey-9"></a>
## Journey 9: Active User — Pause Is Disabled

**Status:** ✅ Disabled by policy (`ENABLE_SUBSCRIPTION_PAUSE=false`)

**Trigger:** User views Billing or attempts a direct pause API call.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | Active subscription renders without Pause action | `ActiveSubscriptionCard.tsx`, `MobileBillingScreen.tsx` | `isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')` |
| 2 | Hook refuses accidental calls before fetch | `usePaymentHandler.ts` → `onPauseSubscription()` | Returns `Subscription pause is not available.` |
| 3 | API refuses direct calls before provider/database mutation | `api/razorpay/pause-subscription/route.ts` | Returns unavailable when flag is false |

**UI result:**
- Active subscriptions show Change/Upgrade/Cancel/Retry paths only.
- No self-service Pause button is shown on desktop or mobile.
- No Razorpay pause call or Firestore status write occurs while the flag is false.

---

<a id="journey-10"></a>
## Journey 10: Paused User — Resume Is Disabled

**Status:** ✅ Disabled by policy (`ENABLE_SUBSCRIPTION_PAUSE=false`)

**Trigger:** Legacy/provider-side paused subscription is visible on Billing, or direct resume API is called.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | Paused subscription remains visible for recovery | `database/subscriptions/index.ts` | Paused fallback query |
| 2 | Billing shows support recovery, not Resume | `ActiveSubscriptionCard.tsx`, `MobileBillingScreen.tsx`, `SubscriptionManagement.tsx` | Flag-gated action rendering |
| 3 | Hook refuses accidental calls before fetch | `usePaymentHandler.ts` → `onResumeSubscription()` | Returns `Subscription resume is not available.` |
| 4 | API refuses direct calls before provider/database mutation | `api/razorpay/resume-subscription/route.ts` | Returns unavailable when flag is false |

---

<a id="journey-11"></a>
## Journey 11: Paused User — Billing Cycle Ends While Paused

**Status:** ✅ Fully Handled (Fixed in this session)

**Trigger:** User pauses subscription, then `cycleEndDate` passes without resuming.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User pauses subscription (Journey 9) | — | — |
| 2 | `cycleEndDate` passes | — | — |
| 3 | User visits billing page | `billing/index.tsx` | `refetchActiveSubscription()` |
| 4 | DAL primary query: `cycleEndDate >= now` → **no match** | `database/subscriptions/index.ts` | Primary query empty |
| 5 | DAL **fallback query**: `status == "paused"` (no cycleEndDate filter) → **MATCH** | `database/subscriptions/index.ts` | Paused fallback query |
| 6 | Returns paused sub (with expired cycleEndDate) | `database/subscriptions/index.ts` | Returns sub data |
| 7 | BillingPage: `activeSubscription` is not null → renders ActiveSubscriptionCard | `billing/index.tsx` | Card shown |
| 8 | ActiveSubscriptionCard: detects paused + expired cycle | `ActiveSubscriptionCard.tsx` | `hasValidSubscriptionAccess()` returns `false` |
| 9 | Shows support recovery message instead of self-service resume | `ActiveSubscriptionCard.tsx` | Cycle-aware paused message |
| 10 | Direct resume API remains unavailable while `ENABLE_SUBSCRIPTION_PAUSE=false` | `resume-subscription/route.ts` | Feature flag guard |
| 11 | Dashboard: `hasValidSubscriptionAccess()` returns `false` → redirects to `/billing` | `dashboard/index.tsx` | Access blocked |
| 12 | Projects: `hasValidSubscriptionAccess()` returns `false` → shows NoSubscriptionView | `projects/index.tsx` | Access blocked |

**Key implementation detail:** `hasValidSubscriptionAccess()` in `src/utils/razorpay.ts`:
```
if (sub.status === 'paused' && sub.cycleEndDate) {
    return sub.cycleEndDate.toMillis() >= Date.now();
}
```

---

<a id="journey-12"></a>
## Journey 12: Active User — Upgrades Plan

**Status:** ✅ Fully Handled

**Trigger:** User clicks "Upgrade Plan" on billing page.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User clicks "Upgrade Plan" → PricingPlansModal opens (action=`upgrade`) | `ActiveSubscriptionCard.tsx` | `setIsPricingModalOpen({ action: "upgrade" })` |
| 2 | Modal shows all plans except current | `PricingPlansModal.tsx` | Plan filtering logic |
| 3 | User selects higher plan → UpgradeConfirmationModal | `PricingPlansModal.tsx` | Shows credit carry-forward info |
| 4 | User confirms → `handleConfirmUpgrade()` | `billing/index.tsx` | Calls `onUpgradePlan()` |
| 5 | Calculates remaining credits from old sub | `usePaymentHandler.ts` | `calculateRemainingCredits()` |
| 6 | Creates new Razorpay subscription (with credit carry as `rc` param) | `usePaymentHandler.ts` → `createSubscription()` | POST `/api/razorpay/create-subscription` |
| 7 | User pays via Razorpay Checkout → verify | `usePaymentHandler.ts` | `verifySubscriptionPaymentResponse()` |
| 8 | Calls upgrade API → cancels old sub on Razorpay + Firestore | `usePaymentHandler.ts` → `handleUpgradeSubscription()` | POST `/api/razorpay/upgrade-subscription` |
| 9 | Old sub: `status: "expired"`, `cycleEndDate: now` | `api/razorpay/upgrade-subscription/route.ts` | Immediate expiry |
| 10 | New sub: active with carried credits as `topUpCredits` | `api/razorpay/verify-subscription/route.ts` | `topUpCredits: remainingCredits` |
| 11 | Frontend: refetches → shows new active sub | `billing/index.tsx` | `refetchActiveSubscription()` |

---

<a id="journey-13"></a>
## Journey 13: Active User — Downgrades Plan

**Status:** ✅ Fully Handled

**Trigger:** User clicks "Upgrade Plan" and selects a lower-tier plan.

**Step-by-step path:**

Same flow as Journey 12 (Upgrade). The PricingPlansModal shows all plans except the current one. Lower-tier plans display a "Downgrade" label instead of "Upgrade".

**Key code:** `PricingPlansModal.tsx` — plan tier comparison:
```
const tierOrder = ['starter', 'growth', 'premium'];
const currentTierIndex = tierOrder.indexOf(activeSubscription.planId);
// Shows "Downgrade" for plans below current tier, "Upgrade" for above
```

Credits are carried forward identically to upgrades.

---

<a id="journey-14"></a>
## Journey 14: Active User — Buys Credit Top-Up

**Status:** ✅ Fully Handled

**Trigger:** User clicks "Buy More Credits" on billing page.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User clicks "Buy More Credits" → CreditsPackModal opens | `ActiveSubscriptionCard.tsx` | `setIsCreditsModalOpen(true)` |
| 2 | User selects credit pack | `CreditsPackModal.tsx` | Pack selection |
| 3 | `handleCreditsPurchase()` → finds pack details | `billing/index.tsx` | `aiEnhancementPacksList.find()` |
| 4 | `handleTopupPurchase()` → creates Razorpay order | `usePaymentHandler.ts` | POST `/api/razorpay/create-topup-order` |
| 5 | Razorpay Checkout modal opens (order-based, not subscription) | `usePaymentHandler.ts` | `new window.Razorpay(options).open()` |
| 6 | User pays → verify topup | `usePaymentHandler.ts` | POST `/api/razorpay/verify-topup` |
| 7 | Server adds credits to subscription doc | `api/razorpay/verify-topup/route.ts` | Updates `topUpCredits` |
| 8 | Frontend: updates `topUpCredits` in-place + confetti | `billing/index.tsx` | `setActiveSubscription({ ...activeSubscription, topUpCredits: ... })` |
| 9 | Webhook `order.paid` writes the deterministic payment audit summary | `api/razorpay/webhook/route.ts` | `writeProductPaymentTransactionAudit()` |

**Note:** Top-up is an **order** (one-time payment), not a subscription charge. Different Razorpay flow but same checkout experience.

---

<a id="journey-15"></a>
## Journey 15: Active User — Uses AI → Credits Deplete

**Status:** ✅ Fully Handled

**Trigger:** User triggers any AI operation (OCR, image gen, descriptions, translations).

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User triggers AI operation | Various AI feature components | — |
| 2 | Backend: `checkAICapacity()` verifies credits available | `src/lib/ai/capacityCheck.ts` | Checks `monthlyCredits + topUpCredits > 0` |
| 3 | Backend: `consumeAICapacity()` deducts from monthlyCredits first, then topUpCredits | `src/lib/ai/capacityCheck.ts` | Two-layer deduction |
| 4 | Backend: lazy credit reset safety net (checks `creditsLastResetMonth`) | `src/lib/ai/capacityCheck.ts` | If billing period key changed → reset |
| 5 | API response includes `remainingBalance` | Various AI API routes | `{ remainingBalance: { monthly, topUp } }` |
| 6 | Frontend: `syncBalanceFromResponse()` dispatches CustomEvent | `src/services/ai/balanceSync.ts` | `window.dispatchEvent(new CustomEvent('ai-balance-update'))` |
| 7 | SessionProvider listener: patches `activeSubscription` credits | `sessionProvider.tsx` | Event listener updates `monthlyCredits` + `topUpCredits` |
| 8 | UI re-renders with updated credit counts | `ActiveSubscriptionCard.tsx` | Automatic via context |

**Zero extra Firestore reads:** The CustomEvent pattern avoids re-fetching the subscription doc on every AI call.

**When credits reach 0:** `checkAICapacity()` returns error → AI operation blocked → user sees "Insufficient credits" message.

---

<a id="journey-16"></a>
## Journey 16: Final Billing Cycle → Subscription Completes

**Status:** ✅ Fully Handled

**Trigger:** Subscription reaches its `total_count` of billing cycles.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | During active subscription, UI detects final cycle | `ActiveSubscriptionCard.tsx` | `isFinalCycle = abs(renewsOn - subscriptionEndDate) <= 86400` |
| 2 | UI shows "Expires On" instead of "Renews On" | `ActiveSubscriptionCard.tsx` | `renderAccessUntillDate()` |
| 3 | UI shows "Change Plan" instead of "Cancel" | `ActiveSubscriptionCard.tsx` | `renderActionButtons()` |
| 4 | After last cycle ends → Razorpay fires `subscription.completed` | External (Razorpay) | — |
| 5 | Webhook: sets `status: "completed"`, `subscriptionEndDate` from Razorpay `ended_at` | `api/razorpay/webhook/route.ts` | `updateSubscription()` |
| 6 | DAL: `"completed"` NOT in status filter → returns `null` | `database/subscriptions/index.ts` | Query doesn't match |
| 7 | User sees "No Active Subscription" → must buy new plan | `billing/index.tsx` | Empty state |

**`total_count` values:**
- Monthly: 36 (3 years of auto-renewal)
- Yearly: 3 (3 years of auto-renewal)

---

<a id="journey-17"></a>
## Journey 17: Payment Verification Fails (Webhook Safety Net)

**Status:** ✅ Fully Handled

**Trigger:** User pays but the `verify-subscription` API call fails (network error, timeout, etc.)

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User pays on Razorpay Checkout | External (Razorpay) | — |
| 2 | Frontend calls `/api/razorpay/verify-subscription` → **FAILS** (network error, timeout) | `usePaymentHandler.ts` | `verifySubscriptionPaymentResponse()` throws |
| 3 | User sees error message | `billing/index.tsx` | `catch` block |
| 4 | Meanwhile, Razorpay sends `subscription.activated` webhook | External (Razorpay) | — |
| 5 | Webhook handler: sets status=`active`, credits, dates | `api/razorpay/webhook/route.ts` | Full subscription activation |
| 6 | Next page load → SessionProvider fetches active sub → everything works | `sessionProvider.tsx` | `getActiveSubscriptionForStore()` |

**The webhook is the safety net.** Even if the frontend verification fails, the webhook ensures the subscription is activated in Firestore.

---

<a id="journey-18"></a>
## Journey 18: User Closes Razorpay Modal Without Paying

**Status:** ✅ Handled (minor data artifact)

**Trigger:** User opens Razorpay Checkout modal then closes it without completing payment.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | `createSubscription()` → creates Razorpay sub + Firestore doc (status: `pending`) | `api/razorpay/create-subscription/route.ts` | `createInitialSubscription()` |
| 2 | Razorpay Checkout opens | `usePaymentHandler.ts` | `paymentObject.open()` |
| 3 | User closes modal → handler never called | — | Promise neither resolves nor rejects |
| 4 | Firestore doc stays as `pending` | — | No update |
| 5 | DAL never returns `pending` docs (not in status filter) | `database/subscriptions/index.ts` | Query filters for active/past_due/cancelled/paused |
| 6 | User can try again → creates another subscription | — | New doc created |

**Data artifact:** Orphaned `pending` docs accumulate in Firestore. Not harmful but can be cleaned up periodically.

---

<a id="journey-19"></a>
## Journey 19: Halted Subscription (All Retries Exhausted)

**Status:** ✅ Fully Handled

**Trigger:** Razorpay exhausts all payment retry attempts.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | Multiple `payment.failed` events (each preserves `pastDueSinceAt`) | `api/razorpay/webhook/route.ts` | — |
| 2 | Razorpay gives up → sends `subscription.halted` webhook | External (Razorpay) | — |
| 3 | Webhook handler: same as `payment.failed` — sets `past_due`, preserves `pastDueSinceAt` | `api/razorpay/webhook/route.ts` | Same logic in `subscription.halted` case |
| 4 | User has same experience as Journey 3/4 (grace period, retry via shortUrl) | `ActiveSubscriptionCard.tsx` | Same UI |
| 5 | If grace period expires → auto-expire (Journey 5) | `database/subscriptions/index.ts` | Same auto-expire logic |

**Note:** On Razorpay's side, `halted` means no more automatic retries. But the user can still manually pay via the `shortUrl`. After manual payment, Razorpay sends `subscription.charged` → subscription reactivates.

---

<a id="journey-20"></a>
## Journey 20: Website Pricing Page — Subscription Management View

**Status:** ✅ Fully Handled

**Trigger:** Authenticated user with active subscription visits the pricing/landing page.

**Step-by-step path:**

| Step | What Happens | File | Key Code |
|------|-------------|------|----------|
| 1 | User visits `/pricing` or landing page | `landingPage/index.tsx` | Page loads |
| 2 | If authenticated → fetches subscription | `landingPage/index.tsx` | `getActiveSubscriptionForStore()` |
| 3 | If subscription exists → shows SubscriptionManagementPage | `landingPage/index.tsx` | Conditional render |
| 4 | If no subscription → shows PricingPage (plan cards) | `landingPage/index.tsx` | Conditional render |
| 5 | SubscriptionManagement shows: status tag, plan, price, dates, credits, payment method | `SubscriptionManagement.tsx` | Full subscription display |
| 6 | Footer buttons: Dashboard, Transactions, Billing History (redirect to main app) | `SubscriptionManagement.tsx` | `router.push('/dashboard')` etc. |
| 7 | Credit packs CTA section shown below | `CreditPacksCtaSection.tsx` | Purchase flow available |

**Status handling in website view:**
- `active`: Green badge, "Renews On" date
- `cancelled`: Red badge, "Access Good Until" date
- `paused`: Orange badge, "Paused Since" date + expired-cycle warning if applicable
- `past_due`: Red badge, grace period info + "Visit Billing" guidance
- `expired`: Gray badge

**Note:** Website view does NOT have action buttons (cancel/pause/resume). All actions are done from the main app billing page. Website only shows status and directs to billing.

---

## Webhook Event Coverage Map

| Razorpay Event | Handler | What It Does | Status |
|----------------|---------|-------------|--------|
| `subscription.activated` | ✅ | Sets active, credits, dates (same as verify) | Handled |
| `subscription.charged` | ✅ | Resets credits, updates cycle dates, billing history | Handled |
| `subscription.completed` | ✅ | Sets completed, subscription end date | Handled |
| `subscription.cancelled` | ✅ | Updates lastWebhook only (API route handles DB) | Handled |
| `subscription.pending` | ✅ | Sets past_due, preserves pastDueSinceAt | Handled |
| `subscription.halted` | ✅ | Sets past_due (same as payment.failed) | Handled |
| `subscription.paused` | ✅ | Sets paused with initiator info | Handled |
| `subscription.resumed` | ✅ | Sets active with initiator info | Handled |
| `payment.failed` | ✅ | Sets past_due, preserves pastDueSinceAt | Handled |
| `order.paid` | ✅ | Top-up credit purchase transaction logged | Handled |
| Unhandled events | ✅ | Logged as unhandled, 200 returned | Handled |

---

## API Route Security Checklist

| Route | `withAuth` | `verifyTenantAccess` | Input Validation | Tenant Ownership Check | Rate Limit |
|-------|-----------|---------------------|-----------------|----------------------|------------|
| `create-subscription` | ✅ | ✅ | ✅ Zod | ✅ (session-based) | ✅ |
| `verify-subscription` | ✅ | ✅ | ✅ Zod | ✅ | — |
| `cancel-subscription` | ✅ | ✅ | ✅ Manual | ✅ | — |
| `upgrade-subscription` | ✅ | ✅ | ✅ Manual | ✅ | — |
| `pause-subscription` | ✅ | ✅ | ✅ Feature flag + status guard if enabled | ✅ | ✅ disabled before mutation while `ENABLE_SUBSCRIPTION_PAUSE=false` |
| `resume-subscription` | ✅ | ✅ | ✅ Feature flag + status guard if enabled | ✅ | ✅ disabled before mutation while `ENABLE_SUBSCRIPTION_PAUSE=false` |
| `create-topup-order` | ✅ | ✅ | ✅ Zod | ✅ | ✅ |
| `verify-topup` | ✅ | ✅ | ✅ Zod | ✅ | — |
| `webhook` | N/A | N/A | ✅ HMAC-SHA256 signature | N/A (server-to-server) | — |

---

## Access Gate Summary

| Gate Location | Check Used | When It Blocks |
|---------------|-----------|----------------|
| `dashboard/index.tsx` | `hasValidSubscriptionAccess()` | null sub, expired, completed, paused+expired cycle |
| `projects/index.tsx` | `hasValidSubscriptionAccess()` | Same as dashboard |
| `billing/index.tsx` | `activeSubscription` (null check) | Only when truly null (paused subs always visible) |
| `landingPage/index.tsx` | `activeSubscription` (null check) | Shows pricing page vs management page |

---

## Files Modified in This Session

| File | Change |
|------|--------|
| `src/database/subscriptions/index.ts` | Added fallback query for paused subs with expired cycleEndDate |
| `src/utils/razorpay.ts` | Added `hasValidSubscriptionAccess()` utility function |
| `src/components/templates/main-app/dashboard/index.tsx` | Gate uses `hasValidSubscriptionAccess()` instead of null check |
| `src/components/templates/main-app/projects/index.tsx` | Gate uses `hasValidSubscriptionAccess()` instead of null check |
| `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` | PaymentMethod null safety, cycle-aware paused message, CancellationModal uses `cycleEndDate` |
| `src/components/templates/website/.../SubscriptionManagement.tsx` | Added `hasValidSubscriptionAccess` import, paused+expired cycle warning |
