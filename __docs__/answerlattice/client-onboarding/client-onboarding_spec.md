# Answerlattice Client Onboarding — Spec

> **Version:** 1.5.1
> **Last Updated:** 2026-07-19
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
- Current authority: the persisted default-auth user must still match the signed identity, email, active/verified lifecycle and session-revocation boundary before provisioning; the bridge transaction repeats that proof before writing `productAccounts.AL`
- Resumable: request fingerprint plus attempt ID makes an expired identical attempt recoverable and rejects changed details while an attempt is active
- Provider idempotency: the attempt ID and exact Answerlattice scope are written to Razorpay notes; only a `created` subscription with exact attempt, product, plan, tenant, and store notes is eligible for checkout recovery
- Checkout truth: payment-pending finalization requires a credential-free HTTPS checkout on the exact Razorpay hosted-payment domain; missing or unsafe provider URLs remain in recovery instead of becoming a successful workspace response
- Indeterminate provider outcome: preserve the exact scope in `provider_recovery_pending`, hold retries for 15 minutes, and perform bounded recovery before allowing same-attempt provider creation
- Known provider identity: preserve a stored provider subscription ID across fetch failures rather than downgrading the attempt to unknown-provider recovery
- Terminal checkout recovery: only an exact known provider subscription in a recognized terminal status may deactivate its owned provisional scope and return a retryable checkout-expired result
- Atomic finalization: pending subscription, store summary, widget-key state, and tenant/store/user payment status commit together
- Compensation: deactivate the exact provisional scope only when provider creation is proven not to have occurred or an exact known provider checkout is terminal; never infer cancellation from an unknown provider result
- Finalization boundary: after local `payment_pending` truth commits, bridge/bootstrap failure is recoverable and must not cancel or compensate the provider/workspace
- Non-destructive recovery: payment-pending retry requires the original request fingerprint, transactionally restores the current product-account bridge, creates only missing initial surfaces/summary truth, and never merge-resets an existing owner-edited surface
- Rate limited: 3 onboarding attempts per user per hour
- Validation: company name is required (min 2 chars); product URLs are HTTP(S)-only and cannot contain embedded credentials
- Duplicate prevention: user with existing `productAccounts.AL` or Answerlattice-project user tenant/store is blocked from re-onboarding; duplicate normalized-email records fail closed rather than selecting one arbitrarily; a MenuList tenant alone does not block Answerlattice onboarding.
- Retry hygiene: a new attempt after compensated failure clears stale provider ID, recovery time/reason, and cancellation fields before provider work starts
- Widget key: Unique `al_*` key per generated credential, capped under the store-doc widget key manager
- Response privacy: every route-owned onboarding response is private/no-store and `nosniff`; one-time plaintext widget keys are not persisted for later display
- Entitlement boundary: `payment_pending` setup does not grant active paid AI or Knowledge Intake usage

## Success Criteria

- One authenticated founder can create one Answerlattice workspace and one provider subscription for one exact request.
- Response loss, provider timeout, or bridge failure can be retried without silently duplicating provider state.
- Changed request details cannot take over an active or recovery-pending attempt.
- The browser cannot show success from malformed billing, plan, subscription, checkout, or widget-key data.
- Unknown provider state remains visible and recoverable instead of being represented as failure or success.
- A terminal exact checkout cannot hold the founder in recovery forever; only its exact provisional scope is retired so a clean retry can start.

## Non-Goals

- No free workspace, arbitrary plan interval, account-changing support agent, provider-agnostic billing abstraction, or automatic subscription cancellation.
- No claim that provider checkout equals successful payment or product activation.
- No requirement to connect every knowledge source before the founder sees the created workspace.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-08-01 | 1.6.0 | Added current-auth/transactional bridge authority, exact hosted-checkout finalization, fingerprint-bound payment-pending recovery, and non-destructive bootstrap repair |
| 2026-07-19 | 1.5.1 | Added known-provider-ID preservation, stale-retry cleanup, duplicate-email admission, HTTP(S)-only product URLs, and route-wide private responses |
| 2026-07-19 | 1.5.0 | Defined durable provider-recovery hold, created-only exact provider matching, post-finalization recovery, response privacy, entitlement, success, and non-goal boundaries |
| 2026-07-11 | 1.4.0 | Added plan/INR/USD selection and the resumable provider-recovery, atomic-finalization, and scoped-compensation contract |
| 2026-06-30 | 1.3.0 | Removed beta-era onboarding path; public onboarding uses paid Starter by default |
| 2026-05-25 | 1.2.1 | Updated onboarding widget-key contract to the bounded store-doc key manager shape. |
| 2026-05-21 | 1.2.0 | Updated separate-product onboarding contract: default user bridge, Answerlattice tenant summary, and `answerlatticeWidgetApi` key storage |
| 2026-05-16 | 1.1.0 | Paid plans wired to Razorpay subscription flow |
| 2026-03-07 | 1.0.0 | Initial beta-era spec, Google OAuth, self-service |
