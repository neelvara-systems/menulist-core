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

function partitionUnsafeExtractedItems(
    items: ExtractedItemInput[],
    categories: ExtractedCategoryInput[],
    primaryLang: string,
): {
    ignored: PreviewIgnoredRow[];
    items: ExtractedItemInput[];
    warnings: PreviewWarningRow[];
} {
    const categoryIds = new Set(categories.map((category) => category.id));
    const itemKeys = new Set<string>();
    const ignored: PreviewIgnoredRow[] = [];
    const warnings: PreviewWarningRow[] = [];
    const safeItems: ExtractedItemInput[] = [];

    for (const item of items) {
        const name = getNormalizedNameFromObject(item.name, primaryLang) || String(item.id);
        if (!categoryIds.has(item.categoryId)) {
            const reason = 'Item references a category that was not extracted';
            ignored.push({ entityType: 'ITEM', name, reason });
            warnings.push({ entityType: 'ITEM', name, reason, severity: 'HIGH', extractedItem: item });
            continue;
        }

        // Generated item IDs contain both the source-file index and extraction
        // ID. A duplicate of that pair would overwrite another item in the
        // apply plan even when the visible names differ.
        const itemKey = `${item.sourceFileIndex ?? 0}:${item.id}`;
        if (itemKeys.has(itemKey)) {
            const reason = 'Duplicate extraction item ID in the same source file';
            ignored.push({ entityType: 'ITEM', name, reason });
            warnings.push({ entityType: 'ITEM', name, reason, severity: 'HIGH', extractedItem: item });
            continue;
        }
        itemKeys.add(itemKey);
        safeItems.push(item);
    }

    return { ignored, items: safeItems, warnings };
}

function partitionUnsafeExtractedCategories(
    categories: ExtractedCategoryInput[],
    primaryLang: string,
): {
    categories: ExtractedCategoryInput[];
    ignored: PreviewIgnoredRow[];
    warnings: PreviewWarningRow[];
} {
    const idCounts = categories.reduce<Map<string, number>>((counts, category) => {
        counts.set(category.id, (counts.get(category.id) || 0) + 1);
        return counts;
    }, new Map());
    const ambiguousIds = new Set(
        Array.from(idCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([id]) => id),
    );
    const ignored: PreviewIgnoredRow[] = [];
    const warnings: PreviewWarningRow[] = [];
    const safeCategories = categories.filter((category) => {
        if (!ambiguousIds.has(category.id)) return true;
        const name = getCategoryName(category, primaryLang) || category.id;
        const reason = 'Duplicate extraction category ID is ambiguous';
        ignored.push({ entityType: 'CATEGORY', name, reason });
        warnings.push({ entityType: 'CATEGORY', name, reason, severity: 'HIGH', extractedCategory: category });
        return false;
    });
    return { categories: safeCategories, ignored, warnings };
}

function normalizeMatchThreshold(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
        ? value
        : fallback;
}

