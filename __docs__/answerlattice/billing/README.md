# Answerlattice Billing

> **Version:** 1.1.0
> **Last Updated:** 2026-05-21
> **Audience:** Developers / Ops

Answerlattice billing uses the same Razorpay subscription and top-up infrastructure as MenuList, but every payment request carries `productId: 'AL'` and persists Answerlattice subscription, top-up, and transaction data in Answerlattice Firebase.

## Surfaces

- `/answerlattice/billing` — product owner billing dashboard
- `/answerlattice/transactions` — Answerlattice invoices, charges, and support credit purchases
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

Answerlattice requests must include `productId: 'AL'`. The backend resolves Answerlattice tenant/store scope from `productAccounts.AL` or Answerlattice-scoped session data and writes to Answerlattice Firebase.

Razorpay plan lookup keys are product-scoped. Answerlattice plans use `AL_...` lookup keys, while MenuList keeps the legacy lookup fallback for existing provider plans. Payment verification also normalizes `productId`, `pId`, `tenantId`, `storeId`, `tId`, and `sId` on the touched subscription document so old records do not lose product ownership metadata during balance or status updates.

## Key Files

- `src/lib/billing/productBillingPlans.ts`
- `src/lib/billing/productBillingServer.ts`
- `src/hooks/usePaymentHandler.ts`
- `src/components/templates/answerlattice/billing/AnswerlatticeBilling.tsx`
- `src/components/templates/answerlattice/billing/AnswerlatticeTransactions.tsx`
- `src/database/answerlattice/billing.ts`
- `src/constants/answerlattice/navigations.ts`

## Verification

- `npx tsc --noEmit --incremental false`
- Local dev route compile: `/answerlattice/billing` served HTTP 200 in Next dev logs.
- 2026-05-21 local Razorpay test-mode check: MenuList enhancement top-up completed end to end; Answerlattice support-credit order creation reached Razorpay checkout and wrote an Answerlattice-only pending `topups` document with `productId/pId: 'AL'` and tenant/store scope keys (`tenantId/tId` + internal `storeId/sId`).
