/**
 * Offering Taxonomy Matcher — Free-text → Taxonomy Mapping
 *
 * Pure functions that match free-text category names, item tags, and descriptions
 * to standard taxonomy entries using alias matching.
 *
 * No side effects, no Firebase calls, no state mutation.
 * Safe to call from any context (client, server, Cloud Function).
 *
 * @see __docs__/discovery-infrastructure/taxonomy-system.md
 */

import type {
    DietaryMatchResult,
    TaxonomyCategory,
    TaxonomyDietaryTag,
    TaxonomyMatchResult,
} from './types';
import {
    getAllDietaryTags,
    getTaxonomyCategories,
} from './registry';

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY MATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Match a free-text category name to the standard taxonomy.
 *
 * Algorithm:
 * 1. Exact alias match (case-insensitive, trimmed)
 * 2. Substring match (category name contains alias or vice versa)
 * 3. No match → return null
 *
 * @param categoryName - Free-text category name (any language key, typically 'en')
 * @param businessCategory - Business category from store (e.g., 'food', 'service')
 * @returns TaxonomyMatchResult with matched ID and confidence
 */
export function matchCategoryToTaxonomy(
    categoryName: string,
    businessCategory: string,
): TaxonomyMatchResult {
    if (!categoryName || !businessCategory) {
        return { taxonomyCategoryId: null, matchType: null };
    }

    const normalizedInput = normalize(categoryName);
    const taxonomyCategories = getTaxonomyCategories(businessCategory);

    if (taxonomyCategories.length === 0) {
        return { taxonomyCategoryId: null, matchType: null };
    }

    // Step 1: Exact alias match
    for (const cat of taxonomyCategories) {
        for (const alias of cat.aliases) {
            if (normalize(alias) === normalizedInput) {
                return {
                    taxonomyCategoryId: cat.id,
                    matchType: 'exact',
                    canonicalLabel: cat.label,
                };
            }
        }
    }

    // Step 2: Fuzzy match — input contains alias or alias contains input
    for (const cat of taxonomyCategories) {
        for (const alias of cat.aliases) {
            const normalizedAlias = normalize(alias);
            if (
                normalizedInput.includes(normalizedAlias) ||
                normalizedAlias.includes(normalizedInput)
            ) {
                // Only match if the overlap is meaningful (>3 chars)
                if (normalizedAlias.length >= 3 && normalizedInput.length >= 3) {
                    return {
                        taxonomyCategoryId: cat.id,
                        matchType: 'fuzzy',
                        canonicalLabel: cat.label,
                    };
                }
            }
        }
    }

    // No match
    return { taxonomyCategoryId: null, matchType: null };
}

/**
 * Match all categories in a project to the taxonomy.
 * Returns a map of categoryId → TaxonomyMatchResult.
 */
export function matchAllCategories(
    categories: Array<{ id: string; name: Record<string, string> }>,
    businessCategory: string,
    primaryLanguage: string = 'en',
): Record<string, TaxonomyMatchResult> {
    const results: Record<string, TaxonomyMatchResult> = {};

    for (const cat of categories) {
        const name = cat.name?.[primaryLanguage] || cat.name?.['en'] || '';
        results[cat.id] = matchCategoryToTaxonomy(name, businessCategory);
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
// DIETARY TAG MATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Match free-text item tags to standard dietary taxonomy.
 *
 * @param tags - Free-text tags array from ExtractedDataItem.tags
 * @returns DietaryMatchResult with matched and unmatched tags
 */
export function matchDietaryTags(tags: string[]): DietaryMatchResult {
    if (!tags || tags.length === 0) {
        return { matchedTags: [], unmatchedTags: [] };
    }

    const allDietaryTags = getAllDietaryTags();
    const matchedTags: string[] = [];
    const unmatchedTags: string[] = [];

    for (const tag of tags) {
        const normalizedTag = normalize(tag);
        let matched = false;

        for (const dietaryTag of allDietaryTags) {
            for (const alias of dietaryTag.aliases) {
                if (normalize(alias) === normalizedTag) {
                    if (!matchedTags.includes(dietaryTag.id)) {
                        matchedTags.push(dietaryTag.id);
                    }
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }

        if (!matched) {
            unmatchedTags.push(tag);
        }
    }

    return { matchedTags, unmatchedTags };
}

// ═══════════════════════════════════════════════════════════════
// BATCH HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract all unique standard category IDs from a set of matched categories.
 * Useful for building the business entity index.
 */
export function extractStandardCategoryIds(
    matchResults: Record<string, TaxonomyMatchResult>,
): string[] {
    const ids = new Set<string>();
    for (const result of Object.values(matchResults)) {
        if (result.taxonomyCategoryId) {
            ids.add(result.taxonomyCategoryId);
        }
    }
    return Array.from(ids);
}
