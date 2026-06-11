/**
 * POS Webhook Sync — Payload Formatter
 *
 * Builds full menu snapshot payload from project data.
 * Sends ALL item/category fields except internal metadata.
 * Follows the same data combination pattern as getOutputJson() in excelUtils.ts
 * but includes ALL fields instead of the Excel-friendly subset.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_spec.md (Payload Structure)
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §2.5
 */

import { Project } from "@template/main-app/projects/types";
import { ExtractedData, ExtractedDataCategory, ExtractedDataItem } from "@template/main-app/projects/types/extractedData.types";
import { PosSyncCategory, PosSyncItem, PosSyncPayload } from "./types";

type ProjectWithTopLevelExtractedData = Project & {
    extractedData?: ExtractedData | {
        categories?: ExtractedDataCategory[];
        items?: ExtractedDataItem[];
        data?: {
            categories?: ExtractedDataCategory[];
            items?: ExtractedDataItem[];
        };
    } | null;
};

/**
 * Build a full menu snapshot payload from project data.
 *
 * Design principle: Send ALL item/category data as-is.
 * POS systems can ignore fields they don't need — but they can't use fields we don't send.
 */
export function buildMenuSnapshot(
    project: Project,
    storeId: number,
    tenantId: number,
    menuVersion: number,
    currency: string,
): PosSyncPayload {
    const projectWithExtractedData = project as ProjectWithTopLevelExtractedData;
    const topLevelMenuData = readMenuData(projectWithExtractedData.extractedData);
    const fileMenuData = collectFileMenuData(project);

    const allCategories = topLevelMenuData.categories.length > 0
        ? topLevelMenuData.categories
        : fileMenuData.categories;
    const allItems = topLevelMenuData.items.length > 0
        ? topLevelMenuData.items
        : fileMenuData.items;

    const uniqueCategories = Array.from(
        new Map(allCategories.map(cat => [cat.id, cat])).values()
    );
    const uniqueItems = Array.from(
        new Map(allItems.map(item => [item.id, item])).values()
    );

    const languages = project.languages?.map((lang, i) => {
        const codeMatch = lang.match(/\((.*)\)/);
        const code = codeMatch ? codeMatch[1] : lang;
        const name = lang.split(' (')[0] || lang;
        return { code, name, isPrimary: i === 0 };
    }) || [];

    return {
        event: 'menu.full.sync',
        version: menuVersion,
        timestamp: new Date().toISOString(),
        tenantId,
        projectId: project.projectId || '',
        storeId,
        currency: currency || 'INR',
        languages,
        menu: {
            categories: uniqueCategories.map(formatCategory),
            items: uniqueItems.map(formatItem),
        },
    };
}

function collectFileMenuData(project: Project): { categories: ExtractedDataCategory[]; items: ExtractedDataItem[] } {
    const categories: ExtractedDataCategory[] = [];
    const items: ExtractedDataItem[] = [];

    project.files?.forEach((file) => {
        const fileData = readMenuData(file.extractedData);
        categories.push(...fileData.categories);
        items.push(...fileData.items);
    });

    return { categories, items };
}

function readMenuData(
    source: ProjectWithTopLevelExtractedData['extractedData'] | ExtractedData | null | undefined,
): { categories: ExtractedDataCategory[]; items: ExtractedDataItem[] } {
    if (!source) return { categories: [], items: [] };

    const nestedData = 'data' in source ? source.data : undefined;
    const categories = Array.isArray(nestedData?.categories)
        ? nestedData.categories
        : ('categories' in source && Array.isArray(source.categories) ? source.categories : []);
    const items = Array.isArray(nestedData?.items)
        ? nestedData.items
        : ('items' in source && Array.isArray(source.items) ? source.items : []);

    return { categories, items };
}

/**
 * Build a test ping payload with sample data
 */
export function buildTestPayload(
    storeId: number,
    tenantId: number,
    currency = 'INR',
): PosSyncPayload {
    return {
        event: 'test.ping',
        version: 0,
        timestamp: new Date().toISOString(),
        tenantId,
        projectId: 'test',
        storeId,
        currency: currency || 'INR',
        languages: [{ code: 'en', name: 'English', isPrimary: true }],
        menu: {
            categories: [{
                id: 'test_cat_1',
                active: true,
                name: { en: 'Sample Category' },
            }],
            items: [{
                id: 'test_item_1',
                category: 'test_cat_1',
                active: true,
                available: true,
                name: { en: 'Sample Item' },
                description: { en: 'This is a test item from MenuList POS Sync' },
                price: '100',
                tags: ['Vegetarian'],
            }],
        },
    };
}

function formatCategory(cat: ExtractedDataCategory): PosSyncCategory {
    const result: PosSyncCategory = {
        id: cat.id,
        active: cat.active,
        name: cat.name,
    };
    if (cat.images?.length) {
        result.images = cat.images.map(img => ({
            url: img.url || undefined,
            name: img.name || undefined,
        }));
    }
    if (cat.timeSlots?.length) {
        result.timeSlots = cat.timeSlots;
    }
    if (cat.orderIndex !== undefined) {
        result.orderIndex = cat.orderIndex;
    }
    return result;
}

function formatItem(item: ExtractedDataItem): PosSyncItem {
    const result: PosSyncItem = {
        id: item.id,
        category: item.category,
        active: item.active,
        name: item.name || {},
    };

    if (item.available !== undefined) result.available = item.available;
    if (item.description) result.description = item.description;
    if (item.price !== undefined) result.price = item.price;
    if (item.tags?.length) result.tags = item.tags;
    if (item.isBestSeller !== undefined) result.isBestSeller = item.isBestSeller;
    if (item.duration !== undefined) result.duration = item.duration;
    if (item.orderIndex !== undefined) result.orderIndex = item.orderIndex;

    if (item.images?.length) {
        result.images = item.images.map(img => ({
            url: img.url || undefined,
            name: img.name || undefined,
        }));
    }

    if (item.attributes?.length) {
        result.attributes = item.attributes.map(attr => ({
            id: attr.id,
            name: attr.name,
            price: attr.price,
            active: attr.active,
            ...(attr.orderIndex !== undefined ? { orderIndex: attr.orderIndex } : {}),
        }));
    }

    return result;
}
