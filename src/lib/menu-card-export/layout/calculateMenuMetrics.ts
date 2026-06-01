import type { MenuCardPrintSource } from '../models/printModel';

export function calculateMenuMetrics(source: MenuCardPrintSource) {
    const itemCount = source.menu.categories.reduce((total, category) => total + category.items.length, 0);
    const categoryCount = source.menu.categories.length;
    const longTextCount = source.menu.categories.reduce((total, category) => (
        total + category.items.filter((item) => (item.name.length > 42) || ((item.description || '').length > 180)).length
    ), 0);

    return {
        itemCount,
        categoryCount,
        longTextCount,
    };
}
