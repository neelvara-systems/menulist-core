/**
 * Comparison Engine
 * 
 * Spec Reference: ai-extraction-integration.md Part 4D
 * Spec Reference: ai-extraction-workflow-explained.md Section 4
 * 
 * Client-side comparison of extracted data against existing project data.
 * Produces a preview for the Review Screen and an ApplyPlan for Firestore writes.
 */

import type {
    ApplyPlan,
    ComparisonEngineInput,
    ComparisonEngineOutput,
    ComparisonMode,
    ComparisonStats,
    DeduplicationResult,
    ExistingCategory,
    ExistingItem,
    ExtractedCategoryInput,
    ExtractedItemInput,
    MatchResult,
    PreviewCategoryRow,
    PreviewIgnoredRow,
    PreviewItemRow,
    PreviewWarningRow,
    StableIdAliases,
} from './comparisonEngine.types';
import { getNormalizedNameFromObject, normalizeName } from './normalize';
import { generateLocalCategoryId, generateLocalItemId } from './redistribute';
import { findBestMatch, isExactMatch, MATCH_THRESHOLDS } from './similarity';
import { isValidPrice } from './validation';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SIMILARITY_THRESHOLD = MATCH_THRESHOLDS.SIMILARITY_THRESHOLD;
const DEFAULT_WEAK_MATCH_THRESHOLD = MATCH_THRESHOLDS.WEAK_MATCH_THRESHOLD;

function createStableIdAliases(): StableIdAliases {
    return {
        categoryAliases: [],
        itemAliases: [],
    };
}

function mergeStableIdAliases(target: StableIdAliases, source?: StableIdAliases): StableIdAliases {
    if (!source) return target;
    target.categoryAliases.push(...source.categoryAliases);
    target.itemAliases.push(...source.itemAliases);
    return target;
}

function hasExtractionIdAlias(entity: { extractionIdAliases?: string[] }, extractedId: string): boolean {
    return Array.isArray(entity.extractionIdAliases) && entity.extractionIdAliases.includes(extractedId);
}

function needsExtractionIdAlias(
    entity: { id: string; extractionIdAliases?: string[] },
    extractedId: string,
): boolean {
    return Boolean(extractedId) && entity.id !== extractedId && !hasExtractionIdAlias(entity, extractedId);
}

function getGeneratedItemId(extracted: ExtractedItemInput): string {
    return `${extracted.sourceFileIndex ?? 0}i${extracted.id}`;
}

function normalizeExtractedCategories(
    categories: ExtractedCategoryInput[],
): ExtractedCategoryInput[] {
    return categories.map((category) => ({
        ...category,
        id: String(category.id),
    }));
}

