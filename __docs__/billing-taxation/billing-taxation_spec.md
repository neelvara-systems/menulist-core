# Billing Taxation Specification

## Goal

Charge the correct server-calculated gross amount while preserving the customer billing identity, supplier identity, place-of-supply decision, tax treatment, net amount, tax components, and gross amount needed for current billing terms and later immutable transaction documents.

## Admission

Every direct MenuList owner subscription or enhancement-pack checkout requires:

1. A validated billing profile.
2. A currency compatible with billing country (`INR` for India, `USD` outside India).
3. Verified merchant configuration.
4. A positive integer base amount and quantity.

Public business profile fields are not accepted as billing identity.

Reseller-assisted billing is a separate commercial contract. Online reseller subscriptions and reseller-collected offline prepaid transactions are not admitted through this direct-owner tax boundary until the reseller payer, tax-invoice issuer, and collection responsibilities are explicitly documented and implemented. This feature must not reuse a public business profile or silently treat the reseller as the billed customer.

## Domestic policy

- Tax rate: 18% (`1800` basis points).
- Same GST state code as supplier: CGST + SGST.
- Different Indian GST state code: IGST.
- Optional customer GSTIN must match the selected state code.
- Provider subscription plan/order amount is gross; MenuList plan and revenue amount remains net.

## Export policy

- Currency is USD.
- Checkout is unavailable until international checkout, zero-rated export treatment, and a LUT reference are all configured.
- A zero-rated snapshot records `destinationTaxStatus: merchant_review_required`; it is not a claim that no foreign indirect-tax obligation exists.

## Snapshot contract

The calculation freezes policy version, merchant entity, supplier legal identity and GST data, customer billing profile, supply classification, tax treatment, net/tax/gross unit amounts, currency, and quantity. The subscription copy represents current provider billing terms: outlet quantity changes resize totals from its frozen unit amounts. Each later invoice or credit note must persist its own transaction snapshot rather than recalculating or depending on the mutable current subscription quantity.

## Failure behavior

- Invalid customer billing details: HTTP 400.
- Missing or invalid merchant tax configuration: HTTP 503 with a non-sensitive customer message.
- No provider subscription/order or tenant onboarding may begin before tax admission succeeds.
- Captured MenuList subscription payments must match the stored gross amount and currency before entitlement activation.
- Billing addresses and tax IDs must never be included in provider notes, logs, public projections, or analytics payloads.

## Quantity adjustments

Razorpay can create prorated invoices or credit notes for immediate subscription quantity changes. The subscription snapshot tracks the new full-cycle quantity. The billing-document boundary must preserve the actual provider adjustment amount and create a separate transaction tax snapshot; it must not label the full-cycle total as the prorated charge.

## External suggestion review

- **Keep:** server calculation, immutable snapshots, place-of-supply split, taxable packs, LUT gating, separate net and gross amounts.
- **Change:** foreign customers are not automatically tax-free; exports remain gated and marked for destination-tax review.
- **Reject:** Razorpay add-ons as the tax mechanism because current Razorpay subscription guidance deprecates add-ons.
- **Reject:** guessed legal entity, GSTIN, registered address, SAC, or LUT values.
