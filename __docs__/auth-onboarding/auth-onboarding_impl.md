# Auth & Onboarding — Technical Implementation

**Feature:** Complete Signup/Login/Onboarding/Payment Flow  
**Status:** ✅ Production Ready  
**Date:** January 26, 2026

---

## 1. System Architecture

### 1.1 Dual Auth System

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO AUTH SYSTEMS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NextAuth (Server-Side)          Firebase Auth (Client-Side)    │
│  ━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  • JWT in HTTP-only cookie       • Access token in localStorage │
│  • 7 days lifespan               • 1 hour (auto-refresh)        │
│  • Used for API auth             • Used for Firestore rules     │
│  • useSession() hook             • firebaseAuth.currentUser     │
│                                                                  │
│  SYNC: /api/auth/set-claims creates custom token                │
│        signInWithCustomToken() establishes Firebase session     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Flows

| Flow                    | Entry Point                          | End State            |
| ----------------------- | ------------------------------------ | -------------------- |
| **New User Signup**     | Pricing → OAuth → Onboard → Pay      | Dashboard access     |
| **Existing User Login** | Login Page → OAuth/Credentials       | Dashboard access     |
| **Session Refresh**     | useSession() + useFirebaseAuthSync() | Both systems synced  |
| **Logout**              | signOutSession()                     | Both systems cleared |

---

## 2. Pricing Page Flow

### 2.1 Component: `src/components/templates/website/platformSite/landingPage/pricing/index.tsx`

```typescript
// Key state management
const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
const {
  onClickPaymentCard,
  pendingPlan,
  executePostOnboarding,
  isScriptLoaded,
} = usePaymentHandler(handleLoader);

// Flow when plan card clicked
const handlePaymentCardClick = (plan: Plan) => {
  onClickPaymentCard(plan, currency, () => setIsOnboardingModalOpen(true)).then(
    (paymentResponse) => handlePaymentSuccessResponse(paymentResponse),
  );
};
```

### 2.2 Purchase Intent Storage

```typescript
// Stored in localStorage before OAuth redirect
const purchaseIntent: PurchaseIntent = {
  businessName: string;      // From modal
  businessIndustry: string;  // From modal
  plan: Plan;                // Selected plan object
  currency: Currency;        // USD or INR
};
localStorage.setItem('purchaseIntent', JSON.stringify(purchaseIntent));
```

### 2.3 Post-OAuth Resume

```typescript
// src/components/templates/website/platformSite/landingPage/pricing/index.tsx:70-84
useEffect(() => {
  const intentExists = localStorage.getItem("purchaseIntent");
  if (status === "authenticated" && session?.user) {
    if (intentExists) {
      if (session.user.tenantId) {
        // Already onboarded - direct to payment
        handlePaymentCardClick(JSON.parse(intentExists).plan);
      } else {
        // New user - run full onboarding
        startPaymentprocessing();
      }
    }
  }
}, [session, isScriptLoaded]);
```

---

## 3. Authentication

### 3.1 NextAuth Configuration

**File:** `src/lib/auth/index.ts`

```typescript
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  providers: [
    GoogleProvider({...}),
    CredentialsProvider({...})
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      // 1. Validate email (block disposable)
      // 2. Get or create user in Firestore
      // 3. Check isVerified && active
      // 4. Return true/false/redirect
    },
    jwt: async ({ token, user, trigger }) => {
      // 1. Load dbUser on first login
      // 2. Refresh on trigger === 'update'
      // 3. Keep JWT minimal
    },
    session: async ({ session, token }) => {
      // 1. Populate session.user from token.dbUser
      // 2. Add shortcuts: tId, sId, uId, role
    }
  }
};
```

### 3.2 User Creation (OAuth)

**File:** `src/lib/auth/index.ts:122-151`

```typescript
// New OAuth user - create minimal record
const newUser = {
  email: email,
  name: user.name || email.split("@")[0],
  image: user.image || "",
  isVerified: true, // OAuth = pre-verified
  active: true,
  tenantId: null, // Set during onboarding
  storeId: null,
  platformRole: "OWNER",
  stores: [],
};
dbUser = await addPlatformUser(newUser);
```

