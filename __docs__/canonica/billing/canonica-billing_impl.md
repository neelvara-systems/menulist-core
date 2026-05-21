# Canonica Billing — Implementation

> **Version:** 1.0.0
> **Last Updated:** 2026-05-21
> **Audience:** Developers

## Architecture

Canonica reuses the MenuList Razorpay routes and payment hook through a product-aware adapter instead of a copied payment stack.

`src/lib/billing/productBillingPlans.ts` owns product-specific plan and support-credit pack mapping:

- MenuList uses existing `PlatformPlansList` and `aiEnhancementPacksList`.
- Canonica maps `src/data/canonica/plans.ts` into the shared `Plan` shape.
- Canonica has `Support Credit Pack` pricing through `CANONICA_CREDIT_PACKS_LIST`.

`src/lib/billing/productBillingServer.ts` owns product-aware Firestore routing:

- MenuList payments use the existing default Firestore subscription DAL.
- Canonica payments use `canonicaFirestoreAdmin`.
- Canonica entitlement sync writes a compact `stores/{sId}.canonicaSubscription` summary and subscription `analyticsEntitlement`.

## API Behavior

All shared Razorpay routes accept optional `productId`.

- Missing `productId` means MenuList (`ML`) for backward compatibility.
- `productId: "CN"` resolves Canonica scope through `resolveCanonicaSessionScope()`.
- MenuList still uses `verifyTenantAccess()` and `canManageBillingMutation()`.
- Canonica uses `canUseCanonicaManagement()` and `productAccounts.CN` scope.

Webhook events derive product from Razorpay notes:

- `notes.productId`
- fallback default `ML`

This lets Razorpay keep one webhook URL while writing transaction/subscription data to the correct product database.

## UI

Canonica dashboard routes:

- `/canonica/billing`
- `/canonica/transactions`

The billing screen reuses shared MenuList billing components where useful:

- `ActiveSubscriptionCard`
- `PricingPlansModal`
- `CreditsPackModal`
- `BillingHistory`

Those components now accept product-aware props for labels, support route, usage route, plans, packs, and checkout names.

## Non-Goals

- No separate Razorpay account is introduced in this pass.
- No MenuList hardcoded Canonica widget/test flag is reintroduced.
- No Canonica-specific email lifecycle system is added; MenuList billing messages remain MenuList-only until Canonica messaging is explicitly designed.

