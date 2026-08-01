# Answerlattice Client Onboarding

> **Feature:** Self-service onboarding for external SaaS founders
> **Status:** ✅ IMPLEMENTED
> **Last Audited:** 2026-07-19
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
| 5 | `client-onboarding_marketing.md` | Marketing/Sales | Claim boundaries |
| 6 | `client-onboarding_website.md` | Website | Public conversion contract |
| 7 | `client-onboarding_helpdoc.md` | Customers/Support | Setup and recovery guidance |
| 8 | `client-onboarding_mobile-support.md` | Product/QA | Responsive and mobile impact |
| 9 | `client-onboarding_test-cases.md` | Engineering/QA | Verification matrix |

## Related Strategy

- `../self-sellable-product-strategy.md` — Answerlattice's self-serve launch promise, pricing direction, onboarding expectations, widget verification requirements, and sellable-launch task list. Use this before changing client onboarding.

---

## What This Is

A self-service signup flow where external SaaS founders create an Answerlattice account:

1. Visit `answerlattice.com/get-started`
2. Sign in with Google OAuth
3. Enter company, product, product URL, support email, billing model, plan, checkout currency, and main product pages
4. The selected paid plan is provisioned through Razorpay with a resumable attempt, then the Answerlattice subscription summary and one-time widget key are committed to the provisional workspace
5. See the one-time widget key, payment link, and explicit dashboard/activation next steps

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
  └── Step 4: Project exact plan/amount/provider/key acknowledgement
      → Bounded non-authoritative session refresh
      → Show widget key + next steps
      → Go to dashboard
```

If provider creation has an indeterminate outcome, the exact attempt enters `provider_recovery_pending`. The same request details preserve the provisional scope, wait through a 15-minute recovery hold, and then perform a bounded exact-note search before any same-attempt provider creation is allowed. Changed details cannot claim that scope. A `payment_pending` retry restores the default-auth product bridge and returns the persisted checkout, but requires widget-key rotation because the original plaintext key is never stored.

Compensation is permitted only when the route can prove that provider creation did not occur or an exact known provider subscription is already in a terminal checkout state. The latter returns `ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED` so the founder can retry the same setup after the owned provisional scope is deactivated. Unknown provider state is never treated as terminal. Once local finalization succeeds, later bridge/bootstrap failure is retried from persisted `payment_pending` truth; the provider subscription and workspace are not cancelled. All route-owned responses use `private, no-store` and `nosniff`.

The server admits product URLs only over HTTP/HTTPS without embedded credentials, detects duplicate Answerlattice users for the same normalized email instead of selecting one arbitrarily, preserves a known provider subscription ID across provider-fetch failures, and clears stale recovery fields before a compensated user starts a new attempt.

The browser starts only one setup POST at a time. A successful route response is
reconciled against current monthly plan pricing, exact provider checkout host,
subscription identity, and one-time `al_*` key format before display. Session
refresh is bounded and diagnostic-only after durable success; it cannot turn a
created workspace into a false failed-creation message.

A provisioned but unpaid workspace cannot consume licensed Knowledge Intake or paid AI operations. Subscription activation remains owned by the product-aware Razorpay verification and webhook flow.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/answerlattice/onboard/route.ts` | Onboarding API (Answerlattice tenant+store+subscription+widget key) |
| `src/app/sites/answerlattice/get-started/OnboardingForm.tsx` | Self-service signup form UI |
| `src/lib/answerlattice/onboardingResponse.ts` | Exact browser acknowledgement projector for plan, billing, provider checkout, subscription and widget-key truth |
| `src/app/sites/answerlattice/get-started/page.tsx` | Get-started page (criteria + form) |
| `src/data/answerlattice/plans.ts` | Answerlattice plans config (starter, growth, studio) |
| `src/app/api/answerlattice/workspace-profile/route.ts` | Edit product profile after onboarding |
| `src/lib/answerlattice/onboardingProvisioning.ts` | Attempt fingerprint, recovery hold, and exact provider-candidate contract |
| `src/lib/answerlattice/onboardingProvisioningServer.ts` | Transactional finalization, recovery marker, and exact-scope compensation |

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
| 2026-07-22 | Required exact dual-product identity for onboarding resume, pending-subscription persistence, provider recovery, and compensation; conflicting subscriptions now remain unchanged |
| 2026-07-19 | Linked post-onboarding profile ownership to the dedicated revisioned, atomically synchronized Workspace Profile feature |
| 2026-07-19 | Added known-provider-ID preservation, stale-retry cleanup, duplicate-email fail-closed admission, and HTTP(S)-only credential-free product URLs |
| 2026-07-19 | Hardened indeterminate provider recovery, removed automatic cancellation after provider ambiguity, made local finalization the rollback boundary, tightened recovered-response validation and cache policy, and added emulator-backed recovery/compensation proof |
| 2026-07-11 | Added plan and INR/USD selection, request-fingerprinted resumable provisioning, provider-subscription recovery, payment-pending recovery, one-time widget-key recovery boundary, and scoped compensation |
| 2026-06-30 | Hardened the get-started client response boundary so success state requires a bounded, valid onboarding result instead of direct JSON parsing |
| 2026-06-30 | Removed active beta/unpaid onboarding path; public onboarding now selects paid Starter and creates a pending Razorpay subscription |
| 2026-05-21 | Client-product-specific widget/changelog adapters removed from runtime; external clients must embed the generic widget script with Answerlattice-issued keys from their own codebase |
| 2026-05-21 | Separate-mode onboarding writes Answerlattice product data to `answerlattice-qa` and stores only `productAccounts.AL` on the default auth user bridge |
| 2026-03-07 | Initial implementation: beta-era plan, Google OAuth, atomic provisioning |
