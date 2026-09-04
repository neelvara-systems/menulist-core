/**
 * Comparison Engine Types
 * 
 * Spec Reference: ai-extraction-integration.md Part 4D
 * 
 * Types for client-side comparison of extracted data against existing project data.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE MODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comparison mode determines how extracted data is matched and what writes are allowed
 */
export type ComparisonMode = 'SINGLE_STORE' | 'MASTER_PROJECT' | 'OUTLET_LINKED';

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalized extracted category from AI
 */
export interface ExtractedCategoryInput {
    id: string;
    name: Record<string, string>;
    icon?: string;
    orderIndex?: number;
    sourceFileIndex?: number;
}

/**
 * Normalized extracted item from AI
 */
export interface ExtractedItemInput {
    id: string;
    name: Record<string, string>;
    categoryId: string;
    categoryName: string; // Resolved category name for matching
    price?: string;
    description?: Record<string, string>;
    imageUrl?: string;
    attributes?: Array<{
        id: string;
        name: Record<string, string>;
        price?: string;
        active?: boolean;
    }>;
    tags?: string[];
    dietaryTags?: string[];
    spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
    duration?: number;
    sourceFileIndex?: number;
}

/**
 * Existing category in project
 */
export interface ExistingCategory {
    id: string;
    name: Record<string, string>;
    icon?: string;
    orderIndex?: number;
    active?: boolean;
    fileUid?: string; // Which file this category belongs to
    extractionIdAliases?: string[]; // Prior/new extraction IDs that resolve to this stable category ID
}

/**
 * Existing item in project
 */
export interface ExistingItem {
    id: string;
    name: Record<string, string>;
    category: string; // categoryId
    price?: string;
    description?: Record<string, string>;
    image?: string;
    available?: boolean;
    active?: boolean;
    attributes?: Array<{
        id: string;
        name: Record<string, string>;
        price?: string;
        active?: boolean;
    }>;
    tags?: string[];
    dietaryTags?: string[];
    spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
    duration?: number;
    fileUid?: string; // Which file this item belongs to
    extractionIdAliases?: string[]; // Prior/new extraction IDs that resolve to this stable item ID
}

export interface StableIdAliases {
    categoryAliases: Array<{
        categoryId: string;
        extractedCategoryId: string;
        targetFileUid: string;
    }>;
    itemAliases: Array<{
        itemId: string;
        extractedItemId: string;
        targetFileUid: string;
    }>;
}

/**
 * Item override (for outlet projects)
 */
export interface ItemOverride {
    itemId?: string;
    price?: string;
    available?: boolean;
    active?: boolean;
    orderIndex?: number;
    isBestSeller?: boolean;
}

/**
 * Category override (for outlet projects)
 */
export interface CategoryOverride {
    categoryId?: string;
    orderIndex?: number;
    active?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE INPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for matching thresholds
 */
export interface MatchConfig {
    /** Minimum similarity score for a match (default: 0.95) */
    similarityThreshold?: number;
    /** Threshold below which a warning is shown (default: 0.98) */
    weakMatchThreshold?: number;
}

/**
 * Complete input to comparison engine
 */
export interface ComparisonEngineInput {
    mode: ComparisonMode;

    /** Extracted data from AI */
    extracted: {
        categories: ExtractedCategoryInput[];
        items: ExtractedItemInput[];
    };

    /** Current store project state */
    storeProject: {
        categories: ExistingCategory[];
        items: ExistingItem[];
        overrides?: {
            items?: Record<string, ItemOverride>;
            categories?: Record<string, CategoryOverride>;
        };
    };

    /** Master project data (only required for OUTLET_LINKED mode) */
    masterProject?: {
        categories: ExistingCategory[];
        items: ExistingItem[];
    };

    /** Primary language for name comparison */
    primaryLang?: string;

    /** Matching configuration */
    matchConfig?: MatchConfig;

