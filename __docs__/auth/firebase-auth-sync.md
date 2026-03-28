# 🔄 Firebase Auth + NextAuth Sync Pattern

**Problem:** `firebaseAuth.currentUser` is `null` even when logged in via NextAuth  
**Solution:** Use `useFirebaseAuthSync` hook to automatically sync them  
**Status:** ✅ Production Ready

---

## 📋 **The Problem**

Your app uses **two separate authentication systems**:

### **1. NextAuth (JWT-based)**
- Handles OAuth (Google) login
- Creates server-side JWT sessions
- Powers `useSession()` hook
- Used for API route protection

### **2. Firebase Auth (Client SDK)**
- Provides `firebaseAuth.currentUser`
- Required for Firestore security rules
- Maintains its own client-side auth state
- Completely independent of NextAuth

**The Issue:**
```typescript
const { data: session } = useSession();  // ✅ Has user data
const user = firebaseAuth.currentUser;   // ❌ null!
```

Even though you're logged in via NextAuth (OAuth), Firebase Auth doesn't know about it because they're separate systems.

---

## 🎯 **Why This Happens**

### **OAuth Login Flow (Without Sync):**

```
1. User clicks "Sign in with Google"
2. Google redirects to NextAuth callback
3. NextAuth creates JWT session ✅
4. Firebase Auth state: Still not authenticated ❌
5. Result: session exists, but firebaseAuth.currentUser is null
```

### **Password Login Flow (Works!):**

```
1. User enters email + password
2. Call signInWithEmailAndPassword(firebaseAuth, email, password)
3. Firebase Auth session created ✅
4. NextAuth session also created ✅
5. Result: Both are synced automatically
```

**Why password login works:** The code explicitly calls `signInWithEmailAndPassword()`, which establishes a Firebase Auth session.

**Why OAuth doesn't work:** NextAuth handles the OAuth flow, but nothing tells Firebase Auth about it.

---

## ✅ **The Solution: Custom Token Sync**

### **How It Works:**

```
1. User logs in via Google OAuth
2. NextAuth creates JWT session ✅
3. useFirebaseAuthSync hook detects mismatch
4. Hook calls /api/auth/set-claims to get custom token
5. Server creates Firebase custom token from NextAuth session
6. Client calls signInWithCustomToken(firebaseAuth, token)
7. Firebase Auth session established ✅
8. Result: Both systems are synced!
```

---

## 🔧 **Implementation**

### **1. Use the Hook in Components**

```typescript
import { useFirebaseAuthSync } from '@hooks/useFirebaseAuthSync';
import { useSession } from 'next-auth/react';

const MyComponent = () => {
  const { data: session } = useSession();
  
  // ✅ Automatically syncs Firebase Auth with NextAuth
  const { firebaseUser, isSyncing } = useFirebaseAuthSync();
  
  console.log('NextAuth session:', session);
  console.log('Firebase user:', firebaseUser);  // ✅ No longer null!
  
  if (isSyncing) {
    return <div>Syncing authentication...</div>;
  }
  
  return <div>Welcome {firebaseUser?.email}</div>;
};
```

### **2. Hook Signature**

```typescript
function useFirebaseAuthSync(): {
  isSyncing: boolean;      // true while syncing
  isSynced: boolean;       // true when sync complete
  error: Error | null;     // sync error if any
  firebaseUser: User | null; // firebaseAuth.currentUser
}
```

### **3. What the Hook Does**

1. **Detects Mismatch:**
   - Checks if NextAuth is authenticated (`status === 'authenticated'`)
   - Checks if Firebase Auth is authenticated (`firebaseAuth.currentUser !== null`)
   - If mismatch detected, triggers sync

2. **Calls Server API:**
   ```typescript
   fetch('/api/auth/set-claims', {
     method: 'POST',
     body: JSON.stringify({})
   })
   ```

3. **Gets Custom Token:**
   - Server uses Firebase Admin SDK
   - Creates custom token for the NextAuth user
   - Returns token to client

4. **Signs In to Firebase:**
   ```typescript
   await signInWithCustomToken(firebaseAuth, customToken);
   ```

5. **Sync Complete:**
   - `firebaseAuth.currentUser` now populated ✅
   - Both auth systems in sync ✅

---

## 📁 **File Structure**

```
src/
├── hooks/
│   └── useFirebaseAuthSync.ts           # ✅ The hook
├── app/api/auth/set-claims/
│   └── route.ts                         # Server endpoint
└── components/
    └── Navbar.tsx                       # Usage example
```

---

## 🔒 **Security Considerations**

### **Is This Safe?**

✅ **Yes!** Here's why:

1. **Custom Token Creation:**
   - Only happens on server (using Firebase Admin SDK)
   - Requires valid NextAuth session
   - Server validates user identity before creating token

2. **Token Properties:**
   - Short-lived (1 hour by default)
   - Signed by Firebase Admin SDK
   - Cannot be forged by client

