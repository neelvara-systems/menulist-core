# Answerlattice Billing

> **Version:** 2.0.1
> **Last Updated:** 2026-07-19
> **Audience:** Developers / Ops
> **Feature audit:** Feature 30 of 44

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

Checkout creation returns only the validated provider subscription or order ID required by Razorpay Checkout. Provider notes, status, customer data, URLs, amounts, and future unknown fields stay server-side. The browser rejects response fields outside that minimal contract.

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

Answerlattice support-search credit accounting is exact and fail closed. Subscription loading preserves malformed runtime credit values for rejection instead of converting them. Provider admission, monthly reset, debit and idempotent replay accept only nonnegative safe-integer balances/allowances, positive safe-integer paid units, exact active state, and complete arithmetic-consistent debit evidence. A numeric string, fraction, overflow, coercible status, mismatched unit or tampered balance row cannot authorize provider work or return a successful replay.

The credit is reserved in the subscription transaction immediately before the first support-search provider call. A deterministic protected operation shell and root `answerlattice_aiCapacityReservations` recovery pointer make concurrent admission exact. Current product/workspace/status is checked again inside reset and reservation transactions, so stale subscription objects cannot reset credits or renew provider admission. Successful settlement removes the pointer; a provider-free or failed request refunds it; and the existing hourly `answerlatticeNightly` master scheduler processes bounded expired pointers so a process crash cannot strand the balance. The pointer is server-only/default-denied in both Firebase rule sets.

The Billing screen uses stable `answerlattice_billing_*` failure codes and bounded tenant/store presence-length context. It does not log raw exceptions, provider entities, or workspace identifiers.

Active-subscription read failure is not presented as an empty account. The DAL rethrows the bounded read failure, and the Billing screen clears unverified financial state, disables plan mutation, shows a blocking retry alert, and restores normal actions only after the current billing state is loaded successfully.

Subscription and invoice links pass the same exact hosted-payment boundary: HTTPS, exact `rzp.io`, no credentials, no unexpected port, and no fragment. Unsafe legacy invoice links are omitted.

## Maintained Documents

- [Specification](./answerlattice-billing_spec.md)
- [Implementation](./answerlattice-billing_impl.md)
- [Firebase and cost](./answerlattice-billing_firebase.md)
- [Test cases](./answerlattice-billing_test-cases.md)
- [Owner help](./answerlattice-billing_helpdoc.md)
- [Marketing boundary](./answerlattice-billing_marketing.md)
- [Website boundary](./answerlattice-billing_website.md)
- [Mobile support](./answerlattice-billing_mobile-support.md)

## Verification

- `npx tsc --noEmit --incremental false`
- `npm run verify:billing-entitlement-boundary`
- `npm run test:answerlattice-billing-contracts`
- `npm run test:answerlattice-billing:rules`
- `npm run test:answerlattice-billing:shared-rules`
- `npm run test:billing-checkout-concurrency:emulator`
- `npm run test:billing-coordination:rules`
- `npm run verify:answerlattice-runtime-truth`
- `npm run test:answerlattice-access-user-scope`
- Local dev route compile: `/answerlattice/billing` served HTTP 200 in Next dev logs.
- 2026-05-21 local Razorpay test-mode check: MenuList enhancement top-up completed end to end; Answerlattice support-credit order creation reached Razorpay checkout and wrote an Answerlattice-only pending `topups` document with `productId/pId: 'AL'` and tenant/store scope keys (`tenantId/tId` + internal `storeId/sId`).
