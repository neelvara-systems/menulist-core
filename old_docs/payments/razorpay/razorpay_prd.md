## **MenuListAI: Razorpay Payment Gateway - Technical Implementation Guide**

**Version:** 1.0
**Date:** July 12, 2025
**Author:** Full-Stack AI Expert & Project Team

### **1. Executive Summary & Vision**

This document outlines the complete technical architecture and implementation of the Razorpay payment gateway within the MenuListAI platform. The primary goal was to create a secure, robust, and scalable system to handle two core payment flows: **recurring subscriptions** (for B2C/B2B plans) and **one-time payments** (for credit top-ups).

The cornerstone of this implementation is a **provider-agnostic architecture**. While the initial integration is with Razorpay, the system is explicitly designed to accommodate other payment providers (e.g., Stripe) in the future with minimal refactoring of core application logic.

### **2. Core Architectural Principles**

The entire system was built upon the following non-negotiable principles:

- **Provider-Agnostic Database:** The Firestore schemas for subscriptions and top-ups (`FirestoreSubscriptionDoc`, `FirestoreTopupDoc`) are generic. They use fields like `paymentProvider` and `providerSubscriptionId` instead of `razorpaySubscriptionId`, ensuring that data from any payment gateway can be stored in a consistent format.
- **Multi-Tenancy by Design:** Every transaction and database record is scoped to a specific business (`tenantId`) and location (`storeId`). This context is captured at the moment of payment creation and is fundamental to all database queries and webhook processing.
- **Stateless & Secure Webhooks:** Webhook handlers are designed to be stateless. All the information required to process an event (`tenantId`, `storeId`, `userId`) is embedded within the `notes` object of the Razorpay Order or Subscription at the time of creation. This makes the webhook handler highly reliable and removes the need for complex, fragile mapping tables.
- **Idempotent Processing:** Webhooks from providers can sometimes be sent multiple times. Our system is idempotent, meaning a webhook event can be processed more than once without causing incorrect data changes or duplicate records. This is achieved by using the provider's unique IDs to find and update existing documents rather than creating new ones.
- **Separation of Concerns:** The implementation is cleanly separated into distinct, logical modules:
  - **API Routes:** Handle HTTP requests, authentication, and orchestration.
  - **Database Helpers:** Encapsulate all Firestore logic.
  - **Provider-Specific Modules:** Contain logic unique to Razorpay (e.g., `plan-handler.ts`, `webhook-validator.ts`).
  - **Client-Side Hooks:** Encapsulate all frontend payment logic for reusability and clean component code.

### **3. System Flow Diagrams**

#### **3.1. Subscription & Top-Up Creation Flow**

```
[User on Pricing Page]
       |
       v
[Clicks 'Purchase' on PlanCard/CreditPackCard]
       |
       v
[usePaymentHandler Hook] -> (Sets isLoading = true)
       |
       v
[fetch POST /api/razorpay/create-subscription or /create-topup-order]
       |
       v
[API Route (Backend)]
    1. Authenticates user, gets tenant/store context.
    2. Finds plan/pack details from constants.
    3. Calls `getOrCreateRazorpayPlan()` (for subscriptions).
    4. Calls `razorpayClient.subscriptions.create()` or `orders.create()` with `notes` metadata.
    5. Calls `createInitialSubscription()` or `createInitialTopupEntry()` to save a 'pending' record in Firestore.
    6. Returns Razorpay object (with `short_url` or `order_id`) to the client.
       |
       v
[usePaymentHandler Hook]
    1. Receives Razorpay object.
    2. Initializes `window.Razorpay(options)`.
    3. Calls `paymentObject.open()`.
       |
       v
[Razorpay Checkout Modal] -> (User completes payment)
```

#### **3.2. Webhook Processing Flow**

```
[Razorpay Server] -> (Sends POST request for an event, e.g., 'subscription.charged')
       |
       v
[/api/razorpay/webhook API Route]
    1. Calls `validateRazorpayWebhookSignature()`. If invalid, returns 400.
    2. Parses the validated request body into a JSON `event` object.
    3. Enters a `switch` statement based on `event.event`.
       |
       v (e.g., case 'subscription.charged')
    4. Extracts the `providerSubscriptionId` from `event.payload.subscription`.
    5. Calls `getSubscriptionByProviderId()` to find the matching document in Firestore.
    6. If document is found, calls `updateSubscription()` with the new status ('active'), `nextBillingDate`, and adds the new payment ID to `billingHistory`.
       |
       v
    7. Returns a 200 OK response to Razorpay to acknowledge successful receipt.
```

### **4. Implementation Deep Dive**

#### **Phase 1: A Provider-Agnostic Foundation**

- **Goal:** Establish a flexible foundation that supports multiple payment gateways.
- **Key Files:** `src/types/razorpay.ts`, `src/lib/razorpay/razorpay.ts`
- **Rationale:** We defined generic types like `PaymentProvider` and `FirestoreSubscriptionDoc`. The key decision was to use field names like `providerSubscriptionId` instead of `razorpaySubscriptionId`. This ensures that when we add another provider, our core database documents and functions (`updateSubscription`, etc.) do not need to be changed.

#### **Phase 2: The Generic Plan Handler**

