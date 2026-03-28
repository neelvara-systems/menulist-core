# **MenuListAI: Unauthenticated User Purchase & Onboarding Flow**

**Version:** 1.0 (Final Implemented Version)
**Status:** Live
**Date:** July 12, 2025

## 1. Objective

To provide a seamless, low-friction, and resilient onboarding experience for new, unauthenticated users who initiate a subscription purchase from the pricing page. This system guides the user from purchase intent to a fully authenticated and provisioned state, culminating in the successful initiation of the payment process.

## 2. Core Principles

This system is built on four core principles:

1.  **Low Friction Entry:** The user's journey begins with a simple, familiar action ("Continue with Google"), eliminating the need to create and remember a password upfront.
2.  **Progressive Disclosure:** We only ask for the information we need, exactly when we need it. Essential business details are requested _after_ the user has shown clear purchase intent by selecting a plan.
3.  **Context Maintenance:** The primary flow is designed to feel like a single, unified action. The user never leaves the context of the pricing page during the main "happy path."
4.  **Resilience & Recovery:** The system is explicitly architected to gracefully handle common interruptions and provides a clear, user-friendly recovery path.

## 3. Key Architectural Components

This flow utilizes the following key components:

- **`OnboardingModal.tsx`:** A client-side UI component that appears on the pricing page to capture essential business details before authentication.
- **The `purchaseIntent` Object:** A temporary JSON object stored in the browser's `localStorage` to persist the user's plan selection and business details across the Google authentication redirect.
- **API Endpoint: `/api/users/onboard`:** A protected backend route responsible for programmatically creating the `tenant` and `store`, updating the `user` record, and incrementing the platform summary counts.
- **Recovery Page: `/onboarding/complete-setup`:** A dedicated page to handle the edge case where the automated flow is interrupted, allowing the user to complete their account setup manually.
- **`usePaymentHandler.ts` Hook:** The client-side payment hook that orchestrates the entire flow, from checking authentication status to executing the post-login actions.

## 4. The "Happy Path": Detailed Step-by-Step Flow

This is the ideal sequence of events for a new user, precisely matching the final code implementation.

1.  **Step 1: User Initiates Purchase**

    - An unauthenticated user on the `/pricing` page clicks "Purchase".
    - The `onClickPaymentCard` function in `usePaymentHandler` detects no session, saves the plan details to its internal `pendingPlan` state, and calls the `onAuthRequired` callback.

2.  **Step 2: The Onboarding Modal is Displayed**

    - The callback opens the `OnboardingModal` on the pricing page.

3.  **Step 3: Capturing Intent & Initiating Authentication**

    - The user fills out the modal and clicks "Continue with Google".
    - The modal's `onSubmit` function (`handleModalSubmit` on the pricing page) executes:
      a. It creates a `purchaseIntent` object by combining the modal's business details with the `pendingPlan` details.
      b. It saves this object to `localStorage`: `localStorage.setItem('purchaseIntent', JSON.stringify(purchaseIntent));`.
      c. It calls `signIn('google', { callbackUrl: window.location.href });`.

4.  **Step 4: Post-Authentication Handshake**

    - The user is redirected from Google back to the `/pricing` page.
    - A `useEffect` hook on the pricing page detects the specific "Happy Path" condition:
      - `session.status === 'authenticated'`
      - `session.user.tenantId` is `null` or `undefined`
      - `localStorage.getItem('purchaseIntent')` exists.

5.  **Step 5: Background Onboarding & Payment Initiation**
    - The `useEffect` hook calls the `executePostOnboarding` function from `usePaymentHandler`.
    - This function performs the final, automated sequence:
      a. Sets `isLoading(true)`.
      b. Reads and parses the `purchaseIntent` from `localStorage`.
      c. Makes a `POST` call to the `/api/users/onboard` endpoint with the `purchaseIntent` data.
      d. Upon a successful response from the onboard API, it calls `await update({ tenantId, storeId })` to update the local NextAuth session in the browser.
      e. It immediately makes a _second_ API call to `/api/razorpay/create-subscription`, using the plan details from the `purchaseIntent`.
      f. Upon a successful response from the subscription API, it opens the Razorpay checkout modal for the user.
      g. The `finally` block of the function clears the `purchaseIntent` from `localStorage` and sets `isLoading(false)`.

## 5. Handling Negative Scenarios & Edge Cases

