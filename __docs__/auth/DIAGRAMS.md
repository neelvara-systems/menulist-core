# 📊 Authentication System Diagrams

Visual representations of the authentication system.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │  REACT COMPONENTS                                         │   │
│ │                                                           │   │
│ │  useSession()          useFirebaseAuthSync()             │   │
│ │       │                        │                          │   │
│ │       ▼                        ▼                          │   │
│ │  ┌──────────┐          ┌──────────────┐                 │   │
│ │  │ NextAuth │          │ Firebase     │                 │   │
│ │  │ Session  │◄─sync────┤ Auth State   │                 │   │
│ │  │          │          │              │                 │   │
│ │  │ JWT in   │          │ accessToken  │                 │   │
│ │  │ Cookie   │          │ refreshToken │                 │   │
│ │  │ (30 days)│          │ (1hr + auto) │                 │   │
│ │  └──────────┘          └──────────────┘                 │   │
│ └───────────────────────────────────────────────────────────┘   │
└──────────────────────┬────────────────────┬──────────────────────┘
                       │                    │
             HTTP Requests (with cookies)   │ Firestore queries
                       │                    │ (with Firebase token)
                       ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (NEXT.JS)                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │  API ROUTES                                               │   │
│ │                                                           │   │
│ │  withAuth()  ←  getServerSession()  ←  authOptions       │   │
│ │                                                           │   │
│ │  /api/auth/set-claims  (creates custom tokens)           │   │
│ │  /api/subscriptions/*  (protected routes)                │   │
│ │  /api/stores/*         (protected routes)                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                               │                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │  FIREBASE ADMIN SDK                                       │   │
│ │                                                           │   │
│ │  • createCustomToken()     (OAuth sync)                   │   │
│ │  • setCustomUserClaims()   (set role, tenantId, etc.)    │   │
│ │  • verifyIdToken()         (verify tokens)                │   │
│ └───────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                             │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Firestore │  │Firebase  │  │Firebase  │  │Firebase  │        │
│  │Database  │  │Auth      │  │Storage   │  │Functions │        │
│  │          │  │          │  │          │  │          │        │
│  │Security  │  │Custom    │  │Security  │  │request.  │        │
│  │Rules     │  │Claims    │  │Rules     │  │auth      │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 OAuth Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "SIGN IN WITH GOOGLE"                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. NEXTAUTH REDIRECTS TO GOOGLE                                 │
│    signIn('google', { callbackUrl: '/dashboard' })              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER AUTHENTICATES WITH GOOGLE                               │
│    - Enters Google credentials                                  │
│    - Google verifies identity                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. GOOGLE REDIRECTS BACK WITH AUTH CODE                         │
│    /api/auth/callback/google?code=...                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. NEXTAUTH CALLBACKS EXECUTE                                   │
│                                                                  │
│    signIn() callback:                                           │
│    ├─ Validate email (block disposable)                        │
│    ├─ Get or create user in Firestore                          │
│    ├─ Check user.isVerified && user.active                     │
│    └─ Return true/false/redirect                               │
│                                                                  │
│    jwt() callback:                                              │
│    ├─ Load dbUser from Firestore                               │
│    ├─ Sanitize dangerous keys                                  │
│    └─ Create JWT with dbUser data                              │
│                                                                  │
│    Result: JWT saved in HTTP-only cookie ✅                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. REDIRECT TO APP                                              │
│    User at callbackUrl (/dashboard)                             │
│    useSession() returns authenticated session ✅                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. FIREBASE AUTH SYNC (useFirebaseAuthSync hook)                │
│                                                                  │
│    Hook detects:                                                │
│    ├─ NextAuth: ✅ session exists                              │
│    └─ Firebase: ❌ firebaseAuth.currentUser is null            │
│                                                                  │
│    Hook calls /api/auth/set-claims:                             │
│    ├─ POST /api/auth/set-claims                                │
│    ├─ Server validates NextAuth session                        │
│    ├─ Server creates Firebase custom token                     │
│    ├─ Server sets custom claims                                │
│    └─ Returns { customToken, claims }                          │
│                                                                  │
│    Client signs in:                                             │
│    └─ signInWithCustomToken(firebaseAuth, customToken)         │
│                                                                  │
│    Result:                                                      │
│    ├─ Firebase accessToken created (1 hour) ✅                  │
│    ├─ Firebase refreshToken created (long-lived) ✅             │
│    └─ firebaseAuth.currentUser populated ✅                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. ✅ FULLY AUTHENTICATED                                       │
│                                                                  │
│    NextAuth Session:                                            │
│    ├─ session.user.id = "abc123"                               │
│    ├─ session.tId = 14                                         │
│    ├─ session.sId = 15                                         │
│    └─ session.role = "OWNER"                                   │
│                                                                  │
│    Firebase Auth:                                               │
│    ├─ firebaseAuth.currentUser.uid = "Ttg5J..."               │
│    ├─ firebaseAuth.currentUser.email = "user@example.com"     │
│    └─ Custom claims: { role, tenantId, storeId, uId }         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Password Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ENTERS EMAIL + PASSWORD                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. NEXTAUTH CREDENTIALS PROVIDER                                │
│    signIn('credentials', { email, password })                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SERVER: authorize() FUNCTION                                 │
│                                                                  │
│    ├─ Validate email format                                    │
│    ├─ Check account lockout                                    │
│    ├─ Get user from Firestore                                  │
│    ├─ Verify password with Firebase Auth:                      │
│    │  signInWithEmailAndPassword(firebaseAuth, email, password)│
│    │                                                            │
│    ├─ Success? → Log success, return dbUser                    │
│    └─ Failure? → Log failure, throw error                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. NEXTAUTH CALLBACKS                                           │
│    jwt() callback → Creates JWT with dbUser                     │
│    Result: JWT saved in cookie ✅                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CLIENT FIREBASE AUTH (Already signed in!)                    │
│                                                                  │
│    Step 3 already signed in to Firebase ✅                       │
│    - firebaseAuth.currentUser populated                         │
│    - No sync needed!                                            │
│                                                                  │
│    But we need to:                                              │
│    ├─ Establish client-side session                            │
│    │  signInWithEmailAndPassword(firebaseAuth, email, password)│
│    │                                                            │
│    └─ Set custom claims:                                       │
│       POST /api/auth/set-claims { uid }                        │
│       user.getIdToken(true) // Force refresh                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. ✅ FULLY AUTHENTICATED                                       │
│    Both NextAuth and Firebase Auth active                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚪 Logout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "LOGOUT"                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ signOutSession() called                                         │
│ (Custom wrapper function)                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: FIREBASE SIGN OUT                                       │
│                                                                  │
│    signOut(firebaseAuth)                                        │
│    ├─ Clears localStorage                                      │
│    ├─ Removes accessToken                                      │
│    ├─ Removes refreshToken                                     │
│    └─ firebaseAuth.currentUser = null ✅                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: NEXTAUTH SIGN OUT                                       │
│                                                                  │
│    signOut({ redirect: true, callbackUrl: '/signin' })         │
│    ├─ Clears session cookie                                    │
│    ├─ Removes JWT                                              │
│    └─ Redirects to /signin ✅                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ FULLY LOGGED OUT                                             │
│                                                                  │
│    ├─ useSession() returns null                                │
│    ├─ firebaseAuth.currentUser is null                         │
│    └─ User at /signin page                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⏰ Token Lifecycle Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        TIME AXIS                                 │
└─────────────────────────────────────────────────────────────────┘

DAY 0, HOUR 0: Login
├─ NextAuth JWT created
│  └─ Expires: Day 30 ✅
│
└─ Firebase Auth tokens created
   ├─ accessToken expires: Hour 1 ✅
   └─ refreshToken: long-lived ✅

────────────────────────────────────────────────────────────────

HOUR 1: Firebase token expires
├─ NextAuth JWT: Still valid (29 days left) ✅
│
└─ Firebase:
   ├─ accessToken EXPIRED ❌
   ├─ SDK detects expiration
   ├─ Uses refreshToken automatically
   └─ New accessToken created (expires Hour 2) ✅

────────────────────────────────────────────────────────────────

HOUR 2, 3, 4... : Auto-refresh cycle
└─ Firebase keeps auto-refreshing every hour ✅

────────────────────────────────────────────────────────────────

DAY 30: NextAuth JWT expires
├─ NextAuth JWT: EXPIRED ❌
│  └─ useSession() returns 'unauthenticated'
│
└─ Firebase tokens: INVALID ❌
   └─ Tied to NextAuth session

────────────────────────────────────────────────────────────────

RESULT: User must re-login
└─ Cycle repeats from Day 0

────────────────────────────────────────────────────────────────
```

---

## 🔐 Token Storage Locations

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  HTTP-ONLY COOKIES (XSS-safe)                        │       │
│  │  ─────────────────────────────────────────────────   │       │
│  │  next-auth.session-token = eyJhbGc...                │       │
│  │  └─ NextAuth JWT (encrypted JWE)                     │       │
│  │  └─ Contains: { email, dbUser, iat, exp, jti }      │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  LOCALSTORAGE (XSS-vulnerable)                       │       │
│  │  ─────────────────────────────────────────────────   │       │
│  │  firebase:authUser:AIzaSy...:ecomsai                 │       │
│  │  └─ Firebase Auth state                              │       │
│  │     ├─ accessToken (JWT)                             │       │
│  │     ├─ refreshToken (opaque)                         │       │
│  │     └─ User metadata                                 │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: EMAIL VALIDATION
├─ Validate email format
├─ Block disposable email domains
└─ Used in: OAuth & credentials login

LAYER 2: ACCOUNT LOCKOUT
├─ Track failed login attempts
├─ Lock after 5 failures in 15 min
└─ Auto-unlock after 15 minutes

LAYER 3: PROTOTYPE POLLUTION PREVENTION
├─ Remove dangerous keys (__proto__, constructor, prototype)
├─ Sanitize Firestore data
└─ Sanitize JWT token data

LAYER 4: CUSTOM CLAIMS VALIDATION
├─ Embed role, tenantId, storeId in token
├─ Firestore rules check claims
└─ Server validates claims

LAYER 5: LOGIN SOURCE TRACKING
├─ Track google vs credentials logins
├─ Log all auth events to Firestore
└─ Monitor suspicious patterns

LAYER 6: CSRF PROTECTION
├─ NextAuth built-in
└─ Validates request origin

ALL LAYERS ACTIVE ✅
```

---

**For more details, see:**
- [authentication-complete-guide.md](./authentication-complete-guide.md)
- [quick-reference.md](./quick-reference.md)
- [README.md](./README.md)