### 3.3 Session Structure

```typescript
// What useSession() returns
{
  user: {
    id: "abc123",
    email: "user@example.com",
    name: "John Doe",
    tenantId: 14,          // null before onboarding
    storeId: 15,           // null before onboarding
    platformRole: "OWNER",
    stores: [{ storeId: 15, roles: ['OWNER'] }]
  },
  tId: 14,                 // Shorthand
  sId: 15,                 // Shorthand
  uId: "abc123",           // Shorthand
  role: "OWNER",           // First role from stores array
  expires: "2026-02-02T..."
}
```

---

## 4. Onboarding API

### 4.1 Endpoint: `POST /api/onboarding/create-subscription`

**File:** `src/app/api/onboarding/create-subscription/route.ts`

**Security:**

- `withAuth()` middleware required
- Rate limited (centralized config)
- Blocks if user already has tenantId/storeId
- Atomic Firestore transaction

### 4.2 Atomic Transaction

```typescript
const result = await db.runTransaction(async (transaction) => {
  // 1. Lock platformSummary (prevents race conditions)
  const platformSummary = await transaction.get(platformSummaryRef);

  // 2. Get next sequential IDs
  const newTenantId = summaryData.tenants.count + 1;
  const newStoreId = summaryData.stores.count + 1;

  // 3. Create tenant: tenants/{newTenantId}
  transaction.set(tenantRef, {
    name: businessName,
    businessType: userType,
    tenantId: newTenantId,
    storesList: [{ storeId: newStoreId, name: "..." }],
    // ...
  });

  // 4. Create store: stores/{newStoreId}
  transaction.set(storeRef, {
    name: `${businessName} - Main Store`,
    tenantId: newTenantId,
    storeId: newStoreId,
    businessCategory: getBusinessCategory(userType),
    // ...
  });

  // 5. Sync to storesSummary (for Cloud Functions)
  transaction.set(
    storesSummaryRef,
    {
      [`stores.${newStoreId}`]: {
        tId: newTenantId,
        businessType: userType,
        active: true,
      },
    },
    { merge: true },
  );

  // 6. Update user: users/{userId}
  transaction.update(userRef, {
    tenantId: newTenantId,
    storeId: newStoreId,
    stores: [
      {
        storeId: newStoreId,
        name: `${businessName} - Main Store`,
        roles: ["OWNER"], // ← FIRST USER = OWNER
      },
    ],
  });

  // 7. Increment counts
  transaction.update(platformSummaryRef, {
    "tenants.count": newTenantId,
    "stores.count": newStoreId,
  });

  return { tenantId: newTenantId, storeId: newStoreId };
});
```

### 4.3 Post-Transaction: Razorpay Subscription

```typescript
// Create Razorpay subscription with secure server-generated IDs
const razorpaySubscription = await razorpayClient.subscriptions.create({
  plan_id: razorpayPlanId,
  total_count: interval === "MONTH" ? 24 : 1,
  quantity: 1,
  notes: {
    tenantId: result.tenantId, // Server-created (secure)
    storeId: result.storeId,
    userId,
    userType,
    planId,
    // ...
  },
});

// Create Firestore subscription record
await createInitialSubscription(razorpaySubscription.id, {
  status: "pending",
  tenantId: result.tenantId,
  storeId: result.storeId,
  // ...
});
```

---

## 5. Payment Flow

### 5.1 Payment Handler Hook

**File:** `src/hooks/usePaymentHandler.ts`

