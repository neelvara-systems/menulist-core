# ✅ Fixed: `firebaseAuth.currentUser` is Null

**Issue:** `firebaseAuth.currentUser` returns `null` even when logged in via NextAuth (Google OAuth)  
**Root Cause:** NextAuth and Firebase Auth are separate systems that need syncing  
**Solution:** Use `useFirebaseAuthSync()` hook  
**Status:** Historical fix note; not current launch certification

---

> **Launch Boundary:** This file records a historical Firebase Auth sync fix, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, auth browser/API smoke, Firebase Auth custom-claims evidence, App Check/session-cookie review, target deploy evidence, and production-host smoke.

## 🐛 **The Problem**

```typescript
const { data: session } = useSession();        // ✅ Has user data
const user = firebaseAuth.currentUser;         // ❌ null!
```

**Why?**
- **NextAuth** handles OAuth (Google) and creates JWT sessions
- **Firebase Auth** is a separate client-side auth system
- They don't automatically sync after OAuth login

---

## ✅ **The Fix**

### **Step 1: Use the Hook**

```typescript
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';
import { useSession } from 'next-auth/react';

const MyComponent = () => {
  const { data: session } = useSession();
  
  // ✅ Automatically syncs Firebase Auth with NextAuth
  const { firebaseUser, isSyncing } = useFirebaseAuthSync();
  
  console.log('NextAuth session:', session);     // ✅ Has data
  console.log('Firebase user:', firebaseUser);   // ✅ No longer null!
  
  return <div>Welcome {firebaseUser?.email}</div>;
};
```

### **Step 2: That's It!**

The hook automatically:
1. Detects when NextAuth is authenticated but Firebase Auth isn't
2. Calls `/api/auth/set-claims` to get a custom token
3. Signs in to Firebase Auth with the token
4. Keeps both systems in sync

---

## 📊 **How It Works**

```
┌─────────────────────────────────────────────────────┐
│ 1. User logs in via Google OAuth                    │
│    → NextAuth creates JWT session ✅                │
│    → Firebase Auth state: still null ❌             │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 2. useFirebaseAuthSync() detects mismatch           │
│    → NextAuth: authenticated                        │
│    → Firebase Auth: null                            │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 3. Hook calls /api/auth/set-claims                  │
│    → Server creates Firebase custom token           │
│    → Returns token to client                        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ 4. Client signs in to Firebase Auth                 │
│    → signInWithCustomToken(firebaseAuth, token)     │
│    → firebaseAuth.currentUser now populated ✅      │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 **Testing**

### **Before Fix:**

After Google OAuth login, the NextAuth session existed but the Firebase Auth client user stayed null, so Firestore reads failed under security rules.

### **After Fix:**
```typescript
// After Google OAuth login + hook sync, the dashboard should leave
// the "Connecting Account" loader and Firestore reads should succeed.
```

### **Check Diagnostics:**

Successful sync is intentionally quiet. Failed sync paths emit bounded Firebase bootstrap diagnostics with normalized failure codes only. Do not log `session`, `firebaseAuth.currentUser`, emails, tenant/store IDs, custom tokens, or raw provider errors.

---

## 📁 **Files Changed**

| File | Change |
|------|--------|
| `src/hooks/useFirebaseAuthSync.ts` | ✅ Created - Auto-sync hook |
| `src/components/.../Navbar.tsx` | ✅ Updated - Uses hook |
| `__docs__/auth/firebase-auth-sync.md` | ✅ Created - Full docs |

---

## 🔒 **Security**

**Is This Safe?** ✅ Yes!

- Custom tokens created server-side only (Firebase Admin SDK)
- Requires valid NextAuth session
- Token is signed and cannot be forged
- Short-lived (1 hour)
- Firestore security rules still apply

---

## 💡 **When Sync Happens**

| Login Method | Sync Needed? | Why? |
|--------------|--------------|------|
| **Google OAuth** | ✅ Yes | NextAuth handles OAuth, Firebase Auth doesn't know |
| **Password Login** | ❌ No | Already calls `signInWithEmailAndPassword()` |

---

## 🎯 **Usage in Other Components**

```typescript
// Navbar
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';
const { firebaseUser } = useFirebaseAuthSync();

// Dashboard
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';
const { firebaseUser, isSyncing } = useFirebaseAuthSync();

// Any component that needs Firebase Auth
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';
const { firebaseUser } = useFirebaseAuthSync();
```

---

## 🐛 **Troubleshooting**

### **Still null after login?**

1. **Check if syncing:**
   ```typescript
   if (isSyncing) console.log('Wait...');
   ```

2. **Check for errors:**
   ```typescript
   const { error } = useFirebaseAuthSync();
   // The hook exposes a generic error; internal details stay in bounded diagnostics.
   ```

3. **Check API route:**
   - Open `/api/auth/set-claims/route.ts`
   - Make sure it exists and returns `customToken`

4. **Check bounded diagnostics:**
   - Use Firebase bootstrap failure codes from `src/lib/firebase/firebaseDiagnostics.ts`
   - Do not add raw browser logs for session, Firebase user, or provider error objects

---

## 🚀 **Next Steps**

1. **Login with Google** → http://localhost:3001
2. **Check loader state** → Dashboard should leave "Connecting Account"
3. **Verify Firestore access** → Owner data should load without permission errors
4. **Done!** ✅

---

## 📚 **Full Documentation**

See `__docs__/auth/firebase-auth-sync.md` for complete details.

---

**Fixed:** November 6, 2025  
**Status:** Historical fix note; not current launch certification
