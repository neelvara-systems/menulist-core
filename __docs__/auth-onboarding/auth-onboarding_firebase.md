# Auth Onboarding — Firebase Cost Tracking

**Feature:** Authentication & Onboarding Flow
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 1, 2026
**Priority:** HIGH — Every new user triggers Firebase Auth + Firestore writes.

---

## Summary

- **Collections Used:** `users`, `tenants`, `stores`, `platformSummary`, `sessions`
- **Storage Buckets:** None
- **Cloud Functions:** None (NextAuth handles auth server-side)
- **Firebase Auth:** Google Sign-In via NextAuth.js → Firebase Admin SDK
- **Estimated Monthly Cost:** **Low** — Per-signup cost, not per-session

## Current Launch Boundary

This cost note documents the source-level Firebase Auth and Firestore cost profile for the implemented onboarding path. It is not current production-launch approval by itself.

Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Firebase Auth custom-claims/token smoke, Firestore rules/deploy evidence where auth/onboarding rules change, Razorpay sandbox onboarding evidence, provider-failure compensation evidence, cost monitoring for signup/payment paths, and target-environment deploy smoke.

The local source gate does not create Firebase Auth users, mint live custom tokens, write Firestore onboarding documents, call Razorpay, deploy Firebase, deploy Vercel, run browser/device QA, run a production build, or certify production-host behavior.

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Check existing user | `users` | Login attempt | Per login | 1 | Check if user doc exists by email/UID. |
| Load user session | `users/{userId}` | Session validation | Per API call (cached) | 0-1 | NextAuth caches session. First call reads, subsequent use cache. |
| Load tenant/store info | `tenants`, `stores` | After login | Per session | 1-2 | Loaded once, cached in session token. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Notes |
|-----------|-----------|---------|-----------|-------------|-------|
| Create user doc | `users` | First-time signup | Per new user | 1 | User profile, role, tenant/store assignment. |
| Create tenant doc | `tenants` | New tenant onboarding | Per new tenant | 1 | Billing entity, subscription info. |
| Create store doc | `stores` | New store setup | Per new store | 1 | Full store config with defaults. |
| Provider/persistence-failure compensation | `users`, `tenants`, `stores`, `platformSummary/storesSummary` | Razorpay plan/subscription setup fails, or initial `subscriptions` persistence fails after provider creation | Failure only | 3-4 plus one provider cancellation call for post-provider persistence failure | Marks tenant/store inactive, clears failed user mapping when it matches the just-created scope, removes referral attribution, and hides the store from summary-backed public reads. User document refs pass through the onboarding user-ID boundary first. |
| Current onboarding authority lock | `users/{userId}` | Every website onboarding transaction | 1 transaction read | 1 | Exact current identity/lifecycle/revocation and empty tenant/store scope are revalidated before counter allocation. The read also serializes concurrent requests so one transaction can win. |
| Ambiguous provider recovery | Razorpay subscription list; no Firestore write | Only when provider creation throws after a plan ID exists | Failure only | Up to 3 provider pages of 100 in a 15-minute window | Exact UUID attempt/source/plan/user/tenant/store notes prevent a second external subscription after a lost create response. |
| Update last login | `users/{userId}` | Each login | Per login | 1 | `lastLoginAt` timestamp. |
| Session management | NextAuth (JWT) | Login/logout | Per session | 0 | JWT-based — no Firestore session writes. |

### Deletes

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| None | — | — | — | Users are deactivated, never deleted. |

---

## Firebase Authentication

| Operation | Trigger | Frequency | Notes |
|-----------|---------|-----------|-------|
| Google Sign-In | User clicks "Sign in with Google" | Per login | OAuth flow via NextAuth → Firebase Admin createCustomToken or verifyIdToken. |
| Token verification | API route access | Per API call | `withAuth()` middleware verifies token. Cached in session. |

---

## Cost Optimization Notes

### Current Optimizations
- **JWT sessions**: No Firestore session storage — JWT tokens are stateless
- **Session caching**: User/tenant/store data loaded once at login, embedded in JWT
- **Onboarding user-ID boundary**: Normal onboarding user updates, provider-failure compensation, and reseller-created owner user docs normalize user IDs through `src/lib/onboarding/onboardingUserId.ts` before `users/{userId}` refs. This adds no reads or writes for valid requests; malformed, whitespace-mutated, path-shaped, reserved, empty, or oversized user IDs fail before user document path composition.
- **Current authority and concurrency boundary**: Website onboarding adds one exact user point read inside the creation transaction. It is authorization and a contention lock, not a redundant profile lookup. Current inactive/unverified/blocked/revoked/mismatched users, existing scope, malformed scope collections, and concurrent losers fail before tenant/store writes.
- **Provider response privacy**: Razorpay notes and the full provider object remain server-private. The browser response contains only the validated subscription ID and numeric tenant/store IDs. Provider checkout URL is normalized to the fixed HTTPS `rzp.io` host before persistence.
- **Onboarding compensation scope boundary**: Provider-failure compensation requires exact positive numeric tenant/store document IDs before `tenants/{tenantId}`, `stores/{storeId}`, or `platformSummary/storesSummary.stores.{storeId}` compensation writes. This adds no reads or writes for valid requests; malformed, whitespace-mutated, path-shaped, reserved, zero, negative, unsafe, leading-zero, or nonnumeric scope fails before compensation document path composition.
- **No per-request auth reads**: `getActiveSession()` reads from JWT, not Firestore

### Warnings
- **`lastLoginAt` update**: Every login writes to user doc. High-frequency users = many writes.

---

## Cost Estimate (per 1000 users, 5 logins/user/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firebase Auth (sign-ins) | 5,000 | Free tier (10K/month) | $0.00 |
| Firestore Reads (user check) | 5,000 | $0.06/100K | $0.00 |
| Firestore Writes (last login) | 5,000 | $0.18/100K | $0.01 |
| Firestore Writes (new users) | 50 (5% growth) | $0.18/100K | $0.00 |
| **Total** | | | **~$0.01/month** |

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `getActiveSession` | `src/lib/auth/getActiveSession.ts` | Read (JWT cache) |
| NextAuth callbacks | `src/app/api/auth/[...nextauth]/route.ts` | Read + Write |
