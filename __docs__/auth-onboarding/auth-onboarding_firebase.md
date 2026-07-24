# Auth and Onboarding Firebase and Cost Contract

**Status:** Current source contract
**Last updated:** July 16, 2026

## Data surfaces

| Surface | Purpose | Client access |
| --- | --- | --- |
| `users` | Identity, lifecycle, account role, active store and store mappings | Existing governed user/staff rules |
| `tenants` | Business ownership and store list | Existing tenant-scoped rules |
| `stores` | Canonical store, role definitions, public business truth | Existing store-scoped rules |
| `platformSummary/platform` | Tenant/store counters | Server transaction only for onboarding |
| `platformSummary/storesSummary` | Compact store lookup/read model | Server transaction for onboarding |
| `subscriptions` | Durable provider/local billing ledger | Server writes; governed owner reads |
| `authPhoneOtpChallenges` | OTP challenge, attempts, delivery and verification lease | Server only |
| `authPhoneOtpLoginTokens` | Short-lived one-time NextAuth bridge | Server only |
| Claim fields on `users` | Expiring token, reservation, transfer audit | Server claim paths only |

No new Firestore rules, indexes, Storage rules, or Cloud Function logic are required by the July 16 hardening.

## Website onboarding operations

Accepted flow:

- advisory session check: no Firestore cost;
- hashed actor rate limit;
- one subdomain reservation precheck transaction;
- one allocation transaction reading the exact user, counters, summaries, candidate entity IDs, and subdomain claims, then writing tenant/store/summaries/user/referral state;
- one public cache invalidation attempt;
- one or more Razorpay provider calls;
- one subscription document write;
- one session refresh read and one canonical store read during Firebase claim sync.

Provider failure may add one compensation transaction and one cache invalidation attempt. Ambiguous provider creation may add at most three bounded 100-item provider pages. Ambiguous local persistence adds one exact subscription-document read and verifies both ML product aliases, both user aliases, both numeric tenant/store aliases, provider identity, and plan identity before cancellation/compensation.

## Identity and compensation admission

### Onboarding user-ID boundary

First-workspace and reseller helpers normalize user IDs through `src/lib/onboarding/onboardingUserId.ts` before creating user document references. Empty, whitespace-mutated, oversized, slash-containing, and reserved IDs are rejected before Firestore access.

### Onboarding compensation scope boundary

Provider-failure compensation accepts only a normalized user ID and exact positive numeric tenant/store document IDs. The transaction re-reads the exact workspace/user records and removes only matching mappings. These validation helpers add no reads or writes for valid requests; they prevent malformed scope from reaching Firestore and do not create a new collection, index, or retention cost.

## Phone OTP operations

Send performs fail-closed IP admission, a 1KB body cap, fail-closed normalized-phone admission, one challenge write, one WhatsApp provider call, and one delivery-status write. If either limiter provider is unavailable, the route returns 503 before challenge or WhatsApp work.

Verification performs fail-closed IP admission, a 1KB body cap, fail-closed challenge admission, one reservation transaction, bounded existing-user lookup/update or creation, and one final transaction for challenge plus login token. Token consumption is one transaction over the exact token and user.

## Claim operations

Preview performs fail-closed hashed-IP admission before the indexed token lookup. Mutation performs the same fail-closed admission before its 16KB body, token lookup, reservation, Firebase Auth work, final ownership transaction, cache invalidation, or custom-claim mirror.

Account claim uses bounded duplicate detection and at most 100 matching subscription relinks. Cache invalidation and custom-claim mirroring are post-commit recovery effects; failures are logged without repeating or rolling back ownership.

## Firebase Auth operations

- Google login may create one Firebase Auth identity during claim sync.
- Credentials verify the existing Firebase password identity.
- Phone OTP itself does not create a Firebase password identity; `/api/auth/set-claims` creates/resolves the Firebase user needed for Firestore custom-token access.
- Email/password and WhatsApp/passcode account claim create or safely update the bound Firebase Auth identity before final ownership transfer.
- Custom claims use canonical string tenant/store IDs, bounded store IDs, account `platformRole`, and the exact store role. Missing roles are denied instead of being promoted to owner.

The Google first-user Firestore write now uses the shared canonical value sanitizer instead of an auth-local recursive clone. This is operation-count neutral: it adds no read, write, collection, index, rule, Function, or provider call. It prevents SDK-value flattening and fails closed on cyclic, accessor-backed, unsupported, or unsafe-key payloads before the existing deterministic user transaction.

## Deploy boundary

The current changes are Next.js route, UI, helper, verifier, and documentation changes. They do not trigger Firebase infrastructure auto-deploy. A Vercel deploy remains pending until explicitly requested.

The access-status latest-request correction is browser-only. It adds no Firestore read/write/delete, rule, index, Firebase Auth provider call, Storage object, Cloud Function, scheduled task, queue, or cache entry. Ordinary polling cost is unchanged; stale responses are discarded locally instead of becoming current sign-out authority.
