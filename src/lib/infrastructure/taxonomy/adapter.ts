/**
 * Offering Taxonomy Adapter — Reads existing MenuList data
 *
 * Bridge between existing MenuList data structures and the taxonomy system.
 * Reads from existing project/store data WITHOUT modifying it.
 *
 * Used by:
 * - Business Entity Index builder to compute standardCategories
 * - Reserved: AI extraction pipeline suggestions after separate audit
 *
 * @see __docs__/discovery-infrastructure/taxonomy-system.md
 */

import type { TaxonomyMatchResult } from './types';
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
    projectFiles: unknown[],
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

    for (const rawFile of projectFiles) {
        if (!isRecord(rawFile)) continue;
        const file = rawFile;
        if (file.active === false || file.deleted) continue;
        const extractedData = isRecord(file.extractedData) ? file.extractedData : null;
        const data = extractedData && isRecord(extractedData.data) ? extractedData.data : null;
        if (!data) continue;

        if (Array.isArray(data.categories)) {
            for (const rawCategory of data.categories) {
                if (!isRecord(rawCategory)) continue;
                const cat = rawCategory;
                if (cat.active !== false) {
                    const id = normalizeText(cat.id);
                    const name = normalizeLocalizedText(cat.name);
                    if (id && Object.keys(name).length > 0) {
                        allCategories.push({ id, name });
                    }
                }
            }
        }

        if (Array.isArray(data.items)) {
            for (const rawItem of data.items) {
                if (!isRecord(rawItem)) continue;
                const item = rawItem;
                if (item.active !== false) {
                    const name = normalizeLocalizedText(item.name);
                    if (Object.keys(name).length === 0) continue;
                    allItems.push({
                        name,
                        tags: Array.isArray(item.tags)
                            ? item.tags.map(normalizeText).filter(Boolean)
                            : undefined,
                        price: normalizePrice(item.price),
                        category: normalizeText(item.category),
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

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeText = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const normalizeLocalizedText = (value: unknown): Record<string, string> => {
    if (typeof value === 'string') {
        const text = value.trim();
        return text ? { en: text } : {};
    }
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value)
            .map(([language, text]) => [language.trim(), normalizeText(text)] as const)
            .filter(([language, text]) => Boolean(language && text)),
    );
};

const normalizePrice = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value.trim() || undefined;
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
};

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
