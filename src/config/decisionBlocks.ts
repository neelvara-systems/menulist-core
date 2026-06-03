/**
 * Decision Blocks Configuration
 * 
 * Configures the three Decision Blocks:
 * - ⭐ Popular Right Now: Most ordered/viewed items
 * - ⚡ Quick Pick: Fast to prepare/deliver items (disabled for some verticals)
 * - 💰 Best Value: High popularity relative to price
 * 
 * Labels and defaults are customized per business category.
 * 
 * NOTE: All *_LABELS objects define all 3 block types for type safety,
 * even if some blocks are disabled for that category (via enabledBlocks).
 */

import { resolveBusinessCategory } from '@constant/common';

// ============================================
// TYPES
// ============================================

export type DecisionBlockType = 'popular' | 'quickPick' | 'bestValue';

export interface DecisionBlockLabels {
    title: string;           // Block title (e.g., "Popular Right Now")
    subtitle: string;        // Short description
    icon: string;            // Emoji icon
    reasonPrefix: string;    // DEPRECATED: Not currently used. Kept for potential future use.
}

export interface DurationConfig {
    default: number;         // Default duration in minutes if not set
    quickThreshold: number;  // Max duration to qualify for Quick Pick
    unit: string;            // Display unit (e.g., "min", "mins")
    label: string;           // Label for owner UI (e.g., "Prep time", "Service duration")
}

export interface CategoryDecisionConfig {
    labels: Record<DecisionBlockType, DecisionBlockLabels>;
    duration: DurationConfig;
    enabledBlocks: DecisionBlockType[];  // Which blocks to show for this category
}

// ============================================
// BLOCK LABELS BY BUSINESS CATEGORY
// ============================================

// P2.5 + P2.6: Softened labels, removed emojis (Authority refinement)
const FOOD_LABELS: Record<DecisionBlockType, DecisionBlockLabels> = {
    popular: {
        title: 'People often choose',
        subtitle: "A favorite here",
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Most ordered',
    },
    quickPick: {
        title: 'Ready quickly',
        subtitle: 'Fast to prepare',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Ready in',
    },
    bestValue: {
        title: 'Good value',
        subtitle: 'Worth it',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Great value',
    },
};

// P2.5 + P2.6: Softened labels, removed emojis
const SERVICE_LABELS: Record<DecisionBlockType, DecisionBlockLabels> = {
    popular: {
        title: 'Clients often book',
        subtitle: "A favorite here",
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Top choice',
    },
    quickPick: {
        title: 'Quick session',
        subtitle: 'Shorter duration',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Done in',
    },
    bestValue: {
        title: 'Good value',
        subtitle: 'Worth it',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Great value',
    },
};

// P2.5 + P2.6: Softened labels, removed emojis
const RETAIL_LABELS: Record<DecisionBlockType, DecisionBlockLabels> = {
    popular: {
        title: 'Customers often choose',
        subtitle: "A favorite here",
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Best seller',
    },
    quickPick: {
        title: 'Easy choice',
        subtitle: 'Simple pick',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Quick grab',
    },
    bestValue: {
        title: 'Good value',
        subtitle: 'Worth it',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Value pick',
    },
};

// P2.5 + P2.6: Softened labels, removed emojis
const HEALTH_LABELS: Record<DecisionBlockType, DecisionBlockLabels> = {
    popular: {
        title: 'Clients often book',
        subtitle: "A favorite here",
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Top rated',
    },
    // NOTE: Quick Pick is DISABLED for Health (speed ≠ desirability in healthcare)
    // Labels defined for type safety only - never displayed
    quickPick: {
        title: 'Express session',
        subtitle: 'Quick wellness',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Just',
    },
    bestValue: {
        title: 'Good value',
        subtitle: 'Worth the investment',
        icon: '', // P2.6: Removed emoji
        reasonPrefix: 'Great value',
    },
};

// ============================================
// DURATION DEFAULTS BY BUSINESS CATEGORY
// ============================================

const DURATION_CONFIGS: Record<string, DurationConfig> = {
    food: {
        default: 15,          // 15 min default prep time
        quickThreshold: 10,   // Quick Pick if <= 10 min
        unit: 'min',
        label: 'Prep time',
    },
    service: {
        default: 30,          // 30 min default service
        quickThreshold: 20,   // Quick Pick if <= 20 min
        unit: 'min',
        label: 'Duration',
    },
    retail: {
        default: 0,           // Instant (no prep)
        quickThreshold: 5,    // Quick Pick if <= 5 min (assembly/packaging)
        unit: 'min',
        label: 'Ready time',
    },
    health: {
        default: 45,          // 45 min default session
        quickThreshold: 30,   // Quick Pick if <= 30 min
        unit: 'min',
        label: 'Session duration',
    },
    professional: {
        default: 60,          // 60 min default consultation
        quickThreshold: 30,   // Quick Pick if <= 30 min
        unit: 'min',
        label: 'Duration',
    },
    creative: {
        default: 45,          // 45 min default
        quickThreshold: 30,   // Quick Pick if <= 30 min
        unit: 'min',
        label: 'Duration',
    },
    specialty: {
        default: 30,          // 30 min default
        quickThreshold: 20,   // Quick Pick if <= 20 min
        unit: 'min',
        label: 'Duration',
    },
};

