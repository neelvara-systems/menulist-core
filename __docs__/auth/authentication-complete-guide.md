# 🔐 Complete Authentication Guide
## MenuListAI Authentication System - The Definitive Guide

**Last Updated:** November 7, 2025  
**Status:** Production Active  
**Author:** Platform Team

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Part 1: NextAuth Deep Dive](#part-1-nextauth-deep-dive)
4. [Part 2: Firebase Auth Deep Dive](#part-2-firebase-auth-deep-dive)
5. [Part 3: Integration & Synchronization](#part-3-integration--synchronization)
6. [Part 4: Complete Login Flows](#part-4-complete-login-flows)
7. [Part 5: Token Management](#part-5-token-management)
8. [Part 6: Security Features](#part-6-security-features)
9. [Part 7: API Reference](#part-7-api-reference)
10. [Part 8: Troubleshooting](#part-8-troubleshooting)

---

## Executive Summary

### What This Document Covers

This is the **complete authentication documentation** for MenuListAI. It explains:
- **Two independent auth systems** (NextAuth + Firebase Auth)
- **Why we use both** (server-side sessions + client-side tokens)
- **How they synchronize** (custom token pattern)
- **Complete login/logout flows** (OAuth + credentials)
- **Token lifecycle** (creation, refresh, expiration)
- **Security model** (custom claims, rate limiting, account lockout)

### Quick Facts

| System | Purpose | Technology | Token Lifespan |
|--------|---------|------------|----------------|
| **NextAuth** | Server-side sessions | JWT in HTTP-only cookie | 30 days |
| **Firebase Auth** | Client-side auth | Access token + refresh token | 1 hour (auto-refresh) |
| **Firestore** | User data storage | NoSQL database | N/A |
| **Integration** | Sync via custom tokens | Firebase Admin SDK | One-time at login |

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │   NextAuth JWT   │              │ Firebase Auth    │         │
│  │  (HTTP Cookie)   │              │  (localStorage)  │         │
│  │  30 days         │              │  1hr + refresh   │         │
│  └──────────────────┘              └──────────────────┘         │
│           │                                  │                   │
│           │ useSession()                     │ firebaseUser     │
│           └──────────────┬───────────────────┘                   │
│                          │                                       │
│                    React Components                              │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ HTTP Requests
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              NextAuth Middleware                     │        │
│  │  • Validates JWT                                     │        │
│  │  • Checks session expiration                        │        │
│  │  • Populates req.session                            │        │
│  └─────────────────────────────────────────────────────┘        │
│                           │                                       │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              API Routes (Protected)                  │        │
│  │  • /api/auth/set-claims                             │        │
│  │  • /api/subscriptions/*                             │        │
│  │  • /api/stores/*                                    │        │
│  └─────────────────────────────────────────────────────┘        │
│                           │                                       │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         Firebase Admin SDK (Server)                  │        │
│  │  • Creates custom tokens                            │        │
│  │  • Sets custom claims                               │        │
│  │  • Verifies tokens                                  │        │
│  └─────────────────────────────────────────────────────┘        │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Firestore   │  │ Firebase     │  │  Firebase    │          │
│  │  Database    │  │  Storage     │  │  Functions   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Two Auth Systems - Why?

| Feature | NextAuth | Firebase Auth | Winner |
|---------|----------|---------------|--------|
| **OAuth (Google)** | ✅ Built-in | ❌ Complex setup | NextAuth |
| **Server-side protection** | ✅ Easy middleware | ❌ Requires verification | NextAuth |
| **Firestore security rules** | ❌ No direct support | ✅ Native integration | Firebase |
| **Firebase Functions auth** | ❌ Not supported | ✅ request.auth | Firebase |
| **Session storage** | ✅ HTTP-only cookie | ❌ localStorage (less secure) | NextAuth |
| **Token refresh** | ❌ Manual (30 days then re-login) | ✅ Automatic (every hour) | Firebase |

**Conclusion:** Use **both** to get the best of both worlds!

---

## Part 1: NextAuth Deep Dive

### What is NextAuth?

**NextAuth.js** is an authentication library specifically designed for Next.js applications. It provides:
- OAuth provider integration (Google, GitHub, etc.)
- Credentials-based login
- JWT session management
- Server-side session validation
- CSRF protection
- Built-in security best practices

### How NextAuth Works

```
User Action (Login)
       ↓
NextAuth Provider (Google/Credentials)
       ↓
Authentication succeeds
       ↓
NextAuth callbacks execute:
   1. signIn() → Validate user
   2. jwt() → Create JWT token
   3. session() → Populate session object
       ↓
JWT saved in HTTP-only cookie
       ↓
Session available via useSession()
```

### NextAuth Configuration

**File:** `src/lib/auth/index.ts`

```typescript
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",           // Use JWT (not database sessions)
    maxAge: 30 * 24 * 60 * 60, // 30 days (2,592,000 seconds)
  },
  secret: process.env.NEXTAUTH_SECRET,
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {},
      async authorize(credentials) {
        // Password verification logic
      }
    })
  ],
  
  callbacks: {
    signIn: async ({ user, account }) => { /* ... */ },
    jwt: async ({ token, user }) => { /* ... */ },
    session: async ({ session, token }) => { /* ... */ }
  }
};
```

### NextAuth Callbacks Explained

#### 1. **signIn Callback**

**Purpose:** Control who can sign in

**When it runs:** After successful OAuth/credentials authentication

**Return values:**
- `true` → Allow login
- `false` → Block login
- `string` → Redirect to that URL

**Our implementation:**
```typescript
signIn: async ({ user, profile, account }) => {
  const email = user?.email?.toLowerCase()?.trim();
  
  // 1. Validate email (block disposable emails)
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    await logFailedLogin(email, 'invalid_email', 'google');
    return '/unauthorized?error=' + emailValidation.reason;
  }
  
  // 2. Get or create user in Firestore
  let dbUser = await getUserByEmail(email);
  if (!dbUser) {
    dbUser = await addPlatformUser({
      email,
      name: user.name,
      isVerified: true, // OAuth users pre-verified
      active: true,
      tenantId: null,   // Set during onboarding
      storeId: null,
      platformRole: 'USER'
    });
  }
  
  // 3. Check if user is active
  if (dbUser.isVerified && dbUser.active) {
    await logSuccessfulLogin(email, 'google');
    return true; // ✅ Allow login
  } else {
    await logFailedLogin(email, 'account_not_verified', 'google');
    return '/unauthorized'; // ❌ Block login
  }
}
```

**Key points:**
- Runs on **every login attempt**
- Can query database
- Can block login based on business logic
- Logs security events

---

#### 2. **jwt Callback**

**Purpose:** Customize JWT token contents

**When it runs:** 
- On login (when JWT is created)
- On every request (to refresh token)
- When `update()` is called

**Our implementation:**
```typescript
jwt: async ({ token, user, trigger }) => {
  const email = token?.email || user?.email;
  
  // First time? Load user from database
  if (!token.dbUser) {
    let dbUser = await getUserByEmail(email);
    
    // Security: Remove dangerous keys
    const safeOAuthUser = user ? removeKeys(user, DANGEROUS_KEYS) : {};
    const safeDbUser = getDatabaseUserForSession(dbUser);
    
    token.dbUser = { ...safeOAuthUser, ...safeDbUser };
  }
  
  // Manual update? Refetch from database
  if (trigger === "update") {
    const updatedUser = await getUserByEmail(email);
    token.dbUser = getDatabaseUserForSession(updatedUser);
  }
  
  return token;
}
```

**Token structure:**
```typescript
{
  email: "user@example.com",
  name: "John Doe",
  picture: "https://...",
  iat: 1234567890,  // Issued at
  exp: 1237159890,  // Expires at (30 days later)
  jti: "unique-id", // JWT ID
  dbUser: {
    id: "abc123",
    tenantId: 14,
    storeId: 15,
    role: "OWNER",
    platformRole: "USER"
  }
}
```

**Key points:**
- Token stored in **HTTP-only cookie** (secure!)
- Can add custom data to token
- Database queries **are** allowed
- Token is **encrypted** (JWE)

---

#### 3. **session Callback**

**Purpose:** Shape the session object available to client

**When it runs:** Every time `useSession()` or `getServerSession()` is called

**Our implementation:**
```typescript
session: async ({ session, token }) => {
  if (token?.dbUser) {
    const dbUser = token.dbUser;
    
    // Security: Block dangerous keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerousKeys) {
      if (key in dbUser) {
        return session; // Return empty session
      }
    }
    
    // Populate session
    session.user = {
      ...session.user,
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      tenantId: dbUser.tenantId,
      storeId: dbUser.storeId,
      platformRole: dbUser.platformRole
    };
    
    // Add shorthand properties
    session.tId = dbUser.tenantId;
    session.sId = dbUser.storeId;
    session.uId = dbUser.id;
    session.role = dbUser.stores?.[0]?.roles[0];
  }
  
  return session;
}
```

**Session structure (what `useSession()` returns):**
```typescript
{
  user: {
    id: "abc123",
    email: "user@example.com",
    name: "John Doe",
    image: "https://...",
    tenantId: 14,
    storeId: 15,
    platformRole: "USER"
  },
  tId: 14,       // Shorthand
  sId: 15,       // Shorthand
  uId: "abc123", // Shorthand
  role: "OWNER",
  expires: "2025-12-07T..." // 30 days from login
}
```

**Key points:**
- Runs on **every request** (performance matters!)
- **NO database queries** allowed (use token data)
- Controls what client can see
- Strips sensitive data

---

### NextAuth Session Management

#### Client-Side Usage

```typescript
// In React components
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Not logged in</div>;
  
  return <div>Welcome {session.user.name}</div>;
}
```

#### Server-Side Usage

```typescript
// In API routes
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Use session.user.tenantId, etc.
}
```

#### Middleware Protection

```typescript
// src/middleware/auth.ts
export function withAuth(handler) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return handler(request, session);
  };
}
```

### NextAuth Token Lifecycle

```
Day 0: User logs in
├─ JWT created with dbUser data
├─ Stored in HTTP-only cookie
└─ Expires in 30 days

