# Answerlattice Billing - Test Cases

> **Version:** 2.0.0
> **Last Updated:** 2026-08-24
> **Feature audit:** Feature 30 of 44

## Maintained Automated Gates

| Gate | Evidence |
| --- | --- |
| Checkout response and hosted URL contracts | `npm run test:answerlattice-billing-contracts` |
| Dedicated Answerlattice Firestore rules | `npm run test:answerlattice-billing:rules` |
| Shared-mode Firestore rules and MenuList preservation | `npm run test:answerlattice-billing:shared-rules` |
| Exact persisted scope and settlement boundaries | `npm run test:billing-settlement-boundaries` |
| Checkout lease concurrency and replay | `npm run test:billing-checkout-concurrency:emulator` |
| Shared coordination browser-denial rules | `npm run test:billing-coordination:rules` |
| Billing architecture source boundary | `npm run verify:billing-entitlement-boundary` |
| Answerlattice source aggregate | `npm run verify:answerlattice-runtime-truth` |
| Commercial system source aggregate | `npm run verify:answerlattice-commercial-readiness:source` |
| Regional pricing and tax snapshots | `npm run test:answerlattice-taxation-policy` |
| Invoice and credit-note numbering/PDF contracts | `npm run test:billing-documents` |

## Contract Cases

1. A provider subscription entity is projected to `{ subscription: { id } }`; notes, status, URLs, and unknown fields are omitted.
2. A provider top-up order is projected to `{ order: { id } }`; amount, notes, and unknown fields are omitted.
3. Browser parsers reject extra outer or nested provider fields.
4. Only exact `sub_[A-Za-z0-9]+` and `order_[A-Za-z0-9]+` identifiers pass.
5. HTTPS `rzp.io` subscription and invoice links pass; credentials, HTTP, alternate hosts, unusual ports, and non-HTTP schemes fail.
6. URL fragments are removed before storage or display.
7. Unsafe legacy invoice URLs are omitted from billing history.
8. Exact agreeing `pId/productId`, `tId/tenantId`, and `sId/storeId` aliases resolve to one authoritative Answerlattice billing scope.
9. If workspace B becomes current before workspace A's subscription or history read completes, A's result is discarded and B never renders A's billing state.
10. If the workspace changes while a support-credit checkout callback is pending, the callback does not patch the newly selected workspace's local balance.
11. Missing product identity, coercible string scope, or conflicting tenant/store aliases fail scope resolution.
12. Direct subscription reads and payment, lifecycle, and webhook transactions reject malformed persisted Answerlattice identity.
13. A rejected active-subscription read reaches a blocking Billing retry state; plan mutation remains disabled and false empty-account checkout is not shown.
14. Answerlattice onboarding refuses provisional user/store/tenant state whose `pId` and `productId` are incomplete or conflicting, does not reclaim an existing conflicting subscription, and does not cancel it during compensation.
15. Activation, license, paid-intake, client, and server fallback queries constrain both product aliases and both tenant/store alias pairs before any bounded limit; an exact row remains discoverable beside a conflicting row.
15. Emulator commands clear inherited Application Default Credentials so local proof cannot be redirected to a stale service-account file.
16. India billing resolves INR and the configured intra-state or inter-state GST treatment; non-India billing cannot enter USD checkout until international and export-tax settings are enabled.
17. A captured payment issues at most one Answerlattice invoice and a settled refund issues at most one linked Answerlattice credit note.
18. Billing-document counters and documents remain denied to direct browser reads and writes; authorized summaries and PDFs use the protected API.
19. Email delivery resolves billing email before owner/support fallback. WhatsApp delivery requires a verified number, consent, enabled provider sending, and an approved template.
20. Refund replay cannot duplicate a credit reversal, refund debt, credit note, notification, or provider-facing document delivery.
21. A pending checkout whose plan is no longer in the current catalogue offers **Choose Current Plan** rather than a broken resume action.
22. Selecting a different plan reuses no paid-upgrade carry-forward: a provider-created old checkout is cancelled and the exact unchanged pending row is expired before the new checkout; provider processing blocks the replacement; identical intent still reuses the existing checkout.
23. Retired-plan recovery is presented as a new purchase and does not promise transferable value or label the confirmation as an upgrade.
24. A new or retired-plan checkout without a tax snapshot collects a complete billing profile, normalizes it, and passes it through the existing checkout contract; cancelling the form performs no provider or Firestore mutation.

