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
import { ExtractedDataCategory, ExtractedDataItem } from "@template/main-app/projects/types/extractedData.types";
import { PosSyncCategory, PosSyncItem, PosSyncPayload } from "./types";

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
    const allCategories: ExtractedDataCategory[] = [];
    const allItems: ExtractedDataItem[] = [];

    project.files?.forEach(file => {
        if (file.extractedData?.data) {
            const data = file.extractedData.data;
            if (data.categories) {
                allCategories.push(...data.categories);
            }
            if (data.items) {
                allItems.push(...data.items);
            }
        }
    });

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

/**
 * Build a test ping payload with sample data
 */
export function buildTestPayload(
    storeId: number,
    tenantId: number,
): PosSyncPayload {
    return {
        event: 'test.ping',
        version: 0,
        timestamp: new Date().toISOString(),
        tenantId,
        projectId: 'test',
        storeId,
        currency: 'INR',
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