function classifyConfiguredMatch(
    score: number,
    weakThreshold: number,
): 'exact' | 'strong' | 'weak' {
    if (score >= 1) return 'exact';
    return score < weakThreshold ? 'weak' : 'strong';
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

function mergeChangedItemTranslations(
    extracted: ExtractedItemInput,
    existing: ExistingItem,
    changes: PreviewItemRow['changes'],
): ExtractedItemInput {
    return {
        ...extracted,
        ...(changes?.name ? { name: { ...(existing.name || {}), ...extracted.name } } : {}),
        ...(changes?.description && extracted.description
            ? { description: { ...(existing.description || {}), ...extracted.description } }
            : {}),
    };
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
    threshold: number,
    weakThreshold: number,
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
            matchType: classifyConfiguredMatch(match.score, weakThreshold),
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
    weakThreshold: number,
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
                matchType: classifyConfiguredMatch(sameCatMatch.score, weakThreshold),
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
                    matchType: classifyConfiguredMatch(crossCatMatch.score, weakThreshold),
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
    ignored: PreviewIgnoredRow[];
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
    const ignored: PreviewIgnoredRow[] = [];
    const stableIdAliases = createStableIdAliases();
    const matchedExistingIds = new Set<string>();
    let unchangedCount = 0;
    let matchedCount = 0;
    let invalidPrices = 0;
    let weakMatches = 0;

    for (const extracted of items) {
        const match = matchItem(extracted, existingItems, categoryIdMap, primaryLang, threshold, weakThreshold);

        // Price validation warning
        const itemWarnings: string[] = [];
        if (extracted.price && !isValidPrice(extracted.price)) {
            itemWarnings.push('Invalid price format - will be skipped');
            invalidPrices++;
        }

        if (match.matched && match.existingId) {
            if (matchedExistingIds.has(match.existingId)) {
                const name = getNormalizedNameFromObject(extracted.name, primaryLang) || extracted.id;
                const reason = 'Multiple extracted items matched the same existing item';
                ignored.push({ entityType: 'ITEM', name, reason });
                warnings.push({ entityType: 'ITEM', name, reason, severity: 'HIGH', extractedItem: extracted });
                continue;
            }
            matchedExistingIds.add(match.existingId);
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

            const extractedName = getNormalizedNameFromObject(extracted.name, primaryLang);
            const existingName = getNormalizedNameFromObject(existing.name, primaryLang);
            if (match.matchType !== 'weak' && extractedName && extractedName !== existingName) {
                changes.name = { from: existingName, to: extractedName };
                hasChanges = true;
            }

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
                    extractedItem: mergeChangedItemTranslations(extracted, existing, changes),
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
        ignored,
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
    ignored: PreviewIgnoredRow[];
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
    const ignored: PreviewIgnoredRow[] = [];
    const stableIdAliases = createStableIdAliases();
    const matchedTargetIds = new Set<string>();
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
        const masterMatch = matchItem(extracted, masterItems, categoryIdMap, primaryLang, threshold, weakThreshold, true, false);

        if (masterMatch.matched && masterMatch.existingId) {
            const targetKey = `master:${masterMatch.existingId}`;
            if (matchedTargetIds.has(targetKey)) {
                const name = getNormalizedNameFromObject(extracted.name, primaryLang) || extracted.id;
                const reason = 'Multiple extracted items matched the same master item';
                ignored.push({ entityType: 'ITEM', name, reason });
                warnings.push({ entityType: 'ITEM', name, reason, severity: 'HIGH', extractedItem: extracted });
                continue;
            }
            matchedTargetIds.add(targetKey);
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
        const localMatch = matchItem(extracted, localOnlyItems, categoryIdMap, primaryLang, threshold, weakThreshold, false, true);

        if (localMatch.matched && localMatch.existingId) {
            const targetKey = `local:${localMatch.existingId}`;
            if (matchedTargetIds.has(targetKey)) {
                const name = getNormalizedNameFromObject(extracted.name, primaryLang) || extracted.id;
                const reason = 'Multiple extracted items matched the same local item';
                ignored.push({ entityType: 'ITEM', name, reason });
                warnings.push({ entityType: 'ITEM', name, reason, severity: 'HIGH', extractedItem: extracted });
                continue;
            }
            matchedTargetIds.add(targetKey);
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

            const extractedName = getNormalizedNameFromObject(extracted.name, primaryLang);
            const existingName = getNormalizedNameFromObject(localItem.name, primaryLang);
            if (localMatch.matchType !== 'weak' && extractedName && extractedName !== existingName) {
                changes.name = { from: existingName, to: extractedName };
                hasChanges = true;
            }

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
                    extractedItem: mergeChangedItemTranslations(extracted, localItem, changes),
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
        ignored,
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
                    ...(cat.extractedCategory.icon ? { icon: cat.extractedCategory.icon } : {}),
                    orderIndex: cat.extractedCategory.orderIndex,
                    active: true,
                },
                targetFileUid: cat.targetFileUid || '',
            });
        }

        // Approved updated categories
        for (const cat of updatedCategories.filter(c => c.approved)) {
            const patch: Partial<ExistingCategory> = {};
            if (cat.changes?.nameChanged) patch.name = cat.extractedCategory.name;
            if (cat.changes?.orderIndexChanged && cat.extractedCategory.orderIndex !== undefined) {
                patch.orderIndex = cat.extractedCategory.orderIndex;
            }
            plan.projectMutations.upsertCategories.push({
                categoryId: cat.existingCategoryId,
                patch,
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
                    ...(isValidPrice(item.extractedItem.price) ? { price: item.extractedItem.price } : {}),
                    ...(item.extractedItem.description ? { description: item.extractedItem.description } : {}),
                    ...(item.extractedItem.attributes?.length ? { attributes: item.extractedItem.attributes } : {}),
                    ...(item.extractedItem.tags?.length ? { tags: item.extractedItem.tags } : {}),
                    ...(item.extractedItem.dietaryTags?.length ? { dietaryTags: item.extractedItem.dietaryTags } : {}),
                    ...(item.extractedItem.spiceLevel ? { spiceLevel: item.extractedItem.spiceLevel } : {}),
                    ...(item.extractedItem.duration !== undefined ? { duration: item.extractedItem.duration } : {}),
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
            if (item.changes?.description?.to && item.extractedItem.description) {
                patch.description = item.extractedItem.description;
            }
            if (item.changes?.name?.to) patch.name = item.extractedItem.name;

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
                ...(cat.extractedCategory.icon ? { icon: cat.extractedCategory.icon } : {}),
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
                ...(isValidPrice(item.extractedItem.price) ? { price: item.extractedItem.price } : {}),
                ...(item.extractedItem.description ? { description: item.extractedItem.description } : {}),
                ...(item.extractedItem.attributes?.length ? { attributes: item.extractedItem.attributes } : {}),
                ...(item.extractedItem.tags?.length ? { tags: item.extractedItem.tags } : {}),
                ...(item.extractedItem.dietaryTags?.length ? { dietaryTags: item.extractedItem.dietaryTags } : {}),
                ...(item.extractedItem.spiceLevel ? { spiceLevel: item.extractedItem.spiceLevel } : {}),
                ...(item.extractedItem.duration !== undefined ? { duration: item.extractedItem.duration } : {}),
                active: true,
                available: true,
            });
        }

        // Updated local-only items
        for (const item of updatedItems.filter(i => i.approved && i.isLocalOnly)) {
            plan.outletMutations.upsertLocalItems.push({
                id: item.existingItemId!,
                ...(item.changes?.name?.to ? { name: item.extractedItem.name } : {}),
                ...(item.changes?.price?.to ? { price: item.changes.price.to } : {}),
                ...(item.changes?.description?.to && item.extractedItem.description
                    ? { description: item.extractedItem.description }
                    : {}),
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

    const threshold = normalizeMatchThreshold(matchConfig.similarityThreshold, DEFAULT_SIMILARITY_THRESHOLD);
    const weakThreshold = Math.max(
        threshold,
        normalizeMatchThreshold(matchConfig.weakMatchThreshold, DEFAULT_WEAK_MATCH_THRESHOLD),
    );
    const normalizedExtractedCategories = normalizeExtractedCategories(extracted.categories || []);
    const unsafeCategories = partitionUnsafeExtractedCategories(normalizedExtractedCategories, primaryLang);
    const extractedCategories = unsafeCategories.categories;
    const normalizedExtractedItems = normalizeExtractedItems(extracted.items || []);

    if (mode === 'OUTLET_LINKED' && !masterProject) {
        throw new Error('OUTLET_LINKED comparison requires master project data');
    }

    // Initialize stats
    const stats: ComparisonStats = {
        extractedCategories: normalizedExtractedCategories.length,
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
    const resolvedExtractedItems = resolveItemCategoryNames(
        normalizedExtractedItems,
        extractedCategories,
        primaryLang,
    );

    const unsafeItems = partitionUnsafeExtractedItems(
        resolvedExtractedItems,
        extractedCategories,
        primaryLang,
    );

    const { items: dedupedItems, duplicatesRemoved } = deduplicateExtractedItems(
        unsafeItems.items,
        primaryLang
    );
    // Step 2: Process categories
    const newCategories: PreviewCategoryRow[] = [];
    const updatedCategories: PreviewCategoryRow[] = [];
    const stableIdAliases = createStableIdAliases();
    const categoryIdMap = new Map<string, string>(); // extractedId -> existingId
    const matchedExistingCategoryIds = new Set<string>();
    const rejectedCategoryIds = new Set<string>();
    const categoryCollisionIgnored: PreviewIgnoredRow[] = [];
    const categoryCollisionWarnings: PreviewWarningRow[] = [];
    const categoryMatchWarnings: PreviewWarningRow[] = [];

    const existingCategories = mode === 'OUTLET_LINKED' && masterProject
        ? [...storeProject.categories, ...masterProject.categories]
        : storeProject.categories;

    for (const extractedCat of extractedCategories) {
        const match = matchCategory(extractedCat, existingCategories, primaryLang, threshold, weakThreshold);

        if (match.matched && match.existingId) {
            if (matchedExistingCategoryIds.has(match.existingId)) {
                const name = getCategoryName(extractedCat, primaryLang) || extractedCat.id;
                const reason = 'Multiple extracted categories matched the same existing category';
                rejectedCategoryIds.add(extractedCat.id);
                categoryCollisionIgnored.push({ entityType: 'CATEGORY', name, reason });
                categoryCollisionWarnings.push({
                    entityType: 'CATEGORY',
                    name,
                    reason,
                    severity: 'HIGH',
                    extractedCategory: extractedCat,
                });
                continue;
            }
            matchedExistingCategoryIds.add(match.existingId);
            categoryIdMap.set(extractedCat.id, match.existingId);
            stats.matchedCategories++;

            // Check for changes
            const existing = existingCategories.find(c => c.id === match.existingId)!;
            if (match.matchType === 'weak') {
                const name = getCategoryName(extractedCat, primaryLang) || extractedCat.id;
                categoryMatchWarnings.push({
                    entityType: 'CATEGORY',
                    name,
                    reason: `Weak category match (${Math.round(match.score * 100)}%); persisted category was not changed`,
                    severity: 'MEDIUM',
                    extractedCategory: extractedCat,
                });
                stats.weakMatches++;
                continue;
            }
            if (needsExtractionIdAlias(existing, extractedCat.id)) {
                stableIdAliases.categoryAliases.push({
                    categoryId: existing.id,
                    extractedCategoryId: extractedCat.id,
                    targetFileUid: existing.fileUid || '',
                });
            }
            const hasNameChange = getNormalizedNameFromObject(extractedCat.name, primaryLang) !==
                    getNormalizedNameFromObject(existing.name, primaryLang);
            const hasOrderChange = extractedCat.orderIndex !== undefined
                && extractedCat.orderIndex !== existing.orderIndex;

            if (hasNameChange || hasOrderChange) {
                stats.updatedCategories++;
                updatedCategories.push({
                    changeType: 'UPDATE',
                    extractedCategory: hasNameChange
                        ? { ...extractedCat, name: { ...existing.name, ...extractedCat.name } }
                        : extractedCat,
                    existingCategoryId: match.existingId,
                    matchScore: match.score,
                    matchType: match.matchType,
                    changes: {
                        nameChanged: hasNameChange,
                        orderIndexChanged: hasOrderChange,
                    },
                    approved: true,
                    targetFileUid: existing.fileUid,
                });
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

    const rejectedCategoryItems: PreviewIgnoredRow[] = [];
    const rejectedCategoryItemWarnings: PreviewWarningRow[] = [];
    const itemsForProcessing = dedupedItems.filter((item) => {
        if (!rejectedCategoryIds.has(item.categoryId)) return true;
        const name = getNormalizedNameFromObject(item.name, primaryLang) || item.id;
        const reason = 'Item belongs to an ambiguous extracted category match';
        rejectedCategoryItems.push({ entityType: 'ITEM', name, reason });
        rejectedCategoryItemWarnings.push({ entityType: 'ITEM', name, reason, severity: 'HIGH', extractedItem: item });
        return false;
    });

    // Step 3: Process items (mode-specific)
    let newItems: PreviewItemRow[] = [];
    let updatedItems: PreviewItemRow[] = [];
    let overrideSuggestions: PreviewItemRow[] = [];
    let processingIgnored: PreviewIgnoredRow[] = [];
    let warnings: PreviewWarningRow[] = [
        ...unsafeCategories.warnings,
        ...unsafeItems.warnings,
        ...categoryCollisionWarnings,
        ...categoryMatchWarnings,
        ...rejectedCategoryItemWarnings,
    ];
    let unchangedCount = 0;

    if (mode === 'OUTLET_LINKED' && masterProject) {
        const result = processItemsOutletLinked(
            itemsForProcessing,
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
        processingIgnored = result.ignored;
        warnings.push(...result.warnings);
        unchangedCount = result.unchangedCount;
        mergeStableIdAliases(stableIdAliases, result.stableIdAliases);
        Object.assign(stats, result.stats);
    } else {
        const result = processItemsSingleOrMaster(
            itemsForProcessing,
            storeProject.items,
            categoryIdMap,
            primaryLang,
            threshold,
            weakThreshold
        );
        newItems = result.newItems;
        updatedItems = result.updatedItems;
        processingIgnored = result.ignored;
        warnings.push(...result.warnings);
        unchangedCount = result.unchangedCount;
        mergeStableIdAliases(stableIdAliases, result.stableIdAliases);
        Object.assign(stats, result.stats);
    }
    stats.ignoredDuplicates = (
        unsafeCategories.ignored.length
        + unsafeItems.ignored.length
        + duplicatesRemoved.length
        + categoryCollisionIgnored.length
        + rejectedCategoryItems.length
        + processingIgnored.length
    );

    // Step 4: Build apply plan
    const applyPlan = buildApplyPlan(
        mode,
        newCategories,
        updatedCategories,
        newItems,
        updatedItems,
        overrideSuggestions,
        stableIdAliases,
    );

    return {
        mode,
        preview: {
            newCategories,
            updatedCategories,
            newItems,
            updatedItems,
            overrideSuggestions,
            warnings,
            ignored: [
                ...unsafeCategories.ignored,
                ...unsafeItems.ignored,
                ...duplicatesRemoved,
                ...categoryCollisionIgnored,
                ...rejectedCategoryItems,
                ...processingIgnored,
            ],
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
        output.stableIdAliases,
    );
}

export default runComparisonEngine;