// ============================================
// CATEGORY CONFIGURATIONS
// ============================================

const CATEGORY_CONFIGS: Record<string, CategoryDecisionConfig> = {
    food: {
        labels: FOOD_LABELS,
        duration: DURATION_CONFIGS.food,
        enabledBlocks: ['popular', 'quickPick', 'bestValue'],
    },
    service: {
        labels: SERVICE_LABELS,
        duration: DURATION_CONFIGS.service,
        enabledBlocks: ['popular', 'quickPick', 'bestValue'],
    },
    retail: {
        labels: RETAIL_LABELS,
        duration: DURATION_CONFIGS.retail,
        enabledBlocks: ['popular', 'bestValue'],  // No Quick Pick for retail (instant)
    },
    health: {
        labels: HEALTH_LABELS,
        duration: DURATION_CONFIGS.health,
        // Quick Pick disabled for Health - speed ≠ desirability in healthcare contexts
        // Patients optimize for reassurance and quality, not minutes
        enabledBlocks: ['popular', 'bestValue'],
    },
    professional: {
        labels: SERVICE_LABELS,
        duration: DURATION_CONFIGS.professional,
        enabledBlocks: ['popular', 'bestValue'],  // Professional services usually not "quick"
    },
    creative: {
        labels: SERVICE_LABELS,
        duration: DURATION_CONFIGS.creative,
        enabledBlocks: ['popular', 'bestValue'],
    },
    specialty: {
        labels: SERVICE_LABELS,
        duration: DURATION_CONFIGS.specialty,
        enabledBlocks: ['popular', 'quickPick', 'bestValue'],
    },
};

// Default config (fallback)
// NOTE: Assumes food-style business unless category is resolved
// Food is the most common SMB vertical, so this is a reasonable default
const DEFAULT_CONFIG: CategoryDecisionConfig = {
    labels: FOOD_LABELS,
    duration: DURATION_CONFIGS.food,
    enabledBlocks: ['popular', 'quickPick', 'bestValue'],
};

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Get decision block configuration for a business type
 */
export function getDecisionConfig(businessType?: string, businessCategory?: string): CategoryDecisionConfig {
    const category = resolveBusinessCategory(businessType, businessCategory);
    if (category && CATEGORY_CONFIGS[category]) {
        return CATEGORY_CONFIGS[category];
    }
    return DEFAULT_CONFIG;
}

/**
 * Get duration configuration for a business type
 */
export function getDurationConfig(businessType?: string, businessCategory?: string): DurationConfig {
    return getDecisionConfig(businessType, businessCategory).duration;
}

/**
 * Get labels for a specific block type
 * Returns null if the block is not enabled for this business type
 */
export function getBlockLabels(blockType: DecisionBlockType, businessType?: string, businessCategory?: string): DecisionBlockLabels | null {
    const config = getDecisionConfig(businessType, businessCategory);
    if (!config.enabledBlocks.includes(blockType)) return null;
    return config.labels[blockType];
}

/**
 * Get enabled blocks for a business type
 */
export function getEnabledBlocks(businessType?: string, businessCategory?: string): DecisionBlockType[] {
    return getDecisionConfig(businessType, businessCategory).enabledBlocks;
}

/**
 * Check if an item qualifies for Quick Pick based on duration
 * Returns false if Quick Pick is disabled for this business type
 */
export function isQuickPickEligible(duration: number | undefined, businessType?: string, businessCategory?: string): boolean {
    // First check if Quick Pick is even enabled for this category
    const enabledBlocks = getEnabledBlocks(businessType, businessCategory);
    if (!enabledBlocks.includes('quickPick')) return false;

    const config = getDurationConfig(businessType, businessCategory);
    const itemDuration = duration ?? config.default;
    return itemDuration <= config.quickThreshold;
}

/**
 * Get effective duration for an item (falls back to category default)
 */
export function getEffectiveDuration(duration: number | undefined, businessType?: string, businessCategory?: string): number {
    if (duration !== undefined && duration >= 0) {
        return duration;
    }
    return getDurationConfig(businessType, businessCategory).default;
}

/**
 * Format duration for display
 */
