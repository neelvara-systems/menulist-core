# Answerlattice Billing - Specification

> **Version:** 2.0.0
> **Last Updated:** 2026-08-24
> **Feature audit:** Feature 30 of 44  
> **Status:** Source-hardened; deployed QA and mutable provider evidence remain separate

## Customer Job

An authorized Answerlattice workspace owner must be able to choose a paid plan, recover an interrupted checkout, purchase support credits, see the current entitlement, inspect payment history, and change the subscription without crossing product or workspace boundaries.

## Owned Flow

```text
plan or pack selection
-> current workspace and billing-permission admission
-> provider checkout identity
-> local pending record
-> signed verification or webhook recovery
-> transactional subscription/credit application
-> store entitlement summary
-> billing and transaction history
-> cancellation, pause, resume, upgrade, or retry
```

## Required Contracts

1. Every Answerlattice mutation carries exact `productId: 'AL'`.
2. Current persisted `canManageBilling` authority is checked before provider or financial work.
3. The provider account and central coordination primitives may be shared with MenuList, but Answerlattice financial truth remains in Answerlattice Firebase.
4. Provider subscription and order entities are server-only. Create routes return only validated `sub_...` or `order_...` identifiers.
5. Browser success responses are strict and reject unknown fields.
6. Subscription and invoice links are accepted only as credential-free HTTPS URLs on exact host `rzp.io`; fragments are removed.
7. Browser reads require exact Answerlattice product and workspace scope. Billing mutations remain server-owned.
8. Payment, webhook, replacement, and support-credit application is idempotent and transaction-serialized.
9. Payment pending does not grant paid entitlement.
10. Owner diagnostics use fixed codes and bounded presence/length metadata, never raw provider payloads or workspace identifiers.
11. A failed active-subscription read must block plan mutation and show explicit retry; it must not be interpreted as proof that no subscription exists.
12. Direct Answerlattice subscription reads and transaction-owned payment, lifecycle, and webhook mutations reject persisted records whose exact product, tenant, or store aliases are missing, nonnumeric, or conflicting.
13. Billing country, not a browser currency selector, determines INR or USD pricing. International checkout fails closed until its source configuration is explicitly enabled.
14. Checkout stores one immutable billing profile and calculated tax snapshot before provider creation; settlement reconciles that snapshot with the captured provider amount.
15. Signed webhook settlement is the authority for entitlement, paid credits, invoices, refunds, and credit notes. Browser callbacks cannot issue financial truth.
16. Billing documents are product-scoped, server-created, immutable, sequentially numbered, and readable only through protected APIs.
17. A settled refund reverses refundable credits exactly once and issues one linked credit note when legal document issuance is configured.
18. Invoice and credit-note delivery is email-first when a valid recipient exists. WhatsApp additionally requires a verified owner number, explicit notification consent, configured provider credentials, and an approved billing-document template.

## State Expectations

| State | Customer meaning | Allowed behavior |
| --- | --- | --- |
| `pending` | Checkout exists but payment is not confirmed | Resume the exact safe current-plan checkout. If its plan is retired, choose a current plan; the server must terminally reconcile the unpaid provider checkout before creating another. |
| `active` | Paid entitlement is current | Use plan and purchased support credits |
| `past_due` | Provider retry or grace handling is in progress | Explain recovery; do not invent a successful renewal |
| `paused` | Recurring collection is paused | Preserve governed history and explicit resume path |
| `cancelled` | Renewal is cancelled | Preserve paid-cycle access only when the retained cycle proves it |
| `expired` / `completed` | No current recurring entitlement | Require a new approved checkout |

## Security And Privacy

- Dedicated and shared Firestore rules require `canManageBilling` for Answerlattice subscription and transaction reads.
- Queries include `pId == 'AL'` plus exact tenant/store filters so rules can prove product and workspace scope.
- `topups` have no Answerlattice tenant browser-read path. Checkout creation, verification, webhook recovery, and settlement are server-owned.
- Provider notes, customer details, raw invoice data, keys, payment instruments, and webhook payloads are not returned by checkout-creation responses.
- Existing global payment, auth, rate-limit, input-validation, and monitoring controls remain authoritative.

## Acceptance Criteria

- Strict response and URL contract tests pass.
- Dedicated and shared Firestore rule emulators pass positive and negative role, tenant, product, query, and write cases.
- The billing source verifier and Answerlattice runtime source verifier pass.
- Both history indexes include `pId` before event/workspace/date fields.
- Valid MenuList billing reads remain accepted in shared rules.
- Root TypeScript and focused lint pass.
- Shared settlement tests cover exact persisted Answerlattice record-scope resolution and rejection.
- QA rules and indexes are deployed or the exact external blocker is recorded.
- Real Razorpay sandbox subscription, top-up, webhook, interrupted-browser, and failure-compensation evidence remains explicitly external until run.

## Non-Goals

- A second payment provider.
- Browser access to provider entities or top-up documents.
- A full accounting system.
- Owner-initiated provider refund execution from the Answerlattice browser. Signed provider refund settlement and linked credit-note handling are supported server-side.
- Automatic account-changing actions outside the registered payment routes.
- Claims of production payment readiness from source tests alone.
