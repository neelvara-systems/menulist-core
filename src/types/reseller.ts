import { Timestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard Types
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
// ═══════════════════════════════════════════════════════════════

/** Actions a reseller can perform */
export type ResellerTransactionAction = 'ONBOARD' | 'RENEW' | 'CANCEL';

/** Payment modes for reseller onboarding */
export type ResellerPaymentMode = 'online' | 'offline';

/** Status of a reseller transaction */
export type ResellerTransactionStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

/**
 * Immutable transaction record for every reseller action.
 * Collection: resellerTransactions/{autoId}
 * 
 * Documents are NEVER updated (except status field).
 * New transactions are appended for renewals.
 */
export interface ResellerTransaction {
    id: string;
    resellerId: string;
    resellerEmail: string;
    storeId: number;
    tenantId: number;
    storeName: string;

    // Transaction details
    action: ResellerTransactionAction;
    pricingTier: string;              // 'FOUNDER_400' | 'FOUNDER_500' | 'STANDARD'
    billingInterval: 'MONTH' | 'YEAR';
    commitmentMonths?: number;        // 3 | 6 | 12 (online: tracking, offline: duration)
    amountExpected: number;           // In paise (INR smallest unit)
    currency: 'INR';
    paymentMode: ResellerPaymentMode;

    // Status
    status: ResellerTransactionStatus;
    subscriptionId: string;           // Links to subscription doc

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
    password: string;                          // Hashed or plain (internal system — not client-facing)
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
    activatedAt: Timestamp;
    deactivatedAt?: Timestamp | null;

    // ── Metadata ──
    createdOn: Timestamp;
    modifiedOn: Timestamp;
    createdBy: string;                         // Founder who activated this reseller
}
