# 🔐 Authentication Documentation

**Complete authentication system documentation for MenuListAI**

> **Status:** Auth documentation hub; not current launch certification
>
> **Launch Boundary:** This hub routes current auth approval to the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:agent-readiness`, `npm run verify:auth-security-failure-matrix`, auth browser/API smoke, Firebase Auth custom-claims/token smoke, App Check/session-cookie review, login/logout/OAuth/password/staff-passcode QA, target deploy evidence where auth-adjacent routes or rules change, and production-host smoke.

---

## 📚 Documentation Structure

This folder contains the **complete authentication guide** split into manageable parts:

### Main Guide

📖 **[authentication-complete-guide.md](./authentication-complete-guide.md)** - Start here!

- Executive Summary
- Architecture Overview
- Part 1: NextAuth Deep Dive

### Extended Guides

📖 **[auth-guide-part2-firebase.md](./auth-guide-part2-firebase.md)**

- Part 2: Firebase Auth Deep Dive
- Part 3: Integration & Synchronization

📖 **[auth-guide-part3-flows.md](./auth-guide-part3-flows.md)**

- Part 4: Complete Login Flows (OAuth, Password, Logout)
- Part 5: Token Management

### Specialized Guides

📖 **[firebase-auth-sync.md](./firebase-auth-sync.md)** - Firebase Auth sync pattern
📖 **[login-source-tracking.md](../security/login-source-tracking.md)** - Security logging
📖 **[phone-otp-auth](../phone-otp-auth/README.md)** - WhatsApp OTP auth, country-code handling, and canonical phone storage contract

---

## 🎯 Quick Start

### For New Developers

**Read in this order:**

1. [authentication-complete-guide.md](./authentication-complete-guide.md) - Architecture overview
2. [auth-guide-part2-firebase.md](./auth-guide-part2-firebase.md) - Firebase integration
3. [auth-guide-part3-flows.md](./auth-guide-part3-flows.md) - Login flows

### For Specific Tasks

| Task                     | Guide                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| **Add OAuth provider**   | Part 1: NextAuth Deep Dive                                       |
| **Fix Firebase sync**    | [firebase-auth-sync.md](./firebase-auth-sync.md)                 |
| **Work on phone login**  | [phone-otp-auth](../phone-otp-auth/README.md)                    |
| **Add security logging** | [login-source-tracking.md](../security/login-source-tracking.md) |
| **Debug session issues** | Part 5: Token Management                                         |
| **Implement logout**     | Part 4: Logout Flow                                              |

### Current Auth Diagnostic Rule

Firebase client bootstrap, App Check initialization, Firebase Auth sync, and session-provider auth bootstrap failures use `src/lib/firebase/firebaseDiagnostics.ts`. Do not debug these paths by logging `session`, `firebaseAuth.currentUser`, emails, tenant/store IDs, custom tokens, or raw provider errors in browser logs. Use the bounded failure codes guarded by `npm run verify:auth-security-failure-matrix`.

NextAuth callback, client sign-out, active-session fetch, and development-only fetched-user diagnostics use `src/lib/auth/authDiagnostics.ts`. Do not debug these paths by logging callback URLs, hostnames, pathnames, sessions, tenant/store IDs, user objects, masked emails, or raw provider errors. The helper records presence/length/count metadata, normalized auth codes, and source error name/code/status only.

Login, forgot-password, and Phone OTP auth pages render only fixed local failure copy. Do not pass API response text, NextAuth response errors, Firebase browser exceptions, fetch errors, or provider messages into owner-visible auth form state.

Login-page claim setup and Google claim linking must not treat `success: true` alone as account ownership completion. The browser must receive an OK `/api/auth/claim-account` response with `success: true`, the expected claim `mode`, and tenant/store identity before it clears `pendingClaimToken`, shows success, refreshes session state, or redirects.

Firebase SDK `accessToken` and `refreshToken` values must not be copied into app user objects or logs. The old unused `src/utils/usersUtils.ts` token extraction helper was removed; the auth/security verifier guards against reintroducing Firebase `stsTokenManager` token extraction.

---

## 🏗️ System Architecture

### Two Auth Systems Working Together

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                            │
│                                                               │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   NextAuth   │              │ Firebase Auth │            │
│  │     JWT      │◄─────sync────┤    Tokens     │            │
│  │  (30 days)   │              │  (1hr + auto) │            │
│  └──────────────┘              └──────────────┘            │
│         │                              │                     │
│         │                              │                     │
│  useSession()                  firebaseUser                 │
└─────────┼──────────────────────────────┼──────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVER (NEXT.JS + FIREBASE)                     │
│                                                               │
│  ┌────────────┐                  ┌────────────┐            │
│  │  NextAuth  │◄───custom────────┤  Firebase  │            │
│  │ Middleware │     token        │   Admin    │            │
│  └────────────┘                  └────────────┘            │
│         │                              │                     │
│         └──────────┬───────────────────┘                     │
│                    ▼                                         │
│              Firestore DB                                    │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**

- **NextAuth** = Server-side sessions (JWT in HTTP-only cookie)
- **Firebase Auth** = Client-side tokens (for Firestore rules)
- **Custom tokens** = Bridge between the two systems
- **Both required** = Best of both worlds!

---

## 🔑 Key Concepts

### NextAuth (Server-Side Sessions)

**Purpose:** Server-side authentication & OAuth

**Features:**

- ✅ Easy OAuth (Google)
- ✅ Secure HTTP-only cookies
- ✅ Server-side middleware
- ✅ 30-day sessions

**Storage:** HTTP-only cookie (XSS-safe)

**Expiration:** 30 days (then re-login required)

### Firebase Auth (Client-Side Tokens)

**Purpose:** Client-side auth for Firebase services

**Features:**

- ✅ Firestore security rules
- ✅ Firebase Functions auth
- ✅ Auto-refreshing tokens
- ✅ Custom claims

**Storage:** localStorage (XSS-vulnerable)

**Expiration:** 1 hour (auto-refreshes)

### Custom Token Sync

**Purpose:** Bridge between NextAuth and Firebase

**Flow:**

1. User logs in via NextAuth (OAuth/credentials)
2. Server creates Firebase custom token
3. Client signs in to Firebase with custom token
4. Both systems now authenticated!

**Implementation:** `useFirebaseAuthSync` hook

---

## 📖 Documentation Guide

### Part 1: NextAuth Deep Dive

**Topics covered:**

- What is NextAuth?
- Configuration (`authOptions`)
- Callbacks (`signIn`, `jwt`, `session`)
- Session management (client & server)
- Token lifecycle

**Key files:**

- `src/lib/auth/index.ts` - NextAuth configuration
- `src/middleware/auth.ts` - Server-side protection

### Part 2: Firebase Auth Deep Dive

**Topics covered:**

- What is Firebase Auth?
- Token structure (access + refresh)
- Custom claims (security rules integration)
- Client configuration
- Admin SDK configuration
- Token lifecycle

**Key files:**

- `src/lib/firebase/firebaseClient.ts` - Client setup
- `src/lib/firebase/firebaseAdmin.ts` - Server setup
- `src/app/api/auth/set-claims/route.ts` - Custom token creation

### Part 3: Integration & Synchronization

**Topics covered:**

- Why we need both systems
- Custom token sync pattern
- `useFirebaseAuthSync` hook
- Sync detection and handling
- Error handling

**Key files:**

- `src/hooks/useFirebaseAuthSync.ts` - Auto-sync hook
- `src/app/api/auth/set-claims/route.ts` - Server endpoint

### Part 4: Complete Login Flows

**Topics covered:**

- OAuth login (Google) - step by step
- Password login (credentials) - step by step
- Logout flow - clearing both systems
- Code implementation examples

**Key files:**

- `src/lib/auth/index.ts` - All providers & callbacks
- `src/lib/auth/client.ts` - Client-side auth functions
- `src/components/templates/loginPage/index.tsx` - Login UI

### Part 5: Token Management

**Topics covered:**

- Token expiration timeline
- Storage locations & security
- Checking token expiration
- Manual token refresh
- Token rotation

---

## 🔒 Security Features

Our authentication system includes:

| Feature                            | Location                   | Status    |
| ---------------------------------- | -------------------------- | --------- |
| **Disposable email blocking**      | `emailDomainValidator.ts`  | ✅ Active |
| **Account lockout**                | `src/lib/auth/security.ts` | ✅ Active |
| **Rate limiting**                  | Security events collection | ✅ Active |
| **Login source tracking**          | Security events collection | ✅ Active |
| **Prototype pollution prevention** | `sanitizeObject.ts`        | ✅ Active |
| **Custom claims validation**       | Firestore rules            | ✅ Active |
| **CSRF protection**                | NextAuth built-in          | ✅ Active |

---

## 🛠️ Common Tasks

### Add a New User

```typescript
import { addPlatformUser } from "@database/users";

