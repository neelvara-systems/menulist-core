import { normalizeBusinessCategory, resolveBusinessCategory } from '@data/shared/businessTypes';
import {
    applyCategoryIconDefaults as applySharedCategoryIconDefaults,
    getCategoryIconSuggestions,
    resolveCategoryIcon,
    type CategoryIconItemContext,
    type CategoryIconMatch,
    type CategoryIconTarget,
} from '@data/shared/categoryIconSuggestions';

function resolveIconBusinessCategory(businessType?: string, businessCategory?: string): string | undefined {
    return resolveBusinessCategory(businessType, businessCategory) || normalizeBusinessCategory(businessType);
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

export function getSuggestedCategoryIcons(categoryName?: string, businessType?: string, businessCategoryOrLimit?: string | number, limit = 8): string[] {
    const businessCategory = typeof businessCategoryOrLimit === 'string' ? businessCategoryOrLimit : undefined;
    const effectiveLimit = typeof businessCategoryOrLimit === 'number' ? businessCategoryOrLimit : limit;
    return getCategoryIconSuggestions(categoryName, resolveIconBusinessCategory(businessType, businessCategory), effectiveLimit);
}

export function getSuggestedCategoryIcon(categoryName?: string, businessType?: string, businessCategory?: string): string | null {
    return getSuggestedCategoryIcons(categoryName, businessType, businessCategory, 1)[0] || null;
}

export function resolveSuggestedCategoryIcon(categoryName?: string, businessType?: string, businessCategoryOrItemContext?: string | string[], itemContext: string[] = []): CategoryIconMatch | null {
    const businessCategory = typeof businessCategoryOrItemContext === 'string' ? businessCategoryOrItemContext : undefined;
    const effectiveItemContext = Array.isArray(businessCategoryOrItemContext) ? businessCategoryOrItemContext : itemContext;
    return resolveCategoryIcon(categoryName, resolveIconBusinessCategory(businessType, businessCategory), effectiveItemContext);
}

export function applyCategoryIconDefaults<TCategory extends CategoryIconTarget>(
    categories: TCategory[] = [],
    items: CategoryIconItemContext[] = [],
    businessType?: string,
    businessCategory?: string,
): TCategory[] {
    return applySharedCategoryIconDefaults(categories, items, resolveIconBusinessCategory(businessType, businessCategory));
}