function normalizeExtractedItems(
    items: ExtractedItemInput[],
): ExtractedItemInput[] {
    return items.map((item) => {
        const rawCategoryId = item.categoryId ?? (item as ExtractedItemInput & { category?: string | number }).category;
        return {
            ...item,
            id: String(item.id),
            categoryId: rawCategoryId != null ? String(rawCategoryId) : '',
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remove duplicate items within the same upload
 * 
 * Key = normalized(itemName) + "::" + normalized(categoryName)
 * Keeps the "more complete" item (more fields present)
 */
function deduplicateExtractedItems(
    items: ExtractedItemInput[],
    primaryLang: string
): DeduplicationResult {
    const deduped: Record<string, ExtractedItemInput> = {};
    const duplicatesRemoved: PreviewIgnoredRow[] = [];

    for (const item of items) {
        const normName = getNormalizedNameFromObject(item.name, primaryLang);
        const normCategoryName = normalizeName(item.categoryName);
        const key = `${normName}::${normCategoryName}`;

        if (!deduped[key]) {
            deduped[key] = item;
        } else {
            // Keep the more complete item
            const existing = deduped[key];
            const existingFieldCount = countFields(existing);
            const newFieldCount = countFields(item);

            if (newFieldCount > existingFieldCount) {
                duplicatesRemoved.push({
                    entityType: 'ITEM',
                    name: getNormalizedNameFromObject(existing.name, primaryLang),
                    reason: 'Duplicate item in upload (less complete version removed)',
                });
                deduped[key] = item;
            } else {
                duplicatesRemoved.push({
                    entityType: 'ITEM',
                    name: getNormalizedNameFromObject(item.name, primaryLang),
                    reason: 'Duplicate item in upload (less complete version removed)',
                });
            }
        }
    }

    return {
        items: Object.values(deduped),
        duplicatesRemoved,
    };
}

function countFields(item: ExtractedItemInput): number {
    let count = 0;
    if (item.name && Object.keys(item.name).length > 0) count++;
    if (item.price) count++;
    if (item.description && Object.keys(item.description).length > 0) count++;
    if (item.imageUrl) count++;
    if (item.attributes && item.attributes.length > 0) count++;
    if (item.tags && item.tags.length > 0) count++;
    return count;
}

function getCategoryName(
    category: ExtractedCategoryInput,
    primaryLang: string,
): string {
    return category.name?.[primaryLang] || Object.values(category.name || {})[0] || '';
}

function resolveItemCategoryNames(
    items: ExtractedItemInput[],
    categories: ExtractedCategoryInput[],
    primaryLang: string,
): ExtractedItemInput[] {
    const categoryNameById = new Map(
        categories.map((category) => [category.id, getCategoryName(category, primaryLang)]),
    );

    return items.map((item) => {
        if (item.categoryName) return item;
        const categoryName = categoryNameById.get(item.categoryId);
        return categoryName ? { ...item, categoryName } : item;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Match an extracted category against existing categories
 */
function matchCategory(
    extracted: ExtractedCategoryInput,
    existingCategories: ExistingCategory[],
    primaryLang: string,
    threshold: number
): MatchResult {
    const extractedName = getNormalizedNameFromObject(extracted.name, primaryLang);

    // Try exact match first
    for (const existing of existingCategories) {
        const existingName = getNormalizedNameFromObject(existing.name, primaryLang);
        if (isExactMatch(extractedName, existingName)) {
            return {
                matched: true,
                existingId: existing.id,
                score: 1.0,
                matchType: 'exact',
            };
        }
    }

    // Try similarity match
    const candidates = existingCategories.map(c => ({
        id: c.id,
        name: getNormalizedNameFromObject(c.name, primaryLang),
    }));

    const match = findBestMatch(extractedName, candidates, threshold);
    if (match) {
        return {
            matched: true,
            existingId: match.candidate.id,
            score: match.score,
            matchType: match.matchType,
        };
    }

    return {
        matched: false,
        score: 0,
        matchType: 'no_match',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Match an extracted item against existing items
 * 
 * UPDATED: Category is now a TIE-BREAKER, not a hard gate.
 * - First priority: Same category matches (gets +0.05 category bonus)
 * - Second priority: Cross-category matches (name match without category bonus)
 * - If same-category match and cross-category match have similar scores, prefer same-category
 */
const CATEGORY_MATCH_BONUS = 0.05;

function matchItem(
    extracted: ExtractedItemInput,
    existingItems: ExistingItem[],
    categoryIdMap: Map<string, string>, // extractedCategoryId -> existingCategoryId
    primaryLang: string,
    threshold: number,
    isMasterPool: boolean = false,
    isLocalPool: boolean = false
): MatchResult {
    const extractedName = getNormalizedNameFromObject(extracted.name, primaryLang);
    const targetCategoryId = categoryIdMap.get(extracted.categoryId) || extracted.categoryId;

    // Separate items by category
    const itemsInCategory = existingItems.filter(item => item.category === targetCategoryId);
    const itemsOutsideCategory = existingItems.filter(item => item.category !== targetCategoryId);

    let bestMatch: { id: string; score: number; matchType: 'exact' | 'strong' | 'weak' | 'no_match'; inSameCategory: boolean } | null = null;

    // Try exact match in same category first (highest priority)
    for (const existing of itemsInCategory) {
        const existingName = getNormalizedNameFromObject(existing.name, primaryLang);
        if (isExactMatch(extractedName, existingName)) {
            return {
                matched: true,
                existingId: existing.id,
                score: 1.0,
                matchType: 'exact',
                isMasterItem: isMasterPool,
                isLocalItem: isLocalPool,
            };
        }
    }

    // Try similarity match in same category
    if (itemsInCategory.length > 0) {
        const sameCategoryCandidates = itemsInCategory.map(item => ({
            id: item.id,
            name: getNormalizedNameFromObject(item.name, primaryLang),
        }));
        const sameCatMatch = findBestMatch(extractedName, sameCategoryCandidates, threshold);
        if (sameCatMatch) {
            // Add category bonus to effective score for comparison
            const effectiveScore = Math.min(1.0, sameCatMatch.score + CATEGORY_MATCH_BONUS);
            bestMatch = {
                id: sameCatMatch.candidate.id,
                score: sameCatMatch.score, // Store original score
                matchType: sameCatMatch.matchType,
                inSameCategory: true,
            };
        }
    }

    // Try cross-category match (no bonus, but still valid)
    if (itemsOutsideCategory.length > 0) {
        const crossCategoryCandidates = itemsOutsideCategory.map(item => ({
            id: item.id,
            name: getNormalizedNameFromObject(item.name, primaryLang),
        }));
        const crossCatMatch = findBestMatch(extractedName, crossCategoryCandidates, threshold);
        if (crossCatMatch) {
            // Compare with same-category match (accounting for bonus)
            const crossCatEffectiveScore = crossCatMatch.score;
            const sameCatEffectiveScore = bestMatch
                ? Math.min(1.0, bestMatch.score + CATEGORY_MATCH_BONUS)
                : 0;

            // Only use cross-category if significantly better than same-category
            if (!bestMatch || crossCatEffectiveScore > sameCatEffectiveScore) {
                bestMatch = {
                    id: crossCatMatch.candidate.id,
                    score: crossCatMatch.score,
                    matchType: crossCatMatch.matchType,
                    inSameCategory: false,
                };
            }
        }
    }

    if (bestMatch) {
        return {
            matched: true,
            existingId: bestMatch.id,
            score: bestMatch.score,
            matchType: bestMatch.matchType,
            isMasterItem: isMasterPool,
            isLocalItem: isLocalPool,
        };
    }

    return {
        matched: false,
        score: 0,
        matchType: 'no_match',
        isMasterItem: isMasterPool,
        isLocalItem: isLocalPool,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE-SPECIFIC PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process items for SINGLE_STORE or MASTER_PROJECT mode
 */
function processItemsSingleOrMaster(
    items: ExtractedItemInput[],
    existingItems: ExistingItem[],
    categoryIdMap: Map<string, string>,
    primaryLang: string,
    threshold: number,
    weakThreshold: number
): {
    newItems: PreviewItemRow[];
    updatedItems: PreviewItemRow[];
    warnings: PreviewWarningRow[];
    unchangedCount: number;
    stats: Partial<ComparisonStats>;
    stableIdAliases: StableIdAliases;
} {
    const newItems: PreviewItemRow[] = [];
    const updatedItems: PreviewItemRow[] = [];
    const warnings: PreviewWarningRow[] = [];
    const stableIdAliases = createStableIdAliases();
    let unchangedCount = 0;
    let matchedCount = 0;
    let invalidPrices = 0;
    let weakMatches = 0;

    for (const extracted of items) {
        const match = matchItem(extracted, existingItems, categoryIdMap, primaryLang, threshold);

        // Price validation warning
        const itemWarnings: string[] = [];
        if (extracted.price && !isValidPrice(extracted.price)) {
            itemWarnings.push('Invalid price format - will be skipped');
            invalidPrices++;
        }

        if (match.matched && match.existingId) {
            matchedCount++;
            const existing = existingItems.find(i => i.id === match.existingId)!;
            if (match.matchType !== 'weak' && needsExtractionIdAlias(existing, extracted.id)) {
                stableIdAliases.itemAliases.push({
                    itemId: existing.id,
                    extractedItemId: extracted.id,
                    targetFileUid: existing.fileUid || '',
                });
            }

            // Check for changes
            const changes: PreviewItemRow['changes'] = {};
            let hasChanges = false;

            if (extracted.price && isValidPrice(extracted.price) && extracted.price !== existing.price) {
                changes.price = { from: existing.price, to: extracted.price };
                hasChanges = true;
            }

            const extractedDesc = getNormalizedNameFromObject(extracted.description || {}, primaryLang);
            const existingDesc = getNormalizedNameFromObject(existing.description || {}, primaryLang);
            if (extractedDesc && extractedDesc !== existingDesc) {
                changes.description = { from: existingDesc, to: extractedDesc };
                hasChanges = true;
            }

            // Weak match warning
            if (match.matchType === 'weak') {
                itemWarnings.push(`Weak match (${Math.round(match.score * 100)}% similarity)`);
                weakMatches++;
            }

            if (hasChanges) {
                updatedItems.push({
                    changeType: 'UPDATE',
                    extractedItem: extracted,
                    existingItemId: match.existingId,
                    matchScore: match.score,
                    matchType: match.matchType,
                    changes,
                    warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
                    approved: true,
                    targetCategoryId: categoryIdMap.get(extracted.categoryId) || extracted.categoryId,
                    targetFileUid: existing.fileUid,
                });
            } else {
                unchangedCount++;
            }
        } else {
            // New item
            const targetCategoryId = categoryIdMap.get(extracted.categoryId) || extracted.categoryId;

            newItems.push({
                changeType: 'NEW',
                extractedItem: extracted,
                matchScore: 0,
                matchType: 'no_match',
                warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
                approved: true,
                targetCategoryId,
                targetFileUid: extracted.sourceFileIndex !== undefined
                    ? `file_${extracted.sourceFileIndex}`
                    : undefined,
                generatedId: getGeneratedItemId(extracted),
            });
        }

        // Add to warnings list if there are item-level warnings
        if (itemWarnings.length > 0) {
            warnings.push({
                entityType: 'ITEM',
                name: getNormalizedNameFromObject(extracted.name, primaryLang),
                reason: itemWarnings.join('; '),
                severity: match.matchType === 'weak' ? 'MEDIUM' : 'LOW',
                extractedItem: extracted,
            });
        }
    }

    return {
        newItems,
        updatedItems,
        warnings,
        unchangedCount,
        stats: {
            matchedItems: matchedCount,
            newItems: newItems.length,
            updatedItems: updatedItems.length,
            invalidPrices,
            weakMatches,
        },
        stableIdAliases,
    };
}

/**
 * Process items for OUTLET_LINKED mode
 * 
 * Two-pool matching:
 * 1. Master items → can only create price override
 * 2. Local-only items → can fully update
 * 3. No match → create local-only item
 */
function processItemsOutletLinked(
    items: ExtractedItemInput[],
    storeItems: ExistingItem[],
    masterItems: ExistingItem[],
    categoryIdMap: Map<string, string>,
    primaryLang: string,
    threshold: number,
    weakThreshold: number
): {
    newItems: PreviewItemRow[];
    updatedItems: PreviewItemRow[];
    overrideSuggestions: PreviewItemRow[];
    warnings: PreviewWarningRow[];
    unchangedCount: number;
    stats: Partial<ComparisonStats>;
    stableIdAliases: StableIdAliases;
} {
    const newItems: PreviewItemRow[] = [];
    const updatedItems: PreviewItemRow[] = [];
    const overrideSuggestions: PreviewItemRow[] = [];
    const warnings: PreviewWarningRow[] = [];
    const stableIdAliases = createStableIdAliases();
    let unchangedCount = 0;
    let matchedCount = 0;
    let overrideCount = 0;
    let invalidPrices = 0;
    let weakMatches = 0;

    // Separate local-only items from store items
    const localOnlyItems = storeItems.filter(item => item.id.startsWith('L_I_'));

    for (const extracted of items) {
        const itemWarnings: string[] = [];
        if (extracted.price && !isValidPrice(extracted.price)) {
            itemWarnings.push('Invalid price format - will be skipped');
            invalidPrices++;
        }

        // Pool 1: Try matching master items
        const masterMatch = matchItem(extracted, masterItems, categoryIdMap, primaryLang, threshold, true, false);

        if (masterMatch.matched && masterMatch.existingId) {
            matchedCount++;
            const masterItem = masterItems.find(i => i.id === masterMatch.existingId)!;

            // For master items, only price override is allowed
            if (extracted.price && isValidPrice(extracted.price) && extracted.price !== masterItem.price) {
                overrideCount++;

                if (masterMatch.matchType === 'weak') {
                    itemWarnings.push(`Weak match to master (${Math.round(masterMatch.score * 100)}%)`);
                    weakMatches++;
                }

                overrideSuggestions.push({
                    changeType: 'OVERRIDE',
                    extractedItem: extracted,
                    existingItemId: masterMatch.existingId,
                    masterItemId: masterMatch.existingId,
                    matchScore: masterMatch.score,
                    matchType: masterMatch.matchType,
                    changes: {
                        price: { from: masterItem.price, to: extracted.price },
                    },
                    overridePatch: {
                        price: extracted.price,
                    },
                    warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
                    approved: true,
                    targetCategoryId: categoryIdMap.get(extracted.categoryId) || extracted.categoryId,
                });
            } else {
                unchangedCount++;
            }
            continue;
        }

        // Pool 2: Try matching local-only items
        const localMatch = matchItem(extracted, localOnlyItems, categoryIdMap, primaryLang, threshold, false, true);

        if (localMatch.matched && localMatch.existingId) {
            matchedCount++;
            const localItem = localOnlyItems.find(i => i.id === localMatch.existingId)!;
            if (localMatch.matchType !== 'weak' && needsExtractionIdAlias(localItem, extracted.id)) {
                stableIdAliases.itemAliases.push({
                    itemId: localItem.id,
                    extractedItemId: extracted.id,
                    targetFileUid: localItem.fileUid || '',
                });
            }

            // For local items, full update is allowed
            const changes: PreviewItemRow['changes'] = {};
            let hasChanges = false;

            if (extracted.price && isValidPrice(extracted.price) && extracted.price !== localItem.price) {
                changes.price = { from: localItem.price, to: extracted.price };
                hasChanges = true;
            }

            const extractedDesc = getNormalizedNameFromObject(extracted.description || {}, primaryLang);
            const existingDesc = getNormalizedNameFromObject(localItem.description || {}, primaryLang);
            if (extractedDesc && extractedDesc !== existingDesc) {
                changes.description = { from: existingDesc, to: extractedDesc };
                hasChanges = true;
            }

            if (localMatch.matchType === 'weak') {
                itemWarnings.push(`Weak match to local item (${Math.round(localMatch.score * 100)}%)`);
                weakMatches++;
            }

            if (hasChanges) {
                updatedItems.push({
                    changeType: 'UPDATE',
                    extractedItem: extracted,
                    existingItemId: localMatch.existingId,
                    matchScore: localMatch.score,
                    matchType: localMatch.matchType,
                    changes,
                    warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
                    approved: true,
                    isLocalOnly: true,
                    targetCategoryId: categoryIdMap.get(extracted.categoryId) || extracted.categoryId,
                    targetFileUid: localItem.fileUid,
                });
            } else {
                unchangedCount++;
            }
            continue;
        }

        // Pool 3: No match - create local-only item
        const targetCategoryId = categoryIdMap.get(extracted.categoryId) || extracted.categoryId;
        const generatedId = generateLocalItemId();

        newItems.push({
            changeType: 'NEW',
            extractedItem: extracted,
            matchScore: 0,
            matchType: 'no_match',
            warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
            approved: true,
            isLocalOnly: true,
            targetCategoryId,
            generatedId,
        });

        // Add warnings
        if (itemWarnings.length > 0) {
            warnings.push({
                entityType: 'ITEM',
                name: getNormalizedNameFromObject(extracted.name, primaryLang),
                reason: itemWarnings.join('; '),
                severity: 'LOW',
                extractedItem: extracted,
            });
        }
    }

    return {
        newItems,
        updatedItems,
        overrideSuggestions,
        warnings,
        unchangedCount,
        stats: {
            matchedItems: matchedCount,
            newItems: newItems.length,
            updatedItems: updatedItems.length,
            overrides: overrideCount,
            invalidPrices,
            weakMatches,
        },
        stableIdAliases,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD APPLY PLAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the ApplyPlan from approved preview items
 */
function buildApplyPlan(
    mode: ComparisonMode,
    newCategories: PreviewCategoryRow[],
    updatedCategories: PreviewCategoryRow[],
    newItems: PreviewItemRow[],
    updatedItems: PreviewItemRow[],
    overrideSuggestions: PreviewItemRow[],
    primaryLang: string,
    stableIdAliases?: StableIdAliases,
): ApplyPlan {
    const plan: ApplyPlan = { mode };

    if (mode === 'SINGLE_STORE' || mode === 'MASTER_PROJECT') {
        plan.projectMutations = {
            upsertCategories: [],
            upsertItems: [],
            stableIdAliases,
        };

        // Approved new categories
        for (const cat of newCategories.filter(c => c.approved)) {
            plan.projectMutations.upsertCategories.push({
                newCategory: {
                    id: cat.generatedId || cat.extractedCategory.id,
                    name: cat.extractedCategory.name,
                    orderIndex: cat.extractedCategory.orderIndex,
                    active: true,
                },
                targetFileUid: cat.targetFileUid || '',
            });
        }

        // Approved updated categories
        for (const cat of updatedCategories.filter(c => c.approved)) {
            plan.projectMutations.upsertCategories.push({
                categoryId: cat.existingCategoryId,
                patch: {
                    name: cat.extractedCategory.name,
                    orderIndex: cat.extractedCategory.orderIndex,
                },
                targetFileUid: cat.targetFileUid || '',
            });
        }

        // Approved new items
        for (const item of newItems.filter(i => i.approved)) {
            plan.projectMutations.upsertItems.push({
                newItem: {
                    id: item.generatedId || item.extractedItem.id,
                    name: item.extractedItem.name,
                    category: item.targetCategoryId || item.extractedItem.categoryId,
                    price: item.extractedItem.price,
                    description: item.extractedItem.description,
                    active: true,
                    available: true,
                },
                targetFileUid: item.targetFileUid || '',
            });
        }

        // Approved updated items
        for (const item of updatedItems.filter(i => i.approved)) {
            const patch: Partial<ExistingItem> = {};
            if (item.changes?.price?.to) patch.price = item.changes.price.to;
            if (item.changes?.description?.to) patch.description = { [primaryLang]: item.changes.description.to };
            if (item.changes?.name?.to) patch.name = { [primaryLang]: item.changes.name.to };

            plan.projectMutations.upsertItems.push({
                itemId: item.existingItemId,
                patch,
                targetFileUid: item.targetFileUid || '',
            });
        }
    } else if (mode === 'OUTLET_LINKED') {
        plan.outletMutations = {
            upsertLocalCategories: [],
            upsertLocalItems: [],
            applyOverrides: [],
            stableIdAliases,
        };

        // New local-only categories
        for (const cat of newCategories.filter(c => c.approved)) {
            plan.outletMutations.upsertLocalCategories.push({
                id: cat.generatedId || generateLocalCategoryId(),
                name: cat.extractedCategory.name,
                orderIndex: cat.extractedCategory.orderIndex,
                active: true,
            });
        }

        // New local-only items
        for (const item of newItems.filter(i => i.approved && i.isLocalOnly)) {
            plan.outletMutations.upsertLocalItems.push({
                id: item.generatedId || generateLocalItemId(),
                name: item.extractedItem.name,
                category: item.targetCategoryId || item.extractedItem.categoryId,
                price: item.extractedItem.price,
                description: item.extractedItem.description,
                active: true,
                available: true,
            });
        }

        // Updated local-only items
        for (const item of updatedItems.filter(i => i.approved && i.isLocalOnly)) {
            plan.outletMutations.upsertLocalItems.push({
                id: item.existingItemId!,
                name: item.extractedItem.name,
                category: item.targetCategoryId || item.extractedItem.categoryId,
                price: item.changes?.price?.to || item.extractedItem.price,
                description: item.extractedItem.description,
                active: true,
                available: true,
            });
        }

        // Price overrides on master items
        for (const item of overrideSuggestions.filter(i => i.approved && i.overridePatch)) {
            plan.outletMutations.applyOverrides.push({
                masterItemId: item.masterItemId!,
                patch: item.overridePatch!,
            });
        }
    }

    return plan;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the comparison engine
 * 
 * This is the main entry point for comparing extracted data against existing project data.
 * 
 * @param input - Comparison engine input
 * @returns Comparison result with preview and apply plan
 */
export function runComparisonEngine(input: ComparisonEngineInput): ComparisonEngineOutput {
    const {
        mode,
        extracted,
        storeProject,
        masterProject,
        primaryLang = 'en',
        matchConfig = {},
    } = input;

    const threshold = matchConfig.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
    const weakThreshold = matchConfig.weakMatchThreshold ?? DEFAULT_WEAK_MATCH_THRESHOLD;
    const extractedCategories = normalizeExtractedCategories(extracted.categories || []);
    const normalizedExtractedItems = normalizeExtractedItems(extracted.items || []);

    console.log('[ComparisonEngine] Starting comparison', {
        mode,
        extractedCategories: extractedCategories.length,
        extractedItems: normalizedExtractedItems.length,
        existingCategories: storeProject.categories.length,
        existingItems: storeProject.items.length,
        hasMasterProject: !!masterProject,
    });

    if (mode === 'OUTLET_LINKED' && !masterProject) {
        throw new Error('OUTLET_LINKED comparison requires master project data');
    }

    // Initialize stats
    const stats: ComparisonStats = {
        extractedCategories: extractedCategories.length,
        extractedItems: normalizedExtractedItems.length,
        matchedCategories: 0,
        matchedItems: 0,
        newCategories: 0,
        newItems: 0,
        updatedCategories: 0,
        updatedItems: 0,
        overrides: 0,
        weakMatches: 0,
        invalidPrices: 0,
        ignoredDuplicates: 0,
    };

    // Step 1: Deduplicate extracted items
    const extractedItems = resolveItemCategoryNames(
        normalizedExtractedItems,
        extractedCategories,
        primaryLang,
    );

    const { items: dedupedItems, duplicatesRemoved } = deduplicateExtractedItems(
        extractedItems,
        primaryLang
    );
    stats.ignoredDuplicates = duplicatesRemoved.length;

    // Step 2: Process categories
    const newCategories: PreviewCategoryRow[] = [];
    const updatedCategories: PreviewCategoryRow[] = [];
    const stableIdAliases = createStableIdAliases();
    const categoryIdMap = new Map<string, string>(); // extractedId -> existingId

    const existingCategories = mode === 'OUTLET_LINKED' && masterProject
        ? [...storeProject.categories, ...masterProject.categories]
        : storeProject.categories;

    for (const extractedCat of extractedCategories) {
        const match = matchCategory(extractedCat, existingCategories, primaryLang, threshold);

        if (match.matched && match.existingId) {
            categoryIdMap.set(extractedCat.id, match.existingId);
            stats.matchedCategories++;

            // Check for changes
            const existing = existingCategories.find(c => c.id === match.existingId)!;
            if (match.matchType !== 'weak' && needsExtractionIdAlias(existing, extractedCat.id)) {
                stableIdAliases.categoryAliases.push({
                    categoryId: existing.id,
                    extractedCategoryId: extractedCat.id,
                    targetFileUid: existing.fileUid || '',
                });
            }
            const hasNameChange = getNormalizedNameFromObject(extractedCat.name, primaryLang) !==
                getNormalizedNameFromObject(existing.name, primaryLang);
            const hasOrderChange = extractedCat.orderIndex !== existing.orderIndex;

            if (hasNameChange || hasOrderChange) {
                stats.updatedCategories++;
                updatedCategories.push({
                    changeType: 'UPDATE',
                    extractedCategory: extractedCat,
                    existingCategoryId: match.existingId,
                    matchScore: match.score,
                    matchType: match.matchType,
                    changes: {
                        nameChanged: hasNameChange,
                        orderIndexChanged: hasOrderChange,
                    },
                    warnings: match.matchType === 'weak'
                        ? [`Weak match (${Math.round(match.score * 100)}%)`]
                        : undefined,
                    approved: true,
                    targetFileUid: existing.fileUid,
                });

                if (match.matchType === 'weak') {
                    stats.weakMatches++;
                }
            }
        } else {
            // New category
            stats.newCategories++;
            const generatedId = mode === 'OUTLET_LINKED'
                ? generateLocalCategoryId()
                : `${extractedCat.sourceFileIndex ?? 0}c${extractedCat.id}`;

            categoryIdMap.set(extractedCat.id, generatedId);

            newCategories.push({
                changeType: 'NEW',
                extractedCategory: extractedCat,
                matchScore: 0,
                matchType: 'no_match',
                approved: true,
                generatedId,
                targetFileUid: extractedCat.sourceFileIndex !== undefined
                    ? `file_${extractedCat.sourceFileIndex}`
                    : undefined,
            });
        }
    }

    // Step 3: Process items (mode-specific)
    let newItems: PreviewItemRow[] = [];
    let updatedItems: PreviewItemRow[] = [];
    let overrideSuggestions: PreviewItemRow[] = [];
    let warnings: PreviewWarningRow[] = [];
    let unchangedCount = 0;

    if (mode === 'OUTLET_LINKED' && masterProject) {
        const result = processItemsOutletLinked(
            dedupedItems,
            storeProject.items,
            masterProject.items,
            categoryIdMap,
            primaryLang,
            threshold,
            weakThreshold
        );
        newItems = result.newItems;
        updatedItems = result.updatedItems;
        overrideSuggestions = result.overrideSuggestions;
        warnings = result.warnings;
        unchangedCount = result.unchangedCount;
        mergeStableIdAliases(stableIdAliases, result.stableIdAliases);
        Object.assign(stats, result.stats);
    } else {
        const result = processItemsSingleOrMaster(
            dedupedItems,
            storeProject.items,
            categoryIdMap,
            primaryLang,
            threshold,
            weakThreshold
        );
        newItems = result.newItems;
        updatedItems = result.updatedItems;
        warnings = result.warnings;
        unchangedCount = result.unchangedCount;
        mergeStableIdAliases(stableIdAliases, result.stableIdAliases);
        Object.assign(stats, result.stats);
    }

    // Step 4: Build apply plan
    const applyPlan = buildApplyPlan(
        mode,
        newCategories,
        updatedCategories,
        newItems,
        updatedItems,
        overrideSuggestions,
        primaryLang,
        stableIdAliases,
    );

    console.log('[ComparisonEngine] Comparison complete', {
        newCategories: newCategories.length,
        updatedCategories: updatedCategories.length,
        newItems: newItems.length,
        updatedItems: updatedItems.length,
        overrideSuggestions: overrideSuggestions.length,
        unchangedCount,
        warnings: warnings.length,
    });

    return {
        mode,
        preview: {
            newCategories,
            updatedCategories,
            newItems,
            updatedItems,
            overrideSuggestions,
            warnings,
            ignored: duplicatesRemoved,
            unchangedCount,
        },
        applyPlan,
        stats,
        primaryLang,
        stableIdAliases,
    };
}

/**
 * Update the apply plan based on user approval changes
 * 
 * Call this when user toggles items in the review screen.
 */
export function updateApplyPlan(
    output: ComparisonEngineOutput
): ApplyPlan {
    return buildApplyPlan(
        output.mode,
        output.preview.newCategories,
        output.preview.updatedCategories,
        output.preview.newItems,
        output.preview.updatedItems,
        output.preview.overrideSuggestions,
        output.primaryLang,
        output.stableIdAliases,
    );
}

export default runComparisonEngine;