## Rule Cases

1. Owner and an active custom billing role can read exact-scope Answerlattice subscriptions and payment transactions.
2. Default Manager, another tenant, and conflicting `AL`/`ML` identity are denied.
3. Collection queries require explicit `pId == 'AL'` plus exact tenant/store scope.
4. Tenant browser writes to subscriptions and payment transactions are denied.
5. Answerlattice tenant reads of `topups` are denied.
6. Shared rules retain existing same-scope MenuList subscription, transaction, and top-up reads.
7. Dedicated and shared rules allow the six-field exact Answerlattice subscription query for an authorized billing role and return no conflicting-alias row.
8. Support-search provider admission rejects numeric-string/fractional subscription credits and coercible active status before provider work.
9. A replay with string units or malformed before/debit/after credit evidence rejects and leaves the subscription balance unchanged.
10. With one remaining credit, two concurrent pre-provider gates admit exactly one request; the rejected request performs no provider work and creates no reservation.
11. Provider-free and failed reserved requests refund once. An expired exact pointer is recovered by the scheduler, while malformed evidence restores nothing and remains visible for repair.
12. A stale preloaded subscription cannot reset credits after transaction-current product/workspace identity changes, and an existing reservation cannot renew after the current subscription becomes inactive.

## Provider And Hosted QA Cases

These are not replaced by source tests:

1. Create and complete one disposable monthly Answerlattice test subscription.
2. Close the browser after provider creation, then recover the exact checkout without creating a duplicate.
3. Complete one support-credit purchase and verify exactly-once credit application.
4. Replay the signed webhook and verify no duplicate entitlement, credit, or transaction effect.
5. Exercise payment failure, past-due, pause, resume, cancellation, and replacement upgrade.
6. Verify invoice links open only on the expected hosted provider domain.
7. Verify billing and transaction screens at desktop and narrow mobile width.
8. Confirm provider Dashboard, local subscription, store summary, and compact payment history agree.
9. Start Transactions reads in workspace A, switch to workspace B before either response settles, and confirm no A billing/support-credit row, cursor, selection, loading state, or error replaces B state.

When Razorpay Test Mode is unavailable, hosted product QA may use the repository-owned
`answerlattice:hosted-qa-entitlement` controller. The controller creates one
zero-value, time-limited, clearly labelled synthetic manual entitlement in
`neelvara-answerlattice-qa` only. It refuses production, emulator hosts, an
incorrect project confirmation, a missing/foreign workspace, an existing active
subscription, duplicate preparation, and cleanup of any document that does not
carry the exact fixture markers. Preparation temporarily binds the workspace's
compact subscription summary to the lease so every paid-operation gate observes
one consistent authority. The controller preserves the exact prior summary and
restores it during cleanup only when the workspace still points to the fixture;
a later real billing change is never overwritten. `repair-summary` safely upgrades
an older active fixture, and Firebase CLI reauthentication supplies a disposable
local ADC file without retaining another credential. It does not simulate checkout, payment,
webhooks, invoices, refunds, or provider certification. The fixture must be
removed after the hosted knowledge/retrieval/widget certification pass.

Official provider references checked on 2026-07-19:

- [Fetch an Invoice With ID](https://razorpay.com/docs/api/payments/invoices/fetch-with-id/) documents `short_url` as the customer payment link and shows the `https://rzp.io/i/...` shape.
- [Fetch Invoices for a Subscription](https://razorpay.com/docs/api/payments/subscriptions/fetch-invoices/) documents the subscription invoice retrieval surface.
- [Invoices Entity](https://razorpay.com/docs/api/payments/invoices/entity/?preferred-country=IN) defines the invoice response model. The pages did not expose a reliable material-update date in the fetched content, so access date is recorded instead.

## Stop Conditions

- Any cross-product or cross-workspace read.
- A browser response containing provider notes or customer/payment details.
- Duplicate subscription or credit application.
- Entitlement granted before signed payment evidence.
- A payment URL outside exact HTTPS `rzp.io`.
- A mutable provider test using live keys or non-disposable customer data.
