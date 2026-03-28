Excellent. The generated code for Phase 1 is a perfect implementation of the provider-agnostic foundation we designed. The types are robust, and the SDK initialization is correct. We are now ready to build on this solid base.

Let's proceed to the next phase.

---

### **Phase 2: The Generic Plan Handler**

**Goal:** Create an intelligent function that can find an existing plan on Razorpay or create a new one if it doesn't exist. This prevents us from creating duplicate plans for the same price/interval/currency combination. We will build this logic specifically for Razorpay first, as part of our provider-specific modules.

The core idea is to generate a unique "lookup key" for each plan variation (e.g., `B2C_PRO_MONTHLY_INR_1499`) and store it in the `notes` field of the Razorpay Plan object. This allows us to easily search for it later.

---

#### **Action 2.1: Create the Plan Handler Function**

**Prompt for IDE:**

> Create a new file at `src/lib/razorpay/plan-handler.ts`. Inside this file, create an async function named `getOrCreateRazorpayPlan`.
>
> **Function Signature:**
>
> ```typescript
> getOrCreateRazorpayPlan(
>   planInfo: {
>     price: number; // in smallest currency unit (paise/cents)
>     currency: 'INR' | 'USD';
>     interval: 'MONTH' | 'YEAR';
>     userType: 'B2C' | 'B2B';
>     planId: string; // e.g., 'pro', 'starter'
>   }
> ): Promise<string> // Returns the Razorpay Plan ID (e.g., 'plan_xxxxxxxx')
> ```
>
> **Implementation Steps:**
>
> 1.  Import the `razorpayClient` singleton.
> 2.  Inside the function, generate a unique, predictable `lookupKey` string based on the `planInfo`. For example: `${userType}_${planId}_${interval}_${currency}`. (e.g., 'B2C_pro_MONTH_INR').
> 3.  Use the `razorpayClient.plans.all()` method to search for a plan where `notes.lookupKey` matches the key you just generated. Razorpay's API fetches plans in pages, so you may need to fetch all plans and filter them in memory, or be aware of pagination if you have a very large number of plans. A simple `find` on the returned items should suffice for most cases.
> 4.  **If a plan is found:** Log a message like "Found existing plan..." and return its `id`.
> 5.  **If no plan is found:**
>     - Log a message like "No existing plan found, creating new one...".
>     - Construct a plan creation payload for the Razorpay API.
>       - `period`: Should be `'monthly'` or `'yearly'` based on the `interval` parameter.
>       - `interval`: Should be `1`.
>       - `item`: An object containing:
>         - `name`: A descriptive name, e.g., "B2C Pro Monthly (INR)".
>         - `description`: A more detailed description, e.g., "Subscription plan for B2C Pro tier on a monthly basis in INR."
>         - `amount`: The `price` from `planInfo`.
>         - `currency`: The `currency` from `planInfo`.
>       - `notes`: An object containing the `lookupKey` for future searches.
>     - Call `razorpayClient.plans.create()` with this payload.
>     - Return the `id` of the newly created plan.
> 6.  Wrap the logic in a `try...catch` block for robust error handling.

**Expected Code (`src/lib/razorpay/plan-handler.ts`):**

```typescript
import { razorpayClient } from "./razorpay";
import { Currency, PlanInterval, UserType } from "../../types/razorpay";
import { Plan } from "razorpay/dist/types/plan";

interface PlanInfo {
  price: number; // in smallest currency unit
  currency: Currency;
  interval: PlanInterval;
  userType: UserType;
  planId: string; // e.g., 'pro', 'starter'
}

/**
 * Finds an existing Razorpay plan or creates a new one to avoid duplicates.
 * It uses a unique key stored in the plan's 'notes' for lookups.
 * @param planInfo - The details of the plan to find or create.
 * @returns The Razorpay Plan ID (e.g., 'plan_xxxxxxxxxxxxx').
 */
export async function getOrCreateRazorpayPlan(
  planInfo: PlanInfo
): Promise<string> {
  const { price, currency, interval, userType, planId } = planInfo;

  // 1. Generate a unique, predictable key for this plan variation.
  const lookupKey =
    `${userType}_${planId}_${interval}_${currency}`.toUpperCase();
  console.log(`[Plan Handler] Looking for plan with key: ${lookupKey}`);

  try {
    // 2. Search for an existing plan with this lookupKey.
    // Razorpay API returns plans paginated, fetching a reasonable number to check.
    const existingPlans = await razorpayClient.plans.all({ count: 100 });
    const foundPlan = existingPlans.items.find(
      (p) => p.notes?.lookupKey === lookupKey
    );

    // 3. If a plan is found, return its ID.
    if (foundPlan) {
      console.log(`[Plan Handler] Found existing plan. ID: ${foundPlan.id}`);
      return foundPlan.id;
    }

    // 4. If no plan is found, create a new one.
    console.log(
      `[Plan Handler] No existing plan found for key ${lookupKey}. Creating a new one.`
    );

    const planPayload = {
      period: (interval === "MONTH" ? "monthly" : "yearly") as
        | "monthly"
        | "yearly",
      interval: 1,
      item: {
        name: `${userType} ${planId} - ${
          interval === "MONTH" ? "Monthly" : "Yearly"
        } (${currency})`,
        description: `Subscription for the ${userType} ${planId} tier on a ${interval.toLowerCase()} basis in ${currency}.`,
        amount: price,
        currency: currency,
      },
      notes: {
        lookupKey: lookupKey, // Store our unique key for future searches
      },
    };

    const newPlan = await razorpayClient.plans.create(planPayload);
    console.log(
      `[Plan Handler] Successfully created new plan. ID: ${newPlan.id}`
    );

    return newPlan.id;
  } catch (error) {
    console.error(
      "[Plan Handler] Error finding or creating Razorpay plan:",
      error
    );
    throw new Error("Could not process Razorpay plan.");
  }
}
```

Once this file is created, we have a vital piece of our infrastructure ready. This function will be called by our subscription creation API in the next phase. Let me know when you're ready to proceed to **Phase 3**.
