# 🔥 Authentication Guide - Part 2: Firebase Auth

**Parent Guide:** [authentication-complete-guide.md](./authentication-complete-guide.md)

> **Historical reference:** Code samples and claim shapes in this companion guide may be stale. Use [Auth and Onboarding](../auth-onboarding/README.md), [firebase-auth-sync.md](./firebase-auth-sync.md), and current source for implemented behavior.

---

## Part 2: Firebase Auth Deep Dive

### What is Firebase Auth?

**Firebase Authentication** is Google's auth service that provides:
- Client-side authentication state
- Token-based auth for Firebase services
- Integration with Firestore security rules
- Integration with Firebase Functions
- Automatic token refresh
- Multiple auth providers (we use custom tokens)

### How Firebase Auth Works in Our App

```
User logs in via NextAuth
       ↓
Server creates custom token (Firebase Admin SDK)
       ↓
Custom token sent to client
       ↓
Client calls signInWithCustomToken(firebaseAuth, token)
       ↓
Firebase Auth creates session:
   - accessToken (1 hour)
   - refreshToken (long-lived)
   - Custom claims embedded in token
       ↓
firebaseAuth.currentUser populated
       ↓
Can now:
   - Query Firestore (security rules check token)
   - Call Firebase Functions (request.auth available)
   - Use Firebase Storage (rules check token)
```

### Firebase Auth Token Structure

Do not log `firebaseAuth.currentUser` in application code. It can contain Firebase SDK token manager fields. The rough internal shape includes:

```typescript
{
  uid: "Ttg5J08za7bWHgcKwpwI9MppgDH3",
  email: "user@example.com",
  emailVerified: true,
  displayName: "John Doe",
  isAnonymous: false,
  
  // Token Manager
  stsTokenManager: {
    accessToken: "[redacted]", // Expires in 1 hour
    refreshToken: "[redacted]", // Long-lived, auto-refreshes accessToken
    expirationTime: 1762457811075 // Unix timestamp
  },
  
  // Metadata
  createdAt: "1762453859162",
  lastLoginAt: "1762454210957",
  apiKey: "AIzaSy...",
  appName: "[DEFAULT]"
}
```

### Custom Claims (The Key Integration Point)

Custom claims are **custom fields** embedded in the Firebase Auth token. They're set by Firebase Admin SDK and available in security rules.

**Setting claims (server-side):**

```typescript
// src/app/api/auth/set-claims/route.ts
await authAdmin.setCustomUserClaims(uid, {
  role: "OWNER",
  tenantId: "14",
  storeId: "15",
  uId: "abc123"
});
```

**Reading claims (client-side):**

```typescript
const user = firebaseAuth.currentUser;
const tokenResult = await user.getIdTokenResult();
const hasTenantScope = Boolean(tokenResult.claims.tenantId && tokenResult.claims.storeId);
```

Do not copy token claims, access tokens, refresh tokens, tenant/store IDs, or raw Firebase user objects into browser logs. Use the bounded auth and Firebase diagnostic helpers documented in `README.md` when this flow fails.

**Using claims in Firestore rules:**

```javascript
// firestore.rules
match /tenants/{tenantId}/stores/{storeId} {
  allow read: if request.auth.token.tenantId == tenantId 
              && request.auth.token.storeId == storeId;
  
  allow write: if request.auth.token.role == "OWNER";
}
```

### Firebase Auth Client Configuration

**File:** `src/lib/firebase/firebaseClient.ts`

```typescript
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import firebaseConfig from "./config";

// Initialize Firebase (client-side)
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth = getAuth();

export { firebaseApp, firebaseAuth };
```

**Firebase config:**
```typescript
// src/lib/firebase/config.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
```

### Firebase Admin SDK Configuration

**File:** `src/lib/firebase/firebaseAdmin.ts`

```typescript
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (server-side only)
if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_CLIENT_EMAIL) {
    // Vercel deployment
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
  } else {
    // Local development (uses GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
  }
}

const authAdmin = admin.auth();
const firestoreAdmin = admin.firestore();

export { admin, authAdmin, firestoreAdmin };
```

### Firebase Auth Token Lifecycle

```
Hour 0: Login
├─ Custom token created by server
├─ signInWithCustomToken(firebaseAuth, token)
├─ Firebase creates:
│  ├─ accessToken (expires Hour 1) ✅
│  └─ refreshToken (long-lived) ✅
└─ firebaseAuth.currentUser populated ✅

Hour 1: Access token expires
├─ Firebase SDK detects expiration
├─ Automatically uses refreshToken to get new accessToken ✅
├─ New accessToken (expires Hour 2) ✅
└─ User stays logged in (seamless) ✅

Hour 2, 3, 4...: Repeat
├─ Auto-refresh continues ✅
└─ User never notices ✅

Day 30: NextAuth session expires
├─ NextAuth JWT expires ❌
├─ Firebase tokens become invalid ❌
└─ User must re-login ❌
```

**Key Point:** Firebase tokens **auto-refresh** (unlike NextAuth JWT), but they're **tied to NextAuth session** (expire when NextAuth expires).

### Firebase Auth Methods Used in Our App

#### 1. **signInWithCustomToken()**

**Purpose:** Sign in using server-generated token

**Usage:**
```typescript
import { signInWithCustomToken } from 'firebase/auth';
import { firebaseAuth } from '@lib/firebase/firebaseClient';

// After OAuth login
const response = await fetch('/api/auth/set-claims', { method: 'POST' });
const { customToken } = await response.json();

await signInWithCustomToken(firebaseAuth, customToken);
// Do not log firebaseAuth.currentUser. Verify readiness through the app loader
// state or bounded Firebase bootstrap diagnostics.
```

