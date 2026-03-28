# 🚀 Authentication Quick Reference

**One-page cheat sheet for MenuListAI authentication**

---

## 🏗️ Two Auth Systems

| System | NextAuth | Firebase Auth |
|--------|----------|---------------|
| **Purpose** | Server sessions | Client tokens |
| **Storage** | HTTP-only cookie | localStorage |
| **Lifespan** | 30 days | 1 hour (auto-refresh) |
| **Used for** | API protection | Firestore rules |
| **Token type** | JWT (encrypted) | JWT + refresh token |

**Why both?** NextAuth = secure OAuth + server auth, Firebase = Firestore security rules

---

## 🔄 Login Flows

### OAuth (Google)

```
User clicks "Sign in with Google"
    ↓
Google OAuth flow
    ↓
NextAuth creates JWT (30 days)
    ↓
useFirebaseAuthSync() detects mismatch
    ↓
Server creates custom token
    ↓
Client signs in to Firebase
    ↓
✅ Both authenticated
```

### Password

```
User enters email + password
    ↓
Server verifies with Firebase
    ↓
NextAuth creates JWT (30 days)
    ↓
Firebase already signed in
    ↓
Set custom claims
    ↓
✅ Both authenticated
```

---

## 💻 Code Snippets

### Check Authentication (Client)

```typescript
import { useSession } from 'next-auth/react';
import { useFirebaseAuthSync } from '@hook/useFirebaseAuthSync';

const { data: session, status } = useSession();
const { firebaseUser } = useFirebaseAuthSync();

if (status === 'loading') return <Loader />;
if (!session) return <Login />;

console.log('NextAuth:', session.user);
console.log('Firebase:', firebaseUser);
```

### Check Authentication (Server)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

const session = await getServerSession(authOptions);

if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

console.log('User ID:', session.user.id);
console.log('Tenant:', session.tId);
console.log('Store:', session.sId);
```

### Login with Google

```typescript
import { signIn } from 'next-auth/react';

<button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
  Sign in with Google
</button>
```

### Login with Email/Password

```typescript
import { signIn } from 'next-auth/react';

const response = await signIn('credentials', {
  redirect: false,
  email: 'user@example.com',
  password: 'password123'
});

if (response?.error) {
  console.error('Login failed:', response.error);
} else {
  router.push('/dashboard');
}
```

### Logout

```typescript
import { signOutSession } from '@lib/auth/client';

<button onClick={() => signOutSession('/').then(() => router.push('/'))}>
  Logout
</button>
```

### Protect API Route

```typescript
import { withAuth } from '@middleware/auth';

export const GET = withAuth(async (request, session) => {
  // session guaranteed to exist
  const userId = session.user.id;
  const tenantId = session.tId;
  
  // Your logic
});
```

### Get Firebase Token

```typescript
const user = firebaseAuth.currentUser;
const token = await user?.getIdToken();

// Use in API call
fetch('/api/endpoint', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Check Custom Claims

```typescript
const user = firebaseAuth.currentUser;
const tokenResult = await user?.getIdTokenResult();

console.log('Role:', tokenResult.claims.role);
console.log('Tenant:', tokenResult.claims.tenantId);
console.log('Store:', tokenResult.claims.storeId);
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `src/lib/auth/index.ts` | NextAuth configuration |
| `src/lib/firebase/firebaseClient.ts` | Firebase client setup |
| `src/lib/firebase/firebaseAdmin.ts` | Firebase server setup |
| `src/hooks/useFirebaseAuthSync.ts` | Auto-sync hook |
| `src/app/api/auth/set-claims/route.ts` | Custom token endpoint |
| `src/middleware/auth.ts` | Server middleware |

---

## 📊 Token Lifecycle

```
DAY 0              HOUR 1             HOUR 2           DAY 30
  ↓                  ↓                  ↓                ↓
Login            Auto-refresh      Auto-refresh       Expire
NextAuth: 30d    Firebase: 1h      Firebase: 1h      Re-login
Firebase: 1h                                          required
```

---

## 🐛 Common Issues

### Session undefined
- ✅ Wrap app in `<SessionProvider>`
- ✅ Check session cookie exists
- ✅ Verify JWT not expired

### firebaseUser null
- ✅ Use `useFirebaseAuthSync()` hook
- ✅ Check hook is syncing
- ✅ Verify `/api/auth/set-claims` works

### Custom claims missing
- ✅ Call `/api/auth/set-claims`
- ✅ Refresh token: `user.getIdToken(true)`

### Account locked
- ✅ Wait 15 minutes
- ✅ Or delete lockout event from Firestore

---

## 🔒 Security Features

- ✅ Disposable email blocking
- ✅ Account lockout (5 failed attempts = 15 min)
- ✅ Login source tracking
- ✅ Prototype pollution prevention
- ✅ CSRF protection
- ✅ Custom claims validation

---

## 📖 Full Documentation

- **Main Guide:** `authentication-complete-guide.md`
- **Firebase:** `auth-guide-part2-firebase.md`
- **Flows:** `auth-guide-part3-flows.md`
- **Index:** `README.md`

---

## 🆘 Need Help?

1. Check [authentication-complete-guide.md](./authentication-complete-guide.md)
2. Search specific topic in Part 2 or Part 3
3. Check troubleshooting section in README
4. Review code examples in flows guide
