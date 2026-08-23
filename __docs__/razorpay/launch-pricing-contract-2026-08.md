# MenuList Launch Pricing Contract

**Status:** Current pre-launch contract
**Decision date:** August 22, 2026

## Commercial truth

| Public plan | Internal plan ID | INR monthly | INR annual | USD monthly | USD annual | Checkout quantity |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Official | `menulist_official` | ₹599 | ₹5,990 | $29 | $290 | 1 |
| Pro | `menulist_pro` | ₹1,499 | ₹14,990 | $79 | $790 | 1 |
| Multi-location | `menulist_multi_location` | ₹1,499 per active location | ₹14,990 per active location | $79 per active location | $790 per active location | Minimum 2 |

Annual billing equals ten monthly payments. The public pricing page must describe this as two months included, not as an unverified percentage or daily-price anchor.

## Naming and lifecycle boundaries

- Official uses persisted billing ID `menulist_official`.
- Pro uses persisted billing ID `menulist_pro`.
- Multi-location uses persisted billing ID `menulist_multi_location`.
- The seven-day setup is not a paid plan. It lets the owner prepare, publish, and review the customer link before choosing paid continuity.
- Official and Pro are single-location direct subscriptions. Multi-location is the direct plan that can purchase more than one location.
- Reseller/manual prepaid capacity remains a separate billing mode and is not forced through the direct Multi-location checkout.
- Direct subscription documents store `amount` as the per-location unit price in the smallest currency unit and store paid location capacity separately in `quantity`. Cycle totals are `amount × quantity`.
- Credits, enhancement packs, invoices, and reseller commercial pricing are outside this decision. MenuList tax calculation is governed separately by `__docs__/billing-taxation/README.md`; plan prices in this contract remain tax-exclusive.

## Internal billing identity

Internal plan IDs are immutable, product-namespaced runtime billing and entitlement contracts, separate from public plan names. MenuList API plans use `menulist_api_starter` and `menulist_api_pro`. Unnamespaced IDs are not accepted as aliases.

## Source contracts

- Plan prices and stable IDs: `src/data/PlatformPlansList.ts`
- Quantity rules: `src/lib/billing/menulistPricingPolicy.ts`
- Website plan presentation: `src/components/website/pricing-pages/`
- Owner checkout and upgrade flow: `src/hooks/usePaymentHandler.ts`
- New-owner checkout: `src/app/api/onboarding/create-subscription/route.ts`
- Existing-owner checkout: `src/app/api/razorpay/create-subscription/route.ts`
- Direct outlet admission: `src/app/api/outlets/create/route.ts`

## Verification

Run:

```bash
npm run test:menulist-pricing-policy
npm run test:purchase-intent-boundary
npm run test:onboarding-subscription-boundary
npm run test:billing-settlement-boundaries
npm run verify:onboarding-subscription-boundary
npx tsc --noEmit
```

Provider sandbox checkout, authenticated desktop/mobile billing QA, and deployed-host smoke remain release evidence. This source change does not deploy Vercel.