- **Goal:** Create an intelligent function to find or create Razorpay Plans on-demand, preventing duplicates.
- **Key File:** `src/lib/razorpay/plan-handler.ts`
- **Rationale:** Creating a new plan for every single subscription is inefficient and clutters the Razorpay dashboard. The `getOrCreateRazorpayPlan` function solves this by creating a unique `lookupKey` (e.g., `B2C_PRO_MONTH_INR`) and storing it in the plan's `notes`. Before creating a new plan, it first searches for an existing plan with this key, ensuring we reuse plans whenever possible.

#### **Phase 3: The Generic Subscription Flow**

- **Goal:** Build the API endpoint and database functions for creating a new subscription.
- **Key Files:** `src/database/subscriptions/index.ts`, `/api/razorpay/create-subscription/route.ts`
- **Rationale:** This phase follows our established patterns. The API route orchestrates the flow: it authenticates the user, gets their `userType` from the tenant details, finds the correct plan from the `PlatformPlansList`, calls the plan handler, creates the subscription on Razorpay, and finally records the `pending` subscription in our own database.

#### **Phase 4: The Generic Top-Up Flow**

- **Goal:** Build the API endpoint for one-time credit pack purchases.
- **Key Files:** `src/database/topups/index.ts`, `/api/razorpay/create-topup-order/route.ts`
- **Rationale:** This flow is simpler than subscriptions. It creates a one-time `Order` in Razorpay instead of a subscription. The frontend receives the `order_id` and uses that to open the checkout. The backend creates a corresponding `pending` top-up document in Firestore.

#### **Phase 5: The Webhook Handler**

- **Goal:** Create a secure endpoint to receive real-time events from Razorpay and update Firestore accordingly.
- **Key Files:** `src/lib/razorpay/webhook-validator.ts`, `/api/razorpay/webhook/route.ts`
- **Rationale:** This is the most critical component for data integrity.
  - **Security:** The `validateRazorpayWebhookSignature` function is called _before_ parsing the request body. This is a crucial security measure to prevent denial-of-service attacks by rejecting invalid requests early.
  - **Routing:** The `switch` statement cleanly handles different event types.
  - **Data Consistency:** For each event, the handler finds the corresponding document in our database using the provider's ID and updates its status. This ensures our internal state always reflects the reality on Razorpay's servers.

### **5. Key Data Structures (Firestore)**

```typescript
// /tenants/{tenantId}/stores/{storeId}/subscriptions/{docId}
export interface FirestoreSubscriptionDoc {
  id?: string;
  paymentProvider: "razorpay" | "stripe";
  providerSubscriptionId: string;
  providerPlanId: string;
  userId: string;
  tenantId: number | string;
  storeId: number | string;
  status: "pending" | "active" | "cancelled" | "past_due";
  // ... other fields
}

// /tenants/{tenantId}/stores/{storeId}/topups/{docId}
export interface FirestoreTopupDoc {
  id?: string;
  paymentProvider: "razorpay" | "stripe";
  providerOrderId: string;
  providerPaymentId?: string;
  userId: string;
  tenantId: number | string;
  storeId: number | string;
  status: "pending" | "paid" | "failed";
  // ... other fields
}
```

### **6. How to Add a New Payment Provider (e.g., Stripe)**

The provider-agnostic architecture makes adding a second provider straightforward. Here is the exact process:

1.  **Add Environment Variables:** Add `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` to your `.env.local` file.
2.  **Create Provider SDK Instance:** Create `src/lib/stripe/stripe.ts` to initialize the Stripe SDK.
3.  **Create Plan Handler:** Create `src/lib/stripe/plan-handler.ts`. It will contain a `getOrCreateStripePlan` function, similar to the Razorpay one.
4.  **Create New API Routes:**
    - `src/app/api/stripe/create-subscription/route.ts`
    - `src/app/api/stripe/create-topup-order/route.ts`
    - These routes would call the Stripe SDK instead of the Razorpay SDK, but they would still call the same **generic** database functions (`createInitialSubscription`, etc.), simply passing `paymentProvider: 'stripe'`.
5.  **Create New Webhook:** Create `src/app/api/stripe/webhook/route.ts`. This webhook would validate the Stripe signature and then call the same generic database functions (`updateSubscription`, `updateTopupStatusByOrderId`) as the Razorpay webhook.
6.  **Update Frontend Hook:** In `usePaymentHandler.ts`, you would add a `provider` parameter to your handler functions and use an `if/else` or `switch` to call the correct API endpoint (`/api/razorpay/...` vs `/api/stripe/...`).

Notice that **no changes are required to the core database helper functions or the Firestore data structure.** This is the power of the architecture you have built.

### **7. Final Testing Checklist**

Before deployment, ensure all flows are tested in Razorpay's "Test Mode":

- [ ] **Successful Subscription:** Verify the subscription becomes `active` in Firestore.
- [ ] **Successful Top-Up:** Verify the top-up becomes `paid` in Firestore.
- [ ] **Failed Payment:** Verify the status is updated to `failed` or remains `pending`.
- [ ] **Subscription Cancellation:** Cancel from the Razorpay dashboard and verify the status becomes `cancelled` in Firestore.
- [ ] **UI Loading State:** Confirm buttons are disabled and show "Processing..." during API calls.

---
