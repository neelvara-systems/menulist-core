# Auth and Onboarding Specification

**Status:** Implemented source contract
**Last updated:** July 16, 2026

## Goal

Let a non-technical owner establish one eligible identity, create one business workspace, complete or resume payment, and return to the same business without duplicate tenants, ambiguous ownership, stale claims, or hidden recovery work.

## Required behavior

### Identity

- Google, credential, phone OTP, and messaging-claim entry points converge on one NextAuth session contract.
- Email and supported phone/staff aliases must resolve to at most one `users` document.
- Login requires current active, verified, unblocked, non-deleted account truth.
- The browser never displays raw provider, Firebase, token, or server exception text.
- Logout clears Firebase Auth before ending the NextAuth session.

### First workspace creation

- Only an authenticated user with no scalar or collection tenant/store mapping is eligible.
- The route must re-read the exact user inside the allocation transaction.
- Tenant, master store, default roles, summaries, counters, user mapping, and eligible referral attribution commit together.
- Tenant/store IDs are server allocated positive numeric document IDs.
- The first store mapping uses store role `owner`; account-level `platformRole` remains `OWNER`.
- A stale session or concurrent second request cannot create a second workspace.

### Subscription coordination

- Plan, interval, currency, price, and credit allowance come from current server plan data.
- Provider create uses one UUID attempt identity and exact source/plan/user/tenant/store notes.
- Ambiguous provider results are recovered only by exact identity match in a bounded time/page window.
- The public response exposes only `{ subscription: { id }, tenantId, storeId }`.
- Provider checkout URLs are persisted only after the Razorpay HTTPS host allowlist passes.
- A provider success plus uncertain local write is re-read before destructive compensation.
- A pending subscription remains recoverable after checkout dismissal or navigation.

### Account claim

- Claim tokens are bounded, shape checked, expiring, single use, and unique.
- Preview and mutation share the same claimability, owner mapping, and tenant/store scope checks.
- Every claim mode reserves the source user before Firebase Auth work.
- Final ownership transfer re-reads the reservation, source user, tenant, store, and bounded matching subscriptions in one transaction.
- Email and Google modes update public business email and run post-commit public cache invalidation.
- A completed claim is never reported as failed solely because post-commit cache or custom-claim mirroring failed.

### Firebase claim sync

- The route re-reads the canonical target store before minting claims.
- Non-platform users must belong to the canonical tenant and target store.
- `tenantId`, `storeId`, and `storeIds` claims use canonical string document IDs.
- The store role must be present and bounded. A normal user with a missing role or a forged `PLATFORM` store role is rejected; no owner default is allowed.
- Existing Firebase UID requests must match the NextAuth session email.

### Public rate limits

- Phone OTP send: IP limiter before body parsing, then normalized phone limiter before WhatsApp/challenge creation.
- Phone OTP verify: IP limiter before body parsing, then challenge limiter before verification.
- Claim preview and mutation: hashed IP limiter before token lookup or body side effects.
- These public paid/identity-changing paths return 503 and stop when the shared limiter provider is unavailable.

## Owner-visible states

| State | Display/action |
| --- | --- |
| Signed out | Google, one identity field, phone OTP/passcode choice when applicable |
| Claim link valid | Business preview plus Google, email/password, and available WhatsApp/passcode setup choices |
| No workspace | Pricing collects business details and resumes after authentication |
| Workspace plus pending subscription | Payment pending, starts after payment, complete payment/Open Billing |
| Active subscription | Dashboard and current billing details |
| Blocked/inactive/revoked | Generic unavailable/unauthorized behavior; no internal detail leakage |

## Non-goals

- No second auth database or owner-selectable token strategy.
- No client writes to OTP, claim reservation, tenant/store allocation, or subscription ledger state.
- No automatic platform-admin role from owner onboarding.
- No owner-facing settings for rate-limit, claim, session, or compensation policy.
- No promise that local source verification certifies providers or deployed production.
