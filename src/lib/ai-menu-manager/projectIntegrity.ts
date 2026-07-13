import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '@data/shared/publicMenuDraftData';
import type { Project } from '@template/main-app/projects/types';

const MAX_ID_LENGTH = 160;
const MAX_LANGUAGE_CODE_LENGTH = 16;
const MAX_LOCALIZED_VALUE_LENGTH = 4_000;
const MAX_TIME_SLOTS_PER_CATEGORY = 100;

export const AI_MENU_MANAGER_PROJECT_LIMITS = {
    MAX_FILES: 100,
} as const;

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as UnknownRecord
        : null;
}

function isBoundedText(value: unknown, maxLength: number, allowEmpty = false): value is string {
    return typeof value === 'string'
        && value.length <= maxLength
        && (allowEmpty || value.trim().length > 0);
}

function isBoundedId(value: unknown): value is string {
    return isBoundedText(value, MAX_ID_LENGTH)
        && !value.includes('/')
        && value !== '.'
        && value !== '..';
}

function isOptionalBoolean(value: unknown): boolean {
    return value === undefined || typeof value === 'boolean';
}

function isOptionalFiniteNumber(value: unknown): boolean {
    return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isOptionalBoundedString(value: unknown, maxLength = MAX_LOCALIZED_VALUE_LENGTH): boolean {
    return value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

function isLocalizedText(value: unknown): boolean {
    if (typeof value === 'string') return value.length <= MAX_LOCALIZED_VALUE_LENGTH;
    const record = toRecord(value);
    if (!record || Object.keys(record).length > PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LOCALIZED_LANGUAGES) return false;
    return Object.entries(record).every(([language, text]) => (
        isBoundedText(language, MAX_LANGUAGE_CODE_LENGTH)
        && typeof text === 'string'
        && text.length <= MAX_LOCALIZED_VALUE_LENGTH
    ));
}

function isOptionalStringList(value: unknown, maxItems: number): boolean {
    return value === undefined || (
        Array.isArray(value)
        && value.length <= maxItems
        && value.every((entry) => isBoundedText(entry, MAX_ID_LENGTH))
    );
}

function isOptionalArray(value: unknown, maxItems: number): boolean {
    return value === undefined || (Array.isArray(value) && value.length <= maxItems);
}

function isValidAttribute(value: unknown, seenIds: Set<string>): boolean {
    const attribute = toRecord(value);
    if (!attribute || !isBoundedId(attribute.id) || seenIds.has(attribute.id)) return false;
    seenIds.add(attribute.id);
    return isLocalizedText(attribute.name)
        && isBoundedText(attribute.price, MAX_LOCALIZED_VALUE_LENGTH, true)
        && isOptionalBoolean(attribute.active)
        && isOptionalFiniteNumber(attribute.orderIndex);
}

function isValidCategory(value: unknown, seenIds: Set<string>): boolean {
    const category = toRecord(value);
    if (!category || !isBoundedId(category.id) || seenIds.has(category.id)) return false;
    seenIds.add(category.id);
    return isLocalizedText(category.name)
        && isOptionalBoolean(category.active)
        && isOptionalStringList(category.extractionIdAliases, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ALIASES)
        && isOptionalArray(category.images, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LIST_VALUES)
        && isOptionalArray(category.timeSlots, MAX_TIME_SLOTS_PER_CATEGORY)
        && isOptionalBoundedString(category.icon, MAX_ID_LENGTH)
        && isOptionalFiniteNumber(category.orderIndex);
}

function isValidItem(value: unknown, seenIds: Set<string>): boolean {
    const item = toRecord(value);
    if (!item || !isBoundedId(item.id) || seenIds.has(item.id) || !isBoundedId(item.category)) return false;
    seenIds.add(item.id);

    if (
        !isLocalizedText(item.name)
        || (item.description !== undefined && !isLocalizedText(item.description))
        || !isOptionalBoolean(item.active)
        || !isOptionalBoolean(item.available)
        || !isOptionalBoolean(item.isBestSeller)
        || !isOptionalStringList(item.extractionIdAliases, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ALIASES)
        || !isOptionalArray(item.images, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LIST_VALUES)
        || !isOptionalFiniteNumber(item.duration)
        || !isOptionalFiniteNumber(item.orderIndex)
        || !isOptionalFiniteNumber(item.ownerBoost)
        || !isOptionalBoundedString(item.price)
    ) {
        return false;
    }

    if (item.attributes === undefined) return true;
    if (!Array.isArray(item.attributes) || item.attributes.length > PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM) {
        return false;
    }
    const attributeIds = new Set<string>();
    return item.attributes.every((attribute) => isValidAttribute(attribute, attributeIds));
}

function hasValidAiMenuManagerConfigShape(value: unknown): boolean {
    if (value === undefined) return true;
    const config = toRecord(value);
    if (!config) return false;
    if (config.design === undefined) return true;
    const design = toRecord(config.design);
    if (!design) return false;
    const menu = design.menu === undefined ? null : toRecord(design.menu);
    const brand = design.brand === undefined ? null : toRecord(design.brand);
    if ((design.menu !== undefined && !menu) || (design.brand !== undefined && !brand)) return false;
    if (menu && (
        !isOptionalBoundedString(menu.mood, MAX_ID_LENGTH)
        || !isOptionalBoundedString(menu.layout, MAX_ID_LENGTH)
        || !isOptionalBoolean(menu.showCategoryIcons)
        || !isOptionalBoolean(menu.showCategoryTabs)
        || !isOptionalBoolean(menu.showImages)
        || !isOptionalBoolean(menu.showItemPrices)
    )) return false;
    return !brand || isOptionalBoundedString(brand.accentColor, MAX_ID_LENGTH);
}

function isValidPinnedItemValue(value: unknown, depth = 0): boolean {
    if (value === undefined) return true;
    if (isBoundedId(value)) return true;
    if (depth >= 3) return false;
    if (Array.isArray(value)) {
        return value.length <= 3 && value.every((entry) => isValidPinnedItemValue(entry, depth + 1));
    }
    const record = toRecord(value);
    if (!record || Object.keys(record).length > 3) return false;
    const candidate = record.itemId ?? record.value ?? record.id;
    return candidate !== undefined && isValidPinnedItemValue(candidate, depth + 1);
}

function hasValidAiMenuManagerSettingsShape(value: unknown): boolean {
    if (value === undefined) return true;
    const settings = toRecord(value);
    if (!settings) return false;
    if (settings.specialNote !== undefined && !isLocalizedText(settings.specialNote)) return false;
    if (settings.decisionBlocks === undefined) return true;
    const decisionBlocks = toRecord(settings.decisionBlocks);
    return Boolean(decisionBlocks)
        && isOptionalBoolean(decisionBlocks?.enablePopular)
        && isOptionalBoolean(decisionBlocks?.enableQuickPick)
        && isOptionalBoolean(decisionBlocks?.enableBestValue)
        && isValidPinnedItemValue(decisionBlocks?.pinnedPopular)
        && isValidPinnedItemValue(decisionBlocks?.pinnedQuickPick)
        && isValidPinnedItemValue(decisionBlocks?.pinnedBestValue);
}

/**
 * Validates only the persisted Project fields traversed by AI Menu Manager.
 * Unknown project fields remain untouched because the shared Project document
 * serves other product surfaces with their own runtime contracts.
 */
export function normalizeAiMenuManagerProjectSnapshot(
    value: unknown,
    expectedProjectId: string,
): Project | null {
    const project = toRecord(value);
    if (!project || !isBoundedId(expectedProjectId)) return null;
    if (project.projectId !== undefined && project.projectId !== expectedProjectId) return null;
    if (project.name !== undefined && !isLocalizedText(project.name)) return null;
    if (project.defaultLanguage !== undefined && !isBoundedText(project.defaultLanguage, MAX_LANGUAGE_CODE_LENGTH)) return null;
    if (!isOptionalStringList(project.languages, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LANGUAGES)) return null;
    if (!hasValidAiMenuManagerConfigShape(project.config) || !hasValidAiMenuManagerSettingsShape(project.menuSettings)) return null;
    if (project.files === undefined) return { ...project, projectId: expectedProjectId };
    if (!Array.isArray(project.files) || project.files.length > AI_MENU_MANAGER_PROJECT_LIMITS.MAX_FILES) return null;

    const categoryIds = new Set<string>();
    const itemIds = new Set<string>();
    let categoryCount = 0;
    let itemCount = 0;

    for (const rawFile of project.files) {
        const file = toRecord(rawFile);
        if (!file) return null;
        if (file.extractedData === undefined || file.extractedData === null) continue;

        const extractedData = toRecord(file.extractedData);
        const data = extractedData ? toRecord(extractedData.data) : null;
        if (!data) return null;

        const categories = data.categories;
        const items = data.items;
        const languages = data.languages;
        if (categories !== undefined && !Array.isArray(categories)) return null;
        if (items !== undefined && !Array.isArray(items)) return null;
        if (languages !== undefined && (!Array.isArray(languages) || languages.length > PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LANGUAGES)) return null;

        const categoryRows: unknown[] = Array.isArray(categories) ? categories : [];
        const itemRows: unknown[] = Array.isArray(items) ? items : [];
        categoryCount += categoryRows.length;
        itemCount += itemRows.length;
        if (
            categoryCount > PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_CATEGORIES
            || itemCount > PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ITEMS
            || ((categoryRows.length || itemRows.length) && !isBoundedId(file.uid))
            || !categoryRows.every((category) => isValidCategory(category, categoryIds))
            || !itemRows.every((item) => isValidItem(item, itemIds))
        ) {
            return null;
        }
    }

    return { ...project, projectId: expectedProjectId };
}
