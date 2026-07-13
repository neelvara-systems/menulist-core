# Answerlattice Client Onboarding

> **Feature:** Self-service onboarding for external SaaS founders
> **Status:** ✅ IMPLEMENTED
> **Date:** 2026-05-21
> **Auth:** Google OAuth through shared NextAuth login plus Answerlattice product-account bridge
> **Billing:** Paid INR and USD Starter/Growth/Studio packaging. Payment capture runs through the existing product-scoped Razorpay subscription model.

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
3. Enter company, product, product URL, support email, billing model, plan, checkout currency, and main product pages
4. The selected paid plan is provisioned through Razorpay with a resumable attempt, then the Answerlattice subscription summary and one-time widget key are committed to the provisional workspace
5. Redirected to Activation Command Center to import knowledge, review governance, and install the widget

## Onboarding Flow

```
answerlattice.com/get-started
  │
  ├── Step 1: Google OAuth sign-in (existing NextAuth)
  │   → Creates/uses the default auth user record
  │
  ├── Step 2: Enter company, product profile, plan, INR/USD checkout currency, and first product surfaces
  │
  ├── Step 3: POST /api/answerlattice/onboard
  │   → Create a fingerprinted provisional tenant/store/user scope
  │   → Create or recover the exact Razorpay subscription for that attempt
  │   → Atomic finalization transaction:
  │     ├── Create/update the pending paid subscription
  │     ├── Attach the subscription summary to the store
  │     ├── Generate and persist the one-time widget key state (al_* prefix)
  │     └── Move tenant/store/user status to payment_pending
  │   → Seed selected product surfaces and compact summaries
  │   → Write productAccounts.AL bridge to the default auth user
  │
  └── Step 4: Show widget key + next steps
      → Go to dashboard
```

If the client loses the response after provider creation, the same request fingerprint resumes the expired attempt and searches Razorpay notes for the matching attempt rather than creating another subscription. A `payment_pending` retry returns the existing workspace and checkout state, but requires a new widget key because the original plaintext key is never stored. If provider/finalization work fails, the route attempts provider cancellation and transactionally deactivates only the matching provisional tenant/store/subscription while clearing the provisional user scope.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/answerlattice/onboard/route.ts` | Onboarding API (Answerlattice tenant+store+subscription+widget key) |
| `src/app/sites/answerlattice/get-started/OnboardingForm.tsx` | Self-service signup form UI |
| `src/app/sites/answerlattice/get-started/page.tsx` | Get-started page (criteria + form) |
| `src/data/answerlattice/plans.ts` | Answerlattice plans config (starter, growth, studio) |
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
| 2026-07-11 | Added plan and INR/USD selection, request-fingerprinted resumable provisioning, provider-subscription recovery, payment-pending recovery, one-time widget-key recovery boundary, and scoped compensation |
| 2026-06-30 | Hardened the get-started client response boundary so success state requires a bounded, valid onboarding result instead of direct JSON parsing |
| 2026-06-30 | Removed active beta/unpaid onboarding path; public onboarding now selects paid Starter and creates a pending Razorpay subscription |
| 2026-05-21 | Client-product-specific widget/changelog adapters removed from runtime; external clients must embed the generic widget script with Answerlattice-issued keys from their own codebase |
| 2026-05-21 | Separate-mode onboarding writes Answerlattice product data to `answerlattice-qa` and stores only `productAccounts.AL` on the default auth user bridge |
| 2026-03-07 | Initial implementation: beta-era plan, Google OAuth, atomic provisioning |
