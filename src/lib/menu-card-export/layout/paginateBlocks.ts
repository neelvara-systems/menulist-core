import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardLayoutPlan, MenuCardPreviewPage } from '../models/layoutTypes';
import type { PrintCategory } from '../models/printModel';
import { chooseLayoutMode } from './chooseLayoutMode';
import { getItemsPerPage, measureCategoryWeight } from './measureBlocks';

function getColumnCount(settings: MenuCardExportSettings): number {
    if (settings.styleId === 'premium' || settings.preset === 'whatsapp') return 1;
    if (settings.styleId === 'compact' && settings.paperSize === 'a4') return 3;
    return 2;
}

export function paginateBlocks(categories: PrintCategory[], settings: MenuCardExportSettings): MenuCardLayoutPlan {
    const columns = getColumnCount(settings);
    const capacity = getItemsPerPage(settings.density, columns);
    const pages: MenuCardPreviewPage[] = [];
    let current: MenuCardPreviewPage = { pageNumber: 1, categories: [], estimatedItems: 0 };

    categories.forEach((category) => {
        const weight = measureCategoryWeight(category, settings.includeDescriptions);
        if (current.categories.length > 0 && current.estimatedItems + weight > capacity) {
            pages.push(current);
            current = { pageNumber: pages.length + 1, categories: [], estimatedItems: 0 };
        }

        current.categories.push({ id: category.id, name: category.name, itemCount: category.items.length });
        current.estimatedItems += weight;
    });

    if (current.categories.length > 0 || pages.length === 0) {
        pages.push(current);
    }

    return {
        mode: chooseLayoutMode(settings),
        pageCount: pages.length,
        pages,
        categories,
    };
}
