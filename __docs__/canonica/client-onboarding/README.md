# Canonica Client Onboarding

> **Feature:** Self-service onboarding for external SaaS founders
> **Status:** ✅ IMPLEMENTED (Phase 2 Step 5: DISTRIBUTE)
> **Date:** 2026-03-07
> **Auth:** Google OAuth (reuses existing NextAuth)
> **Billing:** Beta plan ($0, 6 months). Paid plans via Razorpay (same as MenuList).

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `client-onboarding_spec.md` | CEO/PM | Business requirements |
| 3 | `client-onboarding_impl.md` | Developers | Technical blueprint |
| 4 | `client-onboarding_firebase.md` | Developers/Ops | Firestore cost |

---

## What This Is

A self-service signup flow where external SaaS founders create a Canonica account:

1. Visit `canonica.app/get-started`
2. Sign in with Google OAuth
3. Enter company name + product name
4. Account created instantly (tenant + store + subscription + API key)
5. Redirected to dashboard to start configuring KB + widget

## Onboarding Flow

```
canonica.app/get-started
  │
  ├── Step 1: Google OAuth sign-in (existing NextAuth)
  │   → Creates user record in 'users' collection
  │
  ├── Step 2: Enter company name + product name
  │
  ├── Step 3: POST /api/canonica/onboard
  │   → Atomic transaction:
  │     ├── Create tenant (tenants collection)
  │     ├── Create store (stores collection)
  │     ├── Update user (link tenant+store)
  │     ├── Create subscription (beta: free, 6 months)
  │     ├── Generate API key (cn_* prefix)
  │     └── Update platform summary counts
  │
  └── Step 4: Show API key + next steps
      → Go to dashboard
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/canonica/onboard/route.ts` | Onboarding API (tenant+store+sub+API key) |
| `src/app/sites/canonica/get-started/OnboardingForm.tsx` | Self-service signup form UI |
| `src/app/sites/canonica/get-started/page.tsx` | Get-started page (criteria + form) |
| `src/data/CanonicaPlansList.ts` | Canonica plans config (beta, starter, pro) |

## Reused MenuList Infrastructure

| Component | Reused From |
|-----------|------------|
| NextAuth (Google OAuth) | `src/lib/auth/index.ts` |
| Atomic tenant+store transaction | `src/app/api/onboarding/create-subscription/route.ts` |
| Platform summary pattern | Same `platformSummary/summary` doc |
| Subscription model | Same `FirestoreSubscriptionDoc` type |
| Rate limiting | Same Upstash rate limiter |
| Default roles | Same `createDefaultRoles()` |
| API key pattern | Same `publicApi.apiKey` on store |

---

## Version History

| Date | Change |
|------|--------|
| 2026-03-07 | Initial implementation: beta plan, Google OAuth, atomic provisioning |