const newUser = await addPlatformUser({
  email: "user@example.com",
  name: "John Doe",
  isVerified: true,
  active: true,
  tenantId: null,
  storeId: null,
  platformRole: "USER",
});
```

### Check if User is Authenticated

**Client-side:**

```typescript
import { useSession } from 'next-auth/react';

const { data: session, status } = useSession();

if (status === 'loading') return <Loader />;
if (status === 'unauthenticated') return <Login />;

return <Dashboard user={session.user} />;
```

**Server-side:**

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@lib/auth";

const session = await getServerSession(authOptions);

if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Get Firebase User

```typescript
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';

const { firebaseUser, isSyncing } = useFirebaseAuthSync();

if (isSyncing) return <div>Syncing...</div>;
if (!firebaseUser) return <div>Not authenticated</div>;

// Use firebaseUser.uid, firebaseUser.email, etc.
```

### Protect an API Route

```typescript
import { withAuth } from "@middleware/auth";

export const GET = withAuth(async (request, session) => {
  // session is guaranteed to exist
  const tenantId = session.tId;
  const storeId = session.sId;

  // Your logic here
});
```

### Update Session After Profile Change

```typescript
import { useSession } from "next-auth/react";

const { update } = useSession();

// After updating user profile
await fetch("/api/user/update-profile", {
  method: "POST",
  body: JSON.stringify({ name: "New Name" }),
});

