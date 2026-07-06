# Answerlattice Billing

> **Version:** 1.1.1
> **Last Updated:** 2026-07-05
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

## Diagnostics Boundary

Answerlattice transactions raw load-reason diagnostics boundary: `/answerlattice/transactions` keeps fixed owner-facing load failure copy and logs billing-history, support-credit usage, and load-more failures through stable runtime diagnostic codes with bounded tenant/store presence-length metadata only. Raw rejected Promise reasons, provider messages, exception messages, tenant IDs, store IDs, transaction rows, and AI operation rows must not be passed to browser diagnostics.

Answerlattice App Billing Document ID Boundary: shared product-billing adapter create/update/get-by-id/entitlement refs, active-subscription reads, self-service onboarding subscription creation, Knowledge Intake active-license checks, Knowledge Intake support-credit ledger settlement, and AI accounting credit refresh/consumption normalize subscription and intake-usage ledger document IDs through `src/lib/answerlattice/billingDocumentIdBoundary.ts` before Firestore refs. Malformed, reserved, empty, or path-shaped subscription IDs fall back to the store summary or capped tenant/store query where a fallback exists, or fail before onboarding/credit-debit/mutation document refs where no safe fallback exists; malformed ledger IDs return before finalize/refund refs.

## Verification

- `npx tsc --noEmit --incremental false`
- Local dev route compile: `/answerlattice/billing` served HTTP 200 in Next dev logs.
- 2026-05-21 local Razorpay test-mode check: MenuList enhancement top-up completed end to end; Answerlattice support-credit order creation reached Razorpay checkout and wrote an Answerlattice-only pending `topups` document with `productId/pId: 'AL'` and tenant/store scope keys (`tenantId/tId` + internal `storeId/sId`).
