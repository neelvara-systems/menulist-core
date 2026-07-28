# 🔄 Firebase Auth + NextAuth Sync Pattern

**Problem:** `firebaseAuth.currentUser` is `null` even when logged in via NextAuth  
**Solution:** Use `useFirebaseAuthSync` hook to automatically sync them  
**Status:** Implemented source evidence; not current launch certification

> **Launch Boundary:** This note records the Firebase Auth sync pattern, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, auth browser/API smoke, Firebase Auth custom-claims evidence, App Check/session-cookie review, target deploy evidence, and production-host smoke.

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

June 29 response diagnostics: `src/lib/auth/firebaseAuthSync.ts` parses `/api/auth/set-claims` sync and refresh responses through `readJsonResponseWithLimit()` with a 32KB cap before using returned custom tokens. Malformed, oversized, empty, or non-object responses log `firebase_auth_sync_response_parse_failed` / `firebase_auth_sync_response_invalid` with status/phase metadata only and fail through the existing generic Firebase Auth sync error path.

June 30 request boundary: `src/lib/auth/firebaseAuthSync.ts` now spreads `AUTH_BROWSER_REQUEST_POLICY` before both `/api/auth/set-claims` sync and refresh calls, so Firebase claim handoffs stay uncached, same-origin, and manual-redirect before bounded response parsing. This does not change custom-token creation, claim refresh, Firestore reads/writes, Firebase Auth operations, route contracts, or deploy requirements.

Set-claims workspace scope boundary: `/api/auth/set-claims` validates the selected store scope through `normalizeStorePermissionScopeDocumentId()`, then re-reads the canonical target store from the correct MenuList or separate Answerlattice Firestore project before minting Firebase custom claims or reading Answerlattice store-role permissions. The minted tenant comes from that canonical store; non-platform users must already belong to the same tenant. Inactive, blocked, deleted, mismatched, malformed, or missing store truth fails before token creation. Separate Answerlattice sync forces `pId: AL`, and platform fallback carries only the explicit Answerlattice scope rather than MenuList store memberships. Valid Google login, credential login, phone OTP login, MenuList Firebase sync, and Answerlattice custom-token sync behavior are otherwise unchanged.

Set-claims role boundary: account-level `platformRole` is not a store role. A normal MenuList user must have a bounded role for the selected store; missing/malformed roles and a forged `PLATFORM` store role return 403 instead of becoming an owner claim. A legitimate platform/support actor with no store mapping receives the least-privileged `staff` store-role fallback while separate platform claims retain its account-level authority. No branch defaults a missing store role to owner.

Set-claims rate-limit boundary: `/api/auth/set-claims` applies the shared `AUTH_CLAIM_SYNC` limiter with HMAC-hashed session user/email key material before optional body parsing, product-user lookup, Firebase Auth user lookup/create, custom-claim writes, or custom-token creation. The 30-per-15-minute actor ceiling is intentionally higher than account-mutation limits because valid login handoff, session bootstrap, store switching, and multi-tab refreshes can legitimately make several set-claims calls. Rate-limited sync attempts return 429 with retry headers and bounded security diagnostics only. Valid Google login, credential login, phone OTP login, MenuList Firebase sync, Answerlattice custom-token sync, and store-switch claim refresh behavior are unchanged.

Set-claims browser acknowledgement boundary: store-switch claim refresh re-reads the forced Firebase token and requires canonical string `tenantId`/`storeId`, boolean `admin`, an exact target `storeId`, and target membership in `storeIds` before callers may change their active browser store context. Missing, stale, malformed, or wrong-store claims fail with the fixed `firebase_auth_claims_refresh_mismatch` bootstrap code.

Client/server module boundary: `src/lib/auth/firebaseAuthSync.ts` imports claim acknowledgement from the client-safe `firebaseClaimsAcknowledgement.ts` helper. It must not import `setClaimsWorkspace.ts`, because that canonical workspace resolver depends on the server-only permissions layer. Keeping these imports separate preserves the authenticated provider's synchronous SSR export without changing claim validation, the set-claims API, Firebase operations, or owner-visible behavior.

Google claim handoff boundary: while `/api/auth/claim-account` is in flight after OAuth return, `src/components/templates/loginPage/index.tsx` holds a synchronous ref guard. Session rerenders cannot start Firebase sync or redirect until the ownership transaction finishes, avoiding a race where the browser enters the old unclaimed scope.

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
  
  const isReady = Boolean(session?.user) && Boolean(firebaseUser);
  
  if (isSyncing) {
    return <div>Syncing authentication...</div>;
  }
  
  return <div>{isReady ? 'Authentication ready' : 'Authentication unavailable'}</div>;
};
```

Do not log `session`, `firebaseAuth.currentUser`, custom tokens, Firebase SDK token managers, emails, tenant/store IDs, or raw provider errors while debugging this flow. Use `src/lib/firebase/firebaseDiagnostics.ts` for bootstrap/sync failures and `src/lib/auth/authDiagnostics.ts` for client session/sign-out diagnostics.

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
     ...AUTH_BROWSER_REQUEST_POLICY,
     method: 'POST',
     body: JSON.stringify({})
   })
   ```
   MenuList sync omits `productId`. Answerlattice separate-Firebase sync must pass `productId: 'AL'` so `/api/auth/set-claims` mints the Answerlattice custom token only for Answerlattice-scoped requests.

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

# 2. Verify the app leaves the "Connecting Account" state.
# Successful sync is intentionally quiet in browser logs.

# 3. If sync fails, check bounded Firebase bootstrap diagnostics.
# Do not log session, firebaseAuth.currentUser, emails, tenant/store IDs, or custom tokens.
```

### **2. Test Password Login:**

```bash
# 1. Login with email/password
# No sync needed - already handled in authorize()

# 2. Verify the dashboard loads without the Firebase bootstrap loader.
# Password login should not emit Firebase Auth sync console messages.
```

### **3. Test Error Handling:**

```bash
# 1. Disconnect from Firebase (simulate error)
# 2. Login with Google
# 3. Check bounded Firebase bootstrap diagnostics for normalized failure codes
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
      .catch(() => {
        // Old pattern had no bounded diagnostics.
      });
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
**Status:** Implemented source evidence; not current launch certification
**Maintainer:** Auth Team
Firebase Auth session scope is fail-closed. The browser projector distinguishes a truly absent onboarding scope from malformed, partial, or contradictory tenant/store identity across root and nested compact/verbose aliases. Only exact scope may match cached claims, form the synchronization key, or request `/api/auth/set-claims`; invalid scope raises the fixed `firebase_auth_sync_invalid_session_scope` bootstrap failure before token work.