3. **Server Validation:**
   ```typescript
   // In /api/auth/set-claims/route.ts
   const session = await getServerSession(authOptions);
   if (!session) {
     return Response.json({ error: 'Unauthorized' }, { status: 401 });
   }
   // Only create token if user is authenticated
   const customToken = await admin.auth().createCustomToken(uid);
   ```

4. **Firestore Rules Still Apply:**
   - Even with Firebase Auth, Firestore security rules are enforced
   - Custom claims can restrict access further

---

## 🧪 **Testing**

### **1. Test OAuth Login:**

```bash
# 1. Login with Google
# Go to http://localhost:3000
# Click "Sign in with Google"

# 2. Check console logs
# Should see:
[Firebase Auth Sync] Starting sync...
[Firebase Auth Sync] ✅ Sync complete
[Firebase Auth Sync] User: your@email.com

# 3. Verify both auth systems
console.log('NextAuth:', session);        // ✅ Has data
console.log('Firebase:', firebaseUser);   // ✅ Has data
```

### **2. Test Password Login:**

```bash
# 1. Login with email/password
# No sync needed - already handled in authorize()

# 2. Check console
# Should NOT see sync messages (already synced)

# 3. Verify both auth systems
console.log('NextAuth:', session);        // ✅ Has data
console.log('Firebase:', firebaseUser);   // ✅ Has data
```

### **3. Test Error Handling:**

```bash
# 1. Disconnect from Firebase (simulate error)
# 2. Login with Google
# 3. Check console for error messages
# 4. Hook should retry automatically
```

---

## 🐛 **Troubleshooting**

### **Issue: `firebaseUser` is still null**

**Possible causes:**

1. **Still syncing:**
   ```typescript
   if (isSyncing) {
     console.log('Wait for sync to complete...');
   }
   ```

2. **Sync failed:**
   ```typescript
   if (error) {
     console.error('Sync error:', error);
   }
   ```

3. **API route missing:**
   - Check `/api/auth/set-claims/route.ts` exists
   - Check it returns `customToken` in response

4. **Session not ready:**
   ```typescript
   if (status === 'loading') {
     console.log('Session still loading...');
   }
   ```

### **Issue: Infinite sync loop**

**Solution:** Hook has built-in protection, but if you see this:

```typescript
// ❌ DON'T DO THIS
useEffect(() => {
  useFirebaseAuthSync(); // Don't call in useEffect
}, []);

// ✅ DO THIS
const { firebaseUser } = useFirebaseAuthSync(); // Call at component level
```

### **Issue: Sync works but Firestore queries fail**

**Check custom claims:**

```typescript
const user = firebaseAuth.currentUser;
const token = await user?.getIdTokenResult();
console.log('Custom claims:', token?.claims);
```

Make sure claims include required fields (tenantId, storeId, role, etc.)

---

## 📊 **Performance Impact**

### **Overhead:**
- **Initial sync:** ~500ms (one-time per login)
- **Cached:** 0ms (hook doesn't re-sync if already synced)
- **Network:** 1 API call to `/api/auth/set-claims`

### **When Sync Happens:**
- After OAuth login (Google)
- After page refresh (if session exists but Firebase doesn't)
- Never for password-based login (already synced)

### **Optimization:**
Hook is smart:
- Checks `isSynced` flag to avoid duplicate syncs
- Only runs when necessary (NextAuth authenticated but Firebase isn't)
- No polling or intervals (just useEffect with proper dependencies)

---

## 🎓 **Key Learnings**

1. **NextAuth ≠ Firebase Auth**
   - They're separate systems that need explicit syncing

2. **OAuth Requires Sync**
   - Password login syncs automatically
   - OAuth needs custom token pattern

3. **Custom Tokens Are Safe**
   - Server-side creation only
   - Short-lived and signed

4. **Reusable Hook Pattern**
   - Encapsulates sync logic
   - Easy to use across components
   - Handles errors and loading states

---

## 🚀 **Migration Guide**

### **Before (Manual Sync):**

```typescript
// In every component
useEffect(() => {
  if (session && !firebaseAuth.currentUser) {
    fetch('/api/auth/set-claims', { method: 'POST' })
      .then(res => res.json())
      .then(data => signInWithCustomToken(firebaseAuth, data.customToken))
      .catch(console.error);
  }
}, [session]);
```

### **After (With Hook):**

```typescript
// Clean and simple
const { firebaseUser, isSyncing } = useFirebaseAuthSync();
```

---

## 📚 **Related Docs**

- **`/api/auth/set-claims`** - Server endpoint for custom token generation
- **`src/lib/auth/index.ts`** - NextAuth configuration
- **`src/lib/firebase/firebaseClient.ts`** - Firebase client setup
- **`__docs__/security/login-source-tracking.md`** - Login source tracking

---

**Last Updated:** November 6, 2025  
**Status:** ✅ Production Active  
**Maintainer:** Auth Team