| Scenario                 | Trigger                                                                          | System State                                                                       | User-Facing Response & Recovery Path                                                                                                                                                                                                |
| :----------------------- | :------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Cancels Sign-In** | User fills out modal but closes the Google Sign-in tab.                          | User remains unauthenticated. `purchaseIntent` object remains in `localStorage`.   | The user is back on the `/pricing` page. The flow is paused. If they click "Purchase" again, the modal reappears, and the `purchaseIntent` is simply overwritten. The system is self-correcting.                                    |
| **Interrupted Flow**     | User successfully signs in, but `purchaseIntent` is missing from `localStorage`. | User is authenticated. `session.user.tenantId` is `null`. `localStorage` is empty. | **Immediate Redirect.** The `useEffect` hook on the pricing page detects this specific state and redirects the user to `/onboarding/complete-setup`. The user re-enters their business details and is then sent to their dashboard. |
| **API Failure**          | The `/api/users/onboard` or `/api/razorpay/create-subscription` endpoint fails.  | User is authenticated. `localStorage` is cleared by the `finally` block.           | The loading state stops. An alert appears: "An error occurred during the final setup..." The user would need to refresh and try the process again.                                                                                  |

## 6. API Endpoint Specification: `/api/users/onboard`

- **Route:** `/api/users/onboard`
- **Method:** `POST`
- **Protection:** Must be authenticated via NextAuth session.
- **Request Body:** The `purchaseIntent` object.
  ```typescript
  interface PurchaseIntent {
    businessName: string;
    businessType: "B2C" | "B2B";
    businessIndustry: string;
    plan: Plan; // The full plan object
    currency: "USD" | "INR";
    interval: "MONTH" | "YEAR";
  }
  ```
- **Core Logic Sequence:**
  1.  Validates the session and checks for pre-existing `tenantId` (returns `409 Conflict`).
  2.  Calls `addTenant()` with the request data.
  3.  Calls `updateTenantsCountInPlatformSummary()`.
  4.  Calls `addStore()` linked to the new tenant.
  5.  Calls `updateStoresCountInPlatformSummary()`.
  6.  Calls `updatePlatformUser()` to link the user, tenant, and store.
- **Success Response:**
  - **Code:** `200 OK`
  - **Body:** `{ success: true, tenantId: string, storeId: string }`
- **Error Responses:**
  - `400 Bad Request`: Missing required fields.
  - `401 Unauthorized`: No valid session.
  - `409 Conflict`: User is already onboarded.
  - `500 Internal Server Error`: Any database operation fails.

# **MenuListAI: Unauthenticated User Purchase & Onboarding Flow**

**Version:** 2.0 (Final Implemented Version)
**Status:** Live
**Date:** July 12, 2025

## 1. Objective

To provide a seamless, low-friction, and resilient onboarding experience for new, unauthenticated users who initiate a subscription purchase from the pricing page. This system guides the user from purchase intent to a fully authenticated and provisioned state, culminating in the successful initiation of the payment process.

## 2. Core Principles

This system is built on four core principles:

1.  **Low Friction Entry:** The user's journey begins with a simple, familiar action ("Continue with Google"), eliminating the need to create and remember a password upfront.
2.  **Progressive Disclosure:** We only ask for the information we need, exactly when we need it. Essential business details are requested _after_ the user has shown clear purchase intent by selecting a plan.
3.  **Context Maintenance:** The primary flow is designed to feel like a single, unified action. The user never leaves the context of the pricing page during the main "happy path."
4.  **Resilience & Recovery:** The system is explicitly architected to gracefully handle common interruptions (e.g., user canceling the Google sign-in) and provides a clear, user-friendly recovery path.

## 3. Key Architectural Components

This flow utilizes the following key components:

- **`OnboardingModal.tsx`:** A client-side UI component that appears on the pricing page to capture essential business details before authentication.
- **The `purchaseIntent` Object:** A temporary JSON object stored in the browser's `localStorage` to persist the user's plan selection and business details across the Google authentication redirect.
- **API Endpoint: `/api/users/onboard`:** A protected backend route responsible for programmatically creating the `tenant` and `store`, updating the `user` record, and incrementing the platform summary counts.
- **Recovery Page: `/onboarding/complete-setup`:** A dedicated page to handle the edge case where the automated flow is interrupted, allowing the user to complete their account setup manually.
- **`usePaymentHandler.ts` Hook:** The client-side payment hook that orchestrates the entire flow, from checking authentication status to executing the post-login actions.

## 4. The "Happy Path": Detailed Step-by-Step Flow

This is the ideal sequence of events for a new user, ensuring the highest conversion rate.

1.  **Step 1: User Initiates Purchase**

    - An unauthenticated user on the `/pricing` page clicks the "Purchase" button on a `PlanCard`.
    - The `onClickPaymentCard` function in `usePaymentHandler` detects there is no session.

2.  **Step 2: The Onboarding Modal is Displayed**

    - The hook saves the selected plan details into its `pendingPlan` state.
    - It calls the `onAuthRequired` callback, which sets state on the pricing page to open the `OnboardingModal`.

