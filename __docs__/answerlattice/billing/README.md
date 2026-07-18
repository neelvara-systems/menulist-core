# Answerlattice Billing

> **Version:** 1.3.0
> **Last Updated:** 2026-07-14
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

Subscription and support-credit creation share only MenuList's server-owned Razorpay coordination collections because both products use one provider account and plan namespace. The product/workspace-scoped lease retains provider recovery identity and a two-minute completed replay checkpoint, while all Answerlattice subscription, top-up, transaction, entitlement, and usage truth remains in Answerlattice Firebase. Browser access to the central coordination collections is denied.

Razorpay plan lookup keys are product-scoped. Answerlattice plans use `AL_...` lookup keys, while MenuList keeps the legacy lookup fallback for existing provider plans. Payment verification also normalizes `productId`, `pId`, `tenantId`, `storeId`, `tId`, and `sId` on the touched subscription document so old records do not lose product ownership metadata during balance or status updates.

## Authorization Boundary

The billing and transactions surfaces require `canManageBilling`. Every authenticated Answerlattice Razorpay mutation re-resolves the current workspace store, user membership, and persisted role; a default Manager, Support Staff user, inactive custom role, or stale session role cannot create or verify subscriptions/top-ups or cancel, pause, resume, or upgrade a subscription. An active custom role may perform those actions only when its current persisted permissions explicitly grant `canManageBilling`. Creation routes apply their existing per-user/workspace rate limit before these authorization reads, and every route completes authorization before provider or financial reads/writes.

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

The transactions screen loads billing history and the first bounded support-credit-usage page independently, shows plain owner-facing failures for the failed section, and retains the successful section. Additional usage rows use cursor pagination and a guarded load-more state; desktop and mobile render the same underlying records.

Answerlattice App Billing Document ID Boundary: shared product-billing adapters, client active-subscription/history reads, onboarding, Knowledge Intake, and AI accounting use `src/lib/answerlattice/billingDocumentIdBoundary.ts` for strict subscription/ledger IDs and exact positive numeric tenant/store scope before refs, filters, cache keys, or writes. Whitespace-mutated, reserved, empty, path-shaped, decimal, zero, negative, unsafe, or nonnumeric identifiers fail. Store-summary fallback is accepted only when it is current and matches the requested workspace; embedded IDs cannot replace Firestore document IDs.

## Verification

- `npx tsc --noEmit --incremental false`
- `npm run verify:billing-entitlement-boundary`
- `npm run test:billing-checkout-concurrency:emulator`
- `npm run test:billing-coordination:rules`
- `npm run verify:answerlattice-runtime-truth`
- `npm run test:answerlattice-access-user-scope`
- Local dev route compile: `/answerlattice/billing` served HTTP 200 in Next dev logs.
- 2026-05-21 local Razorpay test-mode check: MenuList enhancement top-up completed end to end; Answerlattice support-credit order creation reached Razorpay checkout and wrote an Answerlattice-only pending `topups` document with `productId/pId: 'AL'` and tenant/store scope keys (`tenantId/tId` + internal `storeId/sId`).
