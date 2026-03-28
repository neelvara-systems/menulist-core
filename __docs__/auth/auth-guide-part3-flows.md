# 🔄 Authentication Guide - Part 3: Complete Flows

**Parent Guide:** [authentication-complete-guide.md](./authentication-complete-guide.md)

---

## Part 4: Complete Login Flows

### OAuth Login Flow (Google)

This is the **most common** login method in our app.

#### Step-by-Step Flow

```
┌────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "SIGN IN WITH GOOGLE"                           │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. CLIENT: signIn('google')                                    │
│    - NextAuth redirects to Google OAuth                        │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. GOOGLE: User authenticates                                  │
│    - User enters Google credentials                            │
│    - Google verifies identity                                  │
│    - Google redirects back to our app                          │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. NEXTAUTH CALLBACK: /api/auth/callback/google                │
│                                                                 │
│    4a. signIn() callback runs:                                 │
│        - Validates email (block disposable emails)             │
│        - Gets or creates user in Firestore                     │
│        - Checks if user.isVerified && user.active              │
│        - Returns true/false/redirect                           │
│                                                                 │
│    4b. jwt() callback runs:                                    │
│        - Loads dbUser from Firestore                           │
│        - Sanitizes dangerous keys                              │
│        - Creates JWT token with dbUser data                    │
│                                                                 │
│    4c. JWT saved in HTTP-only cookie                           │
│        - Cookie name: next-auth.session-token                  │
│        - Secure, SameSite, HttpOnly flags set                  │
│        - Expires in 30 days                                    │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. REDIRECT TO APP                                             │
│    - User redirected to callbackUrl (default: /)               │
│    - useSession() now returns authenticated session            │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. FIREBASE AUTH SYNC (useFirebaseAuthSync hook)               │
│                                                                 │
│    6a. Hook detects:                                           │
│        - NextAuth: ✅ session exists                           │
│        - Firebase: ❌ firebaseAuth.currentUser is null         │
│                                                                 │
│    6b. Hook calls /api/auth/set-claims:                        │
│        POST /api/auth/set-claims                               │
│        Headers: { Cookie: 'next-auth.session-token=...' }      │
│        Body: {}                                                │
│                                                                 │
│    6c. Server (withAuth middleware):                           │
│        - Validates NextAuth session                            │
│        - Gets dbUser from Firestore                            │
│        - Creates Firebase custom token                         │
│        - Sets custom claims (role, tenantId, storeId)          │
│        - Returns { customToken, claims }                       │
│                                                                 │
│    6d. Client signs in to Firebase:                            │
│        await signInWithCustomToken(firebaseAuth, customToken)  │
│                                                                 │
│    6e. Firebase creates tokens:                                │
│        - accessToken (1 hour)                                  │
│        - refreshToken (long-lived)                             │
│        - Stores in localStorage                                │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. ✅ FULLY AUTHENTICATED                                      │
│                                                                 │
│    NextAuth:                                                   │
│    ✅ session.user.id = "abc123"                               │
│    ✅ session.tId = 14                                         │
│    ✅ session.sId = 15                                         │
│    ✅ session.role = "OWNER"                                   │
│                                                                 │
│    Firebase Auth:                                              │
│    ✅ firebaseAuth.currentUser.uid = "Ttg5J..."               │
│    ✅ firebaseAuth.currentUser.email = "user@example.com"     │
│    ✅ Custom claims: { role, tenantId, storeId }               │
└────────────────────────────────────────────────────────────────┘
```

#### Code Implementation

**Client-side:**
```typescript
// In React component
import { signIn } from 'next-auth/react';
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';

function LoginButton() {
  // Auto-sync Firebase after OAuth login
  const { firebaseUser, isSyncing } = useFirebaseAuthSync();
  
  return (
    <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
      Sign in with Google
    </button>
  );
}
```

**Server-side (NextAuth):**
```typescript
// src/lib/auth/index.ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!
}),

signIn: async ({ user, account }) => {
  const email = user.email.toLowerCase();
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    await logFailedLogin(email, 'invalid_email', 'google');
    return '/unauthorized';
  }
  
  // Get or create user
  let dbUser = await getUserByEmail(email);
  if (!dbUser) {
    dbUser = await addPlatformUser({
      email,
      name: user.name,
      isVerified: true,
      active: true,
      platformRole: 'USER'
    });
    await logSuccessfulLogin(email, 'google');
  }
  
  // Check if active
  if (dbUser.isVerified && dbUser.active) {
    await logSuccessfulLogin(email, 'google');
    return true;
  }
  
  await logFailedLogin(email, 'account_inactive', 'google');
  return '/unauthorized';
}
```

