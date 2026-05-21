# Canonica Client Onboarding — Spec

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** CEO / PM

---

## Purpose

Allow external SaaS founders to create a Canonica account via self-service. This is the primary growth mechanism — a founder visits canonica.app, signs up, and starts using Canonica within minutes.

---

## User Journey

1. **Discover** → Visit canonica.app (website built in Step 1)
2. **Evaluate** → Read product page, pricing, about
3. **Sign Up** → Click "Get Early Access" → canonica.app/get-started
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
| Tenant | `tenants` | Company profile, onboardingSource: CANONICA_ONBOARDING, productId: CN |
| Store | `stores` | Product workspace, roles, widget key auto-generated |
| User update | `users` | Canonica project user gets tenantId + storeId; default auth user gets `productAccounts.CN` bridge only |
| Subscription | `subscriptions` | Beta: active immediately, 6-month window. Paid: Razorpay subscription starts as pending and activates through the existing payment webhook/reconciliation flow |
| Widget key | store.canonicaWidgetApi | `cn_*` key returned once; `apiKeyHash`, `keyPrefix`, purpose, productId, and widget scopes persisted for widget authentication |
| Tenant summary | `platformSummary/canonicaTenantsSummary` | Tenant/store registry used by Canonica schedulers without scanning entity collections |

---

## Security

- Auth: Google OAuth via existing NextAuth (same as MenuList)
- Atomic: Firestore transaction prevents partial creation
- Rate limited: 3 onboarding attempts per user per hour
- Validation: Company name required (min 2 chars)
- Duplicate prevention: user with existing `productAccounts.CN` or Canonica-project user tenant/store is blocked from re-onboarding; a MenuList tenant alone does not block Canonica onboarding.
- Widget key: Unique per store, cn_* prefix for Canonica identification

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-21 | 1.2.0 | Updated separate-product onboarding contract: default user bridge, Canonica tenant summary, and `canonicaWidgetApi` key storage |
| 2026-05-16 | 1.1.0 | Paid plans wired to Razorpay subscription flow |
| 2026-03-07 | 1.0.0 | Initial spec: beta plan, Google OAuth, self-service |
