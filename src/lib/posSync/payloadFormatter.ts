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

import type {
    DecisionFactPrimitive,
    DecisionFactValue,
} from "@template/main-app/projects/types/extractedData.types";
import { PosSyncCategory, PosSyncItem, PosSyncPayload } from "./types";

type RuntimePosSyncCategory = Record<string, unknown> & { id: string };
type RuntimePosSyncItem = Record<string, unknown> & { category: string; id: string };

/**
 * Build a full menu snapshot payload from project data.
 *
 * Design principle: Send ALL item/category data as-is.
 * POS systems can ignore fields they don't need — but they can't use fields we don't send.
 */
export function buildMenuSnapshot(
    project: unknown,
    storeId: number,
    tenantId: number,
    menuVersion: number,
    currency: string,
): PosSyncPayload {
    const projectData = isRecord(project) ? project : {};
    const topLevelMenuData = readMenuData(projectData.extractedData);
    const fileMenuData = collectFileMenuData(projectData);

    const allCategories = topLevelMenuData.categories.length > 0
        ? topLevelMenuData.categories
        : fileMenuData.categories;
    const allItems = topLevelMenuData.items.length > 0
        ? topLevelMenuData.items
        : fileMenuData.items;

    const uniqueCategories = Array.from(
        new Map(allCategories
            .filter((category) => typeof category?.id === 'string' && category.id.length > 0)
            .map(cat => [cat.id, cat])).values()
    );
    const uniqueItems = Array.from(
        new Map(allItems
            .filter((item) => (
                typeof item?.id === 'string'
                && item.id.length > 0
                && typeof item.category === 'string'
                && item.category.length > 0
            ))
            .map(item => [item.id, item])).values()
    );

    const languages = (Array.isArray(projectData.languages) ? projectData.languages : [])
        .filter((language): language is string => typeof language === 'string' && language.trim().length > 0)
        .map((lang, i) => {
        const codeMatch = lang.match(/\((.*)\)/);
        const code = codeMatch ? codeMatch[1] : lang;
        const name = lang.split(' (')[0] || lang;
        return { code, name, isPrimary: i === 0 };
    });

    return {
        event: 'menu.full.sync',
        version: menuVersion,
        timestamp: new Date().toISOString(),
        tenantId,
        projectId: typeof projectData.projectId === 'string' ? projectData.projectId : '',
        storeId,
        currency: currency || 'INR',
        languages,
        menu: {
            categories: uniqueCategories.map(formatCategory),
            items: uniqueItems.map(formatItem),
        },
    };
}

function collectFileMenuData(project: Record<string, unknown>): { categories: RuntimePosSyncCategory[]; items: RuntimePosSyncItem[] } {
    const categories: RuntimePosSyncCategory[] = [];
    const items: RuntimePosSyncItem[] = [];

    const files = Array.isArray(project.files) ? project.files.filter(isRecord) : [];
    files.forEach((file) => {
        const fileData = readMenuData(file.extractedData);
        categories.push(...fileData.categories);
        items.push(...fileData.items);
    });

    return { categories, items };
}

