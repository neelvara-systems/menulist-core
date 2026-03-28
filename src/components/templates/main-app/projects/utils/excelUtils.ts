/**
 * Excel Export Utilities
 * 
 * LAZY LOADED - ExcelJS is only imported when this module is used
 * Import this dynamically: const { handleDownload } = await import('./utils/excelUtils')
 */

import { Project } from '../types';

// Types for extracted data
interface LanguageType {
    code: string;
    name: string;
}

const extractLanguageInfo = (languages: string[]): LanguageType[] => {
    return languages.map(lang => {
        const code = lang.match(/\((.*)\)/)?.[1] || lang;
        const name = lang.split(' (')[0] || lang;
        return { code, name };
    });
};

export const getOutputJson = (projectData: Project) => {
    const combinedData: {
        categories: any[];
        items: any[];
        languages: string[];
    } = {
        categories: [],
        items: [],
        languages: projectData.languages || []
    };

    projectData.files?.forEach(file => {
        if (file.extractedData?.data) {
            const data = file.extractedData.data;
            if (data.categories) {
                combinedData.categories = [
                    ...combinedData.categories,
                    ...data.categories
                ];
            }
            if (data.items) {
                combinedData.items = [
                    ...combinedData.items,
                    ...data.items
                ];
            }
        }
    });

    // Remove duplicates based on id
    combinedData.categories = Array.from(new Map(
        combinedData.categories.map(item => [item.id, item])
    ).values());
    combinedData.items = Array.from(new Map(
        combinedData.items.map(item => [item.id, item])
    ).values());

    return combinedData;
};

// Lazy load ExcelJS only when needed
const loadExcelJS = async () => {
    const ExcelJS = (await import('exceljs')).default;
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

const addCategoriesSheet = (workbook: any, categories: any[], languageCodes: string[]): void => {
    const sheet = workbook.addWorksheet('Categories');
    const hasMultipleLanguages = languageCodes.length > 1;

    sheet.columns = hasMultipleLanguages
        ? [
            { header: 'id', key: 'id', width: 15 },
            { header: 'language_code', key: 'language_code', width: 15 },
            { header: 'name', key: 'name', width: 30 },
        ]
        : [
            { header: 'id', key: 'id', width: 15 },
            { header: 'name', key: 'name', width: 30 },
        ];

    categories.forEach(category => {
        if (!hasMultipleLanguages) {
            const langCode = languageCodes[0] || Object.keys(category.name)[0];
            sheet.addRow({ id: category.id, name: category.name?.[langCode] || '' });
        } else {
            languageCodes.forEach(langCode => {
                sheet.addRow({
                    id: category.id,
                    language_code: langCode,
                    name: category.name?.[langCode] || ''
                });
            });
        }
    });
};

const addItemsSheet = (workbook: any, items: any[], languageCodes: string[]): void => {
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
        ]
        : [
            { header: 'id', key: 'id', width: 15 },
            { header: 'category', key: 'category', width: 15 },
            { header: 'name', key: 'name', width: 30 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'price', key: 'price', width: 10 },
        ];

    items.forEach(item => {
        if (!hasMultipleLanguages) {
            const langCode = languageCodes[0] || Object.keys(item.name || {})[0] || 'en';
            sheet.addRow({
                id: item.id,
                category: item.category,
                name: item.name?.[langCode] || '',
                description: item.description?.[langCode] || '',
                price: item.price || '',
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
                });
            });
        }
    });
};

const addCombinedSheet = (workbook: any, items: any[], categories: any[], languageCodes: string[]): void => {
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
        ]
        : [
            { header: 'item_id', key: 'item_id', width: 15 },
            { header: 'category_id', key: 'category_id', width: 15 },
            { header: 'category_name', key: 'category_name', width: 25 },
            { header: 'item_name', key: 'item_name', width: 30 },
            { header: 'description', key: 'description', width: 40 },
            { header: 'price', key: 'price', width: 10 },
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
                });
            });
        }
    });
};

/**
 * Download project data as JSON or Excel
 * 
 * @param projectData - The project data to export
 * @param type - Export type: 'json' or 'xlsx'
 */
export const handleDownload = async (projectData: Project, type: 'json' | 'xlsx') => {
    const data = getOutputJson(projectData);

    if (type === 'json') {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    // Excel download using ExcelJS (lazy loaded)
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MenuList AI';
    workbook.created = new Date();

    // Extract language codes
    const languageCodes = data.languages.map(lang => {
        const match = lang.match(/\((.*)\)/);
        return match ? match[1] : lang;
    });

    // Add sheets to workbook
    addLanguagesSheet(workbook, data.languages);
    addCategoriesSheet(workbook, data.categories, languageCodes);
    addItemsSheet(workbook, data.items, languageCodes);
    addCombinedSheet(workbook, data.items, data.categories, languageCodes);

    // Download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu_data.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
