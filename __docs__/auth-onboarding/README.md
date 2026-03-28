# Auth & Onboarding — Documentation Hub

> **Feature:** Authentication, Signup, Onboarding & Payment Flow  
> **Status:** ✅ Production Ready  
> **Last Updated:** January 26, 2026  
> **Version:** 2.0

---

## Quick Navigation

| Audience       | Document                               | Purpose                         |
| -------------- | -------------------------------------- | ------------------------------- |
| **CEO / PM**   | [\_spec.md](./auth-onboarding_spec.md) | Business flow, user journey     |
| **Developers** | [\_impl.md](./auth-onboarding_impl.md) | Technical blueprint, code paths |
| **Existing**   | [../auth/](../auth/)                   | Deep dive on auth systems       |

---

## What Is This Feature?

**One-liner:** Complete user journey from first visit to paying customer with dashboard access.

**Problem Solved:** New users need to:

1. Discover MenuList (pricing page)
2. Choose a plan
3. Sign up (Google OAuth)
4. Provide business details
5. Pay for subscription
6. Access their dashboard

**Solution:** Seamless flow that handles all of this in under 2 minutes.

---

## Architecture Overview (60-Second Summary)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE ONBOARDING FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PRICING PAGE                    2. PLAN SELECTION                       │
│     /pricing                           User clicks "Get Started"            │
│     ↓                                  ↓                                    │
│  3. ONBOARDING MODAL               4. GOOGLE OAUTH                          │
│     Collect: businessName,            signIn('google')                      │
│     businessIndustry                   ↓                                    │
│     ↓                               5. USER CREATED (Firestore)             │
│  6. STORE purchaseIntent               users/{uId}                          │
│     in localStorage                    tenantId: null (not onboarded yet)   │
│     ↓                                  ↓                                    │
│  7. ONBOARDING API                  8. ATOMIC TRANSACTION                   │
│     /api/onboarding/                   Create: tenant, store                │
│     create-subscription                Update: user with IDs                │
│     ↓                                  ↓                                    │
│  9. RAZORPAY MODAL                 10. PAYMENT VERIFICATION                 │
│     User completes payment             /api/razorpay/verify-subscription    │
│     ↓                                  ↓                                    │
│  11. SESSION UPDATE                12. DASHBOARD ACCESS                     │
│      NextAuth session refreshed        /dashboard                           │
│      Firebase claims set               Full access granted                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files in Codebase

| Purpose                  | File Path                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **Pricing Page**         | `src/components/templates/website/platformSite/landingPage/pricing/index.tsx`           |
| **Onboarding Modal**     | `src/components/templates/website/platformSite/landingPage/pricing/OnboardingModal.tsx` |
| **Login Page**           | `src/components/templates/loginPage/index.tsx`                                          |
| **Payment Handler Hook** | `src/hooks/usePaymentHandler.ts`                                                        |
| **NextAuth Config**      | `src/lib/auth/index.ts`                                                                 |
| **Auth Client Utils**    | `src/lib/auth/client.ts`                                                                |
| **Set Claims API**       | `src/app/api/auth/set-claims/route.ts`                                                  |
| **Onboarding API**       | `src/app/api/onboarding/create-subscription/route.ts`                                   |
| **Create Subscription**  | `src/app/api/razorpay/create-subscription/route.ts`                                     |
| **Verify Subscription**  | `src/app/api/razorpay/verify-subscription/route.ts`                                     |
| **Webhook Handler**      | `src/app/api/razorpay/webhook/route.ts`                                                 |
| **User DAL**             | `src/database/users/index.ts`                                                           |
| **Subscription DAL**     | `src/database/subscriptions/index.ts`                                                   |

---

## Data Created During Onboarding

| Collection                      | Document ID     | When Created                         |
| ------------------------------- | --------------- | ------------------------------------ |
| `users`                         | Auto-generated  | OAuth callback (before onboarding)   |
| `tenants`                       | Sequential ID   | Onboarding API (atomic)              |
| `stores`                        | Sequential ID   | Onboarding API (atomic)              |
| `platformSummary/storesSummary` | Merged          | Onboarding API (for Cloud Functions) |
| `subscriptions`                 | Razorpay Sub ID | After Razorpay subscription created  |

---

## Session Management

| System            | Token Type        | Lifespan              | Storage          |
| ----------------- | ----------------- | --------------------- | ---------------- |
| **NextAuth**      | JWT               | 7 days                | HTTP-only cookie |
| **Firebase Auth** | Access token      | 1 hour (auto-refresh) | localStorage     |
| **Custom Claims** | In Firebase token | Until refresh         | Firebase Auth    |

---

## Role Assignment (First User)

When onboarding creates the first user for a tenant:

```typescript
// src/app/api/onboarding/create-subscription/route.ts
// 1. Create default roles on store
const defaultRoles = createDefaultRoles(newStoreId, session.user.email);
transaction.set(storeRef, {
  // ... store data
  roles: defaultRoles, // Owner, Manager, Staff with feature-flag permissions
  // NOTE: rolesPermissionStrategy removed - not needed with single role per store
});

// 2. Assign single owner role to user
transaction.update(userRef, {
  tenantId: newTenantId,
  storeId: newStoreId,
  stores: [
    {
      storeId: newStoreId,
      name: `${businessName} - Main Store`,
      role: "owner", // Simple role ID (storeId already in same object)
    },
  ],
});
```

**Key insight:** First user gets `owner` role which maps to the Owner role definition in `store.roles`. Role IDs are simple strings (`owner`, `manager`, `staff`) - no storeId suffix needed since roles are already scoped per store.

---

## Related Documentation

- [Authentication Complete Guide](../auth/authentication-complete-guide.md) - Deep dive on NextAuth + Firebase
- [PONR Onboarding Spec](../onboarding/ponr-onboarding_spec.md) - Post-onboarding engagement strategy
- [Security Authentication](../security/authentication/) - Security patterns

---

## Version History

| Version | Date         | Changes                                          |
| ------- | ------------ | ------------------------------------------------ |
| 2.0     | Jan 26, 2026 | Consolidated docs, added role assignment context |
| 1.0     | Nov 7, 2025  | Initial authentication guide                     |
