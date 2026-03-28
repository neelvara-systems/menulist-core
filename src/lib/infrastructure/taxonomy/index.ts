/**
 * Offering Taxonomy System — Barrel Exports
 *
 * Standard category and classification vocabulary for cross-business discovery.
 * Part of MenuList Infrastructure Layer (Phase 1A).
 *
 * @see __docs__/discovery-infrastructure/taxonomy-system.md
 */

// Types
export type {
    DietaryMatchResult,
    OfferingTag,
    OfferingTagMatchResult, TaxonomyCategory,
    TaxonomyCuisine,
    TaxonomyDietaryTag,
    TaxonomyMatchResult
} from './types';

// Registry (static data loaders)
export {
    getAllCuisines, getAllDietaryTags, getAllOfferingTags, getAllTaxonomyCategories, getCuisineById, getDietaryTagById, getOfferingTagById, getOfferingTagsForCategory, getTaxonomyCategories, getTaxonomyCategoryById
} from './registry';

// Matcher (free-text → taxonomy mapping)
export {
    extractStandardCategoryIds, matchAllCategories, matchCategoryToTaxonomy, matchDietaryTags
} from './matcher';

// Adapter (reads existing MenuList data)
export {
    extractTaxonomyFromProject
} from './adapter';
export type { ProjectTaxonomyResult } from './adapter';

