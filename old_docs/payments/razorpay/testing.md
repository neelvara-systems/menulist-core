Of course. Testing this entire workflow locally requires a methodical approach, moving from the backend configuration to the full frontend user journey. Here is a comprehensive step-by-step guide.

### **Pre-requisites: Setting Up Your Local Environment**

1.  **Run Your Next.js App:** Make sure your local development server is running.
    ```bash
    npm run dev
    ```
2.  **Expose Your Local Server:** Razorpay's webhooks cannot reach `localhost:3000` directly. You need a tunneling service to expose your local server to the internet. **ngrok** is the perfect tool for this.
    - Install ngrok if you haven't already.
    - Run this command in a new terminal window:
      ```bash
      ngrok http 3000
      ```
    - ngrok will give you a public "Forwarding" URL (e.g., `https://xxxx-xx-xxx-xx-xx.ngrok-free.app`). **Keep this URL handy. This is your public webhook endpoint.**

### **Step 1: Configure Your Razorpay Test Dashboard**

First, we need to tell Razorpay where to send test events.

1.  **Login to Razorpay:** Go to the [Razorpay Dashboard](https://dashboard.razorpay.com/) and make sure you are in **"Test Mode"**. The top of the dashboard should clearly indicate this.

2.  **Get Your API Keys:**

    - Navigate to **Settings** > **API Keys**.
    - Generate a new key if you haven't already.
    - Copy the **Key ID** and **Key Secret**.

3.  **Update Your `.env.local` file:**

    - Paste the keys into your project's `.env.local` file.
    - `RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx`
    - `RAZORPAY_KEY_SECRET=your_secret_key`
    - Also, ensure your **public-facing** key is set for the frontend:
    - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx` (This should be the same Key ID).

4.  **Set Up the Webhook Endpoint:**

    - In the Razorpay Dashboard, navigate to **Settings** > **Webhooks**.
    - Click **+ Add New Webhook**.
    - **Webhook URL:** This is where you use your **ngrok URL**. The path must match your API route. It will be: `https://<YOUR_NGROK_URL>/api/razorpay/webhook` (e.g., `https://1234-ab-cde-fg.ngrok-free.app/api/razorpay/webhook`).
    - **Secret:** Create a secure secret (e.g., a random string of characters). This is for signature validation.
    - **Active Events:** This is crucial. You must select all the events our application handles. Check the boxes for:
      - `order.paid`
      - `payment.failed`
      - `subscription.activated`
      - `subscription.charged`
      - `subscription.cancelled`
    - Click **Create Webhook**.

5.  **Final `.env.local` Update:**

    - Copy the webhook secret you just created in the Razorpay dashboard.
    - Paste it into your `.env.local` file:
    - `RAZORPAY_WEBHOOK_SECRET=your_webhook_secret`

6.  **Restart Your App:** Stop your Next.js server (`Ctrl+C`) and restart it (`npm run dev`) to ensure all the new environment variables are loaded.

**Your environment is now fully configured for end-to-end testing.**

### **Step 2: Testing the New User Onboarding Flow (The "Happy Path")**

This is the most complex flow to test.

1.  **Prepare Your Browser:**

    - Open your browser in **Incognito/Private mode**. This ensures you have no existing session cookies.
    - Clear your browser's `localStorage` for the `localhost:3000` site to remove any leftover `purchaseIntent`.

2.  **Initiate the Purchase:**

    - Navigate to `http://localhost:3000/pricing`.
    - Choose a plan (e.g., B2C Starter Monthly) and click **"Get Started"**.
    - **Expected Behavior:** The `OnboardingModal` should appear.

3.  **Complete Onboarding:**

    - Fill in the business name and select an industry.
    - Click **"Continue with Google"**.
    - **Expected Behavior:** You should be redirected to the Google Sign-in page.

4.  **Authenticate:**

    - Log in with a Google account. **Crucially, use an email that is NOT already in your application's Firestore `users` collection.**
    - **Expected Behavior:** After successful login, you should be redirected back to `http://localhost:3000/pricing`.

5.  **Observe the Magic:**

    - The page will briefly load. In the background, the `useEffect` and `executePostOnboarding` function are running.
    - **Check the Terminal:** You should see console logs from your backend:
      - Logs from `addTenant`, `addStore`, etc.
      - Logs from `/api/razorpay/create-subscription` being called.
    - **Expected Behavior:** The Razorpay Checkout modal should automatically open.

6.  **Complete the Payment:**

    - The modal will be pre-filled with your name and email.
    - Use one of Razorpay's official [test cards](https://razorpay.com/docs/payments/payments/test-cards/) to complete the payment. Use a **Success** card first.
    - Enter any future date and random CVV. Click "Pay".
    - **Expected Behavior:** The "Payment Successful" alert should appear.

7.  **Verify in Firestore:**

    - Go to your Firebase Console.
    - **Check the `users` collection:** A new user document should exist for your test email, and it should now have a `tenantId` and `storeId`.
    - **Check the `tenants` collection:** A new tenant document should exist with the business name you provided.
    - **Check the `stores` collection:** A new store document should exist.
    - **Check the `subscriptions` collection:** (You may need to check under the `tenants/.../stores/...` subcollection if you use that path). A new subscription document should exist. Its **status should be `active`**. The `providerSubscriptionId` should match the one in Razorpay.

8.  **Verify in Razorpay Dashboard:**
    - Go to the Razorpay Test Dashboard.
    - Navigate to **Subscriptions**. You should see the new subscription you just created.
    - Navigate to **Payments**. You should see the successful payment record.
    - Navigate to **Settings > Webhooks**. Click on your webhook URL. You should see a log of the `subscription.activated` and `subscription.charged` events with a `200 OK` status code, indicating your local server responded correctly.

**Congratulations! You have successfully tested the primary user onboarding and payment flow.**

### **Step 3: Quick Tests for Other Scenarios**

- **Test Top-Up Flow:**

  1.  Log in with the user you just created.
  2.  Go to the `/pricing` page.
  3.  Click "Purchase" on a credit pack.
  4.  Complete the payment with a test card.
  5.  Verify a new `topups` document is created in Firestore with a status of `paid`.

- **Test Cancellation (Webhook):**

  1.  In the Razorpay Test Dashboard, go to **Subscriptions**.
  2.  Find the subscription you created. Click on it.
  3.  Click the "Cancel Subscription" button. Choose to cancel "Immediately".
  4.  **Observe your Terminal:** You should see a log that the `/api/razorpay/webhook` endpoint received the `subscription.cancelled` event.
  5.  **Check Firestore:** The subscription document's status should now be `cancelled`.

- **Test Failed Payment:**
  1.  Log out and log in with a different test user (or use the same one).
  2.  Attempt to buy a subscription.
  3.  In the Razorpay modal, use a **Failure** test card.
  4.  **Expected Behavior:** The payment will fail in the modal.
  5.  **Check Firestore:** The subscription document should remain in `pending` status. Your webhook handler will receive a `payment.failed` event, which you can verify in the dashboard logs.

By following these steps, you can be highly confident that every aspect of your payment and onboarding system is working correctly before deploying to production.
