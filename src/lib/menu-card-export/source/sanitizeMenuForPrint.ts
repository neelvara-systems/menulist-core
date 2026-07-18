import type { LocalizedText, PrintAttribute, PrintCategory, PrintItem } from '../models/printModel';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

function resolveText(value: LocalizedText, language = 'en', fallback = ''): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value.trim() || fallback;
    return (
        value[language] ||
        value.en ||
        value[Object.keys(value)[0]] ||
        fallback
    ).toString().trim();
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

function normalizeTags(item: any): string[] {
    const raw = item?.tags || item?.dietaryTags || item?.badges || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 6);
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
    const activeCategories = (Array.isArray(categories) ? categories : [])
        .filter((category) => category?.active !== false && category?.deleted !== true)
        .map((category) => ({
            id: String(category.id || category.categoryId || category.name?.en || category.name || 'category'),
            name: stripUnsupported(resolveText(category.name, language, 'Other')),
        }));

    const categoryMap = new Map<string, PrintCategory>();
    activeCategories.forEach((category) => {
        categoryMap.set(category.id, { ...category, items: [] });
    });

    const uncategorized: PrintItem[] = [];
    let hiddenExcludedCount = 0;
    let unavailableExcludedCount = 0;
    let missingPriceCount = 0;

    (Array.isArray(items) ? items : []).forEach((item, index) => {
        if (item?.active === false || item?.deleted === true || item?.hidden === true) {
            hiddenExcludedCount += 1;
            return;
        }
        if (item?.available === false) {
            unavailableExcludedCount += 1;
            return;
        }

        const attributes: PrintAttribute[] = (Array.isArray(item?.attributes) ? item.attributes : [])
            .filter((attribute: any) => attribute?.active !== false)
            .slice(0, 8)
            .map((attribute: any) => ({
                id: attribute?.id,
                name: stripUnsupported(resolveText(attribute?.name, language, '')),
                price: normalizePrice(attribute?.price),
            }))
            .filter((attribute: PrintAttribute) => !!attribute.name);
        const price = normalizePrice(item?.price);
        if (!price && !attributes.some((attribute) => Boolean(attribute.price))) {
            missingPriceCount += 1;
        }

        const categoryId = item?.category || item?.categoryId;
        const printItem: PrintItem = {
            id: String(item?.id || item?.itemId || `item-${index}`),
            name: stripUnsupported(resolveText(item?.name, language, 'Untitled')),
            price,
            description: stripUnsupported(resolveText(item?.description, language, '')),
            categoryId: categoryId ? String(categoryId) : undefined,
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
