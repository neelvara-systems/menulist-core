import { ExtractedDataItem, ProjectFileType } from '../../types';
import { EditorFilters } from '../EditorFiltersPopover';

/**
 * Item with file reference - used for filtering across multiple files
 */
export interface ItemWithFile {
    item: ExtractedDataItem;
    file: ProjectFileType;
}

/**
 * Options for filtering items
 */
export interface FilterItemsOptions {
    searchTerm?: string;
    filters?: EditorFilters;
    activeLanguage?: string;
    hideInactiveItems?: boolean;
    showItemPrices?: boolean;
    categoryActiveById?: Record<string, boolean>;
    /** If provided, only include items from this category */
    categoryId?: string;
}

/**
 * Apply all filters to an item
 * Single source of truth for item filtering logic
 * 
 * @param item - The item to check
 * @param options - Filter options
 * @returns true if item passes all filters
 */
export function itemMatchesFilters(
    item: ExtractedDataItem,
    options: FilterItemsOptions
): boolean {
    const { searchTerm, filters, activeLanguage = 'en', hideInactiveItems, showItemPrices = true, categoryActiveById, categoryId } = options;
    const categoryActive = item.category ? (categoryActiveById?.[item.category] !== false) : true;
    const effectiveActive = item.active !== false && categoryActive;

    // Category filter
    if (categoryId && item.category !== categoryId) {
        return false;
    }

    // Search term filter
    if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const itemName = item.name?.[activeLanguage]?.toLowerCase() || '';
        const itemDesc = item.description?.[activeLanguage]?.toLowerCase() || '';
        if (!itemName.includes(term) && !itemDesc.includes(term)) {
            return false;
        }
    }

    // Price range filter
    if (showItemPrices && filters?.priceRange) {
        const { min, max } = filters.priceRange;
        const price = parseFloat(String(item.price || '0').replace(/[^0-9.-]+/g, ''));
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
    }

    // Has image filter
    if (filters?.hasImage !== null && filters?.hasImage !== undefined) {
        const hasImages = Boolean(item.images && item.images.length > 0);
        if (hasImages !== filters.hasImage) return false;
    }

    // Active status filter
    if (filters?.activeStatus !== null && filters?.activeStatus !== undefined) {
        if (effectiveActive !== filters.activeStatus) return false;
    }

    // Hide inactive items toggle
    if (hideInactiveItems && !effectiveActive) {
        return false;
    }

    return true;
}

/**
 * Filter items with file references
 * 
 * @param items - Array of items with file references
 * @param options - Filter options
 * @returns Filtered array
 */
export function filterItemsWithFiles(
    items: ItemWithFile[],
    options: FilterItemsOptions
): ItemWithFile[] {
    return items.filter(({ item }) => itemMatchesFilters(item, options));
}

/**
 * Filter plain items array
 * 
 * @param items - Array of items
 * @param options - Filter options
 * @returns Filtered array
 */
export function filterItems(
    items: ExtractedDataItem[],
    options: FilterItemsOptions
): ExtractedDataItem[] {
    return items.filter(item => itemMatchesFilters(item, options));
}

/**
 * Check if any filters are currently active
 * 
 * @param options - Filter options to check
 * @returns true if any filter is active
 */
export function hasActiveFilters(options: FilterItemsOptions): boolean {
    const { searchTerm, filters, hideInactiveItems } = options;

    return Boolean(
        hideInactiveItems ||
        (searchTerm && searchTerm.trim()) ||
        (options.showItemPrices !== false && filters?.priceRange?.min !== null && filters?.priceRange?.min !== undefined) ||
        (options.showItemPrices !== false && filters?.priceRange?.max !== null && filters?.priceRange?.max !== undefined) ||
        filters?.hasImage !== null ||
        filters?.activeStatus !== null
    );
}
