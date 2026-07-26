import { Timestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard Types
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
// ═══════════════════════════════════════════════════════════════

/** Actions a reseller can perform */
export type ResellerTransactionAction = 'ONBOARD' | 'RENEW' | 'ADD_LOCATION' | 'CANCEL';

/** Payment modes for reseller onboarding */
export type ResellerPaymentMode = 'online' | 'offline';

/** Status of a reseller transaction */
export type ResellerTransactionStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

/**
 * Immutable transaction record for every reseller action.
 * Collection: resellerTransactions/{transactionId}. New manual renewal and
 * location-capacity mutations use the client operation UUID as transactionId;
 * older/onboarding rows may retain generated IDs.
 * 
 * Financial/action inputs are immutable. Payment convergence may update only
 * status, confirmation metadata, modifiedOn, and profileRevenueRecognized.
 * New renewal/location actions always append a new operation document.
 */
export interface ResellerTransaction {
    id: string;
    operationId?: string;
    resellerId: string;
    resellerProfileId?: string | null;
    resellerEmail: string;
    storeId: number;
    tenantId: number;
    storeName: string;

    // Transaction details
    action: ResellerTransactionAction;
    pricingTier: string;              // 'FOUNDER_400' | 'FOUNDER_500' | 'STANDARD'
    billingInterval: 'MONTH' | 'YEAR';
    commitmentMonths?: number;        // 3 | 6 | 12 (online: tracking, offline: duration)
    locationCount?: number;           // Number of prepaid/recurring locations covered by this transaction.
    subscriptionQuantity?: number;    // Current total licensed locations after this transaction.
    amountExpected: number;           // In paise (INR smallest unit)
    currency: 'INR';
    paymentMode: ResellerPaymentMode;
    profileRevenueRecognized?: boolean; // Explicit marker for exactly-once profile revenue convergence.

    // Status
    status: ResellerTransactionStatus;
    subscriptionId: string;           // Links to subscription doc
    subscriptionAmount?: number;      // Current subscription amount snapshot from /subscriptions.
    subscriptionBillingMode?: 'auto' | 'manual';
    subscriptionShortUrl?: string | null; // Razorpay checkout link for pending online subscriptions.
    subscriptionStatus?: string;

    // Timestamps (offline only for validFrom/validUntil)
    validFrom?: Timestamp | null;
    validUntil?: Timestamp | null;
    createdOn: Timestamp;
    modifiedOn: Timestamp;
}

/**
 * Reseller profile with personal details, caps, counts, and stats.
 * Collection: resellerProfiles/{autoId}
 * 
 * This is the single source of truth for all reseller data.
 * All stats are stored here — no separate stats collection.
 */
export interface ResellerProfile {
    id: string;                                // Document ID (auto-generated)

    // ── Personal Details ──
    name: string;
    phone: string;
    email: string;
    username: string;                          // Unique login username for reseller dashboard
    authUserId?: string;                       // Firebase Auth / users doc ID for reseller login
    passwordSetAt?: Timestamp | null;          // Password exists in Firebase Auth only; never stored here
    addressLine?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    notes?: string;                            // Founder's internal notes about this reseller

    // ── Caps & Limits ──
    maxOfflineActivations: number;             // Default: 20
    currentActiveOfflineStores: number;        // CONCURRENT count — decrements when store expires
    totalStoresOnboarded: number;              // Running lifetime count (never decrements)
    totalOnlineStores: number;                 // Lifetime online onboardings
    totalOfflineStores: number;                // Lifetime offline onboardings

    // ── Revenue Stats (updated on each onboarding/renewal) ──
    totalRevenueCollectedPaise: number;        // Total amount collected in paise (INR)
    totalTransactions: number;                 // Total transaction count

    // ── Status ──
    active: boolean;
    deleted?: boolean;                          // Legacy soft-delete compatibility; omitted for current profiles
    activatedAt: Timestamp;
    deactivatedAt?: Timestamp | null;

    // ── Metadata ──
    createdOn: Timestamp;
    modifiedOn: Timestamp;
    createdBy: string;                         // Founder who activated this reseller
}
