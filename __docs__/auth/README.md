# 🔐 Authentication Documentation

**Complete authentication system documentation for MenuListAI**

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
- **Returns:** `{ success, userId, email, passwordResetEmailSent, staffLoginId?, temporaryPasscode? }`

### `POST /api/staff/password-reset`

Resets staff access for a staff member assigned to the current store. Owner reset creates a new one-time temporary passcode shown to the owner. Staff can use that passcode with email, `S-...` Staff ID, or phone aliases on the same account.

- **Body:** `{ userId, tenantId, storeId }`
- **Auth:** Requires active NextAuth session with `canManageUsers`
- **Returns:** `{ success, userId, passwordResetEmailSent?, staffLoginId?, temporaryPasscode? }`

### `POST /api/auth/phone-otp/start`

Starts WhatsApp phone OTP login for dashboard and `/create-menu`.

- **Body:** `{ phone, purpose }`
- **Auth:** Public endpoint; OTP is the proof
- **Rate limit:** `AUTH_PHONE_OTP_SEND` by IP and phone hash
- **Returns:** `{ success, challengeId, phoneMasked, expiresInSeconds, resendAfterSeconds }`

### `POST /api/auth/phone-otp/verify`

Verifies the OTP challenge and returns a short-lived one-time login token for the existing NextAuth credentials provider.

- **Body:** `{ challengeId, code }`
- **Auth:** Public endpoint; valid unexpired OTP is required
- **Rate limit:** `AUTH_PHONE_OTP_VERIFY` by IP and challenge hash
- **Returns:** `{ success, loginToken, phoneMasked, expiresInSeconds }`
- **Follow-up:** Client calls `signIn('credentials', { phoneOtpLoginToken })`; dashboard Firebase sync continues through `/api/auth/set-claims`.

### `POST /api/auth/claim-account`

Links a messaging-onboarded business to a real account. Three modes:

- **MODE 1 (Google):** `{ claimToken }` — requires active NextAuth session. Transfers tenant/store to Google user doc.
- **MODE 2 (Email/Password):** `{ claimToken, email, password, name? }` — no session required. Creates Firebase Auth user and converts placeholder user doc. The WhatsApp phone also becomes a login alias for the same password.
- **MODE 3 (WhatsApp Phone/Passcode):** `{ claimToken, password, name?, useWhatsappPhone: true }` — no session required. Uses the verified WhatsApp number as the login identifier with the generated messaging email behind Firebase Auth.

### `GET /api/auth/validate-claim?token=TOKEN`

Validates a claim token from messaging onboarding. Returns business info for login page welcome. No authentication required.

### `POST /api/auth/update-profile`

Updates logged-in user's profile fields (name, phone, countryCode, dialCode). Email changes not supported.

- **Auth:** Requires active NextAuth session

### `POST /api/auth/change-password`

Changes logged-in user's password. Verifies current password via Firebase Auth REST API first.

- **Body:** `{ currentPassword, newPassword }`
- **Auth:** Requires active NextAuth session
- **Note:** Works for password/passcode accounts, including email/password, Staff ID/passcode, and WhatsApp-number/passcode accounts. OAuth-only users manage their password with the OAuth provider.

### Key Design Decisions (Auth Audit)

- **`isVerified`** — KEPT. Gate for login: `false` = user doc exists but no Firebase Auth account.
- **`platformRole`** — KEPT. Controls platform admin access (`"PLATFORM"` vs `"OWNER"` vs `"USER"`).
- **`role` vs `roles`** — Only `role` (singular) is used. One role per store per user. `roles` removed from sanitizer.
- **Claim token expiry** — REMOVED. Token is 256-bit cryptographic random (brute force impossible). No support dependency.

---

## �🔄 Related Documentation

- **Security:** `__docs__/security/README.md`
- **Database:** `__docs__/database/README.md`
- **API:** `__docs__/api/README.md`

---

**Last Updated:** February 2026 (Auth Audit)  
**Maintainer:** Platform Team  
**Status:** ✅ Production Active
