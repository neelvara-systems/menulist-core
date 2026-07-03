# Razorpay Payment System — Mobile Support

**Last Updated:** June 29, 2026
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
- Subscription verification posts Razorpay's checkout signature to `/api/razorpay/verify-subscription`; mobile does not activate billing from a payment ID alone.
- Upgrade carry-forward credits are computed by `/api/razorpay/upgrade-subscription` from the old subscription. Mobile does not send or calculate credit authority for the new subscription.
- Mobile billing actions use the same bounded server routes as desktop; Razorpay action bodies are capped before validation, provider calls, or subscription/top-up writes.
- Mobile uses the same bounded payment diagnostics as desktop. The shared hook does not log raw checkout verification responses, payment IDs, subscription IDs, order IDs, signatures, or provider exception payloads.
- Mobile billing catches plan update, paid-location, credit-pack, pause, resume, cancel, retry-payment link, pending-payment link, and invoice link failures with bounded payment diagnostics and generic owner-facing toast text; it does not display raw payment exception messages or raw Razorpay URLs.
- Same `getActiveSubscriptionForStore`, `getBillingHistoryForStore` DAL functions
- Billing history uses the shared 50-row successful-payment limit.
- Same `getB2CPlansList`, `aiEnhancementPacksList` data
- Same `calculateRemainingCredits`, `getGracePeriodInfo`, `hasValidSubscriptionAccess` utilities