// Refresh session (triggers jwt callback)
await update();
```

---

## 🐛 Troubleshooting

### Session is Undefined

**Check:**

1. Is `useSession()` wrapped in `SessionProvider`?
2. Is the session cookie present? (Check DevTools → Application → Cookies)
3. Has the JWT expired? (Check `session.expires`)

**Fix:**

- Ensure `<SessionProvider>` wraps your app
- Clear cookies and re-login
- Check NextAuth configuration

### firebaseAuth.currentUser is Null

**Check:**

1. Did you use `useFirebaseAuthSync()` hook?
2. Is the hook syncing? (Check `isSyncing` state)
3. Check browser console for sync errors

**Fix:**

- Import and use `useFirebaseAuthSync` hook in component
- Check `/api/auth/set-claims` endpoint works
- Clear localStorage and re-login

### Custom Claims Not Available

**Check:**

1. Did you call `/api/auth/set-claims`?
2. Did you refresh the token after setting claims?

**Fix:**

```typescript
const user = firebaseAuth.currentUser;

// Set claims (server-side)
await fetch("/api/auth/set-claims", {
  method: "POST",
  body: JSON.stringify({ uid: user.uid }),
});

// Force token refresh
await user.getIdToken(true);

// Check claims
const tokenResult = await user.getIdTokenResult();
console.log("Claims:", tokenResult.claims);
```

### Account Locked

**Check:**

- Look for `account_locked` events in Firestore `authSecurityEvents` collection
- Check when account was locked (15-minute lockout)

**Fix:**

- Wait 15 minutes, or
- Manually delete lockout event from Firestore, or
- Use admin panel to unlock account

---

## 📊 Monitoring & Analytics

### Security Events

All auth events logged to Firestore:

**Collection:** `authSecurityEvents`

**Event types:**

- `login_success` - Successful login
- `login_failed` - Failed login attempt
- `account_locked` - Account locked due to failed attempts

**Query examples:**

```typescript
// Recent logins
const events = await db
  .collection("authSecurityEvents")
  .where("eventType", "==", "login_success")
  .where("timestamp", ">", thirtyDaysAgo)
  .orderBy("timestamp", "desc")
  .get();

