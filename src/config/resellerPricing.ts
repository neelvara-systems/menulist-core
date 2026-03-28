// ═══════════════════════════════════════════════════════════════
// Reseller Pricing Tiers — Internal Only
// NEVER import this in PricingPlansModal or any public UI component.
// These tiers are only used by /api/reseller/* routes and billingUtils.ts.
//
// ⚠️ THESE ARE EXAMPLE TIERS — NOT FINAL PRICING.
// Edit the array below to add/remove/change tiers at any time.
// The system dynamically reads from this array — no hardcoded tier IDs elsewhere.
//
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §3
// ═══════════════════════════════════════════════════════════════

export interface ResellerPricingTier {
    id: string;                // Unique internal ID (used in dropdowns, DB fields)
    planId: string;            // Used in Razorpay notes + getPlanDetailsFromConstants()
    name: string;              // Display name for reseller (internal)
    displayName: string;       // What client sees on their subscription
    monthlyPriceINR: number;   // In paise
    yearlyPriceINR: number;    // In paise (annual)
    monthlyCredits: number;    // AI credits allocated per month
    description: string;       // Short description for reseller UI
    active: boolean;           // Set to false to disable without removing
}

/**
 * RESELLER PRICING TIERS
 *
 * To add a new tier: add an object to this array.
 * To disable a tier: set active: false.
 * To change pricing: update monthlyPriceINR/yearlyPriceINR.
 *
 * The system dynamically reads this array:
 * - Onboarding wizard shows all active tiers
 * - API validates against active tiers
 * - Webhook resolver uses planId prefix 'reseller_' to find tier
 */
export const RESELLER_PRICING_TIERS: ResellerPricingTier[] = [
    {
        id: 'FOUNDER_400',
        planId: 'reseller_founder_400',
        name: 'Founder Tier A',
        displayName: 'MenuList Starter',
        monthlyPriceINR: 40000,           // ₹400 in paise
        yearlyPriceINR: 480000,           // ₹4,800/yr
        monthlyCredits: 75,
        description: 'Early supporters & close network',
        active: true,
    },
    {
        id: 'FOUNDER_500',
        planId: 'reseller_founder_500',
        name: 'Founder Tier B',
        displayName: 'MenuList Starter',
        monthlyPriceINR: 50000,           // ₹500 in paise
        yearlyPriceINR: 600000,           // ₹6,000/yr
        monthlyCredits: 75,
        description: 'Friends & local contacts',
        active: true,
    },
    {
        id: 'STANDARD',
        planId: 'reseller_standard',
        name: 'Standard',
        displayName: 'MenuList Starter',
        monthlyPriceINR: 49900,           // ₹499 in paise (matches public Starter)
        yearlyPriceINR: 499000,           // ₹4,990/yr
        monthlyCredits: 75,
        description: 'Regular reseller pricing (same as public)',
        active: true,
    },
];

/**
 * Lookup reseller tier by its internal ID (e.g., 'FOUNDER_400')
 */
export function getResellerTierById(tierId: string): ResellerPricingTier | undefined {
    return RESELLER_PRICING_TIERS.find(t => t.id === tierId && t.active);
}

/**
 * Lookup reseller tier by planId (used by billingUtils.ts webhook resolution).
 * Returns a shape compatible with getPlanDetailsFromConstants() return type.
 */
export function getResellerPlanByPlanId(planId: string, interval: 'MONTH' | 'YEAR') {
    const tier = RESELLER_PRICING_TIERS.find(t => t.planId === planId);
    if (!tier) return null;
    return {
        planId: tier.planId,
        name: tier.displayName,
        billingInterval: interval,
        priceINR: {
            price: interval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR,
            monthlyCredits: tier.monthlyCredits,
        },
    };
}

export const RESELLER_COMMITMENT_OPTIONS = [3, 6, 12] as const;
export type ResellerCommitment = (typeof RESELLER_COMMITMENT_OPTIONS)[number];

export const RESELLER_CAPS = {
    MAX_CONCURRENT_OFFLINE_PER_RESELLER: 20,
    MAX_TOTAL_RESELLERS: 10,
} as const;

/** Calculate total amount for offline prepaid (tier × duration) */
export function calculateOfflineAmount(tierId: string, durationMonths: number): number {
    const tier = RESELLER_PRICING_TIERS.find(t => t.id === tierId);
    if (!tier) throw new Error(`Unknown pricing tier: ${tierId}`);
    return tier.monthlyPriceINR * durationMonths;
}

/**
 * Controls which features of the reseller system are active.
 * Set to false to disable without code changes.
 */
export const RESELLER_SYSTEM_FLAGS = {
    OFFLINE_MODE_ACTIVE: true,  // Set false to disable offline/cash payment mode entirely
} as const;

/**
 * Get all active reseller tiers.
 * Filters by the `active` field on each tier — no hardcoded tier ID checks.
 * To disable a tier, set its `active: false` in the RESELLER_PRICING_TIERS array above.
 */
export function getActiveResellerTiers(): ResellerPricingTier[] {
    return RESELLER_PRICING_TIERS.filter(tier => tier.active);
}
