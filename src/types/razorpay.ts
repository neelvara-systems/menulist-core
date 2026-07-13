import { Timestamp } from "firebase/firestore";
import type { ProductId } from "@constant/product";

// Core Types for the Payment System
export type PaymentProvider = "razorpay";
export type PaymentStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "expired"
  | "paid"
  | "failed"
  | "past_due"
  | "paused"
  | "completed";

export type PlanInterval = "MONTH" | "YEAR"; // Match the casing from PlatformPlansList.ts
export type UserType = "B2C" | "B2B";
export type Currency = "INR" | "USD";

// The metadata we will pass into the 'notes' field for any payment creation
// This is the key to linking webhook events back to our database
export interface PaymentMetadata {
  tenantId: number | string;
  storeId: number | string;
  userId: string;
  userType: UserType;
}

// ----------------------------------------------------------------
// Provider-Agnostic Firestore Document Schemas
// ----------------------------------------------------------------

/**
 * Represents a subscription document in Firestore.
 * Path: /tenants/{tenantId}/stores/{storeId}/subscriptions/{sub_id}
 *
 * @immutable BILLING IMMUTABILITY RULE:
 * This document must ONLY be modified through:
 *   1. Webhook handler       — /api/razorpay/webhook (Razorpay-initiated events)
 *   2. Verified API routes   — /api/razorpay/* (user-initiated with withAuth + tenant check)
 *   3. Reconciliation job    — functions/src/billing/reconcileSubscriptions.ts (nightly scheduler)
 *   4. DAL auto-expire       — expireIfGracePeriodEnded() (grace period enforcement)
 *
 * NEVER edit subscription documents manually in the Firestore console.
 * All status changes must pass through validateTransition() from subscriptionStateMachine.ts.
 */
export interface FirestoreSubscriptionDoc {
  id?: string;
  paymentProvider: PaymentProvider;
  providerSubscriptionId: string;
  providerPlanId: string;

  // --- Core User & Tenant Context ---
  userId: string;
  uId?: string;
  pId?: ProductId | string;
  productId?: ProductId | string;
  tId?: number | string;
  sId?: number | string;
  name: string;
  email: string;
  tenantId: number | string;
  storeId: number | string;
  userType: UserType;

  // --- Plan & Status Details ---
  status: PaymentStatus;
  planName: string;                 // NEW: User-friendly name, e.g., "Pro Plan (Yearly)"
  planId: string;                   // NEW: The internal plan identifier, e.g., "pro"
  planType: PlanInterval;
  analyticsEntitlement?: {
    activePlanType: string | null;
    status: string | null;
    syncedAt?: Timestamp;
    source?: string;
  };
  amount: number;
  currency: Currency;

  // --- CRITICAL: Billing Cycle Dates ---
  cycleStartDate: Timestamp | null;        // Null until the provider starts the first billing cycle.
  cycleEndDate: Timestamp | null;          // Null until the provider supplies the current cycle end.
  renewsOn: Timestamp | null;              // Null while a pending subscription has no next charge.
  subscriptionStartDate: Timestamp | null; // Null until the subscription is authenticated or active.
  subscriptionEndDate: Timestamp | null;   // Null until the provider supplies an end boundary.
  pastDueSinceAt: Timestamp | null;        // Set only while the subscription is past due.

  // --- CRITICAL: Credit Management System ---
  monthlyCreditsAllowance: number;  // NEW: The fixed number of credits this plan grants per cycle. Set ONCE.
  monthlyCredits: number;           // NEW: The current balance of recurring credits. RESET every cycle.
  topUpCredits: number;             // NEW: Balance of purchased credits from top-up packs. Does NOT reset.
  creditsLastResetMonth?: number;   // YYYYMM format (e.g., 202602). Tracks when monthlyCredits was last reset.
  carryForwardCredits?: number;      // Server-computed credits moved during a subscription upgrade.
  carryForwardFromSubscriptionId?: string;
  carryForwardAppliedAt?: Timestamp;
  upgradeReplacementSubscriptionId?: string;
  founderMonitorReplacementForSubscriptionId?: string;
  founderMonitorReplacementMrrPaise?: number;
  founderMonitorReplacementPlanId?: string | null;
  founderMonitorReplacementPlanName?: string | null;
  /** Durable Functions retry marker cleared only after entitlement/cache sync succeeds. */
  billingEntitlementSyncPending?: boolean;

