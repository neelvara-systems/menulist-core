/**
 * Redistribute Extracted Data - Client-Side Port
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 9.4
 * 
 * This is a client-side port of the server's redistributeUtils.ts for use
 * during re-extraction comparison.
 * 
 * Original: functions/src/logic/redistributeUtils.ts
 */
import { findInvalidMenuExtractionSourceIndexes } from '@data/shared/menuExtractionIntegrity';

import { logMenuProcessingFailure } from '@lib/firebase/menuProcessingDiagnostics';
import { createRandomIdSegment } from '@lib/runtime/randomId';

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
    dietaryTags?: string[];
    spiceLevel?: string;
    duration?: number;
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
    price?: string | number | null; // AI may return number (e.g., 300), string (e.g., "300"), or null
    attributes?: Array<{ id: string | number; name: Record<string, string> | string; price?: string | number | null; active?: boolean }> | Record<string, unknown>;
    tags?: string[] | Record<string, string>;
    dietaryTags?: string[];
    spiceLevel?: string;
    duration?: number;
    active?: boolean;
    sourceFileIndex?: number;
}

const SAFE_SPICE_LEVELS = new Set(['none', 'mild', 'medium', 'hot', 'very-hot']);

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
): Record<string, string> {
    if (!obj) return {};
    // Defensive: AI may return a plain string instead of multilingual object
    if (typeof obj === 'string') return { en: stripHtml(obj).replace(/\s+/g, ' ').trim().slice(0, 2000) };
    if (typeof obj !== 'object') return {};
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([lang, text]) => /^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(lang) && typeof text === 'string')
            .map(([lang, text]) => [lang, stripHtml(text).replace(/\s+/g, ' ').trim().slice(0, 2000)]),
    );
}

function normalizeTags(tags: string[] | Record<string, string> | undefined): string[] | undefined {
    if (!tags) return undefined;

    const sanitizeTagValue = (value: string): string | undefined => {
        const cleaned = stripHtml(value).trim().replace(/\s+/g, ' ');
        if (!cleaned) return undefined;
        if (/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
        return cleaned;
    };

    const pushUnique = (list: string[]) => {
        const seen = new Set<string>();
        return list.reduce((acc, candidate) => {
            if (!candidate) return acc;
            const normalized = candidate.trim();
            if (!normalized) return acc;
            const key = normalized.toLowerCase();
            if (seen.has(key)) return acc;
            seen.add(key);
            acc.push(normalized);
            return acc;
        }, [] as string[]);
    };

    if (Array.isArray(tags)) {
        // Defensive: AI may return non-string values in tag arrays
        return pushUnique(
            tags
                .map((tag) => typeof tag === 'string' ? sanitizeTagValue(tag) : undefined)
                .filter((tag): tag is string => typeof tag === 'string' && tag.length > 0),
        );
    }

    if (typeof tags !== 'object') return undefined;

    // It's a multilingual object - extract values and split by comma
    return pushUnique(
        Object.values(tags)
        .filter((v): v is string => typeof v === 'string')
        .flatMap((tagString) => tagString.split(',').map(tag => sanitizeTagValue(tag)))
        .filter((tag): tag is string => tag !== undefined && tag.length > 0),
    );
}

function normalizeStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalized = value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => stripHtml(entry).trim().toLowerCase())
        .filter(Boolean);
    return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