**Server-side (Firebase sync):**
```typescript
// src/app/api/auth/set-claims/route.ts
export const POST = withAuth(async (request, session) => {
  // Get user from database
  const dbUser = await getUserByEmail(session.user.email);
  
  // Create custom claims
  const customClaims = {
    role: dbUser.stores?.[0]?.roles[0] || 'USER',
    tenantId: String(dbUser.tenantId),
    storeId: String(dbUser.storeId),
    uId: dbUser.id
  };
  
  // Get or create Firebase user
  let uid;
  try {
    const firebaseUser = await authAdmin.getUserByEmail(session.user.email);
    uid = firebaseUser.uid;
  } catch {
    const newUser = await authAdmin.createUser({
      email: session.user.email,
      emailVerified: true,
      displayName: session.user.name
    });
    uid = newUser.uid;
  }
  
  // Set claims and create token
  await authAdmin.setCustomUserClaims(uid, customClaims);
  const customToken = await authAdmin.createCustomToken(uid, customClaims);
  
  return NextResponse.json({ customToken, claims: customClaims });
});
```

---

### Password Login Flow (Credentials)

This flow is more complex because we need to verify passwords with Firebase Auth.

#### Step-by-Step Flow

```
┌────────────────────────────────────────────────────────────────┐
│ 1. USER ENTERS EMAIL + PASSWORD                                │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. CLIENT: signIn('credentials', { email, password })          │
│    - Calls NextAuth credentials provider                       │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. SERVER: CredentialsProvider.authorize()                     │
│                                                                 │
│    3a. Validate email format                                   │
│        - Block disposable emails                               │
│        - Check email domain                                    │
│                                                                 │
│    3b. Check account lockout                                   │
│        - Query authSecurityEvents collection                   │
│        - Check for recent failed attempts                      │
│        - Return error if locked                                │
│                                                                 │
│    3c. Get user from Firestore                                 │
│        const dbUser = await getUserByEmail(email);             │
│                                                                 │
│    3d. Verify password with Firebase                           │
│        await signInWithEmailAndPassword(                       │
│          firebaseAuth, email, password                         │
│        );                                                       │
│                                                                 │
│    3e. If success:                                             │
│        - Log successful login                                  │
│        - Return dbUser                                         │
│                                                                 │
│    3f. If failure:                                             │
│        - Log failed login attempt                              │
│        - Increment failed attempt counter                      │
│        - Lock account if threshold exceeded                    │
│        - Throw error                                           │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. NEXTAUTH JWT CALLBACK                                       │
│    - Creates JWT with dbUser data                              │
│    - Saves in HTTP-only cookie                                 │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. CLIENT FIREBASE AUTH (Already signed in!)                   │
│    - Step 3d already signed in to Firebase                     │
│    - firebaseAuth.currentUser already populated                │
│    - No sync needed!                                           │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. SET CUSTOM CLAIMS                                           │
│    - Call /api/auth/set-claims with uid                        │
│    - Sets custom claims on Firebase token                      │
│    - Force token refresh                                       │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. ✅ FULLY AUTHENTICATED                                      │
│    - Both NextAuth and Firebase Auth active                    │
│    - Custom claims set                                         │
└────────────────────────────────────────────────────────────────┘
```

#### Code Implementation

**Client-side:**
```typescript
// In login form component
import { signIn } from 'next-auth/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '@lib/firebase/firebaseClient';

async function handleLogin(email: string, password: string) {
  // Step 1: Sign in with NextAuth
  const response = await signIn('credentials', {
    redirect: false,
    email,
    password
  });
  
  if (response?.error) {
    console.error('Login failed:', response.error);
    return;
  }
  
  // Step 2: Firebase is already signed in from server-side verification
  // But we need to establish client-side session
  try {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    console.log('✅ Firebase client session established');
    
    // Step 3: Set custom claims
    const user = firebaseAuth.currentUser;
    await fetch('/api/auth/set-claims', {
      method: 'POST',
      body: JSON.stringify({ uid: user.uid })
    });
    
    // Force token refresh to get new claims
    await user.getIdToken(true);
    
    console.log('✅ Custom claims set');
  } catch (error) {
    console.warn('Firebase client setup failed:', error);
  }
  
  // Redirect to dashboard
  router.push('/dashboard');
}
```

**Server-side:**
```typescript
// src/lib/auth/index.ts
CredentialsProvider({
  name: 'Credentials',
  credentials: {},
  async authorize(credentials) {
    const email = credentials.email.toLowerCase().trim();
    const password = credentials.password;
    
    // 1. Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      await logFailedLogin(email, 'invalid_email', 'credentials');
      throw new Error('Invalid email address');
    }
    
    // 2. Check account lockout
    const lockStatus = await checkAccountLock(email);
    if (lockStatus.isLocked) {
      throw new Error(getLockoutMessage(lockStatus));
    }
    
    // 3. Get user from database
    const dbUser = await getUserByEmail(email);
    
    if (dbUser?.isVerified && dbUser?.active) {
      // 4. Verify password with Firebase
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        
        // Success!
        await logSuccessfulLogin(email, 'credentials');
        return { ...dbUser, loginSource: "signInWithEmailAndPassword" };
      } catch (error) {
        // Wrong password
        await logFailedLogin(email, 'invalid_password', 'credentials');
        throw new Error("Invalid email or password");
      }
    } else {
      // Account not verified or inactive
      await logFailedLogin(email, 'invalid_account', 'credentials');
      throw new Error("Invalid email or password");
    }
  }
})
```

