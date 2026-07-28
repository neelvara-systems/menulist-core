/**
 * Excel Export Utilities
 *
 * LAZY LOADED - ExcelJS is only imported when this module is used
 * Import this dynamically: const { handleDownload } = await import('./utils/excelUtils')
 */

import { Project } from '../types';
import {
    ExtractedDataAttribute,
    ExtractedDataCategory,
    ExtractedDataItem,
} from '../types/extractedData.types';

// Types for extracted data
interface LanguageType {
    code: string;
    name: string;
}

export interface MenuExportData {
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
    languages: string[];
}

export interface MenuExportOptions {
    filenameBase?: string;
}

const extractLanguageInfo = (languages: string[]): LanguageType[] => {
    return languages.map(lang => {
        const code = lang.match(/\((.*)\)/)?.[1] || lang;
        const name = lang.split(' (')[0] || lang;
        return { code, name };
    });
};

const dedupeById = <T extends { id: string }>(items: T[]): T[] => (
    Array.from(new Map(items.map(item => [item.id, item])).values())
);

const compareNullableNumber = (a?: number, b?: number): number => {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    return a - b;
};

const compareString = (a?: string, b?: string): number => (a || '').localeCompare(b || '');

const getLocalizedValue = (value: Record<string, string> | undefined, preferredLanguage?: string): string => {
    if (!value) return '';
    if (preferredLanguage && value[preferredLanguage]) return value[preferredLanguage];
    const firstKey = Object.keys(value)[0];
    return firstKey ? value[firstKey] || '' : '';
};

const sanitizeFilenamePart = (value?: string): string => {
    const normalized = (value || 'menu_data')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    return normalized || 'menu_data';
};

export const buildExportDataFromProject = (projectData: Project): MenuExportData => {
    const combinedData: MenuExportData = {
        categories: [],
        items: [],
        languages: projectData.languages || []
    };

    projectData.files?.forEach(file => {
        if (file.extractedData?.data) {
            const data = file.extractedData.data;
            if (data.categories) {
                combinedData.categories.push(...data.categories);
            }
            if (data.items) {
                combinedData.items.push(...data.items);
            }
        }
    });

    combinedData.categories = dedupeById(combinedData.categories);
    combinedData.items = dedupeById(combinedData.items);

    return combinedData;
};

const normalizeCategory = (category: ExtractedDataCategory): ExtractedDataCategory => ({
    ...category,
    active: category.active ?? true,
});

const normalizeAttribute = (attribute: ExtractedDataAttribute): ExtractedDataAttribute => ({
    ...attribute,
    price: attribute.price || '',
    active: attribute.active ?? true,
});

const normalizeItem = (item: ExtractedDataItem): ExtractedDataItem => ({
    ...item,
    active: item.active ?? true,
    available: item.available ?? true,
    attributes: item.attributes?.map(normalizeAttribute),
});

const sortCategories = (categories: ExtractedDataCategory[], preferredLanguage?: string): ExtractedDataCategory[] => (
    [...categories].sort((a, b) => {
        const orderComparison = compareNullableNumber(a.orderIndex, b.orderIndex);
        if (orderComparison !== 0) return orderComparison;

        const nameComparison = compareString(
            getLocalizedValue(a.name, preferredLanguage),
            getLocalizedValue(b.name, preferredLanguage),
        );
        if (nameComparison !== 0) return nameComparison;

        return compareString(a.id, b.id);
    })
);