function readMenuData(
    source: unknown,
): { categories: RuntimePosSyncCategory[]; items: RuntimePosSyncItem[] } {
    if (!isRecord(source)) {
        return { categories: [], items: [] };
    }

    const nestedData = isRecord(source.data) ? source.data : undefined;
    const rawCategories = Array.isArray(nestedData?.categories)
        ? nestedData.categories
        : (Array.isArray(source.categories) ? source.categories : []);
    const rawItems = Array.isArray(nestedData?.items)
        ? nestedData.items
        : (Array.isArray(source.items) ? source.items : []);

    return {
        categories: rawCategories.filter(isRuntimePosSyncCategory),
        items: rawItems.filter(isRuntimePosSyncItem),
    };
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

function formatCategory(cat: RuntimePosSyncCategory): PosSyncCategory {
    const result: PosSyncCategory = {
        id: cat.id,
        active: cat.active === true,
        name: normalizeLocalizedText(cat.name),
    };
    if (typeof cat.icon === 'string' && cat.icon) result.icon = cat.icon;
    const images = normalizePosSyncImages(cat.images);
    if (images.length > 0) result.images = images;
    if (Array.isArray(cat.timeSlots) && cat.timeSlots.length) {
        const timeSlots = cat.timeSlots.filter(isRecord).flatMap((timeSlot) => {
            const days = Array.isArray(timeSlot.days)
                ? timeSlot.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
                : [];
            const normalized = {
                ...(typeof timeSlot.presetId === 'string' && timeSlot.presetId ? { presetId: timeSlot.presetId } : {}),
                ...(typeof timeSlot.startTime === 'string' && timeSlot.startTime ? { startTime: timeSlot.startTime } : {}),
                ...(typeof timeSlot.endTime === 'string' && timeSlot.endTime ? { endTime: timeSlot.endTime } : {}),
                ...(days.length > 0 ? { days } : {}),
            };
            return Object.keys(normalized).length > 0 ? [normalized] : [];
        });
        if (timeSlots.length > 0) result.timeSlots = timeSlots;
    }
    if (typeof cat.orderIndex === 'number' && Number.isFinite(cat.orderIndex)) {
        result.orderIndex = cat.orderIndex;
    }
    return result;
}

function formatItem(item: RuntimePosSyncItem): PosSyncItem {
    const result: PosSyncItem = {
        id: item.id,
        category: item.category,
        active: item.active === true,
        name: normalizeLocalizedText(item.name),
    };

    if (typeof item.available === 'boolean') result.available = item.available;
    if (item.description) result.description = normalizeLocalizedText(item.description);
    if (typeof item.price === 'string') result.price = item.price;
    if (Array.isArray(item.tags)) result.tags = item.tags.filter(isString);
    if (typeof item.isBestSeller === 'boolean') result.isBestSeller = item.isBestSeller;
    if (typeof item.duration === 'number' && Number.isFinite(item.duration)) result.duration = item.duration;
    if (typeof item.orderIndex === 'number' && Number.isFinite(item.orderIndex)) result.orderIndex = item.orderIndex;

    const images = normalizePosSyncImages(item.images);
    if (images.length > 0) result.images = images;

    if (Array.isArray(item.attributes) && item.attributes.length) {
        result.attributes = item.attributes
            .filter(isPosSyncAttribute)
            .map(attr => ({
                id: attr.id,
                name: normalizeLocalizedText(attr.name),
                price: attr.price,
                active: attr.active === true,
                ...(typeof attr.orderIndex === 'number' && Number.isFinite(attr.orderIndex)
                    ? { orderIndex: attr.orderIndex }
                    : {}),
            }));
    }

    const decisionFacts = normalizeDecisionFacts(item.decisionFacts);
    if (decisionFacts) result.decisionFacts = decisionFacts;
    if (Array.isArray(item.allergens)) result.allergens = item.allergens.filter(isString);
    if (Array.isArray(item.dietaryTags)) result.dietaryTags = item.dietaryTags.filter(isString);
    if (isSpiceLevel(item.spiceLevel)) {
        result.spiceLevel = item.spiceLevel;
    }
    if (isRecord(item.nutritionInfo)) {
        const nutritionInfo = normalizeNutritionInfo(item.nutritionInfo);
        if (Object.keys(nutritionInfo).length > 0) result.nutritionInfo = nutritionInfo;
    }
    if (isSkillLevel(item.skillLevel)) {
        result.skillLevel = item.skillLevel;
    }
    if (isTargetAudience(item.targetAudience)) {
        result.targetAudience = item.targetAudience;
    }
    if (typeof item.materials === 'string') result.materials = item.materials;
    if (typeof item.warranty === 'string') result.warranty = item.warranty;

    return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isRuntimePosSyncCategory(value: unknown): value is RuntimePosSyncCategory {
    return isRecord(value) && typeof value.id === 'string' && value.id.length > 0;
}

function isRuntimePosSyncItem(value: unknown): value is RuntimePosSyncItem {
    return isRecord(value)
        && typeof value.id === 'string'
        && value.id.length > 0
        && typeof value.category === 'string'
        && value.category.length > 0;
}

function isSpiceLevel(value: unknown): value is NonNullable<PosSyncItem['spiceLevel']> {
    return value === 'none' || value === 'mild' || value === 'medium' || value === 'hot' || value === 'very-hot';
}

function isSkillLevel(value: unknown): value is NonNullable<PosSyncItem['skillLevel']> {
    return value === 'beginner' || value === 'intermediate' || value === 'advanced' || value === 'all-levels';
}

function isTargetAudience(value: unknown): value is NonNullable<PosSyncItem['targetAudience']> {
    return value === 'for-men'
        || value === 'for-women'
        || value === 'unisex'
        || value === 'kids'
        || value === 'adults'
        || value === 'seniors';
}

function isPosSyncAttribute(
    value: unknown,
): value is Record<string, unknown> & { id: string; price: string } {
    return isRecord(value)
        && typeof value.id === 'string'
        && value.id.length > 0
        && typeof value.price === 'string';
}

function normalizePosSyncImages(value: unknown): Array<{ url?: string; name?: string }> {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).flatMap((image) => {
        const normalized = {
            ...(typeof image.url === 'string' && image.url ? { url: image.url } : {}),
            ...(typeof image.name === 'string' && image.name ? { name: image.name } : {}),
        };
        return Object.keys(normalized).length > 0 ? [normalized] : [];
    });
}

function normalizeLocalizedText(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    const result = Object.create(null) as Record<string, string>;
    Object.entries(value).forEach(([key, text]) => {
        if (
            key.length > 0
            && key !== '__proto__'
            && key !== 'constructor'
            && key !== 'prototype'
            && typeof text === 'string'
        ) result[key] = text;
    });
    return { ...result };
}

function normalizeNutritionInfo(value: Record<string, unknown>): NonNullable<PosSyncItem['nutritionInfo']> {
    const result: NonNullable<PosSyncItem['nutritionInfo']> = {};
    for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
        if (typeof value[key] === 'number' && Number.isFinite(value[key])) result[key] = value[key];
    }
    if (typeof value.servingSize === 'string') result.servingSize = value.servingSize;
    return result;
}

function normalizeDecisionFactValue(value: unknown): DecisionFactValue | undefined {
    if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
        return value;
    }
    if (Array.isArray(value)) {
        const entries = value.filter((entry): entry is DecisionFactPrimitive => (
            typeof entry === 'string'
            || typeof entry === 'boolean'
            || (typeof entry === 'number' && Number.isFinite(entry))
        ));
        return entries;
    }
    if (isRecord(value)) {
        const nutritionInfo = normalizeNutritionInfo(value);
        return Object.keys(nutritionInfo).length > 0 ? nutritionInfo : undefined;
    }
    return undefined;
}

function normalizeDecisionFacts(value: unknown): PosSyncItem['decisionFacts'] | undefined {
    if (!isRecord(value)) return undefined;
    const entries = Object.entries(value).flatMap(([key, fact]) => {
        if (!key || key === '__proto__' || key === 'constructor' || key === 'prototype' || !isRecord(fact)) return [];
        const normalizedValue = normalizeDecisionFactValue(fact.value);
        return normalizedValue === undefined ? [] : [[key, { value: normalizedValue }] as const];
    });
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
