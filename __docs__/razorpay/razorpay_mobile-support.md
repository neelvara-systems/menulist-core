# Razorpay Payment System — Mobile Support

**Last Updated:** May 21, 2026 (v3 — pause/resume self-service disabled)
**Decision:** ✅ FULL MOBILE SUPPORT — Zero desktop dependency for billing

---

## Feature Admission Test (Re-evaluated with "no desktop at all" lens)

| Gate          | Result        | Reasoning                                            |
| ------------- | ------------- | ---------------------------------------------------- |
| **Frequency** | ⚠️ OCCASIONAL | Billing checked monthly — but BLOCKING if no desktop |
| **Speed**     | ✅ PASS       | Razorpay modal opens instantly on mobile             |
| **Touch**     | ✅ PASS       | Cards, buttons, bottom sheets — all touch-friendly   |
| **Value**     | ✅ PASS       | Phone-only owner MUST manage subscription from phone |

---

## Mobile Implementation

| Feature                                 | Mobile Component                             | Status |
| --------------------------------------- | -------------------------------------------- | ------ |
| View plan (name, price, status, dates)  | `MobileBillingScreen`                        | ✅     |
| AI credits (monthly + topup + progress) | `MobileBillingScreen`                        | ✅     |
| Upgrade/change plan                     | `MobileBillingScreen` → Razorpay modal       | ✅     |
| Buy AI credit packs                     | `MobileBillingScreen` → Razorpay modal       | ✅     |
| Pause subscription                      | Hidden while `ENABLE_SUBSCRIPTION_PAUSE=false` | Disabled by policy |
| Resume subscription                     | Hidden while `ENABLE_SUBSCRIPTION_PAUSE=false`; paused legacy records show support recovery | Disabled by policy |
| Cancel subscription                     | `MobileBillingScreen` → confirmation         | ✅     |
| Retry failed payment                    | `MobileBillingScreen` → Razorpay shortUrl    | ✅     |
| Billing history                         | `MobileBillingScreen` → lazy-loaded list     | ✅     |
| Invoice links                           | `MobileBillingScreen` → external link        | ✅     |
| No-subscription gate                    | `MobileShell` → `hasValidSubscriptionAccess` | ✅     |

## DAL Parity

- Uses same `usePaymentHandler` hook as desktop (Razorpay script works on mobile browsers)
- Same `getActiveSubscriptionForStore`, `getBillingHistoryForStore` DAL functions
- Same `getB2CPlansList`, `aiEnhancementPacksList` data
- Same `calculateRemainingCredits`, `getGracePeriodInfo`, `hasValidSubscriptionAccess` utilities