const sortItems = (
    items: ExtractedDataItem[],
    categories: ExtractedDataCategory[],
    preferredLanguage?: string,
): ExtractedDataItem[] => {
    const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));

    return [...items].sort((a, b) => {
        const categoryComparison = (categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER)
            - (categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER);
        if (categoryComparison !== 0) return categoryComparison;

        const orderComparison = compareNullableNumber(a.orderIndex, b.orderIndex);
        if (orderComparison !== 0) return orderComparison;

        const nameComparison = compareString(
            getLocalizedValue(a.name, preferredLanguage),
            getLocalizedValue(b.name, preferredLanguage),
        );
        if (nameComparison !== 0) return nameComparison;

        return compareString(a.id, b.id);
    }).map(item => ({
        ...item,
        attributes: item.attributes
            ? [...item.attributes].sort((a, b) => {
                const orderComparison = compareNullableNumber(a.orderIndex, b.orderIndex);
                if (orderComparison !== 0) return orderComparison;

                const nameComparison = compareString(
                    getLocalizedValue(a.name, preferredLanguage),
                    getLocalizedValue(b.name, preferredLanguage),
                );
                if (nameComparison !== 0) return nameComparison;

                return compareString(a.id, b.id);
            })
            : item.attributes,
    }));
};

export const buildExportData = (data: MenuExportData): MenuExportData => {
    const dedupedCategories = dedupeById((data.categories || []).map(normalizeCategory));
    const dedupedItems = dedupeById((data.items || []).map(normalizeItem));
    const languages = data.languages || [];
    const preferredLanguage = languages[0]?.match(/\((.*)\)/)?.[1] || languages[0];
    const sortedCategories = sortCategories(dedupedCategories, preferredLanguage);
    const sortedItems = sortItems(dedupedItems, sortedCategories, preferredLanguage);

    return {
        categories: sortedCategories,
        items: sortedItems,
        languages,
    };
};

export const getOutputJson = (projectData: Project) => buildExportDataFromProject(projectData);

// Lazy load ExcelJS only when needed
const loadExcelJS = async () => {
    // This is a browser-only export flow. Import the browser distribution so
    // Next.js never traces ExcelJS's Node stream reader or optional AWS SDK.
    const ExcelJS = (await import('exceljs/dist/exceljs.min.js')).default;
    return ExcelJS;
};

const addLanguagesSheet = (workbook: any, languages: string[]): void => {
    if (languages.length <= 1) return;

    const sheet = workbook.addWorksheet('Languages');
    sheet.columns = [
        { header: 'language_code', key: 'language_code', width: 15 },
        { header: 'language_name', key: 'language_name', width: 20 },
    ];

    extractLanguageInfo(languages).forEach(({ code, name }) => {
        sheet.addRow({ language_code: code, language_name: name });
    });
};

const addCategoriesSheet = (workbook: any, categories: ExtractedDataCategory[], languageCodes: string[]): void => {
    const sheet = workbook.addWorksheet('Categories');
    const hasMultipleLanguages = languageCodes.length > 1;

    sheet.columns = hasMultipleLanguages
        ? [
            { header: 'id', key: 'id', width: 15 },
            { header: 'language_code', key: 'language_code', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'icon', key: 'icon', width: 20 },
            { header: 'order_index', key: 'order_index', width: 12 },
        ]
        : [
            { header: 'id', key: 'id', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'icon', key: 'icon', width: 20 },
            { header: 'order_index', key: 'order_index', width: 12 },
        ];

    categories.forEach(category => {
        if (!hasMultipleLanguages) {
            const langCode = languageCodes[0] || Object.keys(category.name)[0];
            sheet.addRow({
                id: category.id,
                name: category.name?.[langCode] || '',
                active: category.active,
                icon: category.icon || '',
                order_index: category.orderIndex ?? '',
            });
        } else {
            languageCodes.forEach(langCode => {
                sheet.addRow({
                    id: category.id,
                    language_code: langCode,
                    name: category.name?.[langCode] || '',
                    active: category.active,
                    icon: category.icon || '',
                    order_index: category.orderIndex ?? '',
                });
            });
        }
    });
};

