/**
 * SHARED SCORE NORMALIZER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Extracted from decisionBlocksScoring.ts for reuse by:
 * - Decision Blocks scoring
 * - Continuous Menu Intelligence
 * 
 * Common scoring utilities and weights.
 */

export const WEIGHTS = {
    popular: {
        views: 0.4,
        clicks: 0.3,
        orders: 0.2,
        ownerBoost: 0.1
    },
    quickPick: {
        duration: 0.6,
        popularity: 0.3,
        ownerBoost: 0.1
    },
    bestValue: {
        valueRatio: 0.7,
        ownerBoost: 0.1,
        popularity: 0.2
    }
};

export const QUICK_PICK_THRESHOLDS: Record<string, number> = {
    'food': 10,
    'service': 20,
    'health': 30,
    'retail': 0,
    'professional': 30,
    'creative': 45,
    'specialty': 30,
    'default': 15
};

export const DEFAULT_DURATIONS: Record<string, number> = {
    'food': 15,
    'service': 30,
    'health': 45,
    'retail': 0,
    'professional': 60,
    'creative': 60,
    'specialty': 30,
    'default': 15
};

/**
 * Normalize a value to 0-100 scale
 */
export function normalize(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.min(100, (value / max) * 100);
}

/**
 * Normalize owner boost from -20 to +20 range to 0-100 scale
 */
export function normalizeOwnerBoost(boost: number | undefined): number {
    const value = boost || 0;
    return ((value + 20) / 40) * 100;
}

/**
 * Calculate engagement rate (clicks / views)
 */
export function calculateEngagementRate(clicks: number, views: number): number {
    if (views === 0) return 0;
    return clicks / views;
}

/**
 * Calculate popularity score (weighted combination)
 */
export function calculatePopularity(views: number, clicks: number, orders: number): number {
    return views + clicks * 2 + orders * 5;
}