```typescript
const executePostOnboarding = async (purchaseIntent: PurchaseIntent) => {
  // 1. Call onboarding API
  const response = await fetch("/api/onboarding/create-subscription", {
    method: "POST",
    body: JSON.stringify({
      businessName,
      businessIndustry,
      planId: plan.planId,
      interval: plan.billingInterval,
      currency,
      userType: plan.type,
    }),
  });

  const { subscription, tenantId, storeId } = await response.json();

  // 2. Update NextAuth session with new IDs
  await update({ tenantId, storeId, sId: storeId, tId: tenantId });

  // 3. Open Razorpay modal
  const paymentObject = new window.Razorpay({
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    subscription_id: subscription.id,
    handler: (response) => {
      verifySubscriptionPaymentResponse(response);
    },
  });
  paymentObject.open();
};
```

### 5.2 Payment Verification

**File:** `src/app/api/razorpay/verify-subscription/route.ts`

```typescript
export const POST = withAuth(async (request, session) => {
  const { razorpay_payment_id, razorpay_subscription_id } = body;

  // 1. Fetch payment from Razorpay (server-side verification)
  const payment = await razorpayClient.payments.fetch(razorpay_payment_id);

  // 2. Fetch subscription details
  const providerSubscription = await razorpayClient.subscriptions.fetch(razorpay_subscription_id);

  // 3. Get internal subscription record
  const internalSub = await getSubscriptionById(razorpay_subscription_id);

  // 4. Verify tenant access
  if (!verifyTenantAccess(session, internalSub.tenantId, internalSub.storeId)) {
    return 403;
  }

  // 5. Update subscription to active
  await updateSubscription(razorpay_subscription_id, {
    status: 'active',
    monthlyCredits: creditsForPlan,
    cycleStartDate: Timestamp.fromMillis(providerSubscription.current_start * 1000),
    cycleEndDate: Timestamp.fromMillis(providerSubscription.current_end * 1000),
    paymentMethod: { type: payment.method, ... }
  });

  return { success: true, status: 'active' };
});
```

### 5.3 Webhook Handler

**File:** `src/app/api/razorpay/webhook/route.ts`

```typescript
// Handles async payment status updates
switch (event.event) {
  case "subscription.activated":
  case "subscription.charged":
    // Update status to active, set billing dates
    break;

  case "payment.failed":
  case "subscription.halted":
    // Set status to past_due, record failure
    break;

  case "subscription.cancelled":
    // Already handled by cancel API
    break;

  case "subscription.completed":
    // Set status to completed
    break;
}
```

---

## 6. Firebase Auth Sync

### 6.1 Set Claims API

**File:** `src/app/api/auth/set-claims/route.ts`

```typescript
export const POST = withAuth(async (request, session) => {
  const dbUser = await getUserByEmail(session.user.email);

  // Get role for current store
  const userRole = dbUser.stores?.find(
    (store) => store.storeId === dbUser.storeId,
  )?.roles[0];

  const customClaims = {
    role: userRole || "OWNER",
    tenantId: String(dbUser.tenantId),
    storeId: String(dbUser.storeId),
    uId: dbUser.id,
  };

  // Set claims on Firebase Auth
  await authAdmin.setCustomUserClaims(uid, customClaims);

  // Create custom token for OAuth users
  const customToken = await authAdmin.createCustomToken(uid, customClaims);

  return { customToken, claims: customClaims };
});
```

### 6.2 Client-Side Sync

**File:** `src/components/templates/loginPage/index.tsx:42-105`

```typescript
useEffect(() => {
  const setupFirebaseAuth = async () => {
    if (session?.user?.email && !firebaseAuth.currentUser) {
      // OAuth user - need to establish Firebase session
      const response = await fetch("/api/auth/set-claims", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const { customToken } = await response.json();

      // Sign in with custom token
      await signInWithCustomToken(firebaseAuth, customToken);
    }

    // Redirect to dashboard
    router.push("/dashboard");
  };

  setupFirebaseAuth();
}, [session]);
```

---

## 7. Logout Flow

### 7.1 Sign Out Function

**File:** `src/lib/auth/client.ts`

```typescript
export const signOutSession = (callbackUrl = "/signin") => {
  return new Promise((res, rej) => {
    // 1. Sign out Firebase Auth first
    signOutFirebaseAuth()
      .then(() => {
        // 2. Then sign out NextAuth
        signOut({ redirect: false, callbackUrl })
          .then(() => res(true))
          .catch(rej);
      })
      .catch(rej);
  });
};
```

