/**
 * Projects Utils - Lightweight Core Functions
 * 
 * OPTIMIZED: Heavy dependencies (pdfjs-dist, ExcelJS) moved to separate files
 * - PDF: ./utils/pdfUtils.ts (lazy loaded)
 * - Excel: ./utils/excelUtils.ts (lazy loaded)
 * - Styling: ./utils/styleUtils.ts (lightweight)
 */

import { generateOwnCustomUid } from '@lib/utils/generateOwnCustomUid';
import DOMPurify from 'isomorphic-dompurify';
import { ExtractedDataAttribute, ExtractedDataCategory, ExtractedDataItem } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════

export const sanitizeUserInput = (input: string, allowHTML: boolean = false): string => {
    if (!input) return '';

    if (!allowHTML) {
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: [],
            KEEP_CONTENT: true,
        });
    }

    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'p'],
        ALLOWED_ATTR: [],
    });
};

export const generateMenuFileUid = (tenantId: string | number, storeId: string | number): string => {
    return generateOwnCustomUid(tenantId, storeId);
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

export const transformForSingleLanguage = (data: any, langCode: string) => {
    return {
        ...data,
        categories: data.categories.map((category: any) => ({
            ...category,
            name: category.name?.[langCode] || ''
        })),
        items: data.items.map((item: any) => {
            const transformed = {
                ...item,
                name: item.name?.[langCode] || '',
                description: item.description?.[langCode] || ''
            };

            if (item.attributes) {
                transformed.attributes = item.attributes.map((attr: any) => ({
                    ...attr,
                    name: attr.name?.[langCode] || ''
                }));
            }

            return transformed;
        })
    };
};

export const transformDataIds = (extractedData: any, fileId: string) => {
    const data = extractedData.data;

    if (!data || Object.keys(data).length === 0) return extractedData;

    // Create a mapping of old category IDs to new ones
    const categoryIdMap: Record<string, string> = {};
    data?.categories?.forEach((category: ExtractedDataCategory) => {
        const oldId = category.id;
        const newId = `${fileId}-c${oldId}`;
        categoryIdMap[oldId] = newId;
        category.id = newId;
        category.active = true;
    });

    // Update item IDs and their category references
    data?.items?.forEach((item: ExtractedDataItem) => {
        item.id = `${fileId}-i${item.id}`;
        // Update the category reference using the mapping
        if (item.category !== undefined) {
            item.category = categoryIdMap[item.category];
        }
        item.active = true;
        // Update attribute IDs
        if (item.attributes && Array.isArray(item.attributes)) {
            item.attributes.forEach((attr: ExtractedDataAttribute) => {
                attr.id = `${item.id}-a${attr.id}`;
                attr.active = true;
            });
        }
    });

    return { ...extractedData, data };
};

export const handleUpdateValue = (file: any, id: string, newValue: string) => {
    const extractedData = { ...file.extractedData };

    if (id.startsWith('category-')) {
        const categories = extractedData?.data?.categories || [];
        const categoryMatch = categories
            .map((candidate: any) => ({ candidate, prefix: `category-${candidate.id}-` }))
            .filter(({ prefix }: { prefix: string }) => id.startsWith(prefix))
            .sort((left: { prefix: string }, right: { prefix: string }) => right.prefix.length - left.prefix.length)[0];
        if (!categoryMatch) return { ...file, extractedData };
        const category = categoryMatch.candidate;
        const lang = id.slice(categoryMatch.prefix.length);
        if (!lang) return { ...file, extractedData };
        const safeValue = sanitizeUserInput(newValue, false);
        extractedData.data = {
            ...extractedData.data,
            categories: categories.map((cat: any) => {
                if (cat.id === category.id) {
                    return {
                        ...cat,
                        name: {
                            ...cat.name,
                            [lang]: safeValue
                        }
                    };
                }
                return cat;
            })
        };
    } else if (id.startsWith('item-')) {
        const items = extractedData?.data?.items || [];
        const itemMatch = items
            .map((candidate: any) => ({ candidate, prefix: `item-${candidate.category}-${candidate.id}-` }))
            .filter(({ prefix }: { prefix: string }) => id.startsWith(prefix))
            .sort((left: { prefix: string }, right: { prefix: string }) => right.prefix.length - left.prefix.length)[0];
        if (!itemMatch) return { ...file, extractedData };
        const item = itemMatch.candidate;
        const itemField = id.slice(itemMatch.prefix.length);

        extractedData.data = {
            ...extractedData.data,
            items: items.map((candidate: any) => {
                if (candidate.id !== item.id || candidate.category !== item.category) return candidate;

                if (itemField === 'price') {
                    return { ...candidate, price: newValue };
                }

                if (itemField.startsWith('attr-')) {
                    const attributes = candidate.attributes || [];
                    const attributeMatch = attributes
                        .map((attr: any) => ({ attr, prefix: `attr-${attr.id}-` }))
                        .filter(({ prefix }: { prefix: string }) => itemField.startsWith(prefix))
                        .sort((left: { prefix: string }, right: { prefix: string }) => right.prefix.length - left.prefix.length)[0];
                    if (!attributeMatch) return candidate;
                    const attribute = attributeMatch.attr;
                    const attributeField = itemField.slice(attributeMatch.prefix.length);
                    return {
                        ...candidate,
                        attributes: attributes.map((attr: any) => {
                            if (attr.id !== attribute.id) return attr;
                            if (attributeField === 'price') return { ...attr, price: newValue };
                            if (!attributeField) return attr;
                            return {
                                ...attr,
                                name: {
                                    ...attr.name,
                                    [attributeField]: sanitizeUserInput(newValue, false),
                                },
                            };
                        }),
                    };
                }

                if (itemField.startsWith('desc-')) {
                    const lang = itemField.slice('desc-'.length);
                    if (!lang) return candidate;
                    return {
                        ...candidate,
                        description: {
                            ...candidate.description,
                            [lang]: sanitizeUserInput(newValue, true),
                        },
                    };
                }

                if (itemField.startsWith('name-')) {
                    const lang = itemField.slice('name-'.length);
                    if (!lang) return candidate;
                    return {
                        ...candidate,
                        name: {
                            ...candidate.name,
                            [lang]: sanitizeUserInput(newValue, false),
                        },
                    };
                }

                return candidate;
            }),
        };
    }

    return ({ ...file, extractedData });
};

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FROM MODULAR FILES
// For backwards compatibility - prefer direct imports for optimal bundle size
// ═══════════════════════════════════════════════════════════════════════════

// Styling utilities (lightweight, safe to import)
export {
    getBackgroundStyles,
    getBorderStyles, getResponsiveFontSize, getTextStyles, makeLighterColor
} from './utils/styleUtils';

// Excel utilities (ExcelJS lazy loaded internally)
export { getOutputJson, handleDownload } from './utils/excelUtils';

// Note: PDF utilities should be dynamically imported:
// const { convertPdfToImages } = await import('./utils/pdfUtils')