function resolveRawItemCategory(item: RawItemFromAI): string | undefined {
    for (const value of [item.category, item.categoryId]) {
        if (typeof value === 'string') {
            const normalized = value.trim();
            if (normalized && normalized !== 'undefined') return normalized;
        } else if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
    }
    return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Redistribute combined AI response data to individual files
 * 
 * CLIENT-SIDE PORT: Same logic as server.
 */
export function redistributeExtractedData(
    combinedResponse: CombinedAIResponse,
    fileMappings: FileMapping[]
): Map<string, ExtractedData> {
    const result = new Map<string, ExtractedData>();

    if (!combinedResponse?.data) {
        logMenuProcessingFailure('menu_redistribute_missing_combined_data', undefined, {
            filesCount: fileMappings.length,
        });
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
    const categoryToFileIndex = new Map<string, number>();
    categories.forEach((cat) => {
        if (cat.sourceFileIndex !== undefined) {
            categoryToFileIndex.set(String(cat.id), cat.sourceFileIndex);
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
                const categoryRef = resolveRawItemCategory(item);
                const catFileIndex = categoryRef ? categoryToFileIndex.get(categoryRef) : undefined;
                return catFileIndex === index;
            })
            .map(item => {
                const {
                    sourceFileIndex,
                    tags,
                    categoryId,
                    attributes: rawAttributes,
                    price: rawPrice,
                    dietaryTags: rawDietaryTags,
                    spiceLevel: rawSpiceLevelValue,
                    duration: rawDuration,
                    ...rest
                } = item;

                const resolvedCategory = resolveRawItemCategory({ ...rest, categoryId });

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
                const dietaryTags = normalizeStringArray(rawDietaryTags);
                const duration = typeof rawDuration === 'number' && rawDuration > 0 ? rawDuration : undefined;
                const rawSpiceLevel = typeof rawSpiceLevelValue === 'string'
                    ? stripHtml(rawSpiceLevelValue).trim().toLowerCase()
                    : '';
                const spiceLevel = SAFE_SPICE_LEVELS.has(rawSpiceLevel)
                    ? rawSpiceLevel as 'none' | 'mild' | 'medium' | 'hot' | 'very-hot'
                    : undefined;

                return {
                    ...rest,
                    id: String(rest.id),
                    category: resolvedCategory || '',
                    name: sanitizeMultilingualObject(rest.name),
                    description: rest.description ? sanitizeMultilingualObject(rest.description) : undefined,
                    price: normalizedPrice,
                    tags: Array.isArray(normalizedTags) && normalizedTags.length > 0 ? normalizedTags : undefined,
                    ...(dietaryTags ? { dietaryTags } : {}),
                    ...(spiceLevel ? { spiceLevel } : {}),
                    ...(duration ? { duration } : {}),
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

    const categoryIdMap = new Map<string, string>();
    const primaryLang = Object.keys(extractedData.data.categories?.[0]?.name || {})[0] || 'en';
    const existingCategoryIds = new Set<string>();

    let newCategoryCounter = 1;
    extractedData.data.categories?.forEach((cat) => {
        const oldId = cat.id;
        const categoryName = cat.name[primaryLang]?.toLowerCase().trim();

        if (existingCategories?.has(categoryName)) {
            const existingId = existingCategories.get(categoryName)!;
            categoryIdMap.set(String(oldId), existingId);
            existingCategoryIds.add(String(oldId));
        } else {
            categoryIdMap.set(String(oldId), `${fileUid}c${newCategoryCounter++}`);
        }
    });

    const transformedCategories = extractedData.data.categories?.filter((cat) => {
        return !existingCategoryIds.has(String(cat.id));
    }).map((cat) => {
        const transformedId = categoryIdMap.get(String(cat.id));
        if (!transformedId) {
            throw new Error('MENU_EXTRACTION_CATEGORY_ID_MAPPING_MISSING');
        }
        return {
            ...cat,
            id: transformedId,
            active: true,
        };
    }) || [];

    const transformedItems = extractedData.data.items?.map((item) => {
        const newItemId = `${fileUid}i${item.id}`;
        const newCategoryId = item.category !== undefined
            ? categoryIdMap.get(String(item.category)) || item.category
            : item.category;

        const { attributes: rawAttributes, tags: rawTags, price: rawPrice, ...restItem } = item;
        const normalizedTags = normalizeTags(rawTags as string[] | Record<string, string> | undefined);

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
            ...(Array.isArray(normalizedTags) && normalizedTags.length > 0 ? { tags: normalizedTags } : {})
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
    files: Array<{ uid: string; [key: string]: unknown }>,
    existingCategories?: Map<string, string>
): Map<string, ExtractedData> {
    const categories = combinedResponse?.data?.categories || [];
    const items = combinedResponse?.data?.items || [];
    if (
        findInvalidMenuExtractionSourceIndexes(categories, files.length).length > 0
        || findInvalidMenuExtractionSourceIndexes(items, files.length).length > 0
    ) {
        throw new Error('MENU_EXTRACTION_SOURCE_INDEX_INVALID');
    }
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
    return createRandomIdSegment(9);
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