---

## 8. Database Schema

### 8.1 Users Collection

**Path:** `users/{docId}`

```typescript
{
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  active: boolean;
  tenantId: number | null;      // null before onboarding
  storeId: number | null;       // null before onboarding
  platformRole: string;
  stores: [{
    storeId: number;
    name: string;
    roles: string[];            // ['OWNER'] for first user
  }];
  createdOn: Timestamp;
  modifiedOn: Timestamp;
}
```

### 8.2 Tenants Collection

**Path:** `tenants/{tenantId}`

```typescript
{
  tenantId: number;
  name: string;
  businessType: 'B2C' | 'B2B';
  businessIndustry: string;
  email: string;
  active: boolean;
  verified: boolean;
  storesList: [{ storeId: number; name: string }];
  createdOn: Timestamp;
  modifiedOn: Timestamp;
}
```

### 8.3 Stores Collection

**Path:** `stores/{storeId}`

```typescript
{
  storeId: number;
  tenantId: number;
  name: string;
  businessType: 'B2C' | 'B2B';
  businessCategory: string;
  businessIndustry: string;
  email: string;
  active: boolean;
  verified: boolean;
  timeSlotPresets: TimeSlotPreset[];
  createdOn: Timestamp;
  modifiedOn: Timestamp;
}
```

### 8.4 Subscriptions Collection

**Path:** `subscriptions/{razorpaySubscriptionId}`

```typescript
{
  id: string;
  paymentProvider: 'razorpay';
  providerSubscriptionId: string;
  userId: string;
  tenantId: number;
  storeId: number;
  status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'completed';
  planId: string;
  planName: string;
  planType: 'MONTH' | 'YEAR';
  userType: 'B2C' | 'B2B';
  currency: 'USD' | 'INR';
  amount: number;
  monthlyCredits: number;
  monthlyCreditsAllowance: number;
  topUpCredits: number;
  cycleStartDate: Timestamp;
  cycleEndDate: Timestamp;
  subscriptionStartDate: Timestamp;
  subscriptionEndDate: Timestamp;
  renewsOn: Timestamp;
  pastDueSinceAt: Timestamp | null;
  paymentMethod: {
    type: string;
    brand: string;
    last4: string;
    upiId: string;
  };
  statuses: StatusEntry[];
  billingHistory: string[];
}
```

---

## 9. Security Checklist

| Check                                 | Implementation                              |
| ------------------------------------- | ------------------------------------------- |
| ✅ withAuth() on all protected routes | All payment/onboarding APIs                 |
| ✅ Input validation (Zod)             | All API inputs validated                    |
| ✅ Rate limiting                      | Onboarding: 3/hour, Subscription: 5/hour    |
| ✅ Tenant access verification         | verifyTenantAccess() on subscription verify |
| ✅ Atomic transactions                | Onboarding uses runTransaction()            |
| ✅ Server-side ID generation          | tenantId/storeId from platformSummary       |
| ✅ Disposable email blocking          | validateEmail() in auth callbacks           |
| ✅ Account lockout                    | 5 failed attempts = 15min lock              |
| ✅ Secure logging                     | secureLog() masks sensitive data            |
| ✅ Webhook signature validation       | validateRazorpayWebhookSignature()          |

---

## 10. File Inventory