// Failed attempts for specific user
const failures = await db
  .collection("authSecurityEvents")
  .where("email", "==", "user@example.com")
  .where("eventType", "==", "login_failed")
  .get();
```

### Session Analytics

```typescript
// Active sessions
const { data: session } = useSession();
console.log("User:", session.user.id);
console.log("Login source:", session.loginSource);
console.log("Expires:", session.expires);

// Token info
const tokenResult = await firebaseAuth.currentUser?.getIdTokenResult();
console.log("Issued:", tokenResult.issuedAtTime);
console.log("Expires:", tokenResult.expirationTime);
console.log("Claims:", tokenResult.claims);
```

---

## � Auth API Reference (Added in Auth Audit)

### `POST /api/auth/create-staff`

Compatibility route for staff creation. Current owner UI uses `POST /api/staff`, which creates a Firebase Auth user via Admin SDK. Staff receive a Staff ID alias displayed as `S-...`. Staff with email also receive a Firebase password setup email; staff without email receive an owner-issued one-time temporary passcode.

- **Body:** `{ email?, name, tenantId, storeId }`
- **Auth:** Requires active NextAuth session
- **Admission:** `AUTH_SENSITIVE` limiter, then 16KB bounded JSON body before validation, Firebase Auth, or Firestore writes
- **Returns:** `{ success, userId, email, passwordResetEmailSent, staffLoginId?, temporaryPasscode? }`
- **Browser request/response boundary:** Platform Users sends the compatibility request with the shared staff request policy: same-origin credentials, no browser cache, and manual redirect handling. It then parses the response through `readCreateStaffCompatibilityResponse()` in `src/lib/staffManagement/client.ts`, using the shared 256KB bounded staff response reader before marking a user verified. Successful verification must match create-staff modes (`new_user_created` or `existing_user_added_to_store`) and return user identity. The existing `EMAIL_EXISTS` compatibility code remains bounded and allowlisted.
- **User document acknowledgement:** After staff verification or platform user edits, Platform Users requires `assertUserUpdateSucceeded()` before local table state, drawer close, or success copy changes.
- **Staff login handoff:** Desktop and mobile staff login detail copy actions use `src/lib/staffManagement/shareLoginDetails.ts`, which waits for Clipboard API success or an acknowledged textarea fallback before showing copied feedback. Failed copy diagnostics include clipboard/fallback support booleans and bounded Staff ID/passcode/text length metadata only.

### `POST /api/staff/password-reset`

Resets staff access for a staff member assigned to the current store. Owner reset creates a new one-time temporary passcode shown to the owner. Staff can use that passcode with email, `S-...` Staff ID, or phone aliases on the same account.

- **Body:** `{ userId, tenantId, storeId }`
- **Auth:** Requires active NextAuth session with `canManageUsers`
- **Admission:** `AUTH_SENSITIVE` limiter, then 16KB bounded JSON body before staff lookup or Firebase Auth update
- **Returns:** `{ success, userId, passwordResetEmailSent?, staffLoginId?, temporaryPasscode? }`
- **Staff login handoff:** Temporary passcode copy/share actions use the same acknowledged browser-local copy helper as staff creation. Raw passcodes are shown to the owner for one-time handoff but are not written to diagnostic logs.

### `POST /api/staff` and `PATCH /api/staff`

Owner staff list and mutations stay behind the authenticated staff server helper. Create and update use a 16KB bounded JSON body before schema validation, tenant/store authority checks, Firebase Auth work, or Firestore writes. `DELETE /api/staff` uses query parameters for remove-from-store and does not parse a JSON body. Browser calls use the shared staff request policy: same-origin credentials, no browser cache, and manual redirect handling before bounded response parsing.

### `POST|PATCH /api/staff/roles`

Role create/update uses the same 16KB bounded JSON body before role validation, role-assignment checks, store reads, or store-role writes. `DELETE /api/staff/roles` uses query parameters and does not parse a JSON body. Browser calls use the shared staff request policy before bounded role response parsing.

Role create/update/delete also rejects inactive, soft-deleted, or platform-blocked target stores during the canonical store read. Staff list and staff store-mapping validation use the same store eligibility boundary before returning users or assigning staff to a store.

### `POST /api/auth/phone-otp/start`

Starts WhatsApp phone OTP login for dashboard and `/create-menu`.

- **Body:** `{ phone, purpose }`
- **Auth:** Public endpoint; OTP is the proof
- **Rate limit:** `AUTH_PHONE_OTP_SEND` by IP before parsing, then by phone hash after validation
- **Body admission:** 1KB bounded JSON body before phone normalization or challenge creation
- **Diagnostics:** Expected OTP errors log code-only; unexpected route failures use bounded auth diagnostics with request metadata presence-length only.
- **Returns:** `{ success, action: "start", purpose, challengeId, phoneMasked, expiresInSeconds, resendAfterSeconds }`
- **Browser acknowledgement:** `PhoneOtpAuthPanel` requires the start action, echoed purpose, and challenge id before showing the code-entry step.

### `POST /api/auth/phone-otp/verify`

Verifies the OTP challenge and returns a short-lived one-time login token for the existing NextAuth credentials provider.

- **Body:** `{ challengeId, code }`
- **Auth:** Public endpoint; valid unexpired OTP is required
- **Rate limit:** `AUTH_PHONE_OTP_VERIFY` by IP before parsing, then by challenge hash after validation
- **Body admission:** 1KB bounded JSON body before challenge verification
- **Diagnostics:** Expected OTP errors log code-only; unexpected route failures and consumed-token user mismatches use bounded auth diagnostics.
- **Returns:** `{ success, action: "verify", challengeId, loginToken, phoneMasked, expiresInSeconds }`
- **Browser acknowledgement:** `PhoneOtpAuthPanel` requires the verify action and matching challenge id before using the login token.
- **Follow-up:** Client calls `signIn('credentials', { phoneOtpLoginToken })`; dashboard Firebase sync continues through `/api/auth/set-claims`.

### `POST /api/auth/claim-account`

Links a messaging-onboarded business to a real account. Three modes:

- **MODE 1 (Google):** `{ claimToken }` — requires active NextAuth session. Transfers tenant/store to Google user doc.
- **MODE 2 (Email/Password):** `{ claimToken, email, password, name? }` — no session required. Creates Firebase Auth user and converts placeholder user doc. The WhatsApp phone also becomes a login alias for the same password.
- **MODE 3 (WhatsApp Phone/Passcode):** `{ claimToken, password, name?, useWhatsappPhone: true }` — no session required. Uses the verified WhatsApp number as the login identifier with the generated messaging email behind Firebase Auth.

Modes 1 and 2 also sync the claimed tenant/store email. Because store email is public business truth, the route revalidates public menu, Official Business Page, store, and client-store cache tags after those store email writes.

The route applies the `AUTH_SENSITIVE` hashed-IP limiter before a 16KB bounded JSON body and claim-token lookup. Claim-token lookup boundary: `normalizeAuthClaimToken()` caps tokens to 20-256 base64url/hex-safe characters before the indexed `users.claimToken` query. Missing-token diagnostics record only claim-token presence and length, never token characters.

Before any ownership write, each claim mode re-reads the messaging user document in a Firestore transaction and verifies the same claim token is still present, unexpired, and attached to tenant/store identity. This keeps the token single-use even under duplicate submit or parallel claim attempts.

Claim-account tenant/store scope boundary: the claim route normalizes the messaging user's tenant/store IDs as exact positive numeric Firestore document IDs before Firebase Auth user mutation, tenant/store email writes, subscription relinking, public cache revalidation, custom-claim minting, or success acknowledgement. The final claim transaction re-runs the same scope guard after re-reading the messaging user, so a stale or malformed claim record fails with the normal claim failure copy before raw tenant/store IDs can reach document refs.

### `GET /api/auth/validate-claim?token=TOKEN`

Validates a claim token from messaging onboarding. Returns business info for login page welcome. No authentication required.

- **Rate limit:** `AUTH_SENSITIVE` by hashed IP before claim-token lookup
- **Claim-token lookup boundary:** `normalizeAuthClaimToken()` caps and shape-checks the query token before the indexed `users.claimToken` query. Malformed or oversized values return the normal invalid-link response before Firestore reads.
- **Success acknowledgement:** The browser only enters claim setup when the route returns `valid: true`, `status: "valid"`, `preview: "claim-token"`, and a non-empty business name. Phone values are displayed only when already masked.
- **Diagnostics:** Unexpected failures use bounded auth diagnostics with claim-token and request metadata presence-length only; the token value is never logged.

### `POST /api/auth/update-profile`

Updates logged-in user's profile fields (name, phone, countryCode, dialCode). Email changes not supported.

- **Auth:** Requires active NextAuth session
- **Admission:** Session user ID must pass the shared Firestore document-ID guard, then `DATA_WRITE` limiter by HMAC-hashed normalized session user ID, then 4KB bounded JSON body before validation or user-document reads
- **Client request/response boundary:** Desktop account modal and mobile More profile screen send the request with same-origin credentials, no browser cache, and manual redirect handling. They parse the response through `src/lib/auth/accountClientResponses.ts`, cap JSON at 16KB, and require `success: true`, `updated`, and `updates` before showing success.

### `POST /api/auth/change-password`

Changes logged-in user's password. Verifies current password via Firebase Auth REST API first.

- **Body:** `{ currentPassword, newPassword }`
- **Auth:** Requires active NextAuth session
- **Admission:** Session user ID must pass the shared Firestore document-ID guard, then `AUTH_SENSITIVE` rate limit by HMAC-hashed normalized session user ID before a 2KB bounded JSON body and Firebase Auth verification
- **Client request/response boundary:** Desktop account modal and mobile More account access screen send the request with same-origin credentials, no browser cache, and manual redirect handling. They parse the response through `src/lib/auth/accountClientResponses.ts`, cap JSON at 16KB, and require `success: true` before showing success.
- **Diagnostics:** Missing Firebase API key, current-password verification exceptions, and unexpected route failures use bounded auth diagnostics with session/request metadata presence-length only.
- **Note:** Works for password/passcode accounts, including email/password, Staff ID/passcode, and WhatsApp-number/passcode accounts. OAuth-only users manage their password with the OAuth provider.

### Key Design Decisions (Auth Audit)

- **`isVerified`** — KEPT. Gate for login: `false` = user doc exists but no Firebase Auth account.
- **`platformRole`** — KEPT. Controls platform admin access (`"PLATFORM"` vs `"OWNER"` vs `"USER"`).
- **`role` vs `roles`** — Only `role` (singular) is used. One role per store per user. `roles` removed from sanitizer.
- **Claim token expiry** — Enforced when `claimTokenExpiresAt` is present. Expired tokens are cleared and rejected before account claim or claim-preview data is returned.

---

## �🔄 Related Documentation

- **Security:** `__docs__/security/README.md`
- **Database:** `__docs__/projects/11-database-layer.md`
- **API:** `__docs__/projects/12-api-routes.md`

---

**Last Updated:** February 2026 (Auth Audit)  
**Maintainer:** Platform Team  
**Status:** Auth documentation hub; not current launch certification
