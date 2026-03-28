/**
 * Offering Taxonomy System — Types
 *
 * Standard category and classification vocabulary for cross-business discovery.
 * Part of MenuList Infrastructure Layer (Phase 1A).
 *
 * @see __docs__/discovery-infrastructure/taxonomy-system.md
 */

/**
 * Standard category in the offering taxonomy.
 * Maps free-text category names to canonical IDs for cross-business queries.
 */
export interface TaxonomyCategory {
    /** Canonical ID, e.g. 'food_starters', 'service_haircut' */
    id: string;
    /** English canonical label, e.g. 'Starters' */
    label: string;
    /** Known aliases/variations for fuzzy matching */
    aliases: string[];
    /** Parent category ID for hierarchy (optional) */
    parentId?: string;
    /** Which business category this belongs to (from BUSINESS_CATEGORIES) */
    businessCategory: string;
    /** Default display order */
    sortOrder: number;
}

/**
 * Standard dietary tag with controlled vocabulary.
 * Replaces free-text tags like ["Vegetarian"] with structured enum.
 */
export interface TaxonomyDietaryTag {
    /** Canonical ID, e.g. 'vegetarian', 'halal' */
    id: string;
    /** English canonical label, e.g. 'Vegetarian' */
    label: string;
    /** Known aliases for fuzzy matching */
    aliases: string[];
    /** Schema.org suitableForDiet value (if applicable) */
    schemaOrg?: string;
}

/**
 * Standard cuisine type (primarily for food businesses).
 */
export interface TaxonomyCuisine {
    /** Canonical ID, e.g. 'indian', 'italian' */
    id: string;
    /** English canonical label, e.g. 'Indian' */
    label: string;
    /** Known aliases for fuzzy matching */
    aliases: string[];
}

/**
 * Result of matching a free-text category name to the taxonomy.
 */
export interface TaxonomyMatchResult {
    /** Matched taxonomy category ID, or null if no match */
    taxonomyCategoryId: string | null;
    /** Confidence: 'exact' (alias match), 'fuzzy' (partial), null (no match) */
    matchType: 'exact' | 'fuzzy' | null;
    /** The canonical label if matched */
    canonicalLabel?: string;
}

/**
 * SMB-universal offering tag.
 * Covers dietary (food), audience (service/retail), level (health/creative),
 * and universal tags (popular, new, premium) across all business categories.
 */
export interface OfferingTag {
    /** Canonical ID, e.g. 'vegetarian', 'for_men', 'beginner', 'popular' */
    id: string;
    /** English canonical label */
    label: string;
    /** Known aliases for fuzzy matching */
    aliases: string[];
    /** Which business categories this tag applies to. ['*'] = all */
    scope: string[];
    /** Schema.org mapping (if applicable) */
    schemaOrg?: string;
}

/**
 * Result of matching free-text tags to dietary taxonomy.
 */
export interface DietaryMatchResult {
    /** Matched dietary tag IDs */
    matchedTags: string[];
    /** Original tags that didn't match any taxonomy entry */
    unmatchedTags: string[];
}

/**
 * Result of matching free-text tags to universal offering tags.
 */
export interface OfferingTagMatchResult {
    /** Matched offering tag IDs (scoped to business category) */
    matchedTags: string[];
    /** Original tags that didn't match */
    unmatchedTags: string[];
}