Day 1-29: User browses app
├─ Every request includes cookie
├─ session() callback runs (fast, no DB query)
└─ Session data available

Day 30: JWT expires
├─ useSession() returns status: 'unauthenticated'
├─ User redirected to login
└─ Must login again (new JWT created)
```

**Important:** JWT tokens **do not auto-refresh**. After 30 days, user must re-login.

---

## Part 2-5: Continue Reading

The complete authentication guide is split into multiple documents for easier navigation:

📖 **[Part 2: Firebase Auth Deep Dive](./auth-guide-part2-firebase.md)**
- What is Firebase Auth?
- Token structure and lifecycle
- Custom claims implementation
- Client & Admin SDK configuration

📖 **[Part 3: Integration & Synchronization](./auth-guide-part2-firebase.md#part-3-integration--synchronization)**
- Why we need both systems
- Custom token sync pattern
- useFirebaseAuthSync hook

📖 **[Part 4: Complete Login Flows](./auth-guide-part3-flows.md)**
- OAuth login (Google) - detailed flow
- Password login (credentials) - detailed flow
- Logout flow - clearing both systems

📖 **[Part 5: Token Management](./auth-guide-part3-flows.md#part-5-token-management)**
- Token expiration timeline
- Storage locations
- Manual refresh
- Checking expiration

📖 **[Quick Reference](./quick-reference.md)** - One-page cheat sheet

---

## Part 6: Security Features

### Disposable Email Blocking

**Purpose:** Prevent spam and fake accounts

**Implementation:**
```typescript
// src/lib/validation/emailDomainValidator.ts
export function validateEmail(email: string): {
  valid: boolean;
  reason?: string;
} {
  // Check disposable email list
  const domain = email.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed' };
  }
  
  return { valid: true };
}
```

**Used in:**
- OAuth signIn callback
- Credentials authorize function
- Both block invalid emails before creating accounts

### Account Lockout

**Purpose:** Prevent brute-force attacks

**Rules:**
- 5 failed attempts within 15 minutes = account locked
- Lock duration: 15 minutes
- Auto-unlocks after duration

**Implementation:**
```typescript
// src/lib/auth/security.ts
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;   // 15 minutes

