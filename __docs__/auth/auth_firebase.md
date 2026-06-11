# Authentication — Firebase Cost Tracking

**Feature:** Authentication System (NextAuth.js + Firebase)  
**Status:** ✅ Production Ready  
**Last Updated:** June 11, 2026
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
| Session validation | — (JWT)             | Per API call              | Per call  | 0         | JWT-based session — no Firestore read. `withAuth()` validates JWT token. The compact session user includes `storeIds` derived from the user document for multi-location guard helpers. |
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

### `POST /api/staff`

| Operation                               | Collection | Type       | Frequency          | Notes                             |
| --------------------------------------- | ---------- | ---------- | ------------------ | --------------------------------- |
| Firebase Auth createUser                | —          | Auth Write | Per staff creation | Admin SDK. Staff get Staff ID alias; email staff also get setup email |
| Firebase Auth sendOobCode               | —          | Auth Write | Per email staff creation | Sends password setup email        |
| Update staff doc reset metadata         | `users`    | Write      | Per staff creation | `staffLoginId`, `loginUsername`, `phoneUsername`, setup metadata |

### `POST /api/staff/password-reset`

| Operation                       | Collection | Type       | Frequency | Notes                                      |
| ------------------------------- | ---------- | ---------- | --------- | ------------------------------------------ |
| Read staff doc                  | `users`    | Read       | Per reset | Validate tenant and current store mapping  |
| Firebase Auth updateUser        | —          | Auth Write | Per reset | Owner reset creates a new temporary passcode for the same Firebase Auth account |
| Update staff doc reset metadata | `users`    | Write      | Per reset | Records request timestamp and requester ID |

Owner-triggered reset never stores the staff password or passcode. The temporary passcode is returned once to the owner so it can be shared offline. Staff self-service reset still uses Firebase email reset when a real email exists.

### `POST /api/auth/claim-account`

| Operation                         | Collection | Type       | Frequency               | Notes                               |
| --------------------------------- | ---------- | ---------- | ----------------------- | ----------------------------------- |
| Query by claimToken               | `users`    | Read       | Per claim               | 1 doc read (indexed query)          |
| Update messaging user doc         | `users`    | Write      | Per claim (Mode 1, 2, 3) | Clear claimToken, update email/name/phone login alias |
| Update tenant doc                 | `tenants`  | Write      | Per claim (Mode 1 only) | Transfer ownership                  |
| Update store docs                 | `stores`   | Write      | Per claim (Mode 1 only) | Transfer ownership                  |
| Firebase Auth createUser/updateUser | —        | Auth Write | Per claim (Mode 2 and 3) | Admin SDK; Mode 3 uses generated messaging email behind phone login |
| Firebase Auth setCustomUserClaims | —          | Auth Write | Per claim (Mode 2 and 3) | Set tenantId/storeId                |

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
- `users/{userId}` direct Firestore writes are platform-admin only. Owner/staff profile changes, password changes, staff CRUD, role assignments, and revocation metadata are server API writes.
- `update-profile` allows only whitelisted fields — no login email changes
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
