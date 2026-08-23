# MenuList Billing Taxation

This feature owns the tax calculation and settlement-admission boundary for direct MenuList owner subscriptions and content-enhancement packs. It does not own invoice rendering, credit-note rendering, provider settlement processing, reseller-assisted billing, pricing, or Content Credit accounting.

Invoice numbering, immutable document records, credit notes, authenticated PDFs, and delivery are owned by [`__docs__/billing-documents/`](../billing-documents/README.md). The document layer consumes the frozen tax snapshot from this feature and does not recalculate historical tax.

## Source of truth

- Tax policy: `src/data/shared/billingTaxPolicy.ts`
- Server supplier configuration: `src/lib/billing/menulistTaxServer.ts`
- Billing-profile validation: `src/lib/validation/apiSchemas.ts`
- Subscription checkout: `src/app/api/onboarding/create-subscription/route.ts` and `src/app/api/razorpay/create-subscription/route.ts`
- Pack checkout: `src/app/api/razorpay/create-topup-order/route.ts`
- Environment contract: `.env.staging.example` and `.env.production.example`

## Non-negotiable decisions

- Code and checkout use verified billing details, never the public business GSTIN/address fields.
- MenuList computes tax on the server. Provider notes and client amounts are not tax authority.
- `amount` remains the net subscription unit price. `chargedUnitAmount` preserves the provider charge per unit. The subscription `taxSnapshot` represents current billing terms and resizes totals when outlet quantity changes without recalculating its unit tax policy.
- Transaction/invoice records freeze their own tax snapshot. A later quantity change must not rewrite historical invoice evidence.
- Domestic INR supplies use 18% GST: CGST/SGST for same-state supplies and IGST for inter-state supplies.
- International USD checkout is fail-closed unless the merchant explicitly enables international checkout, zero-rated export treatment, and a verified LUT reference.
- Included Content Credits are part of the subscription supply. Purchased enhancement packs use their own taxable checkout snapshot.
- Legal supplier name, GSTIN, registered address, state code, SAC, LUT, and foreign tax obligations must not be guessed in code.
- Reseller online and offline billing stay outside this direct-owner tax boundary until their payer, invoice issuer, and collection responsibilities have a dedicated reviewed contract.

See the sibling documents for implementation, owner guidance, Firebase/cost, website copy, mobile, and test coverage.

Cross-system certification is maintained in
[`__docs__/commercial-readiness/`](../commercial-readiness/README.md).
