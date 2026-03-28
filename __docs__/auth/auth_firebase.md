# Authentication — Firebase Cost Tracking

**Feature:** Authentication System (NextAuth.js + Firebase)  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** MEDIUM — Every API call validates auth. Session-based caching minimizes reads.

---

## Summary

- **Collections Used:** `users`, `tenants`, `stores`
- **Firebase Auth:** Google OAuth via NextAuth.js
- **Storage Buckets:** None
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Very Low** — JWT sessions eliminate per-request Firestore reads

---

## Firestore Operations

### Reads

| Operation          | Collection          | Trigger                   | Frequency | Docs Read | Notes                                                                    |
| ------------------ | ------------------- | ------------------------- | --------- | --------- | ------------------------------------------------------------------------ |
| User lookup        | `users`             | Login (NextAuth callback) | Per login | 1         | Check/create user doc.                                                   |
| Session validation | — (JWT)             | Per API call              | Per call  | 0         | JWT-based session — no Firestore read. `withAuth()` validates JWT token. |
| Tenant/store data  | `tenants`, `stores` | Login (embedded in JWT)   | Per login | 1-2       | Loaded once, embedded in session token.                                  |

### Writes

| Operation                | Collection       | Trigger          | Frequency    | Docs Written | Notes                             |
| ------------------------ | ---------------- | ---------------- | ------------ | ------------ | --------------------------------- |
| Update last login        | `users/{userId}` | Each login       | Per login    | 1            | `lastLoginAt` timestamp.          |
| Create user (new signup) | `users`          | First-time login | Per new user | 1            | Profile, role, tenant assignment. |

### Deletes

None — users are deactivated (soft delete), never hard deleted.

---

## Firebase Auth Operations

| Operation             | Trigger                 | Free Tier      | Notes                                           |
| --------------------- | ----------------------- | -------------- | ----------------------------------------------- |
| Google Sign-In        | User login              | 10K/month free | OAuth flow via NextAuth.                        |
| Token verification    | `withAuth()` middleware | Free           | Firebase Admin SDK verifies tokens server-side. |
| Custom token creation | Session establishment   | Free           | `createCustomToken()` if needed.                |

---

## New Auth APIs (Added Feb 19, 2026 — Auth Audit)

### `POST /api/auth/create-staff`

| Operation                               | Collection | Type       | Frequency          | Notes                             |
| --------------------------------------- | ---------- | ---------- | ------------------ | --------------------------------- |
| Firebase Auth createUser                | —          | Auth Write | Per staff creation | Admin SDK, secure random password |
| Firebase Auth generatePasswordResetLink | —          | Auth Write | Per staff creation | Staff sets own password           |

> No direct Firestore ops — caller (userForm) handles user doc creation via `addPlatformUser()`.

### `POST /api/auth/claim-account`

| Operation                         | Collection | Type       | Frequency               | Notes                               |
| --------------------------------- | ---------- | ---------- | ----------------------- | ----------------------------------- |
| Query by claimToken               | `users`    | Read       | Per claim               | 1 doc read (indexed query)          |
| Update messaging user doc         | `users`    | Write      | Per claim (Mode 1 & 2)  | Clear claimToken, update email/name |
| Update tenant doc                 | `tenants`  | Write      | Per claim (Mode 1 only) | Transfer ownership                  |
| Update store docs                 | `stores`   | Write      | Per claim (Mode 1 only) | Transfer ownership                  |
| Firebase Auth createUser          | —          | Auth Write | Per claim (Mode 2 only) | Admin SDK                           |
| Firebase Auth setCustomUserClaims | —          | Auth Write | Per claim (Mode 2 only) | Set tenantId/storeId                |

### `GET /api/auth/validate-claim`

| Operation           | Collection | Type | Frequency      | Notes                      |
| ------------------- | ---------- | ---- | -------------- | -------------------------- |
| Query by claimToken | `users`    | Read | Per validation | 1 doc read (indexed query) |

### `POST /api/auth/update-profile`

| Operation       | Collection | Type  | Frequency  | Notes                           |
| --------------- | ---------- | ----- | ---------- | ------------------------------- |
| Read user doc   | `users`    | Read  | Per update | 1 doc read (by session user ID) |
| Update user doc | `users`    | Write | Per update | Whitelisted fields only         |

### `POST /api/auth/change-password`

| Operation                    | Collection | Type       | Frequency  | Notes                          |
| ---------------------------- | ---------- | ---------- | ---------- | ------------------------------ |
| Firebase Auth getUserByEmail | —          | Auth Read  | Per change | Verify user exists             |
| Firebase Auth REST verify    | —          | Auth Read  | Per change | Verify current password        |
| Firebase Auth updateUser     | —          | Auth Write | Per change | Set new password               |
| Update user doc              | `users`    | Write      | Per change | modifiedOn + passwordChangedAt |

---

## Security Rules

- All API routes protected with `withAuth()` middleware (except validate-claim and claim-account Mode 2)
- Multi-tenant isolation via `verifyTenantAccess()` — checks `tId/sId` match session
- Rate limiting on expensive operations (`checkExpensiveAILimit`)
- Generic error messages (no sensitive data leakage)
- `claim-account` Mode 2 uses 256-bit claim token as authentication (single-use)
- `update-profile` allows only whitelisted fields — no email changes
- `change-password` verifies current password before allowing change
- `create-staff` generates 24-byte cryptographic random password — never exposed

---

## Cost Estimate (per 1000 users, 100 logins/month total)

| Resource         | Operations/month                                | Unit Cost  | Monthly Cost    |
| ---------------- | ----------------------------------------------- | ---------- | --------------- |
| Firebase Auth    | 100 sign-ins + 5 staff creates + 2 claims       | Free tier  | $0.00           |
| Firestore Reads  | 310 (300 login + 5 claim + 5 profile)           | $0.06/100K | $0.00           |
| Firestore Writes | 115 (100 login + 5 staff + 5 claim + 5 profile) | $0.18/100K | $0.00           |
| **Total**        |                                                 |            | **$0.00/month** |
