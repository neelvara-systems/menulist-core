import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardLayoutPlan, MenuCardPreviewPage } from '../models/layoutTypes';
import type { PrintCategory } from '../models/printModel';
import { chooseLayoutMode } from './chooseLayoutMode';
import { getItemsPerPage, measureCategoryWeight } from './measureBlocks';
import { resolveMenuCardColumnCount } from './resolveColumnCount';

export function paginateBlocks(categories: PrintCategory[], settings: MenuCardExportSettings): MenuCardLayoutPlan {
    const columns = resolveMenuCardColumnCount(settings, categories);
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

    const previewPages = settings.includeCoverPage
        ? [
            { pageNumber: 1, kind: 'cover' as const, categories: [], estimatedItems: 0 },
            ...pages.map((page, index) => ({ ...page, pageNumber: index + 2, kind: 'menu' as const })),
        ]
        : pages;

    return {
        mode: chooseLayoutMode(settings, columns),
        pageCount: previewPages.length,
        pages: previewPages,
        categories,
    };
}