const addItemsSheet = (workbook: any, items: ExtractedDataItem[], languageCodes: string[]): void => {
    const sheet = workbook.addWorksheet('Items');
    const hasMultipleLanguages = languageCodes.length > 1;

    sheet.columns = hasMultipleLanguages
        ? [
            { header: 'id', key: 'id', width: 15 },
            { header: 'category', key: 'category', width: 15 },
            { header: 'language_code', key: 'language_code', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'price', key: 'price', width: 10 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'available', key: 'available', width: 10 },
            { header: 'tags', key: 'tags', width: 30 },
        ]
        : [
            { header: 'id', key: 'id', width: 15 },
            { header: 'category', key: 'category', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'price', key: 'price', width: 10 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'available', key: 'available', width: 10 },
            { header: 'tags', key: 'tags', width: 30 },
        ];

    items.forEach(item => {
        const tags = item.tags?.join(', ') || '';
        if (!hasMultipleLanguages) {
            const langCode = languageCodes[0] || Object.keys(item.name || {})[0] || 'en';
            sheet.addRow({
                id: item.id,
                category: item.category,
                name: item.name?.[langCode] || '',
                description: item.description?.[langCode] || '',
                price: item.price || '',
                active: item.active,
                available: item.available ?? true,
                tags,
            });
        } else {
            languageCodes.forEach(langCode => {
                sheet.addRow({
                    id: item.id,
                    category: item.category,
                    language_code: langCode,
                    name: item.name?.[langCode] || '',
                    description: item.description?.[langCode] || '',
                    price: item.price || '',
                    active: item.active,
                    available: item.available ?? true,
                    tags,
                });
            });
        }
    });
};

const addAttributesSheet = (workbook: any, items: ExtractedDataItem[], languageCodes: string[]): void => {
    const attributes = items.flatMap(item => (
        (item.attributes || []).map((attribute) => ({ itemId: item.id, categoryId: item.category, attribute }))
    ));

    if (attributes.length === 0) return;

    const sheet = workbook.addWorksheet('Attributes');
    const hasMultipleLanguages = languageCodes.length > 1;

    sheet.columns = hasMultipleLanguages
        ? [
            { header: 'item_id', key: 'item_id', width: 15 },
            { header: 'category_id', key: 'category_id', width: 15 },
            { header: 'attribute_id', key: 'attribute_id', width: 15 },
            { header: 'language_code', key: 'language_code', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'price', key: 'price', width: 12 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'order_index', key: 'order_index', width: 12 },
        ]
        : [
            { header: 'item_id', key: 'item_id', width: 15 },
            { header: 'category_id', key: 'category_id', width: 15 },
            { header: 'attribute_id', key: 'attribute_id', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'price', key: 'price', width: 12 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'order_index', key: 'order_index', width: 12 },
        ];

    attributes.forEach(({ itemId, categoryId, attribute }) => {
        if (!hasMultipleLanguages) {
            const langCode = languageCodes[0] || Object.keys(attribute.name || {})[0] || 'en';
            sheet.addRow({
                item_id: itemId,
                category_id: categoryId,
                attribute_id: attribute.id,
                name: attribute.name?.[langCode] || '',
                price: attribute.price || '',
                active: attribute.active,
                order_index: attribute.orderIndex ?? '',
            });
            return;
        }

        languageCodes.forEach(langCode => {
            sheet.addRow({
                item_id: itemId,
                category_id: categoryId,
                attribute_id: attribute.id,
                language_code: langCode,
                name: attribute.name?.[langCode] || '',
                price: attribute.price || '',
                active: attribute.active,
                order_index: attribute.orderIndex ?? '',
            });
        });
    });
};

