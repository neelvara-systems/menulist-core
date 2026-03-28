/**
 * Redistribute Combined AI Response to Individual Files
 * 
 * When parallel processing returns combined data with sourceFileIndex,
 * this utility splits it back into per-file extractedData to maintain
 * compatibility with the existing Editor UI.
 * 
 * Flow:
 * 1. AI returns: { categories: [{sourceFileIndex: 0, ...}, {sourceFileIndex: 1, ...}], items: [...] }
 * 2. This function splits by sourceFileIndex
 * 3. Each file gets its own extractedData with only its categories/items
 */

import DOMPurify from 'isomorphic-dompurify';
import { ExtractedData, ExtractedDataCategory, ExtractedDataItem } from '../types';

interface CategoryWithSource extends ExtractedDataCategory {
    sourceFileIndex?: number;
}

// Raw item from AI may have tags as multilingual object
interface RawItemFromAI {
    id: string | number;
    name: Record<string, string>;
    category?: string | number; // May be undefined if AI uses categoryId
    categoryId?: string | number; // AI sometimes returns this instead of category
    description?: Record<string, string> | string; // AI may return plain string
    price?: string | number; // AI may return number (e.g., 300) or string (e.g., "300")
    attributes?: Array<{ id: string | number; name: Record<string, string> | string; price?: string | number; active?: boolean }> | Record<string, any>; // Can be array or object
    tags?: string[] | Record<string, string>; // AI can return either format
    active?: boolean;
    sourceFileIndex?: number;
    // Decision Intelligence fields
    duration?: number; // Time in minutes (prep time for food, service duration for others)
}

// ============================================================================
// SANITIZATION HELPERS (Match aiResponseUtils.ts)
// ============================================================================

/**
 * Sanitize a multilingual object (removes HTML and XSS)
 */
function sanitizeMultilingualObject(
    obj: Record<string, string> | string | undefined | null,
    allowedTags: string[] = []
): Record<string, string> {
    if (!obj) return {};
    // Defensive: AI may return a plain string instead of multilingual object
    if (typeof obj === 'string') return { en: DOMPurify.sanitize(obj, { ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: [] }) };
    if (typeof obj !== 'object') return {};
    const sanitized: Record<string, string> = {};
    for (const [lang, text] of Object.entries(obj)) {
        if (typeof text === 'string') {
            sanitized[lang] = DOMPurify.sanitize(text, {
                ALLOWED_TAGS: allowedTags,
                ALLOWED_ATTR: []
            });
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
            .map(tag => typeof tag === 'string' ? DOMPurify.sanitize(tag, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) : String(tag))
            .filter(tag => tag.length > 0);
    }

    if (typeof tags !== 'object') return undefined;

    // It's a multilingual object - extract values and split by comma
    return Object.values(tags)
        .filter((v): v is string => typeof v === 'string')
        .flatMap((tagString) => tagString.split(',').map(tag => tag.trim()))
        .filter(tag => tag.length > 0)
        .map(tag => DOMPurify.sanitize(tag, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }));
}

interface CombinedAIResponse {
    message?: string;
    data?: {
        languages?: Array<{ name: string; code: string; isPrimary?: boolean }>;
        categories?: CategoryWithSource[];
        items?: RawItemFromAI[];
    };
    qualityScore?: number;
    qualityDetails?: any;
}

