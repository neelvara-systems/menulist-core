import type { MenuCardExportSettings } from '../models/exportTypes';
import type { PrintCategory } from '../models/printModel';

export function countMenuCardItems(categories: PrintCategory[]): number {
    return categories.reduce((total, category) => total + category.items.length, 0);
}

export function resolveMenuCardColumnCount(
    settings: MenuCardExportSettings,
    categories: PrintCategory[],
): number {
    if (settings.preset === 'whatsapp' || settings.styleId === 'premium') return 1;
    if (settings.styleId === 'compact' && settings.paperSize === 'a4') {
        return countMenuCardItems(categories) >= 40 ? 3 : 2;
    }
    return 2;
}
