# Razorpay Payment System — Mobile Support

> **July 14, 2026:** desktop/mobile entitlement consumers share the same store mirror. A post-commit cache/screen/assistant failure no longer suppresses later refresh effects; authoritative entitlement truth remains committed and the failure is observable through stable server diagnostics.

**Last Updated:** July 14, 2026
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
| Enhancement access + purchased pack balance | `MobileBillingScreen`                   | ✅; internal monthly allowance/usage is not exposed for MenuList |
| Upgrade/change plan                     | `MobileBillingScreen` → Razorpay modal       | ✅     |
| Buy AI credit packs                     | `MobileBillingScreen` → Razorpay modal       | ✅     |
| Pause subscription                      | Hidden while `ENABLE_SUBSCRIPTION_PAUSE=false` | Disabled by policy |
| Resume subscription                     | Hidden while `ENABLE_SUBSCRIPTION_PAUSE=false`; paused legacy records show support recovery | Disabled by policy |
| Cancel subscription                     | `MobileBillingScreen` → confirmation         | ✅     |
| Retry failed payment                    | `MobileBillingScreen` → Razorpay shortUrl    | ✅ for the signed-in store's direct recurring subscription |
| Billing history                         | `MobileBillingScreen` → lazy-loaded list     | ✅     |
| Invoice links                           | `MobileBillingScreen` → external link        | ✅     |
| No-subscription gate                    | `MobileShell` → `hasValidSubscriptionAccess` | ✅     |

## DAL Parity

- Uses same `usePaymentHandler` hook as desktop (Razorpay script works on mobile browsers)
- Mobile and desktop apply the same store-scope rule. Switching the Billing picker changes the read context only; a switched-store view cannot change plans, quantities, payment links, pause/resume/cancel state, or packs. An outlet inheriting HQ billing cannot mutate the HQ recurring subscription; it may add a pack to the shared HQ enhancement balance while still signed into that outlet.
- Manual/prepaid reseller subscriptions display their prepaid status and expiry but never expose Razorpay pause, resume, cancel, upgrade, or pending-payment controls.
- Subscription verification posts Razorpay's checkout signature to `/api/razorpay/verify-subscription`; mobile does not activate billing from a payment ID alone.
- Upgrade carry-forward credits are computed from the old subscription on the server. Mobile sends only the old provider subscription ID as replacement intent. Payment verification or webhook activation finalizes the old-provider cancellation and atomic carry-forward; the follow-up `/api/razorpay/upgrade-subscription` call remains an idempotent acknowledgement/recovery path.
- Enhancement-pack success is not dependent on the mobile checkout handler remaining open: the signed `order.paid` webhook applies the same immutable-snapshot transaction when the browser callback is lost.
- Mobile billing actions use the same bounded server routes as desktop; Razorpay action bodies are capped before validation, provider calls, or subscription/top-up writes.
- Mobile uses the same bounded payment diagnostics as desktop. The shared hook does not log raw checkout verification responses, payment IDs, subscription IDs, order IDs, signatures, or provider exception payloads.
- Mobile billing catches plan update, paid-location, credit-pack, pause, resume, cancel, retry-payment link, pending-payment link, and invoice link failures with bounded payment diagnostics and generic owner-facing toast text; it does not display raw payment exception messages or raw Razorpay URLs.
- Mobile billing uses the shared past-due grace-period display fallback. Valid `pastDueSinceAt` values keep the normal countdown, while missing legacy/malformed `past_due` timestamps show fixed "Grace period details unavailable." copy instead of a false zero-day countdown.
- Same `getActiveSubscriptionForStore`, `getBillingHistoryForStore` DAL functions
- Billing history uses the shared 50-row successful-payment limit.
- Same `getB2CPlansList`, `aiEnhancementPacksList` data
- Same `calculateRemainingCredits`, `getGracePeriodInfo`, `getGracePeriodDisplayInfo`, `hasValidSubscriptionAccess` utilities
