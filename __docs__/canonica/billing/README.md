# Canonica Billing

> **Version:** 1.1.0
> **Last Updated:** 2026-05-21
> **Audience:** Developers / Ops

Canonica billing uses the same Razorpay subscription and top-up infrastructure as MenuList, but every payment request carries `productId: "CN"` and persists Canonica subscription, top-up, and transaction data in Canonica Firebase.

## Surfaces

- `/canonica/billing` — product owner billing dashboard
- `/canonica/transactions` — Canonica invoices, charges, and support credit purchases
- Shared Razorpay APIs:
  - `/api/razorpay/create-subscription`
  - `/api/razorpay/verify-subscription`
  - `/api/razorpay/create-topup-order`
  - `/api/razorpay/verify-topup`
  - `/api/razorpay/cancel-subscription`
  - `/api/razorpay/pause-subscription`
  - `/api/razorpay/resume-subscription`
  - `/api/razorpay/upgrade-subscription`
  - `/api/razorpay/webhook`

## Product Boundary

MenuList remains the default billing product. Requests without `productId` continue to behave as MenuList payments.

Canonica requests must include `productId: "CN"`. The backend resolves Canonica tenant/store scope from `productAccounts.CN` or Canonica-scoped session data and writes to Canonica Firebase.

Razorpay plan lookup keys are product-scoped. Canonica plans use `CN_...` lookup keys, while MenuList keeps the legacy lookup fallback for existing provider plans. Payment verification also normalizes `productId`, `pId`, `tenantId`, `storeId`, `tId`, and `sId` on the touched subscription document so old records do not lose product ownership metadata during balance or status updates.

## Key Files

- `src/lib/billing/productBillingPlans.ts`
- `src/lib/billing/productBillingServer.ts`
- `src/hooks/usePaymentHandler.ts`
- `src/components/templates/canonica/billing/CanonicaBilling.tsx`
- `src/components/templates/canonica/billing/CanonicaTransactions.tsx`
- `src/database/canonica/billing.ts`
- `src/constants/canonica/navigations.ts`

## Verification

- `npx tsc --noEmit --incremental false`
- Local dev route compile: `/canonica/billing` served HTTP 200 in Next dev logs.
- 2026-05-21 local Razorpay test-mode check: MenuList enhancement top-up completed end to end; Canonica support-credit order creation reached Razorpay checkout and wrote a Canonica-only pending `topups` document with `productId/pId: "CN"` and tenant/store scope keys (`tenantId/tId` + internal `storeId/sId`).
