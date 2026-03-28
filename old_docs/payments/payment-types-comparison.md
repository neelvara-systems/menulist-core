# Subscription vs. One-Time Payments

This document provides a comprehensive comparison between subscription payments and one-time payments, along with implementation considerations for each approach within the MenuListAI platform.

## Table of Contents

1. [Overview](#overview)
2. [Subscription Payments](#subscription-payments)
3. [One-Time Payments](#one-time-payments)
4. [Technical Implementation Differences](#technical-implementation-differences)
5. [When to Use Each Approach](#when-to-use-each-approach)
6. [Database Considerations](#database-considerations)

## Overview

Payment strategies can significantly impact both business models and technical implementations. Understanding the differences between subscription-based and one-time payment models is crucial for making informed decisions about your application's monetization approach.

## Subscription Payments

### Key Characteristics

- **Recurring billing**: Customers are charged automatically at regular intervals (monthly, yearly)
- **Ongoing relationship**: Creates a long-term relationship with the customer
- **Predictable revenue**: Provides consistent, predictable revenue streams
- **Customer retention**: Focuses on retention rather than repeated acquisitions
- **Lifetime value (LTV)**: Often results in higher customer lifetime value
- **Service continuity**: Provides uninterrupted access to services or features

### Business Considerations

- Requires mechanisms for handling subscription renewals, cancellations, and upgrades
- Involves prorating charges when customers change plans mid-cycle
- Needs systems for handling payment failures and subscription recovery
- May require offering free trials to convert prospects to subscribers

### Technical Implementation with Stripe

```typescript
// Create a subscription with Stripe Checkout
const checkoutSession = await stripe.checkout.sessions.create({
  customer: customerId,
  payment_method_types: ["card"],
  line_items: [
    {
      price: stripePriceId, // Subscription price ID from Stripe
      quantity: 1,
    },
  ],
  mode: "subscription",
  subscription_data: {
    metadata: {
      userId: userId,
      planId: planId,
    },
    trial_period_days: 7, // Optional trial period
  },
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing`,
});
```

### Webhook Events to Monitor

For subscription management, you should track these essential webhook events:

- `checkout.session.completed`: Initial subscription creation
- `invoice.paid`: Successful subscription renewal
- `invoice.payment_failed`: Failed payment requiring customer action
- `customer.subscription.updated`: Changes to subscription details
- `customer.subscription.deleted`: Subscription cancellation

## One-Time Payments

### Key Characteristics

- **Single transaction**: Customer pays once for a specific product or service
- **Transactional relationship**: Each purchase is a separate transaction
- **Variable revenue**: Revenue depends on individual purchasing decisions
- **Customer acquisition**: Focus is on new purchases or repeat business
- **Immediate fulfillment**: Usually involves immediate delivery of product/service
- **Lower commitment**: Easier entry point for customers

### Business Considerations

- Simpler to implement and manage
- Requires continuous marketing to generate new purchases
- May need to incentivize repeat purchases
- Good for products with fixed costs or limited ongoing maintenance

### Technical Implementation with Stripe

```typescript
// Create a one-time payment with Stripe Checkout
const checkoutSession = await stripe.checkout.sessions.create({
  customer: customerId,
  payment_method_types: ["card"],
  line_items: [
    {
      price: stripePriceId, // One-time price ID from Stripe
      quantity: 1,
    },
  ],
  mode: "payment",
  metadata: {
    userId: userId,
    productId: productId,
  },
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment_success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
});
```

### Webhook Events to Monitor

For one-time payments, these webhook events are most important:

- `checkout.session.completed`: Payment has been completed
- `payment_intent.succeeded`: Payment has been confirmed successful
- `payment_intent.payment_failed`: Payment has failed

## Technical Implementation Differences

### Stripe Checkout Configuration

The fundamental difference in the Stripe Checkout configuration is the `mode` parameter:

- `mode: 'subscription'` for recurring subscriptions
- `mode: 'payment'` for one-time payments

### API Response Handling

```typescript
// For both subscription and one-time payments, redirect to Stripe Checkout
return NextResponse.json(
  {
    url: checkoutSession.url,
  },
  { status: 200 }
);
```

### Database Storage Requirements

**Subscriptions**

```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "incomplete";
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string; // ISO date
  cancelAtPeriodEnd: boolean;
  planVersion: number; // For tracking historical plan changes
  // Additional fields...
}
```

**One-Time Payments**

```typescript
interface Transaction {
  id: string;
  userId: string;
  productId: string;
  status: "completed" | "refunded" | "failed";
  amount: number;
  currency: string;
  createdOn: string; // ISO date
  // Additional fields...
}
```

## When to Use Each Approach

### Use Subscriptions When:

- Your service provides continuous value over time
- You want to build predictable, recurring revenue
- Your costs are ongoing (e.g., hosting, maintenance, content creation)
- You want to establish long-term customer relationships
- Your service receives regular updates or new content

### Use One-Time Payments When:

- You're selling a product with immediate, complete delivery
- You offer ad-hoc premium features or add-ons
- Customers might want to make occasional purchases without commitment
- Your service has a clear, one-time value proposition
- You want to lower the entry barrier for new customers

## Database Considerations

### Collection Structure

It's recommended to maintain separate collections for subscriptions and one-time transactions:

```typescript
// Database collections
const DB_COLLECTIONS = {
  USERS: "users",
  PRICING_PLANS: "pricingPlans",
  SUBSCRIPTIONS: "subscriptions",
  TRANSACTIONS: "transactions", // For one-time payments
  PRODUCTS: "products", // For one-time purchase items
};
```

### Query Patterns

Common queries for subscriptions:

- Active subscriptions for a user
- Subscriptions expiring soon
- Subscriptions with payment issues

Common queries for one-time payments:

- Recent purchases by a user
- Purchase history for a product
- Payment status for a specific transaction

---

**Note**: Your payment strategy doesn't have to be exclusively subscription-based or one-time. Many successful applications employ a hybrid approach, offering a subscription for core services and one-time payments for premium add-ons or features.