    /** File mappings for ID transformation */
    fileMappings?: Array<{ uid: string; index: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES - PREVIEW ROWS
// ═══════════════════════════════════════════════════════════════════════════

export type DiffEntityType = 'CATEGORY' | 'ITEM';
export type DiffChangeType = 'NEW' | 'UPDATE' | 'OVERRIDE' | 'IGNORE' | 'WARNING';

/**
 * Preview row for a category change
 */
export interface PreviewCategoryRow {
    changeType: 'NEW' | 'UPDATE';
    extractedCategory: ExtractedCategoryInput;
    existingCategoryId?: string;
    matchScore?: number;
    matchType?: 'exact' | 'strong' | 'weak' | 'no_match';
    changes?: {
        nameChanged?: boolean;
        orderIndexChanged?: boolean;
    };
    warnings?: string[];
    /** Whether this change is approved (default: true) */
    approved: boolean;
    /** For NEW: target file UID where this will be created */
    targetFileUid?: string;
    /** For NEW: generated ID */
    generatedId?: string;
}

/**
 * Preview row for an item change
 */
export interface PreviewItemRow {
    changeType: 'NEW' | 'UPDATE' | 'OVERRIDE';
    extractedItem: ExtractedItemInput;
    existingItemId?: string;
    masterItemId?: string; // For OUTLET_LINKED only
    matchScore?: number;
    matchType?: 'exact' | 'strong' | 'weak' | 'no_match';
    changes?: {
        price?: { from?: string; to?: string };
        description?: { from?: string; to?: string };
        image?: { from?: string; to?: string };
        name?: { from?: string; to?: string };
    };
    /** For OUTLET_LINKED: the override patch to apply */
    overridePatch?: Partial<ItemOverride>;
    warnings?: string[];
    /** Whether this change is approved (default: true) */
    approved: boolean;
    /** For NEW: target file UID where this will be created */
    targetFileUid?: string;
    /** For NEW: generated ID */
    generatedId?: string;
    /** For NEW in OUTLET_LINKED: is this a local-only item? */
    isLocalOnly?: boolean;
    /** Target category ID (resolved from matching) */
    targetCategoryId?: string;
}

/**
 * Warning row for issues that need attention
 */
export interface PreviewWarningRow {
    entityType: DiffEntityType;
    name: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    extractedItem?: ExtractedItemInput;
    extractedCategory?: ExtractedCategoryInput;
}

/**
 * Row for items/categories that were ignored
 */
export interface PreviewIgnoredRow {
    entityType: DiffEntityType;
    name: string;
    reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES - APPLY PLAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Plan for what to write to Firestore on Save
 * 
 * This is built from the preview after user approval.
 */
export interface ApplyPlan {
    mode: ComparisonMode;

    /** For SINGLE_STORE or MASTER_PROJECT: direct project mutations */
    projectMutations?: {
        upsertCategories: Array<{
            categoryId?: string; // Existing ID if update, undefined if new
            newCategory?: ExistingCategory;
            patch?: Partial<ExistingCategory>;
            targetFileUid: string;
        }>;
        upsertItems: Array<{
            itemId?: string; // Existing ID if update, undefined if new
            newItem?: ExistingItem;
            patch?: Partial<ExistingItem>;
            targetFileUid: string;
        }>;
        stableIdAliases?: StableIdAliases;
    };

    /** For OUTLET_LINKED: outlet-specific mutations */
    outletMutations?: {
        /** Local-only categories (L_C_ prefix) */
        upsertLocalCategories: ExistingCategory[];
        /** Local-only items (L_I_ prefix) */
        upsertLocalItems: Array<Partial<ExistingItem> & Pick<ExistingItem, 'id'>>;
        /** Price overrides on master items */
        applyOverrides: Array<{
            masterItemId: string;
            patch: Partial<ItemOverride>;
        }>;
        /** Category overrides (optional) */
        applyCategoryOverrides?: Array<{
            masterCategoryId: string;
            patch: Partial<CategoryOverride>;
        }>;
        stableIdAliases?: StableIdAliases;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES - FINAL OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Statistics from the comparison
 */
export interface ComparisonStats {
    extractedCategories: number;
    extractedItems: number;
    matchedCategories: number;
    matchedItems: number;
    newCategories: number;
    newItems: number;
    updatedCategories: number;
    updatedItems: number;
    overrides: number;
    weakMatches: number;
    invalidPrices: number;
    ignoredDuplicates: number;
}

/**
 * Complete output from comparison engine
 */
export interface ComparisonEngineOutput {
    mode: ComparisonMode;

    /** Preview data for UI display */
    preview: {
        newCategories: PreviewCategoryRow[];
        updatedCategories: PreviewCategoryRow[];
        newItems: PreviewItemRow[];
        updatedItems: PreviewItemRow[];
        /** Price overrides - OUTLET_LINKED mode only */
        overrideSuggestions: PreviewItemRow[];
        /** Warnings that need attention */
        warnings: PreviewWarningRow[];
        /** Items/categories that were ignored */
        ignored: PreviewIgnoredRow[];
        /** Items with no changes */
        unchangedCount: number;
    };

    /** Plan for applying changes (built from approved preview items) */
    applyPlan: ApplyPlan;

    /** Statistics */
    stats: ComparisonStats;

    /** Primary language used for comparison */
    primaryLang: string;

    /** Hidden ID mappings persisted with approved saves to preserve outlet overrides across re-extraction */
    stableIdAliases?: StableIdAliases;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from matching an extracted item
 */
export interface MatchResult {
    matched: boolean;
    existingId?: string;
    score: number;
    matchType: 'exact' | 'strong' | 'weak' | 'no_match';
    isMasterItem?: boolean; // For OUTLET_LINKED: is this a master item?
    isLocalItem?: boolean;  // For OUTLET_LINKED: is this a local-only item?
}

/**
 * Deduplicated extracted items (after removing duplicates within same upload)
 */
export interface DeduplicationResult {
    items: ExtractedItemInput[];
    duplicatesRemoved: PreviewIgnoredRow[];
}

export default {
    // Export type guards and utilities as needed
};
