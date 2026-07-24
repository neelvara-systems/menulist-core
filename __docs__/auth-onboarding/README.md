# Auth and Onboarding

**Status:** Local source complete; external certification pending
**Last updated:** July 16, 2026
**Scope:** MenuList owner authentication, account claim, first workspace creation, subscription handoff, session refresh, and returning-owner recovery

This folder describes the behavior implemented in the codebase. It does not certify live Google OAuth, WhatsApp delivery, Razorpay, Firebase Auth token minting, browser/device behavior, or deployed environments.

Audit continuity marker: current-authority and payment-effect hardening remains part of this implemented contract.

## Current code-truth flow

1. An owner enters through Google OAuth, email/password or passcode, WhatsApp OTP, or a messaging claim link.
2. NextAuth creates or resolves one `users` record and issues the server session. New self-serve owner records are active and verified but have no tenant/store scope.
3. The owner selects a plan and supplies the business details on the responsive pricing flow.
4. `POST /api/onboarding/create-subscription` re-reads and locks the exact current user in the same transaction that allocates tenant/store IDs. It creates the tenant, master store, default roles, store summary, counters, optional referral attribution, and owner mapping atomically.
5. The route creates or recovers one Razorpay subscription for the exact onboarding attempt, persists one local pending subscription, and returns only the subscription ID plus tenant/store IDs. If the local write acknowledgement is ambiguous, recovery succeeds only when both ML product aliases, both user aliases, and both numeric tenant/store aliases exactly agree with the new scope.
6. The browser refreshes NextAuth from current Firestore truth and opens Razorpay. Payment verification or the webhook moves the local subscription to the provider-confirmed state.
7. `/api/auth/set-claims` re-reads the current user and canonical store, then mints Firebase claims for the exact tenant/store membership and store role.
8. A returning owner with a pending onboarding subscription sees a clear payment-pending state and can resume the allowlisted Razorpay checkout from Pricing or Billing.

## Supported authentication entries

| Entry | Identity proof | Result |
| --- | --- | --- |
| Google OAuth | Google account | Existing user reused or one unscoped owner profile created |
| Email/password or passcode | Firebase Auth password verification | Existing eligible user session |
| WhatsApp OTP | HMAC-protected challenge plus one-time login token | Existing phone identity reused or one unscoped phone-owner profile created |
| Messaging claim link | Expiring, single-use high-entropy claim token | Existing messaging business transferred to Google, email/password, or WhatsApp/passcode identity |

All entries converge on the same NextAuth session, Firebase claim sync, user/store authority, and logout behavior. There is no parallel dashboard session model.

## Core invariants

- `platformRole` is the account-level role (`OWNER`, `USER`, `RESELLER`, `PLATFORM`, and supported platform variants).
- `users.stores[].role` is the store-scoped role (`owner`, `manager`, `staff`, or a valid custom role).
- A missing store role never becomes an owner Firebase claim.
- `active`, `isVerified`, block/deletion state, and revocation timestamps are rechecked on sensitive current-authority paths.
- The authoritative website-onboarding admission check is the exact `users/{userId}` transaction read, not the possibly stale session.
- Account claim reserves the claim before Firebase Auth work and consumes ownership, token, tenant/store updates, and subscription relinking transactionally.
- Public phone OTP, claim preview, and claim mutation stop before provider/Firestore/Auth work when the shared rate-limit provider is unavailable.
- Cache invalidation after a committed account claim is observable but best effort; it cannot turn a successful identity transfer into a false failure.

## Failure and recovery

| Failure | Current behavior |
| --- | --- |
| Concurrent onboarding requests | One user transaction wins; later attempts receive conflict before another allocation |
| Razorpay create response is ambiguous | Bounded provider search accepts only the exact attempt/plan/user/tenant/store match |
| Razorpay creation fails | Tenant/store/user/referral state is compensated and public cache invalidation is attempted |
| Local subscription write reports failure after provider success | The route re-reads the exact provider document; only matching provider, user, tenant, store, and plan identity is accepted, otherwise provider cancellation and local compensation are attempted |
| Checkout is dismissed | Pending subscription remains visible; the owner can complete the same allowlisted payment link from Pricing or Billing |
| Claim cache invalidation fails after commit | Failure is logged; the claim remains successful and Firebase claim mirroring continues |
| Firebase claim mirror fails after account claim | Failure is logged; normal sign-in `/api/auth/set-claims` repairs the mirror |
| Claim/OTP limiter provider is unavailable | Public identity-changing or paid OTP work returns 503 before side effects |

## Verification

Primary local bundle:

```bash
npm run verify:auth-onboarding-flow
```

Additional evidence:

- `npm run verify:auth-security-failure-matrix`
- `npm run test:phone-otp-transaction:emulator`
- `npm run test:claim-account-concurrency:emulator`
- `npm run test:onboarding-user-concurrency:emulator`
- `npx tsc --noEmit`

The full auth/security matrix also scans shared repo-wide boundaries and can be blocked by unrelated dirty-worktree defects. The focused bundle isolates this flow; neither replaces live provider/browser/deploy evidence.

July 16 local result: the focused bundle, OTP/claim/onboarding concurrency emulators, session/store projection tests, billing entitlement verifier, scoped ESLint, exact TypeScript, and diff integrity passed. The shared reseller operational-ID finding was fixed through `src/lib/runtime/randomId.ts`; the broad auth/security source matrix is now blocked only by the separate SignalDesk Firebase Admin local-ADC diagnostic requirement.

## Documents

- [Specification](./auth-onboarding_spec.md)
- [Implementation](./auth-onboarding_impl.md)
- [Firebase and cost](./auth-onboarding_firebase.md)
- [Owner help](./auth-onboarding_helpdoc.md)
- [Mobile support](./auth-onboarding_mobile-support.md)
- [Phone OTP](../phone-otp-auth/README.md)
- [Auth hub](../auth/README.md)

## External evidence still pending

- Google OAuth and credentials login on the target host
- WhatsApp OTP template delivery and retry evidence
- Claim-link smoke for all three claim modes
- Razorpay sandbox checkout, dismissal/resume, verification, webhook, and ambiguous-provider failure evidence
- Firebase custom-claims/token refresh and Firestore access evidence
- Narrow mobile browser and PWA handoff QA
- Required Vercel/Firebase deploy and production-host evidence

These remain owner/release-operator tasks in the feature-flow tracker and production readiness runbook.
