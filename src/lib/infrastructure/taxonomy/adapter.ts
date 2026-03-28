/**
 * Offering Taxonomy Adapter — Reads existing MenuList data
 *
 * Bridge between existing MenuList data structures and the taxonomy system.
 * Reads from existing project/store data WITHOUT modifying it.
 *
 * Used by:
 * - Business Entity Index builder (Phase 2) to compute standardCategories
 * - Future: AI extraction pipeline to suggest standard categories
 *
 * @see __docs__/discovery-infrastructure/taxonomy-system.md
 */

import type { TaxonomyMatchResult, DietaryMatchResult } from './types';
import {
    matchCategoryToTaxonomy,
    matchAllCategories,
    matchDietaryTags,
    extractStandardCategoryIds,
} from './matcher';

// ═══════════════════════════════════════════════════════════════
// PROJECT DATA ADAPTER
// ═══════════════════════════════════════════════════════════════

/**
 * Extract taxonomy-enriched data from a project's extracted data.
 *
 * Reads existing project files and produces:
 * - Standard category IDs for all categories
 * - Standard dietary tags for all items
 * - Top items (by name) for the discovery index
 *
 * This function is READ-ONLY — does not modify the project data.
 *
 * @param projectFiles - The project.files array
 * @param businessCategory - The store's business category (e.g., 'food', 'service')
 * @param primaryLanguage - Primary language code (default: 'en')
 */
export function extractTaxonomyFromProject(
    projectFiles: any[],
    businessCategory: string,
    primaryLanguage: string = 'en',
): ProjectTaxonomyResult {
    if (!projectFiles || !Array.isArray(projectFiles)) {
        return {
            standardCategoryIds: [],
            categoryMatches: {},
            allDietaryTags: [],
            topItems: [],
            totalItems: 0,
            totalCategories: 0,
        };
    }

    // Collect all categories and items from all active files
    const allCategories: Array<{ id: string; name: Record<string, string> }> = [];
    const allItems: Array<{ name: Record<string, string>; tags?: string[]; price?: string; category: string }> = [];

    for (const file of projectFiles) {
        if (file.active === false || file.deleted) continue;
        const data = file.extractedData?.data;
        if (!data) continue;

        if (Array.isArray(data.categories)) {
            for (const cat of data.categories) {
                if (cat.active !== false) {
                    allCategories.push({ id: cat.id, name: cat.name || {} });
                }
            }
        }

        if (Array.isArray(data.items)) {
            for (const item of data.items) {
                if (item.active !== false) {
                    allItems.push({
                        name: item.name || {},
                        tags: item.tags,
                        price: item.price,
                        category: item.category,
                    });
                }
            }
        }
    }

    // Match categories to taxonomy
    const categoryMatches = matchAllCategories(allCategories, businessCategory, primaryLanguage);
    const standardCategoryIds = extractStandardCategoryIds(categoryMatches);

    // Collect all dietary tags from items
    const allTagsSet = new Set<string>();
    for (const item of allItems) {
        if (item.tags) {
            const result = matchDietaryTags(item.tags);
            result.matchedTags.forEach(t => allTagsSet.add(t));
        }
    }

    // Extract top items (first 10 by name, for discovery index summary)
    const topItems = allItems
        .slice(0, 10)
        .map(item => ({
            name: item.name?.[primaryLanguage] || item.name?.['en'] || '',
            price: item.price || '',
        }))
        .filter(item => item.name.length > 0);

    return {
        standardCategoryIds,
        categoryMatches,
        allDietaryTags: Array.from(allTagsSet),
        topItems,
        totalItems: allItems.length,
        totalCategories: allCategories.length,
    };
}

// ═══════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Result of taxonomy extraction from a project.
 * Contains only derived/computed data — no mutations to original data.
 */
export interface ProjectTaxonomyResult {
    /** Standard taxonomy category IDs matched from free-text categories */
    standardCategoryIds: string[];
    /** Per-category match results */
    categoryMatches: Record<string, TaxonomyMatchResult>;
    /** All unique dietary tag IDs found across items */
    allDietaryTags: string[];
    /** Top items summary (name + price) for discovery index */
    topItems: Array<{ name: string; price: string }>;
    /** Total active items in the project */
    totalItems: number;
    /** Total active categories in the project */
    totalCategories: number;
}
