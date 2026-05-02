/**
 * Redistribute Extracted Data - Client-Side Port
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 9.4
 * 
 * This is a client-side port of the server's redistributeUtils.ts for use
 * during re-extraction comparison. The logic is identical, only the logging
 * and environment differ.
 * 
 * Original: functions/src/logic/redistributeUtils.ts
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExtractedDataCategory {
    id: string;
    name: Record<string, string>;
    description?: Record<string, string>;
    icon?: string;
    active?: boolean;
    timeWindows?: string[];
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
    active?: boolean;
    available?: boolean;
}

export interface ExtractedDataLanguage {
    name: string;
    code: string;
    isPrimary?: boolean;
}

export interface ExtractedData {
    message?: string;
    processingMessages?: Array<{
        type: string;
        subType?: string;
        sourceFileIndex: number;
        message?: string;
    }>;
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

interface RawItemFromAI {
    id: string | number;
    name: Record<string, string>;
    category?: string | number;
    categoryId?: string | number;
    description?: Record<string, string> | string; // AI may return plain string
    price?: string | number; // AI may return number (e.g., 300) or string (e.g., "300")
    attributes?: Array<{ id: string | number; name: Record<string, string> | string; price?: string | number; active?: boolean }> | Record<string, any>;
    tags?: string[] | Record<string, string>;
    active?: boolean;
    sourceFileIndex?: number;
}

export interface CombinedAIResponse {
    message?: string;
    data?: {
        languages?: Array<{ name: string; code: string; isPrimary?: boolean }>;
        categories?: CategoryWithSource[];
        items?: RawItemFromAI[];
        fileMessages?: Array<{
            type: string;
            subType?: string;
            sourceFileIndex: number;
            message?: string;
        }>;
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
    index: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SANITIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function stripHtml(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '');
}

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
 * CLIENT-SIDE PORT: Same logic as server, uses console.log instead of functions.logger
 */
