# MenuList Pricing Strategy

**Status:** Current launch strategy
**Last updated:** August 22, 2026
**Commercial source:** [MenuList launch pricing contract](../razorpay/launch-pricing-contract-2026-08.md)

## Pricing objective

MenuList is priced as the owner-controlled source for customer-facing menu and business information. Pricing must remain understandable to a non-technical SMB owner, cover ongoing infrastructure and assisted-content costs, and scale predictably when a business adds locations.

MenuList is not priced per QR scan, menu item, customer visit, or ordinary owner update. Those models create uncertainty and punish normal use.

## Launch plans

| Plan | Monthly | Annual | Location capacity | Best fit |
| --- | ---: | ---: | ---: | --- |
| Official | ₹599 / $29 | ₹5,990 / $290 | 1 | One business that needs one trusted customer link, QR, public page, and owner-approved updates |
| Pro | ₹1,499 / $79 | ₹14,990 / $790 | 1 | One business that needs stronger presentation, AI Menu Manager, languages, images, and owner controls |
| Multi-location | ₹1,499 / $79 per location | ₹14,990 / $790 per location | Minimum 2 | Businesses that need shared governance with location-level control |

Annual billing equals ten monthly payments. Public copy describes this as **two months included**.

## Setup access

The seven-day setup is an onboarding state, not a subscription plan.

During setup, an owner can prepare, publish, and review the customer-facing link. A paid plan must be active before the setup deadline to keep the same URL live afterward. The website and product must not describe setup access as a free tier, free plan, trial plan, or paid Official access.

## Plan roles

### Official

Official is the simplest complete paid plan for one location. It must provide a credible customer-facing outcome rather than function as crippleware.

Core value:

- One official customer link
- QR-ready public menu and business page
- Owner review before publishing
- Basic customer activity
- Included capacity for supported content preparation

### Pro

Pro is the recommended single-location plan. It adds capabilities that reduce owner effort or improve presentation without changing the core public-source promise.

Core value:

- AI Menu Manager
- Expanded content and project capacity
- Descriptions, images, and customer languages
- Stronger presentation and owner controls
- Action summaries and supported discovery settings

### Multi-location

Multi-location is priced per active location and starts at two locations. It is for businesses that need one governed source with outlet-level flexibility.

Core value:

- Shared menu governance
- Location-level prices, availability, and public pages
- Location-scoped AI Menu Manager actions
- Priority support and multi-location controls
- Predictable cost as locations are added

## Commercial rules

- Show all three plans with transparent monthly and annual prices.
- Default the public pricing page to annual billing while keeping the interval switch obvious and reversible.
- Show the minimum two-location total and per-location unit price for Multi-location.
- Keep Official and Pro checkout quantity fixed at one.
- Keep Multi-location checkout quantity at two or more.
- Do not advertise percentage savings when the exact promise is two months included.
- Do not use artificial urgency, fake comparison prices, unverified revenue claims, or hidden mandatory fees.
- Do not describe normal menu publishing, QR opens, or customer visits as metered usage.

## Currency policy

- INR is the default for India time zones.
- USD is available for international buyers.
- INR and USD prices are independent commercial prices, not live exchange-rate conversions.
- Store and provider amounts use the smallest currency unit.

## Billing data contract

The public plan names and persisted billing IDs are separate concerns:

| Public plan | Persisted billing ID |
| --- | --- |
| Official | `menulist_official` |
| Pro | `menulist_pro` |
| Multi-location | `menulist_multi_location` |

Direct subscription documents store the per-location unit amount in `amount` and paid location capacity in `quantity`. The cycle total is `amount × quantity`.

Official and Pro are direct single-location subscriptions. Multi-location is the direct plan that supports quantity above one. Manual reseller/prepaid capacity remains a separate billing mode.

## Product boundaries

The following are separate commercial decisions and must not be inferred from this strategy:

- Content Credit Pack pricing
- Tax collection and tax-inclusive display (owned by `__docs__/billing-taxation/`)
- Razorpay invoice presentation
- Reseller pricing
- Enterprise procurement
- Refund policy

Each requires its own approved contract before implementation or public claims change. Billing taxation now has that contract; invoice presentation remains separate.

## Conversion guidance

The pricing page should answer four owner questions quickly:

1. What will customers receive?
2. What can I manage from my phone?
3. What changes between Official, Pro, and Multi-location?
4. What happens after the seven-day setup?

The primary CTA should lead to creating the customer link. Plan cards should use owner outcomes and clear limitations, not internal feature names or technical billing language.

## Validation requirements

Before launch approval, verify:

- Canonical prices and quantities in `src/data/PlatformPlansList.ts`
- Website plan names and pricing copy in every locale
- Desktop and mobile billing totals
- Purchase-intent and checkout quantity boundaries
- Razorpay sandbox subscription creation and webhook settlement
- Annual and monthly interval switching
- Multi-location minimum quantity and total display
- Authenticated subscription-management behavior
- Public copy, localization, typecheck, lint, and billing verification suites
