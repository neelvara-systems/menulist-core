/**
 * Redistribute Combined AI Response to Individual Files
 * 
 * Ported from: src/components/templates/main-app/projects/utils/redistributeExtractedData.ts
 * Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 5
 * 
 * When parallel processing returns combined data with sourceFileIndex,
 * this utility splits it back into per-file extractedData.
 * 
 * Flow:
 * 1. AI returns: { categories: [{sourceFileIndex: 0, ...}, {sourceFileIndex: 1, ...}], items: [...] }
 * 2. This function splits by sourceFileIndex
 * 3. Each file gets its own extractedData with only its categories/items
 */

import * as functions from 'firebase-functions';
import { FileMessage } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (Server-side versions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Feature #3: Time-Based Categories
 * Format: ["HH:mm-HH:mm", ...] e.g., ["06:00-11:00", "18:00-22:00"]
 * Empty/undefined = always visible
 */

export interface ExtractedDataCategory {
    id: string;
    name: Record<string, string>;
    description?: Record<string, string>;
    icon?: string;
    active?: boolean;
    timeWindows?: string[]; // Feature #3: ["06:00-11:00", "18:00-22:00"]
}

export interface ExtractedDataItemAttribute {
    id: string;
    name: Record<string, string>;
    price?: string;
    active?: boolean;
}

export interface ExtractedDataItem {
    id: string;
    name: Record<string, string>;
    category: string;
    description?: Record<string, string>;
    price?: string;
    attributes?: ExtractedDataItemAttribute[];
    tags?: string[];
    dietaryTags?: string[];
    spiceLevel?: string;
    duration?: number;
    active?: boolean;
    available?: boolean; // Feature #2: Instant Availability - false = "Sold out"
}

export interface ExtractedDataLanguage {
    name: string;
    code: string;
    isPrimary?: boolean;
}

export interface ExtractedData {
    message?: string;
    processingMessages?: FileMessage[]; // Per-file warnings/errors (Section 8.14)
    data?: {
        languages?: ExtractedDataLanguage[];
        categories?: ExtractedDataCategory[];
        items?: ExtractedDataItem[];
    };
    qualityScore?: number;
    qualityDetails?: {
        categoryQuality: number;
        itemQuality: number;
        priceQuality: number;
        descriptionQuality: number;
    };
}

interface CategoryWithSource extends ExtractedDataCategory {
    sourceFileIndex?: number;
}

// Raw item from AI may have tags as multilingual object
interface RawItemFromAI {
    id: string | number;
    name: Record<string, string>;
    category?: string | number;
    categoryId?: string | number;
    description?: Record<string, string> | string; // AI may return plain string
    price?: string | number; // AI may return number (e.g., 300) or string (e.g., "300")
    attributes?: Array<{ id: string | number; name: Record<string, string> | string; price?: string | number; active?: boolean }> | Record<string, any>;
    tags?: string[] | Record<string, string>;
    dietaryTags?: string[];
    spiceLevel?: string;
    duration?: number;
    active?: boolean;
    sourceFileIndex?: number;
}

export interface CombinedAIResponse {
    message?: string;
    data?: {
        languages?: Array<{ name: string; code: string; isPrimary?: boolean }>;
        categories?: CategoryWithSource[];
        items?: RawItemFromAI[];
        businessAttributeSuggestions?: Array<{
            key: string;
            value: true;
            confidence?: 'high' | 'medium' | 'low';
            evidence?: string;
            sourceFileIndex?: number;
        }>;
        fileMessages?: FileMessage[]; // Per-file warnings/errors from AI (Section 8.14)
    };
    qualityScore?: number;
    qualityDetails?: {
        categoryQuality: number;
        itemQuality: number;
        priceQuality: number;
        descriptionQuality: number;
    };
}

export interface FileMapping {
    uid: string;
    index: number; // 0-based index matching sourceFileIndex
}

// ═══════════════════════════════════════════════════════════════════════════
// SANITIZATION HELPERS (Server-side - basic HTML stripping)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strip HTML tags from a string (server-side sanitization)
 */
function stripHtml(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a multilingual object (removes HTML)
 */
function sanitizeMultilingualObject(
    obj: Record<string, string> | string | undefined | null,
    allowBasicTags: boolean = false
): Record<string, string> {
    if (!obj) return {};
    // Defensive: AI may return a plain string instead of multilingual object
    if (typeof obj === 'string') return { en: allowBasicTags ? obj : stripHtml(obj) };
    if (typeof obj !== 'object') return {};
    const sanitized: Record<string, string> = {};
    for (const [lang, text] of Object.entries(obj)) {
        if (typeof text === 'string') {
            sanitized[lang] = allowBasicTags ? text : stripHtml(text);
        }
    }
    return sanitized;
}

/**
 * Normalize tags from multilingual object to array
 * AI returns: {"en": "Veg, Spicy", "hi": "शाकाहारी"}
 * We need: ["Veg", "Spicy"]
 */
function normalizeTags(tags: string[] | Record<string, string> | undefined): string[] | undefined {
    if (!tags) return undefined;

    if (Array.isArray(tags)) {
        // Defensive: AI may return non-string values in tag arrays
        return tags
            .map(tag => typeof tag === 'string' ? stripHtml(tag) : String(tag))
            .filter(tag => tag.length > 0);
    }

    if (typeof tags !== 'object') return undefined;

    // It's a multilingual object - extract values and split by comma
    return Object.values(tags)
        .filter((v): v is string => typeof v === 'string')
        .flatMap((tagString) => tagString.split(',').map(tag => tag.trim()))
        .filter(tag => tag.length > 0)
        .map(tag => stripHtml(tag));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Redistribute combined AI response data to individual files
 * 
 * @param combinedResponse - The combined AI response with sourceFileIndex in categories/items
 * @param fileMappings - Array of {uid, index} for each file (index = sourceFileIndex)
 * @returns Map of fileUid -> ExtractedData for that file
 */
export function redistributeExtractedData(
    combinedResponse: CombinedAIResponse,
    fileMappings: FileMapping[]
): Map<string, ExtractedData> {
    const logger = functions.logger;
    const result = new Map<string, ExtractedData>();

    if (!combinedResponse?.data) {
        logger.warn('[redistributeExtractedData] No data in combined response');
        return result;
    }

    const { languages = [], categories = [], items = [], fileMessages = [] } = combinedResponse.data;

    // Create map of fileIndex -> fileMessages for that file
    const fileMessagesMap = new Map<number, FileMessage[]>();
    fileMessages.forEach(msg => {
        const existing = fileMessagesMap.get(msg.sourceFileIndex) || [];
        fileMessagesMap.set(msg.sourceFileIndex, [...existing, msg]);
    });

    // Create a map of categoryId -> sourceFileIndex for items that reference categories
    const categoryToFileIndex = new Map<number | string, number>();
    categories.forEach((cat) => {
        if (cat.sourceFileIndex !== undefined) {
            categoryToFileIndex.set(cat.id, cat.sourceFileIndex);
        }
    });

    // Initialize extractedData for each file
    fileMappings.forEach(({ uid, index }) => {
        // Filter categories for this file
        const fileCategories = categories
            .filter(cat => cat.sourceFileIndex === index)
            .map(cat => {
                // Remove sourceFileIndex from the output
                const { sourceFileIndex, ...categoryWithoutSource } = cat;
                return categoryWithoutSource as ExtractedDataCategory;
            });

        // Filter items for this file
        // An item belongs to a file if:
        // 1. It has sourceFileIndex matching this file, OR
        // 2. Its category belongs to this file (fallback if sourceFileIndex missing)
        const fileItems: ExtractedDataItem[] = items
            .filter(item => {
                if (item.sourceFileIndex !== undefined) {
                    return item.sourceFileIndex === index;
                }
                // Fallback: check if item's category or categoryId belongs to this file
                const categoryRef = item.category || item.categoryId;
                const catFileIndex = categoryToFileIndex.get(categoryRef as string | number);
                return catFileIndex === index;
            })
            .map(item => {
                const { sourceFileIndex, tags, categoryId, attributes: rawAttributes, price: rawPrice, ...rest } = item;

                // Use category if valid, otherwise fall back to categoryId
                const resolvedCategory = (rest.category && rest.category !== 'undefined' && rest.category !== undefined)
                    ? rest.category
                    : categoryId;

                // Normalize attributes: only keep if it's a non-empty array
                const normalizedAttributes = Array.isArray(rawAttributes) && rawAttributes.length > 0
                    ? rawAttributes.map(attr => ({
                        id: String(attr.id),
                        name: sanitizeMultilingualObject(attr.name),
                        price: attr.price != null && attr.price !== '' ? String(attr.price) : '',
                        active: attr.active !== false
                    }))
                    : [];

                // Normalize tags: ensure it's an array or undefined
                const normalizedTags = normalizeTags(tags);

                // Normalize price: ensure it's a string (AI may return number or string)
                const normalizedPrice = rawPrice != null && rawPrice !== '' ? String(rawPrice) : '';

                return {
                    ...rest,
                    id: String(rest.id),
                    category: String(resolvedCategory || ''),
                    name: sanitizeMultilingualObject(rest.name),
                    description: rest.description ? sanitizeMultilingualObject(rest.description) : undefined,
                    price: normalizedPrice,
                    tags: Array.isArray(normalizedTags) && normalizedTags.length > 0 ? normalizedTags : undefined,
                    attributes: normalizedAttributes,
                    active: rest.active !== false
                };
            });

        // Get fileMessages for this file (by sourceFileIndex)
        const fileProcessingMessages = fileMessagesMap.get(index) || [];

        // Create extractedData for this file
        const extractedData: ExtractedData = {
            message: fileCategories.length > 0 || fileItems.length > 0
                ? ''
                : combinedResponse.message || '',
            // Only include processingMessages if there are any
            processingMessages: fileProcessingMessages.length > 0 ? fileProcessingMessages : undefined,
            data: {
                languages: languages.map(lang => ({
                    name: lang.name,
                    code: lang.code,
                    isPrimary: lang.isPrimary || false
                })),
                categories: fileCategories,
                items: fileItems
            }
        };

        result.set(uid, extractedData);
    });

    logger.info('[redistributeExtractedData] Redistributed data', {
        totalCategories: categories.length,
        totalItems: items.length,
        filesProcessed: fileMappings.length,
        distribution: fileMappings.map(({ uid, index }) => ({
            fileIndex: index,
            categories: result.get(uid)?.data?.categories?.length || 0,
            items: result.get(uid)?.data?.items?.length || 0
        }))
    });

    return result;
}

/**
 * Transform IDs in redistributed data to include file UID prefix
 * 
 * MUST match the existing transformDataIds function in utils.ts:
 * - Category ID: `${fileId}c${originalId}` (e.g., file123c1, file123c2)
 * - Item ID: `${fileId}i${originalId}` (e.g., file123i1, file123i2)
 * - Attribute ID: `${itemId}a${originalId}` (e.g., file123i1a1)
 * - All get active = true
 * 
 * @param extractedData - The extracted data for a single file
 * @param fileUid - The file's UID to use as prefix
 * @param existingCategories - Optional map of categoryName -> existingCategoryId (Section 8.12)
 * @returns ExtractedData with transformed IDs
 */
export function transformIdsForFile(
    extractedData: ExtractedData,
    fileUid: string,
    existingCategories?: Map<string, string>  // NEW: Map<categoryName, existingCategoryId>
): ExtractedData {
    if (!extractedData?.data) return extractedData;

    // Create ID mapping: old ID -> new prefixed ID
    const categoryIdMap: Record<string | number, string> = {};

    // Get primary language for category name comparison
    const primaryLang = Object.keys(extractedData.data.categories?.[0]?.name || {})[0] || 'en';

    // Track which categories already exist (to filter them out)
    const existingCategoryIds = new Set<string>();

    // Process categories - check existing first
    let newCategoryCounter = 1;
    extractedData.data.categories?.forEach((cat) => {
        const oldId = cat.id;
        const categoryName = cat.name[primaryLang]?.toLowerCase().trim();

        // Check if this category already exists in project
        if (existingCategories?.has(categoryName)) {
            // USE existing category ID (don't transform)
            const existingId = existingCategories.get(categoryName)!;
            categoryIdMap[oldId] = existingId;
            existingCategoryIds.add(String(oldId));
        } else {
            // NEW category - transform with file UID
            categoryIdMap[oldId] = `${fileUid}c${newCategoryCounter++}`;
        }
    });

    // Filter out categories that already exist (they don't need to be created again)
    const transformedCategories = extractedData.data.categories?.filter((cat) => {
        return !existingCategoryIds.has(String(cat.id));
    }).map((cat) => ({
        ...cat,
        id: categoryIdMap[cat.id],
        active: true
    })) || [];

    // Transform item IDs and category references
    const transformedItems = extractedData.data.items?.map((item) => {
        const newItemId = `${fileUid}i${item.id}`;
        // Update the category reference using the mapping
        const newCategoryId = item.category !== undefined
            ? categoryIdMap[item.category] || item.category
            : item.category;

        const {
            attributes: rawAttributes,
            tags: rawTags,
            price: rawPrice,
            // Owner-confirmed fields must not be created by image extraction.
            allergens: _allergens,
            nutritionInfo: _nutritionInfo,
            materials: _materials,
            warranty: _warranty,
            skillLevel: _skillLevel,
            targetAudience: _targetAudience,
            decisionFacts: _decisionFacts,
            ...restItem
        } = item as ExtractedDataItem & Record<string, unknown>;

        // Transform attribute IDs
        const transformedAttributes = Array.isArray(rawAttributes)
            ? rawAttributes.map((attr) => ({
                ...attr,
                id: `${newItemId}a${attr.id}`,
                active: true
            }))
            : [];

        // Normalize price: ensure it's a string (AI may return number or string)
        const normalizedPrice = rawPrice != null && rawPrice !== '' ? String(rawPrice) : '';

        return {
            ...restItem,
            id: newItemId,
            category: newCategoryId,
            price: normalizedPrice,
            active: true,
            available: true, // Feature #2: Instant Availability - default to available
            attributes: transformedAttributes,
            ...(Array.isArray(rawTags) && rawTags.length > 0 ? { tags: rawTags } : {})
        };
    }) || [];

    return {
        ...extractedData,
        data: {
            ...extractedData.data,
            categories: transformedCategories,
            items: transformedItems
        }
    };
}

/**
 * Check if AI response has sourceFileIndex (parallel processing format)
 */
export function hasSourceFileIndex(response: CombinedAIResponse): boolean {
    const categories = response?.data?.categories || [];
    const items = response?.data?.items || [];

    // Check if at least one category or item has sourceFileIndex
    const categoryHasIndex = categories.some(cat => cat.sourceFileIndex !== undefined);
    const itemHasIndex = items.some(item => item.sourceFileIndex !== undefined);

    return categoryHasIndex || itemHasIndex;
}

/**
 * Process parallel AI response and distribute to files
 * Complete workflow: redistribute + transform IDs
 * 
 * @param combinedResponse - Combined AI response with sourceFileIndex
 * @param files - Array of files that were processed (must have uid property)
 * @param existingCategories - Optional map of categoryName -> existingCategoryId (Section 8.12)
 * @returns Map of fileUid -> ExtractedData for that file
 */
export function processParallelResponse(
    combinedResponse: CombinedAIResponse,
    files: Array<{ uid: string;[key: string]: any }>,
    existingCategories?: Map<string, string>
): Map<string, ExtractedData> {
    // Create file mappings (index = order files were sent to AI)
    const fileMappings: FileMapping[] = files.map((file, index) => ({
        uid: file.uid,
        index
    }));

    // Redistribute data to individual files
    const redistributedData = redistributeExtractedData(combinedResponse, fileMappings);

    // Transform IDs for each file
    const result = new Map<string, ExtractedData>();

    redistributedData.forEach((extractedData, fileUid) => {
        const transformed = transformIdsForFile(extractedData, fileUid, existingCategories);
        result.set(fileUid, {
            ...transformed,
            qualityScore: combinedResponse.qualityScore,
            qualityDetails: combinedResponse.qualityDetails
        });
    });

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-FILE CATEGORY & AUTO-MERGE HELPERS (Section 8.12 & 8.13)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Project file type (simplified for server-side use)
 */
export interface ProjectFile {
    uid?: string;
    extractedData?: ExtractedData | null;
}

/**
 * Build map of existing categories from project files
 * Used to preserve cross-file category references (Section 8.12)
 * 
 * @param files - Existing project files
 * @param primaryLang - Primary language code for name comparison
 * @returns Map of categoryName (lowercase) -> existingCategoryId
 */
export function buildExistingCategoriesMap(
    files: ProjectFile[],
    primaryLang: string
): Map<string, string> {
    const existingCategories = new Map<string, string>();

    files?.forEach(file => {
        file.extractedData?.data?.categories?.forEach(cat => {
            const categoryName = cat.name[primaryLang]?.toLowerCase().trim();
            if (categoryName && !existingCategories.has(categoryName)) {
                existingCategories.set(categoryName, cat.id);
            }
        });
    });

    return existingCategories;
}

/**
 * Auto-merge new items with existing items in a category.
 * Items with same name in same category are REPLACED (Section 8.13).
 *
 * @param existingItems - Items already in the project
 * @param newItems - Items from new upload (after ID transformation)
 * @param primaryLang - Primary language for name comparison
 * @returns Merged items array with statistics
 */
export function autoMergeItems(
    existingItems: ExtractedDataItem[],
    newItems: ExtractedDataItem[],
    primaryLang: string
): {
    mergedItems: ExtractedDataItem[];
    replacedCount: number;
    addedCount: number;
} {
    // Create a map of existing items by category + name
    const existingItemsMap = new Map<string, ExtractedDataItem>();
    existingItems.forEach(item => {
        const itemName = item.name[primaryLang]?.toLowerCase().trim();
        const key = `${item.category}|${itemName}`;
        existingItemsMap.set(key, item);
    });

    let replacedCount = 0;
    let addedCount = 0;

    // Process new items
    newItems.forEach(newItem => {
        const itemName = newItem.name[primaryLang]?.toLowerCase().trim();
        const key = `${newItem.category}|${itemName}`;

        if (existingItemsMap.has(key)) {
            // REPLACE: Keep existing ID, update all other fields
            const existingItem = existingItemsMap.get(key)!;
            existingItemsMap.set(key, {
                ...newItem,
                id: existingItem.id,  // Preserve existing ID for stability
                active: true,
                available: true // Feature #2: Instant Availability
            });
            replacedCount++;
        } else {
            // ADD: New item
            existingItemsMap.set(key, {
                ...newItem,
                active: true,
                available: true // Feature #2: Instant Availability
            });
            addedCount++;
        }
    });

    return {
        mergedItems: Array.from(existingItemsMap.values()),
        replacedCount,
        addedCount
    };
}
