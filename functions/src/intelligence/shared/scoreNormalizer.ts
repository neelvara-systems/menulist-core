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

import {
    DECISION_BLOCK_DURATION_CONFIGS,
    DECISION_BLOCK_ENABLED_BLOCKS,
    DEFAULT_DECISION_BLOCK_CATEGORY,
} from '../../sharedData/decisionBlockConfig';

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

const QUICK_PICK_THRESHOLDS: Record<string, number> = Object.fromEntries(
    Object.entries(DECISION_BLOCK_DURATION_CONFIGS).map(([category, config]) => [category, config.quickThreshold])
);

export function isQuickPickEnabledForCategory(category: string): boolean {
    const enabledBlocks = DECISION_BLOCK_ENABLED_BLOCKS[category]
        || DECISION_BLOCK_ENABLED_BLOCKS[DEFAULT_DECISION_BLOCK_CATEGORY];
    return enabledBlocks.includes('quickPick');
}

export function getQuickPickThreshold(category: string): number {
    return QUICK_PICK_THRESHOLDS[category]
        ?? QUICK_PICK_THRESHOLDS[DEFAULT_DECISION_BLOCK_CATEGORY];
}

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
