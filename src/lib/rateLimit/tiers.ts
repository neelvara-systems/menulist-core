/**
 * Rate Limiting Tiers
 * Different limits based on user subscription level
 */

export interface RateLimitTier {
    limit: number;      // Max requests allowed
    window: number;     // Time window in seconds
    description: string;
    costPerMonth?: number;  // For display
}

/**
 * Rate limit configurations by subscription tier
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
    /**
     * Free Tier
     * Perfect for trying out the service
     */
    FREE: {
        limit: 20,
        window: 60,
        description: 'Free tier - 20 requests per minute',
        costPerMonth: 0
    },

    /**
     * Basic Tier
     * For regular users
     */
    BASIC: {
        limit: 50,
        window: 60,
        description: 'Basic subscription - 50 requests per minute',
        costPerMonth: 9
    },

    /**
     * Pro Tier
     * For power users and small teams
     */
    PRO: {
        limit: 100,
        window: 60,
        description: 'Pro subscription - 100 requests per minute',
        costPerMonth: 29
    },

    /**
     * Enterprise Tier
     * For large organizations
     */
    ENTERPRISE: {
        limit: 500,
        window: 60,
        description: 'Enterprise - 500 requests per minute',
        costPerMonth: 99
    },

    /**
     * Admin/Internal
     * For your team and testing
     */
    ADMIN: {
        limit: 1000,
        window: 60,
        description: 'Admin/Internal - 1000 requests per minute',
    }
};

/**
 * Get rate limit config for a user's subscription tier
 * Falls back to FREE tier if tier not found
 */
export function getRateLimitConfig(tier?: string): RateLimitTier {
    const userTier = tier?.toUpperCase() || 'FREE';
    return RATE_LIMIT_TIERS[userTier] || RATE_LIMIT_TIERS.FREE;
}

/**
 * Get tier by request limit (for display/admin)
 */
export function getTierByLimit(limit: number): string {
    for (const [tierName, config] of Object.entries(RATE_LIMIT_TIERS)) {
        if (config.limit === limit) {
            return tierName;
        }
    }
    return 'CUSTOM';
}

/**
 * Calculate if user needs upgrade based on usage
 */
export function shouldUpgrade(currentTier: string, requestsInWindow: number): boolean {
    const config = getRateLimitConfig(currentTier);
    const usagePercent = (requestsInWindow / config.limit) * 100;
    
    // Suggest upgrade if user consistently uses 80%+ of their limit
    return usagePercent >= 80;
}
