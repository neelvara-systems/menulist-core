# MenuList Launch Pricing Contract

**Status:** Current pre-launch contract
**Decision date:** August 22, 2026

## Commercial truth

| Public plan | Internal plan ID | INR monthly | INR annual | USD monthly | USD annual | Checkout quantity |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Official | `starter` | ₹599 | ₹5,990 | $29 | $290 | 1 |
| Pro | `pro` | ₹1,499 | ₹14,990 | $79 | $790 | 1 |
| Multi-location | `premium` | ₹1,499 per active location | ₹14,990 per active location | $79 per active location | $790 per active location | Minimum 2 |

Annual billing equals ten monthly payments. The public pricing page must describe this as two months included, not as an unverified percentage or daily-price anchor.

## Naming and lifecycle boundaries

- Public `Official` maps to stable internal ID `starter`.
- Public `Multi-location` maps to stable internal ID `premium`.
- The seven-day setup is not a paid plan. It lets the owner prepare, publish, and review the customer link before choosing paid continuity.
- Official and Pro are single-location direct subscriptions. Multi-location is the direct plan that can purchase more than one location.
- Reseller/manual prepaid capacity remains a separate billing mode and is not forced through the direct Multi-location checkout.
- Credits, enhancement packs, taxes, invoices, and reseller commercial pricing are outside this decision.

## Pre-launch data decision

MenuList is not live. This contract is fresh launch truth. Do not add:

- backfill jobs;
- old-price migrations;
- grandfathered plans;
- compatibility aliases beyond the intentionally stable plan IDs;
- dual-read or dual-write logic for a previous public pricing model.

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
npx ts-node --project tsconfig.scripts.json scripts/verification/test-menulist-pricing-policy.ts
npx ts-node --project tsconfig.scripts.json scripts/verification/test-purchase-intent-boundary.ts
npx ts-node --project tsconfig.scripts.json scripts/verification/test-onboarding-subscription-boundary.ts
npx tsc --noEmit
```

Provider sandbox checkout, authenticated desktop/mobile billing QA, and deployed-host smoke remain release evidence. This source change does not deploy Vercel.
