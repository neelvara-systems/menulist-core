# Commercial Identity Implementation

## Sources

- `src/constants/menulist/commercialIdentity.ts` owns public product/operator
  and processor wording.
- `src/lib/env/menulistServerEnv.ts` owns server-only billing identity inputs.
- `src/lib/billing/menulistTaxServer.ts` composes the supplier configuration.
- `src/data/shared/billingTaxPolicy.ts` rejects unverified or incomplete legal
  identity before calculating a tax snapshot.
- Billing documents render the immutable supplier identity frozen in the tax
  snapshot; they do not read mutable public brand copy.

## Activation Gate

`MENULIST_BILLING_LEGAL_IDENTITY_VERIFIED` defaults to `false` in QA and
production templates. It may become `true` only after the legal supplier name,
registered address, GST details, merchant record, and authority are matched to
current evidence and approved by the owner/accountant.

## Failure Behavior

Missing verification or mismatched supplier data raises a
`BillingTaxConfigurationError`. Checkout and billing-document issuance remain
closed; no fallback product or trade name is substituted.
