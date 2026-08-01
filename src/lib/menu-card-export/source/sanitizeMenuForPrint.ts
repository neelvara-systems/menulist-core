import type { LocalizedText, PrintAttribute, PrintCategory, PrintItem } from '../models/printModel';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

export const MENU_CARD_PRINT_TEXT_LIMITS = Object.freeze({
    ID: 1_500,
    CATEGORY_NAME: 240,
    ITEM_NAME: 240,
    DESCRIPTION: 2_000,
    ATTRIBUTE_NAME: 160,
    TAG: 80,
    MENU_TITLE: 240,
});

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        return Object.prototype.hasOwnProperty.call(value, key)
            ? (value as Record<string, unknown>)[key]
            : undefined;
    } catch {
        return undefined;
    }
}

function snapshotArray(value: unknown, maxItems = 10_000): unknown[] {
    if (!Array.isArray(value)) return [];
    try {
        return Array.from(value).slice(0, maxItems);
    } catch {
        return [];
    }
}

function normalizeBoundedText(value: string, maxLength: number): string {
    return value.slice(0, maxLength).trim();
}

function resolveText(
    value: LocalizedText | unknown,
    language = 'en',
    fallback = '',
    maxLength: number = MENU_CARD_PRINT_TEXT_LIMITS.DESCRIPTION,
): string {
    const safeFallback = normalizeBoundedText(fallback, maxLength);
    if (typeof value === 'string') return normalizeBoundedText(value, maxLength) || safeFallback;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return safeFallback;

    const preferredKeys = [language, 'en'];
    try {
        preferredKeys.push(...Object.keys(value).slice(0, 64));
    } catch {
        return fallback;
    }

    const uniqueKeys = preferredKeys.filter((key, index) => preferredKeys.indexOf(key) === index);
    for (let index = 0; index < uniqueKeys.length; index += 1) {
        const key = uniqueKeys[index];
        const candidate = readOwnField(value, key);
        if (typeof candidate !== 'string') continue;
        const normalized = normalizeBoundedText(candidate, maxLength);
        if (normalized) return normalized;
    }
    return safeFallback;
}

function stripUnsupported(text: string): string {
    return text
        .replace(/[\u200D\uFE00-\uFE0F]/g, '')
        .replace(/[\u2600-\u27BF]/g, '')
        .trim();
}

function normalizePrice(price: unknown): string | undefined {
    const result = normalizeOptionalMenuPrice(price);
    return result.success && result.data ? result.data : undefined;
}

function resolveScalarId(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        return normalizeBoundedText(value, MENU_CARD_PRINT_TEXT_LIMITS.ID)
            || normalizeBoundedText(fallback, MENU_CARD_PRINT_TEXT_LIMITS.ID);
    }
    return typeof value === 'number' && Number.isFinite(value)
        ? String(value).slice(0, MENU_CARD_PRINT_TEXT_LIMITS.ID)
        : normalizeBoundedText(fallback, MENU_CARD_PRINT_TEXT_LIMITS.ID);
}

function normalizeTags(item: unknown): string[] {
    const raw = ['tags', 'dietaryTags', 'badges']
        .map((field) => readOwnField(item, field))
        .find(Array.isArray);
    return snapshotArray(raw, 6)
        .map((tag) => (
            typeof tag === 'string'
                ? normalizeBoundedText(tag, MENU_CARD_PRINT_TEXT_LIMITS.TAG)
                : typeof tag === 'number' && Number.isFinite(tag)
                    ? String(tag)
                    : ''
        ))
        .filter(Boolean);
}

export function sanitizeMenuForPrint(
    items: any[],
    categories: any[],
    language = 'en',
): {
    categories: PrintCategory[];
    hiddenExcludedCount: number;
    unavailableExcludedCount: number;
    missingPriceCount: number;
} {
    const activeCategories = snapshotArray(categories)
        .filter((category) => (
            readOwnField(category, 'active') !== false
            && readOwnField(category, 'deleted') !== true
        ))
        .map((category, index) => ({
            id: resolveScalarId(
                readOwnField(category, 'id')
                    ?? readOwnField(category, 'categoryId')
                    ?? readOwnField(readOwnField(category, 'name'), 'en')
                    ?? readOwnField(category, 'name'),
                `category-${index}`,
            ),
            name: stripUnsupported(resolveText(
                readOwnField(category, 'name'),
                language,
                'Other',
                MENU_CARD_PRINT_TEXT_LIMITS.CATEGORY_NAME,
            )),
        }));

    const categoryMap = new Map<string, PrintCategory>();
    activeCategories.forEach((category) => {
        categoryMap.set(category.id, { ...category, items: [] });
    });

    const uncategorized: PrintItem[] = [];
    let hiddenExcludedCount = 0;
    let unavailableExcludedCount = 0;
    let missingPriceCount = 0;

    snapshotArray(items).forEach((item, index) => {
        if (
            readOwnField(item, 'active') === false
            || readOwnField(item, 'deleted') === true
            || readOwnField(item, 'hidden') === true
        ) {
            hiddenExcludedCount += 1;
            return;
        }
        if (readOwnField(item, 'available') === false) {
            unavailableExcludedCount += 1;
            return;
        }

        const attributes: PrintAttribute[] = snapshotArray(readOwnField(item, 'attributes'), 8)
            .filter((attribute) => readOwnField(attribute, 'active') !== false)
            .slice(0, 8)
            .map((attribute) => ({
                id: resolveScalarId(readOwnField(attribute, 'id'), '') || undefined,
                name: stripUnsupported(resolveText(
                    readOwnField(attribute, 'name'),
                    language,
                    '',
                    MENU_CARD_PRINT_TEXT_LIMITS.ATTRIBUTE_NAME,
                )),
                price: normalizePrice(readOwnField(attribute, 'price')),
            }))
            .filter((attribute: PrintAttribute) => !!attribute.name);
        const price = normalizePrice(readOwnField(item, 'price'));
        if (!price && !attributes.some((attribute) => Boolean(attribute.price))) {
            missingPriceCount += 1;
        }

        const categoryId = readOwnField(item, 'category') ?? readOwnField(item, 'categoryId');
        const printItem: PrintItem = {
            id: resolveScalarId(
                readOwnField(item, 'id') ?? readOwnField(item, 'itemId'),
                `item-${index}`,
            ),
            name: stripUnsupported(resolveText(
                readOwnField(item, 'name'),
                language,
                'Untitled',
                MENU_CARD_PRINT_TEXT_LIMITS.ITEM_NAME,
            )),
            price,
            description: stripUnsupported(resolveText(
                readOwnField(item, 'description'),
                language,
                '',
                MENU_CARD_PRINT_TEXT_LIMITS.DESCRIPTION,
            )),
            categoryId: categoryId === undefined || categoryId === null
                ? undefined
                : resolveScalarId(categoryId, '') || undefined,
            attributes,
            tags: normalizeTags(item),
        };

        if (printItem.categoryId && categoryMap.has(printItem.categoryId)) {
            categoryMap.get(printItem.categoryId)!.items.push(printItem);
        } else {
            uncategorized.push(printItem);
        }
    });

    const printCategories = Array.from(categoryMap.values()).filter((category) => category.items.length > 0);
    if (uncategorized.length > 0) {
        printCategories.push({ id: 'uncategorized', name: 'Other Items', items: uncategorized });
    }

    return {
        categories: printCategories,
        hiddenExcludedCount,
        unavailableExcludedCount,
        missingPriceCount,
    };
}

export { resolveText };
