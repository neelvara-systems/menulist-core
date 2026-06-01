import type { PrintCategory } from '../models/printModel';

export function buildBlocks(categories: PrintCategory[]) {
    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        itemCount: category.items.length,
    }));
}
