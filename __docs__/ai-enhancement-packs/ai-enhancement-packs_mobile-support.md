# AI Enhancement Packs — Mobile Support

**Last Updated:** July 14, 2026
**Decision:** ✅ MOBILE SUPPORTED — billing and enhancement packs are handled on mobile through the same Razorpay + subscription contract as desktop

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ OCCASIONAL | Pack purchase is rare, but billing recovery can block the owner |
| **Speed** | ✅ PASS | Mobile uses a bottom sheet, one tap selection, and Razorpay checkout |
| **Touch** | ✅ PASS | Cards, store selector, and plan interval buttons use mobile-sized targets |
| **Value** | ✅ PASS | Phone-only owners must be able to recover billing and add enhancement capacity without desktop |

**Decision:** Mobile supported. Enhancement pack purchase remains an owner billing action, so it lives in `MobileBillingScreen` and reuses the desktop payment handler instead of creating a mobile-only DAL.

## Credit Presentation

Mobile and desktop use the same transparent contract: included, valid promotional, purchased, and usable Content Credit balances plus one 250-credit Pack for ₹799 / $29 before tax. Current examples are up to 50 generated menu images or 250 description rewrites and come from `src/data/shared/contentCreditPolicy.ts`. Do not expose provider cost, margin, or internal tax valuation.

---

## How Mobile Relates

The AI operations that consume pack credits (menu extraction, description generation) are triggered from:
- `MenuUploadSheet` (mobile) — menu photo extraction uses included AI capacity
- Desktop editor — image generation, description rewrite, bulk operations

Pack purchase is handled directly in `MobileBillingScreen`.

## Mobile Runtime Contract

| Flow | Mobile Surface | Shared Contract |
|------|----------------|-----------------|
| View current subscription | `src/components/mobile/screens/MobileBillingScreen.tsx` | `getActiveSubscriptionForStore(tenantId, storeId, tenant.storesList)` |
| Switch billing store | `MobileBillingScreen` store picker | Same `/api/auth/switch-store` endpoint used by Locations/Header |
| Outlet billing fallback | `MobileBillingScreen` | Outlet selection displays the HQ/master subscription returned by the shared DAL |
| Change plan | `MobileBillingScreen` plan sheet | `usePaymentHandler.onUpgradePlan()` / `onClickPaymentCard()` |
| Buy enhancement pack | `MobileBillingScreen` enhancement sheet | `usePaymentHandler.handleTopupPurchase()` → Razorpay top-up APIs |
| Billing history | `MobileBillingScreen` history sheet | `getBillingHistoryForStore()` using the effective subscription store |
| Usage history | `MobileTransactionsScreen` | Same `getPaginatedAiOperations()` DAL as desktop, with MenuList-only action filters, shared timestamp normalization, and explicit manual continuation across empty filtered scan windows |

## Store Switching Decision

Mobile billing must not assume `session.user.storeId` is always the viewed store. For HQ users, `activeStoreContext` can point at an outlet. The screen resolves:

1. Selected billing store: `activeStoreContext || storeDetails.storeId || session.user.storeId`
2. Subscription: `getActiveSubscriptionForStore(..., tenantDetails.storesList)`
3. History store: `activeSubscription.storeId || selected billing store`

If an outlet inherits the HQ subscription, the UI states that billing changes apply to HQ.

AI responses also identify the effective `billingStoreId`. The session provider applies a returned balance only when that ID matches the active subscription, preventing a late response from one outlet/store from overwriting another store's Billing state. The selected outlet still owns the Transactions history row even when its charge comes from an inherited HQ subscription.

`MobileTransactionsScreen` separately binds its history state to exact signed user, tenant, store, product, and session identity. A store/session switch hides the former rows and selected detail synchronously; a monotonic request guard rejects late reset or continuation responses before list/cursor/summary state can advance. This changes browser settlement only and adds no API or Firestore operation.

## May 20, 2026 Verification Update

Mobile Billing and Transactions use the same runtime contracts as desktop:

- Billing mutation errors are sent through the monitored logger before owner-facing Toast feedback.
- Transaction dates are formatted from the shared date normalizer, preventing live Firestore `Timestamp` values from rendering as incorrect historical dates.
