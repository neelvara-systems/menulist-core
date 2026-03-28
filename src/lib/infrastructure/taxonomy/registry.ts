/**
 * Offering Taxonomy Registry — Static Data Loaders
 *
 * Loads standard category, dietary, and cuisine taxonomies from JSON data files.
 * Provides lookup functions for accessing taxonomy entries by ID or business category.
 *
 * All data is static — loaded once, cached in module scope.
 * Zero Firebase cost.
 *
 * @see __docs__/discovery-infrastructure/taxonomy-system.md
 */

import type { OfferingTag, TaxonomyCategory, TaxonomyCuisine, TaxonomyDietaryTag } from './types';

import categoriesData from './data/categories.json';
import cuisinesData from './data/cuisines.json';
import dietaryTagsData from './data/dietaryTags.json';
import offeringTagsData from './data/offeringTags.json';

// ═══════════════════════════════════════════════════════════════
// CATEGORY REGISTRY
// ═══════════════════════════════════════════════════════════════

type CategoriesDataMap = Record<string, Array<{ id: string; label: string; aliases: string[]; sortOrder: number }>>;

const categoriesMap = categoriesData as CategoriesDataMap;

/**
 * Get standard taxonomy categories for a given business category.
 * Returns empty array if business category has no taxonomy defined.
 */
export function getTaxonomyCategories(businessCategory: string): TaxonomyCategory[] {
    const raw = categoriesMap[businessCategory];
    if (!raw) return [];

    return raw.map(entry => ({
        ...entry,
        businessCategory,
    }));
}

/**
 * Get all taxonomy categories across all business categories.
 */
export function getAllTaxonomyCategories(): TaxonomyCategory[] {
    const all: TaxonomyCategory[] = [];
    for (const [businessCategory, entries] of Object.entries(categoriesMap)) {
        for (const entry of entries) {
            all.push({ ...entry, businessCategory });
        }
    }
    return all;
}

/**
 * Look up a taxonomy category by its ID.
 */
export function getTaxonomyCategoryById(categoryId: string): TaxonomyCategory | undefined {
    for (const [businessCategory, entries] of Object.entries(categoriesMap)) {
        const found = entries.find(e => e.id === categoryId);
        if (found) return { ...found, businessCategory };
    }
    return undefined;
}

// ═══════════════════════════════════════════════════════════════
// DIETARY TAG REGISTRY
// ═══════════════════════════════════════════════════════════════

const dietaryTags = dietaryTagsData as TaxonomyDietaryTag[];

/**
 * Get all standard dietary tags.
 */
export function getAllDietaryTags(): TaxonomyDietaryTag[] {
    return dietaryTags;
}

/**
 * Look up a dietary tag by its ID.
 */
export function getDietaryTagById(tagId: string): TaxonomyDietaryTag | undefined {
    return dietaryTags.find(t => t.id === tagId);
}

// ═══════════════════════════════════════════════════════════════
// CUISINE REGISTRY
// ═══════════════════════════════════════════════════════════════

const cuisines = cuisinesData as TaxonomyCuisine[];

/**
 * Get all standard cuisine types.
 */
export function getAllCuisines(): TaxonomyCuisine[] {
    return cuisines;
}

/**
 * Look up a cuisine type by its ID.
 */
export function getCuisineById(cuisineId: string): TaxonomyCuisine | undefined {
    return cuisines.find(c => c.id === cuisineId);
}

// ═══════════════════════════════════════════════════════════════
// OFFERING TAG REGISTRY (SMB-Universal)
// ═══════════════════════════════════════════════════════════════

const offeringTags = (offeringTagsData as any).tags as OfferingTag[];

/**
 * Get all offering tags.
 */
export function getAllOfferingTags(): OfferingTag[] {
    return offeringTags;
}

/**
 * Get offering tags scoped to a specific business category.
 * Returns tags where scope includes the category OR scope is ['*'].
 */
export function getOfferingTagsForCategory(businessCategory: string): OfferingTag[] {
    return offeringTags.filter(t =>
        t.scope.includes('*') || t.scope.includes(businessCategory)
    );
}

/**
 * Look up an offering tag by its ID.
 */
export function getOfferingTagById(tagId: string): OfferingTag | undefined {
    return offeringTags.find(t => t.id === tagId);
}