const addCombinedSheet = (
    workbook: any,
    items: ExtractedDataItem[],
    categories: ExtractedDataCategory[],
    languageCodes: string[],
): void => {
    const sheet = workbook.addWorksheet('Combined');
    const hasMultipleLanguages = languageCodes.length > 1;

    // Create category lookup
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    sheet.columns = hasMultipleLanguages
        ? [
            { header: 'item_id', key: 'item_id', width: 15 },
            { header: 'category_id', key: 'category_id', width: 15 },
            { header: 'language_code', key: 'language_code', width: 15 },
            { header: 'category_name', key: 'category_name', width: 25 },
            { header: 'item_name', key: 'item_name', width: 30 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'price', key: 'price', width: 10 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'available', key: 'available', width: 10 },
        ]
        : [
            { header: 'item_id', key: 'item_id', width: 15 },
            { header: 'category_id', key: 'category_id', width: 15 },
            { header: 'category_name', key: 'category_name', width: 25 },
            { header: 'item_name', key: 'item_name', width: 30 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'price', key: 'price', width: 10 },
            { header: 'active', key: 'active', width: 10 },
            { header: 'available', key: 'available', width: 10 },
        ];

    items.forEach(item => {
        const category = categoryMap.get(item.category);

        if (!hasMultipleLanguages) {
            const langCode = languageCodes[0] || Object.keys(item.name || {})[0] || 'en';
            sheet.addRow({
                item_id: item.id,
                category_id: item.category,
                category_name: category?.name?.[langCode] || '',
                item_name: item.name?.[langCode] || '',
                description: item.description?.[langCode] || '',
                price: item.price || '',
                active: item.active,
                available: item.available ?? true,
            });
        } else {
            languageCodes.forEach(langCode => {
                sheet.addRow({
                    item_id: item.id,
                    category_id: item.category,
                    language_code: langCode,
                    category_name: category?.name?.[langCode] || '',
                    item_name: item.name?.[langCode] || '',
                    description: item.description?.[langCode] || '',
                    price: item.price || '',
                    active: item.active,
                    available: item.available ?? true,
                });
            });
        }
    });
};

const resolveLanguageCodes = (languages: string[], items: ExtractedDataItem[], categories: ExtractedDataCategory[]): string[] => {
    const codes = languages.map(lang => {
        const match = lang.match(/\((.*)\)/);
        return match ? match[1] : lang;
    }).filter(Boolean);

    if (codes.length > 0) return codes;

    const discoveredCodes = new Set<string>();
    items.forEach(item => {
        Object.keys(item.name || {}).forEach(code => discoveredCodes.add(code));
        Object.keys(item.description || {}).forEach(code => discoveredCodes.add(code));
        (item.attributes || []).forEach((attribute: ExtractedDataAttribute) => {
            Object.keys(attribute.name || {}).forEach(code => discoveredCodes.add(code));
        });
    });
    categories.forEach(category => {
        Object.keys(category.name || {}).forEach(code => discoveredCodes.add(code));
    });

    return Array.from(discoveredCodes.size > 0 ? discoveredCodes : new Set(['en']));
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const downloadMenuData = async (
    menuData: MenuExportData,
    type: 'json' | 'xlsx',
    options: MenuExportOptions = {},
) => {
    const data = buildExportData(menuData);
    const filenameBase = sanitizeFilenamePart(options.filenameBase);

    if (type === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${filenameBase}.json`);
        return;
    }

    const workbook = await createExportWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, `${filenameBase}.xlsx`);
};

export const createExportWorkbook = async (menuData: MenuExportData) => {
    const data = buildExportData(menuData);
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MenuList';
    workbook.created = new Date();

    const languageCodes = resolveLanguageCodes(data.languages, data.items, data.categories);

    addLanguagesSheet(workbook, data.languages);
    addCategoriesSheet(workbook, data.categories, languageCodes);
    addItemsSheet(workbook, data.items, languageCodes);
    addAttributesSheet(workbook, data.items, languageCodes);
    addCombinedSheet(workbook, data.items, data.categories, languageCodes);
    return workbook;
};

/**
 * Download project data as JSON or Excel
 *
 * @param projectData - The project data to export
 * @param type - Export type: 'json' or 'xlsx'
 */
export const handleDownload = async (
    projectData: Project,
    type: 'json' | 'xlsx',
    options: MenuExportOptions = {},
) => {
    await downloadMenuData(buildExportDataFromProject(projectData), type, options);
};