#### 2. **signInWithEmailAndPassword()**

**Purpose:** Sign in with email/password

**Usage:**
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';

// Password-based login
await signInWithEmailAndPassword(firebaseAuth, email, password);
// Do not log firebaseAuth.currentUser. Verify readiness through app state.
```

#### 3. **signOut()**

**Purpose:** Sign out current user

**Usage:**
```typescript
import { signOut } from 'firebase/auth';

await signOut(firebaseAuth);
console.log('✅ Logged out');
```

#### 4. **getIdTokenResult()**

**Purpose:** Get token with custom claims

**Usage:**
```typescript
const user = firebaseAuth.currentUser;
const tokenResult = await user.getIdTokenResult();

console.log('Token:', tokenResult.token);
console.log('Claims:', tokenResult.claims);
console.log('Expires:', new Date(tokenResult.expirationTime));
```

#### 5. **getIdToken()**

**Purpose:** Get fresh token (forces refresh)

**Usage:**
```typescript
const user = firebaseAuth.currentUser;
const token = await user.getIdToken(true); // true = force refresh

// Use token in API calls
fetch('/api/firebase-function', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Firebase Auth State Persistence

Firebase Auth state is stored in **localStorage** by default:

```javascript
// Browser localStorage
firebase:authUser:AIzaSy...:ecomsai
```

**Persistence modes:**
- `LOCAL` - Persists across browser sessions (default)
- `SESSION` - Only persists current session
- `NONE` - No persistence

**Our app uses LOCAL (default).**

### Firebase Auth vs NextAuth Token Comparison

| Feature | NextAuth JWT | Firebase Auth Token |
|---------|-------------|---------------------|
| **Storage** | HTTP-only cookie | localStorage |
| **Lifespan** | 30 days | 1 hour (auto-refresh) |
| **Auto-refresh** | ❌ No | ✅ Yes (via refreshToken) |
| **Server-side** | ✅ Yes | ❌ No (client-side only) |
| **Firestore rules** | ❌ Can't use | ✅ Can use |
| **Security** | ✅ HTTP-only (XSS-safe) | ⚠️ localStorage (XSS risk) |
| **Custom data** | ✅ dbUser object | ✅ Custom claims |
| **Size limit** | ~4KB (cookie limit) | ~1000 bytes (claims) |

---

## Part 3: Integration & Synchronization

### Why We Need Both Systems

**NextAuth alone:**
- ✅ Easy OAuth
- ✅ Secure server-side sessions
- ❌ Can't use Firestore security rules
- ❌ Can't use Firebase Functions auth

**Firebase Auth alone:**
- ✅ Firestore security rules
- ✅ Firebase Functions auth
- ❌ Complex OAuth setup
- ❌ No server-side session validation

**Together:**
- ✅ Best of both worlds!

### The Sync Pattern (Custom Tokens)

This is the **key integration** between NextAuth and Firebase Auth:

```
┌─────────────────────────────────────────────────────────────┐
│                      SYNC FLOW                               │
└─────────────────────────────────────────────────────────────┘

1. User logs in via NextAuth (Google OAuth)
   NextAuth: ✅ Authenticated
   Firebase: ❌ Not authenticated

2. useFirebaseAuthSync() hook detects mismatch

3. Hook calls /api/auth/set-claims (protected by NextAuth)
   Request includes NextAuth session cookie

4. Server validates NextAuth session
   if (!session) return 401;

5. Server gets user from Firestore
   const dbUser = await getUserByEmail(session.user.email);

6. Server creates custom token with claims
   const customToken = await authAdmin.createCustomToken(uid, {
     role: dbUser.role,
     tenantId: dbUser.tenantId,
     storeId: dbUser.storeId
   });

7. Server returns token to client
   return { customToken, claims };

8. Client signs in to Firebase
   await signInWithCustomToken(firebaseAuth, customToken);

9. Both systems now authenticated! ✅
   NextAuth: ✅ session exists
   Firebase: ✅ firebaseAuth.currentUser exists
```

### useFirebaseAuthSync Hook

**File:** `src/hooks/useFirebaseAuthSync.ts`

This hook **automatically** syncs Firebase Auth with NextAuth:

```typescript
export function useFirebaseAuthSync() {
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    // Don't run if loading
    if (status === 'loading') return;
    
    // Don't run if not authenticated
    if (status === 'unauthenticated') {
      setIsSynced(false);
      return;
    }
    
    // Already synced?
    if (isSynced || isSyncing) return;
    
    // Check if Firebase is already synced
    if (firebaseAuth.currentUser) {
      setIsSynced(true);
      return;
    }
    
    // Sync needed!
    syncFirebaseAuth();
  }, [status, session, isSynced, isSyncing]);

  const syncFirebaseAuth = async () => {
    setIsSyncing(true);
    
    try {
      // Get custom token from server
      const response = await fetch('/api/auth/set-claims', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      const { customToken } = await response.json();
      
      // Sign in to Firebase
      await signInWithCustomToken(firebaseAuth, customToken);
      
      console.log('✅ Sync complete');
      setIsSynced(true);
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    isSynced,
    firebaseUser: firebaseAuth.currentUser
  };
}
```

**Usage in components:**

```typescript
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';

function MyComponent() {
  const { firebaseUser, isSyncing } = useFirebaseAuthSync();
  
  if (isSyncing) return <div>Syncing...</div>;
  
  console.log('Firebase user:', firebaseUser); // ✅ Has data!
  
  return <div>Welcome {firebaseUser?.email}</div>;
}
```

---

*Continue reading in [auth-guide-part3-flows.md](./auth-guide-part3-flows.md) for complete login/logout flows...*
