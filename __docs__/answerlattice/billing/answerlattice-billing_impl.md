# Answerlattice Billing — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-05-21
> **Audience:** Developers

## Architecture

Answerlattice reuses the MenuList Razorpay routes and payment hook through a product-aware adapter instead of a copied payment stack.

`src/lib/billing/productBillingPlans.ts` owns product-specific plan and support-credit pack mapping:

- MenuList uses existing `PlatformPlansList` and `aiEnhancementPacksList`.
- Answerlattice maps `src/data/answerlattice/plans.ts` into the shared `Plan` shape.
- Answerlattice has `Support Credit Pack` pricing through `ANSWERLATTICE_CREDIT_PACKS_LIST`.

`src/lib/billing/productBillingServer.ts` owns product-aware Firestore routing:

- MenuList payments use the existing default Firestore subscription DAL.
- Answerlattice payments use `answerlatticeFirestoreAdmin`.
- Answerlattice entitlement sync writes a compact `stores/{sId}.answerlatticeSubscription` summary and subscription `analyticsEntitlement`.

## API Behavior

All shared Razorpay routes accept optional `productId`.

- Missing `productId` means MenuList (`ML`) for backward compatibility.
- `productId: 'AL'` resolves Answerlattice scope through `resolveAnswerlatticeSessionScope()`.
- MenuList still uses `verifyTenantAccess()` and `canManageBillingMutation()`.
- Answerlattice uses `canUseAnswerlatticeManagement()` and `productAccounts.AL` scope.

Webhook events derive product from Razorpay notes:

- `notes.productId`
- fallback default `ML`

This lets Razorpay keep one webhook URL while writing transaction/subscription data to the correct product database.

## UI

Answerlattice dashboard routes:

- `/answerlattice/billing`
- `/answerlattice/transactions`

The billing screen reuses shared MenuList billing components where useful:

- `ActiveSubscriptionCard`
- `PricingPlansModal`
- `CreditsPackModal`
- `BillingHistory`

Those components now accept product-aware props for labels, support route, usage route, plans, packs, and checkout names.

## Non-Goals

- No separate Razorpay account is introduced in this pass.
- No MenuList hardcoded Answerlattice widget/test flag is reintroduced.
- No Answerlattice-specific email lifecycle system is added; MenuList billing messages remain MenuList-only until Answerlattice messaging is explicitly designed.

