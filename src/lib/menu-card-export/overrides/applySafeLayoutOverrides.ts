import type { MenuCardSafeOverrides } from '../models/exportTypes';
import type { PrintCategory } from '../models/printModel';

export function applySafeLayoutOverrides(categories: PrintCategory[], overrides: MenuCardSafeOverrides = {}): PrintCategory[] {
    const hiddenDescriptions = new Set(overrides.hideDescriptionsForCategories || []);

    return categories.map((category) => {
        if (!hiddenDescriptions.has(category.id)) return category;
        return {
            ...category,
            items: category.items.map((item) => ({ ...item, description: '' })),
        };
    });
}
