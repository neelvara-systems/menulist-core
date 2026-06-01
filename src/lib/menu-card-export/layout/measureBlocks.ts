import type { MenuCardDensity } from '../models/exportTypes';
import type { PrintCategory } from '../models/printModel';

export function getItemsPerPage(density: MenuCardDensity, columns: number): number {
    const base = density === 'comfortable' ? 18 : density === 'compact' ? 34 : 26;
    return Math.max(12, base * Math.max(1, columns));
}

export function measureCategoryWeight(category: PrintCategory, includeDescriptions: boolean): number {
    return category.items.reduce((total, item) => {
        const descriptionWeight = includeDescriptions && item.description ? Math.ceil(item.description.length / 120) : 0;
        const attributeWeight = item.attributes.length > 0 ? Math.ceil(item.attributes.length / 3) : 0;
        return total + 1 + descriptionWeight + attributeWeight;
    }, 1);
}
