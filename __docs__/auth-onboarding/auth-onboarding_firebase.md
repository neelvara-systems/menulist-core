# Auth Onboarding — Firebase Cost Tracking

**Feature:** Authentication & Onboarding Flow  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** HIGH — Every new user triggers Firebase Auth + Firestore writes.

---

## Summary

- **Collections Used:** `users`, `tenants`, `stores`, `sessions`
- **Storage Buckets:** None
- **Cloud Functions:** None (NextAuth handles auth server-side)
- **Firebase Auth:** Google Sign-In via NextAuth.js → Firebase Admin SDK
- **Estimated Monthly Cost:** **Low** — Per-signup cost, not per-session

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