interface FileMapping {
    uid: string;
    index: number; // 0-based index matching sourceFileIndex
}

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
    const result = new Map<string, ExtractedData>();

    if (!combinedResponse?.data) {
        console.warn('[redistributeExtractedData] No data in combined response');
        return result;
    }

    const { languages = [], categories = [], items = [] } = combinedResponse.data;

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
                // Remove sourceFileIndex from the output (Editor doesn't need it)
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
                // Remove sourceFileIndex and normalize/sanitize (matches aiResponseUtils.ts)
                // Destructure all fields that need normalization to prevent empty {} from spreading
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
                        price: attr.price != null && attr.price !== '' ? String(attr.price) : '', // Ensure price is always string (AI may return number)
                        active: attr.active !== false
                    }))
                    : []; // Use empty array instead of undefined to match sequential format

                // Normalize tags: ensure it's an array or undefined, never empty object
                const normalizedTags = normalizeTags(tags);

                // Normalize price: ensure it's a string (AI may return number or string)
                const normalizedPrice = rawPrice != null && rawPrice !== '' ? String(rawPrice) : '';

                // Extract duration if AI provided it (from menu text like "Ready in 5 min")
                const duration = typeof item.duration === 'number' ? item.duration : undefined;

                return {
                    ...rest,
                    id: String(rest.id), // Ensure string type
                    category: String(resolvedCategory || ''), // Use resolved category
                    name: sanitizeMultilingualObject(rest.name),
                    description: rest.description ? sanitizeMultilingualObject(rest.description, ['b', 'i']) : undefined,
                    price: normalizedPrice, // Explicitly set normalized price
                    tags: Array.isArray(normalizedTags) && normalizedTags.length > 0 ? normalizedTags : undefined,
                    attributes: normalizedAttributes,
                    active: rest.active !== false,
                    available: true, // Default to available
                    duration, // Prep time / service duration in minutes (Decision Intelligence)
                };
            });

        // Create extractedData for this file
        const extractedData: ExtractedData = {
            message: fileCategories.length > 0 || fileItems.length > 0
                ? ''
                : combinedResponse.message || '',
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

    console.log('[redistributeExtractedData] Redistributed data:', {
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
 * @returns ExtractedData with transformed IDs
 */
export function transformIdsForFile(
    extractedData: ExtractedData,
    fileUid: string
): ExtractedData {
    if (!extractedData?.data) return extractedData;

    // Create ID mapping: old ID -> new prefixed ID (matches utils.ts)
    const categoryIdMap: Record<string | number, string> = {};

    // Transform category IDs (matches transformDataIds in utils.ts)
    const transformedCategories = extractedData.data.categories?.map((cat) => {
        const oldId = cat.id;
        const newId = `${fileUid}c${oldId}`;
        categoryIdMap[oldId] = newId;
        return {
            ...cat,
            id: newId,
            active: true // Always set active to true (matches existing)
        };
    }) || [];

    // Transform item IDs and category references (matches transformDataIds in utils.ts)
    const transformedItems = extractedData.data.items?.map((item) => {
        const newItemId = `${fileUid}i${item.id}`;
        // Update the category reference using the mapping
        const newCategoryId = item.category !== undefined
            ? categoryIdMap[item.category] || item.category
            : item.category;

        // Destructure to exclude attributes, tags, and price from spread (prevent empty {} issues)
        const { attributes: rawAttributes, tags: rawTags, price: rawPrice, ...restItem } = item;

        // Transform attribute IDs - always return array (even empty) to match sequential format
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
            price: normalizedPrice, // Explicitly set normalized price
            active: true, // Always set active to true (matches existing)
            available: true, // Feature #2: Instant Availability - default to available
            attributes: transformedAttributes,
            // Only include tags if it's a non-empty array
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
 * @returns Map of fileUid -> ExtractedData for that file
 */
export function processParallelResponse(
    combinedResponse: CombinedAIResponse,
    files: Array<{ uid?: string | any;[key: string]: any }>
): Map<string, ExtractedData & { qualityScore?: number; qualityDetails?: any }> {
    // Create file mappings (index = order files were sent to AI)
    const fileMappings: FileMapping[] = files.map((file, index) => ({
        uid: file.uid,
        index
    }));

    // Redistribute data to individual files
    const redistributedData = redistributeExtractedData(combinedResponse, fileMappings);

    // Transform IDs for each file
    const result = new Map<string, ExtractedData & { qualityScore?: number; qualityDetails?: any }>();

    redistributedData.forEach((extractedData, fileUid) => {
        const transformed = transformIdsForFile(extractedData, fileUid);
        result.set(fileUid, {
            ...transformed,
            qualityScore: combinedResponse.qualityScore,
            qualityDetails: combinedResponse.qualityDetails
        });
    });

    return result;
}
