# MenuListAI Subscription Management System

This document provides a comprehensive overview of the subscription management system implemented in MenuListAI dashboard. It covers the entire subscription lifecycle, from initial subscription creation to cancellation, refunds, and all states in between.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Subscription Data Model](#subscription-data-model)
3. [Subscription Lifecycle](#subscription-lifecycle)
4. [Webhook Event Handling](#webhook-event-handling)
5. [Database Operations](#database-operations)
6. [User Interface Integration](#user-interface-integration)
7. [Testing and Debugging](#testing-and-debugging)

## System Architecture

The subscription management system consists of several integrated components:

### Core Components

1. **Stripe Integration**

   - Handles payment processing
   - Manages subscription lifecycle events
   - Provides hosted invoice pages

2. **Firebase/Firestore Database**

   - Stores subscription records
   - Tracks subscription status and history
   - Maintains relationship between users and subscriptions

3. **Next.js API Routes**

   - Processes Stripe webhook events
   - Communicates between Stripe and our database

4. **React UI Components**
   - Displays subscription information to users
   - Provides subscription management interfaces

### Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Stripe    │──────│   Webhook   │──────│  Firestore  │──────│    React    │
│  (Payment)  │      │  Handlers   │      │ (Database)  │      │     (UI)    │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
```

## Subscription Data Model

The `Subscription` interface defines the structure of our subscription records:

```typescript
export interface Subscription {
  id: string; // Stripe Subscription ID (sub_xxx)
  userId: string; // Firebase user ID
  customerId: string; // Stripe customer ID
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  planId: string; // Stripe Price ID
  planName: string; // Display name of the plan
  planInterval: "day" | "week" | "month" | "year";
  currentPeriodStart: number; // Timestamp
  currentPeriodEnd: number; // Timestamp
  cancelAtPeriodEnd: boolean; // Whether subscription will cancel at period end
  createdOn: string; // ISO date string
  updatedAt: string; // ISO date string
  currency: string; // Currency code (e.g., 'USD')
  amount: number; // Amount in cents/smallest currency unit
  planVersion: number; // Version of the pricing plan
  latestInvoice?: {
    // Most recent invoice details
    invoiceId: string;
    invoiceUrl: string; // URL to Stripe's hosted invoice page
    status: "paid" | "open" | "void" | "uncollectible";
  };
  nextPaymentAttempt?: number; // Timestamp for next payment retry (for failed payments)
  autoRenew: boolean; // Whether subscription auto-renews
  trialStart?: number; // Trial period start timestamp
  trialEnd?: number; // Trial period end timestamp
  refund?: {
    // Refund information if applicable
    refunded: boolean;
    refundId: string; // Stripe refund ID
    refundAmount: number; // Amount refunded
    refundCurrency: string; // Currency of refund
    refundReason: string; // Reason for refund
    refundDate: string; // ISO date string of refund
  };
}
```

## Subscription Lifecycle

Our system tracks the complete subscription lifecycle:

1. **Creation**

   - User selects a plan
   - Checkout session is created
   - Payment is processed
   - Subscription record is created in database

2. **Active State**

   - Subscription is active
   - User has access to premium features
   - Invoices are generated and paid automatically

3. **Renewal**

   - Subscription renews automatically at period end
   - New invoice is generated and charged
   - Subscription period is extended

4. **Failed Payment**

   - Payment attempt fails
   - System records failure and tracks retry attempt schedule
   - Notification logic can be triggered
   - Subscription enters 'past_due' state

5. **Trial**

   - User can start with a trial period
   - System tracks trial start and end dates
   - Notification is sent before trial ends

6. **Cancellation**

   - User cancels subscription or payment repeatedly fails
   - System updates status to 'canceled'
   - Access revocation logic is triggered

7. **Refund**
   - Payment is refunded (full or partial)
   - System records refund details
   - Database is updated with refund information

## Webhook Event Handling

The system processes the following Stripe webhook events:

### Event: `checkout.session.completed`

Triggered when a customer completes the checkout process.

```typescript
// Example event data
{
  "id": "evt_1NkPX5LkdIwHu7ixOvemKJQp",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1b2c3...",
      "customer": "cus_M9uc3vRX2niobR",
      "subscription": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      // ... other session data
    }
  }
}
```

**Handler Flow:**

1. Retrieves the session details from Stripe
2. Gets the customer details to find the associated user
3. Creates a new subscription record in the database
4. Updates user's subscription status

### Event: `customer.subscription.created`

Triggered when a subscription is created after checkout completion.

```typescript
// Example event data
{
  "id": "evt_1NkPX6LkdIwHu7ixVxQcXs4R",
  "object": "event",
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "customer": "cus_M9uc3vRX2niobR",
      "status": "active",
      "items": {
        "data": [
          {
            "price": {
              "id": "price_1NkOxxLkdIwHu7ixVmkLQhBZ",
              "unit_amount": 1999,
              "currency": "usd"
            }
          }
        ]
      },
      // ... other subscription data
    }
  }
}
```

**Handler Flow:**

1. Gets customer details to retrieve user ID
2. Extracts price information for amount and currency
3. Retrieves invoice information
4. Creates a subscription record with comprehensive details

### Event: `invoice.paid`

Triggered when an invoice is paid successfully.

```typescript
// Example event data
{
  "id": "evt_1NkPX7LkdIwHu7ixDzRoQ8F2",
  "object": "event",
  "type": "invoice.paid",
  "data": {
    "object": {
      "id": "in_1NkPX4LkdIwHu7ixNwFbHtLE",
      "customer": "cus_M9uc3vRX2niobR",
      "subscription": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "status": "paid",
      "hosted_invoice_url": "https://invoice.stripe.com/i/acct_1LkdIwHu7ix/test_..."
      // ... other invoice data
    }
  }
}
```

**Handler Flow:**

1. Retrieves subscription details
2. Gets invoice URL for user reference
3. Updates subscription status to 'active'
4. Updates billing period information

### Event: `invoice.payment_failed`

Triggered when a payment attempt fails.

```typescript
// Example event data
{
  "id": "evt_1NkPYBLkdIwHu7ixQzAb5Rf9",
  "object": "event",
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_1NkPYALkdIwHu7ixMtXyS4q2",
      "customer": "cus_M9uc3vRX2niobR",
      "subscription": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "status": "open",
      "next_payment_attempt": 1650384000,
      // ... other invoice data
    }
  }
}
```

**Handler Flow:**

1. Retrieves subscription details
2. Gets latest invoice information
3. Updates subscription to 'past_due' status
4. Records next payment attempt time

### Event: `invoice.payment_action_required`

Triggered when additional authentication (like 3D Secure) is required.

```typescript
// Example event data
{
  "id": "evt_1NkPYFLkdIwHu7ixTqPz8XeS",
  "object": "event",
  "type": "invoice.payment_action_required",
  "data": {
    "object": {
      "id": "in_1NkPYELkdIwHu7ixLvNb7K3r",
      "customer": "cus_M9uc3vRX2niobR",
      "subscription": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "status": "open",
      "hosted_invoice_url": "https://invoice.stripe.com/i/acct_1LkdIwHu7ix/test_..."
      // ... other invoice data
    }
  }
}
```

**Handler Flow:**

1. Retrieves subscription details
2. Gets invoice information with payment URL
3. Updates subscription with latest status
4. Records invoice URL for customer action

### Event: `customer.subscription.updated`

Triggered when a subscription is modified.

```typescript
// Example event data
{
  "id": "evt_1NkQaCLkdIwHu7ixPvGy5Th8",
  "object": "event",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "customer": "cus_M9uc3vRX2niobR",
      "status": "active",
      "cancel_at_period_end": true,
      // ... other subscription data
    }
  }
}
```

**Handler Flow:**

1. Updates subscription details in database
2. Records cancellation intent if present
3. Updates billing period information

### Event: `customer.subscription.trial_will_end`

Triggered three days before a trial period ends.

```typescript
// Example event data
{
  "id": "evt_1NkRbDLkdIwHu7ixSzXv4Tg9",
  "object": "event",
  "type": "customer.subscription.trial_will_end",
  "data": {
    "object": {
      "id": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "customer": "cus_M9uc3vRX2niobR",
      "status": "trialing",
      "trial_end": 1650470400,
      // ... other subscription data
    }
  }
}
```

**Handler Flow:**

1. Retrieves customer details for user identification
2. Updates subscription to indicate trial is ending
3. Opportunity to trigger notification logic

### Event: `customer.subscription.deleted`

Triggered when a subscription is cancelled or expires.

```typescript
// Example event data
{
  "id": "evt_1NkSc4LkdIwHu7ixRwQb3T5h",
  "object": "event",
  "type": "customer.subscription.deleted",
  "data": {
    "object": {
      "id": "sub_1NkPX4LkdIwHu7ixScJJF9iq",
      "customer": "cus_M9uc3vRX2niobR",
      "status": "canceled",
      // ... other subscription data
    }
  }
}
```

**Handler Flow:**

1. Updates subscription status to 'canceled' in database
2. Retrieves customer details for user identification
3. Updates user record with subscription status
4. Triggers access revocation logic

### Event: `charge.refunded`

Triggered when a payment is refunded.

```typescript
// Example event data
{
  "id": "evt_1NkTd5LkdIwHu7ixQvPa2S4g",
  "object": "event",
  "type": "charge.refunded",
  "data": {
    "object": {
      "id": "ch_1NkTd4LkdIwHu7ixNuOz1R3f",
      "invoice": "in_1NkPX4LkdIwHu7ixNwFbHtLE",
      "amount_refunded": 1999,
      "currency": "usd",
      "refunds": {
        "data": [
          {
            "id": "re_1NkTd5LkdIwHu7ixPtNx0Q2e",
            "reason": "requested_by_customer"
          }
        ]
      },
      // ... other charge data
    }
  }
}
```

**Handler Flow:**

1. Retrieves the invoice and associated subscription
2. Creates detailed refund information record
3. Updates subscription with refund details

## Database Operations

The system uses several core database functions:

### `createSubscriptionFromStripeData`

Creates a new subscription record from Stripe data.

```typescript
// Example usage
await createSubscriptionFromStripeData(
  "sub_1NkPX4LkdIwHu7ixScJJF9iq", // subscriptionId
  "user123", // userId
  "cus_M9uc3vRX2niobR", // customerId
  "active", // status
  "price_1NkOxxLkdIwHu7ixVmkLQhBZ", // planId
  "Pro Plan", // planName
  "month", // planInterval
  1649952000, // currentPeriodStart
  1652544000, // currentPeriodEnd
  false, // cancelAtPeriodEnd
  {
    // latestInvoice
    invoiceId: "in_1NkPX4LkdIwHu7ixNwFbHtLE",
    invoiceUrl: "https://invoice.stripe.com/i/acct_1LkdIwHu7ix/test_...",
    status: "paid",
  },
  1, // planVersion
  "usd", // currency
  1999, // amount
  1649952000, // trialStart
  1650470400 // trialEnd
);
```

### `updateSubscriptionFromStripeData`

Updates an existing subscription record with new Stripe data.

```typescript
// Example usage
await updateSubscriptionFromStripeData(
  "sub_1NkPX4LkdIwHu7ixScJJF9iq", // subscriptionId
  "active", // status
  1649952000, // currentPeriodStart
  1652544000, // currentPeriodEnd
  false, // cancelAtPeriodEnd
  null, // nextPaymentAttempt
  {
    // latestInvoice
    invoiceId: "in_1NkPX4LkdIwHu7ixNwFbHtLE",
    invoiceUrl: "https://invoice.stripe.com/i/acct_1LkdIwHu7ix/test_...",
    status: "paid",
  }
);
```

### `cancelSubscription`

Marks a subscription as canceled in the database.

```typescript
// Example usage
await cancelSubscription("sub_1NkPX4LkdIwHu7ixScJJF9iq");
```

### `getSubscriptionById`

Retrieves a subscription record by its ID.

```typescript
// Example usage
const subscription = await getSubscriptionById("sub_1NkPX4LkdIwHu7ixScJJF9iq");
```

## User Interface Integration

The subscription data is presented to users through several UI components:

1. **Billing Dashboard**

   - Shows current subscription status
   - Displays invoice history with links to hosted invoice pages
   - Provides plan upgrade/downgrade options
   - Allows cancellation management

2. **Payment Method Management**

   - Allows users to update payment methods
   - Handles failed payment recovery

3. **Plan Selection Interface**
   - Presents available plans with pricing
   - Highlights features for each plan
   - Handles plan switching logic

## Testing and Debugging

### Webhook Testing

Use Stripe CLI for local testing:

```bash
# Forward webhook events to your local server
stripe listen --forward-to localhost:3000/api/webhook

# Trigger specific webhook events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

### Common Troubleshooting

1. **Webhook Signature Verification Failed**

   - Check that `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure raw request body is being used for verification

2. **Subscription Not Created**

   - Verify customer metadata contains user ID
   - Check database connection and permissions

3. **Invoice URL Not Available**
   - Ensure invoice retrieval includes necessary expansion
   - Verify Stripe account settings allow hosted invoices

### Monitoring Production

For production environments:

1. Set up Stripe Dashboard alerts for failed payments
2. Implement error tracking with detailed logging
3. Create admin dashboard for subscription monitoring
4. Set up database triggers for critical state changes

## Conclusion

This subscription management system provides a comprehensive solution for handling the entire subscription lifecycle. By integrating Stripe's powerful payment infrastructure with our Firebase database and Next.js API routes, we've created a robust system that can handle all aspects of subscription management, from creation to cancellation and everything in between.