| File                                                  | Purpose                           | LOC  |
| ----------------------------------------------------- | --------------------------------- | ---- |
| `src/lib/auth/index.ts`                               | NextAuth configuration            | 381  |
| `src/lib/auth/client.ts`                              | Client-side auth utils            | 40   |
| `src/lib/auth/security.ts`                            | Security utils (lockout, logging) | ~200 |
| `src/app/api/auth/set-claims/route.ts`                | Firebase claims API               | 133  |
| `src/app/api/onboarding/create-subscription/route.ts` | Onboarding API                    | 343  |
| `src/app/api/razorpay/create-subscription/route.ts`   | Subscription creation             | 218  |
| `src/app/api/razorpay/verify-subscription/route.ts`   | Payment verification              | 213  |
| `src/app/api/razorpay/webhook/route.ts`               | Webhook handler                   | 247  |
| `src/hooks/usePaymentHandler.ts`                      | Payment flow hook                 | 350  |
| `src/database/users/index.ts`                         | User DAL                          | 170  |
| `src/database/subscriptions/index.ts`                 | Subscription DAL                  | 143  |
| `src/components/.../pricing/index.tsx`                | Pricing page                      | 281  |
| `src/components/.../pricing/OnboardingModal.tsx`      | Onboarding modal                  | 197  |
| `src/components/.../loginPage/index.tsx`              | Login page                        | 287  |

---

---

## 11. Auth Audit Updates (Feb 19, 2026)

### New API Endpoints

| File                                        | Purpose                                                     | LOC |
| ------------------------------------------- | ----------------------------------------------------------- | --- |
| `src/app/api/auth/create-staff/route.ts`    | Server-side Firebase Auth staff creation                    | 91  |
| `src/app/api/auth/claim-account/route.ts`   | Claim account (Google OAuth MODE 1 + Email/Password MODE 2) | 254 |
| `src/app/api/auth/validate-claim/route.ts`  | Validate claim token, return business info                  | ~50 |
| `src/app/api/auth/update-profile/route.ts`  | Profile field updates (name, phone)                         | 68  |
| `src/app/api/auth/change-password/route.ts` | Password change with current password verification          | 110 |

### New UI Components

| File                                                                                      | Purpose                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx` | Profile modal (edit name/phone, change password) |

### Modified Files

| File                                                                     | Change                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `src/lib/auth/index.ts`                                                  | Removed `roles` (plural) from session sanitizer — only `role` (singular)            |
| `src/components/templates/loginPage/index.tsx`                           | Added claim flow UI (MODE 1: Google, MODE 2: email/password)                        |
| `src/components/templates/main-app/users/usersList/userForm/index.tsx`   | Replaced client-side `createUserWithEmailAndPassword` with server API               |
| `src/components/templates/platform/users/index.tsx`                      | Same fix for platform admin verify flow, removed dead code                          |
| `src/components/organisms/headerComponent/profileActionsModal/index.tsx` | Wired UserProfileModal + feature flag gate                                          |
| `src/config/features.ts`                                                 | Added `ENABLE_CLAIM_ACCOUNT`, `ENABLE_USER_PROFILE`, `ENABLE_SERVER_STAFF_CREATION` |

### Claim Account Flow (Two Modes)

```
MODE 1: Google OAuth (requires active NextAuth session)
  1. Owner clicks claim link → login page shows welcome message
  2. Owner clicks "Sign in with Google" → Google OAuth
  3. Post-login: localStorage pendingClaimToken → POST /api/auth/claim-account { claimToken }
  4. API transfers tenant/store from messaging user to Google user doc
  5. Redirect to dashboard

MODE 2: Email + Password (no session required)
  1. Owner clicks claim link → login page shows welcome message
  2. Owner clicks "Set up with email and password" → form appears
  3. Owner enters email + password → POST /api/auth/claim-account { claimToken, email, password }
  4. API creates Firebase Auth user, updates messaging user doc with real email
  5. Owner can now log in via email/password
```

### Key Decisions (see `__docs__/auth/auth_audit-decisions.md` for full reasoning)

- `isVerified` — KEPT (login gate: false = no Firebase Auth account)
- `platformRole` — KEPT (controls admin access)
- `role` vs `roles` — Only `role` (singular) used. One role per store per user.
- Claim token expiry — REMOVED (256-bit random = brute force impossible)
- Staff creation — Moved to server-side Admin SDK (client-side was signing out admin)

---

**DOCUMENT STATUS:** ✅ Production Ready  
**LAST UPDATED:** February 19, 2026 (Auth Audit)  
**CROSS-CHECKED:** All paths verified against codebase
