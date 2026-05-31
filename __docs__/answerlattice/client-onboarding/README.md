# Answerlattice Client Onboarding

> **Feature:** Self-service onboarding for external SaaS founders
> **Status:** ✅ IMPLEMENTED
> **Date:** 2026-05-21
> **Auth:** Google OAuth through shared NextAuth login plus Answerlattice product-account bridge
> **Billing:** Controlled beta plus INR Starter/Growth/Studio packaging. Payment capture can still run through the existing Razorpay subscription model when enabled.

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `client-onboarding_spec.md` | CEO/PM | Business requirements |
| 3 | `client-onboarding_impl.md` | Developers | Technical blueprint |
| 4 | `client-onboarding_firebase.md` | Developers/Ops | Firestore cost |

## Related Strategy

- `../self-sellable-product-strategy.md` — Answerlattice's self-serve launch promise, pricing direction, onboarding expectations, widget verification requirements, and sellable-launch task list. Use this before changing client onboarding.

---

## What This Is

A self-service signup flow where external SaaS founders create an Answerlattice account:

1. Visit `answerlattice.com/get-started`
2. Sign in with Google OAuth
3. Enter company, product, product URL, support email, billing model, and main product pages
4. Account created instantly (Answerlattice tenant + store + subscription + widget key + starter product surfaces)
5. Redirected to Activation Command Center to import knowledge, review governance, and install the widget

## Onboarding Flow

```
answerlattice.com/get-started
  │
  ├── Step 1: Google OAuth sign-in (existing NextAuth)
  │   → Creates/uses the default auth user record
  │
  ├── Step 2: Enter company, product profile, and first product surfaces
  │
  ├── Step 3: POST /api/answerlattice/onboard
  │   → Atomic transaction:
  │     ├── Create tenant in Answerlattice Firestore
  │     ├── Create store in Answerlattice Firestore
  │     ├── Create/update Answerlattice user
  │     ├── Create Answerlattice beta subscription
  │     ├── Generate widget key (al_* prefix)
  │     ├── Seed selected product surfaces
  │     ├── Seed compact context summary
  │     ├── Update Answerlattice platform summaries
  │     └── Write productAccounts.AL bridge to the default auth user
  │
  └── Step 4: Show widget key + next steps
      → Go to dashboard
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/answerlattice/onboard/route.ts` | Onboarding API (Answerlattice tenant+store+subscription+widget key) |
| `src/app/sites/answerlattice/get-started/OnboardingForm.tsx` | Self-service signup form UI |
| `src/app/sites/answerlattice/get-started/page.tsx` | Get-started page (criteria + form) |
| `src/data/answerlattice/plans.ts` | Answerlattice plans config (beta, starter, growth, studio) |
| `src/app/api/answerlattice/workspace-profile/route.ts` | Edit product profile after onboarding |

## Reused MenuList Infrastructure

| Component | Reused From |
|-----------|------------|
| NextAuth (Google OAuth) | `src/lib/auth/index.ts` |
| Answerlattice product-account bridge | `src/lib/answerlattice/sessionScope.ts` |
| Atomic tenant+store transaction | `src/lib/onboarding/createTenantStore.ts` with Answerlattice DB injection |
| Platform summary pattern | Answerlattice `platformSummary` docs in the Answerlattice Firebase project |
| Subscription model | Same `FirestoreSubscriptionDoc` type |
| Rate limiting | Same Upstash rate limiter |
| Default roles | Same `createDefaultRoles()` |
| Widget key pattern | Answerlattice-scoped `store.answerlatticeWidgetApi`; widget keys use the bounded store-doc key manager (`keyHashes` + `keysByHash`) with encrypted copy support when configured |

---

## Version History

| Date | Change |
|------|--------|
| 2026-05-21 | Client-product-specific widget/changelog adapters removed from runtime; external clients must embed the generic widget script with Answerlattice-issued keys from their own codebase |
| 2026-05-21 | Separate-mode onboarding writes Answerlattice product data to `answerlattice-qa` and stores only `productAccounts.AL` on the default auth user bridge |
| 2026-03-07 | Initial implementation: beta plan, Google OAuth, atomic provisioning |
