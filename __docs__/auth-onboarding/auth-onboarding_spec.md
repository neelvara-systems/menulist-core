# Auth & Onboarding — Product Specification

**Feature:** Complete Signup/Login/Onboarding/Payment Flow  
**Status:** ✅ Production Ready  
**Date:** January 26, 2026

---

## Executive Summary

This document describes the complete user journey from first visit to paying customer with full dashboard access.

### The Flow in 30 Seconds

1. User visits `/pricing` → sees plans
2. Clicks "Get Started" → Onboarding Modal opens
3. Enters business name & industry → Clicks "Continue with Google"
4. Google OAuth → User record created in Firestore
5. Onboarding API → Creates tenant, store, updates user (atomic)
6. Razorpay modal → User pays
7. Payment verified → Session updated → Dashboard access

---

## User Journey (Step by Step)

### Phase 1: Discovery (Pricing Page)

**URL:** `/pricing`

**What User Sees:**
- Plan cards (B2C or B2B)
- Monthly/Yearly toggle
- Currency switcher (USD/INR auto-detected)
- Feature comparison table

**User Action:** Clicks "Get Started" on a plan

### Phase 2: Business Details (Onboarding Modal)

**Trigger:** Plan card click

**What User Sees:**
- Modal with two fields:
  - Business Name (text input)
  - Business Industry (dropdown)
- "Continue with Google" button

**User Action:** Fills details → Clicks continue

**System Action:**
1. Stores `purchaseIntent` in localStorage:
   ```json
   {
     "businessName": "The Good Food Cafe",
     "businessIndustry": "Restaurant",
     "plan": { "planId": "...", "billingInterval": "YEAR" },
     "currency": "USD"
   }
   ```
2. If not logged in → Triggers Google OAuth

### Phase 3: Authentication (Google OAuth)

**Provider:** NextAuth with Google Provider

**What Happens:**
1. User redirected to Google consent screen
2. User grants permission
3. Callback to `/api/auth/callback/google`
4. NextAuth `signIn` callback checks:
   - Email not disposable
   - User not blocked
5. If new user → Creates minimal user record:
   ```typescript
   {
     email: "user@gmail.com",
     name: "John Doe",
     isVerified: true,
     active: true,
     tenantId: null,  // Not onboarded yet
     storeId: null,
     platformRole: 'OWNER',
     stores: []
   }
   ```
6. JWT created → Session available

### Phase 4: Onboarding (Tenant/Store Creation)

**API:** `POST /api/onboarding/create-subscription`

**Trigger:** After OAuth, if `purchaseIntent` exists in localStorage

**What Happens (Atomic Transaction):**

1. **Verify user not already onboarded:**
   ```typescript
   if (session.user.tenantId || session.user.storeId) {
     return error('User already onboarded');
   }
   ```

2. **Get next IDs from platformSummary:**
   ```typescript
   const newTenantId = summaryData.tenants.count + 1;
   const newStoreId = summaryData.stores.count + 1;
   ```

3. **Create Tenant:**
   ```typescript
   // tenants/{newTenantId}
   {
     name: businessName,
     businessType: 'B2C',
     businessIndustry: 'Restaurant',
     email: user.email,
     active: true,
     storesList: [{ storeId: newStoreId, name: '...' }],
     tenantId: newTenantId
   }
   ```

4. **Create Store:**
   ```typescript
   // stores/{newStoreId}
   {
     name: `${businessName} - Main Store`,
     businessType: 'B2C',
     businessCategory: 'food_beverage',
     tenantId: newTenantId,
     storeId: newStoreId,
     active: true
   }
   ```

5. **Update User:**
   ```typescript
   // users/{userId}
   {
     tenantId: newTenantId,
     storeId: newStoreId,
     stores: [{
       storeId: newStoreId,
       name: '...',
       roles: ['OWNER']  // First user = OWNER
     }]
   }
   ```

6. **Update Platform Summary:**
   - Increment tenant/store counts
   - Add to storesSummary for Cloud Functions

### Phase 5: Payment (Razorpay)

**What Happens:**

1. **Create Razorpay Subscription:**
   - API creates subscription with plan details
   - Notes include tenantId, storeId, userId

2. **Razorpay Modal Opens:**
   - User sees payment options (UPI, Card, etc.)
   - Completes payment

3. **Payment Handler Callback:**
   - Razorpay returns `razorpay_payment_id`, `razorpay_subscription_id`

4. **Verify Payment:**
   - `POST /api/razorpay/verify-subscription`
   - Server fetches payment from Razorpay API
   - Updates subscription status to `active`
   - Sets credits, billing dates

### Phase 6: Dashboard Access

**What Happens:**

1. **Session Update:**
   ```typescript
   await update({ 
     tenantId, 
     storeId, 
     sId: storeId, 
     tId: tenantId 
   });
   ```

2. **Firebase Auth Sync:**
   - Custom claims set via `/api/auth/set-claims`
   - Token refreshed with new claims

3. **Redirect to Dashboard:**
   - User now has full access
   - All API calls include tenantId/storeId from session

---

## Error Scenarios

### Payment Failed

| Scenario | System Behavior |
|----------|-----------------|
| User cancels Razorpay modal | `purchaseIntent` cleared, user stays on pricing |
| Payment declined | Error toast shown, user can retry |
| Network error during verification | Webhook eventually updates status |

### OAuth Failed

| Scenario | System Behavior |
|----------|-----------------|
| User cancels Google consent | Returns to pricing page |
| Disposable email blocked | Redirects to `/unauthorized` |
| Account locked | Shows lockout message |

### Onboarding Failed

| Scenario | System Behavior |
|----------|-----------------|
| Already onboarded | Error: "User already onboarded" |
| Rate limited | Error: "Too many attempts" |
| Transaction failed | Error logged, user can retry |

---

## Subscription States

| Status | Meaning | Dashboard Access |
|--------|---------|------------------|
| `pending` | Awaiting first payment | ❌ No |
| `active` | Payment successful, in good standing | ✅ Yes |
| `past_due` | Payment failed, in grace period | ✅ Yes (7 days) |
| `cancelled` | User cancelled, access until cycle end | ✅ Yes |
| `expired` | Grace period ended | ❌ No |
| `completed` | All payments made (yearly) | ❌ No |

---

## Key Business Rules

1. **First user = OWNER:** The first user to complete onboarding for a tenant gets `OWNER` role
2. **OAuth users pre-verified:** Google users don't need email verification
3. **7-day grace period:** Users have 7 days to fix failed payments
4. **Atomic onboarding:** Tenant + Store + User update happens in single transaction
5. **Session = 7 days:** Users must re-login after 7 days of inactivity

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pricing → Modal Open | 30% |
| Modal → OAuth Complete | 60% |
| OAuth → Payment Started | 80% |
| Payment Started → Success | 90% |
| **Overall Conversion** | **~13%** |

---

**DOCUMENT STATUS:** ✅ Production Ready
