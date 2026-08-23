# Commercial Readiness Specification

## Objective

Certify that every MenuList charge maps to one canonical product, plan,
quantity, currency, entitlement, credit allowance, tax snapshot, supplier
identity, provider event, and applicable billing document without relying on
display labels or mutable provider state.

## Required invariants

1. Public plan labels may change; canonical namespaced IDs do not.
2. Multi-location quantity is explicit and never inferred after settlement.
3. Content Credits reserve before provider work and settle exactly once.
4. Paid access activates only from a verified captured payment or supported
   subscription activation event.
5. Duplicate checkout, payment, webhook, refund, invoice, and credit-note events
   are idempotent.
6. Domestic tax, export treatment, and supplier identity fail closed when
   required configuration is unverified.
7. Issued invoices and credit notes are immutable accounting evidence.
8. MenuList and Answerlattice billing records cannot cross product or tenant
   boundaries.
9. QA and production use the same schema and policy with separate credentials.

## External approval boundary

The founder/accountant must verify the legal supplier identity, GST status,
GSTIN/address/state, SAC, e-invoicing status, signatory treatment, LUT/export
wording, exchange-rate treatment, and provider email settings before enabling
the corresponding runtime gates.
