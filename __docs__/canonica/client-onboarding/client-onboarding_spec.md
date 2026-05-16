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
6. **Provisioned** → Account created instantly (tenant + store + subscription + API key)
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
| Store | `stores` | Product workspace, roles, API key auto-generated |
| User update | `users` | Link tenantId + storeId to user |
| Subscription | `subscriptions` | Beta: active immediately, 6-month window. Paid: Razorpay flow |
| API key | store.publicApi | `cn_*` key returned once; `apiKeyHash` + `keyPrefix` persisted for widget authentication |
| Platform summary | `platformSummary` | Counts incremented atomically |

---

## Security

- Auth: Google OAuth via existing NextAuth (same as MenuList)
- Atomic: Firestore transaction prevents partial creation
- Rate limited: 3 onboarding attempts per user per hour
- Validation: Company name required (min 2 chars)
- Duplicate prevention: User with existing tenantId blocked from re-onboarding
- API key: Unique per store, cn_* prefix for Canonica identification

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial spec: beta plan, Google OAuth, self-service |
