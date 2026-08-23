# Commercial Readiness Implementation

## Authority map

- Plans: `src/constants/menulistPlans.ts`
- Credits: `src/data/shared/contentCreditPolicy.ts`
- Tax: `src/data/shared/billingTaxPolicy.ts`
- Commercial identity: `src/constants/menulist/commercialIdentity.ts`
- Settlement: `src/lib/billing/productBillingServer.ts` and
  `src/lib/billing/topupSettlementServer.ts`
- Billing documents: `src/lib/billing/billingDocumentServer.ts`
- Provider lifecycle: `src/app/api/razorpay/webhook/route.ts`
- Runtime configuration: `src/lib/env/menulistServerEnv.ts`

## Refund authority and purchased-credit reversal

- Only Razorpay `refund.processed` is accounting authority for a refund. The
  `payment.refunded` payment snapshot is cumulative provider state and cannot
  create one movement or credit note per refund.
- A processed refund first records the exact provider refund identity, then
  checks whether its payment belongs to one settled MenuList top-up. Subscription
  refunds leave the top-up ledger unchanged.
- Top-up refunds use `topups/{orderId}/refunds/{refundId}` for exact replay,
  update cumulative refund totals, and reverse the proportional cumulative
  purchased-credit share from the active or cancellation-frozen balance.
- Credits already consumed become an internal `topUpCreditRefundDebt`; later
  pack purchases clear that debt before adding usable purchased credits. Owners
  never receive a negative visible credit balance.
- Provider quantity updates must still satisfy the selected MenuList plan's
  quantity policy before tax, allowance, MRR, or subscription state changes.

## Verification entrypoints

`verify:menulist-commercial-readiness:source` runs deterministic source and
policy tests. `verify:menulist-commercial-readiness` adds Firestore emulator
coverage for capacity, plans, concurrency, registry, lifecycle, leases,
coordination, product scope, and reseller settlement.

The Razorpay sandbox smoke remains separate because it requires real test-mode
provider credentials and network access. It performs read-only inventory calls
and a local webhook-signature self-test; it never creates or changes provider
objects.
