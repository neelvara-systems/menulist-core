# Answerlattice Client Onboarding — Spec

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
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
5. **Configure** → Enter company name + product name
6. **Provisioned** → Account created instantly (tenant + store + subscription + widget key)
7. **Onboard** → Go to dashboard → Upload KB → Extract entities → Create canonical answers → Embed widget

---

## Plans (v1)

| Plan | Price | Limits | Target |
|------|-------|--------|--------|
| **Beta** | $0/mo (6 months) | 200 entities, 500 answers, 200 articles, widget + API | Design partners |
| Starter | ₹2,999/mo | 50 entities, 50 answers, 50 articles, widget only | Small SaaS |
| Pro | ₹7,999/mo | 200 entities, 500 answers, 200 articles, widget + API | Mid-market SaaS |

Beta plan is the default during private beta. Paid plans activate when beta period ends.

---

## What Gets Created During Onboarding

| Entity | Collection | Details |
|--------|-----------|---------|
| Tenant | `tenants` | Company profile, onboardingSource: ANSWERLATTICE_ONBOARDING, productId: AL |
| Store | `stores` | Product workspace, roles, widget key auto-generated |
| User update | `users` | Answerlattice project user gets tenantId + storeId; default auth user gets `productAccounts.AL` bridge only |
| Subscription | `subscriptions` | Beta: active immediately, 6-month window. Paid: Razorpay subscription starts as pending and activates through the existing payment webhook/reconciliation flow |
| Widget key | store.answerlatticeWidgetApi | Initial `al_*` widget key returned after onboarding; the store-doc key manager persists `keyHashes`, `keysByHash`, display prefix/suffix, purpose, productId, widget scopes, and encrypted copy material when configured |
| Tenant summary | `platformSummary/answerlatticeTenantsSummary` | Tenant/store registry used by Answerlattice schedulers without scanning entity collections |

---

## Security

- Auth: Google OAuth via existing NextAuth (same as MenuList)
- Atomic: Firestore transaction prevents partial creation
- Rate limited: 3 onboarding attempts per user per hour
- Validation: Company name required (min 2 chars)
- Duplicate prevention: user with existing `productAccounts.AL` or Answerlattice-project user tenant/store is blocked from re-onboarding; a MenuList tenant alone does not block Answerlattice onboarding.
- Widget key: Unique `al_*` key per generated credential, capped under the store-doc widget key manager

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-25 | 1.2.1 | Updated onboarding widget-key contract to the bounded store-doc key manager shape. |
| 2026-05-21 | 1.2.0 | Updated separate-product onboarding contract: default user bridge, Answerlattice tenant summary, and `answerlatticeWidgetApi` key storage |
| 2026-05-16 | 1.1.0 | Paid plans wired to Razorpay subscription flow |
| 2026-03-07 | 1.0.0 | Initial spec: beta plan, Google OAuth, self-service |