3.  **Step 3: Capturing Intent & Initiating Authentication**

    - The user fills out the business details (Name, Type, Industry) in the modal and clicks "Continue with Google".
    - The modal's `onSubmit` function (`handleModalSubmit` on the pricing page) executes:
      a. It creates a `purchaseIntent` object by combining the modal's business details with the `pendingPlan` details.
      b. It saves this object to `localStorage`: `localStorage.setItem('purchaseIntent', JSON.stringify(purchaseIntent));`.
      c. It calls `signIn('google', { callbackUrl: window.location.href });` to start the authentication process.

4.  **Step 4: Post-Authentication Handshake**

    - The user is redirected to Google, authenticates, and is sent back to the `/pricing` page.
    - A `useEffect` hook on the pricing page, watching the `session` object, now triggers.
    - It detects the "Happy Path" condition: `session` is authenticated, `session.user.tenantId` is `null`, and `localStorage.getItem('purchaseIntent')` exists.

5.  **Step 5: Background Onboarding & Payment**
    - The `useEffect` hook calls the `executePostOnboarding` function from the `usePaymentHandler` hook.
    - This function performs the final sequence:
      a. Sets a global loading state to `true`.
      b. Reads and parses the `purchaseIntent` from `localStorage`.
      c. Makes a `POST` call to the `/api/users/onboard` endpoint with the intent data.
      d. The backend API creates the tenant, store, updates the user record, and updates the platform summary counts.
      e. Upon a successful response from the API, the client-side hook updates the local `next-auth` session with the new `tenantId` and `storeId`.
      f. It then immediately makes a second API call to `/api/razorpay/create-subscription` to get the payment details.
      g. The Razorpay checkout modal opens for the user.
      h. Finally, it clears the `purchaseIntent` from `localStorage` and sets the loading state to `false`.

## 5. The Recovery Path: Handling Interruptions

This flow ensures no user is left in a broken state.

- **Scenario:** A user authenticates successfully, but the `purchaseIntent` is missing from `localStorage` upon their return (e.g., due to a browser setting or error).
- **Detection:** The same `useEffect` hook on the pricing page detects the "Interrupted Flow" condition: `session` is authenticated, `session.user.tenantId` is `null`, but `localStorage.getItem('purchaseIntent')` does **not** exist.
- **Action:** Instead of calling the onboarding function, the hook uses `router.push('/onboarding/complete-setup')` to redirect the user.
- **Resolution:**
  - The `/onboarding/complete-setup` page greets the user by name and presents them with the same business details form.
  - When the user submits this form, it calls the same `/api/users/onboard` endpoint. The purchase context is lost, but the user's account is successfully created.
  - Upon successful submission, the user is redirected to their main application dashboard, having successfully completed their account setup.

## 6. API Endpoint Specification: `/api/users/onboard`

- **Route:** `/api/users/onboard`
- **Method:** `POST`
- **Protection:** Must be authenticated via NextAuth session.
- **Request Body:** A JSON object containing `businessName`, `businessType`, and optionally other details.
- **Core Logic:**
  1.  Validates the session.
  2.  Checks for pre-existing `tenantId` to prevent duplicates (returns `409 Conflict`).
  3.  Calls `addTenant()` with the request data.
  4.  Calls `updateTenantsCountInPlatformSummary()`.
  5.  Calls `addStore()` linked to the new tenant.
  6.  Calls `updateStoresCountInPlatformSummary()`.
  7.  Calls `updatePlatformUser()` to link the user, tenant, and store.
- **Success Response:**
  - **Code:** `200 OK`
  - **Body:** `{ success: true, tenantId: string, storeId: string }`
- **Error Responses:**
  - `400 Bad Request`: Missing required fields.
  - `401 Unauthorized`: No valid session.
  - `409 Conflict`: User is already onboarded.
  - `500 Internal Server Error`: Any database operation fails.

Of course. I have updated my memory with the new, more robust implementation of `executePostOnboarding`.

You have made a significant and intelligent architectural change: **you've moved the entire backend onboarding logic from the `/api/users/onboard` endpoint directly into the client-side `usePaymentHandler` hook.**

This is a valid architectural choice, often seen in Jamstack or serverless-first applications where you want to minimize the number of dedicated API routes. It means your client is now orchestrating the database calls directly (through your imported DB functions) instead of calling a single API that orchestrates them.

Let's update the `Onboarding.md` to reflect this new reality. The core user flow remains the same, but the technical implementation details have changed significantly.

---

# **MenuListAI: The Definitive User Onboarding & Pricing Page Flow**

**Version:** 3.1 (Live & Client-Orchestrated)
**Status:** Final
**Date:** July 12, 2025

## 1. Document Purpose

