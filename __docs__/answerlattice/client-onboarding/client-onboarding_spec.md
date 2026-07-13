# Answerlattice Client Onboarding — Spec

> **Version:** 1.4.0
> **Last Updated:** 2026-07-11
> **Audience:** CEO / PM

---

## Purpose

Allow external SaaS founders to create an Answerlattice account via self-service. This is the primary growth mechanism — a founder visits answerlattice.com, signs up, and starts using Answerlattice within minutes.

---

## User Journey

1. **Discover** → Visit answerlattice.com (website built in Step 1)
2. **Evaluate** → Read product page, pricing, about
3. **Sign Up** → Click "Get Early Access" → answerlattice.com/get-started
4. **Authenticate** → Google OAuth (one click)
5. **Configure** → Enter company/product details, select Starter/Growth/Studio, choose INR or USD, and select initial product surfaces
6. **Provisioned** → A resumable attempt creates the tenant/store, pending paid subscription, and one-time widget key without treating a lost browser response as permission to duplicate provider state
7. **Onboard** → Go to dashboard → Upload KB → Extract entities → Create canonical answers → Embed widget

---

## Plans (v1)

| Plan | INR | USD | Limits | Target |
|------|-----|-----|--------|--------|
| Starter | ₹999/mo | US$12/mo | 50 entities, 50 answers, 50 articles, widget only | Small SaaS |
| Growth | ₹2,999/mo | US$36/mo | 200 entities, 500 answers, 200 articles, widget | Growing SaaS |
| Studio | ₹6,999/mo | US$84/mo | 800 entities, 2,000 answers, 800 articles, up to 5 workspaces | Agencies and dev studios |

No active Answerlattice onboarding path creates an unpaid plan. Public onboarding defaults to paid Starter/INR, accepts the plan selected from Pricing, and creates a pending Razorpay subscription in the selected currency.

---

## What Gets Created During Onboarding

| Entity | Collection | Details |
|--------|-----------|---------|
| Tenant | `tenants` | Company profile, onboardingSource: ANSWERLATTICE_ONBOARDING, productId: AL |
| Store | `stores` | Product workspace, roles, widget key auto-generated |
| User update | `users` | Answerlattice project user gets tenantId + storeId; default auth user gets `productAccounts.AL` bridge only |
| Subscription | `subscriptions` | Razorpay subscription starts as pending and activates through the existing payment webhook/reconciliation flow |
| Widget key | store.answerlatticeWidgetApi | Initial `al_*` widget key returned after onboarding; the store-doc key manager persists `keyHashes`, `keysByHash`, display prefix/suffix, purpose, productId, widget scopes, and encrypted copy material when configured |
| Tenant summary | `platformSummary/answerlatticeTenantsSummary` | Tenant/store registry used by Answerlattice schedulers without scanning entity collections |

---

## Security

- Auth: Google OAuth via existing NextAuth (same as MenuList)
- Resumable: request fingerprint plus attempt ID makes an expired identical attempt recoverable and rejects changed details while an attempt is active
- Provider idempotency: the attempt ID is written to Razorpay notes and used for bounded subscription recovery before any retry creates another provider object
- Atomic finalization: pending subscription, store summary, widget-key state, and tenant/store/user payment status commit together
- Compensation: failed provider/finalization work cancels when possible and deactivates only the exact provisional scope owned by the attempt
- Rate limited: 3 onboarding attempts per user per hour
- Validation: Company name required (min 2 chars)
- Duplicate prevention: user with existing `productAccounts.AL` or Answerlattice-project user tenant/store is blocked from re-onboarding; a MenuList tenant alone does not block Answerlattice onboarding.
- Widget key: Unique `al_*` key per generated credential, capped under the store-doc widget key manager

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-11 | 1.4.0 | Added plan/INR/USD selection and the resumable provider-recovery, atomic-finalization, and scoped-compensation contract |
| 2026-06-30 | 1.3.0 | Removed beta-era onboarding path; public onboarding uses paid Starter by default |
| 2026-05-25 | 1.2.1 | Updated onboarding widget-key contract to the bounded store-doc key manager shape. |
| 2026-05-21 | 1.2.0 | Updated separate-product onboarding contract: default user bridge, Answerlattice tenant summary, and `answerlatticeWidgetApi` key storage |
| 2026-05-16 | 1.1.0 | Paid plans wired to Razorpay subscription flow |
| 2026-03-07 | 1.0.0 | Initial beta-era spec, Google OAuth, self-service |
