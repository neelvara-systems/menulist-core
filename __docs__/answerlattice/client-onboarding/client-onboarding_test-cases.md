# Answerlattice Client Onboarding — Test Cases

> **Last Audited:** 2026-08-14

| ID | Case | Expected result | Proof |
|---|---|---|---|
| ONB-01 | Valid new monthly INR/USD setup | One exact provisional scope, one eligible provider subscription, atomic `payment_pending` finalization | Contract + emulator |
| ONB-02 | Same active attempt replay | Fixed conflict; no provider create | Contract |
| ONB-03 | Changed details on active/recovery attempt | Fixed details-changed conflict; scope not claimed | Contract + emulator |
| ONB-04 | Provider request times out before response | Exact scope becomes `provider_recovery_pending`; no cancellation/compensation | Emulator + source gate |
| ONB-05 | Retry before 15-minute recovery hold | Fixed recovery-pending conflict with `Retry-After`; no provider create | Contract |
| ONB-06 | Retry after hold, provider found by exact notes | Reuse only `created` exact product/plan/attempt/tenant/store match | Contract |
| ONB-07 | Candidate is active, mismatched, or malformed | Reject candidate; never represent it as fresh checkout | Contract |
| ONB-07A | Known exact provider fetch fails transiently | Preserve the known provider ID and remain in recovery | Contract + source gate |
| ONB-08 | Exact known provider checkout is terminal | Deactivate only the owned provisional scope; return checkout-expired recovery | Contract + source gate |
| ONB-09 | Provider creation proven not to occur | Exact provisional tenant/store/user is compensated; foreign scope untouched | Emulator |
| ONB-10 | Local finalization succeeds, bridge fails | Preserve `payment_pending`; retry restores bridge; no provider cancellation | Source gate |
| ONB-11 | Lost successful response | Strict persisted summary recovery; raw key omitted and rotation required | Contract + client source |
| ONB-12 | Malformed persisted billing/plan/subscription | Fail closed; do not substitute current form values | Contract |
| ONB-13 | Unsafe checkout URL | Return/render no checkout navigation | Contract + client source |
| ONB-14 | Malformed/oversized/redirected browser response | Fixed failure copy; no success state or analytics | Client source gate |
| ONB-15 | Rate limit exceeded | `429` plus `Retry-After`; no account/provider work | Source gate |
| ONB-16 | Pending workspace attempts paid AI/intake | Entitlement denies use until active/trialing | Billing/intake source gates |
| ONB-17 | Any onboarding route response | Private/no-store and `nosniff`; key-generation event only when a raw key exists | Runtime source gate |
| ONB-18 | Product URL uses non-HTTP scheme or embedded credentials | Reject before account/provider work | Client + runtime source gate |
| ONB-19 | Multiple Answerlattice users share normalized email | Fail closed; never choose an arbitrary user record | Runtime source gate |
| ONB-20 | New attempt follows compensated failure | Clear stale provider ID/recovery/cancellation fields before provider work | Runtime source gate |
| ONB-21 | Persisted amount or provider installment count is a string, boolean, fraction, zero or non-finite value | Fail closed; do not coerce or persist billing truth | Contract + runtime source gate |
| ONB-22 | Recovery timestamp has coercible members, invalid Date, hostile getter or throwing `toMillis` | Treat timestamp as unavailable without throwing or changing recovery timing | Contract |
| ONB-23 | Optional discovery source is omitted or uses any supported value | Setup proceeds; supported value is projected on the initial tenant write only and does not change the provisioning fingerprint | Contract + source gate |
| ONB-24 | Discovery source is unknown, wrong-cased, free text, or non-string | Strict request validation rejects it before account/provider work | Contract + runtime source gate |
| ONB-25 | Valid product details and selected surfaces are previewed | Up to four deterministic First Trusted Answer starter questions appear in selected-surface priority order before plan controls | Public website verifier |
| ONB-26 | Preview is opened, revisited, or edited | No fetch, AI/provider call, Firebase operation, workspace, subscription, or entitlement change; edits recompute locally | Public website verifier + browser |
| ONB-27 | Preview wording is inspected | It explicitly denies imported knowledge, generated answers, and approved guidance | Public website + runtime source gates |
| ONB-28 | Duplicate or unknown surface keys reach the pure projector | Known surfaces preserve first-seen order; duplicates/unknowns are dropped; fallback questions remain deterministic | Public website verifier |
| ONB-29 | Proof analytics is emitted | Consent gate applies; no company, product, URL, email, or surface names are sent | Source gate + browser analytics inspection |
| ONB-30 | Mobile 390px proof and plan flow | Questions wrap, controls remain at least 44px, back preserves details, and no horizontal scroll appears | Browser/physical-device QA |

## Required Local Gates

```bash
npm run test:answerlattice-onboarding-provisioning
npm run verify:marketing-external-insights
npm run test:answerlattice-onboarding-provisioning:emulator
node scripts/verification/verify-answerlattice-runtime-truth.js
npx tsc --noEmit --pretty false --incremental false
git diff --check
```

## External Gates

- Google OAuth and session refresh against hosted QA.
- Razorpay test-mode timeout, recovery search, checkout, activation, and webhook readback.
- Authenticated browser retry after response loss.
- Mobile and assistive-technology review.
- Owner recovery from a deliberately interrupted attempt.

These gates are release evidence. They do not weaken the fail-closed local contract when unavailable.