export async function checkAccountLock(email: string): Promise<{
  isLocked: boolean;
  failedAttempts: number;
  lockedUntil?: Date;
}> {
  // Query authSecurityEvents for recent failures
  // Return lock status
}
```

**Security events stored in Firestore:**
```typescript
{
  email: "user@example.com",
  eventType: "account_locked",
  timestamp: Timestamp.now(),
  reason: "Account locked after 5 failed login attempts",
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
```

### Login Source Tracking

**Purpose:** Track which auth method users use (analytics + security)

**Sources tracked:**
- `google` - OAuth via Google
- `credentials` - Email + password
- `unknown` - Fallback

**Implementation:**
```typescript
await logSuccessfulLogin(email, 'google');
await logFailedLogin(email, 'invalid_password', 'credentials');
```

**Analytics queries:**
```typescript
// Count by source
const stats = await db.collection('authSecurityEvents')
  .where('eventType', '==', 'login_success')
  .where('source', '==', 'google')
  .get();

console.log('Google logins:', stats.size);
```

### Prototype Pollution Prevention

**Purpose:** Prevent security vulnerability from dangerous object keys

**Dangerous keys:** `__proto__`, `constructor`, `prototype`

**Implementation:**
```typescript
// src/lib/security/sanitizeObject.ts
export function removeDangerousKeys(data: any): any {
  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  const safe = {};
  
  for (const key in data) {
    if (!DANGEROUS_KEYS.includes(key)) {
      safe[key] = data[key];
    }
  }
  
  return safe;
}
```

**Used in:**
- Firestore data reads (users/index.ts)
- JWT token creation (auth/index.ts)
- Session population (auth/index.ts)

### Custom Claims Validation

**Purpose:** Enforce access control in Firestore rules

**Claims set:**
```typescript
{
  role: "OWNER",          // Store-level role
  tenantId: "14",         // Tenant ID
  storeId: "15",          // Store ID
  uId: "abc123"          // User ID
}
```

**Firestore rules:**
```javascript
// firestore.rules
match /tenants/{tenantId}/stores/{storeId} {
  allow read: if request.auth.token.tenantId == tenantId 
              && request.auth.token.storeId == storeId;
              
  allow write: if request.auth.token.role in ["OWNER", "ADMIN"];
}
```

---

## Part 7: API Reference

### useSession()

**From:** `next-auth/react`

**Purpose:** Get NextAuth session in React components

**Returns:**
```typescript
{
  data: Session | null,
  status: 'loading' | 'authenticated' | 'unauthenticated',
  update: (data?: any) => Promise<Session>
}
```

**Usage:**
```typescript
const { data: session, status } = useSession();

if (status === 'loading') return <Loader />;
if (status === 'unauthenticated') return <Login />;

return <Dashboard user={session.user} />;
```

### useFirebaseAuthSync()

**From:** `@hook/useFirebaseAuthSync`

**Purpose:** Auto-sync Firebase Auth with NextAuth

**Returns:**
```typescript
{
  isSyncing: boolean,
  isSynced: boolean,
  error: Error | null,
  firebaseUser: User | null
}
```

**Usage:**
```typescript
const { firebaseUser, isSyncing } = useFirebaseAuthSync();

if (isSyncing) return <div>Syncing...</div>;

console.log('Firebase user:', firebaseUser);
```

### signIn()

**From:** `next-auth/react`

**Purpose:** Trigger login

**Signatures:**
```typescript
// OAuth
signIn('google', { callbackUrl: '/dashboard' });

// Credentials
signIn('credentials', {
  redirect: false,
  email: 'user@example.com',
  password: 'password123'
});
```

### signOut()

**From:** `next-auth/react`

**Purpose:** Sign out NextAuth only

**Usage:**
```typescript
signOut({ redirect: true, callbackUrl: '/signin' });
```

### signOutSession()

**From:** `@lib/auth/client`

**Purpose:** Sign out both NextAuth AND Firebase

**Usage:**
```typescript
import { signOutSession } from '@lib/auth/client';

signOutSession('/').then(() => router.push('/'));
```

### getServerSession()

**From:** `next-auth`

**Purpose:** Get session server-side

**Usage:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

const session = await getServerSession(authOptions);

if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### withAuth()

**From:** `@middleware/auth`

**Purpose:** Protect API routes

**Usage:**
```typescript
import { withAuth } from '@middleware/auth';

export const GET = withAuth(async (request, session) => {
  // session guaranteed
  return NextResponse.json({ user: session.user });
});

// With role check
export const POST = withAuth(async (request, session) => {
  // ...
}, {
  requiredRole: 'OWNER',
  requiredPlatformRole: 'ADMIN'
});
```

---

## Part 8: Troubleshooting

### Issue: Session is undefined

**Symptoms:**
- `useSession()` returns `null`
- `status` is `'unauthenticated'`

**Possible causes:**
1. Not wrapped in `SessionProvider`
2. Session cookie missing
3. JWT expired (after 30 days)

**Fix:**
```typescript
// 1. Check SessionProvider
// app/layout.tsx
<SessionProvider>
  {children}
</SessionProvider>

// 2. Check cookie
// DevTools → Application → Cookies → next-auth.session-token

// 3. Check expiration
const { data: session } = useSession();
console.log('Expires:', new Date(session?.expires));
```

### Issue: firebaseAuth.currentUser is null

**Symptoms:**
- `firebaseAuth.currentUser` returns `null`
- Can't query Firestore

**Possible causes:**
1. Not using `useFirebaseAuthSync()` hook
2. Sync failed
3. Syncing in progress

**Fix:**
```typescript
// 1. Use the hook
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';

const { firebaseUser, isSyncing, error } = useFirebaseAuthSync();

// 2. Check syncing state
if (isSyncing) {
  console.log('Syncing...');
}

// 3. Check for errors
if (error) {
  console.error('Sync error:', error);
}

// 4. Verify sync endpoint works
const response = await fetch('/api/auth/set-claims', { method: 'POST' });
console.log('Response:', await response.json());
```

### Issue: Custom claims not available

**Symptoms:**
- `tokenResult.claims` is empty
- Firestore rules deny access

**Fix:**
```typescript
// 1. Set claims
await fetch('/api/auth/set-claims', {
  method: 'POST',
  body: JSON.stringify({ uid: firebaseUser.uid })
});

// 2. Force token refresh
const user = firebaseAuth.currentUser;
await user.getIdToken(true); // true = force refresh

// 3. Verify claims
const tokenResult = await user.getIdTokenResult();
console.log('Claims:', tokenResult.claims);
```

### Issue: Account locked

**Symptoms:**
- Login fails with "Account locked" message
- Can't login even with correct password

**Fix:**
```typescript
// Option 1: Wait 15 minutes (auto-unlock)

// Option 2: Manual unlock (Firestore Console)
// 1. Go to authSecurityEvents collection
// 2. Find documents where:
//    - email = user email
//    - eventType = "account_locked"
// 3. Delete these documents

// Option 3: Programmatic unlock
const events = await db.collection('authSecurityEvents')
  .where('email', '==', email)
  .where('eventType', '==', 'account_locked')
  .get();

events.forEach(doc => doc.ref.delete());
```

---

## Summary

### What We've Covered

✅ **NextAuth** - Server-side sessions with OAuth  
✅ **Firebase Auth** - Client-side tokens for Firestore  
✅ **Custom Token Sync** - Bridging the two systems  
✅ **Complete Flows** - OAuth, password, logout  
✅ **Token Management** - Lifecycle, expiration, refresh  
✅ **Security** - Lockout, validation, logging  
✅ **API Reference** - All hooks and functions  
✅ **Troubleshooting** - Common issues and fixes

### Key Takeaways

1. **Two systems are better than one** - NextAuth + Firebase = best of both
2. **Custom tokens bridge the gap** - useFirebaseAuthSync handles sync
3. **Tokens have different lifespans** - NextAuth 30 days, Firebase 1 hour (auto-refresh)
4. **Security is multi-layered** - Email validation, lockout, logging, sanitization
5. **Logout must clear both** - Use signOutSession(), not just signOut()

### Next Steps

- Read [Part 2](./auth-guide-part2-firebase.md) for Firebase Auth details
- Read [Part 3](./auth-guide-part3-flows.md) for complete login flows
- Check [Quick Reference](./quick-reference.md) for code snippets
- Review [firebase-auth-sync.md](./firebase-auth-sync.md) for sync pattern

---

**Documentation complete!** 🎉

For questions or updates, refer to the [README](./README.md) or check specific guides.