---

### Logout Flow

Logout must clear **both** auth systems.

#### Step-by-Step Flow

```
┌────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "LOGOUT"                                        │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. CLIENT: signOutSession()                                    │
│    - Custom wrapper function                                   │
│    - Clears both auth systems                                  │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. FIREBASE: signOut(firebaseAuth)                             │
│    - Clears Firebase auth state                                │
│    - Removes tokens from localStorage                          │
│    - Sets firebaseAuth.currentUser = null                      │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. NEXTAUTH: signOut({ redirect: true })                       │
│    - Clears NextAuth session cookie                            │
│    - Redirects to signin page                                  │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. ✅ FULLY LOGGED OUT                                         │
│    - useSession() returns null                                 │
│    - firebaseAuth.currentUser is null                          │
│    - User redirected to /signin                                │
└────────────────────────────────────────────────────────────────┘
```

#### Code Implementation

**Client-side:**
```typescript
// src/lib/auth/client.ts
export const signOutSession = (callbackUrl = '/signin') => {
  return new Promise((resolve, reject) => {
    // Step 1: Sign out of Firebase
    signOutFirebaseAuth()
      .then(() => {
        // Step 2: Sign out of NextAuth
        signOut({
          redirect: true,
          callbackUrl: callbackUrl
        })
          .then(() => resolve(true))
          .catch(error => reject(error));
      })
      .catch(error => reject(error));
  });
};
```

**Usage:**
```typescript
// In component
import { signOutSession } from '@lib/auth/client';

function LogoutButton() {
  const handleLogout = () => {
    signOutSession('/')
      .then(() => {
        console.log('✅ Logged out');
        router.push('/');
      })
      .catch(error => {
        console.error('Logout failed:', error);
      });
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## Part 5: Token Management

### Token Expiration Timeline

```
┌──────────────── TIME ────────────────────────────────────────┐

DAY 0: Login
├─ NextAuth JWT created → expires Day 30
└─ Firebase tokens created → accessToken expires Hour 1

HOUR 1: Firebase token expires
├─ Firebase SDK auto-refreshes via refreshToken
└─ New accessToken → expires Hour 2

HOUR 2, 3, 4...: Auto-refresh continues
└─ Firebase keeps refreshing every hour

DAY 30: NextAuth JWT expires
├─ useSession() returns status: 'unauthenticated'
├─ Firebase tokens become invalid
└─ User must re-login

└──────────────────────────────────────────────────────────────┘
```

### Token Storage Locations

| Token | Where Stored | Format | Access |
|-------|--------------|--------|--------|
| **NextAuth JWT** | HTTP-only cookie | Encrypted JWE | Server-side only |
| **Firebase accessToken** | localStorage | JWT | Client-side |
| **Firebase refreshToken** | localStorage | Opaque string | Client-side |

**Security implications:**
- NextAuth JWT: ✅ XSS-safe (HTTP-only)
- Firebase tokens: ⚠️ XSS-vulnerable (localStorage)

### Checking Token Expiration

**NextAuth:**
```typescript
const { data: session } = useSession();
console.log('Expires:', session?.expires); // ISO string
console.log('Expired?', new Date(session?.expires) < new Date());
```

**Firebase:**
```typescript
const user = firebaseAuth.currentUser;
const tokenResult = await user?.getIdTokenResult();

console.log('Issued at:', new Date(tokenResult.issuedAtTime));
console.log('Expires:', new Date(tokenResult.expirationTime));
console.log('Claims:', tokenResult.claims);

// Time until expiration
const expiresIn = new Date(tokenResult.expirationTime).getTime() - Date.now();
console.log('Expires in:', Math.round(expiresIn / 1000 / 60), 'minutes');
```

### Manual Token Refresh

**Firebase (force refresh):**
```typescript
const user = firebaseAuth.currentUser;
const freshToken = await user?.getIdToken(true); // true = force refresh

// Use fresh token
await fetch('/api/protected', {
  headers: { 'Authorization': `Bearer ${freshToken}` }
});
```

**NextAuth (update session):**
```typescript
import { useSession } from 'next-auth/react';

const { update } = useSession();

// Trigger jwt() callback with trigger="update"
await update();
```

---

*Continue reading the main guide for security features, API reference, and troubleshooting...*
