import { getBusinessCategory } from '@data/shared/businessTypes';
import {
    applyCategoryIconDefaults as applySharedCategoryIconDefaults,
    getCategoryIconSuggestions,
    resolveCategoryIcon,
    type CategoryIconItemContext,
    type CategoryIconMatch,
    type CategoryIconTarget,
} from '@data/shared/categoryIconSuggestions';

function resolveBusinessCategory(businessType?: string): string | undefined {
    return getBusinessCategory(businessType) || businessType;
}

export function normalizeCategoryIconValue(icon: unknown): string {
    if (typeof icon === 'string') return icon.trim();

    if (icon && typeof icon === 'object') {
        for (const key of ['icon', 'value', 'name']) {
            const candidate = (icon as Record<string, unknown>)[key];
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }
    }

    return '';
}

export function getSuggestedCategoryIcons(categoryName?: string, businessType?: string, limit = 8): string[] {
    return getCategoryIconSuggestions(categoryName, resolveBusinessCategory(businessType), limit);
}

export function getSuggestedCategoryIcon(categoryName?: string, businessType?: string): string | null {
    return getSuggestedCategoryIcons(categoryName, businessType, 1)[0] || null;
}

export function resolveSuggestedCategoryIcon(categoryName?: string, businessType?: string, itemContext: string[] = []): CategoryIconMatch | null {
    return resolveCategoryIcon(categoryName, resolveBusinessCategory(businessType), itemContext);
}

export function applyCategoryIconDefaults<TCategory extends CategoryIconTarget>(
    categories: TCategory[] = [],
    items: CategoryIconItemContext[] = [],
    businessType?: string,
): TCategory[] {
    return applySharedCategoryIconDefaults(categories, items, resolveBusinessCategory(businessType));
}