export function formatDuration(duration: number, businessType?: string, businessCategory?: string): string {
    const config = getDurationConfig(businessType, businessCategory);
    if (duration === 0) {
        return 'Instant';
    }
    if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return mins > 0 ? `${hours}h ${mins}${config.unit}` : `${hours}h`;
    }
    return `${duration} ${config.unit}`;
}

// ============================================
// i18n REASON KEYS
// ============================================

/**
 * Reason keys for Decision Blocks
 * 
 * FORMAT: decision.{blockType}.{category}.{reasonType}
 * 
 * These keys are:
 * 1. Generated by Cloud Function at night
 * 2. Stored in Firestore as DecisionBlockEntry.reason
 * 3. Translated at runtime by client using next-intl
 * 
 * IMPORTANT: Keep in sync with locale files:
 * - public/locales/menulist.ai/en.json
 * - public/locales/menulist.ai/hi.json
 */
export const DECISION_REASON_KEYS = {
    // ⭐ Popular Block Reasons
    popular: {
        food: {
            favorite: 'decision.popular.food.favorite',           // "Customer favorite"
            trending: 'decision.popular.food.trending',           // "Trending this week"
            mostOrdered: 'decision.popular.food.mostOrdered',     // "Most ordered"
        },
        service: {
            mostBooked: 'decision.popular.service.mostBooked',    // "Most booked"
            topChoice: 'decision.popular.service.topChoice',      // "Top choice"
            clientFavorite: 'decision.popular.service.clientFavorite', // "Client favorite"
        },
        retail: {
            bestSeller: 'decision.popular.retail.bestSeller',     // "Best seller"
            trending: 'decision.popular.retail.trending',         // "Trending now"
            customerLove: 'decision.popular.retail.customerLove', // "Customers love this"
        },
        health: {
            topRated: 'decision.popular.health.topRated',         // "Top rated"
            clientFavorite: 'decision.popular.health.clientFavorite', // "Client favorite"
        },
        default: {
            popular: 'decision.popular.default.popular',          // "Popular choice"
            favorite: 'decision.popular.default.favorite',        // "Customer favorite"
        },
    },

    // ⚡ Quick Pick Block Reasons (with {minutes} interpolation)
    quickPick: {
        food: {
            readyIn: 'decision.quickPick.food.readyIn',           // "Ready in {minutes} min"
            instant: 'decision.quickPick.food.instant',           // "Ready instantly"
        },
        service: {
            express: 'decision.quickPick.service.express',        // "Express {minutes} min"
            quick: 'decision.quickPick.service.quick',            // "Quick {minutes} min session"
        },
        health: {
            express: 'decision.quickPick.health.express',         // "Express {minutes} min session"
        },
        default: {
            ready: 'decision.quickPick.default.ready',            // "Ready in {minutes} min"
            instant: 'decision.quickPick.default.instant',        // "Ready instantly"
        },
    },

    // 💰 Best Value Block Reasons
    bestValue: {
        food: {
            greatValue: 'decision.bestValue.food.greatValue',     // "Great value"
            worthIt: 'decision.bestValue.food.worthIt',           // "Worth every bite"
        },
        service: {
            greatValue: 'decision.bestValue.service.greatValue',  // "Great value"
            worthIt: 'decision.bestValue.service.worthIt',        // "Worth every penny"
        },
        retail: {
            bestDeal: 'decision.bestValue.retail.bestDeal',       // "Best deal"
            smartChoice: 'decision.bestValue.retail.smartChoice', // "Smart choice"
        },
        health: {
            worthInvestment: 'decision.bestValue.health.worthInvestment', // "Worth the investment"
        },
        default: {
            greatValue: 'decision.bestValue.default.greatValue',  // "Great value"
        },
    },

    // 📌 Owner Pin (universal - no category)
    pinned: {
        ownerPick: 'decision.pinned.ownerPick',                   // "Owner's choice"
    },
} as const;

/**
 * Get the appropriate reason key for a block type and category
 */
export function getReasonKey(
    blockType: DecisionBlockType,
    reasonType: string,
    businessType?: string,
    businessCategory?: string,
): string {
    const category = resolveBusinessCategory(businessType, businessCategory) || 'default';
    const blockReasons = DECISION_REASON_KEYS[blockType] as Record<string, Record<string, string>>;

    // Try category-specific key first
    const categoryReasons = blockReasons[category] || blockReasons['default'];
    if (categoryReasons && categoryReasons[reasonType]) {
        return categoryReasons[reasonType];
    }

    // Fallback to default
    const defaultReasons = blockReasons['default'];
    return defaultReasons?.[reasonType] || `decision.${blockType}.default.${reasonType}`;
}

// ============================================
// TRANSLATIONS (Re-exported from data file)
// ============================================

// Translations moved to src/data/decisionBlockTranslations.ts for easier maintenance
export { getDecisionBlockTranslation } from '@data/decisionBlockTranslations';