  totalPaymentsNeededCount: number;
  totalPaymentsMadeCount: number;
  shortUrl: string;                 //NEW: The short url of the subscription for razorpay page 

  // --- Payment Method Details ---
  paymentMethod: {                  // NEW: Stored for display and user info.
    type: string;                   // e.g., 'card'
    brand?: string;                 // e.g., 'visa'
    last4?: string;                 // e.g., '4024'
    upiId?: string;                 //upi id
    upiTransactionId?: string;      //upi transaction id
  } | null;

  statuses: Array<{
    status: string;
    timestamp: Timestamp;
    amount: number;
    currency: string;
    remark: string
  }>;

  cancellation?: {
    reasonCode: 'no_longer_needed' | 'missing_functionality' | 'too_expensive' | 'switched_provider' | 'purchased_accidentally' | 'other';
    detail?: string;
    requestedAt: Timestamp;
    source: 'owner';
  };

  // --- Multi-Outlet Billing (Feature #4C-B) ---
  quantity?: number;                // Number of billable stores. Default: 1. Master + outlets.

  // --- History & Auditing ---
  billingHistory: string[];         // Array of providerPaymentIds from successful charges.
  lastWebhook: {
    event: string;
    timestamp: Timestamp;
  } | null;
  /** Recent provider event keys used to make partial-failure retries idempotent. */
  webhookEventHistory?: string[];

  // --- Reseller Dashboard Fields ---
  // @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §2.1
  billingMode?: 'auto' | 'manual';           // 'auto' = Razorpay recurring, 'manual' = reseller offline
  validUntil?: Timestamp | null;             // For manual billing only: when access expires
  onboardingSource?: 'WEBSITE_ONBOARDING' | 'RESELLER_ONBOARDING' | 'MESSAGING_ONBOARDING' | 'PUBLIC_MENU_ENTRY' | 'ANSWERLATTICE_ONBOARDING';  // How this store was onboarded
  resellerId?: string | null;                // User ID of the reseller who onboarded this store
  resellerProfileId?: string | null;         // resellerProfiles doc used for caps/stats when present
  resellerPricingTier?: string | null;       // 'FOUNDER_400' | 'FOUNDER_500' | 'STANDARD'
  commitmentPeriodMonths?: number | null;    // 3 | 6 | 12 (online: tracking only, offline: duration)
  manualPaymentConfirmed?: boolean;          // For offline: reseller confirmed payment received
  manualPaymentConfirmedAt?: Timestamp | null;
}

export type FirestoreBillingHistoryDoc = Array<{
  id: string;
  type: 'Subscription Payment' | 'Credit Pack Purchase';
  date: number;
  description: string;
  amount: number; // Assuming payment.amount is a number
  currency: string; // Assuming payment.currency is a string
  status: string; // Assuming payment.status is a string
  invoiceId: string; // Assuming payment.invoice_id is a string
}>
/**
 * Represents a one-time top-up document in Firestore.
 * Path: /tenants/{tenantId}/stores/{storeId}/topups/{order_id}
 */
export interface FirestoreTopupDoc {
  id?: string;
  paymentProvider: PaymentProvider;
  providerOrderId: string; // e.g., order_xxxxxxxx from a provider
  providerPaymentId?: string; // e.g., pay_xxxxxxxx from a provider
  creditsAdded: number;
  amount: number; // in the smallest currency unit (paise/cents)
  currency: Currency;
  status: PaymentStatus;
  userId: string;
  uId?: string;
  pId?: ProductId | string;
  productId?: ProductId | string;
  tId?: number | string;
  sId?: number | string;
  tenantId: number | string;
  storeId: number | string;
  paidAt?: Timestamp;
  packId?: string;
  packName?: string;
  type?: string;
}

export interface BillingHistoryItem {
  id: string;
  type: string;//'Subscription Payment' | 'Credit Pack Purchase';
  date: number; // JavaScript timestamp
  description: string;
  amount: number;
  currency: string;
  status: string;
  invoiceId?: string;
  invoiceUrl?: string;
  billingCycle?: string;
  credits?: number;
}
