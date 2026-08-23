# Commercial Readiness Verification

> Verified: August 23, 2026
> Scope: Local source, policy, TypeScript, lint, documentation, and Firestore
> emulator evidence only

## Passed

- `npm run verify:menulist-commercial-readiness:source`
- All nine emulator suites from `verify:menulist-commercial-readiness` passed
  unchanged against an isolated temporary Firestore emulator on port `8180`.
  The aggregate command itself could not claim its default port `8080` because
  a separate Answerlattice emulator was already using it; that process was not
  interrupted.
- `npx tsc --noEmit`
- Focused ESLint for the changed billing, provider-route, policy, and
  verification files
- `npm run verify:website-public-copy-boundary`
- `npm run verify:three-product-legal-boundary`
- `git diff --check`
- Documentation scan: zero broken links

The full commercial gate includes pricing, checkout authority, purchase intent,
plan scope, settlement, Content Credits, billing documents, taxation,
commercial identity, environment parity, Razorpay lifecycle, AI capacity,
Firestore rules, concurrency, provider-plan registry, webhook leases,
cross-product scope, and reseller settlement.

The August 23 pass additionally verified that:

- `refund.processed` is the only per-refund accounting authority;
- partial and full Pack refunds reverse proportional purchased credits exactly
  once, including credits frozen during a subscription lapse;
- consumed refunded credits become internal refund debt and a later Pack clears
  that debt before increasing usable credits;
- `paid`, `partially_refunded`, and `refunded` top-ups are immutable replay
  states, so delayed paid events cannot add credits again;
- both webhook and authenticated verification paths apply the same replay and
  refund-debt rules;
- provider-updated multi-location quantity must remain valid for the current
  MenuList plan; and
- billing document counters and cumulative credit-note totals admit exact safe
  integers rather than coercing stored values.

## Pending external evidence

`npm run smoke:razorpay-sandbox-readonly` stopped fail-closed because the local
environment does not contain a configured Razorpay test key. No provider
mutation was attempted. The founder/provider tasks in
`__docs__/owner-action-items.md` remain open.

Billing-document issuance, billing-document email, international checkout, and
export zero-rating remain disabled until the owner/accountant confirms the
legal seller identity and address, GST status/GSTIN, SAC, invoice and
credit-note series, authorised-signatory treatment, LUT/export wording,
exchange-rate treatment, e-invoicing applicability, Razorpay invoice-email
configuration, and retention/cancelled-document policy.

No Vercel deployment was requested or run. No Firebase infrastructure changed
in this certification pass, so no Firebase deployment was required.

## Documentation health note

The documentation scanner found zero broken links and reported 62 existing
uppercase filenames under tracked video-production folders. None is in the new
commercial-readiness documentation set.