export function redistributeExtractedData(
    combinedResponse: CombinedAIResponse,
    fileMappings: FileMapping[]
): Map<string, ExtractedData> {
    const result = new Map<string, ExtractedData>();

    if (!combinedResponse?.data) {
        console.warn('[redistribute] No data in combined response');
        return result;
    }

    const { languages = [], categories = [], items = [], fileMessages = [] } = combinedResponse.data;

    // Create map of fileIndex -> fileMessages
    const fileMessagesMap = new Map<number, typeof fileMessages>();
    fileMessages.forEach(msg => {
        const existing = fileMessagesMap.get(msg.sourceFileIndex) || [];
        fileMessagesMap.set(msg.sourceFileIndex, [...existing, msg]);
    });

    // Create map of categoryId -> sourceFileIndex
    const categoryToFileIndex = new Map<number | string, number>();
    categories.forEach((cat) => {
        if (cat.sourceFileIndex !== undefined) {
            categoryToFileIndex.set(cat.id, cat.sourceFileIndex);
        }
    });

    // Process each file
    fileMappings.forEach(({ uid, index }) => {
        // Filter categories for this file
        const fileCategories = categories
            .filter(cat => cat.sourceFileIndex === index)
            .map(cat => {
                const { sourceFileIndex, ...categoryWithoutSource } = cat;
                return categoryWithoutSource as ExtractedDataCategory;
            });

        // Filter items for this file
        const fileItems: ExtractedDataItem[] = items
            .filter(item => {
                if (item.sourceFileIndex !== undefined) {
                    return item.sourceFileIndex === index;
                }
                const categoryRef = item.category || item.categoryId;
                const catFileIndex = categoryToFileIndex.get(categoryRef as string | number);
                return catFileIndex === index;
            })
            .map(item => {
                const { sourceFileIndex, tags, categoryId, attributes: rawAttributes, price: rawPrice, ...rest } = item;

                const resolvedCategory = (rest.category && rest.category !== 'undefined' && rest.category !== undefined)
                    ? rest.category
                    : categoryId;

                const normalizedAttributes = Array.isArray(rawAttributes) && rawAttributes.length > 0
                    ? rawAttributes.map(attr => ({
                        id: String(attr.id),
                        name: sanitizeMultilingualObject(attr.name),
                        price: attr.price != null && attr.price !== '' ? String(attr.price) : '',
                        active: attr.active !== false
                    }))
                    : [];

                const normalizedTags = normalizeTags(tags);
                const normalizedPrice = rawPrice != null && rawPrice !== '' ? String(rawPrice) : '';

                return {
                    ...rest,
                    id: String(rest.id),
                    category: String(resolvedCategory || ''),
                    name: sanitizeMultilingualObject(rest.name),
                    description: rest.description ? sanitizeMultilingualObject(rest.description, true) : undefined,
                    price: normalizedPrice,
                    tags: Array.isArray(normalizedTags) && normalizedTags.length > 0 ? normalizedTags : undefined,
                    attributes: normalizedAttributes,
                    active: rest.active !== false
                };
            });

        const fileProcessingMessages = fileMessagesMap.get(index) || [];

        const extractedData: ExtractedData = {
            message: fileCategories.length > 0 || fileItems.length > 0 ? '' : combinedResponse.message || '',
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

    console.log('[redistribute] Redistributed data', {
        totalCategories: categories.length,
        totalItems: items.length,
        filesProcessed: fileMappings.length,
    });

    return result;
}

/**
 * Transform IDs in extracted data to include file UID prefix
 * 
 * CLIENT-SIDE PORT: Same logic as server
 */
export function transformIdsForFile(
    extractedData: ExtractedData,
    fileUid: string,
    existingCategories?: Map<string, string>
): ExtractedData {
    if (!extractedData?.data) return extractedData;

    const categoryIdMap: Record<string | number, string> = {};
    const primaryLang = Object.keys(extractedData.data.categories?.[0]?.name || {})[0] || 'en';
    const existingCategoryIds = new Set<string>();

    let newCategoryCounter = 1;
    extractedData.data.categories?.forEach((cat) => {
        const oldId = cat.id;
        const categoryName = cat.name[primaryLang]?.toLowerCase().trim();

        if (existingCategories?.has(categoryName)) {
            const existingId = existingCategories.get(categoryName)!;
            categoryIdMap[oldId] = existingId;
            existingCategoryIds.add(String(oldId));
        } else {
            categoryIdMap[oldId] = `${fileUid}c${newCategoryCounter++}`;
        }
    });

    const transformedCategories = extractedData.data.categories?.filter((cat) => {
        return !existingCategoryIds.has(String(cat.id));
    }).map((cat) => ({
        ...cat,
        id: categoryIdMap[cat.id],
        active: true
    })) || [];

    const transformedItems = extractedData.data.items?.map((item) => {
        const newItemId = `${fileUid}i${item.id}`;
        const newCategoryId = item.category !== undefined
            ? categoryIdMap[item.category] || item.category
            : item.category;

        const { attributes: rawAttributes, tags: rawTags, price: rawPrice, ...restItem } = item;

        const transformedAttributes = Array.isArray(rawAttributes)
            ? rawAttributes.map((attr) => ({
                ...attr,
                id: `${newItemId}a${attr.id}`,
                active: true
            }))
            : [];

        const normalizedPrice = rawPrice != null && rawPrice !== '' ? String(rawPrice) : '';

        return {
            ...restItem,
            id: newItemId,
            category: newCategoryId,
            price: normalizedPrice,
            active: true,
            available: true,
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
 * Process parallel AI response - redistribute and transform IDs
 */
export function processParallelResponse(
    combinedResponse: CombinedAIResponse,
    files: Array<{ uid: string;[key: string]: any }>,
    existingCategories?: Map<string, string>
): Map<string, ExtractedData> {
    const fileMappings: FileMapping[] = files.map((file, index) => ({
        uid: file.uid,
        index
    }));

    const redistributedData = redistributeExtractedData(combinedResponse, fileMappings);

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

/**
 * Build map of existing categories from project files
 */
export function buildExistingCategoriesMap(
    files: Array<{ uid?: string; extractedData?: ExtractedData | null }>,
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
 * Generate a unique ID for local-only items/categories
 */
export function generateLocalId(): string {
    return Math.random().toString(36).substring(2, 11);
}

/**
 * Generate local-only item ID (L_I_ prefix)
 */
export function generateLocalItemId(): string {
    return `L_I_${generateLocalId()}`;
}

/**
 * Generate local-only category ID (L_C_ prefix)
 */
export function generateLocalCategoryId(): string {
    return `L_C_${generateLocalId()}`;
}

export default {
    redistributeExtractedData,
    transformIdsForFile,
    processParallelResponse,
    buildExistingCategoriesMap,
    generateLocalItemId,
    generateLocalCategoryId,
};
