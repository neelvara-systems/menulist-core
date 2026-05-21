# Canonica Client Onboarding

> **Feature:** Self-service onboarding for external SaaS founders
> **Status:** ✅ IMPLEMENTED
> **Date:** 2026-05-21
> **Auth:** Google OAuth through shared NextAuth login plus Canonica product-account bridge
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
4. Account created instantly (Canonica tenant + store + subscription + widget key)
5. Redirected to dashboard to start configuring KB + widget

## Onboarding Flow

```
canonica.app/get-started
  │
  ├── Step 1: Google OAuth sign-in (existing NextAuth)
  │   → Creates/uses the default auth user record
  │
  ├── Step 2: Enter company name + product name
  │
  ├── Step 3: POST /api/canonica/onboard
  │   → Atomic transaction:
  │     ├── Create tenant in Canonica Firestore
  │     ├── Create store in Canonica Firestore
  │     ├── Create/update Canonica user
  │     ├── Create Canonica beta subscription
  │     ├── Generate widget key (cn_* prefix)
  │     ├── Update Canonica platform summaries
  │     └── Write productAccounts.CN bridge to the default auth user
  │
  └── Step 4: Show API key + next steps
      → Go to dashboard
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/canonica/onboard/route.ts` | Onboarding API (Canonica tenant+store+subscription+widget key) |
| `src/app/sites/canonica/get-started/OnboardingForm.tsx` | Self-service signup form UI |
| `src/app/sites/canonica/get-started/page.tsx` | Get-started page (criteria + form) |
| `src/data/CanonicaPlansList.ts` | Canonica plans config (beta, starter, pro) |

## Reused MenuList Infrastructure

| Component | Reused From |
|-----------|------------|
| NextAuth (Google OAuth) | `src/lib/auth/index.ts` |
| Canonica product-account bridge | `src/lib/canonica/sessionScope.ts` |
| Atomic tenant+store transaction | `src/lib/onboarding/createTenantStore.ts` with Canonica DB injection |
| Platform summary pattern | Canonica `platformSummary` docs in the Canonica Firebase project |
| Subscription model | Same `FirestoreSubscriptionDoc` type |
| Rate limiting | Same Upstash rate limiter |
| Default roles | Same `createDefaultRoles()` |
| Widget key pattern | Canonica-scoped `store.canonicaWidgetApi`; current keys are stored as `apiKeyHash` + display-only `keyPrefix` |

---

## Version History

| Date | Change |
|------|--------|
| 2026-05-21 | Separate-mode onboarding writes Canonica product data to `canonica-qa` and stores only `productAccounts.CN` on the default auth user bridge |
| 2026-03-07 | Initial implementation: beta plan, Google OAuth, atomic provisioning |