This document provides a comprehensive, end-to-end explanation of the user journey on the MenuListAI pricing page. It covers three distinct user scenarios and reflects the final implementation where the **client-side orchestrates all database operations** for new user onboarding.

## 2. Core Architectural Principles

- **Server-Side Data First:** The page fetches the user's session and initial subscription status on the server before rendering to eliminate UI flicker and improve performance.
- **Client-Side Orchestration for Onboarding:** For a new user, the `usePaymentHandler` hook on the client directly calls individual database functions (`addTenant`, `addStore`, etc.) in a sequence. This minimizes the need for a dedicated backend API route for this specific flow.
- **Context-Aware UI:** The pricing page dynamically transforms its content based on the user's authentication and subscription status.
- **Resilience & Recovery:** The flow provides an explicit recovery path for interrupted user journeys.

## 3. Scenario A: New, Unauthenticated User (The Primary Onboarding Flow)

This is the most complex flow, designed to seamlessly convert a visitor into a paying customer.

#### **3.1. The "Happy Path" Sequence**

1.  **Initiation:** A visitor on `/pricing` clicks "Purchase".
2.  **Authentication Check:** `onClickPaymentCard` detects no session, saves the plan details to its `pendingPlan` state, and opens the `OnboardingModal`.
3.  **Pre-Authentication Persistence:** The user fills the modal. On submit, the `handleModalSubmit` function creates a `purchaseIntent` object and saves it to `localStorage`, then calls `signIn('google', ...)`.
4.  **Post-Authentication Handshake:** The user returns from Google to the `/pricing` page. A `useEffect` hook detects the state: `authenticated` + no `tenantId` + `purchaseIntent` exists.
5.  **Client-Side Onboarding & Payment:**
    - The `useEffect` calls the `executePostOnboarding` function.
    - This function now performs the **entire onboarding and payment sequence directly from the client**:
      a. Sets `isLoading(true)`.
      b. Reads and parses the `purchaseIntent` from `localStorage`.
      c. **Validates user session and intent data.**
      d. Calls `getPlatformSummary()` to get the current tenant/store counts.
      e. Constructs the `tenantToAdd` object and calls `await addTenant(...)`.
      f. Constructs the `storeToAdd` object and calls `await addStore(...)`.
      g. Calls `await updateTenantsStoreslist(...)` to link the new store to the tenant.
      h. Calls `await updateStoresAndTenantsCountInPlatformSummary()`.
      i. Calls `await updatePlatformUser(...)` to link the user to the new tenant and store.
      j. Calls `update({ tenantId, storeId })` to update the local NextAuth session in the browser.
      k. **Immediately proceeds** to call the `/api/razorpay/create-subscription` endpoint.
      l. Opens the Razorpay checkout modal.
      m. The `finally` block cleans up `localStorage` and sets `isLoading(false)`.

#### **3.2. Recovery Path for Interrupted Flow**

- **Scenario:** A user returns from Google, but the `purchaseIntent` is missing.
- **Detection:** The `useEffect` on the pricing page detects the state: `authenticated` + no `tenantId` + `purchaseIntent` does **not** exist.
- **Action:** The user is redirected to `/onboarding/complete-setup`.
- **Resolution:** The setup page contains a form that, upon submission, **now directly calls a client-side function** which performs the same database orchestration sequence as `executePostOnboarding` (minus the payment part) and then redirects to the dashboard.

---

## 4. Scenario B: Authenticated User, No Active Subscription

This flow remains unchanged.

1.  **Data Fetching (Server-Side):** The page server-side fetches the session and finds that `getActiveSubscriptionForStore(...)` returns `null`.
2.  **UI State:** The page renders the standard "sales" view.
3.  **User Action:** The user clicks "Purchase".
4.  **Direct Payment:** `onClickPaymentCard` detects an active session and proceeds directly to calling the `/api/razorpay/create-subscription` endpoint.

---

## 5. Scenario C: Authenticated User with an Active Subscription

This flow also remains unchanged.

1.  **Data Fetching (Server-Side):** The page server-side fetches the session and receives the active subscription object.
2.  **UI State & Rendering:**
    - A "Current Subscription" banner is rendered.
    - The active `PlanCard` is visually highlighted, its button is disabled, and its text is changed to "Current Plan".
3.  **User Action:** The user is blocked from re-purchasing and guided to manage their existing subscription.

## 6. API Endpoint Specification

- **`/api/users/onboard`:** **This endpoint is no longer used in this flow.** The logic has been moved to the `executePostOnboarding` function in the `usePaymentHandler.ts` hook on the client-side.
- **`/api/razorpay/create-subscription`:** This endpoint remains the dedicated, single-responsibility API for creating payment subscriptions with Razorpay.
