import { applyCategoryIconDefaults, normalizeCategoryIconValue } from '@lib/categoryIcons';
import { removeObjRef } from '@util/utils';
import type { Project } from '@template/main-app/projects/types';
import type {
    ExtractedDataCategory,
    ExtractedDataItem,
} from '@template/main-app/projects/types/extractedData.types';

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const hasCategoryIcon = (category: Partial<ExtractedDataCategory>): boolean =>
    normalizeCategoryIconValue(category.icon).length > 0;

export function countMissingCategoryIcons(projectData: Project | null | undefined): number {
    if (!projectData?.files) return 0;

    const missingCategoryIds = new Set<string>();

    projectData.files.forEach((file: any) => {
        const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
        categories.forEach((category) => {
            if (category.active === false || hasCategoryIcon(category)) return;
            missingCategoryIds.add(String(category.id));
        });
    });

    return missingCategoryIds.size;
}

export function applyMissingCategoryIconsToProject(
    projectData: Project,
    businessType?: string,
    businessCategory?: string,
): { project: Project; updatedCount: number } {
    const updated = removeObjRef(projectData);
    const updatedCategoryIds = new Set<string>();

    updated.files?.forEach((file: any) => {
        const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
        if (categories.length === 0) return;

        const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
        const repairedCategories = applyCategoryIconDefaults(categories, items, businessType, businessCategory);

        const nextCategories = repairedCategories.map((category, index) => {
            const previous = categories[index];
            if (!previous || previous.active === false || hasCategoryIcon(previous)) {
                return previous || category;
            }
            if (!hasCategoryIcon(category)) return previous;

            updatedCategoryIds.add(String(category.id));
            return category;
        });

        file.extractedData.data.categories = nextCategories;
    });

    return {
        project: updated,
        updatedCount: updatedCategoryIds.size,
    };
}
