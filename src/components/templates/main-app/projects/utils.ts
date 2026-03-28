/**
 * Projects Utils - Lightweight Core Functions
 * 
 * OPTIMIZED: Heavy dependencies (pdfjs-dist, ExcelJS) moved to separate files
 * - PDF: ./utils/pdfUtils.ts (lazy loaded)
 * - Excel: ./utils/excelUtils.ts (lazy loaded)
 * - Styling: ./utils/styleUtils.ts (lightweight)
 */

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
        const newId = `${fileId}c${oldId}`;
        categoryIdMap[oldId] = newId;
        category.id = newId;
        category.active = true;
    });

    // Update item IDs and their category references
    data?.items?.forEach((item: ExtractedDataItem) => {
        item.id = `${fileId}i${item.id}`;
        // Update the category reference using the mapping
        if (item.category !== undefined) {
            item.category = categoryIdMap[item.category];
        }
        item.active = true;
        // Update attribute IDs
        if (item.attributes && Array.isArray(item.attributes)) {
            item.attributes.forEach((attr: ExtractedDataAttribute) => {
                attr.id = `${item.id}a${attr.id}`;
                attr.active = true;
            });
        }
    });

    return { ...extractedData, data };
};

export const handleUpdateValue = (file: any, id: string, newValue: string) => {
    const extractedData = { ...file.extractedData };

    if (id.startsWith('category-')) {
        // Handle category name updates
        const [_, categoryId, lang] = id.split('-');
        const safeValue = sanitizeUserInput(newValue, false);
        extractedData.data = {
            ...extractedData.data,
            categories: extractedData?.data?.categories?.map((cat: any) => {
                if (cat.id == categoryId) {
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
        if (id.includes('-attr-')) {
            // Handle item attribute updates
            const parts = id.split('-');
            const itemId = parts[2];
            const attrId = parts[4];
            const isPrice = parts[5] === 'price';
            const lang = parts[5] !== 'price' ? parts[5] : '';

            extractedData.data = {
                ...extractedData.data,
                items: extractedData.data.items.map((item: any) => {
                    if (item.id == itemId) {
                        return {
                            ...item,
                            attributes: item.attributes.map((attr: any) => {
                                if (attr.id == attrId) {
                                    if (isPrice) {
                                        return {
                                            ...attr,
                                            price: newValue
                                        };
                                    } else {
                                        const safeAttrName = sanitizeUserInput(newValue, false);
                                        return {
                                            ...attr,
                                            name: {
                                                ...attr.name,
                                                [lang]: safeAttrName
                                            }
                                        };
                                    }
                                }
                                return attr;
                            })
                        };
                    }
                    return item;
                })
            };
        } else if (id.includes('-price')) {
            // Handle item price updates
            const [_, categoryId, itemId] = id.split('-');
            extractedData.data = {
                ...extractedData.data,
                items: extractedData.data.items.map((item: any) => {
                    if (item.id == itemId) {
                        return {
                            ...item,
                            price: newValue
                        };
                    }
                    return item;
                })
            };
        } else {
            // Handle item name or description updates
            const [_, categoryId, itemId, type, lang] = id.split('-');
            extractedData.data = {
                ...extractedData.data,
                items: extractedData.data.items.map((item: any) => {
                    if (item.id == itemId) {
                        if (type == 'desc') {
                            const safeDescription = sanitizeUserInput(newValue, true);
                            return {
                                ...item,
                                description: {
                                    ...item.description,
                                    [lang]: safeDescription
                                }
                            };
                        } else {
                            const safeName = sanitizeUserInput(newValue, false);
                            return {
                                ...item,
                                name: {
                                    ...item.name,
                                    [lang]: safeName
                                }
                            };
                        }
                    }
                    return item;
                })
            };
        }
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
